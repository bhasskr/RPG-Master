/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MemoryManager } from './memoryManager';
import { FilePersistentMemoryStore } from './filePersistentStore';
import path from 'path';
import fs from 'fs/promises';

async function runTests() {
  console.log('--- INICIANDO TESTES DA MEMORY LAYER ---');

  const testDir = path.join(process.cwd(), 'data', 'test_rpg_memory');
  const store = new FilePersistentMemoryStore(testDir);
  const memory = new MemoryManager(store);
  const campaignId = `test_camp_${Date.now()}`;

  try {
    // 1. Campaign Tests
    console.log('[1] Testando Campaign CRUD...');
    const camp = await memory.createCampaign({
      campaignId,
      name: 'A Fronteira Esquecida',
      currentDate: '14 de Outono, Ano 340',
      currentLocation: 'Taverna do Javali Caolho',
    });
    console.assert(camp.name === 'A Fronteira Esquecida', 'Erro no nome da campanha');
    console.assert(camp.currentLocation === 'Taverna do Javali Caolho', 'Erro na localização');

    const fetchedCamp = await memory.getCampaign(campaignId);
    console.assert(fetchedCamp?.name === 'A Fronteira Esquecida', 'Erro ao buscar campanha');

    await memory.updateCampaign(campaignId, { currentLocation: 'Cripta dos Antigos' });
    const updatedCamp = await memory.getCampaign(campaignId);
    console.assert(updatedCamp?.currentLocation === 'Cripta dos Antigos', 'Erro ao atualizar campanha');
    console.log('✓ Campaign CRUD OK');

    // 2. NPC Tests
    console.log('[2] Testando NPC CRUD...');
    const npc = await memory.createNPC(campaignId, {
      name: 'Eldrin, o Alquimista',
      status: 'alive',
      location: 'Cripta dos Antigos',
      faction: 'Círculo de Prata',
      personalityNotes: 'Desconfiado, meticuloso e obcecado por reagentes raros.',
      goals: ['Traduzir o tomo antigo', 'Evitar os guardas da cidade'],
      secrets: ['Possui a chave do santuário oculto'],
      inventory: ['Frasco de Fogo Alquímico', 'Ervas de Cura'],
      relationships: { 'Jogador': 'curioso, porém cauteloso' },
    });
    console.assert(npc.name === 'Eldrin, o Alquimista', 'Erro ao criar NPC');

    const fetchedNpc = await memory.getNPC(campaignId, npc.id);
    console.assert(fetchedNpc?.personalityNotes.includes('Desconfiado'), 'Erro ao buscar NPC');

    await memory.updateNPC(campaignId, npc.id, { status: 'injured' });
    const updatedNpc = await memory.getNPC(campaignId, npc.id);
    console.assert(updatedNpc?.status === 'injured', 'Erro ao atualizar NPC');
    console.log('✓ NPC CRUD OK');

    // 3. Event Tests
    console.log('[3] Testando Event CRUD...');
    const evt = await memory.createEvent(campaignId, {
      location: 'Cripta dos Antigos',
      participants: ['Eldrin, o Alquimista', 'Jogador'],
      description: 'O selo de pedra da cripta foi quebrado por um estrondo.',
      consequences: ['Névoa sulfurosa escapou das catacumbas', 'Criaturas despertaram'],
    });
    console.assert(evt.description.includes('selo de pedra'), 'Erro ao criar evento');

    const eventsAtCrypt = await memory.getRelevantEvents(campaignId, { location: 'Cripta' });
    console.assert(eventsAtCrypt.length >= 1, 'Erro ao buscar eventos por local');
    console.log('✓ Event CRUD OK');

    // 4. Knowledge Tests
    console.log('[4] Testando Knowledge CRUD...');
    const know = await memory.createKnowledge(campaignId, {
      fact: 'O santuário só pode ser aberto durante o alinhamento das luas gêmeas.',
      truthStatus: 'true',
      knownBy: ['Eldrin, o Alquimista'],
      suspectedBy: ['Jogador'],
      source: 'Tomo Ancestral',
      reliability: 9,
    });
    console.assert(know.reliability === 9, 'Erro ao criar Knowledge');

    const eldrinKnowledge = await memory.getKnowledgeForCharacter(campaignId, 'Eldrin');
    console.assert(eldrinKnowledge.length >= 1, 'Erro ao buscar Knowledge por personagem');
    console.log('✓ Knowledge CRUD OK');

    // 5. Relationship Tests
    console.log('[5] Testando Relationship CRUD...');
    const rel = await memory.updateRelationship(campaignId, 'Jogador', 'Eldrin, o Alquimista', {
      trust: 25,
      hostility: -10,
      familiarity: 3,
      importantHistory: ['Conversaram na entrada da cripta'],
    });
    console.assert(rel.trust === 25, 'Erro ao criar relação');

    const fetchedRel = await memory.getRelationship(campaignId, 'Eldrin, o Alquimista', 'Jogador');
    console.assert(fetchedRel?.trust === 25, 'Erro na busca simétrica de relação');
    console.log('✓ Relationship CRUD OK');

    // 6. Inventory Tests
    console.log('[6] Testando Inventory CRUD...');
    await memory.updateInventory(campaignId, 'Jogador', 'Tocha de Pinho', 3, 'set');
    let playerInv = await memory.getInventory(campaignId, 'Jogador');
    console.assert(playerInv.find((i) => i.item === 'Tocha de Pinho')?.quantity === 3, 'Erro no inventário set');

    await memory.updateInventory(campaignId, 'Jogador', 'Tocha de Pinho', -1, 'add');
    playerInv = await memory.getInventory(campaignId, 'Jogador');
    console.assert(playerInv.find((i) => i.item === 'Tocha de Pinho')?.quantity === 2, 'Erro no inventário add');
    console.log('✓ Inventory CRUD OK');

    // 7. Quest Tests
    console.log('[7] Testando Quest CRUD...');
    const quest = await memory.createQuest(campaignId, {
      title: 'O Mistério das Luas Gêmeas',
      status: 'active',
      participants: ['Jogador', 'Eldrin, o Alquimista'],
      objectives: [
        { description: 'Encontrar a chave rúnica na cripta', isCompleted: false },
      ],
      consequences: ['Acesso ao salão do oráculo'],
    });
    console.assert(quest.title === 'O Mistério das Luas Gêmeas', 'Erro ao criar Quest');

    const fetchedQuest = await memory.getQuest(campaignId, quest.id);
    console.assert(fetchedQuest?.status === 'active', 'Erro ao buscar Quest');
    console.log('✓ Quest CRUD OK');

    // 8. getRelevantContext Test
    console.log('[8] Testando getRelevantContext (Determinístico)...');
    const relevantCtx = await memory.getRelevantContext({
      campaignId,
      currentLocation: 'Cripta dos Antigos',
      presentNPCs: ['Eldrin, o Alquimista'],
      conversationSubject: 'tomo e santuário',
      playerCharacter: 'Jogador',
      targetCharacter: 'narrator',
      recentEventsCount: 3,
    });

    console.assert(relevantCtx.presentNPCs.length === 1, 'Deveria encontrar Eldrin');
    console.assert(relevantCtx.relationships.length === 1, 'Deveria encontrar a relação Jogador-Eldrin');
    console.assert(relevantCtx.relevantQuests.length === 1, 'Deveria encontrar a quest ativa');
    console.assert(relevantCtx.relevantKnowledge.length >= 1, 'Deveria encontrar o fato sobre o santuário');
    console.assert(relevantCtx.relevantEvents.length >= 1, 'Deveria encontrar o evento do selo');
    console.assert(relevantCtx.inventories.length >= 1, 'Deveria encontrar as tochas do jogador');
    console.assert(relevantCtx.formattedSummary.includes('Eldrin'), 'Sumário deve incluir Eldrin');

    console.log('✓ getRelevantContext OK:\n\n' + relevantCtx.formattedSummary);

    // 9. Persistência em disco: recarrega do arquivo diretamente
    console.log('[9] Testando persistência física em disco...');
    const newStore = new FilePersistentMemoryStore(testDir);
    const newMemory = new MemoryManager(newStore);
    const diskSnapshot = await newMemory.getCampaign(campaignId);
    console.assert(diskSnapshot?.name === 'A Fronteira Esquecida', 'Erro na recuperação do disco');
    console.log('✓ Persistência Física em Disco OK');

    // Limpeza dos dados de teste
    await memory.clearCampaignData(campaignId);
    await fs.rm(testDir, { recursive: true, force: true });

    console.log('--- TODOS OS TESTES PASSARAM COM SUCESSO! ---');
  } catch (err) {
    console.error('FALHA NOS TESTES:', err);
    process.exit(1);
  }
}

runTests();
