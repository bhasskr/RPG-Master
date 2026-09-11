import path from 'path';
import fs from 'fs';
import os from 'os';
import { GameStateManager } from '../server/engine/gameState/gameStateManager';

function createSampleParams(campaignId: string, title: string = 'Campanha Teste') {
  return {
    campaignId,
    title,
    genre: 'Fantasia Sombria',
    startingLocation: 'Ruínas Antigas',
    playerName: 'Gareth',
    playerArchetype: 'Guerreiro',
  };
}

async function runAllGameStatePersistenceTests() {
  console.log('===============================================================');
  console.log('TESTES DE PERSISTÊNCIA DE GAMESTATE: Durabilidade, Cache e I/O');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  // Diretório temporário único no SO
  const testBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpg_gamestate_test_'));
  const stateDataDir = path.join(testBaseDir, 'rpg_gamestate');

  try {
    const manager = new GameStateManager(stateDataDir);

    // =========================================================================
    // CENÁRIO 1: getGameState() retorna cópia isolada (Anti-Aliasing)
    // =========================================================================
    console.log('--- CENÁRIO 1: getGameState() retorna cópia isolada (Anti-Aliasing) ---');
    try {
      const campId = 'camp_anti_aliasing';
      manager.createCampaign(createSampleParams(campId, 'Campanha Original'));

      // Leitura 1: chamador obtém o GameState
      const read1 = manager.getGameState(campId);
      if (!read1) throw new Error('GameState não encontrado após criação.');

      // Chamador muta o objeto em memória SEM chamar save
      read1.foundation.title = 'Título Mutado Indevidamente';
      read1.worldState.currentLocation = 'Lugar Hackeado';
      read1.turn = 999;
      read1.npcs.push({
        id: 'npc_fantasma',
        name: 'NPC Fantasma',
        role: 'npc',
        personality: '',
        status: 'alive',
      });

      // Leitura 2: nova leitura via getGameState
      const read2 = manager.getGameState(campId);
      if (!read2) throw new Error('Segunda leitura retornou nulo.');

      if (read2.foundation.title !== 'Campanha Original') {
        throw new Error(`Aliasing detectado no cache: título mudou para "${read2.foundation.title}"!`);
      }
      if (read2.worldState.currentLocation !== 'Ruínas Antigas') {
        throw new Error(`Aliasing detectado no cache: localização mudou para "${read2.worldState.currentLocation}"!`);
      }
      if (read2.turn !== 0) {
        throw new Error(`Aliasing detectado no cache: turno mudou para ${read2.turn}!`);
      }
      if (read2.npcs.length !== 0) {
        throw new Error(`Aliasing detectado no cache: NPCs foram polucionados com ${read2.npcs.length} itens!`);
      }

      // Validação no disco
      const filePath = path.join(stateDataDir, `gamestate_${campId}.json`);
      const disk = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (disk.foundation.title !== 'Campanha Original' || disk.turn !== 0) {
        throw new Error('Arquivo no disco foi corrompido por mutação in-place!');
      }

      console.log('✅ Cenário 1 PASSOU: Mutação em objeto retornado por getGameState() não afeta cache nem disco.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 1 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 2: saveGameState() bem-sucedido deixa Cache e Disco idênticos
    // =========================================================================
    console.log('\n--- CENÁRIO 2: saveGameState() bem-sucedido deixa Cache e Disco idênticos ---');
    try {
      const campId = 'camp_save_sync';
      manager.createCampaign(createSampleParams(campId, 'Campanha Inicial'));

      const stateToSave = manager.getGameState(campId)!;
      stateToSave.foundation.title = 'Título Atualizado e Confirmado';
      stateToSave.worldState.weather = 'Tempestade de Neve';
      manager.saveGameState(stateToSave);

      const cached = manager.getGameState(campId);
      const filePath = path.join(stateDataDir, `gamestate_${campId}.json`);
      const disk = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      if (!cached || !disk) throw new Error('GameState não encontrado no cache ou disco.');
      if (cached.foundation.title !== 'Título Atualizado e Confirmado') {
        throw new Error(`Cache não refletiu o novo título: "${cached.foundation.title}"`);
      }
      if (disk.foundation.title !== 'Título Atualizado e Confirmado') {
        throw new Error(`Disco não refletiu o novo título: "${disk.foundation.title}"`);
      }
      if (cached.worldState.weather !== 'Tempestade de Neve' || disk.worldState.weather !== 'Tempestade de Neve') {
        throw new Error('Clima no cache e disco não conferem.');
      }
      if (cached.updatedAt !== disk.updatedAt) {
        throw new Error(`Divergência de timestamp updatedAt: cache=${cached.updatedAt}, disco=${disk.updatedAt}`);
      }

      console.log('✅ Cenário 2 PASSOU: Cache e disco refletem a mesma versão confirmada.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 2 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 3: Falha de writeFileSync mantém Cache e Disco na versão anterior
    // =========================================================================
    console.log('\n--- CENÁRIO 3: Falha de writeFileSync mantém Cache e Disco na versão anterior ---');
    try {
      const campId = 'camp_fail_write';
      manager.createCampaign(createSampleParams(campId, 'Versão V1 Confirmada'));

      const originalWriteFileSync = fs.writeFileSync;
      let writeInduced = false;

      try {
        fs.writeFileSync = ((file: any, data: any, options: any) => {
          if (typeof file === 'string' && file.includes(campId)) {
            writeInduced = true;
            throw new Error('EACCES: permission denied simulated on writeFileSync');
          }
          return originalWriteFileSync.call(fs, file, data, options);
        }) as any;

        const candidate = manager.getGameState(campId)!;
        candidate.foundation.title = 'Versão V2 Falha Write';

        let errorCaught = false;
        try {
          manager.saveGameState(candidate);
        } catch {
          errorCaught = true;
        }

        if (!writeInduced) throw new Error('Falha de writeFileSync não foi interceptada.');
        if (!errorCaught) throw new Error('saveGameState deveria ter propagado a exceção de I/O!');
      } finally {
        fs.writeFileSync = originalWriteFileSync;
      }

      // Validação Cache: deve continuar V1
      const cached = manager.getGameState(campId);
      if (cached?.foundation.title !== 'Versão V1 Confirmada') {
        throw new Error(`Cache divergiu após falha de escrita! Título: "${cached?.foundation.title}"`);
      }

      // Validação Disco: deve continuar V1
      const filePath = path.join(stateDataDir, `gamestate_${campId}.json`);
      const disk = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (disk.foundation.title !== 'Versão V1 Confirmada') {
        throw new Error(`Disco divergiu após falha de escrita! Título: "${disk.foundation.title}"`);
      }

      console.log('✅ Cenário 3 PASSOU: Falha de escrita preservou versão anterior no cache e no disco.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 3 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 4: Falha de renameSync mantém versão anterior e limpa .tmp
    // =========================================================================
    console.log('\n--- CENÁRIO 4: Falha de renameSync mantém versão anterior e limpa .tmp ---');
    try {
      const campId = 'camp_fail_rename';
      manager.createCampaign(createSampleParams(campId, 'Versão V1 Rename'));

      const originalRenameSync = fs.renameSync;
      let renameInduced = false;

      try {
        fs.renameSync = (oldPath: fs.PathLike, newPath: fs.PathLike) => {
          if (typeof oldPath === 'string' && oldPath.includes(campId)) {
            renameInduced = true;
            throw new Error('EXDEV: cross-device link simulated on renameSync');
          }
          return originalRenameSync.call(fs, oldPath, newPath);
        };

        const candidate = manager.getGameState(campId)!;
        candidate.foundation.title = 'Versão V2 Falha Rename';

        let errorCaught = false;
        try {
          manager.saveGameState(candidate);
        } catch {
          errorCaught = true;
        }

        if (!renameInduced) throw new Error('Falha de renameSync não foi interceptada.');
        if (!errorCaught) throw new Error('saveGameState deveria ter propagado o erro de renameSync!');
      } finally {
        fs.renameSync = originalRenameSync;
      }

      // Validação Cache: V1
      const cached = manager.getGameState(campId);
      if (cached?.foundation.title !== 'Versão V1 Rename') {
        throw new Error(`Cache divergiu após falha de rename! Título: "${cached?.foundation.title}"`);
      }

      // Validação Disco: V1
      const filePath = path.join(stateDataDir, `gamestate_${campId}.json`);
      const disk = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (disk.foundation.title !== 'Versão V1 Rename') {
        throw new Error(`Disco divergiu após falha de rename! Título: "${disk.foundation.title}"`);
      }

      // Validação de temporários residuais
      const files = fs.readdirSync(stateDataDir);
      const tmpFiles = files.filter((f) => f.includes(campId) && f.includes('.tmp.'));
      if (tmpFiles.length > 0) {
        throw new Error(`Arquivo .tmp residual encontrado: ${JSON.stringify(tmpFiles)}`);
      }

      console.log('✅ Cenário 4 PASSOU: Falha de rename manteve integridade anterior e removeu arquivo .tmp.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 4 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 5: advanceTurn() em falha de persistência não avança o turno observável
    // =========================================================================
    console.log('\n--- CENÁRIO 5: advanceTurn() em falha de persistência não avança turno ---');
    try {
      const campId = 'camp_fail_advance';
      manager.createCampaign(createSampleParams(campId, 'Campanha Turnos'));
      if (manager.getGameState(campId)?.turn !== 0) throw new Error('Turno inicial deveria ser 0.');

      // Avança turno 1 com sucesso
      const t1 = manager.advanceTurn(campId);
      if (t1 !== 1 || manager.getGameState(campId)?.turn !== 1) {
        throw new Error(`Avanço inicial de turno falhou: turn=${t1}`);
      }

      // Agora simula falha de persistência durante advanceTurn
      const originalWriteFileSync = fs.writeFileSync;
      try {
        fs.writeFileSync = ((file: any, data: any, options: any) => {
          if (typeof file === 'string' && file.includes(campId)) {
            throw new Error('Simulated I/O drop on advanceTurn');
          }
          return originalWriteFileSync.call(fs, file, data, options);
        }) as any;

        let advanceThrew = false;
        try {
          manager.advanceTurn(campId);
        } catch {
          advanceThrew = true;
        }

        if (!advanceThrew) throw new Error('advanceTurn deveria ter lançado exceção em falha de escrita!');
      } finally {
        fs.writeFileSync = originalWriteFileSync;
      }

      // Validação: Turno observável no cache deve continuar 1
      const cached = manager.getGameState(campId);
      if (cached?.turn !== 1) {
        throw new Error(`Turno no cache foi avançado indevidamente para ${cached?.turn} após falha de I/O!`);
      }

      // Validação no disco: Turno deve continuar 1
      const filePath = path.join(stateDataDir, `gamestate_${campId}.json`);
      const disk = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (disk.turn !== 1) {
        throw new Error(`Turno no disco divergiu para ${disk.turn}!`);
      }

      console.log('✅ Cenário 5 PASSOU: advanceTurn() com falha de persistência preservou turno 1 intacto.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 5 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 6: updateWorldState() e updateCampaignFoundation() em falha de persistência
    // =========================================================================
    console.log('\n--- CENÁRIO 6: updateWorldState e updateCampaignFoundation em falha de persistência ---');
    try {
      const campId = 'camp_fail_world_found';
      manager.createCampaign(createSampleParams(campId, 'Campanha World'));

      const originalWriteFileSync = fs.writeFileSync;
      try {
        fs.writeFileSync = ((file: any, data: any, options: any) => {
          if (typeof file === 'string' && file.includes(campId)) {
            throw new Error('Simulated I/O failure on updateWorldState');
          }
          return originalWriteFileSync.call(fs, file, data, options);
        }) as any;

        let caughtWorld = false;
        try {
          manager.updateWorldState(campId, { currentLocation: 'Mundo Inalcançável', tensionLevel: 'critical' });
        } catch {
          caughtWorld = true;
        }
        if (!caughtWorld) throw new Error('updateWorldState deveria ter propagado a exceção!');

        let caughtFoundation = false;
        try {
          manager.updateCampaignFoundation(campId, { title: 'Título Fantasma' });
        } catch {
          caughtFoundation = true;
        }
        if (!caughtFoundation) throw new Error('updateCampaignFoundation deveria ter propagado a exceção!');
      } finally {
        fs.writeFileSync = originalWriteFileSync;
      }

      // Validações
      const cached = manager.getGameState(campId)!;
      if (cached.worldState.currentLocation !== 'Ruínas Antigas' || cached.worldState.tensionLevel !== 'calm') {
        throw new Error(`WorldState foi poluído no cache após falha: ${JSON.stringify(cached.worldState)}`);
      }
      if (cached.foundation.title !== 'Campanha World') {
        throw new Error(`Foundation foi poluída no cache após falha: "${cached.foundation.title}"`);
      }

      console.log('✅ Cenário 6 PASSOU: Mutações de WorldState e Foundation não alteram o cache em caso de falha de I/O.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 6 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 7: upsertNPC e upsertQuest em falha de persistência
    // =========================================================================
    console.log('\n--- CENÁRIO 7: upsertNPC e upsertQuest em falha de persistência ---');
    try {
      const campId = 'camp_fail_upsert';
      manager.createCampaign(createSampleParams(campId, 'Campanha Upsert'));

      const originalWriteFileSync = fs.writeFileSync;
      try {
        fs.writeFileSync = ((file: any, data: any, options: any) => {
          if (typeof file === 'string' && file.includes(campId)) {
            throw new Error('Simulated I/O failure on upsert');
          }
          return originalWriteFileSync.call(fs, file, data, options);
        }) as any;

        let caughtNPC = false;
        try {
          manager.upsertNPC(campId, { id: 'npc_fail', name: 'Espectro', role: 'npc', status: 'alive' });
        } catch {
          caughtNPC = true;
        }
        if (!caughtNPC) throw new Error('upsertNPC deveria ter propagado o erro de I/O!');

        let caughtQuest = false;
        try {
          manager.upsertQuest(campId, { id: 'quest_fail', title: 'Missão Fantasma', status: 'active' });
        } catch {
          caughtQuest = true;
        }
        if (!caughtQuest) throw new Error('upsertQuest deveria ter propagado o erro de I/O!');
      } finally {
        fs.writeFileSync = originalWriteFileSync;
      }

      const cached = manager.getGameState(campId)!;
      if (cached.npcs.length !== 0) {
        throw new Error(`NPC foi incluído no cache mesmo com falha na persistência! NPCs: ${JSON.stringify(cached.npcs)}`);
      }
      if (cached.quests.length !== 0) {
        throw new Error(`Quest foi incluída no cache mesmo com falha na persistência! Quests: ${JSON.stringify(cached.quests)}`);
      }

      console.log('✅ Cenário 7 PASSOU: upsertNPC e upsertQuest não contaminam o cache em caso de falha.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 7 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 8: deleteCampaign() com falha de unlink preserva cache e arquivo
    // =========================================================================
    console.log('\n--- CENÁRIO 8: deleteCampaign() com falha de unlink preserva cache e arquivo ---');
    try {
      const campId = 'camp_fail_delete';
      manager.createCampaign(createSampleParams(campId, 'Campanha Delete Falha'));

      const originalUnlinkSync = fs.unlinkSync;
      let unlinkInduced = false;

      try {
        fs.unlinkSync = (filePath: fs.PathLike) => {
          if (typeof filePath === 'string' && filePath.includes(campId)) {
            unlinkInduced = true;
            throw new Error('EACCES: permission denied on unlinkSync');
          }
          return originalUnlinkSync.call(fs, filePath);
        };

        let caught = false;
        try {
          manager.deleteCampaign(campId);
        } catch {
          caught = true;
        }

        if (!unlinkInduced) throw new Error('Falha de unlinkSync não foi induzida no caminho esperado.');
        if (!caught) throw new Error('deleteCampaign deveria ter propagado a exceção de unlink!');
      } finally {
        fs.unlinkSync = originalUnlinkSync;
      }

      // Validação Cache: deve continuar existindo no cache
      const cached = manager.getGameState(campId);
      if (!cached) {
        throw new Error('Campanha foi removida indevidamente do cache após falha de unlink!');
      }

      // Validação Disco: deve continuar existindo no disco
      const filePath = path.join(stateDataDir, `gamestate_${campId}.json`);
      if (!fs.existsSync(filePath)) {
        throw new Error('Arquivo foi apagado no disco apesar da falha de unlink!');
      }

      console.log('✅ Cenário 8 PASSOU: deleteCampaign() com falha de unlink preservou cache e arquivo.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 8 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 9: ENOENT em delete resulta em estado removido do cache sem erro
    // =========================================================================
    console.log('\n--- CENÁRIO 9: ENOENT em delete resulta em estado removido do cache sem erro ---');
    try {
      const campId = 'camp_enoent_delete';
      manager.createCampaign(createSampleParams(campId, 'Campanha ENOENT'));

      // Removemos o arquivo antes da chamada para simular que o arquivo já sumiu do disco
      const filePath = path.join(stateDataDir, `gamestate_${campId}.json`);
      fs.unlinkSync(filePath);

      // deleteCampaign deve tratar ENOENT graciosamente e remover do cache
      const res = manager.deleteCampaign(campId);
      if (!res) throw new Error('deleteCampaign deveria ter retornado true.');

      const cached = manager.getGameState(campId);
      if (cached !== null) {
        throw new Error('Campanha ainda existe no cache após deleteCampaign com ENOENT no disco!');
      }

      console.log('✅ Cenário 9 PASSOU: deleteCampaign com ENOENT removeu do cache com sucesso sem lançar erro.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 9 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 10: Nova instância após restart carrega exatamente a última versão confirmada
    // =========================================================================
    console.log('\n--- CENÁRIO 10: Restart carrega exatamente a última versão persistida com sucesso ---');
    try {
      const campId = 'camp_restart';
      manager.createCampaign(createSampleParams(campId, 'Campanha V1'));
      manager.advanceTurn(campId); // Turno 1
      manager.advanceTurn(campId); // Turno 2

      // Simula uma tentativa de advanceTurn que falha no I/O
      const originalWriteFileSync = fs.writeFileSync;
      try {
        fs.writeFileSync = ((file: any, data: any, options: any) => {
          if (typeof file === 'string' && file.includes(campId)) {
            throw new Error('Simulated I/O failure on turn 3');
          }
          return originalWriteFileSync.call(fs, file, data, options);
        }) as any;

        try {
          manager.advanceTurn(campId);
        } catch {
          // ignora
        }
      } finally {
        fs.writeFileSync = originalWriteFileSync;
      }

      // Reinicia o manager (novo objeto com cache vazio)
      const freshManager = new GameStateManager(stateDataDir);
      const loaded = freshManager.getGameState(campId);

      if (!loaded) throw new Error('Nova instância não carregou o gamestate do disco.');
      if (loaded.turn !== 2) {
        throw new Error(`Turno restaurado incorreto: esperado 2, obteve ${loaded.turn}`);
      }
      if (loaded.foundation.title !== 'Campanha V1') {
        throw new Error(`Título restaurado incorreto: "${loaded.foundation.title}"`);
      }

      console.log('✅ Cenário 10 PASSOU: Nova instância carregou exatamente a última versão confirmada do disco (turno 2).');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 10 FALHOU:', err.message);
      failed++;
    }

    // =========================================================================
    // CENÁRIO 11: createCampaign() com falha de persistência não deixa campanha fantasma
    // =========================================================================
    console.log('\n--- CENÁRIO 11: createCampaign() com falha de persistência não deixa campanha fantasma no cache ---');
    try {
      const campId = 'camp_fail_create';

      const originalWriteFileSync = fs.writeFileSync;
      let caught = false;
      try {
        fs.writeFileSync = ((file: any, data: any, options: any) => {
          if (typeof file === 'string' && file.includes(campId)) {
            throw new Error('EACCES: permission denied during createCampaign');
          }
          return originalWriteFileSync.call(fs, file, data, options);
        }) as any;

        try {
          manager.createCampaign(createSampleParams(campId, 'Campanha Natimorta'));
        } catch {
          caught = true;
        }
      } finally {
        fs.writeFileSync = originalWriteFileSync;
      }

      if (!caught) throw new Error('createCampaign deveria ter propagado a exceção de I/O!');

      // Validação: Não deve constar no cache
      const cached = manager.getGameState(campId);
      if (cached !== null) {
        throw new Error('Campanha fantasma foi registrada no cache apesar do erro de persistência na criação!');
      }

      // Validação: Não deve constar em listAllCampaigns
      const all = manager.listAllCampaigns();
      const found = all.find((c) => c.id === campId);
      if (found) {
        throw new Error('Campanha fantasma apareceu na listagem de campanhas!');
      }

      console.log('✅ Cenário 11 PASSOU: createCampaign com falha de persistência não deixou campanha no cache.');
      passed++;
    } catch (err: any) {
      console.error('❌ Cenário 11 FALHOU:', err.message);
      failed++;
    }

  } finally {
    // Cleanup incondicional do diretório temporário
    try {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
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
    const leakedArtifacts = dataEntries.filter((name) => name.startsWith('test_gamestate_') || name.startsWith('camp_'));
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

runAllGameStatePersistenceTests().catch((err) => {
  console.error('Erro fatal nos testes de persistência de gamestate:', err);
  process.exit(1);
});
