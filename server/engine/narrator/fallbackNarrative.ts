/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NarratorPromptContext } from './types';
import { RollCheckResult, RollD20Result } from '../dice/types';

/**
 * Gera um desfecho neutro e procedural estritamente compatível com o resultado da rolagem mecânica
 * oficial do Game Engine, sem inventar consequências arbitrárias nem depender de nova chamada de LLM.
 */
export function generateDeterministicRollNarrative(
  context: NarratorPromptContext,
  rollResult: RollCheckResult | RollD20Result
): string {
  const actor = ('actor' in rollResult && rollResult.actor) ? rollResult.actor : (context.player?.name || 'Você');

  if ('outcome' in rollResult) {
    const check = rollResult as RollCheckResult;
    const skillName = check.skill ? ` (${check.skill})` : '';

    switch (check.outcome) {
      case 'CRITICAL_FAILURE':
        return `[Resolução Mecânica: Falha Crítica | D20: ${check.roll} + ${check.modifier} = ${check.total} vs CD ${check.difficulty}]\n\n${actor} tenta realizar a ação${skillName}, mas a tentativa falha criticamente de forma desastrosa.`;
      
      case 'FAILURE':
        return `[Resolução Mecânica: Falha | D20: ${check.roll} + ${check.modifier} = ${check.total} vs CD ${check.difficulty}]\n\n${actor} tenta realizar a ação${skillName}, mas a tentativa não tem sucesso.`;
      
      case 'SUCCESS_WITH_COST':
        return `[Resolução Mecânica: Sucesso com Custo | D20: ${check.roll} + ${check.modifier} = ${check.total} vs CD ${check.difficulty}]\n\n${actor} alcança o objetivo pretendido${skillName}, porém com esforço adicional ou complicações decorrentes da situação.`;
      
      case 'FULL_SUCCESS':
        return `[Resolução Mecânica: Sucesso Total | D20: ${check.roll} + ${check.modifier} = ${check.total} vs CD ${check.difficulty}]\n\n${actor} atinge o resultado pretendido${skillName} sem contratempos.`;
      
      case 'CRITICAL_SUCCESS':
        return `[Resolução Mecânica: Sucesso Crítico | D20: ${check.roll} + ${check.modifier} = ${check.total} vs CD ${check.difficulty}]\n\n${actor} realiza a ação${skillName} com maestria absoluta e sucesso excepcional.`;
      
      default:
        return check.success
          ? `[Resolução Mecânica: Sucesso | D20: ${check.roll}]\n\n${actor} obtém sucesso na tentativa.`
          : `[Resolução Mecânica: Falha | D20: ${check.roll}]\n\n${actor} falha na tentativa.`;
    }
  }

  // Se for um RollD20Result simples
  const d20 = rollResult as RollD20Result;
  return `[Resolução Mecânica: D20 = ${d20.roll}]`;
}

/**
 * Gerador de narrativa contextual procedural para contingência em caso de indisponibilidade
 * de rede ou picos de carga 503 nos servidores externos da Google AI.
 */
export function generateProceduralNarrative(context: NarratorPromptContext): string {
  const { player, currentUserInput } = context;

  const inputLower = currentUserInput.toLowerCase().trim();
  const isGreeting = inputLower.includes('oi') || inputLower.includes('olá') || inputLower.includes('ola') || inputLower.includes('mestre') || inputLower.length < 20;

  if (isGreeting && (!player?.name || player.name.trim() === '')) {
    return `Olá. Estou pronto para conduzir sua sessão de RPG como Mestre.

O mundo, o personagem e o contexto inicial ainda não foram definidos. Conte-me qual tipo de história ou cenário gostaria de explorar, ou descreva seu personagem para darmos início!`;
  }

  return `*O mundo ao seu redor silencia por um instante, aguardando o peso da sua decisão se concretizar.*`;
}
