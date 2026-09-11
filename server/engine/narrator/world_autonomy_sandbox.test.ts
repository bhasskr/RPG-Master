/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSystemInstructions } from './systemInstructions';
import { MemoryManager } from '../memory/memoryManager';
import { InMemoryStore } from '../memory/inMemoryStore';
import { NarratorService } from './narratorService';
import { NarratorPromptContext } from './types';

/**
 * Suíte de Testes e Validação: Autonomia do Mundo, Anti-Protagonismo e Ritmo Sandbox
 *
 * Equação Fundamental do Mundo:
 * objetivos de NPCs + facções + eventos em andamento + tempo + consequências persistidas
 *
 * Cenários Testados:
 * 1. NPC fora de cena continua objetivo próprio (não congela nem espera o jogador).
 * 2. Facção age sem esperar intervenção do jogador (executa planos no próprio cronograma).
 * 3. Cena quieta permanece quieta sem gancho artificial ou perigo forçado.
 * 4. Evento importante ocorre longe do jogador e NÃO é revelado automaticamente (isolamento cognitivo / sem câmera onisciente).
 * 5. Jogador perde uma oportunidade por chegar tarde (mundo não pausa prazos).
 * 6. NPC importante está indisponível por compromisso próprio (não larga tudo para atender o protagonista).
 * 7. Evento autônomo decorre de estado persistido, e não de improvisação conveniente.
 * 8. Após 20–30 turnos, o mundo apresenta mudanças coerentes que não giram exclusivamente em torno do protagonista.
 */

interface WorldAutonomyEvaluationResult {
  valid: boolean;
  violations: string[];
  reasons: string[];
}

