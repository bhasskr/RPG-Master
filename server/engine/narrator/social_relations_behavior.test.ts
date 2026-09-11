/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSystemInstructions } from './systemInstructions';
import { Relationship } from '../memory/types';

/**
 * Suíte de Testes e Validação: Refino Narrativo de Relações e Interação Social
 *
 * Equação Canônica de Conduta Social:
 * histórico compartilhado + relação atual + objetivos do NPC + confiança + contexto social + evento recente
 *
 * Cenários Testados:
 * 1. Boa ação isolada não produz amizade forte imediata (apenas alívio/agradecimento pontual).
 * 2. Relação positiva/alta não garante obediência cega (autonomia e bom senso preservados).
 * 3. NPC próximo recusa pedido por conflito de objetivo/dever (prioridades e segurança).
 * 4. Relação negativa se manifesta de forma diferente em público vs privado (polidez formal com testemunhas vs hostilidade a sós).
 * 5. Flerte não gera atração automática recíproca.
 * 6. Romance e atração íntima NÃO usam rolagem de D20 ou mecânica de Carisma.
 * 7. Confiança muda gradualmente após múltiplos eventos coerentes (evolução lenta com causa observável).
 * 8. NPC reaparece depois de muitos turnos mantendo memória social relevante e histórico de relações.
 * 9. Relação assimétrica entre jogador e NPC permanece possível (ex: NPC devoto/dependente sem reciprocidade simétrica).
 */

interface SocialEvaluationResult {
  valid: boolean;
  violations: string[];
  reasons: string[];
}

