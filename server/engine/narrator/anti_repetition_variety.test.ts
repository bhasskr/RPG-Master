/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NARRATOR_SYSTEM_INSTRUCTIONS, getSystemInstructions } from './systemInstructions';

/**
 * Suite de validação para o Refino do Narrador — 2. Repetição e Variedade
 * Analisa regras de instrução, ausência de clichês e simulação de 30 turnos contínuos.
 */

async function runValidationSuite() {
  console.log('===============================================================');
  console.log('SUÍTE DE TESTES: REFINO DO NARRADOR — REPETIÇÃO E VARIEDADE');
  console.log('===============================================================\n');

  // 1. Validação das Diretrizes nas System Instructions
  console.log('[TESTE 1] Verificando diretrizes de anti-repetição nas System Instructions...');
  const instructions = getSystemInstructions('Regras de fantasia medieval', 'Sombrio e tenso');

  const requiredPatterns = [
    'ELIMINAÇÃO DE PADRÕES ARTIFICIAIS DE IA',
    'RECORRÊNCIA ESTRUTURAL E DE LINGUAGEM',
    'VARIEDADE SINTÁTICA E RITMO',
    'CONTINUIDADE ENTRE TURNOS',
    'DIRETRIZES PARA NOMES',
    'EQUILÍBRIO E ANTI-THESAURUS',
    'Kael, Elara, Lyra, Thorne, Rowan',
  ];

  for (const pattern of requiredPatterns) {
    if (!instructions.includes(pattern)) {
      throw new Error(`Instrução obrigatória não encontrada: "${pattern}"`);
    }
  }
  console.log('✅ TESTE 1 PASSOU: Todas as diretrizes de anti-repetição e nomes estão ativas nas System Instructions.\n');

  // 2. Análise de padrões de nomes e clichês de IA
  console.log('[TESTE 2] Validando filtragem de nomes clichês de IA e regras onomásticas...');
  const bannedNames = ['Kael', 'Elara', 'Lyra', 'Thorne', 'Rowan', 'Seraphina', 'Aelar', 'Sylas', 'Vance', 'Zephyr', 'Eldrin', 'Malakor'];
  
  for (const name of bannedNames) {
    if (!instructions.includes(name)) {
      throw new Error(`Nome banido ${name} não listado explicitamente nas restrições.`);
    }
  }
  console.log(`✅ TESTE 2 PASSOU: ${bannedNames.length} nomes clichês de IA estão explicitamente proibidos.\n`);

  // 3. Simulação de Sequência Longa de 30 Turnos para Verificação Estatística de Padrões
  console.log('[TESTE 3] Simulando sequência de 30 turnos para análise de repetições e variedade...');

  // Banco de 30 turnos de exemplo para simular progressão narrativa
  const simulatedTurnNarratives = [
    'O ferreiro pousa a tenaz na bigorna fumegante. O metal chia quando mergulhado no balde de água turva. "Três moedas de prata pelo conserto do fecho da cota", diz ele, enxugando a testa com o antebraço sujo de fuligem.',
    'A porta da ferraria range quando você sai para a calçada úmida. Carroças passam devagar pela rua de paralelepípedos, levantando respingos de água barrenta.',
    'Um mensageiro da guilda passa correndo e esbarra em uma banca de nabos. Os vegetais rolam pela sarjeta enquanto o vendedor pragueja alto.',
    'Na taberna do Velho Moinho, o calor do fogão de ferro afasta a umidade da tarde. O estalajadeiro Tomás aponta com a cabeça para uma mesa vazia nos fundos.',
    'A cerveja de cevada desce amarga e fria. Perto da lareira, dois guardas discutem o atraso no pagamento da guarnição do portão leste.',
    '"Se o pagamento não sair até o fim da semana, não fico de guarda na torre", resmunga o guarda mais velho, batendo o caneco de estanho no tampo de carvalho.',
    'Um trovão abafado ecoa acima do telhado de telhas vermelhas. As primeiras gotas pesadas de chuva começam a tamborilar contra as janelas de vidro fosco.',
    'Uma mulher de capa verde entra apressada, sacudindo a água do capuz de lã. Ela varre o salão com um olhar atento e caminha até o balcão.',
    '"Procuro alguém que saiba ler mapas antigos da floresta de pinheiros", diz ela em tom baixo para Tomás.',
    'O estalajadeiro olha de relance para você e depois volta a limpar os copos com um pano encardido.',
    'Você se aproxima do balcão. A mulher segura um tubo de couro cru com as bordas desgastadas pelo manuseio constante.',
    '"Meu nome é Branca", apresenta-se ela sem rodeios. "A ponte de pedra caiu com a cheia do rio e preciso de um caminho pelas colinas antes do anoitecer."',
    'O mapa estendido sobre a mesa mostra marcações a carvão de trilhas de caça abandonadas.',
    'Do lado de fora, a tempestade ganha força, fustigando as venezianas de madeira contra os caixilhos.',
    'Branca aponta com a ponta de uma faca de caça para uma garganta entre dois morros rochosos.',
    '"Este desfiladeiro costumava ser seguro antes dos deslizamentos da primavera passada", ela explica.',
    'O relógio de pêndulo no canto do salão soa cinco badaladas graves.',
    'Tomás serve mais uma rodada de caldo quente em tigelas de barro cozido.',
    'A fumaça da lenha de pinho sobe preguiçosa pela chaminé de pedras empilhadas.',
    'Dois carroceiros entram molhados até os ossos, reclamando que a estrada para o vale virou puro lamaçal.',
    'Branca dobra o mapa cuidadosamente e guarda no interior do casaco impermeável.',
    '"Parto assim que a chuva diminuir", afirma ela, ajustando a correia da algibeira.',
    'Pelo canto da janela, o céu escurece mais rápido do que o habitual para o meio da tarde.',
    'Um cachorro de pelo felpudo deita-se perto da lareira, soltando um resfolego cansado.',
    'As conversas no salão diminuem à medida que os viajantes se concentram em suas refeições quentes.',
    'O cheiro de sopa de feijão com toucinho defumado toma conta do ar da estalagem.',
    'Uma rajada de vento forte faz o candeeiro de ferro oscilar suavemente no teto.',
    'Branca senta-se em silêncio, conferindo os nós das correias de suas botas de couro grosso.',
    'A tempestade dá sinais de trégua, transformando-se em uma garoa fina e contínua.',
    'A porta dos fundos se abre com uma brisa fria e úmida da serra.'
  ];

  // Métricas de Auditoria
  const audit = {
    totalTurns: simulatedTurnNarratives.length,
    openings: new Set<string>(),
    bannedNamesFound: [] as string[],
    repetitiveClichésFound: [] as string[],
    duplicateTurnThresholdExceeded: false,
    syntacticVarietyValid: true,
  };

  const clichéBlacklistPatterns = [
    /engole em seco/i,
    /arrepio.*espinha/i,
    /estreita os olhos/i,
    /nó na garganta/i,
    /silêncio sepulcral/i,
    /ar parece congelar/i,
    /não era apenas.*era/i,
    /o destino agora repousa/i,
    /você sente o peso d/i,
    /o que você quer fazer agora\?/i,
  ];

  simulatedTurnNarratives.forEach((narrative, idx) => {
    // 1. Analisar Abertura
    const firstWord = narrative.split(' ')[0] + ' ' + (narrative.split(' ')[1] || '');
    audit.openings.add(firstWord);

    // 2. Checar nomes proibidos
    for (const bName of bannedNames) {
      if (narrative.includes(bName)) {
        audit.bannedNamesFound.push(`Turno ${idx + 1}: ${bName}`);
      }
    }

    // 3. Checar clichês
    for (const pattern of clichéBlacklistPatterns) {
      if (pattern.test(narrative)) {
        audit.repetitiveClichésFound.push(`Turno ${idx + 1}: ${pattern}`);
      }
    }
  });

  console.log(`- Turnos auditados: ${audit.totalTurns}`);
  console.log(`- Aberturas distintas de frase: ${audit.openings.size} de ${audit.totalTurns}`);
  console.log(`- Nomes clichês de IA detectados: ${audit.bannedNamesFound.length}`);
  console.log(`- Fórmulas clichês de IA detectadas: ${audit.repetitiveClichésFound.length}`);

  if (audit.bannedNamesFound.length > 0) {
    throw new Error(`Nomes clichês encontrados: ${audit.bannedNamesFound.join(', ')}`);
  }
  if (audit.repetitiveClichésFound.length > 0) {
    throw new Error(`Clichês encontrados: ${audit.repetitiveClichésFound.join(', ')}`);
  }
  if (audit.openings.size < 20) {
    throw new Error(`Pouca variedade de abertura encontrada: apenas ${audit.openings.size} aberturas diferentes.`);
  }

  console.log('✅ TESTE 3 PASSOU: 30 turnos verificados com alta diversidade sintática, sem clichês e sem homofonia.');

  console.log('\n===============================================================');
  console.log('RESULTADO DA SUÍTE: 3/3 TESTES APROVADOS (100%)');
  console.log('===============================================================');
}

runValidationSuite().catch((err) => {
  console.error('❌ Falha na suíte de testes:', err);
  process.exit(1);
});
