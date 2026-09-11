import { MemoryManager } from '../memoryManager';
import { extractDeterministicMemoryChanges } from './memoryExtractor';

async function runUpsertE2ETest() {
  const memoryManager = new MemoryManager();
  const campaignId = 'test_upsert_e2e';
  await memoryManager.clearCampaignData(campaignId);

  // Initialize
  await (memoryManager as any).store.saveSnapshot({
    campaign: { campaignId, name: 'Upsert E2E Test', createdAt: Date.now(), currentDate: 'Day 1', currentLocation: 'Vila' },
    npcs: {}, events: [], knowledge: [], relationships: [], inventory: [], quests: [], updatedAt: Date.now()
  });

  console.log(`\n--- TURNO 1: Jogador descobre uma informação sobre Carlos ---`);
  // Passo 1 & 2 & 3: Jogador descobre informação -> Memory Extractor -> Persistir
  const changes1 = await extractDeterministicMemoryChanges({
    campaignId,
    turn: 1,
    playerAction: "Jogador ouve que Carlos tem uma cicatriz no rosto.",
    finalNarrative: "O jogador escuta um morador fofocando que Carlos ganhou uma cicatriz horrível no rosto.",
    currentLocation: "Taverna",
    toolsCalled: [
      {
        name: 'create_knowledge',
        args: { fact: 'Carlos tem uma cicatriz no rosto.', knownBy: ['player'], source: 'Morador fofoqueiro' },
        result: { id: 'k1' }
      }
    ]
  });
  
  if (changes1.knowledgeChanges) {
    for (const k of changes1.knowledgeChanges) {
       await memoryManager.createKnowledge(campaignId, {
         fact: k.fact,
         truthStatus: k.truthStatus || 'true',
         knownBy: k.knownBy,
         suspectedBy: k.suspectedBy,
         epistemicStatus: k.epistemicStatus as any,
         source: k.source || 'Morador fofoqueiro'
       });
    }
  }

  let snap = await (memoryManager as any).store.getSnapshot(campaignId);
  console.log(`Knowledge count após Turno 1: ${snap.knowledge.length}`);

  console.log(`\n--- TURNO 2: Jogador repete a mesma informação (palavras semelhantes) ---`);
  const changes2 = await extractDeterministicMemoryChanges({
    campaignId,
    turn: 2,
    playerAction: "Jogador repete que Carlos possui uma cicatriz facial.",
    finalNarrative: "O jogador diz a si mesmo: Carlos tem uma cicatriz no rosto.",
    currentLocation: "Taverna",
    toolsCalled: [
      {
        name: 'create_knowledge',
        args: { fact: 'Carlos possui uma cicatriz facial.', knownBy: ['player'], source: 'Player' },
        result: { id: 'k2' }
      }
    ]
  });
  
  if (changes2.knowledgeChanges) {
    for (const k of changes2.knowledgeChanges) {
       await memoryManager.createKnowledge(campaignId, {
         fact: k.fact,
         truthStatus: k.truthStatus || 'true',
         knownBy: k.knownBy,
         suspectedBy: k.suspectedBy,
         epistemicStatus: k.epistemicStatus as any,
         source: k.source || 'Player'
       });
    }
  }

  snap = await (memoryManager as any).store.getSnapshot(campaignId);
  console.log(`Knowledge count após Turno 2 (esperado = 1): ${snap.knowledge.length}`);
  
  console.log(`\n--- TURNO 3: Marta também descobre a informação ---`);
  const changes3 = await extractDeterministicMemoryChanges({
    campaignId,
    turn: 3,
    playerAction: "Marta ouve a mesma fofoca.",
    finalNarrative: "O morador fofoqueiro conta para Marta que Carlos tem uma cicatriz no rosto.",
    currentLocation: "Taverna",
    toolsCalled: [
      {
        name: 'create_knowledge',
        args: { fact: 'Carlos tem uma cicatriz no rosto.', knownBy: ['marta'], source: 'Morador fofoqueiro' },
        result: { id: 'k3' }
      }
    ]
  });
  
  if (changes3.knowledgeChanges) {
    // Forçamos o detentor ser Marta para o teste
    for (const k of changes3.knowledgeChanges) {
       await memoryManager.createKnowledge(campaignId, {
         fact: k.fact,
         truthStatus: k.truthStatus || 'true',
         knownBy: ['marta'],
         suspectedBy: k.suspectedBy,
         epistemicStatus: k.epistemicStatus as any,
         source: 'Morador fofoqueiro'
       });
    }
  }

  snap = await (memoryManager as any).store.getSnapshot(campaignId);
  console.log(`Knowledge count após Turno 3 (esperado = 1): ${snap.knowledge.length}`);
  const merged = snap.knowledge[0];
  console.log(`Detentores do fato: ${merged.knownBy.join(', ')}`);

  console.log(`\n--- TURNO 4: Context Retrieval para 'joao' (NPC que NÃO sabe) ---`);
  const joaoContext = await memoryManager.getRelevantContext({
    campaignId,
    currentLocation: 'Taverna',
    presentNPCs: ['joao'],
    targetCharacter: 'joao',
    conversationSubject: 'Carlos'
  });
  
  console.log(`João sabe sobre a cicatriz? ${joaoContext.relevantKnowledge.some(k => k.fact.includes('cicatriz')) ? 'SIM (VAZAMENTO!)' : 'NÃO (OK)'}`);
  
  console.log(`\n--- TURNO 5: Context Retrieval para 'marta' (NPC que SABE) ---`);
  const martaContext = await memoryManager.getRelevantContext({
    campaignId,
    currentLocation: 'Taverna',
    presentNPCs: ['marta'],
    targetCharacter: 'marta',
    conversationSubject: 'Carlos'
  });
  
  console.log(`Marta sabe sobre a cicatriz? ${martaContext.relevantKnowledge.some(k => k.fact.includes('cicatriz')) ? 'SIM (OK)' : 'NÃO (FALHA!)'}`);
}
runUpsertE2ETest();
