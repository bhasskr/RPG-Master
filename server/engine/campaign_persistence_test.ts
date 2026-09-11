/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameEngine } from './gameEngine';
import { GameStateManager } from './gameState/gameStateManager';
import { MemoryManager } from './memory/memoryManager';
import { FilePersistentMemoryStore } from './memory/filePersistentStore';
import path from 'path';
import fs from 'fs';

async function runCampaignPersistenceTest() {
  console.log('===============================================================');
  console.log('TESTE: Persistência, Isolamento e Alternância de Campanhas');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  // Diretórios temporários de teste
  const testDir = path.join(process.cwd(), 'data', 'test_rpg_' + Date.now());
  const testMemoryDir = path.join(testDir, 'memory');
  const testStateDir = path.join(testDir, 'gamestate');

  const memoryStore = new FilePersistentMemoryStore(testMemoryDir);
  const memoryManager = new MemoryManager(memoryStore);
  const gameStateManager = new GameStateManager(testStateDir);

  // Mock Narrator Service para isolar teste de mecânica/persistência (sem chamar API externa desnecessariamente)
  const mockNarratorService: any = {
    generateOpeningMessage: async () => {
      return {
        text: 'Abertura da campanha...',
        executedTools: [],
        diceRolls: [],
      };
    },
    generateMasterResponse: async (ctx: any) => {
      return {
        text: `Narrativa para ${ctx.currentUserInput} na campanha ${ctx.campaignId}`,
        executedTools: [],
        diceRolls: [],
      };
    },
  };

  const gameEngine = new GameEngine(memoryManager, gameStateManager, mockNarratorService);

  // -------------------------------------------------------------
  // TESTE 1 & 2: Criar Campanha A e enviar mensagem
  // -------------------------------------------------------------
  totalTests++;
  console.log('[TESTE 1 & 2] Criando Campanha A e enviando mensagem...');

  const campaignA = await gameEngine.startNewCampaign({
    title: 'Aventura do Vale Sombrio',
    startingLocation: 'Vila de Oakhaven',
    playerName: 'Eldrin, o Mago',
  });
  const idA = campaignA.campaignId;

  console.log(` -> Campanha A criada: ID = ${idA}, Título = "${campaignA.gameState.foundation.title}"`);

  const turnA1 = await gameEngine.processPlayerAction(idA, 'Examino o tomo arcano sobre a mesa.');
  console.log(` -> Turno 1 Campanha A: Jogador="${turnA1.playerMessage.content}", Mestre="${turnA1.masterMessage.content}"`);

  const detailsA1 = await gameEngine.getCampaignDetails(idA);

  if (
    idA &&
    detailsA1.gameState?.campaignId === idA &&
    detailsA1.messages.length === 3 &&
    detailsA1.messages[1].content === 'Examino o tomo arcano sobre a mesa.'
  ) {
    console.log(' -> PASSED: Campanha A criada e mensagem persistida com sucesso.\n');
    passedTests++;
  } else {
    console.error(' -> FAILED: Falha ao persistir Campanha A.\n');
  }

  // -------------------------------------------------------------
  // TESTE 3 & 4: Criar Campanha B e enviar mensagem diferente
  // -------------------------------------------------------------
  totalTests++;
  console.log('[TESTE 3 & 4] Criando Campanha B e enviando mensagem diferente...');

  const campaignB = await gameEngine.startNewCampaign({
    title: 'Expedição ao Deserto de Vidro',
    startingLocation: 'Oásis das Mil Tendas',
    playerName: 'Kaelen, o Rastreador',
  });
  const idB = campaignB.campaignId;

  console.log(` -> Campanha B criada: ID = ${idB}, Título = "${campaignB.gameState.foundation.title}"`);

  const turnB1 = await gameEngine.processPlayerAction(idB, 'Consulto as estrelas procurando a rota para o templo.');
  console.log(` -> Turno 1 Campanha B: Jogador="${turnB1.playerMessage.content}", Mestre="${turnB1.masterMessage.content}"`);

  const detailsB1 = await gameEngine.getCampaignDetails(idB);

  if (
    idB !== idA &&
    detailsB1.gameState?.campaignId === idB &&
    detailsB1.messages.length === 3 &&
    detailsB1.messages[1].content === 'Consulto as estrelas procurando a rota para o templo.'
  ) {
    console.log(' -> PASSED: Campanha B criada com ID único e mensagem distinta gravada.\n');
    passedTests++;
  } else {
    console.error(' -> FAILED: Falha ao criar ou isolar Campanha B.\n');
  }

  // -------------------------------------------------------------
  // TESTE 5 & 6: Alternar A -> B -> A e confirmar isolamento de histórico e estado
  // -------------------------------------------------------------
  totalTests++;
  console.log('[TESTE 5 & 6] Alternando A -> B -> A e verificando isolamento estrito...');

  const loadA = await gameEngine.getCampaignDetails(idA);
  const loadB = await gameEngine.getCampaignDetails(idB);

  const aHasBMessage = loadA.messages.some((m) => m.content.includes('estrelas'));
  const bHasAMessage = loadB.messages.some((m) => m.content.includes('tomo arcano'));

  const aTitle = loadA.gameState?.foundation.title;
  const bTitle = loadB.gameState?.foundation.title;

  console.log(` -> Campanha A carregada: Título="${aTitle}", Mensagens=${loadA.messages.length}`);
  console.log(` -> Campanha B carregada: Título="${bTitle}", Mensagens=${loadB.messages.length}`);

  if (
    !aHasBMessage &&
    !bHasAMessage &&
    aTitle === 'Aventura do Vale Sombrio' &&
    bTitle === 'Expedição ao Deserto de Vidro' &&
    loadA.messages.length === 3 &&
    loadB.messages.length === 3
  ) {
    console.log(' -> PASSED: Alternância entre campanhas perfeita. Sem vazamento de estado ou mensagens entre A e B.\n');
    passedTests++;
  } else {
    console.error(' -> FAILED: Vazamento de estado ou mensagens detectado entre campanhas.\n');
  }

  // -------------------------------------------------------------
  // TESTE 7 & 8: Simular Reload (Nova instância de Engine lendo do disco)
  // -------------------------------------------------------------
  totalTests++;
  console.log('[TESTE 7 & 8] Simulando reload/reinicialização lendo do disco...');

  // Cria novas instâncias sem cache em memória para forçar leitura de disco
  const freshMemoryStore = new FilePersistentMemoryStore(testMemoryDir);
  const freshMemoryManager = new MemoryManager(freshMemoryStore);
  const freshGameStateManager = new GameStateManager(testStateDir);
  const freshGameEngine = new GameEngine(freshMemoryManager, freshGameStateManager, mockNarratorService);

  const restoredA = await freshGameEngine.getCampaignDetails(idA);
  const restoredB = await freshGameEngine.getCampaignDetails(idB);

  const isRestoredACorrect =
    restoredA.gameState?.campaignId === idA &&
    restoredA.gameState?.foundation.title === 'Aventura do Vale Sombrio' &&
    restoredA.messages.length === 3 &&
    restoredA.messages[1].content === 'Examino o tomo arcano sobre a mesa.';

  const isRestoredBCorrect =
    restoredB.gameState?.campaignId === idB &&
    restoredB.gameState?.foundation.title === 'Expedição ao Deserto de Vidro' &&
    restoredB.messages.length === 3 &&
    restoredB.messages[1].content === 'Consulto as estrelas procurando a rota para o templo.';

  if (isRestoredACorrect && isRestoredBCorrect) {
    console.log(' -> PASSED: Recarregar do disco restaura perfeitamente ambas as campanhas com histórico e estado intactos.\n');
    passedTests++;
  } else {
    console.error(' -> FAILED: Falha ao restaurar campanhas do disco após reload.\n');
  }

  // Limpar diretório de teste
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch {
    // ignore
  }

  console.log('===============================================================');
  console.log(`RESULTADO DOS TESTES: ${passedTests}/${totalTests} APROVADOS`);
  console.log('===============================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runCampaignPersistenceTest().catch((err) => {
  console.error('[ERRO NO TESTE]:', err);
  process.exit(1);
});
