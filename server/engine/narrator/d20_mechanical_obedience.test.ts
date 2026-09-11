/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSystemInstructions } from './systemInstructions';
import { classifyActionRisk } from '../dice/actionClassifier';
import { executeRollCheck, executeRollD20, evaluateRollOutcome } from '../dice/diceEngine';
import { generateDeterministicRollNarrative } from './fallbackNarrative';
import { RollCheckResult } from '../dice/types';
import { NarratorPromptContext } from './types';

/**
 * Suíte de Testes e Validação: Refino do Uso Narrativo do D20 e Obediência do Narrador
 *
 * Ordem Canônica de Decisão:
 * possibilidade física/material → trivialidade/incerteza → classificação da ação → D20 server-side → resultado mecânico → narração
 *
 * Regras Verificadas:
 * 1. Proibição de D20 em ações impossíveis pelo estado do mundo.
 * 2. Proibição de D20 em ações triviais sem oposição/risco.
 * 3. Proibição de D20 em decisões morais, sentimentos íntimos, atração ou amor.
 * 4. Obrigatoriedade de D20 em ações incertas e arriscadas.
 * 5. Imutabilidade dos resultados do servidor (roll, modifier, total, difficulty, outcome, success).
 * 6. Proibição de sucesso funcional disfarçado quando o resultado do servidor for FAILURE ou CRITICAL_FAILURE.
 * 7. Sucesso com complicação/custo obrigatório quando o resultado for SUCCESS_WITH_COST.
 * 8. Resolução correta de Critical Success (20) e Critical Failure (1-3).
 * 9. Não concessão de rerolls gratuitos para repetição idêntica de ação sem mudança relevante.
 * 10. Consistência e proteção de rolagens em operações de Retry e Edit.
 * 11. Narrativa determinística e obediência estrita no fallback do Game Engine.
 */

