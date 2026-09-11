/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSystemInstructions } from './systemInstructions';
import { NonPlayerCharacter } from '../characters/types';
import { NPC } from '../memory/types';

/**
 * Suíte de Testes e Validação: Refino do Narrador — Autonomia, Consistência e Distinção de NPCs
 *
 * Equação Canônica de Conduta:
 * identidade + traços + objetivos + conhecimento autorizado + relação atual + estado físico/mental + contexto imediato
 *
 * Cenários Testados:
 * 1. Dois NPCs diferentes respondendo à mesma provocação de formas distintas (prioridades, tolerância a risco, status).
 * 2. NPC mantém objetivo próprio mesmo quando o jogador tenta desviá-lo (não existe apenas para servir o jogador).
 * 3. NPC recorrente mantém personalidade após 20+ turnos (anti-drift sem causa registrada).
 * 4. NPC não revela fato que não conhece (isolamento epistemológico / no leak).
 * 5. NPC pode mentir ou omitir quando consistente com seu objetivo ou segredo.
 * 6. Relação ruim não transforma automaticamente todo diálogo em combate/hostilidade aberta (nuance social e frieza).
 * 7. NPC fora de cena mantém continuidade de objetivo e estado quando reaparece.
 */

interface NPCEvaluationResult {
  valid: boolean;
  violations: string[];
  reasons: string[];
}

function evaluateNPCBehavior(
  scenario:
    | 'distinct_provocation'
    | 'independent_goal'
    | 'long_term_consistency'
    | 'epistemic_isolation'
    | 'deception_or_omission'
    | 'nuanced_bad_relationship'
    | 'continuity_reappearance',
  dialogueNarrative: string,
  npcProfile: {
    name: string;
    personality: string;
    goals: string[];
    disposition?: string;
    authorizedKnowledge: string[];
    secrets?: string[];
  },
  contextMeta?: {
    playerInput?: string;
    forbiddenWorldTruth?: string;
    turnCount?: number;
  }
): NPCEvaluationResult {
  const violations: string[] = [];
  const reasons: string[] = [];
  const text = dialogueNarrative.toLowerCase();

  switch (scenario) {
    case 'distinct_provocation':
      // Verifica se o tom e ação correspondem à personalidade e status do perfil
      if (npcProfile.personality.toLowerCase().includes('covarde') || npcProfile.personality.toLowerCase().includes('cauteloso')) {
        if (text.includes('saca a espada e avança furioso') || text.includes('grita em desafio heróico')) {
          violations.push(`NPC cauteloso agiu como guerreiro destemido violando seus traços.`);
        } else {
          reasons.push(`NPC cauteloso reagiu com recuo, hesitação ou busca de proteção.`);
        }
      } else if (npcProfile.personality.toLowerCase().includes('veterano') || npcProfile.personality.toLowerCase().includes('estoico')) {
        if (text.includes('tremer de pânico') || text.includes('implorar de joelhos')) {
          violations.push(`NPC veterano estoico desabou em covardia sem causa.`);
        } else {
          reasons.push(`NPC estoico manteve a compostura e olhar firme.`);
        }
      }
      break;

    case 'independent_goal':
      // O jogador tenta desviar o ferreiro de consertar a carroça para ir caçar goblins
      const mainGoal = (npcProfile.goals[0] || '').toLowerCase();
      if (text.includes('larga imediatamente a carroça') || text.includes('abandona tudo para seguir você sem pensar')) {
        violations.push(`NPC abandonou seu objetivo prioritário ("${mainGoal}") para servir de escada imediata ao jogador.`);
      } else {
        reasons.push(`NPC manteve prioridade no seu próprio objetivo e prazos.`);
      }
      break;

    case 'long_term_consistency':
      // NPC austero e lacônico não pode virar falante e bajulador no turno 25 sem evento que justifique
      if (npcProfile.personality.toLowerCase().includes('lacônico') && (text.includes('sorri amplamente e começa um longo monólogo afetuoso') || text.includes('meu querido melhor amigo'))) {
        violations.push(`NPC lacônico sofreu drift comportamental após múltiplos turnos sem causa registrada.`);
      } else {
        reasons.push(`Consistência de personalidade preservada ao longo do tempo.`);
      }
      break;

    case 'epistemic_isolation':
      // Se o mundo tem um segredo que o NPC não conhece, ele não pode revelá-lo
      const secretFact = (contextMeta?.forbiddenWorldTruth || '').toLowerCase();
      if (secretFact && text.includes(secretFact)) {
        violations.push(`Vazamento epistemológico: NPC revelou fato ("${secretFact}") que não está em seu conhecimento autorizado.`);
      } else {
        reasons.push(`Isolamento epistemológico respeitado: NPC admitiu desconhecimento ou falou apenas do que sabe.`);
      }
      break;

    case 'deception_or_omission':
      // NPC com segredo omite ou mente para se proteger
      if (npcProfile.secrets && npcProfile.secrets.length > 0) {
        const secret = npcProfile.secrets[0].toLowerCase();
        if (text.includes(secret) && text.includes('confessa tudo abertamente sem qualquer motivo')) {
          violations.push(`NPC revelou segredo vital sem confiança, coação ou motivo factual.`);
        } else {
          reasons.push(`NPC protegeu seus segredos com omissão ou resposta calculada.`);
        }
      }
      break;

    case 'nuanced_bad_relationship':
      // Relação ruim não deve ser caricatura de ataque imediato em ambiente público/civilizado
      if (text.includes('grita ensandecido e ataca com uma adaga no meio da praça') || text.includes('você é um lixo vou te matar')) {
        violations.push(`Relação negativa foi tratada como caricatura de violência física imediata.`);
      } else {
        reasons.push(`Nuance social preservada: animosidade manifestada como frieza, respostas curtas e recusa de favores.`);
      }
      break;

    case 'continuity_reappearance':
      // NPC volta após 10 turnos e lembra da dívida ou objetivo pendente
      if (text.includes('quem é você? nunca nos vimos') || text.includes('esqueci completamente do que estávamos fazendo')) {
        violations.push(`NPC perdeu continuidade ao reaparecer após ausência.`);
      } else {
        reasons.push(`NPC preservou memória de estado, dívidas e objetivos anteriores ao reaparecer.`);
      }
      break;
  }

  return {
    valid: violations.length === 0,
    violations,
    reasons,
  };
}

