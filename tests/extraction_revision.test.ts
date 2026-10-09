import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { MemoryManager } from '../server/engine/memory/memoryManager';
import { FilePersistentMemoryStore } from '../server/engine/memory/filePersistentStore';
import { InMemoryStore } from '../server/engine/memory/inMemoryStore';
import { MemoryValidator } from '../server/engine/memory/extractor/memoryValidator';
import { ChatMessage, ExtractionSource } from '../server/engine/memory/types';
import { ai, deferred, within, withEngine, runCases } from './helpers/engineHarness';

const source = (message: ChatMessage): ExtractionSource => ({
  messageId: message.id, revision: message.revision ?? 0, turn: message.turn,
});
const changes = (item = 'Chave') => ({ ...ai.emptyExtraction(),
  inventoryChanges: [{ owner: 'player', item, action: 'acquired', quantity: 1 }],
  relationshipChanges: [{ characterA: 'Ana', characterB: 'Bia', trustChange: 2, reason: 'Ajuda concreta' }],
});
const apply = (manager: MemoryManager, id: string, origin: ExtractionSource) =>
  manager.commitExtraction(id, origin, async (draft) => ({
    value: await MemoryValidator.validateAndApply(id, changes(), draft, origin.turn), hasMutations: true,
  }));
const cases: Record<string, () => Promise<void>> = {};

for (const operation of ['retry', 'edit'] as const) {
  cases[`GameEngine ${operation}: recibo protege consequências quando publicação de hasMutations falha`] = () =>
    withEngine(async ({ engine, memory, memoryDir, drain }) => {
      const { campaignId } = await engine.startNewCampaign({ title: 'Flag indisponível' });
      const original = fs.rename;
      let applying = false;
      ai.handlers.generate = async () => {
        applying = true;
        return { text: JSON.stringify(changes()) };
      };
      (fs as any).rename = async (...args: any[]) => {
        if (applying && String(args[1]) === path.join(memoryDir, `chat_${campaignId}.json`)) {
          throw new Error('Falha na flag');
        }
        return (original as Function)(...args);
      };
      let turn;
      try { turn = await engine.processPlayerAction(campaignId, 'Observo o salão.'); await drain(); }
      finally { (fs as any).rename = original; }
      assert.equal((await memory.getRecentMessages(campaignId)).at(-1)?.metadata?.hasMutations, undefined);
      assert.equal((await memory.getSnapshot(campaignId))?.extractionReceipts?.[turn.masterMessage.id].hasMutations, true);
      // Reexecuta o caminho real de pós-processamento para a MESMA revisão.
      await (engine as any).processPostTurnMemoryExtraction(campaignId, turn.turn, turn.gameState,
        turn.playerMessage.content, { text: turn.masterMessage.content }, turn.masterMessage.id, turn.masterMessage.revision ?? 0);
      assert.equal((await memory.getInventory(campaignId, 'player'))[0].quantity, 1);
      await assert.rejects(operation === 'retry' ? engine.retryLastPlayerAction(campaignId)
        : engine.editLastPlayerAction(campaignId, 'Observo a porta.'), /consolidado/);
      assert.equal((await memory.getRecentMessages(campaignId)).at(-1)?.content, turn.masterMessage.content);
    });

  cases[`GameEngine ${operation}: descarta A, aplica B e preserva consequências anteriores`] = () =>
    withEngine(async ({ engine, memory, drain }) => {
      ai.handlers.generate = async () => ({ text: JSON.stringify(changes('Item anterior')) });
      const { campaignId } = await engine.startNewCampaign({ title: 'Revisões' });
      await engine.processPlayerAction(campaignId, 'Observo o chão.');
      await drain();
      const entered = deferred(), release = deferred();
      let count = 0;
      ai.handlers.generate = async () => {
        const old = ++count === 1;
        if (old) { entered.resolve(); await release.promise; }
        return { text: JSON.stringify({ ...ai.emptyExtraction(), inventoryChanges: [
          { owner: 'player', item: old ? 'Item obsoleto A' : 'Item atual B', action: 'acquired', quantity: 1 },
        ] }) };
      };
      let narration = 0;
      ai.handlers.chat = async () => ({ text: ++narration === 1 ? 'Você encontra o item A.' : 'Você encontra o item B.' });
      try {
        const a = await engine.processPlayerAction(campaignId, 'Observo a mesa.');
        await within(entered.promise);
        const b = operation === 'retry' ? await engine.retryLastPlayerAction(campaignId)
          : await engine.editLastPlayerAction(campaignId, 'Observo a janela.');
        assert.equal(b.masterMessage.id, a.masterMessage.id);
        assert.equal(b.playerMessage.id, a.playerMessage.id);
        assert.equal(b.turn, a.turn);
        assert.equal(b.masterMessage.revision, (a.masterMessage.revision ?? 0) + 1);
        assert.notEqual(b.masterMessage.content, a.masterMessage.content);
        release.resolve();
        await drain();
        assert.deepEqual((await memory.getInventory(campaignId, 'player')).map((i) => i.item).sort(),
          ['Item anterior', 'Item atual B']);
        const chat = await memory.getRecentMessages(campaignId);
        assert.equal(chat.at(-1)?.metadata?.hasMutations, true);
        assert.equal((await memory.getSnapshot(campaignId))?.extractionReceipts?.[b.masterMessage.id].revision, b.masterMessage.revision);
      } finally { release.resolve(); }
    });
}

