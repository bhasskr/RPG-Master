import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { FilePersistentMemoryStore } from '../server/engine/memory/filePersistentStore';
import { GameStateManager } from '../server/engine/gameState/gameStateManager';
import { ai, deferred, within, withEngine, runCases } from './helpers/engineHarness';
import { api } from '../src/services/api';
const registeredRoutes = require('./helpers/registeredRoutes.cjs');

runCases({
  'GameEngine real integra narrador, extractor, validator e persistência, com IA fake apenas no SDK': () =>
    withEngine(async ({ engine, memory, memoryDir, stateDir, drain }) => {
      ai.handlers.generate = async () => ({ text: JSON.stringify({ ...ai.emptyExtraction(),
        inventoryChanges: [{ owner: 'player', item: 'Chave', action: 'acquired', quantity: 1 }],
      }) });
      const campaign = await engine.startNewCampaign({ title: 'Integração isolada', playerName: 'Ana' });
      const turn = await engine.processPlayerAction(campaign.campaignId, 'Observo o salão.');
      await drain();
      assert.equal(turn.turn, 1);
      assert.equal(ai.calls.filter((call: any) => call.kind === 'chat').length, 2);
      assert.equal(ai.calls.filter((call: any) => call.kind === 'generate').length, 1);
      assert.equal((await memory.getInventory(campaign.campaignId, 'player'))[0].quantity, 1);
      const messages = await new FilePersistentMemoryStore(memoryDir).getMessages(campaign.campaignId);
      assert.equal(messages.length, 3);
      assert.equal(messages[2].metadata?.hasMutations, true);
      assert.equal(new GameStateManager(stateDir).getGameState(campaign.campaignId)?.turn, 1);
    }),

  'Resposta do turno não espera extração; barreira controla a aplicação real': () =>
    withEngine(async ({ engine, memory, drain }) => {
      const entered = deferred();
      const release = deferred();
      ai.handlers.generate = async () => {
        entered.resolve();
        await release.promise;
        return { text: JSON.stringify({ ...ai.emptyExtraction(),
          inventoryChanges: [{ owner: 'player', item: 'Mapa', action: 'acquired', quantity: 1 }],
        }) };
      };
      try {
        const campaign = await engine.startNewCampaign({ title: 'Barreira' });
        const turn = await within(engine.processPlayerAction(campaign.campaignId, 'Observo o salão.'));
        await within(entered.promise);
        assert.equal(turn.turn, 1);
        assert.deepEqual(await memory.getInventory(campaign.campaignId, 'player'), []);
        release.resolve();
        await drain();
        assert.equal((await memory.getInventory(campaign.campaignId, 'player'))[0].item, 'Mapa');
      } finally { release.resolve(); }
    }),

  'Handlers reais registrados em server.ts passam por idempotência, GameEngine e disco (transporte simulado)': () =>
    withEngine(async ({ engine, memory, memoryDir, drain }) => {
      const request = await registeredRoutes(engine);
      const created = await request('POST', '/api/campaign/new', { title: 'Rota real' }, 'create-route');
      assert.equal(created.status, 200);
      const campaignId = created.body.data.campaignId;
      assert.ok(campaignId);
      const payload = { campaignId, message: 'Observo o salão.' };
      const first = await request('POST', '/api/message', payload, 'turn-route');
      await drain();
      const callCount = ai.calls.length;
      const replay = await request('POST', '/api/message', payload, 'turn-route');
      assert.equal(first.status, 200);
      assert.deepEqual(replay.body, first.body);
      assert.equal(ai.calls.length, callCount, 'Replay não deve chamar IA/Engine novamente');
      assert.equal((await new FilePersistentMemoryStore(memoryDir).getMessages(campaignId)).length, 3);
      const conflict = await request('POST', '/api/message', { ...payload, message: 'Outra ação' }, 'turn-route');
      assert.equal(conflict.status, 409);
      assert.equal((await memory.getRecentMessages(campaignId)).length, 3);
      const invalid = await request('POST', '/api/message', { campaignId }, 'invalid-route');
      assert.equal(invalid.status, 400);
    }),

  'Cliente real reutiliza chave fornecida em reenvio manual sem duplicar turno (sem UI/HTTP)': () =>
    withEngine(async ({ engine, memory, drain }) => {
      const request = await registeredRoutes(engine);
      const { campaignId } = await engine.startNewCampaign({ title: 'Chave manual' });
      const originalFetch = globalThis.fetch;
      const keys: string[] = [];
      globalThis.fetch = async (url, init) => {
        const key = new Headers(init?.headers).get('Idempotency-Key')!;
        keys.push(key);
        const response = await request(init?.method, String(url), JSON.parse(String(init?.body)), key);
        return new Response(JSON.stringify(response.body), { status: response.status,
          headers: { 'Content-Type': 'application/json' } });
      };
      try {
        const first = await api.sendMessage(campaignId, 'Observo o salão.', 'manual-fixed-key');
        await drain();
        const calls = ai.calls.length;
        const replay = await api.sendMessage(campaignId, 'Observo o salão.', 'manual-fixed-key');
        assert.deepEqual(replay, first);
        assert.deepEqual(keys, ['manual-fixed-key', 'manual-fixed-key']);
        assert.equal(ai.calls.length, calls);
        assert.equal((await memory.getRecentMessages(campaignId)).length, 3);
      } finally { globalThis.fetch = originalFetch; }
    }),

  'P0.3: harness injeta falha no commit da resposta e observa disco/cache, sem escolher política de recuperação': () =>
    withEngine(async ({ engine, state, store, memoryDir }) => {
      const { campaignId } = await engine.startNewCampaign({ title: 'Falha parcial' });
      const original = fs.rename;
      let writes = 0;
      (fs as any).rename = async (...args: any[]) => {
        if (String(args[1]) === path.join(memoryDir, `chat_${campaignId}.json`) && ++writes === 2) {
          throw new Error('Falha ao confirmar resposta');
        }
        return (original as Function)(...args);
      };
      try {
        await assert.rejects(engine.processPlayerAction(campaignId, 'Observo o salão.'), /Falha ao confirmar resposta/);
        assert.equal(writes, 2, 'Falha deve ocorrer depois de confirmar mensagem do jogador');
      } finally { (fs as any).rename = original; }
      const disk = await new FilePersistentMemoryStore(memoryDir).getMessages(campaignId);
      assert.deepEqual(await store.getMessages(campaignId), disk);
      console.log('OBSERVAÇÃO P0.3 (não é prova de recovery):', JSON.stringify({
        turn: state.getGameState(campaignId)?.turn, roles: disk.map((message) => message.role),
      }));
    }),

  'Harness bloqueia rede e escrita fora do sandbox, sem alcançar saves reais': async () => {
    await assert.rejects(fetch('https://example.invalid'), /Rede proibida/);
    assert.throws(() => require('node:net').connect(1, '127.0.0.1'), /Rede proibida/);
    await assert.rejects(async () => fs.writeFile(path.join(process.env.RPG_TEST_REPO!, 'data', 'forbidden-test.json'), 'x'),
      /Escrita fora do sandbox/);
  },

  'Executor falha para asserção quebrada e promessa abandonada; aceita conclusão explícita': async () => {
    const { spawnSync } = require('node:child_process');
    for (const mode of ['pending', 'assertion', 'complete']) {
      const child = spawnSync(process.execPath, [
        path.join(process.env.RPG_TEST_REPO!, 'tests/helpers/isolated-bootstrap.cjs'),
        'tests/helpers/completion-fixture.cjs',
      ], { cwd: process.cwd(), env: { ...process.env, RPG_COMPLETION_CASE: mode },
        encoding: 'utf8', timeout: 10000 });
      assert.ifError(child.error);
      assert.equal(child.signal, null);
      assert.equal(child.status, mode === 'complete' ? 0 : 1, child.stderr);
      if (mode === 'pending') assert.match(child.stderr, /SUÍTE INCOMPLETA/);
      if (mode === 'assertion') assert.match(child.stderr, /AssertionError/);
    }
  },
}).catch((error) => { console.error(error); process.exitCode = 1; });
