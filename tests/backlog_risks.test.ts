// Diagnóstico separado da base verde. Cada FAIL é uma garantia ainda NÃO atendida.
// Não corrige produção nem transforma falhas conhecidas em passes/expected failures.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { executeRollCheck } from '../server/engine/dice/diceEngine';
import { ai, deferred, within, withEngine, runCases } from './helpers/engineHarness';

const cases: Record<string, () => Promise<void>> = {};
for (const operation of ['retry', 'edit', 'delete'] as const) {
  cases[`${operation === 'delete' ? 'P0.5' : 'P0.2'}: extração antiga não aplica item após ${operation}`] = () =>
    withEngine(async ({ engine, memory, drain }) => {
      const entered = deferred();
      const release = deferred();
      let extractionCount = 0;
      let narrationCount = 0;
      ai.handlers.chat = async () => ({ text: ++narrationCount === 2
        ? 'Você encontra o Item da revisão antiga.'
        : 'O salão está vazio e você não encontra nenhum objeto.' });
      ai.handlers.generate = async () => {
        if (++extractionCount === 1) {
          entered.resolve();
          await release.promise;
          return { text: JSON.stringify({ ...ai.emptyExtraction(),
            inventoryChanges: [{ owner: 'player', item: 'Item da revisão antiga', action: 'acquired', quantity: 1 }],
          }) };
        }
        return { text: JSON.stringify(ai.emptyExtraction()) };
      };
      try {
        const { campaignId } = await engine.startNewCampaign({ title: 'Extração suspensa' });
        await engine.processPlayerAction(campaignId, 'Observo o salão.');
        await within(entered.promise);
        if (operation === 'retry') await engine.retryLastPlayerAction(campaignId);
        if (operation === 'edit') await engine.editLastPlayerAction(campaignId, 'Observo o teto.');
        if (operation === 'delete') await engine.deleteCampaign(campaignId);
        release.resolve();
        await drain();
        assert.deepEqual(await memory.getInventory(campaignId, 'player'), [], 'Consequência obsoleta persistida');
      } finally { release.resolve(); }
    });
}
cases['P0.4: JSON corrompido deve gerar erro distinto de ausência'] = () =>
  withEngine(async ({ store, memoryDir }) => {
    assert.equal(await store.getSnapshot('absent'), null);
    await fs.writeFile(path.join(memoryDir, 'memory_corrupt.json'), '{truncated', 'utf8');
    await assert.rejects(store.getSnapshot('corrupt'), 'Corrupção foi tratada como ausência');
  });
cases['P1.5: D20 abaixo da dificuldade não pode ter outcome de sucesso'] = async () => {
  const result = executeRollCheck({ actor: 'Player', skill: 'Teste', modifier: 3, difficulty: 18 }, 14);
  assert.equal(result.success, false);
  assert.equal(result.outcome, 'FAILURE');
};
runCases(cases).catch((error) => { console.error(error); process.exitCode = 1; });