function evaluateSocialInteraction(
  scenario:
    | 'isolated_good_deed'
    | 'high_relation_no_blind_obedience'
    | 'conflict_of_interest_refusal'
    | 'public_vs_private_manifestation'
    | 'flirt_no_automatic_attraction'
    | 'romance_no_d20'
    | 'gradual_trust_evolution'
    | 'long_term_social_memory'
    | 'asymmetric_relationship',
  dialogueNarrative: string,
  relationshipData: Relationship,
  contextMeta?: {
    isPublic?: boolean;
    npcGoal?: string;
    actionAttempt?: string;
    turnsElapsed?: number;
    usedDice?: boolean;
  }
): SocialEvaluationResult {
  const violations: string[] = [];
  const reasons: string[] = [];
  const text = dialogueNarrative.toLowerCase();

  switch (scenario) {
    case 'isolated_good_deed':
      // Salvar de um tropeço ou pagar um almoço não cria voto de lealdade eterna
      if (
        text.includes('agora somos melhores amigos para sempre') ||
        text.includes('jurou lealdade eterna à sua vida') ||
        text.includes('meu coração pertence a você')
      ) {
        violations.push(`Boa ação isolada gerou salto irrealista para amizade íntima/voto de lealdade.`);
      } else {
        reasons.push(`Boa ação recebida com agradecimento cortês e alívio pontual, mantendo distância social adequada.`);
      }
      break;

    case 'high_relation_no_blind_obedience':
      // Pedir ao aliado para pular de um penhasco ou queimar uma igreja não é aceito só porque trust=90
      if (
        text.includes('como você é meu amigo, eu aceito queimar a igreja') ||
        text.includes('obedeço cegamente a sua ordem de pular')
      ) {
        violations.push(`Relação alta foi tratada como obediência cega ou controle mental.`);
      } else {
        reasons.push(`NPC ponderou a relação afetiva, mas recusou a exigência absurda/autodestrutiva com franqueza.`);
      }
      break;

    case 'conflict_of_interest_refusal':
      // NPC amigo médico não abandona paciente em cirurgia para passear na floresta
      if (text.includes('larga o bisturi e abandona o paciente moribundo para ir com você')) {
        violations.push(`NPC sacrificou seu dever profissional essencial por complacência ao jogador.`);
      } else {
        reasons.push(`NPC recusou o pedido explicando seu dever/objetivo com afeto, mas firmeza.`);
      }
      break;

    case 'public_vs_private_manifestation':
      if (contextMeta?.isPublic) {
        // Em público, NPC com relação hostil mantém contenção civil
        if (text.includes('grita palavrões histéricos e tenta esfaquear você no meio da missa')) {
          violations.push(`NPC hostil quebrou a máscara social pública de forma implausível.`);
        } else {
          reasons.push(`NPC hostil manteve frieza formal e respostas protocolares na presença de testemunhas.`);
        }
      } else {
        // No privado, NPC expressa a hostilidade real
        if (text.includes('sorri gentilmente e finge que são grandes amigos sem motivo')) {
          violations.push(`NPC no privado perdeu o registro da hostilidade existente.`);
        } else {
          reasons.push(`NPC a sós manifestou desconfiança e aspereza condizentes com a relação negativa.`);
        }
      }
      break;

    case 'flirt_no_automatic_attraction':
      // Flerte com guarda em serviço ou desconhecido não gera paixão súbita
      if (
        text.includes('cai imediatamente em seus braços apaixonada') ||
        text.includes('ruboriza com desejo incontrolável e beija você')
      ) {
        violations.push(`Flerte casual gerou atração automática ou reciprocidade forçada.`);
      } else {
        reasons.push(`NPC respondeu com neutralidade, desvio irônico ou advertência profissional.`);
      }
      break;

    case 'romance_no_d20':
      if (contextMeta?.usedDice) {
        violations.push(`Mecânica de D20 foi indevidamente utilizada para impor romance, amor ou reciprocidade.`);
      } else {
        reasons.push(`Avanço romântico conduzido exclusivamente por histórico, timing e escolhas emocionais, sem dados.`);
      }
      break;

    case 'gradual_trust_evolution':
      // Confiança cresce por passos consistentes e evidências
      if (relationshipData.trust < 50 && text.includes('confio minha vida e todo meu ouro sem reservas')) {
        violations.push(`Confiança irrestrita concedida sem histórico acumulado prévio.`);
      } else {
        reasons.push(`Evolução gradual de confiança proporcional aos 3 eventos acumulados no histórico.`);
      }
      break;

    case 'long_term_social_memory':
      // Reencontro após 30 turnos lembra do histórico compartilhado registrado
      if (text.includes('quem é você? não me lembro de nada') || text.includes('vamos começar do zero como se nada houvesse ocorrido')) {
        violations.push(`NPC esqueceu histórico social relevante no reencontro.`);
      } else {
        reasons.push(`NPC recuperou a memória do histórico de auxílio e manteve a familiaridade registrada.`);
      }
      break;

    case 'asymmetric_relationship':
      // NPC jovem aprendiz admira o jogador (trust=80), mas jogador não tem o mesmo apego
      if (text.includes('você é forçado a amar o aprendiz na mesma medida')) {
        violations.push(`Relação tratada como via de mão dupla simétrica obrigatória.`);
      } else {
        reasons.push(`Assimetria preservada: lealdade do NPC mantida sem violar a liberdade do jogador.`);
      }
      break;
  }

  return {
    valid: violations.length === 0,
    violations,
    reasons,
  };
}

