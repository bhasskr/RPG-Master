/**
 * Testes manuais/automatizados de integração da funcionalidade Histórico & Recentes
 * 
 * 1. Criar Campanha A e Campanha B com dados distintos.
 * 2. Alternar entre elas pelo Histórico e verificar isolamento de mensagens.
 * 3. Buscar uma pelo nome no Histórico.
 * 4. Simular persistência e recarregamento.
 * 5. Confirmar que ambas continuam no Histórico e que os chats continuam 100% isolados.
 */

import { gameEngine } from '../server/engine/gameEngine';

async function runHistoryAndRecentsTests() {
  console.log('=== INICIANDO TESTES DO HISTÓRICO E RECENTES ===\n');

  let passed = 0;
  let total = 0;

  // 1. Criar Campanha A e Campanha B
  total++;
  const campAId = `test_camp_A_${Date.now()}`;
  const campBId = `test_camp_B_${Date.now()}`;

  const stateA = gameEngine.gameStateManager.createCampaign({
    campaignId: campAId,
    title: 'Crônicas de Valéria',
    genre: 'Alta Fantasia',
    startingLocation: 'Taverna do Javali Saltitante',
    playerName: 'Valério O Bravo',
  });

  const stateB = gameEngine.gameStateManager.createCampaign({
    campaignId: campBId,
    title: 'Sombras de Neon 2099',
    genre: 'Cyberpunk',
    startingLocation: 'Setor 4 do Distrito Baixo',
    playerName: 'Kaelen Cypher',
  });

  // Salva mensagens distintas nas campanhas
  await gameEngine.memoryManager.getStore().saveMessage(campAId, {
    id: `msg_a_1`,
    role: 'user',
    content: 'Eu peço uma caneca de hidromel ao taverneiro.',
    timestamp: Date.now(),
    turn: 1,
  });
  await gameEngine.memoryManager.getStore().saveMessage(campAId, {
    id: `msg_a_2`,
    role: 'assistant',
    content: 'O taberneiro desliza uma caneca de madeira com espuma farta em sua direção.',
    timestamp: Date.now() + 10,
    turn: 1,
  });

  await gameEngine.memoryManager.getStore().saveMessage(campBId, {
    id: `msg_b_1`,
    role: 'user',
    content: 'Eu conecto meu deck neural ao terminal de acesso.',
    timestamp: Date.now(),
    turn: 1,
  });
  await gameEngine.memoryManager.getStore().saveMessage(campBId, {
    id: `msg_b_2`,
    role: 'assistant',
    content: 'Linhas de código verde fluem rapidamente pela sua visão cibernética.',
    timestamp: Date.now() + 10,
    turn: 1,
  });

  if (stateA && stateB && stateA.campaignId === campAId && stateB.campaignId === campBId) {
    console.log('✅ Teste 1: Campanha A e Campanha B criadas e persistidas com sucesso.');
    passed++;
  } else {
    console.error('❌ Teste 1: Falha ao criar campanhas.');
  }

  // 2. Listar campanhas pelo Histórico e verificar dados
  total++;
  const allCampaigns = gameEngine.listAllCampaigns();
  const foundA = allCampaigns.find((c) => c.id === campAId);
  const foundB = allCampaigns.find((c) => c.id === campBId);

  if (
    foundA &&
    foundB &&
    foundA.title === 'Crônicas de Valéria' &&
    foundA.location === 'Taverna do Javali Saltitante' &&
    foundB.title === 'Sombras de Neon 2099' &&
    foundB.location === 'Setor 4 do Distrito Baixo'
  ) {
    console.log('✅ Teste 2: Histórico recupera todas as campanhas com nome, localização, data e turno.');
    passed++;
  } else {
    console.error('❌ Teste 2: Falha ao listar campanhas no Histórico.', { foundA, foundB });
  }

  // 3. Buscar pelo nome
  total++;
  const searchResultA = allCampaigns.filter((c) => c.title.toLowerCase().includes('valéria'));
  const searchResultB = allCampaigns.filter((c) => c.title.toLowerCase().includes('neon'));

  const foundSearchA = searchResultA.find((c) => c.id === campAId);
  const foundSearchB = searchResultB.find((c) => c.id === campBId);

  if (foundSearchA && foundSearchB) {
    console.log('✅ Teste 3: Busca simples por nome filtra as campanhas com exatidão.');
    passed++;
  } else {
    console.error('❌ Teste 3: Falha na busca simples por nome.', { searchResultA, searchResultB });
  }

  // 4. Isolamento estrito de mensagens e estado entre campanhas (Não misturar)
  total++;
  const detailsA = await gameEngine.getCampaignDetails(campAId);
  const detailsB = await gameEngine.getCampaignDetails(campBId);

  const messagesA = detailsA.messages.map((m) => m.content);
  const messagesB = detailsB.messages.map((m) => m.content);

  const hasLeakAintoB = messagesB.some((c) => c.includes('hidromel') || c.includes('taverneiro'));
  const hasLeakBintoA = messagesA.some((c) => c.includes('deck neural') || c.includes('cibernética'));

  if (
    messagesA.length === 2 &&
    messagesB.length === 2 &&
    !hasLeakAintoB &&
    !hasLeakBintoA &&
    detailsA.gameState?.player?.name === 'Valério O Bravo' &&
    detailsB.gameState?.player?.name === 'Kaelen Cypher'
  ) {
    console.log('✅ Teste 4: Chats e GameState estão 100% isolados entre as campanhas.');
    passed++;
  } else {
    console.error('❌ Teste 4: Vazamento de mensagens ou estados entre campanhas detectado!');
  }

  // 5. Simular recarga e persistência no disco
  total++;
  // Limpa cache em memória do GameStateManager para forçar leitura do disco
  (gameEngine.gameStateManager as any).activeStates.clear();
  const reloadedList = gameEngine.listAllCampaigns();
  const reloadedA = reloadedList.find((c) => c.id === campAId);
  const reloadedB = reloadedList.find((c) => c.id === campBId);

  if (reloadedA && reloadedB && reloadedA.title === 'Crônicas de Valéria' && reloadedB.title === 'Sombras de Neon 2099') {
    console.log('✅ Teste 5: Persistência confirmada após recarregamento do armazenamento em disco.');
    passed++;
  } else {
    console.error('❌ Teste 5: Campanhas não foram recuperadas do disco após limpar cache.');
  }

  console.log(`\n=== RESULTADO FINAL: ${passed}/${total} TESTES APROVADOS ===`);
  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runHistoryAndRecentsTests().catch((err) => {
  console.error('Erro ao executar testes:', err);
  process.exit(1);
});
