/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MemoryManager } from '../memory/memoryManager';
import { InMemoryStore } from '../memory/inMemoryStore';
import { MemoryValidator } from '../memory/extractor/memoryValidator';
import { NarratorService } from './narratorService';
import { getSystemInstructions } from './systemInstructions';
import { MemoryExtractionResult } from '../memory/extractor/types';

function makeExtractionResult(partial: Partial<MemoryExtractionResult>): MemoryExtractionResult {
  return {
    events: [],
    knowledgeChanges: [],
    relationshipChanges: [],
    inventoryChanges: [],
    questChanges: [],
    npcChanges: [],
    worldChanges: [],
    conflicts: [],
    ...partial,
  };
}

export async function runNarrativeContinuityAntiRetconTests() {
  console.log('================================================================');
  console.log('>>> INICIANDO SUÍTE: CONTINUIDADE NARRATIVA & PREVENÇÃO DE RETCON <<<');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  const campaignId = 'campaign_continuity_anti_retcon_test';
  let memoryManager = new MemoryManager(new InMemoryStore());

  // ===============================================================
  // TESTE 1: Regra de Precedência Canônica nas System Instructions
  // ===============================================================
  totalTests++;
  console.log('[TESTE 1 — PRECEDÊNCIA CANÔNICA NAS SYSTEM INSTRUCTIONS]');
  const systemInstructions = getSystemInstructions('Regras Padrão', 'Realista');

  const hasPrecedence = systemInstructions.includes(
    'estado estruturado persistido > eventos/knowledge autorizados > contexto recente > inferência do modelo'
  );
  const hasAntiRetcon = systemInstructions.includes(
    'NUNCA deve substituir um fato persistido por uma versão mais conveniente'
  );
  const hasContinuitySections =
    systemInstructions.includes('INVENTÁRIO E RECURSOS CONSUMIDOS') &&
    systemInstructions.includes('FERIMENTOS E LIMITAÇÕES FÍSICAS') &&
    systemInstructions.includes('PRESENÇA, AUSÊNCIA E ESTADO DE NPCs') &&
    systemInstructions.includes('COEXISTÊNCIA EPISTEMOLÓGICA PERMITIDA');

  if (hasPrecedence && hasAntiRetcon && hasContinuitySections) {
    console.log('✅ TESTE 1 PASSOU: Precedência canônica, diretivas anti-retcon e seções de continuidade presentes.\n');
    passedTests++;
  } else {
    throw new Error('TESTE 1 FALHOU: Diretivas de continuidade ou precedência ausentes nas System Instructions.');
  }

  // ===============================================================
  // TESTE 2: Precedência Canônica Injetada no Prompt do Narrador
  // ===============================================================
  totalTests++;
  console.log('[TESTE 2 — INJEÇÃO DE PRECEDÊNCIA E ANTI-RETCON NO PROMPT]');
  const narratorService = new NarratorService();
  const prompt = narratorService.buildPrompt({
    systemInstructions: getSystemInstructions(),
    campaignFoundation: {
      id: 'found_1',
      title: 'As Crônicas de Ferro',
      genre: 'Dark Fantasy',
      premise: 'Um mundo sob cerco.',
      tone: 'Sombrio',
      startingLocation: 'Ruínas Antigas',
      createdAt: Date.now(),
      rulesOfUniverse: 'A magia consome a força vital do usuário.',
    },
    worldState: {
      currentLocation: 'Ruínas Antigas',
      timeOfDay: 'Meia-noite',
      weather: 'Chuvoso',
      tensionLevel: 'tense',
      statusSummary: 'Ambiente hostil',
    },
    player: {
      id: 'player_1',
      name: 'Kaelen',
      role: 'player',
      status: 'alive',
      archetype: 'Guerreiro',
    },
    recentMessages: [],
    currentUserInput: 'Eu examino as inscrições no altar.',
  });

  const promptHasHierarchy = prompt.includes('=== [ORDEM DE PRECEDÊNCIA CANÔNICA DE VERDADE & ANTI-RETCON] ===');
  const promptHasStrictRules = prompt.includes('Objeto consumido/destruído não reaparece. Ferimento grave não desaparece sem cura real.');

  if (promptHasHierarchy && promptHasStrictRules) {
    console.log('✅ TESTE 2 PASSOU: Prompt do Narrador inicia com a ordem de precedência canônica e anti-retcon.\n');
    passedTests++;
  } else {
    throw new Error('TESTE 2 FALHOU: Prompt do Narrador não contém o cabeçalho canônico de precedência.');
  }

  // ===============================================================
  // TESTE 3: Continuidade de Inventário e Recursos Consumidos
  // ===============================================================
  totalTests++;
  console.log('[TESTE 3 — CONTINUIDADE DE INVENTÁRIO (ITENS CONSUMIDOS NÃO REAPARECEM)]');
  await memoryManager.updateInventory(campaignId, 'player', 'Poção de Cura', 1, 'set');
  
  // Consumo no Turno 1
  const valTurn1 = await MemoryValidator.validateAndApply(
    campaignId,
    makeExtractionResult({
      events: [{ location: 'Templo', participants: ['player'], description: 'Kaelen bebeu a Poção de Cura.', consequences: [] }],
      inventoryChanges: [{ item: 'Poção de Cura', owner: 'player', quantity: 1, action: 'consumed' }],
    }),
    memoryManager,
    1
  );

  if (valTurn1.validInventoryChanges.length !== 1) {
    throw new Error('TESTE 3 FALHOU: Consumo da poção não foi validado no turno 1.');
  }

  const invAfterTurn1 = await memoryManager.getInventory(campaignId, 'player');
  const potion = invAfterTurn1.find(i => i.item === 'Poção de Cura');
  const potionQty = potion ? potion.quantity : 0;
  if (potionQty !== 0) {
    throw new Error(`TESTE 3 FALHOU: Quantidade da poção após consumo esperada 0, obtido ${potionQty}`);
  }

  // Tentativa no Turno 20 de consumir a poção de novo
  const valTurn20 = await MemoryValidator.validateAndApply(
    campaignId,
    makeExtractionResult({
      inventoryChanges: [{ item: 'Poção de Cura', owner: 'player', quantity: 1, action: 'consumed' }],
    }),
    memoryManager,
    20
  );

  if (valTurn20.conflicts.some(c => c.type === 'INVENTORY_CONFLICT')) {
    console.log('✅ TESTE 3 PASSOU: Poção consumida permanece zerada e tentativa de reuso é bloqueada por conflito.\n');
    passedTests++;
  } else {
    throw new Error('TESTE 3 FALHOU: Reconsumo de item zerado não gerou conflito.');
  }

  // ===============================================================
  // TESTE 4: Continuidade de NPC e Imutabilidade de Status Dead
  // ===============================================================
  totalTests++;
  console.log('[TESTE 4 — CONTINUIDADE DE NPCS (NPC MORTO PERMANECE MORTO)]');
  const captain = await memoryManager.createNPC(campaignId, {
    name: 'Capitão Vane',
    status: 'alive',
    location: 'Guarnição de Oakhaven',
  });

  await memoryManager.updateNPC(campaignId, captain.id, { status: 'dead' });
  const deadCaptain = await memoryManager.getNPC(campaignId, captain.id);
  if (deadCaptain?.status !== 'dead') {
    throw new Error('TESTE 4 FALHOU: Status dead não foi registrado no NPC.');
  }

  // Tentativa do modelo de propor status 'alive' sem causa de ressurreição
  const valNpc = await MemoryValidator.validateAndApply(
    campaignId,
    makeExtractionResult({
      npcChanges: [{ npcIdOrName: captain.id, statusChange: 'alive', notes: 'Capitão Vane conversa na taberna' }],
    }),
    memoryManager,
    5
  );

  const afterCheck = await memoryManager.getNPC(campaignId, captain.id);
  if (valNpc.conflicts.some(c => c.type === 'NPC_STATE_CONFLICT') && afterCheck?.status === 'dead') {
    console.log('✅ TESTE 4 PASSOU: NPC morto rejeita retorno a alive e mantém status dead.\n');
    passedTests++;
  } else {
    throw new Error('TESTE 4 FALHOU: NPC morto foi ressuscitado indevidamente.');
  }

  // ===============================================================
  // TESTE 5: Continuidade de Quests Concluídas
  // ===============================================================
  totalTests++;
  console.log('[TESTE 5 — CONTINUIDADE DE QUESTS (QUEST CONCLUÍDA NÃO REABRE)]');
  const quest = await memoryManager.createQuest(campaignId, {
    title: 'Investigar o Moinho Queimado',
    status: 'active',
  });

  await memoryManager.updateQuest(campaignId, quest.id, { status: 'completed' });
  let qCheck = await memoryManager.getQuest(campaignId, quest.id);
  if (qCheck?.status !== 'completed') {
    throw new Error('TESTE 5 FALHOU: Quest não foi persistida como completed.');
  }

  // Tentativa de reabrir a quest sem justificativa válida
  const valQuest = await MemoryValidator.validateAndApply(
    campaignId,
    makeExtractionResult({
      questChanges: [{ questId: quest.id, title: quest.title, status: 'active', action: 'status_changed' }],
    }),
    memoryManager,
    8
  );

  qCheck = await memoryManager.getQuest(campaignId, quest.id);
  if (valQuest.conflicts.some(c => c.type === 'QUEST_STATE_CONFLICT') && qCheck?.status === 'completed') {
    console.log('✅ TESTE 5 PASSOU: Quest concluída recusa alteração para ativa e gera conflito de estado.\n');
    passedTests++;
  } else {
    throw new Error('TESTE 5 FALHOU: Quest concluída foi indevidamente reaberta.');
  }

  // ===============================================================
  // TESTE 6: Coexistência Epistemológica vs Contradição de WORLD_TRUTH
  // ===============================================================
  totalTests++;
  console.log('[TESTE 6 — COEXISTÊNCIA EPISTEMOLÓGICA E REJEIÇÃO DE RETCON EM WORLD_TRUTH]');
  // 1. WORLD_TRUTH canônica
  await memoryManager.createKnowledge(campaignId, {
    fact: 'O Barão foi envenenado por seu próprio conselheiro com cicuta.',
    truthStatus: 'true',
    isWorldTruth: true,
    knownBy: [],
  });

  // 2. Falsa crença de Roger
  await memoryManager.createKnowledge(campaignId, {
    fact: 'Os rebeldes da floresta assassinaram o Barão.',
    truthStatus: 'rumor',
    epistemicStatus: 'FALSE_BELIEF',
    knownBy: ['Guarda Roger'],
    believedBy: ['Guarda Roger'],
  });

  // 3. Suspeita de Maya
  await memoryManager.createKnowledge(campaignId, {
    fact: 'O conselheiro parecia suspeito antes da morte do Barão.',
    truthStatus: 'rumor',
    epistemicStatus: 'SUSPICION',
    knownBy: ['Serviçal Maya'],
    suspectedBy: ['Serviçal Maya'],
  });

  const rogerContext = await memoryManager.getRelevantContext({
    campaignId,
    targetCharacter: 'Guarda Roger',
  });

  const mayaContext = await memoryManager.getRelevantContext({
    campaignId,
    targetCharacter: 'Serviçal Maya',
  });

  const rogerOk = rogerContext.formattedSummary.includes('rebeldes da floresta') && !rogerContext.formattedSummary.includes('envenenado por seu próprio conselheiro com cicuta');
  const mayaOk = mayaContext.formattedSummary.includes('O conselheiro parecia suspeito') && !mayaContext.formattedSummary.includes('rebeldes da floresta');

  // Tentativa de negar WORLD_TRUTH
  const retconValidation = await MemoryValidator.validateAndApply(
    campaignId,
    makeExtractionResult({
      knowledgeChanges: [
        {
          fact: 'O Barão nao foi envenenado por seu próprio conselheiro com cicuta.',
          truthStatus: 'true',
          knownBy: ['player'],
        },
      ],
    }),
    memoryManager,
    12
  );

  const retconBlocked = retconValidation.conflicts.some(c => c.type === 'KNOWLEDGE_CONFLICT');

  if (rogerOk && mayaOk && retconBlocked) {
    console.log('✅ TESTE 6 PASSOU: Crenças epistemológicas coexistem e negação de WORLD_TRUTH é bloqueada.\n');
    passedTests++;
  } else {
    throw new Error('TESTE 6 FALHOU: Coexistência epistemológica vazou ou retcon não foi bloqueado.');
  }

  // ===============================================================
  // TESTE 7: Idempotência de Eventos (Proteção para Retry)
  // ===============================================================
  totalTests++;
  console.log('[TESTE 7 — IDEMPOTÊNCIA DE EVENTOS EM OPERAÇÕES DE RETRY]');
  const event1 = {
    location: 'Ruínas Antigas',
    participants: ['player'],
    description: 'Kaelen decifrou a runa dourada no pedestal de pedra.',
    consequences: [],
  };

  const res1 = await MemoryValidator.validateAndApply(
    campaignId,
    makeExtractionResult({ events: [event1] }),
    memoryManager,
    3
  );

  const res2 = await MemoryValidator.validateAndApply(
    campaignId,
    makeExtractionResult({ events: [event1] }),
    memoryManager,
    3
  );

  if (res1.validEvents.length === 1 && res2.validEvents.length === 0 && res2.rejectedChanges.some(r => r.reason.includes('duplicado'))) {
    console.log('✅ TESTE 7 PASSOU: Evento idêntico em retry foi rejeitado por idempotência sem duplicar.\n');
    passedTests++;
  } else {
    throw new Error('TESTE 7 FALHOU: Idempotência de eventos não funcionou.');
  }

  // ===============================================================
  // TESTE 8: Simulação Sintética de Sequência Longa (40 Turnos)
  // ===============================================================
  totalTests++;
  console.log('[TESTE 8 — SIMULAÇÃO SINTÉTICA DE 40 TURNOS COM VERIFICAÇÃO DE CONTINUIDADE]');
  await memoryManager.updateInventory(campaignId, 'player', 'Espada de Ferro', 1, 'set');
  await memoryManager.updateInventory(campaignId, 'player', 'Rações de Viagem', 5, 'set');
  await memoryManager.updateInventory(campaignId, 'player', 'Antídoto Raro', 1, 'set');

  const quest1 = await memoryManager.createQuest(campaignId, {
    title: 'Entregar o Relatório ao Forte',
    status: 'active',
  });

  const npcGuide = await memoryManager.createNPC(campaignId, {
    name: 'Guia Thorne',
    status: 'alive',
    location: 'Vila de Oakhaven',
  });

  for (let turn = 1; turn <= 40; turn++) {
    if (turn === 5) {
      await MemoryValidator.validateAndApply(
        campaignId,
        makeExtractionResult({
          events: [{ description: 'Guia Thorne partiu sozinho em direção ao Pântano Negro.', location: 'Vila de Oakhaven', participants: ['Guia Thorne'], consequences: [] }],
          npcChanges: [{ npcIdOrName: npcGuide.id, locationChange: 'Pântano Negro' }],
        }),
        memoryManager,
        turn
      );
    }

    if (turn === 10) {
      await MemoryValidator.validateAndApply(
        campaignId,
        makeExtractionResult({
          events: [{ description: 'Kaelen comeu uma porção de ração de viagem.', location: 'Estrada Real', participants: ['player'], consequences: [] }],
          inventoryChanges: [{ item: 'Rações de Viagem', owner: 'player', quantity: 1, action: 'consumed' }],
        }),
        memoryManager,
        turn
      );
    }

    if (turn === 15) {
      await MemoryValidator.validateAndApply(
        campaignId,
        makeExtractionResult({
          events: [{ description: 'Kaelen bebeu o Antídoto Raro após picada.', location: 'Pântano Negro', participants: ['player'], consequences: [] }],
          inventoryChanges: [{ item: 'Antídoto Raro', owner: 'player', quantity: 1, action: 'consumed' }],
        }),
        memoryManager,
        turn
      );
    }

    if (turn === 20) {
      await MemoryValidator.validateAndApply(
        campaignId,
        makeExtractionResult({
          events: [{ description: 'Guia Thorne sucumbiu aos ferimentos.', location: 'Pântano Negro', participants: ['Guia Thorne'], consequences: [] }],
          npcChanges: [{ npcIdOrName: npcGuide.id, statusChange: 'dead' }],
        }),
        memoryManager,
        turn
      );
    }

    if (turn === 25) {
      await MemoryValidator.validateAndApply(
        campaignId,
        makeExtractionResult({
          events: [{ description: 'O relatório selado foi entregue no Forte.', location: 'Forte da Fronteira', participants: ['player'], consequences: [] }],
          questChanges: [{ questId: quest1.id, title: quest1.title, status: 'completed', action: 'status_changed' }],
        }),
        memoryManager,
        turn
      );
    }

    // Turno 30: Tentativa de reviver Thorne -> Bloqueada
    if (turn === 30) {
      const retconAttempt = await MemoryValidator.validateAndApply(
        campaignId,
        makeExtractionResult({
          npcChanges: [{ npcIdOrName: npcGuide.id, statusChange: 'alive', locationChange: 'Taberna do Javali' }],
        }),
        memoryManager,
        turn
      );
      if (!retconAttempt.conflicts.some(c => c.type === 'NPC_STATE_CONFLICT')) {
        throw new Error('TESTE 8 FALHOU: Retcon de NPC morto no turno 30 não foi bloqueado.');
      }
    }

    // Turno 35: Tentativa de reabrir Quest 1 -> Bloqueada
    if (turn === 35) {
      const retconQuest = await MemoryValidator.validateAndApply(
        campaignId,
        makeExtractionResult({
          questChanges: [{ questId: quest1.id, title: quest1.title, status: 'active', action: 'status_changed' }],
        }),
        memoryManager,
        turn
      );
      if (!retconQuest.conflicts.some(c => c.type === 'QUEST_STATE_CONFLICT')) {
        throw new Error('TESTE 8 FALHOU: Retcon de quest concluída no turno 35 não foi bloqueado.');
      }
    }

    // Turno 40: Tentativa de reutilizar Antídoto Raro consumido no turno 15 -> Bloqueada
    if (turn === 40) {
      const retconAntidote = await MemoryValidator.validateAndApply(
        campaignId,
        makeExtractionResult({
          inventoryChanges: [{ item: 'Antídoto Raro', owner: 'player', quantity: 1, action: 'consumed' }],
        }),
        memoryManager,
        turn
      );
      if (!retconAntidote.conflicts.some(c => c.type === 'INVENTORY_CONFLICT')) {
        throw new Error('TESTE 8 FALHOU: Retcon de inventário consumido no turno 40 não foi bloqueado.');
      }
    }
  }

  const finalSnapshot = await memoryManager.getSnapshot(campaignId);
  const finalAntidote = finalSnapshot!.inventory.find(i => i.item === 'Antídoto Raro' && i.owner === 'player');
  const finalAntidoteQty = finalAntidote ? finalAntidote.quantity : 0;
  const finalRations = finalSnapshot!.inventory.find(i => i.item === 'Rações de Viagem' && i.owner === 'player');
  const finalThorne = finalSnapshot!.npcs[npcGuide.id];
  const finalQuest = finalSnapshot!.quests.find(q => q.id === quest1.id);

  if (
    finalAntidoteQty === 0 &&
    finalRations?.quantity === 4 &&
    finalThorne?.status === 'dead' &&
    finalQuest?.status === 'completed'
  ) {
    console.log('✅ TESTE 8 PASSOU: Sequência de 40 turnos concluiu com integridade contínua absoluta.\n');
    passedTests++;
  } else {
    throw new Error('TESTE 8 FALHOU: Estado final após 40 turnos apresentou incoerência.');
  }

  console.log('================================================================');
  console.log(`>>> TODOS OS ${passedTests}/${totalTests} TESTES DE CONTINUIDADE E ANTI-RETCON PASSARAM COM SUCESSO! <<<`);
  console.log('================================================================\n');
}

if (process.argv[1]?.includes('narrative_continuity_anti_retcon.test')) {
  runNarrativeContinuityAntiRetconTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