for (const kind of ['File', 'InMemory']) {
  const withStore = (run: (manager: MemoryManager, id: string, message: ChatMessage) => Promise<void>) =>
    withEngine(async ({ memory: disk }) => {
      const manager = kind === 'File' ? disk : new MemoryManager(new InMemoryStore());
      const id = 'revision_campaign';
      // Formato legado real: mensagem sem revision e snapshot sem recibos.
      const message = await manager.recordMessage(id, 'assistant', 'Narrativa original', 1);
      await run(manager, id, message);
    });

  cases[`${kind}: narrativa atual/legada aplica uma vez; concorrência não duplica Inventory nem Relationship`] = () =>
    withStore(async (manager, id, message) => {
      const result = await Promise.all([apply(manager, id, source(message)), apply(manager, id, source(message))]);
      assert.deepEqual(result.map((r) => r.status).sort(), ['applied', 'duplicate']);
      assert.equal((await manager.getInventory(id, 'player'))[0].quantity, 1);
      assert.equal((await manager.getRelationship(id, 'Ana', 'Bia'))?.trust, 2);
      const before = await manager.getSnapshot(id);
      assert.equal((await apply(manager, id, source(message))).status, 'duplicate');
      assert.deepEqual(await manager.getSnapshot(id), before);
    });

  cases[`${kind}: substituição de texto idêntico invalida A; metadata não cria revisão`] = () =>
    withStore(async (manager, id, message) => {
      const b = await manager.replaceMessage(id, message.id, message, 0);
      assert.equal(b.revision, 1);
      assert.equal((await apply(manager, id, source(message))).status, 'stale');
      assert.equal(await manager.getSnapshot(id), null, 'Descarte não cria snapshot');
      await manager.updateMessage(id, message.id, { metadata: { location: 'Sala' } });
      assert.equal((await manager.getRecentMessages(id))[0].revision, 1);
      await manager.updateMessage(id, message.id, { content: 'Revisão C' });
      assert.equal((await manager.getRecentMessages(id))[0].revision, 2);
      assert.equal((await apply(manager, id, source(b))).status, 'stale');
      await assert.rejects(manager.replaceMessage(id, message.id, message, 0), /Conflito/);
    });

  cases[`${kind}: falha após alteração no draft não publica consequência nem recibo`] = () =>
    withStore(async (manager, id, message) => {
      await manager.updateInventory(id, 'player', 'Anterior', 1, 'add');
      const before = await manager.getSnapshot(id);
      await assert.rejects(manager.commitExtraction(id, source(message), async (draft) => {
        await draft.updateInventory(id, 'player', 'Parcial', 1, 'add');
        throw new Error('Falha do validator');
      }), /Falha do validator/);
      assert.deepEqual(await manager.getSnapshot(id), before);
      assert.equal((await apply(manager, id, source(message))).status, 'applied');
    });

  cases[`${kind}: fila exclui substituição durante commit, recibo protege sem flag; outra campanha progride`] = () =>
    withStore(async (manager, id, message) => {
      const entered = deferred(), release = deferred();
      const commit = manager.commitExtraction(id, source(message), async (draft) => {
        entered.resolve(); await release.promise;
        await draft.updateInventory(id, 'player', 'Atual', 1, 'add');
        return { value: true, hasMutations: true };
      });
      let replaced = false;
      let replacing: Promise<unknown> | undefined;
      try {
        await within(entered.promise);
        replacing = manager.replaceMessage(id, message.id, { ...message, content: 'B' }, 0)
          .then(() => { replaced = true; return null; }, (error) => error);
        const other = await manager.recordMessage('independent', 'assistant', 'Outra campanha', 1);
        assert.equal((await within(apply(manager, 'independent', source(other)))).status, 'applied');
        assert.equal(replaced, false);
      } finally { release.resolve(); }
      await within(commit);
      assert.match(String(await replacing), /Conflito/);
      assert.equal((await manager.getRecentMessages(id))[0].metadata?.hasMutations, undefined);
      await assert.rejects(manager.updateMessage(id, message.id, { content: 'B' }), /Conflito/);
    });

  cases[`${kind}: legado com hasMutations não reaplica consequências desconhecidas`] = () =>
    withStore(async (manager, id, message) => {
      await manager.updateMessage(id, message.id, { metadata: { hasMutations: true } });
      assert.equal((await apply(manager, id, source(message))).status, 'duplicate');
      assert.equal(await manager.getSnapshot(id), null);
    });

  cases[`${kind}: extração vazia é deduplicada mas não bloqueia nova revisão`] = () =>
    withStore(async (manager, id, message) => {
      const empty = () => manager.commitExtraction(id, source(message), async (draft) => ({
        value: await MemoryValidator.validateAndApply(id, ai.emptyExtraction(), draft, 1), hasMutations: false,
      }));
      assert.equal((await empty()).status, 'applied');
      assert.equal((await empty()).status, 'duplicate');
      const b = await manager.replaceMessage(id, message.id, { ...message, content: 'B' }, 0);
      assert.equal((await apply(manager, id, source(b))).status, 'applied');
    });
}

