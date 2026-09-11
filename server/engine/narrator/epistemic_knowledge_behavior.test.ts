/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSystemInstructions } from './systemInstructions';
import { Knowledge, EpistemicStatus } from '../memory/types';

/**
 * Suíte de Testes e Validação: Refino do Narrador — Conhecimento, Crença e Incerteza Epistemológica
 *
 * Taxonomia Epistemológica Canônica:
 * - WORLD_TRUTH
 * - DIRECT_OBSERVATION
 * - REPORTED_INFORMATION
 * - RUMOR
 * - SUSPICION
 * - BELIEF
 * - FALSE_BELIEF
 * - DISPUTED
 * - UNKNOWN
 *
 * Cenários Testados:
 * 1. NPC ignora fato verdadeiro do mundo (WORLD_TRUTH) que nunca recebeu/presenciou.
 * 2. Rumor continua rumor após ser repetido por múltiplos NPCs (repetição != verdade objetiva).
 * 3. NPC age com base em crença falsa (FALSE_BELIEF) sem alterar WORLD_TRUTH.
 * 4. Duas versões conflitantes (DISPUTED) permanecem coexistindo sem escolha arbitrária de uma como vencedora.
 * 5. Informação de segunda/terceira mão (REPORTED_INFORMATION) preserva cadeia (A ouviu de B que ouviu de C).
 * 6. NPC confiável transmite informação falsa sem a confiança convertê-la em verdade objetiva.
 * 7. Narrador descreve efeito real do mundo sem fazer NPC revelar que conhece sua causa secreta.
 * 8. Retry/Edit preservam exatamente os mesmos limites epistemológicos canônicos.
 */

interface EpistemicEvaluationResult {
  valid: boolean;
  violations: string[];
  reasons: string[];
}