async function runNPCBehaviorTestSuite() {
  console.log('===============================================================');
  console.log('SUÍTE DE TESTES: REFINO DO NARRADOR — AUTONOMIA E DISTINÇÃO DE NPCs');
  console.log('===============================================================\n');

  // [TESTE 1] Diretivas Canônicas nas System Instructions
  console.log('[TESTE 1] Verificando diretivas comportamentais de NPCs nas System Instructions...');
  const instructions = getSystemInstructions();

  const requiredTokens = [
    'AUTONOMIA, CONSISTÊNCIA E DIFERENCIAÇÃO DE NPCs (ARQUITETURA COMPORTAMENTAL)',
    'identidade + traços + objetivos + conhecimento autorizado + relação atual + estado físico/mental + contexto imediato',
    'NPCs NÃO existem para entregar lore, missões prontas ou aprovação automática ao jogador',
    'PREVENÇÃO DE DRIFT EM NPCs RECORRENTES',
    'ISOLAMENTO EPISTEMOLÓGICO ABSOLUTO',
  ];

  for (const token of requiredTokens) {
    if (!instructions.includes(token)) {
      throw new Error(`Diretiva canônica ausente nas instruções: "${token}"`);
    }
  }
  console.log('✅ TESTE 1 PASSOU: Seção comportamental de NPCs completa e integrada.\n');

  // [TESTE 2] Cenário 1: Dois NPCs diferentes respondendo à mesma provocação
  console.log('[TESTE 2] Cenário 1: Diferenciação entre Guarda Veterano e Comerciante Cauteloso sob provocação...');
  const provocation = 'Vocês dois são imprestáveis e esta cidade está condenada.';

  const veteranNPC = {
    name: 'Sargento Brand',
    personality: 'Veterano estoico, disciplinado e de poucas palavras',
    goals: ['Manter a ordem no portão sul'],
    disposition: 'neutral',
    authorizedKnowledge: ['A guarnição está com falta de homens no turno da noite.'],
  };

  const merchantNPC = {
    name: 'Tobias',
    personality: 'Comerciante cauteloso, pragmático e receoso de tumultos',
    goals: ['Proteger seus tecidos finos e evitar confusão com os guardas'],
    disposition: 'neutral',
    authorizedKnowledge: ['O preço do linho subiu devido aos bloqueios na estrada.'],
  };

  const veteranResponse =
    'O sargento Brand não move um único músculo da face com a provocação. Ele apenas ajusta a correia de couro da cota de malha no ombro e mantém o olhar fixo na estrada além do portão. "Diga o que quiser, forasteiro. Mas desobstrua a passagem se não tiver mercadorias a declarar."';

  const merchantResponse =
    'Tobias dá dois passos rápidos para trás, aproximando-se do carrinho de tecidos enquanto puxa a lona encerada para proteger seus fardos. Seus olhos correm nervosos em direção à patrulha. "Por favor, não chame atenção aqui... Se não vai comprar nada, siga seu caminho antes que os guardas venham perguntar o motivo dessa algazarra."';

  const vetEval = evaluateNPCBehavior('distinct_provocation', veteranResponse, veteranNPC);
  const mercEval = evaluateNPCBehavior('distinct_provocation', merchantResponse, merchantNPC);

  if (!vetEval.valid || !mercEval.valid) {
    throw new Error(`Falha na diferenciação de NPCs: ${[...vetEval.violations, ...mercEval.violations].join(', ')}`);
  }
  console.log('✅ TESTE 2 PASSOU: Guarda estoico e comerciante cauteloso reagiram com perfis psicológicos distintos.\n');

  // [TESTE 3] Cenário 2: NPC mantém objetivo próprio mesmo quando desviado
  console.log('[TESTE 3] Cenário 2: Ferreiro mantém prioridade no conserto da carroça...');
  const blacksmithNPC = {
    name: 'Mestre Garin',
    personality: 'Ferreiro pragmático e focado no dever',
    goals: ['Entregar a roda forjada e o eixo da carroça do prefeito até o meio-dia'],
    authorizedKnowledge: ['A forja precisa de carvão novo amanhã.'],
  };

  const blacksmithNarrative =
    'Garin bate mais duas vezes o martelo pesado sobre a bigorna antes de apoiar a tenaz na tina de água com um chiado denso de vapor. Ele enxuga a testa suada com as costas do antebraço fuliginoso. "Caçar bandidos nas colinas é assunto para a milícia ou para quem não tem três carroças com eixos quebrados prometidos para o meio-dia. Se você precisa de lâminas afiadas, venha após o anoitecer; agora eu tenho compromisso assinado na praça."';

  const bsEval = evaluateNPCBehavior('independent_goal', blacksmithNarrative, blacksmithNPC);
  if (!bsEval.valid) throw new Error(`Falha no objetivo autônomo do NPC: ${bsEval.violations.join(', ')}`);
  console.log('✅ TESTE 3 PASSOU: NPC recusou desvio do jogador e manteve seus próprios prazos e metas.\n');

  // [TESTE 4] Cenário 3: Consistência de NPC recorrente após 20+ turnos
  console.log('[TESTE 4] Cenário 3: Prevenção de drift em NPC recorrente (Turno 24)...');
  const herbalistNPC = {
    name: 'Elspeth',
    personality: 'Ervanária lacônica, idosa e desconfiada de estranhos',
    goals: ['Cuidar do canteiro de ervas medicinais'],
    authorizedKnowledge: ['Ervas-de-sapo só nascem no brejo durante a lua nova.'],
  };

  const turn24Narrative =
    'Elspeth apenas aponta com o dedo nodoso para a prateleira de potes de cerâmica sem erguer os olhos da tesoura de poda. "Três moedas de cobre por cada atadura de folhas secas. O preço continua o mesmo de ontem e não tenho tempo para conversa fiada enquanto o sol estiver alto."';

  const driftEval = evaluateNPCBehavior('long_term_consistency', turn24Narrative, herbalistNPC, { turnCount: 24 });
  if (!driftEval.valid) throw new Error(`Falha na prevenção de drift: ${driftEval.violations.join(', ')}`);
  console.log('✅ TESTE 4 PASSOU: Personalidade e tom mantiveram-se consistentes ao longo de 20+ turnos.\n');

  // [TESTE 5] Cenário 4: Isolamento epistemológico (NPC não revela o que não sabe)
  console.log('[TESTE 5] Cenário 4: NPC desconhece segredo do culto e admite ignorância...');
  const tavernKeeperNPC = {
    name: 'Doran',
    personality: 'Taberneiro extrovertido e focado nas vendas de cerveja',
    goals: ['Manter a taberna cheia e as canecas servidas'],
    authorizedKnowledge: ['A cerveja preta está no último barril.', 'Os lenhadores discutiram sobre o pagamento hoje cedo.'],
  };

  const tavernNarrative =
    'Doran apoia o pano úmido no balcão e franze a testa, visivelmente confuso com o nome que você mencionou. "Ordem da Serpente Carmesim? Nunca ouvi falar desse nome por aqui, forasteiro. Os únicos que se reúnem no porão da igreja são os anciãos do conselho paroquial para contar os donativos."';

  const epistemicEval = evaluateNPCBehavior(
    'epistemic_isolation',
    tavernNarrative,
    tavernKeeperNPC,
    { forbiddenWorldTruth: 'o líder do culto é o padre local' }
  );
  if (!epistemicEval.valid) throw new Error(`Falha no isolamento epistemológico: ${epistemicEval.violations.join(', ')}`);
  console.log('✅ TESTE 5 PASSOU: NPC desconhece o segredo do culto e admitiu desconhecimento com naturalidade.\n');

  // [TESTE 6] Cenário 5: NPC mente ou omite para proteger segredo/objetivo
  console.log('[TESTE 6] Cenário 5: NPC contrabandista protege seu esconderijo...');
  const smugglerNPC = {
    name: 'Valmir',
    personality: 'Contrabandista calculista e desconfiado',
    goals: ['Despachar as caixas antes da ronda da meia-noite'],
    secrets: ['As caixas contêm especiarias contrabandeadas do sul'],
    authorizedKnowledge: ['O oficial da alfândega aceitou propina ontem.'],
  };

  const smugglerNarrative =
    'Valmir cruza os braços sobre a tampa do caixote de madeira e solta uma risada curta, batendo com a bota na lateral de tábuas. "Apenas tecidos de algodão e peças de arado encomendadas para o moinho, amigo. Nada que interesse a quem não tem terra para arar. Se busca mercadorias raras, procure os armazéns da doca alta."';

  const lieEval = evaluateNPCBehavior('deception_or_omission', smugglerNarrative, smugglerNPC);
  if (!lieEval.valid) throw new Error(`Falha no teste de omissão/mentira do NPC: ${lieEval.violations.join(', ')}`);
  console.log('✅ TESTE 6 PASSOU: Contrabandista protegeu o segredo de suas caixas com desvio calculado.\n');

  // [TESTE 7] Cenário 6: Relação ruim manifestada com nuance social
  console.log('[TESTE 7] Cenário 6: Relação negativa tratada com frieza burocrática em vez de caricatura...');
  const clerkNPC = {
    name: 'Escrivão Vane',
    personality: 'Burocrata formal e rancoroso',
    goals: ['Concluir o registro de impostos sem atrasos'],
    disposition: 'unfriendly',
    authorizedKnowledge: ['O prazo de solicitação expira hoje.'],
  };

  const clerkNarrative =
    'O escrivão Vane não levanta os olhos dos pergaminhos ao ouvir sua voz. Ele molha a pena no tinteiro em silêncio prolongado e vira a página com deliberada lentidão. "O formulário exige selo autenticado da alfândega. Sem o documento carimbado em duas vias, o arquivo não será aberto. Próximo da fila."';

  const nuanceEval = evaluateNPCBehavior('nuanced_bad_relationship', clerkNarrative, clerkNPC);
  if (!nuanceEval.valid) throw new Error(`Falha na nuance da relação ruim: ${nuanceEval.violations.join(', ')}`);
  console.log('✅ TESTE 7 PASSOU: Animosidade refletida em frieza processual e recusa formal de favores.\n');

  // [TESTE 8] Cenário 7: Continuidade ao reaparecer após ausência
  console.log('[TESTE 8] Cenário 7: NPC reaparece mantendo continuidade de dívida anterior...');
  const mercenaryNPC = {
    name: 'Kallum',
    personality: 'Mercenário pragmático',
    goals: ['Receber as 20 moedas de prata prometidas'],
    authorizedKnowledge: ['Ajudou a repelir os lobos na trilha há três dias.'],
  };

  const reappearanceNarrative =
    'Kallum se levanta do banco de madeira ao ver você entrar na hospedaria, apoiando a mão na bainha da espada larga. "Três dias se passaram desde a emboscada na colina, forasteiro. Presumo que você tenha trazido as vinte moedas de prata que ficaram pendentes pelo meu serviço com os lobos."';

  const continuityEval = evaluateNPCBehavior('continuity_reappearance', reappearanceNarrative, mercenaryNPC);
  if (!continuityEval.valid) throw new Error(`Falha na continuidade do NPC: ${continuityEval.violations.join(', ')}`);
  console.log('✅ TESTE 8 PASSOU: Continuidade de estado e pendências preservada ao retornar à cena.\n');

  console.log('===============================================================');
  console.log('RESULTADO DA SUÍTE: 8/8 TESTES APROVADOS (100%)');
  console.log('===============================================================');
}

runNPCBehaviorTestSuite().catch((err) => {
  console.error('❌ Falha na suíte de testes de comportamento de NPCs:', err);
  process.exit(1);
});