cases['File: restart preserva recibo/revisão e impede reaplicação; falha de I/O mantém commit anterior'] = () =>
  withEngine(async ({ memory, memoryDir }) => {
    const id = 'restart_revision';
    const message = await memory.recordMessage(id, 'assistant', 'Legado', 1);
    await memory.updateInventory(id, 'player', 'Anterior', 1, 'add');
    const before = await memory.getSnapshot(id);
    const original = fs.rename;
    (fs as any).rename = async (...args: any[]) => {
      if (String(args[1]) === path.join(memoryDir, `memory_${id}.json`)) throw new Error('I/O injetado');
      return (original as Function)(...args);
    };
    try { await assert.rejects(apply(memory, id, source(message)), /I\/O injetado/); }
    finally { (fs as any).rename = original; }
    const restarted = new MemoryManager(new FilePersistentMemoryStore(memoryDir));
    assert.deepEqual(await memory.getSnapshot(id), before);
    assert.deepEqual(await restarted.getSnapshot(id), before);
    const revised = await restarted.replaceMessage(id, message.id, { ...message, content: 'Nova' }, 0);
    assert.equal((await apply(restarted, id, source(revised))).status, 'applied');
    const again = new MemoryManager(new FilePersistentMemoryStore(memoryDir));
    assert.equal((await again.getRecentMessages(id))[0].revision, 1);
    assert.equal((await apply(again, id, source(revised))).status, 'duplicate');
    assert.equal((await again.getInventory(id, 'player')).find((i) => i.item === 'Chave')?.quantity, 1);
  });

cases['File: hidratação antiga do cache de chat não autoriza extração da revisão substituída'] = () =>
  withEngine(async ({ memory, memoryDir }) => {
    const id = 'cold_revision';
    const a = await memory.recordMessage(id, 'assistant', 'A', 1);
    const store = new FilePersistentMemoryStore(memoryDir);
    const entered = deferred(), release = deferred();
    const original = fs.readFile;
    let held = false;
    (fs as any).readFile = async (...args: any[]) => {
      const bytes = await (original as Function)(...args);
      if (!held && String(args[0]) === path.join(memoryDir, `chat_${id}.json`)) {
        held = true; entered.resolve(); await release.promise;
      }
      return bytes;
    };
    let oldRead: Promise<ChatMessage[]> | undefined;
    try {
      oldRead = store.getMessages(id);
      await within(entered.promise);
      await store.replaceMessage(id, a.id, { ...a, content: 'B' }, 0);
      release.resolve(); await oldRead;
      const manager = new MemoryManager(store);
      await manager.recordMessage(id, 'user', 'Turno seguinte', 2);
      const disk = await new FilePersistentMemoryStore(memoryDir).getMessages(id);
      assert.equal(disk[0].content, 'B', 'Append não pode restaurar A a partir do cache atrasado');
      assert.equal(disk[0].revision, 1);
      assert.equal((await apply(new MemoryManager(store), id, source(a))).status, 'stale');
      assert.equal(await store.getSnapshot(id), null);
    } finally { release.resolve(); (fs as any).readFile = original; await oldRead; }
  });

runCases(cases).catch((error) => { console.error(error); process.exitCode = 1; });
