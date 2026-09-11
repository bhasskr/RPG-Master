import path from 'path';
import fs from 'fs';
import os from 'os';
import { FilePersistentMemoryStore } from '../server/engine/memory/filePersistentStore';
import { InMemoryStore } from '../server/engine/memory/inMemoryStore';
import { MemoryManager } from '../server/engine/memory/memoryManager';
import { CampaignMemorySnapshot } from '../server/engine/memory/types';

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

      let order: string[] = [];

      const pA = fileStore.mutateSnapshot(campA, async (snap) => {
        order.push('A_start');
        await new Promise((r) => setTimeout(r, 50));
        order.push('A_end');
        snap.campaign.name = 'Campanha A Finalizada';
      });

      const pB = fileStore.mutateSnapshot(campB, async (snap) => {
        // Camp B inicia rapidamente
        await new Promise((r) => setTimeout(r, 10));
        order.push('B_start');
        await new Promise((r) => setTimeout(r, 10));
        order.push('B_end');
        snap.campaign.name = 'Campanha B Finalizada';
      });

      await Promise.all([pA, pB]);

      // B deve conseguir começar e terminar enquanto A ainda está rodando
      const bFinishedBeforeA = order.indexOf('B_end') < order.indexOf('A_end');
      if (!bFinishedBeforeA) {
        throw new Error(`Operações em campanhas distintas foram indevidamente bloqueadas em fila global: ${order.join(', ')}`);
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
      await memoryManager.createCampaign(campId, 'Campanha Anti Lost Update');

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

  } finally {
    // Cleanup garantido
    try {
      await fs.promises.rm(testBaseDir, { recursive: true, force: true });
      console.log('\nHigiene de persistência: Diretório temporário removido com sucesso.');
    } catch (cleanErr: any) {
      console.error('Erro na limpeza do diretório temporário:', cleanErr.message);
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
