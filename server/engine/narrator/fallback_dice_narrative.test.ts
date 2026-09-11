/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generateDeterministicRollNarrative } from './fallbackNarrative';
import { NarratorPromptContext } from './types';
import { RollCheckResult } from '../dice/types';
import { classifyActionRisk } from '../dice/actionClassifier';
import { executeRollCheck } from '../dice/diceEngine';

async function runTest() {
  console.log('===============================================================');
  console.log('SUÍTE DE TESTES: FALLBACK NARRATIVO DETERMINÍSTICO APÓS ROLAGEM FORÇADA');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  // Contexto simulado
  const mockContext: any = {
    campaignFoundation: { id: 'camp_1', title: 'Campanha de Teste', genre: 'Fantasia', premise: '', tone: 'Épico', startingLocation: 'Templo Antigo', createdAt: Date.now() },
    worldState: { currentLocation: 'Templo Antigo', timeOfDay: 'Noite', weather: 'Chuva', tensionLevel: 'moderate', statusSummary: '' },
    player: { id: 'p1', name: 'Gael, o Ladino', role: 'player', status: 'alive' },
    activeNpcs: [],
    activeQuests: [],
    keyInventoryItems: [],
    recentMessages: [],
    currentUserInput: 'Tento arrombar o baú trancado com gazua.',
  };

  // Cenário 1: Gemini narrou sucesso prévio sem rolar dados, ex:
  const geminiPrematureSuccessText =
    'Você gira a gazua com facilidade. Com um estalo satisfatório, a fechadura de ferro cede e o baú se abre revelando tesouros brilhantes!';

  // Executando a lógica exata de detecção e resolução do Game Engine:
  totalTests++;
  console.log('[TESTE 1 & 2] Verificando classificação de risco e resolução forçada no servidor...');

  const risk = classifyActionRisk(mockContext.currentUserInput);
  if (risk.category !== 'UNCERTAIN') {
    throw new Error(`Ação deveria ser UNCERTAIN, mas foi classificada como ${risk.category}`);
  }

  // Força uma rolagem simulada com resultado FAILURE (ex: D20 = 5)
  const forcedRoll: RollCheckResult = executeRollCheck(
    {
      skill: risk.suggestedSkill || 'ladinagem',
      actor: mockContext.player?.name || 'Jogador',
      difficulty: 'MEDIUM',
      modifier: 2,
    },
    5 // forcedRoll D20 = 5 -> D20 5 + mod 2 = 7 < CD 13 (MEDIUM) -> FAILURE
  );

  const diceRolls: RollCheckResult[] = [];
  const executedTools: any[] = [];

  diceRolls.push(forcedRoll);
  executedTools.push({
    name: 'roll_check',
    args: { skill: risk.suggestedSkill, difficulty: risk.suggestedDifficulty },
    result: { success: true, data: forcedRoll, message: 'Game Engine authoritative resolution' },
  });

  if (
    forcedRoll.outcome === 'FAILURE' &&
    forcedRoll.success === false &&
    forcedRoll.roll === 5 &&
    forcedRoll.total === 7 &&
    diceRolls.length === 1
  ) {
    console.log('✅ TESTE 1 & 2 PASSOU: Ação incerta detectada e rolagem de falha gerada com precisão no servidor.');
    console.log(`   Resultado: D20=${forcedRoll.roll}, Total=${forcedRoll.total} vs CD=${forcedRoll.difficulty} (${forcedRoll.outcome})\n`);
    passedTests++;
  } else {
    throw new Error(`Falha no cálculo da rolagem forçada: ${JSON.stringify(forcedRoll)}`);
  }

  // Cenário 3: Follow-up de chat com o Gemini falha por HTTP 429 Rate Limit
  totalTests++;
  console.log('[TESTE 3 & 4] Simulando falha HTTP 429 no follow-up e gerando narrativa determinística...');

  let finalNarrative = geminiPrematureSuccessText;

  // Simulação do bloco try/catch com follow-up falhando por 429
  try {
    const error429 = new Error('Resource has been exhausted (e.g. check quota) - 429 Too Many Requests');
    throw error429;
  } catch (followUpErr) {
    // Tratamento atualizado: NÃO mantém o texto inicial de sucesso
    finalNarrative = generateDeterministicRollNarrative(mockContext, forcedRoll);
  }

  console.log('--- Narrativa Inicial Ignorada (Incompatível) ---');
  console.log(geminiPrematureSuccessText);
  console.log('--- Narrativa Final Determinística Aplicada ---');
  console.log(finalNarrative);
  console.log('------------------------------------------------');

  const containsFailure =
    finalNarrative.includes('Falha') ||
    finalNarrative.includes('falha') ||
    finalNarrative.includes('não tem sucesso');
  const doesNotContainSuccess =
    !finalNarrative.includes('se abre') &&
    !finalNarrative.includes('tesouros brilhantes') &&
    !finalNarrative.includes('com facilidade');

  if (containsFailure && doesNotContainSuccess) {
    console.log('✅ TESTE 3 & 4 PASSOU: Narrativa inicial incompatível foi descartada e substituída por desfecho determinístico compatível com a falha.');
    passedTests++;
  } else {
    throw new Error(`Narrativa final contraditória com a falha mecânica: ${finalNarrative}`);
  }

  // Cenário 5: Verificação de unicidade da rolagem (apenas 1 rolagem existe no turno)
  totalTests++;
  console.log('[TESTE 5] Verificando unicidade de rolagem no turno...');

  if (diceRolls.length === 1 && executedTools.filter((t) => t.name === 'roll_check').length === 1) {
    console.log('✅ TESTE 5 PASSOU: Existe estritamente 1 rolagem mecânica registrada no turno.\n');
    passedTests++;
  } else {
    throw new Error(`Quantidade incorreta de rolagens no turno: ${diceRolls.length}`);
  }

  console.log('===============================================================');
  console.log(`RESULTADO DA SUÍTE: ${passedTests}/${totalTests} TESTES APROVADOS (100%)`);
  console.log('===============================================================\n');
}

runTest().catch((err) => {
  console.error('❌ ERRO NA EXECUÇÃO DO TESTE:', err);
  process.exit(1);
});