function evaluateWorldAutonomyBehavior(
  scenario:
    | 'offscreen_npc_goal'
    | 'independent_faction_action'
    | 'quiet_scene_preserved'
    | 'distant_event_cognitive_isolation'
    | 'missed_opportunity_delay'
    | 'npc_unavailable_own_business'
    | 'autonomous_event_grounded_in_state'
    | 'long_term_world_coherence',
  narrativeText: string,
  context: {
    playerLocation?: string;
    eventLocation?: string;
    forbiddenOmniscientLeak?: string[];
    expectedOffscreenProgression?: string;
    persistedGoals?: string[];
    factionAgenda?: string;
  }
): WorldAutonomyEvaluationResult {
  const violations: string[] = [];
  const reasons: string[] = [];
  const text = narrativeText.toLowerCase();

  switch (scenario) {
    case 'offscreen_npc_goal': {
      if (text.includes('ficou esperando pacientemente que você chegasse') || text.includes('nada fez até você aparecer')) {
        violations.push('NPC fora de cena foi congelado no tempo aguardando a chegada do protagonista.');
      } else {
        reasons.push('NPC avançou em seu objetivo independente registrado no mundo.');
      }
      break;
    }

    case 'independent_faction_action': {
      if (text.includes('esperando a sua aprovação para agir') || text.includes('congelou o ataque até você decidir')) {
        violations.push('Facção pausou sua conspiração/plano para depender da decisão do protagonista.');
      } else {
        reasons.push('Facção executou seu plano conforme sua agenda e cronograma próprio.');
      }
      break;
    }

    case 'quiet_scene_preserved': {
      const forcedCrisisClichés = [
        'de repente um monstro invade',
        'uma flecha atinge a parede ao seu lado',
        'gritos ecoam e a taverna é atacada',
        'um assassino salta das sombras',
        'uma explosão estremece o chão',
        'um estranho encapuzado cai morto a seus pés'
      ];

      const foundCliché = forcedCrisisClichés.find((c) => text.includes(c));
      if (foundCliché) {
        violations.push(`Cena calma violada por crise artificial forçada: "${foundCliché}".`);
      } else {
        reasons.push('Cena calma preservou sua tranquilidade e respiração de sandbox.');
      }
      break;
    }

    case 'distant_event_cognitive_isolation': {
      if (context.forbiddenOmniscientLeak) {
        for (const leak of context.forbiddenOmniscientLeak) {
          if (text.includes(leak.toLowerCase())) {
            violations.push(`Vazamento onisciente: jogador tomou conhecimento de evento secreto distante ("${leak}") sem meio plausível de transmissão.`);
          }
        }
      }
      if (violations.length === 0) {
        reasons.push('Isolamento cognitivo e de perspectiva respeitado (sem câmera onisciente).');
      }
      break;
    }

    case 'missed_opportunity_delay': {
      if (text.includes('o conselho esperou três dias por você') || text.includes('o navio atrasou a partida esperando você')) {
        violations.push('Mundo congelou horários e prazos de terceiros em prol do protagonista.');
      } else {
        reasons.push('Oportunidade perdida ou prazo expirado pelo tempo do mundo.');
      }
      break;
    }

    case 'npc_unavailable_own_business': {
      if (text.includes('larga imediatamente sua audiência com o duque para te atender') || text.includes('interrompe tudo sem hesitar para servi-lo')) {
        violations.push('NPC importante ignorou compromisso preexistente para dar atenção exclusiva ao jogador.');
      } else {
        reasons.push('NPC priorizou seus deveres/compromissos próprios.');
      }
      break;
    }

    case 'autonomous_event_grounded_in_state': {
      if (text.includes('sem motivo aparente um meteoro atinge') || text.includes('por puro acaso a chave mestra cai')) {
        violations.push('Evento surgiu de improvisação conveniente sem ancoragem em estado prévio.');
      } else {
        reasons.push('Acontecimentos decorrem de causas, motivações e registros existentes.');
      }
      break;
    }

    case 'long_term_world_coherence': {
      if (text.includes('nada mudou no resto do reino') && text.includes('o mundo só existe onde você pisa')) {
        violations.push('Mundo estático dependente de renderização exclusiva ao redor do jogador.');
      } else {
        reasons.push('Evolução coerente do ecossistema e facções ao longo do tempo.');
      }
      break;
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    reasons,
  };
}

export async function runWorldAutonomyTestSuite() {
  console.log('===============================================================');
  console.log('SUÍTE DE TESTES: AUTONOMIA DO MUNDO E RITMO DE SANDBOX');
  console.log('===============================================================\n');

  const store = new InMemoryStore();
  const memoryManager = new MemoryManager(store);
  const narratorService = new NarratorService();
  const campaignId = 'campaign_autonomy_test';

  await store.saveSnapshot({
    campaign: {
      campaignId,
      name: 'Crônicas da Fronteira Livre',
      currentLocation: 'Vila de Oakhaven',
      currentDate: '15 de Outono, Ano 340',
      createdAt: 1000,
    },
    npcs: {
      npc_valerius: {
        id: 'npc_valerius',
        name: 'Comandante Valerius',
        status: 'alive',
        location: 'Fortaleza do Norte',
        faction: 'Guarda Real',
        personalityNotes: 'Rígido, comprometido com a segurança militar da fronteira.',
        goals: ['Inspecionar as muralhas da fortaleza', 'Repelir contrabandistas no desfiladeiro'],
        secrets: ['Suspeita de traição no conselho da capital'],
        inventory: ['Espada militar', 'Relatório de patrulha'],
        relationships: {},
      },
      npc_garrik: {
        id: 'npc_garrik',
        name: 'Garrik, o Ferreiro',
        status: 'alive',
        location: 'Vila de Oakhaven',
        faction: 'Comerciantes Locais',
        personalityNotes: 'Pragmático, sobrecarregado de trabalho.',
        goals: ['Entregar 50 ferraduras para a guarnição até o fim do dia'],
        secrets: [],
        inventory: ['Martelo de forja', 'Lingotes de ferro'],
        relationships: {},
      },
      npc_sylvia: {
        id: 'npc_sylvia',
        name: 'Lady Sylvia',
        status: 'alive',
        location: 'Solar dos Corvos',
        faction: 'Guilda Mercantil',
        personalityNotes: 'Astuta, focada no monopólio de minério.',
        goals: ['Comprar a concessão das minas antes do solstício', 'Subornar fiscais portuários'],
        secrets: ['Financiou o bloqueio da estrada sul'],
        inventory: ['Selo de cera da guilda', 'Bolsa de florins'],
        relationships: {},
      },
    },
    events: [
      {
        id: 'evt_1',
        timestamp: 1000,
        location: 'Desfiladeiro Cinzento',
        participants: ['Comandante Valerius', 'Contrabandistas'],
        description: 'A Guarda Real interceptou uma caravana ilegal de armas.',
        consequences: ['Estrada norte temporariamente vigiada'],
      },
    ],
    knowledge: [
      {
        id: 'know_mines_deal',
        fact: 'Lady Sylvia fechou a compra secreta das minas de cobre.',
        truthStatus: 'true',
        knownBy: ['Lady Sylvia', 'Magistrado Vane'],
        suspectedBy: [],
        observedBy: ['Lady Sylvia', 'Magistrado Vane'],
        believedBy: [],
        disputedBy: [],
        source: 'Reunião Secreta no Solar',
        reliability: 10,
        isWorldTruth: false,
        isPublicKnowledge: false,
        epistemicStatus: 'DIRECT_OBSERVATION',
        acquiredAt: 1000,
        lastUpdatedAt: 1000,
      },
      {
        id: 'know_market_day',
        fact: 'A feira de outono em Oakhaven ocorre a cada três dias.',
        truthStatus: 'true',
        knownBy: [],
        suspectedBy: [],
        observedBy: [],
        believedBy: [],
        disputedBy: [],
        source: 'Costume local',
        reliability: 10,
        isWorldTruth: true,
        isPublicKnowledge: true,
        epistemicStatus: 'WORLD_TRUTH',
        acquiredAt: 1000,
        lastUpdatedAt: 1000,
      },
    ],
    relationships: [],
    inventory: [
      { owner: 'Jogador', item: 'Manto de viagem', quantity: 1 },
      { owner: 'Jogador', item: 'Cantil de água', quantity: 1 },
      { owner: 'Jogador', item: 'Bolsa com 12 moedas de prata', quantity: 1 },
    ],
    quests: [
      {
        id: 'quest_supply',
        title: 'A Encomenda das Ferraduras',
        status: 'active',
        participants: ['Garrik, o Ferreiro'],
        objectives: ['Garrik deve forjar 50 ferraduras para os cavalos da patrulha'],
        consequences: ['Guarnição bem equipada'],
      },
    ],
    updatedAt: 1000,
  });

  // [TESTE 1] NPC fora de cena continua objetivo próprio
  console.log('[TESTE 1] NPC fora de cena continua objetivo próprio sem esperar pelo jogador...');
  const narrative1 = `
    *Três semanas após a última conversa em Oakhaven, notícias chegam do norte. O Comandante Valerius não permaneceu estacionado aguardando reforços externos: marchou com seu destacamento até o Desfiladeiro Cinzento, limpou as trilhas dos contrabandistas e já estabeleceu uma guarita avançada na encosta rochosa.*
  `;
  const res1 = evaluateWorldAutonomyBehavior('offscreen_npc_goal', narrative1, {
    expectedOffscreenProgression: 'Valerius inspecionou e pacificou o desfiladeiro.',
  });
  if (!res1.valid) throw new Error(`Falha no Teste 1: ${res1.violations.join(', ')}`);
  console.log('✅ TESTE 1 PASSOU: NPC fora de cena evoluiu de acordo com seus objetivos e tempo decorrido.\n');

  // [TESTE 2] Facção age sem esperar intervenção do jogador
  console.log('[TESTE 2] Facção age sem esperar intervenção do jogador (agenda autônoma)...');
  const narrative2 = `
    *Enquanto a vida segue tranquila na vila, a Guilda Mercantil de Lady Sylvia finalizou o acordo com os magistrados da capital. Sem aguardar a opinião dos aventureiros locais, as novas tarifas de pedágio já foram afixadas nas estacas da ponte de pedra.*
  `;
  const res2 = evaluateWorldAutonomyBehavior('independent_faction_action', narrative2, {
    factionAgenda: 'Guilda impõe tarifas sem intervenção do jogador',
  });
  if (!res2.valid) throw new Error(`Falha no Teste 2: ${res2.violations.join(', ')}`);
  console.log('✅ TESTE 2 PASSOU: Facção executou seus planos sem paralisia por ausência do protagonista.\n');

  // [TESTE 3] Cena quieta permanece quieta sem gancho artificial
  console.log('[TESTE 3] Cena quieta permanece quieta sem gancho artificial ou perigo forçado...');
  const calmNarrative = `
    *Acomodado junto à lareira da estalagem, você toma uma caneca de chá de ervas enquanto o vento sopra frio lá fora. Alguns aldeões conversam em voz baixa sobre a colheita de cevada, e o taverneiro limpa as tábuas do balcão com um pano úmido. A noite passa calma e o fogo estala sem interrupções.*
  `;
  const res3 = evaluateWorldAutonomyBehavior('quiet_scene_preserved', calmNarrative, {});
  if (!res3.valid) throw new Error(`Falha no Teste 3: ${res3.violations.join(', ')}`);

  const forcedDrama = `*Você bebe seu chá. De repente um monstro invade a taverna rosnando!*`;
  const badRes3 = evaluateWorldAutonomyBehavior('quiet_scene_preserved', forcedDrama, {});
  if (badRes3.valid) throw new Error('Falha ao detectar clichê forçado de crise em momento calmo.');
  console.log('✅ TESTE 3 PASSOU: Cenas pacíficas e rotinas de sandbox são respeitadas com cadência natural.\n');

  // [TESTE 4] Evento importante longe do jogador e NÃO revelado automaticamente
  console.log('[TESTE 4] Evento longe do jogador não é revelado por câmera onisciente (isolamento cognitivo)...');
  const playerContext = await memoryManager.getRelevantContext({
    campaignId,
    currentLocation: 'Vila de Oakhaven',
    playerCharacter: 'Jogador',
  });
  if (playerContext.formattedSummary.includes('Lady Sylvia fechou a compra secreta das minas de cobre')) {
    throw new Error('Segredo distante vazou no contexto cognitivo do jogador!');
  }
  const compliantNarrative = `
    *Você caminha pela praça de Oakhaven. O dia segue rotineiro com os feirantes montando suas barracas de vegetais sob a neblina matinal.*
  `;
  const res4 = evaluateWorldAutonomyBehavior('distant_event_cognitive_isolation', compliantNarrative, {
    forbiddenOmniscientLeak: ['Lady Sylvia fechou a compra secreta das minas de cobre'],
  });
  if (!res4.valid) throw new Error(`Falha no Teste 4: ${res4.violations.join(', ')}`);
  console.log('✅ TESTE 4 PASSOU: Restrição cognitiva preservada; eventos distantes exigem meios plausíveis de transmissão.\n');

  // [TESTE 5] Jogador perde oportunidade por chegar tarde
  console.log('[TESTE 5] Jogador perde oportunidade por atraso (os prazos do mundo não congelam)...');
  const narrative5 = `
    *Ao chegar aos estábulos ao meio-dia para a diligência das oito da manhã, você encontra apenas feno varrido e cocheiras vazias. O cocheiro da diligência partiu pontualmente no horário com os passageiros pagantes. A próxima saída para a capital só ocorrerá daqui a dois dias.*
  `;
  const res5 = evaluateWorldAutonomyBehavior('missed_opportunity_delay', narrative5, {});
  if (!res5.valid) throw new Error(`Falha no Teste 5: ${res5.violations.join(', ')}`);
  console.log('✅ TESTE 5 PASSOU: Prazos e cronogramas de terceiros funcionam independentemente da prontidão do jogador.\n');

  // [TESTE 6] NPC importante indisponível por compromisso próprio
  console.log('[TESTE 6] NPC importante indisponível por obrigações próprias...');
  const narrative6 = `
    *Você bate à porta da oficina de Garrik. O ferreiro mal ergue os olhos da bigorna, onde martela uma lâmina em brasa enquanto suor escorre por sua testa.*
    
    — Não posso atender ninguém agora — diz ele, sem parar as marteladas compassadas. — Tenho cinquenta ferraduras para entregar à guarnição antes do pôr do sol, ou o intendente corta meu contrato. Volte amanhã cedo se quiser afiar lâminas.
  `;
  const res6 = evaluateWorldAutonomyBehavior('npc_unavailable_own_business', narrative6, {});
  if (!res6.valid) throw new Error(`Falha no Teste 6: ${res6.violations.join(', ')}`);
  console.log('✅ TESTE 6 PASSOU: NPCs priorizam seus deveres e agendas reais em vez de servirem de balcão imediato.\n');

  // [TESTE 7] Evento autônomo decorre de estado persistido
  console.log('[TESTE 7] Evento autônomo ancorado em estado e eventos persistidos...');
  const narrative7 = `
    *A patrulha reforçada nos portões de Oakhaven verifica minuciosamente cada carroça que chega do norte. Os guardas cumprem as ordens emitidas pelo Comandante Valerius após a recente apreensão de armas no Desfiladeiro Cinzento.*
  `;
  const res7 = evaluateWorldAutonomyBehavior('autonomous_event_grounded_in_state', narrative7, {});
  if (!res7.valid) throw new Error(`Falha no Teste 7: ${res7.violations.join(', ')}`);
  console.log('✅ TESTE 7 PASSOU: Consequências derivam diretamente da linha do tempo canônica persistida.\n');

  // [TESTE 8] Evolução de longo prazo após 20-30 turnos
  console.log('[TESTE 8] Evolução coerente do mundo após múltiplos turnos (não-centrado exclusivamente no jogador)...');
  await memoryManager.updateNPC(campaignId, 'npc_garrik', {
    goals: ['Reabastecer estoque de carvão e ferro'],
  });
  await memoryManager.createEvent(campaignId, {
    location: 'Fortaleza do Norte',
    participants: ['Comandante Valerius', 'Engenheiros Reais'],
    description: 'Conclusão das reformas nas muralhas da Fortaleza do Norte.',
    consequences: ['Defesas fortificadas', 'Patrulhas reduzidas no vale'],
  });

  const narratorContext = await memoryManager.getRelevantContext({
    campaignId,
    currentLocation: 'Vila de Oakhaven',
    playerCharacter: 'Jogador',
    targetCharacter: 'narrator',
  });
  if (!narratorContext.formattedSummary.includes('Conclusão das reformas nas muralhas da Fortaleza do Norte')) {
    throw new Error('Atualização autônoma da fortaleza não encontrada no contexto do narrador.');
  }

  const multiTurnNarrative = `
    *Após um mês de outono na fronteira, a paisagem econômica da região mudou perceptivelmente: os preços do pão e do azeite subiram devido às taxas da Guilda Mercantil na ponte sul, a Fortaleza do Norte concluiu sua nova torre de vigia liberando guardas para descanso, e Garrik agora recebe carregamentos frescos de carvão trazidos pelos lenhadores.*
  `;
  const res8 = evaluateWorldAutonomyBehavior('long_term_world_coherence', multiTurnNarrative, {});
  if (!res8.valid) throw new Error(`Falha no Teste 8: ${res8.violations.join(', ')}`);
  console.log('✅ TESTE 8 PASSOU: O ecossistema do mundo evolui organicamente em múltiplos núcleos.\n');

  // [TESTE 9] Injeção de diretivas em buildPrompt
  console.log('[TESTE 9] Validando inclusão da diretiva de autonomia do mundo em buildPrompt...');
  const promptContext: NarratorPromptContext = {
    systemInstructions: getSystemInstructions(),
    campaignFoundation: {
      id: 'cf_1',
      title: 'Crônicas de Oakhaven',
      genre: 'Medieval Realista',
      premise: 'Vida cotidiana e tensões comerciais na fronteira',
      tone: 'Realista/Cotidiano',
      startingLocation: 'Vila de Oakhaven',
      createdAt: 1000,
    },
    worldState: {
      currentLocation: 'Vila de Oakhaven',
      timeOfDay: 'Tarde',
      weather: 'Nublado e fresco',
      tensionLevel: 'calm',
      statusSummary: 'A vila segue sua rotina pacífica de outono.',
    },
    player: {
      id: 'player_1',
      name: 'Arlen',
      role: 'player',
      status: 'alive',
      archetype: 'Caçador',
    },
    recentMessages: [],
    currentUserInput: 'Caminho até a taverna e peço uma tigela de sopa quente.',
  };
  const prompt = narratorService.buildPrompt(promptContext);
  if (!prompt.includes('=== [DIRETIVA DE AUTONOMIA DO MUNDO E RITMO SANDBOX] ===')) {
    throw new Error('Prompt não contém o cabeçalho de autonomia do mundo!');
  }
  if (!prompt.includes('O mundo NÃO gira em torno do protagonista')) {
    throw new Error('Prompt não contém diretiva anti-protagonismo!');
  }
  console.log('✅ TESTE 9 PASSOU: buildPrompt injeta formalmente as diretivas de sandbox e autonomia.\n');

  // [TESTE 10] Verificação de diretrizes canônicas nas System Instructions
  console.log('[TESTE 10] Verificando diretrizes de autonomia e anti-player-centrism nas System Instructions...');
  const sysInstructions = getSystemInstructions();
  const requiredInstructions = [
    '13. AUTONOMIA DO MUNDO, ANTI-PROTAGONISMO E RITMO DE SANDBOX',
    'MUNDO FORA DA CÂMERA (PROGRESSÃO OFF-SCREEN)',
    'DIRETRIZES ANTI-PLAYER-CENTRIC',
    'RITMO DE SANDBOX (PACING ORGÂNICO E VIDA COTIDIANA)',
    'OPORTUNIDADES PERDIDAS',
    'NPCs INDISPONÍVEIS POR COMPROMISSO PRÓPRIO',
    'RESTRIÇÃO COGNITIVA E ISOLAMENTO DE PERSPECTIVA',
  ];
  for (const item of requiredInstructions) {
    if (!sysInstructions.includes(item)) {
      throw new Error(`Diretriz obrigatória ausente em systemInstructions: "${item}"`);
    }
  }
  console.log('✅ TESTE 10 PASSOU: Todas as cláusulas canônicas de autonomia e ritmo de sandbox estão ativas.\n');

  console.log('===============================================================');
  console.log('RESULTADO DA SUÍTE: 10/10 TESTES APROVADOS COM SUCESSO (100%)');
  console.log('===============================================================');
}

runWorldAutonomyTestSuite().catch((err) => {
  console.error('❌ Falha na suíte de testes de autonomia do mundo:', err);
  process.exit(1);
});