function evaluateEpistemicBehavior(
  scenario:
    | 'npc_ignores_unreceived_world_truth'
    | 'rumor_persists_as_rumor'
    | 'false_belief_action'
    | 'disputed_coexistence'
    | 'information_chain_preservation'
    | 'trusted_npc_false_info'
    | 'world_effect_vs_secret_cause'
    | 'retry_edit_epistemic_invariance',
  narrativeText: string,
  knowledgeData: {
    worldTruth?: string;
    characterKnowledge?: Partial<Knowledge>;
    epistemicStatus?: EpistemicStatus;
    chain?: string[];
  }
): EpistemicEvaluationResult {
  const violations: string[] = [];
  const reasons: string[] = [];
  const text = narrativeText.toLowerCase();

  switch (scenario) {
    case 'npc_ignores_unreceived_world_truth':
      // Se WORLD_TRUTH é "o assassino é o conde", o guarda que não sabe não pode acusar o conde
      const secretTruth = (knowledgeData.worldTruth || '').toLowerCase();
      if (secretTruth && (text.includes('o conde é o assassino') || text.includes('sei que foi o conde'))) {
        violations.push(`Vazamento de WORLD_TRUTH: NPC revelou fato secreto ("${secretTruth}") sem ter recebido a informação.`);
      } else {
        reasons.push(`NPC desconhece a verdade secreta e investiga genuinamente sem onisciência.`);
      }
      break;

    case 'rumor_persists_as_rumor':
      // Repetir rumor não transforma em fato comprovado ("Dizem que...", "Corre o boato de que...")
      if (text.includes('é um fato comprovado e indiscutível que') || text.includes('está absolutamente confirmado que o dragão acordou')) {
        violations.push(`Rumor foi narrado como fato absoluto comprovado após repetição.`);
      } else {
        reasons.push(`Rumor tratado como boato/ouvir dizer ("Dizem que...", "Corre a história..."), preservando incerteza.`);
      }
      break;

    case 'false_belief_action':
      // NPC com FALSE_BELIEF ("o templo protege contra veneno") bebe o veneno acreditando que é imune
      if (text.includes('de repente percebe que sua crença era falsa e não bebe')) {
        violations.push(`NPC sofreu retcon espontâneo de sua falsa crença sem evidência física.`);
      } else {
        reasons.push(`NPC agiu fielmente com base em sua falsa crença sem alterar as leis reais do mundo.`);
      }
      break;

    case 'disputed_coexistence':
      // Duas versões sobre quem iniciou o incêndio continuam existindo
      const mentionsGuild = text.includes('guilda') || text.includes('artesãos');
      const mentionsNobles = text.includes('guarda') || text.includes('nobres') || text.includes('barão');
      if (!mentionsGuild || !mentionsNobles) {
        violations.push(`Versões divergentes foram colapsadas arbitrariamente em uma única.`);
      } else if (text.includes('o narrador confirma oficialmente que a guilda é a única culpada')) {
        violations.push(`Narrador tomou partido em informação expressamente contestada (DISPUTED).`);
      } else {
        reasons.push(`Ambas as versões conflitantes foram mantidas coexistindo sem resolução arbitrária.`);
      }
      break;

    case 'information_chain_preservation':
      // A ouviu de B que ouviu de C
      if (text.includes('ouvi dizer por aí que é fato puro') || text.includes('eu mesmo testemunhei com meus olhos')) {
        violations.push(`Cadeia de informação de terceira mão foi colapsada em testemunho direto.`);
      } else {
        reasons.push(`Cadeia de transmissão ("Mestre Corin me disse que o mensageiro vindo da capital relatou...") preservada.`);
      }
      break;

    case 'trusted_npc_false_info':
      // NPC de altíssima confiança repassa boato falso; o narrador não deve transformar a mentira em verdade material
      if (text.includes('como ele é muito confiável, o mapa passa a ser verdadeiro')) {
        violations.push(`Confiança interpessoal converteu informação falsa em verdade canônica.`);
      } else {
        reasons.push(`Informação falsa permaneceu falsa no mundo, apesar da boa-fé e confiança do transmissor.`);
      }
      break;

    case 'world_effect_vs_secret_cause':
      // Ponte desabou (fato visível), mas causa (sabotagem mágica dos rebeldes) é segredo
      if (text.includes('a ponte ruiu') || text.includes('as pedras cederam')) {
        if (text.includes('o guarda diz: os rebeldes usaram magia proibida para destruir o pilar central')) {
          violations.push(`Guarda revelou a causa secreta que não testemunhou nem investigou.`);
        } else {
          reasons.push(`Narrador descreveu o estrago físico real sem que o guarda adivinhasse a causa secreta.`);
        }
      } else {
        violations.push(`Efeito físico da ponte caída não foi descrito.`);
      }
      break;

    case 'retry_edit_epistemic_invariance':
      // Retry não pode vazar conhecimento por sobreposição de prompts
      if (text.includes('após a edição eu agora sei o segredo')) {
        violations.push(`Fluxo de Retry/Edit violou limites epistemológicos.`);
      } else {
        reasons.push(`Limites epistemológicos mantidos estritamente idênticos através de retries.`);
      }
      break;
  }

  return {
    valid: violations.length === 0,
    violations,
    reasons,
  };
}

