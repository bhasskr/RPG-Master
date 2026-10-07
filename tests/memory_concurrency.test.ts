import path from 'path';
import fs from 'fs';
import os from 'os';
import assert from 'node:assert/strict';
import { FilePersistentMemoryStore } from '../server/engine/memory/filePersistentStore';
import { InMemoryStore } from '../server/engine/memory/inMemoryStore';
import { MemoryManager } from '../server/engine/memory/memoryManager';
import { CampaignMemorySnapshot } from '../server/engine/memory/types';
import { MemoryValidator } from '../server/engine/memory/extractor/memoryValidator';
import { MemoryExtractionResult } from '../server/engine/memory/extractor/types';
import { SemanticMemoryManager } from '../server/engine/memory/semanticMemory';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

async function bounded<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Fila não progrediu')), 5000);
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}

function extraction(changes: Partial<MemoryExtractionResult>): MemoryExtractionResult {
  return {
    events: [], knowledgeChanges: [], relationshipChanges: [], inventoryChanges: [],
    questChanges: [], npcChanges: [], worldChanges: [], ...changes,
  };
}

function createSampleSnapshot(campaignId: string, name: string = 'Campanha Concorrencia'): CampaignMemorySnapshot {
  return {
    campaign: {
      campaignId,
      name,
      createdAt: Date.now(),
      currentDate: '1 de Eleint',
      currentLocation: 'Porto de Baldur',
    },
    npcs: {},
    events: [],
    knowledge: [],
    relationships: [],
    inventory: [],
    quests: [],
    updatedAt: Date.now(),
  };
}

