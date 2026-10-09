// Sem instalação/download. TYPESCRIPT_PATH pode indicar um runtime já disponível.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const repo = path.resolve(__dirname, '..');
const reliable = [
  'tests/memory_concurrency.test.ts',
  'tests/retry_preservation.test.ts',
  'tests/edit_preservation.test.ts',
  'tests/idempotency.test.ts',
  'tests/engine_contracts.test.ts',
  'tests/extraction_revision.test.ts',
];
const risks = ['tests/backlog_risks.test.ts'];
const args = process.argv.slice(2);
const selected = args.length === 0 ? reliable : args[0] === '--risks' ? risks : args;
let typescript;
try {
  typescript = process.env.TYPESCRIPT_PATH || require.resolve('typescript', { paths: [repo] });
  if (!fs.existsSync(typescript)) throw new Error('TypeScript não encontrado');
} catch {
  console.error('Use o TypeScript já instalado no projeto ou defina TYPESCRIPT_PATH. Nenhuma dependência será baixada.');
  process.exit(1);
}
let failed = 0;
for (const suite of selected) {
  if (![...reliable, ...risks].includes(suite)) throw new Error(`Suíte não auditada para este executor: ${suite}`);
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'rpg_p111_'));
  try {
    console.log(`\n=== ${suite} ===`);
    const result = spawnSync(process.execPath, [path.join(__dirname, 'helpers/isolated-bootstrap.cjs'), suite], {
      cwd: sandbox, stdio: 'inherit', timeout: 45000,
      env: { ...process.env, RPG_TEST_REPO: repo, RPG_TEST_TYPESCRIPT: typescript,
        TEMP: sandbox, TMP: sandbox, TMPDIR: sandbox, NODE_ENV: 'test' },
    });
    if (result.status !== 0 || result.error) {
      failed++;
      console.error(`SUÍTE FALHOU: ${suite}`, result.error?.message || `exit=${result.status}, signal=${result.signal}`);
    }
  } finally {
    const relative = path.relative(os.tmpdir(), sandbox);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !path.basename(sandbox).startsWith('rpg_p111_')) {
      throw new Error('Cleanup recusado: caminho fora do diretório temporário esperado');
    }
    fs.rmSync(sandbox, { recursive: true, force: true });
    if (fs.existsSync(sandbox)) throw new Error(`Cleanup incompleto: ${sandbox}`);
  }
}
console.log(`\nSUÍTES: ${selected.length - failed} passaram; ${failed} falharam. Sandboxes removidos.`);
process.exitCode = failed ? 1 : 0;
