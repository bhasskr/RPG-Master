// Executada somente pelo autoteste do bootstrap em um subprocesso isolado.
if (process.env.RPG_COMPLETION_CASE === 'pending') {
  (async () => { await new Promise(() => {}); globalThis.__RPG_SUITE_COMPLETE__ = true; })();
} else {
  globalThis.__RPG_SUITE_COMPLETE__ = true;
  if (process.env.RPG_COMPLETION_CASE === 'assertion') require('node:assert/strict').equal(1, 2);
}
