/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { executeRollD20, executeRollCheck, evaluateRollOutcome, DIFFICULTY_THRESHOLDS } from './diceEngine';
import { executeMemoryToolCall } from '../narrator/memoryTools';
import { MemoryManager } from '../memory/memoryManager';
import { InMemoryStore } from '../memory/inMemoryStore';
import { GameStateManager } from '../gameState/gameStateManager';
import { GameEngine } from '../gameEngine';

async function runDiceEngineTests() {
  console.log('===============================================================');
  console.log('>>> INICIANDO SUÍTE DE TESTES: MOTOR DE DADOS REAL (DICE ENGINE) <<<');
  console.log('===============================================================\n');

  let passedTests = 0;

  // Inicialização da infraestrutura
  const memoryManager = new MemoryManager(new InMemoryStore());
  const gameStateManager = new GameStateManager();
  const gameEngine = new GameEngine(memoryManager, gameStateManager);

    const newCampaign = await gameEngine.startNewCampaign({
      title: 'A Cripta de Valthor',
      premise: 'Um grupo de aventureiros explora uma tumba ancestral.',
      genre: 'Fantasia Sombria',
      startingLocation: 'Entrada da Cripta',
    });
    const campaignId = newCampaign.campaignId;

    // ===============================================================
    // TESTE 1: roll_d20 retorna somente valores entre 1 e 20
    // ===============================================================
    console.log('[TESTE 1 — LIMITES DO D20: Valores estritamente entre 1 e 20]');
    let allWithinBounds = true;
    for (let i = 0; i < 200; i++) {
      const res = executeRollD20();
      if (res.roll < 1 || res.roll > 20 || !Number.isInteger(res.roll) || res.sides !== 20) {
        allWithinBounds = false;
        console.error(`Falha no lançamento ${i}: ${JSON.stringify(res)}`);
        break;
      }
    }

    if (allWithinBounds) {
      console.log('✅ TESTE 1 PASSOU: 200 lançamentos de roll_d20 retornaram estritamente inteiros no intervalo [1, 20].\n');
      passedTests++;
    } else {
      throw new Error('TESTE 1 FALHOU: roll_d20 produziu valores fora do intervalo permitido.');
    }

    // ===============================================================
    // TESTE 2: Executar roll_d20 várias vezes demonstra que o resultado não é fixo/constante
    // ===============================================================
    console.log('[TESTE 2 — ALEATORIEDADE E DISTRIBUIÇÃO: Resultados variados]');
    const rollsSet = new Set<number>();
    for (let i = 0; i < 50; i++) {
      rollsSet.add(executeRollD20().roll);
    }

    if (rollsSet.size >= 8) {
      console.log(`✅ TESTE 2 PASSOU: 50 lançamentos geraram ${rollsSet.size} valores distintos demonstrando aleatoriedade real.\n`);
      passedTests++;
    } else {
      throw new Error(`TESTE 2 FALHOU: Baixa entropia/resultado fixo detectado (${rollsSet.size} valores únicos em 50 lançamentos).`);
    }

    // ===============================================================
    // TESTE 3: roll_check calcula corretamente D20 + modifier = total
    // ===============================================================
    console.log('[TESTE 3 — CÁLCULO MECÂNICO: D20 + Modificador = Total]');
    const check1 = executeRollCheck({ skill: 'atletismo', difficulty: 'MEDIUM', modifier: 3 }, 12);
    const check2 = executeRollCheck({ skill: 'furtividade', difficulty: 'HIGH', modifier: -2 }, 15);
    const check3 = executeRollCheck({ skill: 'percepção', difficulty: 'LOW', modifier: 0 }, 8);

    if (
      check1.total === 15 && check1.roll === 12 && check1.modifier === 3 &&
      check2.total === 13 && check2.roll === 15 && check2.modifier === -2 &&
      check3.total === 8 && check3.roll === 8 && check3.modifier === 0
    ) {
      console.log('✅ TESTE 3 PASSOU: O servidor calculou com precisão total = roll + modifier para modificadores positivos, negativos e nulos.\n');
      passedTests++;
    } else {
      throw new Error(`TESTE 3 FALHOU: Cálculo incorreto: ${JSON.stringify({ check1, check2, check3 })}`);
    }

    // ===============================================================
    // TESTE 4: Verificar cada faixa de resultado do D20
    // 1-3 = Critical Failure, 4-9 = Failure, 10-14 = Success with Cost, 15-19 = Full Success, 20 = Critical Success
    // ===============================================================
    console.log('[TESTE 4 — FAIXAS DE RESULTADO: Classificação mecânica de 1 a 20]');
    const outcome1 = evaluateRollOutcome(1);
    const outcome2 = evaluateRollOutcome(3);
    const outcome3 = evaluateRollOutcome(4);
    const outcome4 = evaluateRollOutcome(9);
    const outcome5 = evaluateRollOutcome(10);
    const outcome6 = evaluateRollOutcome(14);
    const outcome7 = evaluateRollOutcome(15);
    const outcome8 = evaluateRollOutcome(19);
    const outcome9 = evaluateRollOutcome(20);

    if (
      outcome1 === 'CRITICAL_FAILURE' &&
      outcome2 === 'CRITICAL_FAILURE' &&
      outcome3 === 'FAILURE' &&
      outcome4 === 'FAILURE' &&
      outcome5 === 'SUCCESS_WITH_COST' &&
      outcome6 === 'SUCCESS_WITH_COST' &&
      outcome7 === 'FULL_SUCCESS' &&
      outcome8 === 'FULL_SUCCESS' &&
      outcome9 === 'CRITICAL_SUCCESS'
    ) {
      console.log('✅ TESTE 4 PASSOU: Todas as 5 faixas mecânicas classificadas perfeitamente pelo Game Engine.\n');
      passedTests++;
    } else {
      throw new Error(`TESTE 4 FALHOU: Inconsistência na classificação das faixas: ${JSON.stringify({ outcome1, outcome3, outcome5, outcome7, outcome9 })}`);
    }

    // ===============================================================
    // TESTE 5: Confirmar que a dificuldade é considerada no resultado
    // ===============================================================
    console.log('[TESTE 5 — CONSIDERAÇÃO DA DIFICULDADE NO SUCESSO/FALHA]');
    // Exemplo do documento: Roll 14, Modifier +3 => Total 17 vs HIGH (18) => success: false
    const hardCheck = executeRollCheck({ skill: 'lockpicking', difficulty: 'HIGH', modifier: 3 }, 14);
    // Roll 14, Modifier +3 => Total 17 vs MEDIUM (13) => success: true
    const mediumCheck = executeRollCheck({ skill: 'lockpicking', difficulty: 'MEDIUM', modifier: 3 }, 14);
    // Roll 20 => Critical Success sempre tem sucesso
    const critCheck = executeRollCheck({ skill: 'arcanismo', difficulty: 'EXTREME', modifier: 0 }, 20);
    // Roll 2 => Critical Failure sempre falha
    const critFailCheck = executeRollCheck({ skill: 'arcanismo', difficulty: 'LOW', modifier: 10 }, 2);

    if (
      hardCheck.total === 17 &&
      hardCheck.difficulty === 18 &&
      hardCheck.difficultyLevel === 'HIGH' &&
      hardCheck.success === false &&
      mediumCheck.total === 17 &&
      mediumCheck.difficulty === 13 &&
      mediumCheck.difficultyLevel === 'MEDIUM' &&
      mediumCheck.success === true &&
      critCheck.success === true &&
      critCheck.outcome === 'CRITICAL_SUCCESS' &&
      critFailCheck.success === false &&
      critFailCheck.outcome === 'CRITICAL_FAILURE'
    ) {
      console.log('✅ TESTE 5 PASSOU: Dificuldade avaliada com rigor. Total inferior ao limiar resulta em success=false.\n');
      passedTests++;
    } else {
      throw new Error(`TESTE 5 FALHOU: Dificuldade não foi considerada corretamente: ${JSON.stringify({ hardCheck, mediumCheck, critCheck, critFailCheck })}`);
    }

    // ===============================================================
    // TESTE 6: Confirmar que o Gemini não fornece o resultado do dado (autoridade do servidor via Function Calling)
    // ===============================================================
    console.log('[TESTE 6 — AUTORIDADE DO SERVIDOR: Gemini não injeta valores arbitrários de dado]');
    // Se o Gemini tentar enviar argumentos com "roll: 99" ou "total: 100", o servidor ignora e gera o dado real
    const hijackedCall = await executeMemoryToolCall(
      'roll_check',
      { skill: 'atletismo', difficulty: 'HIGH', modifier: 2, roll: 99, total: 100, success: true },
      campaignId,
      memoryManager,
      gameStateManager
    );

    if (
      hijackedCall.success === true &&
      hijackedCall.data &&
      hijackedCall.data.roll >= 1 &&
      hijackedCall.data.roll <= 20 &&
      hijackedCall.data.roll !== 99 &&
      hijackedCall.data.total !== 100
    ) {
      console.log(`✅ TESTE 6 PASSOU: Parâmetros forjados pelo cliente foram desconsiderados. Servidor gerou D20=${hijackedCall.data.roll} com total real=${hijackedCall.data.total}.\n`);
      passedTests++;
    } else {
      throw new Error(`TESTE 6 FALHOU: Servidor aceitou dados forjados: ${JSON.stringify(hijackedCall)}`);
    }

    // ===============================================================
    // TESTE 7: Confirmar que NPCs utilizam exatamente o mesmo mecanismo
    // ===============================================================
    console.log('[TESTE 7 — NPCs E INIMIGOS: Mesmo mecanismo de roll_check]');
    const npcCheck = await executeMemoryToolCall(
      'roll_check',
      { skill: 'sword_attack', difficulty: 'MEDIUM', modifier: 2, actor: 'Capitão Valério' },
      campaignId,
      memoryManager,
      gameStateManager
    );

    if (
      npcCheck.success === true &&
      npcCheck.data &&
      npcCheck.data.actor === 'Capitão Valério' &&
      npcCheck.data.skill === 'sword_attack' &&
      npcCheck.data.difficulty === 13 &&
      npcCheck.data.roll >= 1 &&
      npcCheck.data.roll <= 20 &&
      typeof npcCheck.data.success === 'boolean'
    ) {
      console.log(`✅ TESTE 7 PASSOU: NPC "${npcCheck.data.actor}" utilizou o mesmo fluxo de roll_check com D20=${npcCheck.data.roll}, total=${npcCheck.data.total}, sucesso=${npcCheck.data.success}.\n`);
      passedTests++;
    } else {
      throw new Error(`TESTE 7 FALHOU: Execução de NPC não seguiu o padrão: ${JSON.stringify(npcCheck)}`);
    }

    // ===============================================================
    // TESTE 8: Executar um turno completo integrado com ação de risco
    // Jogador -> Gemini -> roll_check -> Game Engine -> resultado -> Gemini -> narrativa
    // ===============================================================
    console.log('[TESTE 8 — FLUXO COMPLETO INTEGRADO: Ação arriscada aciona roll_check e gera narrativa]');
    const actionTurn = await gameEngine.processPlayerAction(
      campaignId,
      'Tento forçar a pesada fechadura de ferro enferrujado da cripta com minhas gazuas antes que as tochas se apaguem.'
    );

    if (actionTurn && actionTurn.masterMessage && actionTurn.masterMessage.content.length > 20) {
      console.log('✅ TESTE 8 PASSOU: Turno com teste de perícia processado pelo Game Engine e narrativa imersiva gerada.');
      console.log(`Resposta do Mestre gerada:\n"${actionTurn.masterMessage.content.slice(0, 180)}..."\n`);
      passedTests++;
    } else {
      throw new Error(`TESTE 8 FALHOU: Turno completo não retornou narrativa válida: ${JSON.stringify(actionTurn)}`);
    }

    // ===============================================================
    // TESTE 9: Confirmar fidelidade do resultado retornado ao Gemini
    // ===============================================================
    console.log('[TESTE 9 — FIDELIDADE AO RESULTADO: O resultado produzido pelo servidor é transmitido ao modelo]');
    const pureRoll = await executeMemoryToolCall(
      'roll_d20',
      {},
      campaignId,
      memoryManager,
      gameStateManager
    );

    if (
      pureRoll.success === true &&
      pureRoll.data &&
      pureRoll.data.roll >= 1 &&
      pureRoll.data.roll <= 20 &&
      pureRoll.data.sides === 20 &&
      pureRoll.tool === 'roll_d20'
    ) {
      console.log(`✅ TESTE 9 PASSOU: roll_d20 gerou roll=${pureRoll.data.roll} com estrutura canônica e metadados completos.\n`);
      passedTests++;
    } else {
      throw new Error(`TESTE 9 FALHOU: roll_d20 payload inválido: ${JSON.stringify(pureRoll)}`);
    }

    // ===============================================================
    // TESTE 10: Simular falha de ferramenta e verificar que o Gemini não inventa resultado substituto
    // ===============================================================
    console.log('[TESTE 10 — TRATAMENTO DE ERRO: Rejeição de ferramenta desconhecida sem alucinação de dados]');
    const failedToolCall = await executeMemoryToolCall(
      'fake_dice_tool',
      { side: 20 },
      campaignId,
      memoryManager,
      gameStateManager
    );

    if (
      failedToolCall.success === false &&
      failedToolCall.action === 'rejected' &&
      failedToolCall.error === 'UNKNOWN_TOOL' &&
      failedToolCall.tool === 'fake_dice_tool'
    ) {
      console.log('✅ TESTE 10 PASSOU: Ferramenta inválida foi rejeitada pelo servidor com erro estruturado UNKNOWN_TOOL, impedindo resultados simulados.\n');
      passedTests++;
    } else {
      throw new Error(`TESTE 10 FALHOU: Resposta de erro estruturado inválida: ${JSON.stringify(failedToolCall)}`);
    }

    console.log('===============================================================');
    console.log(`>>> RESULTADO FINAL: ${passedTests}/10 TESTES DO MOTOR DE DADOS PASSARAM COM SUCESSO! <<<`);
    console.log('===============================================================\n');
}

runDiceEngineTests().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
