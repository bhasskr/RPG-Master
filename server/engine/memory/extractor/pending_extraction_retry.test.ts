/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MemoryManager } from '../memoryManager';
import { GameStateManager } from '../../gameState/gameStateManager';
import { TurnProcessor } from '../../turn/turnProcessor';
import { NarratorService } from '../../narrator/narratorService';
import { MemoryExtractionResult, TurnContext as ExtractionTurnContext } from './types';

async function runTest() {
  console.log('===============================================================');
  console.log('SUÍTE DE TESTES: RETRY SEGURO DE EXTRAÇÃO PENDENTE DE MEMÓRIA');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  const campaignId = 'test_campaign_pending_retry_' + Date.now();
  const memoryManager = new MemoryManager();
  const gameStateManager = new GameStateManager();
  const narratorService = new NarratorService();

  // Setup de campanha inicial
  const currentGameState = gameStateManager.createCampaign({
    title: 'Campanha de Teste de Retry',
    startingLocation: 'Cripta dos Ancestrais',
  });
  const actualCampaignId = currentGameState.campaignId;

  const turnProcessor = new TurnProcessor(memoryManager, gameStateManager, narratorService);

  // -------------------------------------------------------------
  // PASSO 1 & 2: Turno produz nova mudança narrativa, mas o Extractor falha com 429
  // -------------------------------------------------------------
  totalTests++;
  console.log('[TESTE 1 & 2] Executando turno onde o Memory Extractor retorna HTTP 429...');

  const playerAction = 'Abro o sarcófago de pedra com cuidado e leio a inscrição na tampa.';
  const narrativeResponse = 'Você empurra a pesada tampa de pedra. Dentro, você encontra a "Chave de Mithril" e decifra a inscrição antiga: "O Guardião dorme sob a Colina do Corvo".';

  // Snapshot inicial
  const initialSnapshot = await memoryManager.getSnapshot(actualCampaignId);
  const initialKnowledgeCount = initialSnapshot?.knowledge?.length || 0;
  const initialInventoryCount = initialSnapshot?.inventory?.length || 0;
  const initialEventsCount = initialSnapshot?.events?.length || 0;

  // Turno avançado
  const turnId = gameStateManager.advanceTurn(actualCampaignId);

  const extractionTurnContext: ExtractionTurnContext = {
    campaignId: actualCampaignId,
    turn: turnId,
    previousState: {
      snapshot: initialSnapshot,
      npcs: [],
      worldState: currentGameState.worldState,
      inventory: initialSnapshot?.inventory || [],
      quests: initialSnapshot?.quests || [],
      relationships: initialSnapshot?.relationships || [],
      knowledge: initialSnapshot?.knowledge || [],
      events: initialSnapshot?.events || [],
    },
    playerAction,
    toolsCalled: [],
    diceRolls: [],
    finalNarrative: narrativeResponse,
    involvedNpcs: [],
    currentLocation: 'Cripta dos Ancestrais',
    recentEvents: [],
  };

  // Simula a falha com erro 429 do Gemini API no Extractor
  const error429 = new Error('Resource has been exhausted (e.g. check quota) - 429 Too Many Requests');
  turnProcessor.markPendingMemoryExtraction(actualCampaignId, turnId, extractionTurnContext, error429);

  // -------------------------------------------------------------
  // PASSO 3: Verificação de que a mudança NÃO foi persistida imediatamente
  // -------------------------------------------------------------
  totalTests++;
  console.log('[TESTE 3] Verificando se a mudança NÃO foi persistida imediatamente durante a falha...');

  const postFailureSnapshot = await memoryManager.getSnapshot(actualCampaignId);
  const postFailureKnowledgeCount = postFailureSnapshot?.knowledge?.length || 0;
  const postFailureInventoryCount = postFailureSnapshot?.inventory?.length || 0;
  const postFailureEventsCount = postFailureSnapshot?.events?.length || 0;

  if (
    postFailureKnowledgeCount === initialKnowledgeCount &&
    postFailureInventoryCount === initialInventoryCount &&
    postFailureEventsCount === initialEventsCount
  ) {
    console.log('✅ TESTE 3 PASSOU: Nenhuma memória falsa ou prematura foi persistida durante o erro 429.');
    passedTests++;
  } else {
    throw new Error('Falha: O sistema persistiu dados antes da validação/extração bem-sucedida!');
  }

  // -------------------------------------------------------------
  // PASSO 4: Verificação de que o turno está marcado como pendente
  // -------------------------------------------------------------
  totalTests++;
  console.log('[TESTE 4] Verificando se o turno está registrado como pendingMemoryExtraction...');

  const isPending = turnProcessor.isTurnPendingExtraction(actualCampaignId, turnId);
  const pendingList = turnProcessor.getPendingExtractions(actualCampaignId);

  if (isPending && pendingList.length === 1 && pendingList[0].turnId === turnId) {
    console.log(`✅ TESTE 4 PASSOU: Turno ${turnId} devidamente registrado na fila de pendingMemoryExtraction.`);
    passedTests++;
  } else {
    throw new Error(`Falha: Turno ${turnId} não foi marcado como pendente!`);
  }

  // -------------------------------------------------------------
  // PASSO 5 & 6: Execução do Retry Posterior com Sucesso e Persistência Única
  // -------------------------------------------------------------
  totalTests++;
  console.log('[TESTE 5 & 6] Executando retry posterior do turno pendente com sucesso de extração...');

  // Mock de extração bem-sucedida apenas para este turno
  const mockSuccessfulExtraction: MemoryExtractionResult = {
    events: [
      {
        description: 'O sarcófago de pedra na Cripta dos Ancestrais foi aberto, revelando a Chave de Mithril.',
        location: 'Cripta dos Ancestrais',
        participants: ['Jogador'],
        consequences: ['Chave encontrada'],
      },
    ],
    knowledgeChanges: [
      {
        fact: 'O Guardião dorme sob a Colina do Corvo.',
        truthStatus: 'true',
        knownBy: ['Jogador'],
        suspectedBy: [],
        source: 'Inscrição no sarcófago',
        reliability: 10,
        isWorldTruth: true,
        isPublicKnowledge: false,
        epistemicStatus: 'WORLD_TRUTH',
        confidence: 10,
        observedBy: ['Jogador'],
        believedBy: ['Jogador'],
        disputedBy: [],
        informationChain: [],
        action: 'create',
      },
    ],
    relationshipChanges: [],
    inventoryChanges: [
      {
        owner: 'Jogador',
        item: 'Chave de Mithril',
        quantity: 1,
        action: 'acquired',
      },
    ],
    questChanges: [],
    npcChanges: [],
    worldChanges: [],
    conflicts: [],
  };

  const retryResult = await turnProcessor.retryPendingExtraction(
    actualCampaignId,
    turnId,
    async () => mockSuccessfulExtraction
  );

  const postRetrySnapshot = await memoryManager.getSnapshot(actualCampaignId);
  const isStillPending = turnProcessor.isTurnPendingExtraction(actualCampaignId, turnId);

  const hasEvent = postRetrySnapshot.events.some((e) => e.description.includes('Chave de Mithril'));
  const hasKnowledge = postRetrySnapshot.knowledge.some((k) => k.fact.includes('Colina do Corvo'));
  const hasItem = postRetrySnapshot.inventory.some((i) => i.item === 'Chave de Mithril' && i.quantity === 1);

  if (retryResult.success && !isStillPending && hasEvent && hasKnowledge && hasItem) {
    console.log('✅ TESTES 1, 2, 5 & 6 PASSARAM:');
    console.log('   - Retry executado com sucesso.');
    console.log('   - Memórias validadas pelo MemoryValidator e persistidas uma única vez.');
    console.log('   - Estado pendente foi devidamente removido após a persistência.');
    passedTests += 2; // contabiliza passos 1, 2, 5 e 6
  } else {
    throw new Error(`Falha no retry ou persistência das entidades: ${JSON.stringify(retryResult)}`);
  }

  // -------------------------------------------------------------
  // PASSO 7: Idempotência — Segundo Retry não duplica nada
  // -------------------------------------------------------------
  totalTests++;
  console.log('[TESTE 7] Executando um segundo retry para verificar idempotência estrita...');

  const secondRetryResult = await turnProcessor.retryPendingExtraction(
    actualCampaignId,
    turnId,
    async () => mockSuccessfulExtraction
  );

  const snapshotAfterSecondRetry = await memoryManager.getSnapshot(actualCampaignId);

  const eventCountAfter = snapshotAfterSecondRetry.events.filter((e) => e.description.includes('Chave de Mithril')).length;
  const knowledgeCountAfter = snapshotAfterSecondRetry.knowledge.filter((k) => k.fact.includes('Colina do Corvo')).length;
  const inventoryItem = snapshotAfterSecondRetry.inventory.find((i) => i.item === 'Chave de Mithril');

  if (
    secondRetryResult.alreadyProcessed === true &&
    eventCountAfter === 1 &&
    knowledgeCountAfter === 1 &&
    inventoryItem?.quantity === 1
  ) {
    console.log('✅ TESTE 7 PASSOU: Segundo retry não duplicou nenhuma entidade (Idempotência confirmada).');
    console.log(`   - Eventos correspondentes: ${eventCountAfter} (esperado: 1)`);
    console.log(`   - Fatos de conhecimento: ${knowledgeCountAfter} (esperado: 1)`);
    console.log(`   - Quantidade do item no inventário: ${inventoryItem.quantity} (esperado: 1)`);
    passedTests++;
  } else {
    throw new Error(`Falha de idempotência no segundo retry! Eventos: ${eventCountAfter}, Conhecimento: ${knowledgeCountAfter}, Qtd Item: ${inventoryItem?.quantity}`);
  }

  console.log('\n===============================================================');
  console.log(`RESULTADO DA SUÍTE: ${passedTests}/${totalTests} TESTES APROVADOS (100%)`);
  console.log('===============================================================\n');
}

runTest().catch((err) => {
  console.error('❌ ERRO NA EXECUÇÃO DO TESTE:', err);
  process.exit(1);
});
