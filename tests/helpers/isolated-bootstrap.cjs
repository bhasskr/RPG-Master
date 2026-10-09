const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const net = require('node:net');
const root = path.resolve(process.cwd());
const repo = process.env.RPG_TEST_REPO;
if (!repo || root === path.resolve(repo)) throw new Error('Executor isolado obrigatório');

function writable(target) {
  if (typeof target === 'number') throw new Error('Descritor de escrita não autorizado');
  const resolved = path.resolve(target instanceof URL ? require('node:url').fileURLToPath(target) : String(target));
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Escrita fora do sandbox de teste: ${resolved}`);
  }
}
for (const owner of [fs, fs.promises]) {
  for (const method of ['writeFile', 'appendFile', 'mkdir', 'rm', 'rmdir', 'unlink', 'rename', 'copyFile', 'mkdtemp',
    'writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync', 'rmdirSync', 'unlinkSync', 'renameSync', 'copyFileSync', 'mkdtempSync']) {
    if (typeof owner[method] !== 'function') continue;
    const original = owner[method].bind(owner);
    owner[method] = (...args) => {
      writable(args[0]);
      if (method.startsWith('rename') || method.startsWith('copyFile')) writable(args[1]);
      return original(...args);
    };
  }
}
const denyNetwork = () => { throw new Error('Rede proibida nos testes isolados'); };
net.Socket.prototype.connect = denyNetwork;
net.Server.prototype.listen = denyNetwork;
globalThis.fetch = async () => denyNetwork();
process.env.GEMINI_API_KEY = 'offline-test-only';
const fake = require('./fake-genai.cjs');
const originalLoad = Module._load;
Module._load = function (id, parent, isMain) {
  if (id === '@google/genai') return fake;
  return originalLoad.call(this, id, parent, isMain);
};
const ts = require(process.env.RPG_TEST_TYPESCRIPT);
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const errors = result.diagnostics?.filter((item) => item.category === ts.DiagnosticCategory.Error) || [];
  if (errors.length) throw new Error(errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'));
  module._compile(result.outputText, filename);
};
process.on('unhandledRejection', (error) => { console.error(error); process.exitCode = 1; });
process.on('exit', () => {
  if (globalThis.__RPG_SUITE_COMPLETE__ !== true) {
    console.error('SUÍTE INCOMPLETA: encerrou sem confirmar conclusão de todos os casos');
    process.exitCode = 1;
  }
});
require(path.resolve(repo, process.argv[2]));
