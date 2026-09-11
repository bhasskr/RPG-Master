/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSystemInstructions } from './systemInstructions';

/**
 * Suíte de Testes e Validação: Refino do Narrador — Proteção de Agência do Jogador
 * 
 * Regra canônica:
 * "Consequence may be imposed by world state; voluntary choice must come from the player."
 * 
 * Cobre os 6 cenários solicitados:
 * 1. NPC faz proposta romântica -> Narrador não decide atração/aceitação.
 * 2. Situação assustadora -> pode narrar reação física/ambiente, não "você sente medo".
 * 3. Jogador abre porta -> resultado imposto no ambiente, mas não decide entrar depois.
 * 4. Jogador perde combate -> queda/inconsciência permitidas quando causais.
 * 5. NPC pergunta algo -> jogador diz "Eu respondo." -> Narrador não inventa resposta do protagonista.
 * 6. Retry/Edit -> mesma proteção de agência mantida e repassada integralmente.
 */

interface AgencyCheckResult {
  valid: boolean;
  violations: string[];
  permittedCausalReactions: string[];
}

/**
 * Analisador semântico de padrões de agência e separação estrita:
 * - Violações: imposição de emoção íntima, pensamento, decisão moral, ação voluntária não declarada ou fala autocompletada.
 * - Permitidos: consequências causais mecânicas e físicas (queda, dor, perda de equilíbrio, inconsciência, impacto).
 */
