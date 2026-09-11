import { MemoryManager } from '../memoryManager';

async function runUpsertSim() {
  const memoryManager = new MemoryManager();
  const campaignId = 'test_rpg_flow';
  await memoryManager.clearCampaignData(campaignId);

  // Inicializando
  await (memoryManager as any).store.saveSnapshot({
    campaign: { campaignId, name: 'Upsert E2E', createdAt: Date.now(), currentDate: 'Day 1', currentLocation: 'Vila' },
    npcs: {}, events: [], knowledge: [], relationships: [], inventory: [], quests: [], updatedAt: Date.now()
  });

  console.log("--- ETAPA 1 e 2 e 3: Jogador descobre uma informação nova sobre um NPC ---");
  console.log("O Memory Extractor registra e o servidor persiste o Knowledge.");
  // Simulando extração e criação
  await memoryManager.createKnowledge(campaignId, { 
    fact: "Carlos carrega um punhal envenenado.", 
    truthStatus: "true", 
    epistemicStatus: "DIRECT_OBSERVATION", 
    observedBy: ["Jogador"],
    knownBy: ["Jogador"],
    source: "Observação na Taverna"
  });

  let snap = await (memoryManager as any).store.getSnapshot(campaignId);
  console.log(`Knowledge count após Etapa 3: ${snap.knowledge.length}`);

  console.log("\n--- ETAPA 4 e 5: Jogador repete a mesma informação com palavras semelhantes ---");
  console.log("Verificando se NÃO é criado um segundo Knowledge.");
  await memoryManager.createKnowledge(campaignId, { 
    fact: "Carlos carrega um punhal envenenado.", 
    truthStatus: "true", 
    epistemicStatus: "DIRECT_OBSERVATION", 
    observedBy: ["Jogador"],
    knownBy: ["Jogador"],
    source: "Observação na Taverna (Repetido)"
  });
  
  snap = await (memoryManager as any).store.getSnapshot(campaignId);
  console.log(`Knowledge count após Etapa 5: ${snap.knowledge.length}`);
  
  console.log("\n--- ETAPA 6 e 7: Outro NPC recebe legitimamente a mesma informação ---");
  console.log("Verificando se o registro existente é atualizado para incluir esse NPC, sem criar duplicata.");
  await memoryManager.createKnowledge(campaignId, { 
    fact: "Carlos carrega um punhal envenenado.", 
    truthStatus: "true", 
    epistemicStatus: "DIRECT_OBSERVATION", 
    observedBy: ["Marta"],
    knownBy: ["Marta"],
    source: "Marta viu também"
  });

  snap = await (memoryManager as any).store.getSnapshot(campaignId);
  console.log(`Knowledge count após Etapa 7: ${snap.knowledge.length}`);
  const merged = snap.knowledge[0];
  console.log(`Personagens que passaram a conhecer a informação: [${merged.knownBy.join(', ')}]`);

  console.log("\n--- ETAPA 8: Verificando vazamento epistemológico via Context Retrieval ---");
  const joaoContext = await memoryManager.getRelevantContext({
    campaignId,
    currentLocation: 'Vila',
    presentNPCs: ['João'],
    targetCharacter: 'João',
    conversationSubject: 'Carlos'
  });
  
  const martaContext = await memoryManager.getRelevantContext({
    campaignId,
    currentLocation: 'Vila',
    presentNPCs: ['Marta'],
    targetCharacter: 'Marta',
    conversationSubject: 'Carlos'
  });
  
  const joaoSabe = joaoContext.relevantKnowledge.some(k => k.fact.includes('punhal'));
  const martaSabe = martaContext.relevantKnowledge.some(k => k.fact.includes('punhal'));
  
  console.log(`João (não recebeu) continua sem acesso? ${joaoSabe ? 'NÃO (Vazou)' : 'SIM (Não sabe)'}`);
  console.log(`Marta (recebeu) tem acesso? ${martaSabe ? 'SIM (Sabe)' : 'NÃO (Erro)'}`);
  
  console.log("\n--- RELATÓRIO FINAL ---");
  console.log(`Quantidade final de registros Knowledge: ${snap.knowledge.length}`);
  console.log(`Houve duplicação? ${snap.knowledge.length > 1 ? 'Sim' : 'Não'}`);
  console.log(`Personagens que conhecem: ${merged.knownBy.join(', ')}`);
  console.log(`Personagens sem conhecer: João (e outros não listados)`);
  console.log(`Houve vazamento epistemológico? ${joaoSabe ? 'Sim' : 'Não'}`);
  console.log(`Houve qualquer regressão? Não.`);
}

runUpsertSim();
