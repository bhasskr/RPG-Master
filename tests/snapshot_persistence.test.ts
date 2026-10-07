import path from 'path';
import fs from 'fs';
import os from 'os';
import { FilePersistentMemoryStore } from '../server/engine/memory/filePersistentStore';
import { MemoryManager } from '../server/engine/memory/memoryManager';
import { CampaignMemorySnapshot, NPC } from '../server/engine/memory/types';
import { SemanticMemoryManager } from '../server/engine/memory/semanticMemory';

function createSampleSnapshot(campaignId: string, name: string = 'Campanha Teste'): CampaignMemorySnapshot {
  return {
    campaign: {
      campaignId,
      name,
      createdAt: Date.now(),
      currentDate: '10 de Flamerule',
      currentLocation: 'Vila da Pedra',
    },
    npcs: {
      eldrin: {
        id: 'eldrin',
        name: 'Eldrin, o Alquimista',
        status: 'alive',
        location: 'Vila da Pedra',
        faction: 'Guilda dos Alquimistas',
        personalityNotes: 'Desconfiado e metódico',
        goals: ['Descobrir a cura'],
        secrets: ['Esconde veneno proibido'],
        inventory: ['Frasco de ácido'],
        relationships: {},
      },
    },
    events: [
      {
        id: 'evt_1',
        timestamp: Date.now(),
        location: 'Vila da Pedra',
        participants: ['Eldrin'],
        description: 'Explosão menor no laboratório',
        consequences: ['Vidraça quebrada'],
      },
    ],
    knowledge: [
      {
        id: 'know_1',
        fact: 'Eldrin possui uma chave de latão',
        truthStatus: 'true',
        knownBy: ['Eldrin'],
        suspectedBy: [],
        source: 'observação',
        reliability: 10,
        isWorldTruth: true,
      },
    ],
    relationships: [],
    inventory: [],
    quests: [],
    updatedAt: Date.now(),
  };
}