async function runAllMemoryConcurrencyTests() {
  console.log('===============================================================');
  console.log('TESTES DE CONCORRÊNCIA DE MEMÓRIA: mutateSnapshot & Lost Update');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  const testBaseDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'rpg_concurrency_test_'));
  const storeDataDir = path.join(testBaseDir, 'rpg_memory');
  const originalEmbedding = SemanticMemoryManager.prototype.generateEmbedding;
  // Mantém formatação/indexação reais; substitui apenas o serviço externo.
  SemanticMemoryManager.prototype.generateEmbedding = async () => [1, 0];

  async function check(name: string, run: () => Promise<void>) {
    try {
      await run();
      passed++;
      console.log(`PASSOU: ${name}`);
    } catch (error) {
      failed++;
      console.error(`FALHOU: ${name}`, error);
    }
  }

  try {
    const fileStore = new FilePersistentMemoryStore(storeDataDir);

    // =========================================================================
    // CENÁRIO 1: FilePersistentMemoryStore.mutateSnapshot serializa mutações concorrentes na mesma campanha
    // =========================================================================
    console.log('--- CENÁRIO 1: mutateSnapshot serializa mutações concorrentes na mesma campanha ---');
    try {
      const campId = 'camp_concurrent_same';
      await fileStore.saveSnapshot(createSampleSnapshot(campId));

      // Executa 10 mutações concorrentes adicionando NPCs sequenciais
      const promises = Array.from({ length: 10 }, (_, i) =>
        fileStore.mutateSnapshot(campId, async (snapshot) => {
          // Pequena pausa artificial para forçar sobreposição de execução
          await new Promise((r) => setTimeout(r, 10));
          snapshot.npcs[`npc_${i}`] = {
            id: `npc_${i}`,
            name: `NPC Número ${i}`,
            status: 'alive',
            location: 'Taberna',
            faction: 'Aventureiros',
            personalityNotes: '',
            goals: [],
            secrets: [],
            inventory: [],
            relationships: {},
          };
          return `npc_${i}`;
        })
      );

      const results = await Promise.all(promises);
      if (results.length !== 10) {
        throw new Error(`Esperado 10 resultados, recebido ${results.length}`);
      }

      const finalSnapshot = await fileStore.getSnapshot(campId);
      if (!finalSnapshot) throw new Error('Snapshot não encontrado');

      const npcCount = Object.keys(finalSnapshot.npcs).length;
      if (npcCount !== 10) {
        throw new Error(`Lost update detectado! Esperado 10 NPCs, mas restaram apenas ${npcCount}`);
      }

      console.log('✅ Cenário 1 PASSOU: 10 mutações simultâneas foram serializadas sem lost update.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 1 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 2: mutateSnapshot em campanhas diferentes não se bloqueiam mutuamente
    // =========================================================================
    console.log('\n--- CENÁRIO 2: mutateSnapshot em campanhas diferentes executa de forma independente ---');
    try {
      const campA = 'camp_diff_A';
      const campB = 'camp_diff_B';
      await fileStore.saveSnapshot(createSampleSnapshot(campA));
      await fileStore.saveSnapshot(createSampleSnapshot(campB));

      const enteredA = deferred();
      const releaseA = deferred();
      let finishedA = false;
      const pA = fileStore.mutateSnapshot(campA, async (snap) => {
        enteredA.resolve();
        await releaseA.promise;
        finishedA = true;
        snap.campaign.name = 'Campanha A Finalizada';
      });
      try {
        await bounded(enteredA.promise);
        await bounded(fileStore.mutateSnapshot(campB, (snap) => {
          snap.campaign.name = 'Campanha B Finalizada';
        }));
        assert.equal(finishedA, false, 'B deve confirmar enquanto A aguarda');
      } finally {
        releaseA.resolve();
        await pA;
      }

      console.log('✅ Cenário 2 PASSOU: Campanhas distintas operam em filas separadas e não bloqueiam.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 2 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 3: Exceção no mutador descarta alterações e preserva a versão anterior
    // =========================================================================
    console.log('\n--- CENÁRIO 3: Exceção no mutador preserva integridade e não corrompe cache ---');
    try {
      const campId = 'camp_fail_mutator';
      await fileStore.saveSnapshot(createSampleSnapshot(campId, 'Versão Inicial Íntegra'));

      let threwError = false;
      try {
        await fileStore.mutateSnapshot(campId, async (snapshot) => {
          snapshot.campaign.name = 'Tentativa de Corrupção';
          snapshot.npcs['corrupto'] = {
            id: 'corrupto',
            name: 'Corrompido',
            status: 'dead',
            location: '',
            faction: '',
            personalityNotes: '',
            goals: [],
            secrets: [],
            inventory: [],
            relationships: {},
          };
          throw new Error('Falha proposital dentro do mutador');
        });
      } catch (err: any) {
        if (err.message === 'Falha proposital dentro do mutador') {
          threwError = true;
        } else {
          throw err;
        }
      }

      if (!threwError) throw new Error('Deveria ter lançado erro do mutador');

      const afterFail = await fileStore.getSnapshot(campId);
      if (!afterFail) throw new Error('Snapshot sumiu');
      if (afterFail.campaign.name !== 'Versão Inicial Íntegra') {
        throw new Error(`Cache ou disco foi corrompido! Nome atual: ${afterFail.campaign.name}`);
      }
      if (afterFail.npcs['corrupto']) {
        throw new Error('NPC do mutador falho vazou para o snapshot');
      }

      console.log('✅ Cenário 3 PASSOU: Erro no mutador abortou o commit e manteve estado estável.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 3 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 4: InMemoryStore paridade de mutateSnapshot
    // =========================================================================
    console.log('\n--- CENÁRIO 4: Paridade de mutateSnapshot no InMemoryStore ---');
    try {
      const memoryStore = new InMemoryStore();
      const campId = 'mem_concurrent';
      await memoryStore.saveSnapshot(createSampleSnapshot(campId));

      await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          memoryStore.mutateSnapshot(campId, async (snapshot) => {
            await new Promise((r) => setTimeout(r, 5));
            snapshot.inventory.push({
              owner: 'Player',
              item: `Item_${i}`,
              quantity: 1,
            });
          })
        )
      );

      const memSnap = await memoryStore.getSnapshot(campId);
      if (!memSnap || memSnap.inventory.length !== 8) {
        throw new Error(`InMemoryStore sofreu lost update: esperado 8 itens, obtido ${memSnap?.inventory.length}`);
      }

      console.log('✅ Cenário 4 PASSOU: InMemoryStore serializa mutateSnapshot com paridade total.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 4 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 5: MemoryManager: Resolução definitiva do Lost Update com operações concorrentes reais
    // =========================================================================
    console.log('\n--- CENÁRIO 5: MemoryManager resolve Lost Update em chamadas simultâneas ---');
    try {
      const memoryManager = new MemoryManager(fileStore);
      const campId = 'camp_mm_lost_update_fixed';
      await memoryManager.createCampaign({ campaignId: campId, name: 'Campanha Anti Lost Update' });

      // Dispara simultaneamente:
      // - 3 NPCs criados
      // - 2 eventos criados
      // - 2 atualizações de inventário
      // - 2 quests criadas
      // - 1 relacionamento atualizado
      await Promise.all([
        memoryManager.createNPC(campId, { id: 'npc_arthur', name: 'Arthur Pendelton' }),
        memoryManager.createNPC(campId, { id: 'npc_gwen', name: 'Gwendolyn' }),
        memoryManager.createNPC(campId, { id: 'npc_merlin', name: 'Merlin' }),
        memoryManager.createEvent(campId, { description: 'Reunião na Távola Redonda' }),
        memoryManager.createEvent(campId, { description: 'Descoberta do Santo Graal' }),
        memoryManager.updateInventory(campId, 'Arthur', 'Excalibur', 1, 'add'),
        memoryManager.updateInventory(campId, 'Arthur', 'Escudo Real', 1, 'add'),
        memoryManager.createQuest(campId, { id: 'quest_graal', title: 'A Busca pelo Santo Graal' }),
        memoryManager.createQuest(campId, { id: 'quest_saxoes', title: 'Defesa das Fronteiras' }),
        memoryManager.updateRelationship(campId, 'Arthur', 'Merlin', {
          trust: 90,
          familiarity: 10,
        }),
      ]);

      // Verifica no snapshot mantido pelo memoryManager
      const consolidated = await memoryManager.getOrCreateSnapshot(campId);
      const npcCount = Object.keys(consolidated.npcs).length;
      const eventCount = consolidated.events.length;
      const invCount = consolidated.inventory.length;
      const questCount = consolidated.quests.length;
      const relCount = consolidated.relationships.length;

      if (npcCount !== 3) throw new Error(`NPCs perdidos! Esperado 3, obtido ${npcCount}`);
      if (eventCount !== 2) throw new Error(`Eventos perdidos! Esperado 2, obtido ${eventCount}`);
      if (invCount !== 2) throw new Error(`Inventário perdido! Esperado 2, obtido ${invCount}`);
      if (questCount !== 2) throw new Error(`Quests perdidas! Esperado 2, obtido ${questCount}`);
      if (relCount !== 1) throw new Error(`Relacionamento perdido! Esperado 1, obtido ${relCount}`);

      // =========================================================================
      // CENÁRIO 6: Durabilidade e recuperação pós-restart de nova instância
      // =========================================================================
      console.log('\n--- CENÁRIO 6: Reinício de instância carrega todos os dados consolidados do disco ---');
      const freshStore = new FilePersistentMemoryStore(storeDataDir);
      const freshManager = new MemoryManager(freshStore);

      const loadedSnapshot = await freshManager.getOrCreateSnapshot(campId);
      if (Object.keys(loadedSnapshot.npcs).length !== 3) throw new Error('Persistência em disco incompleta para NPCs');
      if (loadedSnapshot.events.length !== 2) throw new Error('Persistência em disco incompleta para Eventos');
      if (loadedSnapshot.inventory.length !== 2) throw new Error('Persistência em disco incompleta para Inventário');
      if (loadedSnapshot.quests.length !== 2) throw new Error('Persistência em disco incompleta para Quests');
      if (loadedSnapshot.relationships.length !== 1) throw new Error('Persistência em disco incompleta para Relacionamentos');

      console.log('✅ Cenários 5 & 6 PASSARAM: Operações concorrentes consolidadas e duráveis no disco pós-restart.');
      passed += 2;
    } catch (err: any) {
      console.error('❌ Cenário 5/6 FALHOU:', err.message);
      failed++;
    }

    // Mesmos contratos nos stores File e InMemory, usando manager/validator reais.
    for (const [label, store] of [
      ['File', fileStore], ['InMemory', new InMemoryStore()],
    ] as const) {
      const manager = new MemoryManager(store);
      const verifyRestart = async (campaignId: string) => {
        if (label === 'File') {
          assert.deepEqual(
            await new FilePersistentMemoryStore(storeDataDir).getSnapshot(campaignId),
            // O formato JSON omite propriedades opcionais com valor undefined.
            JSON.parse(JSON.stringify(await store.getSnapshot(campaignId))),
          );
        }
      };

      await check(`${label}: deltas concorrentes via validator preservam soma e histórico`, async () => {
        const id = `${label}_validator_deltas`;
        await manager.updateRelationship(id, 'Player', 'NPC', { trust: 10, hostility: 4, familiarity: 1 });
        // As duas leituras reais observam a mesma base, sem depender de sleeps.
        const originalRead = manager.getRelationship.bind(manager);
        const bothRead = deferred();
        let reads = 0;
        manager.getRelationship = async (...args) => {
          const result = await originalRead(...args);
          if (++reads === 2) bothRead.resolve();
          await bounded(bothRead.promise);
          return result;
        };
        try {
          const results = await Promise.all([2, 3].map((delta) =>
            MemoryValidator.validateAndApply(id, extraction({ relationshipChanges: [{
              characterA: 'Player', characterB: 'NPC', trustChange: delta,
              hostilityChange: delta, familiarityChange: 1, reason: `efeito ${delta}`,
            }] }), manager, 1),
          ));
          assert.ok(results.every((result) => result.validRelationships.length === 1));
        } finally {
          manager.getRelationship = originalRead;
        }
        const rel = await manager.getRelationship(id, 'Player', 'NPC');
        assert.equal(rel?.trust, 15);
        assert.equal(rel?.hostility, 9);
        assert.equal(rel?.familiarity, 3);
        assert.deepEqual(new Set(rel?.importantHistory), new Set(['efeito 2', 'efeito 3']));
        const snapshot = await store.getSnapshot(id);
        const index = snapshot?.semanticRecords?.find((record) => record.type === 'relationship');
        assert.equal(index?.text, new SemanticMemoryManager().formatRelationship(rel!));
        assert.equal('trustChange' in rel!, false, 'Delta não deve virar campo persistido');
        await verifyRestart(id);
      });

      await check(`${label}: deltas diretos no manager e campos distintos coexistem`, async () => {
        const id = `${label}_direct_deltas`;
        await Promise.all([
          manager.updateRelationship(id, 'Player', 'NPC', { trustChange: 2 }),
          manager.updateRelationship(id, 'Player', 'NPC', { trustChange: 3 }),
          manager.updateRelationship(id, 'Player', 'NPC', { hostilityChange: 4 }),
        ]);
        const rel = await manager.getRelationship(id, 'Player', 'NPC');
        assert.equal(rel?.trust, 5);
        assert.equal(rel?.hostility, 4);
        assert.equal((await store.getSnapshot(id))?.relationships.length, 1);
        await verifyRestart(id);
      });

      await check(`${label}: validator preserva precedência absoluta, limites e reason isolado`, async () => {
        const id = `${label}_relationship_semantics`;
        const apply = (change: MemoryExtractionResult['relationshipChanges'][number]) =>
          MemoryValidator.validateAndApply(id, extraction({ relationshipChanges: [change] }), manager, 1);
        await apply({ characterA: 'Player', characterB: 'NPC', trust: 7, trustChange: 90,
          hostility: -150, hostilityChange: 10, familiarity: 15, familiarityChange: -5 });
        let rel = await manager.getRelationship(id, 'Player', 'NPC');
        assert.equal(rel?.trust, 7);
        assert.equal(rel?.hostility, -100);
        assert.equal(rel?.familiarity, 10);
        await apply({ characterA: 'Player', characterB: 'NPC', trustChange: 200,
          hostilityChange: 300, familiarityChange: -20 });
        await apply({ characterA: 'Player', characterB: 'NPC', reason: 'histórico apenas' });
        rel = await manager.getRelationship(id, 'Player', 'NPC');
        assert.equal(rel?.trust, 100);
        assert.equal(rel?.hostility, 100);
        assert.equal(rel?.familiarity, 0);
        assert.deepEqual(rel?.importantHistory, ['histórico apenas']);
        const noChange = await apply({ characterA: 'Player', characterB: 'NPC', trustChange: 0 });
        assert.equal(noChange.validRelationships.length, 0);
      });

      await check(`${label}: Inventory acumula duas alterações do mesmo item via validator`, async () => {
        const id = `${label}_inventory`;
        await manager.updateInventory(id, 'Player', 'Moeda', 10, 'set');
        await Promise.all([2, 3].map((quantity) => MemoryValidator.validateAndApply(id,
          extraction({ inventoryChanges: [{ owner: 'Player', item: 'Moeda', action: 'acquired', quantity }] }),
          manager, 1)));
        assert.equal((await manager.getInventory(id, 'Player'))[0].quantity, 15);
        await verifyRestart(id);
      });

      await check(`${label}: Knowledge une knownBy concorrente sem duplicação via validator`, async () => {
        const id = `${label}_knowledge`;
        const fact = 'A chave de prata abre a torre norte';
        await manager.createKnowledge(id, { id: 'fact', fact, knownBy: ['Player'], isWorldTruth: false });
        await Promise.all(['Ana', 'Bia'].map((name) => MemoryValidator.validateAndApply(id,
          extraction({ knowledgeChanges: [{ fact, truthStatus: 'true', knownBy: ['Player', name] }] }),
          manager, 1)));
        const snapshot = await store.getSnapshot(id);
        assert.equal(snapshot?.knowledge.length, 1);
        assert.deepEqual(snapshot?.knowledge[0].knownBy.slice().sort(), ['Ana', 'Bia', 'Player']);
        await verifyRestart(id);
      });

      await check(`${label}: falha do mutador preserva snapshot e libera próxima mutação`, async () => {
        const id = `${label}_abort`;
        await manager.createCampaign({ campaignId: id, name: 'Confirmado' });
        const before = await store.getSnapshot(id);
        await assert.rejects(store.mutateSnapshot(id, (snapshot) => {
          snapshot.campaign.name = 'Parcial';
          snapshot.inventory.push({ owner: 'Player', item: 'Inválido', quantity: 1 });
          throw new Error('mutator failure');
        }), /mutator failure/);
        assert.deepEqual(await store.getSnapshot(id), before);
        await verifyRestart(id);
        await bounded(manager.updateCampaign(id, { currentLocation: 'Novo local' }));
        assert.equal((await store.getSnapshot(id))?.campaign.name, 'Confirmado');
        await verifyRestart(id);
      });
    }

    await check('File: leitura antiga com cache vazio não reverte mutação confirmada', async () => {
      const id = 'cold_read';
      await new MemoryManager(fileStore).updateInventory(id, 'Player', 'Moeda', 10, 'set');
      const coldStore = new FilePersistentMemoryStore(storeDataDir);
      const manager = new MemoryManager(coldStore);
      const capturedRead = deferred();
      const releaseRead = deferred();
      const originalReadFile = fs.promises.readFile;
      let held = false;
      (fs.promises as any).readFile = async (...args: any[]) => {
        const data = await (originalReadFile as Function)(...args);
        if (!held && String(args[0]) === path.join(storeDataDir, `memory_${id}.json`)) {
          held = true;
          capturedRead.resolve();
          await releaseRead.promise;
        }
        return data;
      };
      const oldRead = coldStore.getSnapshot(id);
      try {
        await bounded(capturedRead.promise);
        // A leitura reteve os bytes antigos; uma segunda leitura permite confirmar +2.
        await bounded(manager.updateInventory(id, 'Player', 'Moeda', 2, 'add'));
        releaseRead.resolve();
        assert.equal((await oldRead)?.inventory[0].quantity, 12);
        await manager.updateInventory(id, 'Player', 'Moeda', 3, 'add');
        assert.equal((await manager.getInventory(id, 'Player'))[0].quantity, 15);
        assert.equal((await new FilePersistentMemoryStore(storeDataDir).getSnapshot(id))?.inventory[0].quantity, 15);
      } finally {
        releaseRead.resolve();
        try {
          await oldRead;
        } finally {
          fs.promises.readFile = originalReadFile;
        }
      }
    });

    for (const method of ['writeFile', 'rename'] as const) {
      await check(`File: falha de ${method} em mutateSnapshot preserva commit e fila`, async () => {
        const id = `io_${method}`;
        const manager = new MemoryManager(fileStore);
        await manager.updateRelationship(id, 'Player', 'NPC', { trust: 10 });
        const before = await fileStore.getSnapshot(id);
        const original = fs.promises[method];
        let injected = false;
        (fs.promises as any)[method] = async (...args: any[]) => {
          if (String(args[0]).startsWith(path.join(storeDataDir, `memory_${id}.json.tmp.`))) {
            injected = true;
            throw new Error(`injected ${method}`);
          }
          return (original as Function)(...args);
        };
        try {
          await assert.rejects(manager.updateRelationship(id, 'Player', 'NPC', { trustChange: 5 }),
            new RegExp(`injected ${method}`));
          assert.equal(injected, true);
          assert.deepEqual(await fileStore.getSnapshot(id), before);
          assert.deepEqual(await new FilePersistentMemoryStore(storeDataDir).getSnapshot(id), before);
        } finally {
          (fs.promises as any)[method] = original;
        }
        await bounded(manager.updateRelationship(id, 'Player', 'NPC', { trustChange: 2 }));
        assert.equal((await manager.getRelationship(id, 'Player', 'NPC'))?.trust, 12);
        assert.deepEqual(await new FilePersistentMemoryStore(storeDataDir).getSnapshot(id),
          await fileStore.getSnapshot(id));
        assert.equal((await fs.promises.readdir(storeDataDir)).some((file) => file.includes('.tmp.')), false);
      });
    }
  } finally {
    SemanticMemoryManager.prototype.generateEmbedding = originalEmbedding;
    // Cleanup garantido
    try {
      await fs.promises.rm(testBaseDir, { recursive: true, force: true });
      console.log('\nHigiene de persistência: Diretório temporário removido com sucesso.');
    } catch (cleanErr: any) {
      console.error('Erro na limpeza do diretório temporário:', cleanErr.message);
      throw cleanErr;
    }
  }

  console.log('\n===============================================================');
  console.log(`RESULTADO FINAL: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllMemoryConcurrencyTests().catch((err) => {
  console.error('Erro fatal ao rodar testes de concorrência:', err);
  process.exit(1);
});
