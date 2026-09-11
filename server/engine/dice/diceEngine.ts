/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomInt } from 'node:crypto';
import {
  DifficultyLevel,
  RollOutcome,
  RollD20Result,
  RollCheckParams,
  RollCheckResult,
} from './types';

export const DIFFICULTY_THRESHOLDS: Record<DifficultyLevel, number> = {
  LOW: 8,
  MEDIUM: 13,
  HIGH: 18,
  EXTREME: 23,
};

/**
 * Gera um número aleatório estritamente entre 1 e 20 usando o gerador criptográfico do Node.js.
 * Permite injeção de `forcedRoll` exclusivamente para testes unitários determinísticos.
 */
export function generateD20Roll(forcedRoll?: number): number {
  if (typeof forcedRoll === 'number' && forcedRoll >= 1 && forcedRoll <= 20) {
    return Math.floor(forcedRoll);
  }
  return randomInt(1, 21);
}

/**
 * Classifica a qualidade intrínseca do resultado do D20 pelas faixas canônicas:
 * 1-3: Critical Failure
 * 4-9: Failure
 * 10-14: Success with Cost
 * 15-19: Full Success
 * 20: Critical Success
 */
export function evaluateRollOutcome(roll: number): RollOutcome {
  if (roll <= 3) return 'CRITICAL_FAILURE';
  if (roll <= 9) return 'FAILURE';
  if (roll <= 14) return 'SUCCESS_WITH_COST';
  if (roll <= 19) return 'FULL_SUCCESS';
  return 'CRITICAL_SUCCESS';
}

/**
 * Resolve e normaliza o valor numérico e nível de dificuldade a partir dos argumentos.
 */
export function resolveDifficulty(
  input?: DifficultyLevel | number | string
): { threshold: number; level: DifficultyLevel | 'CUSTOM' } {
  if (typeof input === 'number') {
    const threshold = Math.max(1, Math.floor(input));
    // Tenta associar a um nível nomeado se coincidir
    if (threshold === DIFFICULTY_THRESHOLDS.LOW) return { threshold, level: 'LOW' };
    if (threshold === DIFFICULTY_THRESHOLDS.MEDIUM) return { threshold, level: 'MEDIUM' };
    if (threshold === DIFFICULTY_THRESHOLDS.HIGH) return { threshold, level: 'HIGH' };
    if (threshold === DIFFICULTY_THRESHOLDS.EXTREME) return { threshold, level: 'EXTREME' };
    return { threshold, level: 'CUSTOM' };
  }

  if (typeof input === 'string') {
    const clean = input.trim().toUpperCase();
    if (clean in DIFFICULTY_THRESHOLDS) {
      const level = clean as DifficultyLevel;
      return { threshold: DIFFICULTY_THRESHOLDS[level], level };
    }
    const parsedNum = parseInt(clean, 10);
    if (!isNaN(parsedNum)) {
      return resolveDifficulty(parsedNum);
    }
  }

  // Padrão: MEDIUM (13)
  return { threshold: DIFFICULTY_THRESHOLDS.MEDIUM, level: 'MEDIUM' };
}

/**
 * Executa a rolagem pura de um D20 pelo Game Engine.
 */
export function executeRollD20(forcedRoll?: number): RollD20Result {
  const roll = generateD20Roll(forcedRoll);
  const timestamp = Date.now();

  console.log([
    '==================================================',
    '[Game Engine -> Dice Engine] ROLL_D20',
    `D20 Roll: ${roll}`,
    'Sides: 20',
    `Timestamp: ${timestamp}`,
    '==================================================',
  ].join('\n'));

  return {
    roll,
    sides: 20,
    timestamp,
  };
}

/**
 * Executa a resolução mecânica completa de um teste de perícia/atributo pelo Game Engine.
 * 1. Gera o D20 aleatório no servidor.
 * 2. Aplica o modificador recebido.
 * 3. Calcula o total (D20 + modificador).
 * 4. Avalia a qualidade intrínseca do dado e compara com o limiar de dificuldade.
 * 5. Emite log estruturado de desenvolvimento.
 */
export function executeRollCheck(
  params: RollCheckParams = {},
  forcedRoll?: number
): RollCheckResult {
  const timestamp = Date.now();
  const roll = generateD20Roll(forcedRoll);
  const rawModifier = typeof params.modifier === 'number' ? params.modifier : parseInt(String(params.modifier || 0), 10);
  const modifier = isNaN(rawModifier) ? 0 : rawModifier;
  const total = roll + modifier;

  const { threshold: difficulty, level: difficultyLevel } = resolveDifficulty(params.difficulty);
  const skill = params.skill?.trim() || 'General Check';
  const actor = params.actor?.trim() || 'Jogador';

  // Avaliação do outcome baseado na faixa do dado
  let outcome = evaluateRollOutcome(roll);
  let success: boolean;

  if (roll === 20) {
    // Crítico 20 é sempre sucesso pleno e destacado
    outcome = 'CRITICAL_SUCCESS';
    success = true;
  } else if (roll <= 3) {
    // 1-3 é sempre Falha Crítica
    outcome = 'CRITICAL_FAILURE';
    success = false;
  } else {
    // Faixas 4-19: comparam o total calculado com a dificuldade
    if (total >= difficulty) {
      success = true;
      // Se o dado foi 4-9 mas modificador alto cobriu a dificuldade, o sucesso foi com custo/esforço
      if (roll <= 9) {
        outcome = 'SUCCESS_WITH_COST';
      }
    } else {
      success = false;
      // Se total não atingiu a dificuldade, mesmo com dado razoável (10-14), o objetivo falhou
      if (outcome === 'SUCCESS_WITH_COST') {
        outcome = 'SUCCESS_WITH_COST'; // Mantém para refletir a quase vitória / custo
      } else if (outcome === 'FULL_SUCCESS') {
        outcome = 'FAILURE'; // Não superou a dificuldade exigida
      }
    }
  }

  // Log de desenvolvimento formatado
  const modSign = modifier >= 0 ? `+${modifier}` : `${modifier}`;
  console.log([
    '==================================================',
    '[Game Engine -> Dice Engine] ROLL_CHECK',
    `Skill: ${skill}`,
    `Actor: ${actor}`,
    `Difficulty: ${difficultyLevel} (${difficulty})`,
    `Modifier: ${modSign}`,
    `D20: ${roll}`,
    `Total: ${total}`,
    `Outcome: ${outcome}`,
    `Success: ${success}`,
    `Timestamp: ${timestamp}`,
    '==================================================',
  ].join('\n'));

  return {
    roll,
    modifier,
    total,
    difficulty,
    difficultyLevel,
    outcome,
    success,
    skill,
    actor,
    timestamp,
    sides: 20,
  };
}