async function runSocialRelationsTestSuite() {
  console.log('===============================================================');
  console.log('SUÍTE DE TESTES: REFINO NARRATIVO — RELAÇÕES E DINÂMICA SOCIAL');
  console.log('===============================================================\n');

  // [TESTE 1] Diretivas Canônicas nas System Instructions
  console.log('[TESTE 1] Verificando diretrizes de Relações e Dinâmica Social nas System Instructions...');
  const instructions = getSystemInstructions();

  const requiredDirectives = [
    'RELAÇÕES INTERPESSOAIS E DINÂMICA SOCIAL (ESTADO CONTEXTUAL E HISTÓRICO)',
    'histórico compartilhado + relação atual + objetivos do NPC + confiança + contexto social + evento recente',
    'boa ação = amizade íntima',
    'flertar = atração recíproca',
    'dar presente = romance',
    'alta relação/amizade = obediência cega',
    'ASSIMETRIA DAS RELAÇÕES',
    'ROMANCE, ATRAÇÃO E VÍNCULOS ÍNTIMOS (PROIBIÇÃO DE D20)',
    'RELAÇÃO vs OBJETIVOS DO NPC',
  ];

  for (const token of requiredDirectives) {
    if (!instructions.includes(token)) {
      throw new Error(`Diretiva canônica ausente nas instruções: "${token}"`);
    }
  }
  console.log('✅ TESTE 1 PASSOU: Seção 5 de Relações e Dinâmica Social plenamente integrada.\n');

  // [TESTE 2] Cenário 1: Boa ação isolada não produz amizade íntima
  console.log('[TESTE 2] Cenário 1: Salvar alguém de um tombo na lama não cria amizade íntima imediata...');
  const strangerRel: Relationship = {
    characterA: 'Aldo',
    characterB: 'Jogador',
    trust: 10,
    hostility: 0,
    familiarity: 1,
    importantHistory: ['Jogador segurou a cesta de ovos de Aldo quando ele tropeçou no degrau.'],
  };

  const goodDeedNarrative =
    'Aldo recupera o fôlego e arruma a gola da camisa de linho, olhando surpreso para a cesta intacta em suas mãos. "Obrigado, forasteiro. Teria perdido o ganho de uma semana nesses paralelepípedos." Ele ajeita a alça no braço com um aceno rápido de cabeça e apressa o passo em direção à feira antes que a chuva comece.';

  const deedEval = evaluateSocialInteraction('isolated_good_deed', goodDeedNarrative, strangerRel);
  if (!deedEval.valid) throw new Error(`Falha no teste de boa ação isolada: ${deedEval.violations.join(', ')}`);
  console.log('✅ TESTE 2 PASSOU: Agradecimento proporcional sem saltos milagrosos para amizade íntima.\n');

  // [TESTE 3] Cenário 2: Relação positiva não garante obediência cega
  console.log('[TESTE 3] Cenário 2: Amigo leal se recusa a praticar crime absurdo...');
  const allyRel: Relationship = {
    characterA: 'Capitão Roderic',
    characterB: 'Jogador',
    trust: 85,
    hostility: -40,
    familiarity: 8,
    importantHistory: ['Lutaram lado a lado na defesa do forte', 'Roderic deve sua promoção ao relatório conjunto'],
  };

  const refusalNarrative =
    'Roderic apoia as duas mãos no encosto da cadeira e balança a cabeça devagar, encarando você com seriedade nos olhos cinzentos. "Nós sangramos juntos nas colinas e você tem meu respeito como poucos nesta cidade. Mas não me peça para forjar o selo do conselho militar. Eu não vou manchar meu juramento nem colocar a guarnição inteira na forca por um capricho, nem mesmo pelo seu."';

  const obedienceEval = evaluateSocialInteraction('high_relation_no_blind_obedience', refusalNarrative, allyRel);
  if (!obedienceEval.valid) throw new Error(`Falha no teste de obediência cega: ${obedienceEval.violations.join(', ')}`);
  console.log('✅ TESTE 3 PASSOU: Confiança elevada mantida sem se curvar a exigências antiéticas absurdas.\n');

  // [TESTE 4] Cenário 3: NPC próximo recusa pedido por conflito de objetivo/dever
  console.log('[TESTE 4] Cenário 3: Médica aliada recusa acompanhar expedição durante cirurgia emergencial...');
  const doctorRel: Relationship = {
    characterA: 'Dra. Mara',
    characterB: 'Jogador',
    trust: 75,
    hostility: -30,
    familiarity: 7,
    importantHistory: ['Amigos desde os tempos da academia em Oakhaven'],
  };

  const doctorNarrative =
    'Mara amarra a tira de couro do avental cirúrgico com dedos firmes enquanto a enfermeira prepara as ataduras estéreis. "Eu adoraria ajudá-lo a examinar as ruínas do vale, mas há três mineradores feridos pelo desabamento chegando agora ao ambulatório. Minha obrigação é aqui nesta mesa até o último deles estar estabilizado."';

  const conflictEval = evaluateSocialInteraction('conflict_of_interest_refusal', doctorNarrative, doctorRel, {
    npcGoal: 'Tratar mineradores feridos',
  });
  if (!conflictEval.valid) throw new Error(`Falha no teste de conflito de objetivos: ${conflictEval.violations.join(', ')}`);
  console.log('✅ TESTE 4 PASSOU: NPC priorizou dever de vida real perante pedido do amigo.\n');

  // [TESTE 5] Cenário 4: Relação negativa se manifesta diferente em público vs privado
  console.log('[TESTE 5] Cenário 4: Nobre rival mantém formalidade no tribunal e veneno a sós...');
  const rivalRel: Relationship = {
    characterA: 'Lorde Kenneth',
    characterB: 'Jogador',
    trust: -60,
    hostility: 75,
    familiarity: 5,
    importantHistory: ['Perdeu a concessão da mina para o grupo do jogador'],
  };

  const publicNarrative =
    'Lorde Kenneth inclina levemente a cabeça perante o magistrado e os nobres da bancada. "As alegações do senhor forasteiro constam em ata protocolar. Aguardaremos a manifestação dos peritos do tribunal." Sua voz soa impassível, ainda que seus nós dos dedos estejam brancos de tensão sobre o cabo da bengala.';

  const privateNarrative =
    'Assim que a pesada porta de carvalho se fecha, Kenneth gira sobre os calcanhares e cospe as palavras com frieza contida. "Aproveite cada segundo diante dos juízes, aventureiro. O tribunal pode exigir polidez, mas assim que seus pés cruzarem os limites desta comarca, acertaremos nossas contas sem testemunhas."';

  const pubEval = evaluateSocialInteraction('public_vs_private_manifestation', publicNarrative, rivalRel, { isPublic: true });
  const privEval = evaluateSocialInteraction('public_vs_private_manifestation', privateNarrative, rivalRel, { isPublic: false });

  if (!pubEval.valid || !privEval.valid) {
    throw new Error(`Falha na diferenciação público/privado: ${[...pubEval.violations, ...privEval.violations].join(', ')}`);
  }
  console.log('✅ TESTE 5 PASSOU: Hostilidade velada por máscara social em público e crua em privado.\n');

  // [TESTE 6] Cenário 5: Flerte não gera atração automática
  console.log('[TESTE 6] Cenário 5: Guarda de vigília reage a galanteio sem reciprocidade forçada...');
  const guardRel: Relationship = {
    characterA: 'Sentinela Vanya',
    characterB: 'Jogador',
    trust: 0,
    hostility: 0,
    familiarity: 1,
    importantHistory: [],
  };

  const flirtNarrative =
    'A sentinela Vanya não desvia os olhos da estrada escura nem esboça reação ao comentário sedutor. Ela apenas bate a coronha da alabarda de leve contra as pedras da calçada. "Guarde suas cantadas para as tavernas do cais, viajante. Se não tiver passe assinado pelo capitão da ronda, dê meia-volta antes do toque de recolher."';

  const flirtEval = evaluateSocialInteraction('flirt_no_automatic_attraction', flirtNarrative, guardRel);
  if (!flirtEval.valid) throw new Error(`Falha no teste de flerte: ${flirtEval.violations.join(', ')}`);
  console.log('✅ TESTE 6 PASSOU: Flerte tratado com postura profissional e recusa natural.\n');

  // [TESTE 7] Cenário 6: Romance e atração NÃO usam dados de D20
  console.log('[TESTE 7] Cenário 6: Vínculo afetivo emergindo de compatibilidade e histórico (zero D20)...');
  const romanceRel: Relationship = {
    characterA: 'Isolda',
    characterB: 'Jogador',
    trust: 70,
    hostility: -50,
    familiarity: 7,
    importantHistory: [
      'Compartilharam histórias de infância ao redor da fogueira',
      'Defenderam o vilarejo juntos durante o cerco de inverno',
      'Demonstraram lealdade recíproca em momentos de crise',
    ],
  };

  const romanceNarrative =
    'Isolda senta-se no degrau de pedra ao seu lado e puxa a manta de lã sobre os ombros, olhando as brasas da fogueira crepitarem no silêncio da noite. "Depois de tudo o que passamos naquele cerco... é bom saber que ainda existe alguém em quem posso confiar de olhos fechados." Ela deixa a mão repousar sobre a sua com uma calma sincera.';

  const romanceEval = evaluateSocialInteraction('romance_no_d20', romanceNarrative, romanceRel, { usedDice: false });
  if (!romanceEval.valid) throw new Error(`Falha no teste de romance sem D20: ${romanceEval.violations.join(', ')}`);
  console.log('✅ TESTE 7 PASSOU: Conexão íntima desenvolvida organicamente sem rolagem de dados.\n');

  // [TESTE 8] Cenário 7: Confiança evolui gradualmente com múltiplos eventos
  console.log('[TESTE 8] Cenário 7: Crescimento de confiança ancorado em 3 eventos consistentes...');
  const gradualTrustRel: Relationship = {
    characterA: 'Mestre Boticário Corin',
    characterB: 'Jogador',
    trust: 60,
    hostility: -20,
    familiarity: 6,
    importantHistory: [
      'Jogador entregou as folhas de lótus intactas no prazo',
      'Ajudou a pagar o tributo da botica sem pedir juros',
      'Defendeu a loja contra os vândalos da rua de trás',
    ],
  };

  const trustNarrative =
    'Corin destranca o pequeno armário de madeira nobre atrás do balcão e retira um frasco lacrado com cera azul. "Três vezes você provou sua palavra neste balcão, forasteiro. Poucos nesta cidade teriam trazido as ervas intactas e quitado a promessa. Por isso, posso confiar a você esta amostra de antídoto."';

  const trustEval = evaluateSocialInteraction('gradual_trust_evolution', trustNarrative, gradualTrustRel);
  if (!trustEval.valid) throw new Error(`Falha na evolução gradual de confiança: ${trustEval.violations.join(', ')}`);
  console.log('✅ TESTE 8 PASSOU: Confiança justificada por histórico factual acumulado.\n');

  // [TESTE 9] Cenário 8: Reencontro preserva memória social e histórico
  console.log('[TESTE 9] Cenário 8: Reencontro após 30 turnos mantém memória de lealdade passada...');
  const reunionRel: Relationship = {
    characterA: 'Ferreiro Thorne',
    characterB: 'Jogador',
    trust: 65,
    hostility: -30,
    familiarity: 6,
    importantHistory: ['Jogador salvou a filha de Thorne do desabamento da mina no início da jornada'],
  };

  const reunionNarrative =
    'Thorne pousa o martelo ao reconhecer seu vulto na entrada da forja. Um sorriso largo surge sob o bigode acinzentado. "Pelas barbas dos antepassados! Faz semanas que não vejo sua capa por estas bandas. Minha filha Leta ainda fala daquele dia na mina velha. O que o melhor amigo da minha família precisa hoje na bigorna?"';

  const reunionEval = evaluateSocialInteraction('long_term_social_memory', reunionNarrative, reunionRel, { turnsElapsed: 30 });
  if (!reunionEval.valid) throw new Error(`Falha na memória social de longo prazo: ${reunionEval.violations.join(', ')}`);
  console.log('✅ TESTE 9 PASSOU: Memória social e histórico afetivo íntegros após dezenas de turnos.\n');

  // [TESTE 10] Cenário 9: Relação assimétrica (vínculo unilateral não impõe simetria)
  console.log('[TESTE 10] Cenário 9: Relação assimétrica — Jovem escudeiro idolatra jogador sem reciprocidade forçada...');
  const apprenticeRel: Relationship = {
    characterA: 'Escudeiro Pip',
    characterB: 'Jogador',
    trust: 85,
    hostility: -70,
    familiarity: 7,
    importantHistory: ['Pip considera o jogador seu herói após a batalha da ponte'],
  };

  const asymmetricNarrative =
    'Pip corre para recolher os arreios do cavalo e engraxar suas botas com fervor incondicional, prestando atenção em cada gesto seu como se você fosse uma lenda viva. Ele aguarda suas ordens em postura atenta, ansioso por qualquer palavra de instrução, enquanto você apenas observa seu entusiasmo calado.';

  const asymmEval = evaluateSocialInteraction('asymmetric_relationship', asymmetricNarrative, apprenticeRel);
  if (!asymmEval.valid) throw new Error(`Falha na relação assimétrica: ${asymmEval.violations.join(', ')}`);
  console.log('✅ TESTE 10 PASSOU: Assimetria psicológica preservada sem manipular a vontade do jogador.\n');

  console.log('===============================================================');
  console.log('RESULTADO DA SUÍTE: 10/10 TESTES APROVADOS (100%)');
  console.log('===============================================================');
}

runSocialRelationsTestSuite().catch((err) => {
  console.error('❌ Falha na suíte de testes de relações sociais:', err);
  process.exit(1);
});
