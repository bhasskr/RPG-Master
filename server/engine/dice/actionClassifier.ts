/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DifficultyLevel } from './types';

export type ActionRiskCategory = 'TRIVIAL' | 'IMPOSSIBLE' | 'UNCERTAIN';

export interface ActionRiskClassification {
  category: ActionRiskCategory;
  requiresRoll: boolean;
  isImpossible: boolean;
  suggestedSkill?: string;
  suggestedDifficulty?: DifficultyLevel;
  reason: string;
}

/**
 * Classifica autoritativamente pelo Game Engine se a ação do jogador:
 * 1. TRIVIAL: Ação sem oposição, sem risco e com sucesso garantido (SEM DADO).
 * 2. IMPOSSIBLE: Ação fisicamente/logicamente impossível sem magia/meios (FALHA POR LÓGICA, SEM DADO).
 * 3. UNCERTAIN: Ação com risco, oposição, incerteza ou consequência relevante (EXIGE D20 / ROLL_CHECK).
 */
export function classifyActionRisk(actionText: string): ActionRiskClassification {
  if (!actionText || actionText.trim().length === 0) {
    return {
      category: 'TRIVIAL',
      requiresRoll: false,
      isImpossible: false,
      reason: 'Ação vazia ou observação passiva.',
    };
  }

  const clean = actionText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // 1. AÇÕES IMPOSSÍVEIS (Física / Lógica / Cânone sem recursos extraordinários)
  const impossiblePatterns = [
    /(salto|pulo)\s+(ate\s+o\s+topo|\d+\s*m(etros)?|para\s+a\s+lua|as\s+estrelas|o\s+ceu)/i,
    /voo\s+(sem\s+magia|batendo\s+os\s+bracos|pelas\s+minhas\s+proprias\s+forcas)/i,
    /destruo\s+(uma|a|o)?\s*(montanha|castelo|muralha|edificio)\s*(inteira|inteiro)?\s*(com\s+um\s+soco|com\s+as\s+maos\s+nuas|com\s+um\s+peteleco)/i,
    /ressuscito\s+.*(sem\s+magia|estalando\s+os\s+dedos|com\s+um\s+olhar)/i,
    /teletransporto\s+.*sem\s+magia/i,
    /(erguer|levanto|carrego)\s+.*(toneladas|montanha|predio).*com\s+as\s+maos/i,
    /comprar\s+.*sem\s+(dinheiro|moedas|recursos|pagar)/i,
  ];

  for (const pattern of impossiblePatterns) {
    if (pattern.test(clean)) {
      return {
        category: 'IMPOSSIBLE',
        requiresRoll: false,
        isImpossible: true,
        reason: 'Ação fisicamente ou logicamente impossível segundo as leis naturais do mundo.',
      };
    }
  }

  // 2. AÇÕES TRIVIAIS / CERTAS (Sem oposição, rotina, observação, portas abertas)
  const trivialPatterns = [
    /^(eu\s+)?(abro|abrir)\s+(uma\s+)?porta\s+(destrancada|aberta|sem\s+tranca|sem\s+obstaculos)/i,
    /^(eu\s+)?(caminho|ando|vou|dirijo-me|me\s+dirijo)\s+(ate|para)\s+/i,
    /^(eu\s+)?(olho|olhar|observo|observar|examino|ver|olhando)\s+(ao\s+redor|a\s+sala|o\s+quarto|o\s+ceu|para\s+a\s+taverna|a\s+praca)/i,
    /^(eu\s+)?(sento|sentar|deito|deitar|levanto|levantar|bebo|beber|como|comer|respiro|espero|aguardo)/i,
    /^(eu\s+)?(cumprimento|saudo|dou\s+bom\s+dia|aceno|sorrio)/i,
    /^(eu\s+)?(pergunto|falo|digo|converso|respondo)\s+(sobre|com|ao|para)/i,
  ];

  // Se a ação for trivial e NÃO tiver termos de risco explícito
  const hasRiskWords = /(tentar|tento|furtiv|roub|arromb|atac|golpe|escond|menti|engan|persuad|ameac|escal|fugir|salto\s+o\s+abismo)/i.test(clean);

  for (const pattern of trivialPatterns) {
    if (pattern.test(clean) && !hasRiskWords) {
      return {
        category: 'TRIVIAL',
        requiresRoll: false,
        isImpossible: false,
        reason: 'Ação trivial, rotineira ou de observação sem oposição ou risco de consequência negativa.',
      };
    }
  }

  // 3. AÇÕES INCERTAS / ARRISCADAS (Exigem resolução mecânica)
  let suggestedSkill = 'General Check';
  let suggestedDifficulty: DifficultyLevel = 'MEDIUM';

  if (/(roub|furt|bater\s+carteira|subtrair|trombad)/i.test(clean)) {
    suggestedSkill = 'Destreza / Prestidigitação';
    suggestedDifficulty = 'HIGH';
  } else if (/(arromb|tranca|fechadura|gazua)/i.test(clean)) {
    suggestedSkill = 'Ladroagem / Arrombamento';
    suggestedDifficulty = 'MEDIUM';
  } else if (/(escond|furtiv|esgueir|silencios)/i.test(clean)) {
    suggestedSkill = 'Furtividade';
    suggestedDifficulty = 'MEDIUM';
  } else if (/(atac|golp|espada|arco|dispar|lutar|apunhal)/i.test(clean)) {
    suggestedSkill = 'Combate';
    suggestedDifficulty = 'MEDIUM';
  } else if (/(ment|engan|blef|dissimul)/i.test(clean)) {
    suggestedSkill = 'Enganação';
    suggestedDifficulty = 'HIGH';
  } else if (/(persuad|convenc|negoci|intimid)/i.test(clean)) {
    suggestedSkill = 'Persuasão';
    suggestedDifficulty = 'MEDIUM';
  } else if (/(escal|salto|pular|abismo|arremess)/i.test(clean)) {
    suggestedSkill = 'Atletismo / Acrobacia';
    suggestedDifficulty = 'MEDIUM';
  } else if (/(investig|procurar\s+pistas|vasculh|examinar\s+minuciosamente)/i.test(clean)) {
    suggestedSkill = 'Investigação';
    suggestedDifficulty = 'MEDIUM';
  }

  if (hasRiskWords || /(tento|tentar|tenta|arriscar|desafiar)/i.test(clean)) {
    return {
      category: 'UNCERTAIN',
      requiresRoll: true,
      isImpossible: false,
      suggestedSkill,
      suggestedDifficulty,
      reason: 'Ação de desfecho incerto, com oposição, habilidade exigida ou risco relevante.',
    };
  }

  // Padrão: Se não for explicitamente arriscada nem impossível, trata como ação livre/narrativa sem rolagem obrigatória
  return {
    category: 'TRIVIAL',
    requiresRoll: false,
    isImpossible: false,
    reason: 'Ação descritiva sem teste de perícia explícito necessário.',
  };
}