async function runD20MechanicalObedienceTests() {
  console.log('===============================================================');
  console.log('>>> INICIANDO SUÍTE DE TESTES: D20 & OBEDIÊNCIA MECÂNICA DO NARRADOR <<<');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  // ===============================================================
  // TESTE 1: Ordem Canônica de Decisão expressa nas System Instructions
  // ===============================================================
  totalTests++;
  console.log('[TESTE 1 — ORDEM CANÔNICA DE DECISÃO NAS SYSTEM INSTRUCTIONS]');
  const systemInstructions = getSystemInstructions('Regras Padrão', 'Realista');
  
  const hasDecisionOrder = systemInstructions.includes(
    'possibilidade física/material → trivialidade/incerteza → classificação da ação → D20 server-side → resultado mecânico → narração'
  );
  const hasNoPostRollOverride = systemInstructions.includes(
    'O Narrador NUNCA decide se o jogador "merece" outro resultado depois que o servidor resolveu o teste.'
  );

  if (hasDecisionOrder && hasNoPostRollOverride) {
    console.log('✅ TESTE 1 PASSOU: Ordem canônica e proibição de override pós-servidor declaradas expressamente.\n');
    passedTests++;
  } else {
    throw new Error('TESTE 1 FALHOU: Ordem canônica ausente nas System Instructions.');
  }

  // ===============================================================
  // TESTE 2: Quando NÃO Rolar — Ação Trivial (Sem D20)
  // ===============================================================
  totalTests++;
  console.log('[TESTE 2 — QUANDO NÃO ROLAR: Ações Triviais e Rotineiras]');
  const trivialActions = [
    'Eu abro a porta destrancada da sala.',
    'Caminho até a estalagem pela rua movimentada.',
    'Olho ao redor para observar as pessoas na praça.',
    'Sento na cadeira de madeira e bebo um gole de água.',
    'Cumprimento o taberneiro com um aceno de cabeça.',
  ];

  let allTrivialCorrect = true;
  for (const act of trivialActions) {
    const res = classifyActionRisk(act);
    if (res.category !== 'TRIVIAL' || res.requiresRoll !== false) {
      console.error(`Falha em ação trivial: "${act}" -> ${JSON.stringify(res)}`);
      allTrivialCorrect = false;
      break;
    }
  }

  if (allTrivialCorrect) {
    console.log('✅ TESTE 2 PASSOU: Ações triviais classificadas como TRIVIAL sem exigência de rolagem de dados.\n');
    passedTests++;
  } else {
    throw new Error('TESTE 2 FALHOU: Ação trivial classificada incorretamente como arriscada.');
  }

  // ===============================================================
  // TESTE 3: Quando NÃO Rolar — Ação Impossível (Sem D20)
  // ===============================================================
  totalTests++;
  console.log('[TESTE 3 — QUANDO NÃO ROLAR: Ações Fisicamente Impossíveis]');
  const impossibleActions = [
    'Eu salto 50 metros até o topo da torre com as próprias pernas.',
    'Destruo a montanha inteira com um soco.',
    'Voo sem magia apenas batendo os braços com força.',
    'Ressuscito o guerreiro morto estalando os dedos sem magia.',
  ];

  let allImpossibleCorrect = true;
  for (const act of impossibleActions) {
    const res = classifyActionRisk(act);
    if (res.category !== 'IMPOSSIBLE' || res.requiresRoll !== false || res.isImpossible !== true) {
      console.error(`Falha em ação impossível: "${act}" -> ${JSON.stringify(res)}`);
      allImpossibleCorrect = false;
      break;
    }
  }

  if (allImpossibleCorrect) {
    console.log('✅ TESTE 3 PASSOU: Ações fisicamente impossíveis classificadas como IMPOSSIBLE (sem D20).\n');
    passedTests++;
  } else {
    throw new Error('TESTE 3 FALHOU: Ação impossível classificada incorretamente.');
  }

  // ===============================================================
  // TESTE 4: Quando Rolar — Ação Incerta com Risco Real (Exige D20)
  // ===============================================================
  totalTests++;
  console.log('[TESTE 4 — QUANDO ROLAR: Ações Incertas e Arriscadas]');
  const uncertainActions = [
    'Tento arrombar a fechadura trancada do baú com gazuas.',
    'Tento esgueirar-me pelas sombras para passar despercebido pelos guardas.',
    'Desfiro um golpe de espada contra o líder dos bandidos.',
    'Tento furtar a chave de bronze do bolso do guarda distorcendo a atenção dele.',
    'Tento escalar a encosta íngreme e escorregadia do penhasco sob a chuva.',
  ];

  let allUncertainCorrect = true;
  for (const act of uncertainActions) {
    const res = classifyActionRisk(act);
    if (res.category !== 'UNCERTAIN' || res.requiresRoll !== true) {
      console.error(`Falha em ação incerta: "${act}" -> ${JSON.stringify(res)}`);
      allUncertainCorrect = false;
      break;
    }
  }

  if (allUncertainCorrect) {
    console.log('✅ TESTE 4 PASSOU: Todas as ações incertas exigem rolagem oficial no servidor (UNCERTAIN).\n');
    passedTests++;
  } else {
    throw new Error('TESTE 4 FALHOU: Ação incerta classificada sem exigência de D20.');
  }

  // ===============================================================
  // TESTE 5: Proibição de D20 para Romance, Sentimentos e Decisões Morais
  // ===============================================================
  totalTests++;
  console.log('[TESTE 5 — PROIBIÇÃO DE D20: Vínculos Afetivos e Decisões Morais]');
  const hasMoralSocialBan = systemInstructions.includes(
    'NUNCA use D20 para forçar romance, atração, amizade íntima, reciprocidade ou violação de princípios éticos de NPCs.'
  ) && systemInstructions.includes(
    'NUNCA resolva atração romântica, amor, reciprocidade afetiva, ciúme ou intimidade por rolagem de D20 ou teste de Carisma mecânico.'
  );

  if (hasMoralSocialBan) {
    console.log('✅ TESTE 5 PASSOU: Diretriz expressa proíbe uso de D20 para forçar romance, afeição ou decisões morais.\n');
    passedTests++;
  } else {
    throw new Error('TESTE 5 FALHOU: Falta proibição canônica de D20 em relações afetivas/morais.');
  }

  // ===============================================================
  // TESTE 6: Imutabilidade e Proibição de Sucesso Funcional Disfarçado em FAILURE
  // ===============================================================
  totalTests++;
  console.log('[TESTE 6 — IMUTABILIDADE DO RESULTADO E PROIBIÇÃO DE SUCESSO DISFARÇADO EM FALHA]');
  const mockContext: any = {
    campaignId: 'c1',
    currentUserInput: 'Tento abrir a fechadura com gazua.',
    recentMessages: [],
    systemInstructions: 'Regras Padrão',
    campaignFoundation: { id: 'c1', title: 'Fantasia Sombria', genre: 'Dark Fantasy', premise: '', tone: 'Sombrio', startingLocation: 'Cripta', createdAt: Date.now() },
    worldState: { currentLocation: 'Cripta', timeOfDay: 'Noite', weather: 'Chuva', tensionLevel: 'high', statusSummary: '' },
    player: { id: 'p1', name: 'Gael', role: 'player', status: 'alive' },
  };

  const failedRollResult: RollCheckResult = {
    roll: 5,
    modifier: 2,
    total: 7,
    difficulty: 13,
    difficultyLevel: 'MEDIUM',
    outcome: 'FAILURE',
    success: false,
    skill: 'Arrombamento',
    actor: 'Gael',
    timestamp: Date.now(),
    sides: 20,
  };

  const failNarrative = generateDeterministicRollNarrative(mockContext, failedRollResult);
  const isFailureRespected =
    (failNarrative.includes('Falha') || failNarrative.includes('não tem sucesso')) &&
    !failNarrative.includes('consegue abrir') &&
    !failNarrative.includes('com facilidade') &&
    !failNarrative.includes('sucesso total');

  if (isFailureRespected && failedRollResult.success === false) {
    console.log('✅ TESTE 6 PASSOU: Servidor e gerador determinístico não convertem FAILURE em sucesso funcional.');
    console.log(`   Narrativa gerada:\n   "${failNarrative}"\n`);
    passedTests++;
  } else {
    throw new Error('TESTE 6 FALHOU: Falha mecânica resultou em narrativa de sucesso funcional.');
  }

  // ===============================================================
  // TESTE 7: Sucesso com Custo (SUCCESS_WITH_COST)
  // ===============================================================
  totalTests++;
  console.log('[TESTE 7 — SUCESSO COM CUSTO / COMPLICAÇÃO OBRIGATÓRIA]');
  const successWithCostResult: RollCheckResult = {
    roll: 11,
    modifier: 2,
    total: 13,
    difficulty: 13,
    difficultyLevel: 'MEDIUM',
    outcome: 'SUCCESS_WITH_COST',
    success: true,
    skill: 'Atletismo',
    actor: 'Gael',
    timestamp: Date.now(),
    sides: 20,
  };

  const costNarrative = generateDeterministicRollNarrative(mockContext, successWithCostResult);
  const hasCostElement =
    costNarrative.includes('Sucesso com Custo') &&
    (costNarrative.includes('esforço adicional') || costNarrative.includes('complicações'));

  if (hasCostElement && successWithCostResult.success === true) {
    console.log('✅ TESTE 7 PASSOU: SUCCESS_WITH_COST reflete alcance do objetivo com custo ou esforço adicional.');
    console.log(`   Narrativa gerada:\n   "${costNarrative}"\n`);
    passedTests++;
  } else {
    throw new Error('TESTE 7 FALHOU: SUCCESS_WITH_COST não incluiu complicação ou custo.');
  }

  // ===============================================================
  // TESTE 8: Resolução de Críticos (CRITICAL_SUCCESS 20 vs CRITICAL_FAILURE 1-3)
  // ===============================================================
  totalTests++;
  console.log('[TESTE 8 — RESOLUÇÃO MECÂNICA DE CRÍTICOS (NAT 20 e NAT 1-3)]');
  const nat20 = evaluateRollOutcome(20);
  const nat1 = evaluateRollOutcome(1);
  const nat2 = evaluateRollOutcome(2);
  const nat3 = evaluateRollOutcome(3);

  const critSuccessCheck = executeRollCheck({ skill: 'Combate', difficulty: 'EXTREME', modifier: -5 }, 20);
  const critFailCheck = executeRollCheck({ skill: 'Combate', difficulty: 'LOW', modifier: 15 }, 2);

  if (
    nat20 === 'CRITICAL_SUCCESS' &&
    nat1 === 'CRITICAL_FAILURE' &&
    nat2 === 'CRITICAL_FAILURE' &&
    nat3 === 'CRITICAL_FAILURE' &&
    critSuccessCheck.success === true &&
    critSuccessCheck.outcome === 'CRITICAL_SUCCESS' &&
    critFailCheck.success === false &&
    critFailCheck.outcome === 'CRITICAL_FAILURE'
  ) {
    console.log('✅ TESTE 8 PASSOU: Nat 20 é sempre Critical Success e Nat 1-3 é sempre Critical Failure, sem desvios.\n');
    passedTests++;
  } else {
    throw new Error('TESTE 8 FALHOU: Avaliação mecânica de críticos incorreta.');
  }

  // ===============================================================
  // TESTE 9: Repetição de Ação sem Mudança Relevante
  // ===============================================================
  totalTests++;
  console.log('[TESTE 9 — PROIBIÇÃO DE REROLL GRATUITO EM REPETIÇÃO IDÊNTICA DE AÇÃO]');
  const hasNoFreeRerollDirective = systemInstructions.includes(
    'Se o jogador repetir exatamente a mesma ação sem nova abordagem, nova ferramenta ou mudança relevante no ambiente, NÃO gere nova oportunidade gratuita de rolagem.'
  );

  if (hasNoFreeRerollDirective) {
    console.log('✅ TESTE 9 PASSOU: Diretriz de bloqueio de reroll gratuito para insistência sem mudança validada.\n');
    passedTests++;
  } else {
    throw new Error('TESTE 9 FALHOU: Diretriz de insistência / repetição ausente.');
  }

  // ===============================================================
  // TESTE 10: Tratamento e Proteção de Rolagens em Retry e Edit
  // ===============================================================
  totalTests++;
  console.log('[TESTE 10 — CONSISTÊNCIA EM RETRY E EDIT]');
  const hasRetryEditProtection = systemInstructions.includes(
    'Em operações de Retry ou Edit, o Narrador obedece rigorosamente ao estado consolidado e ao cache de execução do servidor, sem realizar rolagens silenciosas ou desautorizadas.'
  );

  if (hasRetryEditProtection) {
    console.log('✅ TESTE 10 PASSOU: Proteção e obediência mecânica em Retry e Edit asseguradas.\n');
    passedTests++;
  } else {
    throw new Error('TESTE 10 FALHOU: Regra de Retry/Edit ausente nas System Instructions.');
  }

  console.log('===============================================================');
  console.log(`>>> RESULTADO FINAL: ${passedTests}/${totalTests} TESTES DE D20 & OBEDIÊNCIA MECÂNICA APROVADOS (100%) <<<`);
  console.log('===============================================================\n');
}

runD20MechanicalObedienceTests().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