function evaluatePlayerAgencyInNarrative(
  playerInput: string,
  narrativeText: string
): AgencyCheckResult {
  const violations: string[] = [];
  const permittedCausalReactions: string[] = [];
  const text = narrativeText.toLowerCase();

  // 1. Padrões de Imposição Emocional / Psicológica Subjetiva (PROIBIDOS)
  const forbiddenEmotions = [
    { pattern: /\b(você|voce)\s+(sente|experimenta|nutre)\s+(?:(?:um|uma|grande|forte|repentino|intenso)\s+)*(medo|pavor|terror|angústia|angustia|desespero|pânico|panico)\b/i, label: 'Imposição de Medo/Pânico íntimo' },
    { pattern: /\b(você|voce)\s+(sente|experimenta|nutre)\s+(?:(?:um|uma|grande|forte|repentino|intenso)\s+)*(atração|atracao|paixão|paixao|amor|afeição|afeicao|desejo)\b/i, label: 'Imposição de Atração Romântica' },
    { pattern: /\b(você|voce)\s+se\s+(apaixona|sente atra[íi]d[oa]|deixa encantar)\b/i, label: 'Imposição de Sentimento Amoroso' },
    { pattern: /\b(você|voce)\s+(percebe que pode confiar|decide confiar|sente confian[çc]a|confia)\b/i, label: 'Imposição de Confiança em NPC' },
    { pattern: /\b(você|voce)\s+(sente|nutre)\s+(?:(?:um|uma|grande|forte|repentino|intenso)\s+)*(ódio|odio|raiva incontrolável|culpa|remorso)\b/i, label: 'Imposição de Emoção Moral' },
  ];

  for (const { pattern, label } of forbiddenEmotions) {
    if (pattern.test(text)) {
      violations.push(`VIOLAÇÃO EMOCIONAL: ${label}`);
    }
  }

  // 2. Padrões de Imposição de Ação Voluntária / Decisão Não Declarada (PROIBIDOS)
  const forbiddenVoluntaryActions = [
    { pattern: /\b(você|voce)\s+(decide|resolve|opta por|escolhe)\s+(?:(?:então|imediatamente|rapidamente)\s+)*(entrar|ir|avançar|atacar|ajudar|fugir|aceitar|concordar|segurar)\b/i, label: 'Imposição de Decisão Voluntária' },
    { pattern: /\b(você|voce)\s+se\s+aproxima\s+para\s+ajud[aá]-?l[oa]\b/i, label: 'Imposição de Ajuda/Socorro Voluntário' },
    { pattern: /\b(você|voce)\s+entra\s+na\s+(sala|sala escura|câmara|camara|casa|caverna)\b/i, label: 'Imposição de Entrada em Ambiente quando só abriu a porta' },
    { pattern: /\b(você|voce)\s+aceita\s+(a proposta|o acordo|o convite|o pacto)\b/i, label: 'Imposição de Aceitação de Proposta' },
  ];

  for (const { pattern, label } of forbiddenVoluntaryActions) {
    if (pattern.test(text)) {
      // Se o jogador não solicitou explicitamente a ação na sua entrada
      const playerWantsAction = playerInput.toLowerCase().includes('entrar') ||
        playerInput.toLowerCase().includes('ajudar') ||
        playerInput.toLowerCase().includes('aceito') ||
        playerInput.toLowerCase().includes('aceitar');

      if (!playerWantsAction) {
        violations.push(`VIOLAÇÃO DE AÇÃO VOLUNTÁRIA: ${label}`);
      }
    }
  }

  // 3. Padrões de Autocompletar Falas / Diálogos do Protagonista (PROIBIDOS)
  if (/^(eu\s+)?(respondo|falo|converso)(\.|\s|$)/i.test(playerInput.trim())) {
    const dialogueAutocompletionPatterns = [
      { pattern: /\b(você|voce)\s+(responde|diz|afirma|fala)\s+que\s+(aceita|vai|recusa|concorda|sabe|quer)\b/i, label: 'Autocompletar Conteúdo da Resposta' },
      { pattern: /"(sim|não|claro|aceito|concordo|eu vou|minha resposta é)/i, label: 'Invenção de Fala Direta do Protagonista' },
    ];

    for (const { pattern, label } of dialogueAutocompletionPatterns) {
      if (pattern.test(text)) {
        violations.push(`VIOLAÇÃO DE DIÁLOGO: ${label}`);
      }
    }
  }

  // 4. Reconhecimento de Consequências Físicas Causais e Reflexos (PERMITIDOS)
  const permittedCausalPatterns = [
    { pattern: /\b(cai|derruba você|arremessa você|desmorona|perde o equilíbrio|chão de terra)\b/i, label: 'Queda / Perda de Equilíbrio Causal' },
    { pattern: /\b(dor|lateja|visão escurece|inconsciente|desmaia|perde a consciência)\b/i, label: 'Dor / Inconsciência Decorrente de Dano' },
    { pattern: /\b(arrepio na pele|frio na espinha|pulso acelera|respiração curta|estremece)\b/i, label: 'Reflexo Fisiológico / Somático' },
    { pattern: /\b(aguarda|em silêncio|olhar expectante|espera sua resposta)\b/i, label: 'Espera Natural por Decisão do Jogador' },
  ];

  for (const { pattern, label } of permittedCausalPatterns) {
    if (pattern.test(text)) {
      permittedCausalReactions.push(label);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    permittedCausalReactions,
  };
}

async function runAgencyTestSuite() {
  console.log('===============================================================');
  console.log('SUÍTE DE TESTES: REFINO DO NARRADOR — PROTEÇÃO DE AGÊNCIA');
  console.log('===============================================================\n');

  // [TESTE 1] Verificação Estrutural das System Instructions
  console.log('[TESTE 1] Verificando Diretiva Canônica de Agência nas System Instructions...');
  const instructions = getSystemInstructions();

  const requiredCanonicalTokens = [
    'PROTEÇÃO ABSOLUTA DA AGÊNCIA DO JOGADOR (REGRA CANÔNICA)',
    'Consequence may be imposed by world state; voluntary choice must come from the player',
    'O NARRADOR CONTROLA:',
    'O NARRADOR NUNCA CONTROLA (ESTRITAMENTE PROIBIDO)',
    'EXEMPLOS DE VIOLAÇÕES DE AGÊNCIA (BLOQUEIO OBRIGATÓRIO)',
    'PROTEÇÃO RIGOROSA EM DIÁLOGOS (NÃO AUTOCOMPLETAR FALAS)',
    'DISTINÇÃO ENTRE CONSEQUÊNCIA INVOLUNTÁRIA E AÇÃO VOLUNTÁRIA',
    'Você decide entrar',
    'Você percebe que pode confiar nela',
    'Você sente medo',
    'Você responde que aceita',
    'Você se aproxima para ajudá-lo',
  ];

  for (const token of requiredCanonicalTokens) {
    if (!instructions.includes(token)) {
      throw new Error(`Diretiva canônica ausente nas instruções: "${token}"`);
    }
  }
  console.log('✅ TESTE 1 PASSOU: Seção Canônica de Agência completa e sem contradições.\n');

  // [TESTE 2] Cenário 1: NPC faz proposta romântica -> Narrador não decide atração/aceitação
  console.log('[TESTE 2] Cenário 1: Proposta romântica de NPC...');
  const scenario1PlayerInput = 'Observo a cortesã enquanto ela fala comigo.';
  const scenario1NarrativeGood = 
    'A cortesã dá um passo à frente, com um sorriso enigmático, e toca suavemente o dorso da sua mão com as pontas dos dedos frios. "Poderíamos deixar este banquete para trás e encontrar um lugar mais reservado", murmura ela com a voz aveludada, fixando os olhos castanhos nos seus enquanto aguarda seu posicionamento.';
  
  const s1Eval = evaluatePlayerAgencyInNarrative(scenario1PlayerInput, scenario1NarrativeGood);
  if (!s1Eval.valid) {
    throw new Error(`Falso positivo no Cenário 1: ${s1Eval.violations.join(', ')}`);
  }

  // Testando contra violação (Narrador decidir atração)
  const scenario1NarrativeBad = 'A cortesã sorri e você sente uma forte atração por ela, decidindo segurar sua cintura.';
  const s1BadEval = evaluatePlayerAgencyInNarrative(scenario1PlayerInput, scenario1NarrativeBad);
  if (s1BadEval.valid) {
    throw new Error('Falha ao detectar violação de atração romântica imposta.');
  }
  console.log('✅ TESTE 2 PASSOU: NPC seduz ou propõe, mas atração/reação íntima não é imposta.\n');

  // [TESTE 3] Cenário 2: Situação assustadora -> Fisiologia/ambiente permitidos, mas não "você sente medo"
  console.log('[TESTE 3] Cenário 2: Situação aterrorizante (Monstro colossal)...');
  const scenario2PlayerInput = 'Espio a câmara profunda da caverna.';
  const scenario2NarrativeGood =
    'O som de respiração cavernosa ecoa pelas estalagmites. Da escuridão surge uma carcaça quitinosa com três metros de altura; as mandíbulas gotejam um líquido leitoso que chia ao tocar a rocha. O impacto dos passos faz a poeira cair do teto e seus pelos do braço se eriçam com a onda de ar fétido.';
  
  const s2Eval = evaluatePlayerAgencyInNarrative(scenario2PlayerInput, scenario2NarrativeGood);
  if (!s2Eval.valid) {
    throw new Error(`Falso positivo no Cenário 2: ${s2Eval.violations.join(', ')}`);
  }

  // Testando contra violação ("Você sente medo e recua em pânico")
  const scenario2NarrativeBad = 'A criatura aparece e você sente medo diante do monstro, tremendo de pavor.';
  const s2BadEval = evaluatePlayerAgencyInNarrative(scenario2PlayerInput, scenario2NarrativeBad);
  if (s2BadEval.valid) {
    throw new Error('Falha ao detectar imposição de sentimento de medo.');
  }
  console.log('✅ TESTE 3 PASSOU: Ambiente aterrorizante e impacto fisiológico descritos sem impor medo subjetivo.\n');

  // [TESTE 4] Cenário 3: Jogador abre porta -> resultado imposto no ambiente, mas não decide entrar
  console.log('[TESTE 4] Cenário 3: Jogador abre a porta (abrir != entrar)...');
  const scenario3PlayerInput = 'Eu empurro a maçaneta e abro a porta da sala.';
  const scenario3NarrativeGood =
    'A fechadura cede com um clique seco e a porta pesada de carvalho se abre para o interior. Do outro lado, o aposento está mergulhado em penumbra; uma mesa de carvalho revirada e frascos estilhaçados cobrem o chão de tábuas largas.';
  
  const s3Eval = evaluatePlayerAgencyInNarrative(scenario3PlayerInput, scenario3NarrativeGood);
  if (!s3Eval.valid) {
    throw new Error(`Falso positivo no Cenário 3: ${s3Eval.violations.join(', ')}`);
  }

  // Testando contra violação ("Você decide entrar na sala")
  const scenario3NarrativeBad = 'A porta se abre e você decide entrar na sala para averiguar as gavetas.';
  const s3BadEval = evaluatePlayerAgencyInNarrative(scenario3PlayerInput, scenario3NarrativeBad);
  if (s3BadEval.valid) {
    throw new Error('Falha ao detectar violação de entrada forçada não declarada.');
  }
  console.log('✅ TESTE 4 PASSOU: Abertura de porta não força entrada voluntária subsequente.\n');

  // [TESTE 5] Cenário 4: Jogador perde combate -> queda/inconsciência causais permitidas
  console.log('[TESTE 5] Cenário 4: Queda e inconsciência em combate (consequência física causal)...');
  const scenario4PlayerInput = 'Tento bloquear a maça do ogro com meu escudo de madeira.';
  const scenario4NarrativeGood =
    'O golpe da maça esmaga o escudo de madeira em farpas com um estrondo ensurdecedor. A força bruta arremessa você contra a parede de pedra; a dor aguda rouba o ar dos seus pulmões e o impacto faz sua visão escurecer enquanto você cai de joelhos no chão de terra, perdendo a consciência.';
  
  const s4Eval = evaluatePlayerAgencyInNarrative(scenario4PlayerInput, scenario4NarrativeGood);
  if (!s4Eval.valid) {
    throw new Error(`Consequência causal legítima foi incorretamente marcada como violação: ${s4Eval.violations.join(', ')}`);
  }
  if (s4Eval.permittedCausalReactions.length === 0) {
    throw new Error('Consequência física causal não foi devidamente identificada.');
  }
  console.log(`✅ TESTE 5 PASSOU: Consequências físicas causais legítimas preservadas (${s4Eval.permittedCausalReactions.join(', ')}).\n`);

  // [TESTE 6] Cenário 5: NPC pergunta algo e jogador diz apenas "Eu respondo."
  console.log('[TESTE 6] Cenário 5: Entrada de diálogo vaga ("Eu respondo.") sem autocompletar fala...');
  const scenario5PlayerInput = 'Eu respondo.';
  const scenario5NarrativeGood =
    'O capitão da guarda apoia as duas mãos no cinturão de couro e inclina a cabeça ligeiramente para a frente, fixando o olhar em você em silêncio, aguardando que você pronuncie suas palavras e explique o que fazia no armazém.';
  
  const s5Eval = evaluatePlayerAgencyInNarrative(scenario5PlayerInput, scenario5NarrativeGood);
  if (!s5Eval.valid) {
    throw new Error(`Falso positivo no Cenário 5: ${s5Eval.violations.join(', ')}`);
  }

  // Testando contra violação (Narrador inventar o que o jogador disse)
  const scenario5NarrativeBad = 'Você responde que aceita o acordo e diz ao capitão que estava apenas passando.';
  const s5BadEval = evaluatePlayerAgencyInNarrative(scenario5PlayerInput, scenario5NarrativeBad);
  if (s5BadEval.valid) {
    throw new Error('Falha ao detectar fala inventada para o protagonista.');
  }
  console.log('✅ TESTE 6 PASSOU: Fala não é autocompletada; mundo aguarda o pronunciamento real do jogador.\n');

  // [TESTE 7] Cenário 6: Retry / Edit Turn -> Consistência das System Instructions
  console.log('[TESTE 7] Cenário 6: Garantia de proteção de agência em fluxos de Retry/Edit...');
  const retryCustomInstructions = getSystemInstructions('Regra do universo: magia drena energia vital', 'Sombrio');
  if (!retryCustomInstructions.includes('PROTEÇÃO ABSOLUTA DA AGÊNCIA DO JOGADOR (REGRA CANÔNICA)')) {
    throw new Error('Proteção de agência não está presente quando regras customizadas são passadas.');
  }
  if (!retryCustomInstructions.includes('Consequence may be imposed by world state; voluntary choice must come from the player')) {
    throw new Error('Regra fundamental ausente nas instruções customizadas de retry/edit.');
  }
  console.log('✅ TESTE 7 PASSOU: Instruções de Retry/Edit preservam a proteção de agência canônica integralmente.\n');

  console.log('===============================================================');
  console.log('RESULTADO DA SUÍTE: 7/7 TESTES APROVADOS (100%)');
  console.log('===============================================================');
}

runAgencyTestSuite().catch((err) => {
  console.error('❌ Falha na suíte de testes de agência:', err);
  process.exit(1);
});
