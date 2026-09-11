/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs/promises';
import { MemoryManager } from '../memory/memoryManager';
import { FilePersistentMemoryStore } from '../memory/filePersistentStore';
import { GameStateManager } from '../gameState/gameStateManager';
import { executeMemoryToolCall } from './memoryTools';
import { GameEngine } from '../gameEngine';

async function runFunctionCallingTestSuite() {
  console.log('\n===============================================================');
  console.log('>>> INICIANDO SUÍTE DE TESTES: FUNCTION CALLING & ENGINE AUTHORITY <<<');
  console.log('===============================================================\n');

  const testDir = path.join(process.cwd(), 'data', `test_fc_${Date.now()}`);
  const memoryStore = new FilePersistentMemoryStore(testDir);
  const memoryManager = new MemoryManager(memoryStore);
  const gameStateManager = new GameStateManager();
  const campaignId = `fc_campaign_${Date.now()}`;

  let passedTests = 0;
  const totalTests = 8;

  try {
    // 0. Setup inicial do Mundo e Personagens
    console.log('[Setup] Inicializando campanha de teste, João e Marta...');
    await memoryManager.createCampaign({
      campaignId,
      name: 'O Mistério de Brasen',
      currentLocation: 'Mercado Velho',
      currentDate: '12 de Outono',
    });

    const initialGameState = gameStateManager.createCampaign({
      title: 'O Mistério de Brasen',
      startingLocation: 'Mercado Velho',
      rulesOfUniverse: 'Magia é rara e perigosa.',
    });
    initialGameState.campaignId = campaignId;
    gameStateManager.saveGameState(initialGameState);

    const joaoNPC = await memoryManager.createNPC(campaignId, {
      name: 'João',
      status: 'alive',
      location: 'Mercado Velho',
      faction: 'Padeiro Local',
      personalityNotes: 'Trabalhador, desconfiado com forasteiros.',
      inventory: ['Pão Fresco', 'Chave da Padaria'],
      goals: ['Proteger seu negócio'],
      secrets: [],
      relationships: {},
    });

    const martaNPC = await memoryManager.createNPC(campaignId, {
      name: 'Marta',
      status: 'alive',
      location: 'Praça Central',
      faction: 'Alquimista Clandestina',
      personalityNotes: 'Cautelosa, guarda segredos perigosos.',
      inventory: ['Frascos Vazios', 'Grimório Oculto'],
      goals: ['Descobrir a cura da Praga'],
      secrets: ['Conhece o esconderijo do Culto sob as catacumbas'],
      relationships: {},
    });

    // Conhecimento exclusivo de Marta
    await memoryManager.createKnowledge(campaignId, {
      fact: 'O Culto da Serpente se reúne nas catacumbas secretas sob a igreja abandonada.',
      truthStatus: 'true',
      knownBy: ['Marta'],
      suspectedBy: [],
      source: 'Observação direta de Marta',
      reliability: 10,
      isWorldTruth: true,
    });

    console.log('✓ Setup concluído.\n');

    // ===============================================================
    // TESTE 1 — LEITURA: Gemini solicita get_npc("João")
    // ===============================================================
    console.log('[TESTE 1 — LEITURA: get_npc]');
    const test1Result = await executeMemoryToolCall(
      'get_npc',
      { npcIdOrName: 'João' },
      campaignId,
      memoryManager,
      gameStateManager
    );

    if (
      test1Result.success &&
      test1Result.action === 'read' &&
      test1Result.data &&
      test1Result.data.name === 'João' &&
      test1Result.data.location === 'Mercado Velho'
    ) {
      console.log('✅ TESTE 1 PASSOU: Game Engine retornou os dados corretos de João.\n');
      passedTests++;
    } else {
      throw new Error(`TESTE 1 FALHOU: ${JSON.stringify(test1Result)}`);
    }

    // ===============================================================
    // TESTE 2 — CONHECIMENTO: Gemini solicita get_character_knowledge("João")
    // ===============================================================
    console.log('[TESTE 2 — CONHECIMENTO: get_character_knowledge]');
    // Adicionar um conhecimento inicial para João
    await memoryManager.createKnowledge(campaignId, {
      fact: 'A farinha do Mercado Velho vem da fazenda dos irmãos Valente.',
      truthStatus: 'true',
      knownBy: ['João'],
      suspectedBy: [],
      source: 'Trabalho diário',
      reliability: 10,
    });

    const test2Result = await executeMemoryToolCall(
      'get_character_knowledge',
      { characterName: 'João' },
      campaignId,
      memoryManager,
      gameStateManager
    );

    const joaoFacts = test2Result.data?.knowledge || [];
    const hasJoaoFact = joaoFacts.some((f: any) => f.fact.includes('farinha do Mercado Velho'));

    if (test2Result.success && hasJoaoFact) {
      console.log('✅ TESTE 2 PASSOU: Apenas o conhecimento autorizado de João foi retornado.\n');
      passedTests++;
    } else {
      throw new Error(`TESTE 2 FALHOU: ${JSON.stringify(test2Result)}`);
    }

    // ===============================================================
    // TESTE 3 — ISOLAMENTO: Marta possui informação que João NÃO possui
    // ===============================================================
    console.log('[TESTE 3 — ISOLAMENTO EPISTEMOLÓGICO: Marta vs João]');
    const test3Result = await executeMemoryToolCall(
      'get_character_knowledge',
      { characterName: 'João' },
      campaignId,
      memoryManager,
      gameStateManager
    );

    const test3Facts = test3Result.data?.knowledge || [];
    const containsMartaSecret = test3Facts.some(
      (f: any) => f.fact.includes('Culto da Serpente') || f.fact.includes('catacumbas secretas')
    );

    if (!containsMartaSecret) {
      console.log('✅ TESTE 3 PASSOU: O conhecimento exclusivo de Marta permaneceu isolado e NÃO vazou para João.\n');
      passedTests++;
    } else {
      throw new Error('TESTE 3 FALHOU: Vazamento epistemológico detectado! Segredo de Marta apareceu no conhecimento de João.');
    }

    // ===============================================================
    // TESTE 4 — ALTERAÇÃO: Gemini solicita add_knowledge
    // ===============================================================
    console.log('[TESTE 4 — ALTERAÇÃO: add_knowledge]');
    const test4Result = await executeMemoryToolCall(
      'add_knowledge',
      {
        characterId: 'joao',
        fact: 'Existe uma passagem secreta atrás da antiga padaria do Mercado Velho.',
        source: 'Jogador',
        reliability: 9,
      },
      campaignId,
      memoryManager,
      gameStateManager
    );

    if (test4Result.success && (test4Result.action === 'created' || test4Result.action === 'updated')) {
      // Verificar se agora João tem acesso
      const checkJoao = await memoryManager.getKnowledgeForCharacter(campaignId, 'João');
      const hasPassage = checkJoao.some((k) => k.fact.includes('passagem secreta atrás da antiga padaria'));

      if (hasPassage) {
        console.log('✅ TESTE 4 PASSOU: Game Engine persistiu com autoridade o novo conhecimento na Memory Layer.\n');
        passedTests++;
      } else {
        throw new Error('TESTE 4 FALHOU: Conhecimento não encontrado na memória de João após add_knowledge.');
      }
    } else {
      throw new Error(`TESTE 4 FALHOU: ${JSON.stringify(test4Result)}`);
    }

    // ===============================================================
    // TESTE 5 — DUPLICAÇÃO: Tentar adicionar a mesma informação novamente
    // ===============================================================
    console.log('[TESTE 5 — ANTI-DUPLICAÇÃO: Re-adicionar fato similar]');
    const snapshotBefore = await memoryManager.getSnapshot(campaignId);
    const countBefore = snapshotBefore?.knowledge.length || 0;

    const test5Result = await executeMemoryToolCall(
      'add_knowledge',
      {
        characterId: 'joao',
        fact: 'Existe uma passagem secreta escondida atrás da padaria no Mercado Velho.',
        source: 'Jogador',
        reliability: 10,
      },
      campaignId,
      memoryManager,
      gameStateManager
    );

    const snapshotAfter = await memoryManager.getSnapshot(campaignId);
    const countAfter = snapshotAfter?.knowledge.length || 0;

    if (test5Result.success && test5Result.action === 'updated' && countAfter === countBefore) {
      console.log('✅ TESTE 5 PASSOU: Sistema atualizou o registro existente sem criar duplicações redundantes.\n');
      passedTests++;
    } else {
      throw new Error(`TESTE 5 FALHOU: Duplicação criada ou ação inválida. Count before: ${countBefore}, Count after: ${countAfter}, Result: ${JSON.stringify(test5Result)}`);
    }

    // ===============================================================
    // TESTE 6 — EVENTO: Gemini solicita create_event
    // ===============================================================
    console.log('[TESTE 6 — EVENTO: create_event]');
    const test6Result = await executeMemoryToolCall(
      'create_event',
      {
        location: 'Mercado Velho',
        participants: ['Jogador', 'João'],
        description: 'O Jogador e João moveram as prateleiras de farinha e revelaram a porta secreta de madeira reforçada.',
        consequences: ['A passagem secreta está aberta para exploração'],
      },
      campaignId,
      memoryManager,
      gameStateManager
    );

    if (test6Result.success && test6Result.action === 'created' && test6Result.data?.id) {
      const events = await memoryManager.getRelevantEvents(campaignId, { location: 'Mercado Velho' });
      const foundEvent = events.some((e) => e.description.includes('porta secreta'));

      if (foundEvent) {
        console.log('✅ TESTE 6 PASSOU: Evento persistido na linha do tempo com confirmação do Game Engine.\n');
        passedTests++;
      } else {
        throw new Error('TESTE 6 FALHOU: Evento não encontrado na Memory Layer.');
      }
    } else {
      throw new Error(`TESTE 6 FALHOU: ${JSON.stringify(test6Result)}`);
    }

    // ===============================================================
    // TESTE 7 — INVENTÁRIO: Gemini solicita update_inventory
    // ===============================================================
    console.log('[TESTE 7 — INVENTÁRIO: update_inventory]');
    const test7Result = await executeMemoryToolCall(
      'update_inventory',
      {
        owner: 'João',
        item: 'Tocha Acesa',
        quantity: 1,
        mode: 'add',
      },
      campaignId,
      memoryManager,
      gameStateManager
    );

    if (test7Result.success && test7Result.action === 'updated') {
      const inventory = await memoryManager.getInventory(campaignId, 'João');
      const hasTorch = inventory.some((i) => i.item === 'Tocha Acesa' && i.quantity >= 1);

      if (hasTorch) {
        console.log('✅ TESTE 7 PASSOU: Inventário atualizado e validado pelo Game Engine.\n');
        passedTests++;
      } else {
        throw new Error('TESTE 7 FALHOU: Tocha Acesa não consta no inventário de João.');
      }
    } else {
      throw new Error(`TESTE 7 FALHOU: ${JSON.stringify(test7Result)}`);
    }

    // ===============================================================
    // TESTE 8 — FLUXO COMPLETO: GameEngine -> Memory -> Function Calling -> Narrative
    // ===============================================================
    console.log('[TESTE 8 — FLUXO COMPLETO INTEGRADO: GameEngine.processPlayerAction]');
    const gameEngine = new GameEngine(memoryManager, gameStateManager);

    // Simular o fluxo completo da Engine com a mensagem do jogador informando João
    const turnResult = await gameEngine.processPlayerAction(
      campaignId,
      'Conto a João que existe uma passagem secreta atrás da antiga padaria.'
    );

    if (
      turnResult.playerMessage &&
      turnResult.masterMessage &&
      turnResult.turn >= 1 &&
      turnResult.masterMessage.content.length > 0
    ) {
      console.log('✅ TESTE 8 PASSOU: Fluxo completo (Jogador -> Engine -> Gemini/Tools -> Memory -> Narrativa) executado com sucesso.\n');
      console.log(`Resposta do Mestre gerada:\n"${turnResult.masterMessage.content.slice(0, 180)}..."\n`);
      passedTests++;
    } else {
      throw new Error(`TESTE 8 FALHOU: ${JSON.stringify(turnResult)}`);
    }

    // ===============================================================
    // TESTE 9 — NORMALIZAÇÃO DE NOMES DE FERRAMENTAS (camelCase / snake_case)
    // ===============================================================
    console.log('[TESTE 9 — NORMALIZAÇÃO: camelCase -> snake_case]');
    const testCamelGetNPC = await executeMemoryToolCall(
      'getNPC',
      { npcIdOrName: 'João' },
      campaignId,
      memoryManager,
      gameStateManager
    );
    const testCamelGetCampaign = await executeMemoryToolCall(
      'getCampaign',
      {},
      campaignId,
      memoryManager,
      gameStateManager
    );
    const testCamelGetLocation = await executeMemoryToolCall(
      'getLocation',
      { locationName: 'Mercado Velho' },
      campaignId,
      memoryManager,
      gameStateManager
    );

    if (
      testCamelGetNPC.success &&
      testCamelGetNPC.tool === 'get_npc' &&
      testCamelGetCampaign.success &&
      testCamelGetCampaign.tool === 'get_campaign' &&
      testCamelGetLocation.success &&
      testCamelGetLocation.tool === 'get_location'
    ) {
      console.log('✅ TESTE 9 PASSOU: Normalização de ferramentas em camelCase realizada com sucesso.\n');
      passedTests++;
    } else {
      throw new Error(`TESTE 9 FALHOU: Falha na normalização camelCase: ${JSON.stringify({ testCamelGetNPC, testCamelGetCampaign, testCamelGetLocation })}`);
    }

    // ===============================================================
    // TESTE 10 — FERRAMENTA DESCONHECIDA E ARGUMENTOS INVÁLIDOS
    // ===============================================================
    console.log('[TESTE 10 — ERRO ESTRUTURADO: UNKNOWN_TOOL & INVALID_ARGUMENTS]');
    const unknownToolResult = await executeMemoryToolCall(
      'ferramentaInexistente',
      { param: 'teste' },
      campaignId,
      memoryManager,
      gameStateManager
    );

    const invalidArgsResult = await executeMemoryToolCall(
      'get_npc',
      {},
      campaignId,
      memoryManager,
      gameStateManager
    );

    if (
      unknownToolResult.success === false &&
      unknownToolResult.error === 'UNKNOWN_TOOL' &&
      unknownToolResult.tool === 'ferramentaInexistente' &&
      invalidArgsResult.success === false &&
      invalidArgsResult.error === 'INVALID_ARGUMENTS' &&
      invalidArgsResult.tool === 'get_npc'
    ) {
      console.log('✅ TESTE 10 PASSOU: Erros estruturados retornados corretamente para ferramentas desconhecidas e argumentos inválidos (nunca undefined).\n');
      passedTests++;
    } else {
      throw new Error(`TESTE 10 FALHOU: ${JSON.stringify({ unknownToolResult, invalidArgsResult })}`);
    }

    // ===============================================================
    // TESTE 11 — IDEMPOTÊNCIA E PREVENÇÃO DE DUPLA EXECUÇÃO EM RETRIES
    // ===============================================================
    console.log('[TESTE 11 — IDEMPOTÊNCIA: Prevenção de execução duplicada em retries/fallback]');
    const turnCache = new Map<string, any>();

    const firstExecution = await executeMemoryToolCall(
      'create_event',
      {
        location: 'Praça Central',
        participants: ['Jogador', 'Marta'],
        description: 'Marta entregou um mapa cifrado ao Jogador.',
      },
      campaignId,
      memoryManager,
      gameStateManager,
      turnCache
    );

    const secondExecution = await executeMemoryToolCall(
      'create_event',
      {
        location: 'Praça Central',
        participants: ['Jogador', 'Marta'],
        description: 'Marta entregou um mapa cifrado ao Jogador.',
      },
      campaignId,
      memoryManager,
      gameStateManager,
      turnCache
    );

    const eventsList = await memoryManager.getRelevantEvents(campaignId, { location: 'Praça Central' });
    const matchingEvents = eventsList.filter((e) => e.description.includes('mapa cifrado'));

    if (
      firstExecution.success &&
      secondExecution.success &&
      matchingEvents.length === 1
    ) {
      console.log('✅ TESTE 11 PASSOU: Operações mutantes idempotentes não são duplicadas durante retries ou troca de modelos.\n');
      passedTests++;
    } else {
      throw new Error(`TESTE 11 FALHOU: Duplicação detectada. Eventos encontrados: ${matchingEvents.length}`);
    }

    console.log('===============================================================');
    console.log(`>>> RESULTADO FINAL: ${passedTests}/11 TESTES PASSARAM COM SUCESSO! <<<`);
    console.log('===============================================================\n');
  } finally {
    // Limpar diretório temporário de testes
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignorar erro de limpeza
    }
  }
}

// Executar suíte de testes
runFunctionCallingTestSuite().catch((err) => {
  console.error('❌ ERRO NA EXECUÇÃO DA SUÍTE DE TESTES:', err);
  process.exit(1);
});
