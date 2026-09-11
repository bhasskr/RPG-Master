/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { promises as fs } from 'fs';
import path from 'path';
import { MemoryManager } from '../memory/memoryManager';
import { GameStateManager } from '../gameState/gameStateManager';
import {
  NARRATOR_FUNCTION_DECLARATIONS,
  MEMORY_FUNCTION_DECLARATIONS,
  ENGINE_MUTATION_FUNCTION_DECLARATIONS,
  ALL_ENGINE_FUNCTION_DECLARATIONS,
  executeMemoryToolCall,
} from './memoryTools';
import { FilePersistentMemoryStore } from '../memory/filePersistentStore';
import { MemoryValidator } from '../memory/extractor/memoryValidator';
import { MemoryExtractionResult } from '../memory/extractor/types';

async function runVerificationTests() {
  console.log('===============================================================');
  console.log('SUÍTE DE TESTES: VERIFICAÇÃO DE RESTRIÇÃO DE MUTAÇÃO DO NARRADOR');
  console.log('===============================================================\n');

  const testDir = path.join(process.cwd(), 'tmp_test_mutation_restriction_' + Date.now());
  await fs.mkdir(testDir, { recursive: true });

  const memoryManager = new MemoryManager(new FilePersistentMemoryStore(testDir));
  const gameStateManager = new GameStateManager();
  const campaignId = 'test_campaign_mutation_restriction';

  let totalTests = 0;
  let passedTests = 0;

  try {
    // Inicializar estado base
    await memoryManager.createCampaign({
      campaignId,
      name: 'Campanha de Teste de Restrição de Mutação',
      currentLocation: 'Valfenda',
      currentDate: 'Ano 3018 da Terceira Era',
    });

    const initialGameState = gameStateManager.createCampaign({
      title: 'Campanha de Teste',
      rulesOfUniverse: 'Fantasia Medieval',
      startingLocation: 'Valfenda',
      playerName: 'Jogador',
    });
    initialGameState.campaignId = campaignId;
    gameStateManager.saveGameState(initialGameState);

    // =========================================================================
    // TESTE 1: CATÁLOGO EXPOSTO AO NARRATOR NÃO CONTÉM FERRAMENTAS DE MUTAÇÃO
    // =========================================================================
    totalTests++;
    console.log('[TESTE 1] Verificando lista de ferramentas expostas ao NarratorService...');

    const forbiddenMutationTools = [
      'update_inventory',
      'update_npc',
      'create_event',
      'add_knowledge',
      'add_suspicion',
      'update_relationship',
      'update_quest',
      'create_npc',
      'create_campaign',
      'update_campaign',
    ];

    const exposedToolNames = NARRATOR_FUNCTION_DECLARATIONS.map((d) => d.name);
    const legacyExposedToolNames = MEMORY_FUNCTION_DECLARATIONS.map((d) => d.name);

    const hasAnyForbidden = forbiddenMutationTools.some(
      (mut) => exposedToolNames.includes(mut) || legacyExposedToolNames.includes(mut)
    );

    const expectedReadAndDiceTools = [
      'get_npc',
      'get_location',
      'get_relevant_events',
      'get_character_knowledge',
      'get_relationship',
      'get_inventory',
      'get_quest',
      'get_campaign',
      'roll_d20',
      'roll_check',
    ];

    const hasAllExpected = expectedReadAndDiceTools.every((tool) =>
      exposedToolNames.includes(tool)
    );

    if (!hasAnyForbidden && hasAllExpected && exposedToolNames.length === 10) {
      console.log(`✅ TESTE 1 PASSOU: NarratorService expõe exatamente ${exposedToolNames.length} ferramentas de leitura e dados.`);
      console.log(`   Ferramentas expostas: [${exposedToolNames.join(', ')}]`);
      console.log(`   Nenhuma das 10 ferramentas de mutação está exposta ao Narrator.\n`);
      passedTests++;
    } else {
      throw new Error(
        `TESTE 1 FALHOU: Ferramentas indevidas expostas ou faltando. Expostas: ${JSON.stringify(exposedToolNames)}`
      );
    }

    // =========================================================================
    // TESTE 2: BLOQUEIO ATIVO DE EXECUÇÃO DE MUTAÇÃO QUANDO CALLER = 'narrator'
    // =========================================================================
    totalTests++;
    console.log('[TESTE 2] Verificando bloqueio de segurança em tempo de execução para caller "narrator"...');

    const blockedCalls = await Promise.all([
      executeMemoryToolCall(
        'update_inventory',
        { owner: 'Jogador', item: 'Espada Lendária', quantity: 1, mode: 'add' },
        campaignId,
        memoryManager,
        gameStateManager,
        undefined,
        'narrator'
      ),
      executeMemoryToolCall(
        'create_event',
        { location: 'Valfenda', participants: ['Jogador'], description: 'Descobriu a espada.' },
        campaignId,
        memoryManager,
        gameStateManager,
        undefined,
        'narrator'
      ),
      executeMemoryToolCall(
        'add_knowledge',
        { fact: 'O anel é perigoso', characterId: 'Frodo' },
        campaignId,
        memoryManager,
        gameStateManager,
        undefined,
        'narrator'
      ),
    ]);

    const allRejectedAsUnauthorized = blockedCalls.every(
      (res) => res.success === false && res.action === 'rejected' && res.error === 'UNAUTHORIZED_MUTATION'
    );

    if (allRejectedAsUnauthorized) {
      console.log('✅ TESTE 2 PASSOU: Chamadas de mutação originadas pelo Narrator foram rejeitadas com erro UNAUTHORIZED_MUTATION.\n');
      passedTests++;
    } else {
      throw new Error(`TESTE 2 FALHOU: Respostas inesperadas para tentativas de mutação pelo narrador: ${JSON.stringify(blockedCalls)}`);
    }

    // =========================================================================
    // TESTE 3: RESOLUÇÃO MECÂNICA (roll_check e roll_d20) CONTINUA FUNCIONANDO
    // =========================================================================
    totalTests++;
    console.log('[TESTE 3] Verificando execução do motor de dados real (roll_d20 e roll_check)...');

    const d20Result = await executeMemoryToolCall(
      'roll_d20',
      {},
      campaignId,
      memoryManager,
      gameStateManager,
      undefined,
      'narrator'
    );

    const checkResult = await executeMemoryToolCall(
      'roll_check',
      { skill: 'atletismo', difficulty: 'MEDIUM', modifier: 3, actor: 'Jogador' },
      campaignId,
      memoryManager,
      gameStateManager,
      undefined,
      'narrator'
    );

    if (
      d20Result.success &&
      typeof d20Result.data?.roll === 'number' &&
      d20Result.data.roll >= 1 &&
      d20Result.data.roll <= 20 &&
      checkResult.success &&
      typeof checkResult.data?.total === 'number' &&
      typeof checkResult.data?.outcome === 'string'
    ) {
      console.log(`✅ TESTE 3 PASSOU: roll_d20 (${d20Result.data.roll}) e roll_check (${checkResult.data.outcome}, Total: ${checkResult.data.total}) executaram perfeitamente.\n`);
      passedTests++;
    } else {
      throw new Error(`TESTE 3 FALHOU: Falha no motor de dados: ${JSON.stringify({ d20Result, checkResult })}`);
    }

    // =========================================================================
    // TESTE 4: FERRAMENTAS DE LEITURA DE MEMÓRIA CONTINUAM FUNCIONANDO
    // =========================================================================
    totalTests++;
    console.log('[TESTE 4] Verificando ferramentas de leitura de memória...');

    // Popula estado base via Game Engine
    await memoryManager.createNPC(campaignId, {
      name: 'Elrond',
      status: 'alive',
      location: 'Valfenda',
      faction: 'Elfos',
      personalityNotes: 'Sábio e ponderado',
    });

    await memoryManager.updateInventory(campaignId, 'Jogador', 'Poção de Vida', 3, 'set');

    await memoryManager.createKnowledge(campaignId, {
      fact: 'A biblioteca de Valfenda contém mapas antigos de Gondor.',
      knownBy: ['Jogador', 'Elrond'],
      truthStatus: 'true',
      source: 'Observação direta',
      reliability: 10,
      isWorldTruth: true,
    });

    const readNpcResult = await executeMemoryToolCall(
      'get_npc',
      { npcIdOrName: 'Elrond' },
      campaignId,
      memoryManager,
      gameStateManager,
      undefined,
      'narrator'
    );

    const readInvResult = await executeMemoryToolCall(
      'get_inventory',
      { owner: 'Jogador' },
      campaignId,
      memoryManager,
      gameStateManager,
      undefined,
      'narrator'
    );

    const readKnowledgeResult = await executeMemoryToolCall(
      'get_character_knowledge',
      { characterName: 'Elrond' },
      campaignId,
      memoryManager,
      gameStateManager,
      undefined,
      'narrator'
    );

    const readCampaignResult = await executeMemoryToolCall(
      'get_campaign',
      {},
      campaignId,
      memoryManager,
      gameStateManager,
      undefined,
      'narrator'
    );

    if (
      readNpcResult.success &&
      readNpcResult.data?.name === 'Elrond' &&
      readInvResult.success &&
      Array.isArray(readInvResult.data) &&
      readInvResult.data.some((i: any) => i.item === 'Poção de Vida' && i.quantity === 3) &&
      readKnowledgeResult.success &&
      Array.isArray(readKnowledgeResult.data?.knowledge) &&
      readKnowledgeResult.data.knowledge.length > 0 &&
      readCampaignResult.success &&
      readCampaignResult.data?.currentLocation === 'Valfenda'
    ) {
      console.log('✅ TESTE 4 PASSOU: Todas as ferramentas de leitura (get_npc, get_inventory, get_character_knowledge, get_campaign) responderam com fidelidade.\n');
      passedTests++;
    } else {
      throw new Error(
        `TESTE 4 FALHOU: Resposta inesperada na leitura de memória: ${JSON.stringify({
          readNpcResult,
          readInvResult,
          readKnowledgeResult,
          readCampaignResult,
        })}`
      );
    }

    // =========================================================================
    // TESTE 5: MEMORY VALIDATOR PERSISTE MUTAÇÕES COM AUTORIDADE DO GAME ENGINE
    // =========================================================================
    totalTests++;
    console.log('[TESTE 5] Verificando persistência de mutações via Memory Validator (Caminho Autorizado)...');

    const proposedChanges: MemoryExtractionResult = {
      events: [
        {
          location: 'Valfenda',
          participants: ['Jogador', 'Elrond'],
          description: 'Elrond presenteou o Jogador com um anel de prata.',
          consequences: ['Jogador recebeu o anel de prata'],
          category: 'discovery',
        },
      ],
      npcChanges: [
        {
          npcIdOrName: 'Elrond',
          notes: 'Mais confiante no potencial do Jogador',
        },
      ],
      inventoryChanges: [
        {
          owner: 'Jogador',
          item: 'Anel de Prata',
          action: 'acquired',
          quantity: 1,
        },
      ],
      knowledgeChanges: [
        {
          fact: 'O anel de prata concede proteção mental.',
          knownBy: ['Jogador', 'Elrond'],
          truthStatus: 'true',
          source: 'Elrond',
          reliability: 9,
          action: 'create',
        },
      ],
      relationshipChanges: [
        {
          characterA: 'Jogador',
          characterB: 'Elrond',
          trustChange: 30,
          familiarityChange: 5,
        },
      ],
      questChanges: [],
      worldChanges: [],
    };

    const validationResult = await MemoryValidator.validateAndApply(
      campaignId,
      proposedChanges,
      memoryManager,
      2
    );

    const snapshotAfterValidation = await memoryManager.getSnapshot(campaignId);
    const playerInventory = snapshotAfterValidation?.inventory.filter((i) => i.owner.toLowerCase() === 'jogador') || [];
    const ringItem = playerInventory.find((i) => i.item === 'Anel de Prata');
    const events = snapshotAfterValidation?.events.filter((e) => e.description.includes('anel de prata')) || [];

    if (
      validationResult.validEvents.length > 0 &&
      validationResult.validInventoryChanges.length > 0 &&
      ringItem &&
      ringItem.quantity === 1 &&
      events.length === 1
    ) {
      console.log('✅ TESTE 5 PASSOU: MemoryValidator validou e persistiu com autoridade as alterações de estado, inventário e eventos.\n');
      passedTests++;
    } else {
      throw new Error(`TESTE 5 FALHOU: Erro na validação/persistência do MemoryValidator: ${JSON.stringify(validationResult)}`);
    }

    // =========================================================================
    // TESTE 6: INVENTÁRIO ATUALIZADO CORRETAMENTE PELO CAMINHO AUTORIZADO
    // =========================================================================
    totalTests++;
    console.log('[TESTE 6] Verificando atualizações autorizadas de inventário (adição, subtração, modo set)...');

    // 1. Subtração de item existente
    await memoryManager.updateInventory(campaignId, 'Jogador', 'Poção de Vida', -1, 'add');

    // 2. Adição de novo item
    await memoryManager.updateInventory(campaignId, 'Jogador', 'Moedas de Ouro', 50, 'add');

    // 3. Consulta atualizada
    const finalInventory = await memoryManager.getInventory(campaignId, 'Jogador');
    const potion = finalInventory.find((i) => i.item === 'Poção de Vida');
    const gold = finalInventory.find((i) => i.item === 'Moedas de Ouro');
    const ring = finalInventory.find((i) => i.item === 'Anel de Prata');

    if (
      potion &&
      potion.quantity === 2 &&
      gold &&
      gold.quantity === 50 &&
      ring &&
      ring.quantity === 1
    ) {
      console.log(`✅ TESTE 6 PASSOU: Inventário atualizado pelo caminho autorizado do Game Engine com precisão:`);
      console.log(`   - Poção de Vida: ${potion.quantity} (era 3, consumiu 1)`);
      console.log(`   - Moedas de Ouro: ${gold.quantity}`);
      console.log(`   - Anel de Prata: ${ring.quantity}\n`);
      passedTests++;
    } else {
      throw new Error(`TESTE 6 FALHOU: Inconsistência no inventário: ${JSON.stringify(finalInventory)}`);
    }

    console.log('===============================================================');
    console.log(`RESULTADO DA VERIFICAÇÃO: ${passedTests}/${totalTests} TESTES APROVADOS (100%)`);
    console.log('===============================================================\n');
  } finally {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignorar limpeza
    }
  }
}

runVerificationTests().catch((err) => {
  console.error('❌ ERRO NA EXECUÇÃO DOS TESTES:', err);
  process.exit(1);
});
