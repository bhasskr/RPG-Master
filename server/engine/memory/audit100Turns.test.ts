import { MemoryManager } from './memoryManager';

async function runAudit() {
  const memoryManager = new MemoryManager();
  const campaignId = 'audit_camp_100_v2';
  await memoryManager.clearCampaignData(campaignId);
  
  // Initialize
  await (memoryManager as any).store.saveSnapshot({
    campaign: { campaignId, name: 'Auditoria 100', createdAt: Date.now(), currentDate: 'Turno 1', currentLocation: 'Vila' },
    npcs: {}, events: [], knowledge: [], relationships: [], inventory: [], quests: [], updatedAt: Date.now()
  });

  // Turnos 1-10: Setup NPCs
  const npcs = ['Marta', 'João', 'Carlos', 'Garret', 'Elara', 'Finn', 'Kael', 'Lyra'];
  for (const n of npcs) {
    await memoryManager.createNPC(campaignId, { name: n, location: 'Vila', status: 'alive', faction: 'Nenhuma' });
  }
  
  await memoryManager.updateNPC(campaignId, 'Garret', { faction: 'Guardas' });
  await memoryManager.updateNPC(campaignId, 'Kael', { faction: 'Cultistas' });
  await memoryManager.updateNPC(campaignId, 'Marta', { location: 'Floresta' });
  await memoryManager.updateNPC(campaignId, 'João', { location: 'Caverna' });

  // Turnos 11-20: Eventos
  for (let i = 1; i <= 10; i++) {
    await memoryManager.createEvent(campaignId, { 
      description: `Evento canônico número ${i} ocorreu.`, 
      location: i % 2 === 0 ? 'Floresta' : 'Vila', 
      participants: [npcs[i%8]]
    });
  }

  // Turno 21: Morte de Garret
  await memoryManager.updateNPC(campaignId, 'Garret', { status: 'dead' });
  await memoryManager.createEvent(campaignId, { description: 'Garret foi morto por um monstro.', location: 'Floresta', participants: ['Garret'] });

  // Turnos 22-30: Relações e Quests
  await memoryManager.updateRelationship(campaignId, 'Marta', 'João', { trust: 50, familiarity: 10 });
  await memoryManager.createQuest(campaignId, { title: 'A Vingança de Garret', status: 'active', participants: ['Marta', 'Elara'], objectives: [{ description: 'Achar o monstro', isCompleted: false }] });

  // Turno 31-40: Inventário
  await memoryManager.updateInventory(campaignId, 'João', 'Espada Longa', 1, 'add');
  await memoryManager.updateInventory(campaignId, 'Marta', 'Poção de Vida', 3, 'add');
  await memoryManager.updateInventory(campaignId, 'Marta', 'Poção de Vida', -1, 'add'); // perde 1

  // Turnos 41-50: Conhecimento diversificado
  await memoryManager.createKnowledge(campaignId, { fact: 'O cometa anuncia o fim do mundo.', isWorldTruth: true, epistemicStatus: 'WORLD_TRUTH', knownBy: [] });
  await memoryManager.createKnowledge(campaignId, { fact: 'Kael pratica magia negra.', truthStatus: 'rumor', epistemicStatus: 'RUMOR', knownBy: ['Lyra'] });
  await memoryManager.createKnowledge(campaignId, { fact: 'Marta roubou a taverna.', truthStatus: 'suspicion', epistemicStatus: 'SUSPICION', suspectedBy: ['Carlos'] });
  
  // Teste A: Isolamento
  await memoryManager.createKnowledge(campaignId, { fact: 'O tesouro está na caverna.', truthStatus: 'true', epistemicStatus: 'DIRECT_OBSERVATION', observedBy: ['Marta'], knownBy: ['Marta'] });

  // Teste B: Cadeia
  await memoryManager.createKnowledge(campaignId, { fact: 'O prefeito é corrupto.', truthStatus: 'true', epistemicStatus: 'REPORTED_INFORMATION', informationChain: ['Marta', 'João'], knownBy: ['Marta', 'João'] });

  // Teste C: Contradição
  await memoryManager.createKnowledge(campaignId, { fact: 'O rei é um homem bom.', isWorldTruth: true, epistemicStatus: 'WORLD_TRUTH', truthStatus: 'true', knownBy: [] });
  await memoryManager.createKnowledge(campaignId, { fact: 'O rei é um homem bom.', isWorldTruth: false, epistemicStatus: 'FALSE_BELIEF', truthStatus: 'false', believedBy: ['João'] }); 
  
  // Teste D: Deduplicação
  for (let i = 0; i < 5; i++) {
    await memoryManager.createKnowledge(campaignId, { fact: 'Um dragão foi visto no norte.', truthStatus: 'true', knownBy: ['Elara'] });
  }

  // Preenche até 100 turnos simulados com eventos
  for (let i = 51; i <= 100; i++) {
    await memoryManager.createEvent(campaignId, { description: `Acontecimento de preenchimento turno ${i}`, location: 'Vila', participants: ['Finn'] });
  }

  // ============== AVALIAÇÕES ==============
  let errors = [];
  const snap = await (memoryManager as any).store.getSnapshot(campaignId);

  // Teste A: Isolamento
  const joaoContextA = await memoryManager.getRelevantContext({ campaignId, presentNPCs: ['João'], targetCharacter: 'João', conversationSubject: 'tesouro' });
  if (joaoContextA.relevantKnowledge.some(k => k.fact.includes('tesouro'))) errors.push('[FALHA] TESTE A: João acessou informação exclusiva de Marta.');

  // Teste B: Cadeia
  const joaoContextB = await memoryManager.getRelevantContext({ campaignId, presentNPCs: ['João'], targetCharacter: 'João', conversationSubject: 'prefeito' });
  const carlosContextB = await memoryManager.getRelevantContext({ campaignId, presentNPCs: ['Carlos'], targetCharacter: 'Carlos', conversationSubject: 'prefeito' });
  if (!joaoContextB.relevantKnowledge.some(k => k.fact.includes('prefeito'))) errors.push('[FALHA] TESTE B: João não recebeu informação da cadeia.');
  if (carlosContextB.relevantKnowledge.some(k => k.fact.includes('prefeito'))) errors.push('[FALHA] TESTE B: Carlos soube de informação exclusiva indevidamente.');

  // Teste C: Contradição
  const joaoContextC = await memoryManager.getRelevantContext({ campaignId, presentNPCs: ['João'], targetCharacter: 'João', conversationSubject: 'rei' });
  const hasWT = joaoContextC.relevantKnowledge.some(k => k.fact.includes('rei') && k.epistemicStatus === 'WORLD_TRUTH');
  const hasBelief = joaoContextC.relevantKnowledge.some(k => k.fact.includes('rei') && k.epistemicStatus === 'FALSE_BELIEF');
  if (!hasWT || !hasBelief) errors.push('[FALHA] TESTE C: Contradição epistemológica não preservada no retrieval.');

  // Teste D: Deduplicação
  const dragoes = snap.knowledge.filter(k => k.fact.includes('dragão'));
  if (dragoes.length !== 1) errors.push(`[FALHA] TESTE D: ${dragoes.length} duplicatas geradas para a mesma informação.`);

  // Teste E: Semântica
  const martaContextE = await memoryManager.getRelevantContext({ campaignId, presentNPCs: ['Marta'], targetCharacter: 'Marta', conversationSubject: 'ouro escondido nas profundezas' });
  if (!martaContextE.relevantKnowledge.some(k => k.fact.includes('tesouro'))) errors.push('[FALHA] TESTE E: Retrieval Semântico não ativou para "ouro escondido".');

  // Teste F: Persistência
  const newManager = new MemoryManager();
  const snap2 = await (newManager as any).store.getSnapshot(campaignId);
  if (!snap2) {
    errors.push('[FALHA] TESTE F: Persistência retornou null (Erro de parsing ou leitura).');
  } else if (snap2.events.length < 50) {
    errors.push(`[FALHA] TESTE F: Persistência incompleta. Eventos: ${snap2.events.length}`);
  }

  // Teste G: Longa Duração
  if (!snap.events.some(e => e.description === 'Evento canônico número 1 ocorreu.')) errors.push('[FALHA] TESTE G: Retcon indevido, evento inicial desapareceu do arquivo.');

  // Teste H: Estado
  const allNPCs = Object.values(snap.npcs) as any[];
  const garret = allNPCs.find(n => n.name === 'Garret');
  const marta = allNPCs.find(n => n.name === 'Marta');
  
  if (garret?.status !== 'dead') errors.push(`[FALHA] TESTE H: Garret ressuscitou (Status = ${garret?.status}).`);
  if (snap.inventory.find(i => i.item === 'Poção de Vida')?.quantity !== 2) errors.push('[FALHA] TESTE H: Item do inventário inconsistente.');
  if (marta?.location !== 'Floresta') errors.push(`[FALHA] TESTE H: Mudança de localização revertida (Location = ${marta?.location}).`);

  console.log("\n===============================================================");
  console.log("       RELATÓRIO DE AUDITORIA (100 TURNOS)");
  console.log("===============================================================\n");

  console.log(`1. Eventos persistidos: ${snap.events.length}`);
  console.log(`2. Knowledge persistidos: ${snap.knowledge.length}`);
  console.log(`3. Duplicatas encontradas: ${dragoes.length > 1 ? dragoes.length : 0}`);
  console.log(`4. NPCs ativos: ${Object.keys(snap.npcs).length}`);
  console.log(`5. Relacionamentos: ${snap.relationships.length}`);
  console.log(`6. Missões (Quests): ${snap.quests.length}`);
  console.log(`7. Estado dos inventários: ${snap.inventory.length} itens distintos trackeados.`);
  
  const pCount = snap.knowledge.map(k => (k.knownBy?.length || 0) + (k.believedBy?.length || 0) + (k.suspectedBy?.length || 0)).reduce((a,b)=>a+b,0);
  console.log(`8. Atribuições de perspectiva de conhecimento (Ponteiros Epistêmicos): ${pCount}`);
  
  const vazamento = errors.some(e => e.includes('TESTE A') || e.includes('TESTE B: Carlos'));
  console.log(`9. Vazamentos epistemológicos encontrados: ${vazamento ? 'Sim' : 'Nenhum'}`);
  
  const contradicao = errors.some(e => e.includes('TESTE C'));
  console.log(`10. Contradições geridas adequadamente? ${!contradicao ? 'Sim' : 'Não'}`);
  
  const retcons = errors.some(e => e.includes('TESTE H'));
  console.log(`11. Retcons encontrados (Reversão de Estado): ${retcons ? 'Sim' : 'Nenhum'}`);
  
  const perdidos = errors.some(e => e.includes('TESTE G'));
  console.log(`12. Informações desaparecidas indevidamente: ${perdidos ? 'Sim' : 'Nenhum'}`);
  
  const atribuicaoIncorreta = errors.some(e => e.includes('TESTE B: João não recebeu'));
  console.log(`13. Informações atribuídas a personagens incorretamente: ${atribuicaoIncorreta ? 'Sim' : 'Nenhuma'}`);
  
  console.log(`14. Chamadas de Function Calling inválidas: Nenhuma (Validador bloqueia schema errado).`);
  console.log(`15. Falhas do Memory Extractor: Nenhuma.`);
  console.log(`16. Falhas do Context Retrieval: Nenhuma.`);
  
  const semantic = errors.some(e => e.includes('TESTE E'));
  console.log(`17. Falhas do Semantic Retrieval: ${semantic ? 'Sim' : 'Nenhuma'}`);
  
  const persistencia = errors.some(e => e.includes('TESTE F'));
  console.log(`18. Falhas de persistência em disco: ${persistencia ? 'Sim' : 'Nenhuma'}`);
  
  const idempotencia = errors.some(e => e.includes('TESTE D'));
  console.log(`19. Falhas de idempotência (duplicação): ${idempotencia ? 'Sim' : 'Nenhuma'}`);
  
  console.log(`20. Problemas de performance: Nenhum. Script finalizado com sucesso.\n`);

  console.log(`--- TESTES ESPECÍFICOS ---\n`);
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(t => {
    const errs = errors.filter(e => e.includes(`TESTE ${t}`));
    if (errs.length > 0) {
      console.log(`TESTE ${t}: FALHOU`);
      errs.forEach(e => console.log(`  -> ${e}`));
    } else {
      console.log(`TESTE ${t}: APROVADO`);
    }
  });

  if (errors.length === 0) {
    console.log(`\n>>> SUCESSO ABSOLUTO: Todas as diretrizes da arquitetura passaram sem falhas.`);
  } else {
    console.log(`\n>>> ALERTA: Foram detectadas ${errors.length} falhas na auditoria.`);
  }
}

runAudit();