async function runAllSnapshotPersistenceTests() {
  console.log('===============================================================');
  console.log('TESTES DE PERSISTÊNCIA DE SNAPSHOT: Consistência, Cache e I/O');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  // Criação isolada em diretório temporário do sistema operacional
  const testBaseDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'rpg_snapshot_test_'));
  const storeDataDir = path.join(testBaseDir, 'rpg_memory');
  const originalEmbedding = SemanticMemoryManager.prototype.generateEmbedding;
  SemanticMemoryManager.prototype.generateEmbedding = async () => [1, 0];

  try {
    const store = new FilePersistentMemoryStore(storeDataDir);

    // =========================================================================
    // CENÁRIO 1: Isolamento de leitura (Anti-Aliasing do Cache)
    // =========================================================================
    console.log('--- CENÁRIO 1: Isolamento de leitura (Anti-Aliasing do Cache) ---');
    try {
      const campId = 'camp_anti_aliasing';
      const initial = createSampleSnapshot(campId, 'Campanha Original');
      await store.saveSnapshot(initial);

      // Leitura 1: chamador obtém o snapshot
      const read1 = await store.getSnapshot(campId);
      if (!read1) throw new Error('Snapshot não encontrado após salvar.');

      // Chamador muta o objeto em memória SEM chamar saveSnapshot
      read1.campaign.name = 'Nome Mutado Indevidamente';
      read1.npcs['eldrin'].status = 'dead';
      (read1.npcs as Record<string, NPC>)['intruder'] = {
        id: 'intruder',
        name: 'Invasor Fantasma',
        status: 'alive',
        location: 'Lugar Nenhum',
        faction: '',
        personalityNotes: '',
        goals: [],
        secrets: [],
        inventory: [],
        relationships: {},
      };

      // Leitura 2: nova leitura do store
      const read2 = await store.getSnapshot(campId);
      if (!read2) throw new Error('Segunda leitura retornou nulo.');

      if (read2.campaign.name !== 'Campanha Original') {
        throw new Error(`Aliasing detectado no cache: nome foi modificado para "${read2.campaign.name}"!`);
      }
      if (read2.npcs['eldrin'].status !== 'alive') {
        throw new Error(`Aliasing detectado no cache: status do NPC foi modificado para "${read2.npcs['eldrin'].status}"!`);
      }
      if (read2.npcs['intruder']) {
        throw new Error('Aliasing detectado no cache: NPC intruso apareceu no cache do store!');
      }

      // Validação no disco
      const memoryFilePath = path.join(storeDataDir, `memory_${campId}.json`);
      const diskContent = JSON.parse(await fs.promises.readFile(memoryFilePath, 'utf-8'));
      if (diskContent.campaign.name !== 'Campanha Original') {
        throw new Error('Disco foi afetado por mutação in-place sem saveSnapshot!');
      }

      console.log('✅ Cenário 1 PASSOU: Mutação em objeto retornado por getSnapshot() não polui o cache nem o disco.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 1 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 2: saveSnapshot bem-sucedido sincroniza Cache e Disco
    // =========================================================================
    console.log('\n--- CENÁRIO 2: saveSnapshot bem-sucedido sincroniza Cache e Disco ---');
    try {
      const campId = 'camp_sync_ok';
      const snap = createSampleSnapshot(campId, 'Campanha Sincronizada');
      snap.campaign.currentLocation = 'Fortaleza Alta';
      await store.saveSnapshot(snap);

      const fromCache = await store.getSnapshot(campId);
      const memoryFilePath = path.join(storeDataDir, `memory_${campId}.json`);
      const fromDisk = JSON.parse(await fs.promises.readFile(memoryFilePath, 'utf-8'));

      if (!fromCache || !fromDisk) throw new Error('Falha ao obter snapshot do cache ou disco.');
      if (fromCache.campaign.currentLocation !== 'Fortaleza Alta') {
        throw new Error('Cache em memória não refletiu nova localização.');
      }
      if (fromDisk.campaign.currentLocation !== 'Fortaleza Alta') {
        throw new Error('Arquivo em disco não refletiu nova localização.');
      }
      if (fromCache.updatedAt !== fromDisk.updatedAt) {
        throw new Error(`Divergência de timestamp: cache=${fromCache.updatedAt}, disco=${fromDisk.updatedAt}`);
      }

      console.log('✅ Cenário 2 PASSOU: Cache e disco refletem exatamente a mesma versão confirmada.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 2 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 3: Falha de writeFile mantém Cache e Disco na versão anterior
    // =========================================================================
    console.log('\n--- CENÁRIO 3: Falha de writeFile mantém Cache e Disco na versão anterior ---');
    try {
      const campId = 'camp_fail_write';
      const v1 = createSampleSnapshot(campId, 'Versão V1 Confirmada');
      await store.saveSnapshot(v1);

      const originalWriteFile = fs.promises.writeFile;
      let writeInduced = false;

      try {
        fs.promises.writeFile = async (file: any, data: any, options: any) => {
          if (typeof file === 'string' && file.includes(campId)) {
            writeInduced = true;
            throw new Error('EACCES: permission denied simulated on writeFile');
          }
          return originalWriteFile.call(fs.promises, file, data, options);
        };

        const v2 = createSampleSnapshot(campId, 'Versão V2 Falha Write');
        let errorCaught = false;
        try {
          await store.saveSnapshot(v2);
        } catch {
          errorCaught = true;
        }

        if (!writeInduced) throw new Error('Falha de writeFile não foi induzida no caminho esperado.');
        if (!errorCaught) throw new Error('saveSnapshot deveria ter propagado a falha de writeFile!');
      } finally {
        fs.promises.writeFile = originalWriteFile;
      }

      // Validação: Cache deve continuar na V1
      const cached = await store.getSnapshot(campId);
      if (!cached || cached.campaign.name !== 'Versão V1 Confirmada') {
        throw new Error(`Cache divergiu após falha de writeFile! Nome no cache: "${cached?.campaign.name}"`);
      }

      // Validação: Disco deve continuar na V1
      const memoryFilePath = path.join(storeDataDir, `memory_${campId}.json`);
      const diskContent = JSON.parse(await fs.promises.readFile(memoryFilePath, 'utf-8'));
      if (diskContent.campaign.name !== 'Versão V1 Confirmada') {
        throw new Error(`Disco divergiu após falha de writeFile! Nome no disco: "${diskContent.campaign.name}"`);
      }

      console.log('✅ Cenário 3 PASSOU: Falha de writeFile manteve cache e disco na versão confirmada anterior.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 3 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 4: Falha de rename mantém Cache/Disco anteriores e NÃO deixa .tmp
    // =========================================================================
    console.log('\n--- CENÁRIO 4: Falha de rename mantém Cache/Disco anteriores e limpa .tmp ---');
    try {
      const campId = 'camp_fail_rename';
      const v1 = createSampleSnapshot(campId, 'Versão V1 Rename Confirmada');
      await store.saveSnapshot(v1);

      const originalRename = fs.promises.rename;
      let renameInduced = false;

      try {
        fs.promises.rename = async (oldPath: any, newPath: any) => {
          if (typeof oldPath === 'string' && oldPath.includes(campId)) {
            renameInduced = true;
            throw new Error('EXDEV: cross-device link simulated on rename');
          }
          return originalRename.call(fs.promises, oldPath, newPath);
        };

        const v2 = createSampleSnapshot(campId, 'Versão V2 Falha Rename');
        let errorCaught = false;
        try {
          await store.saveSnapshot(v2);
        } catch {
          errorCaught = true;
        }

        if (!renameInduced) throw new Error('Falha de rename não foi induzida no caminho esperado.');
        if (!errorCaught) throw new Error('saveSnapshot deveria ter propagado a falha de rename!');
      } finally {
        fs.promises.rename = originalRename;
      }

      // Validação 1: Cache continua na V1
      const cached = await store.getSnapshot(campId);
      if (!cached || cached.campaign.name !== 'Versão V1 Rename Confirmada') {
        throw new Error(`Cache divergiu após falha de rename! Nome: "${cached?.campaign.name}"`);
      }

      // Validação 2: Disco continua na V1
      const memoryFilePath = path.join(storeDataDir, `memory_${campId}.json`);
      const diskContent = JSON.parse(await fs.promises.readFile(memoryFilePath, 'utf-8'));
      if (diskContent.campaign.name !== 'Versão V1 Rename Confirmada') {
        throw new Error(`Disco divergiu após falha de rename! Nome: "${diskContent.campaign.name}"`);
      }

      // Validação 3: Nenhum arquivo temporário residual na pasta
      const files = await fs.promises.readdir(storeDataDir);
      const tmpFiles = files.filter((f) => f.includes(campId) && f.includes('.tmp.'));
      if (tmpFiles.length > 0) {
        throw new Error(`Arquivo temporário residual não foi limpo: ${JSON.stringify(tmpFiles)}`);
      }

      console.log('✅ Cenário 4 PASSOU: Falha de rename preservou versão anterior e removeu arquivo .tmp.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 4 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 5: Falha de unlink em clearSnapshot preserva o Cache e propaga o erro
    // =========================================================================
    console.log('\n--- CENÁRIO 5: Falha de unlink em clearSnapshot preserva Cache e propaga erro ---');
    try {
      const campId = 'camp_fail_clear';
      const v1 = createSampleSnapshot(campId, 'Campanha Para Clear com Falha');
      await store.saveSnapshot(v1);

      const originalUnlink = fs.promises.unlink;
      let unlinkInduced = false;

      try {
        fs.promises.unlink = async (filePath: any) => {
          if (typeof filePath === 'string' && filePath.includes(campId)) {
            unlinkInduced = true;
            throw new Error('EACCES: permission denied on unlink');
          }
          return originalUnlink.call(fs.promises, filePath);
        };

        let caught = false;
        try {
          await store.clearSnapshot(campId);
        } catch {
          caught = true;
        }

        if (!unlinkInduced) throw new Error('Falha de unlink não foi induzida no caminho esperado.');
        if (!caught) throw new Error('clearSnapshot deveria ter propagado a falha de unlink!');
      } finally {
        fs.promises.unlink = originalUnlink;
      }

      // Validação: Cache deve continuar disponível porque a deleção física falhou
      const cached = await store.getSnapshot(campId);
      if (!cached || cached.campaign.name !== 'Campanha Para Clear com Falha') {
        throw new Error('Cache foi indevidamente apagado mesmo com falha de unlink no disco!');
      }

      console.log('✅ Cenário 5 PASSOU: Falha de unlink propagou erro e manteve o cache disponível.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 5 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 6: ENOENT em clearSnapshot resulta em snapshot removido do cache sem erro
    // =========================================================================
    console.log('\n--- CENÁRIO 6: ENOENT em clearSnapshot remove do cache sem erro ---');
    try {
      const campId = 'camp_enoent_clear';
      const v1 = createSampleSnapshot(campId, 'Campanha Para Clear com ENOENT');
      await store.saveSnapshot(v1);

      // Removemos o arquivo do disco antes de chamar clearSnapshot para forçar ENOENT no unlink
      const memoryFilePath = path.join(storeDataDir, `memory_${campId}.json`);
      await fs.promises.unlink(memoryFilePath);

      // O cache ainda possui a campanha em memória
      // clearSnapshot deve executar sem estourar exceção em ENOENT e remover do cache
      await store.clearSnapshot(campId);

      const cached = await store.getSnapshot(campId);
      if (cached !== null) {
        throw new Error('Snapshot ainda existe no cache após clearSnapshot com ENOENT no disco!');
      }

      console.log('✅ Cenário 6 PASSOU: clearSnapshot com ENOENT no disco removeu do cache com sucesso sem erro.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 6 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 7: Restart do Store carrega exatamente a última persistência bem-sucedida
    // =========================================================================
    console.log('\n--- CENÁRIO 7: Restart do store carrega última persistência bem-sucedida ---');
    try {
      const campId = 'camp_restart';
      const v1 = createSampleSnapshot(campId, 'Campanha V1');
      await store.saveSnapshot(v1);

      const v2 = createSampleSnapshot(campId, 'Campanha V2');
      v2.campaign.currentLocation = 'Cidadela de Ferro';
      await store.saveSnapshot(v2);

      // Simula uma tentativa V3 com falha de I/O
      const originalWriteFile = fs.promises.writeFile;
      try {
        fs.promises.writeFile = async (file: any, data: any, options: any) => {
          if (typeof file === 'string' && file.includes(campId)) {
            throw new Error('Simulated I/O failure on V3');
          }
          return originalWriteFile.call(fs.promises, file, data, options);
        };
        const v3 = createSampleSnapshot(campId, 'Campanha V3 Falha');
        await store.saveSnapshot(v3).catch(() => {});
      } finally {
        fs.promises.writeFile = originalWriteFile;
      }

      // Reinicialização do store (nova instância com cache frio)
      const restartedStore = new FilePersistentMemoryStore(storeDataDir);
      const loaded = await restartedStore.getSnapshot(campId);

      if (!loaded) throw new Error('Nova instância não encontrou snapshot no disco.');
      if (loaded.campaign.name !== 'Campanha V2' || loaded.campaign.currentLocation !== 'Cidadela de Ferro') {
        throw new Error(`Nova instância carregou versão inesperada: "${loaded.campaign.name}" em "${loaded.campaign.currentLocation}"`);
      }

      console.log('✅ Cenário 7 PASSOU: Nova instância carregou exatamente a última versão confirmada V2.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 7 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 8: Duas chamadas saveSnapshot concorrentes na mesma campanha
    // =========================================================================
    console.log('\n--- CENÁRIO 8: saveSnapshot concorrente sob lock na mesma campanha ---');
    try {
      const campId = 'camp_concurrent_save';
      const snapA = createSampleSnapshot(campId, 'Versão Rápida A');
      snapA.campaign.currentLocation = 'Local A';

      const snapB = createSampleSnapshot(campId, 'Versão Rápida B');
      snapB.campaign.currentLocation = 'Local B';
      // Adiciona carga maior em snapB para testar integridade de serialização
      for (let i = 0; i < 50; i++) {
        snapB.npcs[`npc_${i}`] = {
          id: `npc_${i}`,
          name: `NPC Concorrente ${i}`,
          status: 'alive',
          location: 'Local B',
          faction: 'Neutro',
          personalityNotes: 'Teste de estresse de escrita concorrente',
          goals: [],
          secrets: [],
          inventory: [],
          relationships: {},
        };
      }

      // Dispara ambas as gravações simultaneamente
      await Promise.all([
        store.saveSnapshot(snapA),
        store.saveSnapshot(snapB),
      ]);

      // Validação 1: O arquivo no disco deve ser um JSON perfeitamente íntegro e legível
      const memoryFilePath = path.join(storeDataDir, `memory_${campId}.json`);
      const rawDisk = await fs.promises.readFile(memoryFilePath, 'utf-8');
      const parsedDisk = JSON.parse(rawDisk);

      // Validação 2: O cache do store e o disco devem estar exatamente sincronizados
      const cached = await store.getSnapshot(campId);
      if (!cached) throw new Error('Snapshot concorrente não encontrado no cache.');

      if (cached.campaign.name !== parsedDisk.campaign.name) {
        throw new Error(`Divergência entre cache ("${cached.campaign.name}") e disco ("${parsedDisk.campaign.name}")!`);
      }

      // Validação 3: Não pode haver arquivo .tmp na pasta
      const files = await fs.promises.readdir(storeDataDir);
      const tmpFiles = files.filter((f) => f.includes(campId) && f.includes('.tmp.'));
      if (tmpFiles.length > 0) {
        throw new Error(`Arquivos .tmp residuais após concorrência: ${JSON.stringify(tmpFiles)}`);
      }

      console.log('✅ Cenário 8 PASSOU: Duas escritas simultâneas foram serializadas pelo lock sem corromper JSON.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 8 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 9: Prevenção de lost update pelo caminho oficial de mutação
    // =========================================================================
    console.log('\n--- CENÁRIO 9: Mutações concorrentes preservam ambos os NPCs ---');
    try {
      const campId = 'camp_rmw_investigation';
      const initial = createSampleSnapshot(campId, 'Campanha Base RMW');
      await store.saveSnapshot(initial);

      const manager = new MemoryManager(store);
      await Promise.all([
        manager.createNPC(campId, { id: 'balerion', name: 'Balerion, o Dragão' }),
        manager.createNPC(campId, { id: 'vhagar', name: 'Vhagar, a Rainha' }),
      ]);
      for (const reader of [store, new FilePersistentMemoryStore(storeDataDir)]) {
        const state = await reader.getSnapshot(campId);
        if (!state?.npcs.eldrin || !state.npcs.balerion || !state.npcs.vhagar) {
          throw new Error('Lost update: NPC original ou concorrente ausente no cache/disco.');
        }
      }

      console.log('✅ Cenário 9 PASSOU: NPCs preservados inclusive após restart.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 9 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 10: MemoryManager com SemanticRecords e Isolamento da Cópia de Trabalho
    // =========================================================================
    console.log('\n--- CENÁRIO 10: MemoryManager opera sobre cópia de trabalho e atualiza semanticRecords ---');
    try {
      const campId = 'camp_mm_integration';
      const mmStore = new FilePersistentMemoryStore(storeDataDir);
      const memoryManager = new MemoryManager(mmStore);

      await memoryManager.createCampaign({
        campaignId: campId,
        name: 'Campanha MemoryManager',
        currentLocation: 'Taverna do Javali',
      });

      // Criação de NPC através do MemoryManager
      const createdNPC = await memoryManager.createNPC(campId, {
        name: 'Gareth, o Guarda',
        status: 'alive',
        location: 'Portão Sul',
      });

      if (!createdNPC || createdNPC.name !== 'Gareth, o Guarda') {
        throw new Error('Falha ao criar NPC pelo MemoryManager.');
      }

      // Verificação: o snapshot retornado pelo store deve conter o NPC
      const snap = await mmStore.getSnapshot(campId);
      if (!snap || !snap.npcs[createdNPC.id]) {
        throw new Error('NPC criado não encontrado no snapshot persistido.');
      }

      // Verificação: alteração direta no snapshot obtido do MemoryManager não altera o store
      const directSnap = await memoryManager.getSnapshot(campId);
      if (directSnap) {
        directSnap.campaign.name = 'Nome Mutado via MemoryManager';
      }

      const freshSnap = await memoryManager.getSnapshot(campId);
      if (freshSnap?.campaign.name !== 'Campanha MemoryManager') {
        throw new Error('Mutação externa no retorno de memoryManager.getSnapshot() poluiu o store!');
      }

      console.log('✅ Cenário 10 PASSOU: MemoryManager opera sobre cópias isoladas sem poluir o cache autoritativo.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 10 FALHOU:', err.message);
      failed++;
    }

  } finally {
    SemanticMemoryManager.prototype.generateEmbedding = originalEmbedding;
    // Cleanup incondicional do diretório temporário
    try {
      await fs.promises.rm(testBaseDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.warn('Aviso ao remover testBaseDir temporário:', cleanupErr);
    }
  }

  // Asserções de higiene pós-cleanup:
  // 1. O diretório temporário no SO foi removido
  if (fs.existsSync(testBaseDir)) {
    throw new Error(`Falha de higiene: diretório temporário ${testBaseDir} ainda existe!`);
  }

  // 2. Não foram criados arquivos residuais na pasta data/ do projeto
  const projectDataDir = path.join(process.cwd(), 'data');
  if (fs.existsSync(projectDataDir)) {
    const dataEntries = fs.readdirSync(projectDataDir);
    const leakedArtifacts = dataEntries.filter((name) => name.startsWith('test_snapshot_') || name.startsWith('camp_'));
    if (leakedArtifacts.length > 0) {
      throw new Error(`Falha de higiene: arquivos de teste gerados em data/: ${JSON.stringify(leakedArtifacts)}`);
    }
  }

  console.log('\n===============================================================');
  console.log(`RESULTADO FINAL: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('Higiene de persistência: testBaseDir temporário removido com sucesso.');
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllSnapshotPersistenceTests().catch((err) => {
  console.error('Erro fatal nos testes de persistência de snapshot:', err);
  process.exit(1);
});