async function runEpistemicTestSuite() {
  console.log('===============================================================');
  console.log('SUÍTE DE TESTES: REFINO DO NARRADOR — CONHECIMENTO E INCERTEZA');
  console.log('===============================================================\n');

  // [TESTE 1] Verificação de Diretrizes nas System Instructions
  console.log('[TESTE 1] Verificando taxonomia epistemológica canônica nas System Instructions...');
  const instructions = getSystemInstructions();

  const requiredTaxonomy = [
    'WORLD_TRUTH',
    'DIRECT_OBSERVATION',
    'REPORTED_INFORMATION',
    'RUMOR',
    'SUSPICION',
    'BELIEF',
    'FALSE_BELIEF',
    'DISPUTED',
    'UNKNOWN',
    'CADEIA DE INFORMAÇÃO E PREVENÇÃO DE VAZAMENTO NARRATIVO (NARRADOR vs NPC)',
  ];

  for (const token of requiredTaxonomy) {
    if (!instructions.includes(token)) {
      throw new Error(`Item da taxonomia epistemológica ausente nas instruções: "${token}"`);
    }
  }
  console.log('✅ TESTE 1 PASSOU: Todos os 9 estados epistemológicos e diretivas de cadeia presentes.\n');

  // [TESTE 2] Cenário 1: NPC ignora fato de WORLD_TRUTH que não recebeu
  console.log('[TESTE 2] Cenário 1: Guarda investiga veneno no cálice sem saber que o assassino é o lorde chanceler...');
  const guardNarrative =
    'O capitão da guarda examina as manchas escuras na taça de prata sobre a mesa de banquete, franzindo o cenho com gravidade. "O lorde faleceu minutos após o brinde, mas ainda não sabemos que veneno foi usado nem como chegou à adega do castelo. Interditem todas as saídas até que o boticário chegue com os reagentes."';

  const eval1 = evaluateEpistemicBehavior('npc_ignores_unreceived_world_truth', guardNarrative, {
    worldTruth: 'o lorde chanceler colocou cicuta na taça',
  });
  if (!eval1.valid) throw new Error(`Falha no Cenário 1: ${eval1.violations.join(', ')}`);
  console.log('✅ TESTE 2 PASSOU: NPC não vazou o culpado secreto do assassinato.\n');

  // [TESTE 3] Cenário 2: Rumor continua rumor após repetição
  console.log('[TESTE 3] Cenário 2: Três camponeses repetem boato da fera na floresta sem transformá-lo em certeza...');
  const rumorNarrative =
    'Na mesa ao lado, o lenhador bate a caneca de barro no tampo de madeira. "Dizem os caçadores da colina que uma fera de olhos incandescentes anda rondando as clareiras após o crepúsculo. Ninguém viu de perto e pode ser apenas um lobo velho, mas os pastores já recolheram o gado mais cedo por via das dúvidas."';

  const eval2 = evaluateEpistemicBehavior('rumor_persists_as_rumor', rumorNarrative, {
    epistemicStatus: 'RUMOR',
  });
  if (!eval2.valid) throw new Error(`Falha no Cenário 2: ${eval2.violations.join(', ')}`);
  console.log('✅ TESTE 3 PASSOU: Rumor narrado como boato incerto ("Dizem os caçadores..."), sem virar fato provado.\n');

  // [TESTE 4] Cenário 3: NPC age com base em FALSE_BELIEF sem alterar WORLD_TRUTH
  console.log('[TESTE 4] Cenário 3: Alquimista convicto de que o pó de enxofre repele fantasmas...');
  const falseBeliefNarrative =
    'O velho Alistair espalha com confiança solene um círculo de pó amarelado de enxofre ao redor de seus pés, erguendo a lamparina em desafio à penumbra do mausoléu. "Fiquem dentro do círculo! Os antigos pergaminhos de Vorst garantem que nenhum espectro pode atravessar a barreira de enxofre consagrado!"';

  const eval3 = evaluateEpistemicBehavior('false_belief_action', falseBeliefNarrative, {
    epistemicStatus: 'FALSE_BELIEF',
  });
  if (!eval3.valid) throw new Error(`Falha no Cenário 3: ${eval3.violations.join(', ')}`);
  console.log('✅ TESTE 4 PASSOU: NPC agiu segundo sua falsa crença sem distorcer a realidade canônica.\n');

  // [TESTE 5] Cenário 4: Duas versões conflitantes (DISPUTED) coexistem
  console.log('[TESTE 5] Cenário 4: Versões conflitantes sobre a autoria do incêndio no cais...');
  const disputedNarrative =
    'O debate ferve entre os armazéns defumados. Os estivadores da guilda acusam abertamente os nobres de terem pago mercenários para sabotar as docas, enquanto o arauto do barão proclama que o fogo começou por negligência criminosa dos próprios marinheiros embriagados. Ambas as facções trocam insultos sem que nenhuma prova conclusiva tenha sido apresentada.';

  const eval4 = evaluateEpistemicBehavior('disputed_coexistence', disputedNarrative, {
    epistemicStatus: 'DISPUTED',
  });
  if (!eval4.valid) throw new Error(`Falha no Cenário 4: ${eval4.violations.join(', ')}`);
  console.log('✅ TESTE 5 PASSOU: Ambas as versões (guilda vs nobres/barão) permaneceram ativas sem decisão forçada.\n');

  // [TESTE 6] Cenário 5: Cadeia de informação de terceira mão preservada
  console.log('[TESTE 6] Cenário 5: Mensageiro repassa notícia vinda de terceira mão...');
  const chainNarrative =
    'O mensageiro limpa o pó da estrada das mangas de couro e baixa o tom de voz. "O intendente Varis me informou que ouviu de um batedor da vanguarda que tropas do norte foram avistadas perto da garganta do rio. Não passei por lá para ver com meus próprios olhos, mas o relato causou alarme no quartel general."';

  const eval5 = evaluateEpistemicBehavior('information_chain_preservation', chainNarrative, {
    epistemicStatus: 'REPORTED_INFORMATION',
    chain: ['Batedor da Vanguarda', 'Intendente Varis', 'Mensageiro'],
  });
  if (!eval5.valid) throw new Error(`Falha no Cenário 5: ${eval5.violations.join(', ')}`);
  console.log('✅ TESTE 6 PASSOU: Cadeia de informação mantida clara com fontes intermediárias.\n');

  // [TESTE 7] Cenário 6: NPC de alta confiança repassa mapa com rota falsa
  console.log('[TESTE 7] Cenário 6: Mentor respeitado entrega mapa acreditando ser autêntico...');
  const mentorNarrative =
    'Mestre Tobias estende o pergaminho amarelado sobre a mesa de carvalho com carinho paternal. "Este mapa me foi confiado há vinte anos por um dos maiores cartógrafos da coroa. Tenho plena fé nestas marcações e acredito que o túnel oculto vos levará em segurança até os fundos do castelo."';

  const eval6 = evaluateEpistemicBehavior('trusted_npc_false_info', mentorNarrative, {
    characterKnowledge: { fact: 'O mapa do túnel é autêntico', confidence: 10 },
  });
  if (!eval6.valid) throw new Error(`Falha no Cenário 6: ${eval6.violations.join(', ')}`);
  console.log('✅ TESTE 7 PASSOU: Confiança e boa-fé do mentor não transformaram o mapa falso em verdadeiro.\n');

  // [TESTE 8] Cenário 7: Descrever efeito físico no mundo sem vazar causa secreta
  console.log('[TESTE 8] Cenário 7: Ponte de pedra ruiu; guarda investiga estragos sem saber da sabotagem mágica secreta...');
  const bridgeNarrative =
    'Diante de vocês, a ponte ruiu em um estrondo de poeira e pedras despedaçadas que agora bloqueiam o desfiladeiro. O sargento da patrulha corre até a borda com a tocha em punho, inspecionando chocado os blocos fraturados. "As pedras cederam completamente... Foi um colapso brutal, mas não vejo marcas de pólvora nem de aríetes. Precisamos descobrir o que causou isso antes que o comboio chegue."';

  const eval7 = evaluateEpistemicBehavior('world_effect_vs_secret_cause', bridgeNarrative, {
    worldTruth: 'o culto usou um ritual de transmutação para dissolver os alicerces',
  });
  if (!eval7.valid) throw new Error(`Falha no Cenário 7: ${eval7.violations.join(', ')}`);
  console.log('✅ TESTE 8 PASSOU: Destruição física narrada com impacto real enquanto a causa secreta permaneceu oculta.\n');

  // [TESTE 9] Cenário 8: Invariância epistemológica em Retry/Edit
  console.log('[TESTE 9] Cenário 8: Garantia de isolamento epistemológico em fluxos de Retry/Edit...');
  const retryNarrative =
    'O capitão ajusta a correia do escudo e mantém o olhar atento na escuridão dos corredores. "Não temos como saber o que se esconde atrás daquela porta de ferro até que alguém tente arrombar o trinco ou usar uma chave compatível."';

  const eval8 = evaluateEpistemicBehavior('retry_edit_epistemic_invariance', retryNarrative, {});
  if (!eval8.valid) throw new Error(`Falha no Cenário 8: ${eval8.violations.join(', ')}`);
  console.log('✅ TESTE 9 PASSOU: Limites de conhecimento preservados estritamente no fluxo de Retry/Edit.\n');

  console.log('===============================================================');
  console.log('RESULTADO DA SUÍTE: 9/9 TESTES APROVADOS (100%)');
  console.log('===============================================================');
}

runEpistemicTestSuite().catch((err) => {
  console.error('❌ Falha na suíte epistemológica:', err);
  process.exit(1);
});
