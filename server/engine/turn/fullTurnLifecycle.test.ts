import { TurnProcessor } from './turnProcessor';
import { MemoryManager } from '../memory/memoryManager';
import { GameStateManager } from '../gameState/gameStateManager';
import { NarratorService } from '../narrator/narratorService';
import { extractMemoryChanges } from '../memory/extractor/memoryExtractor';
import { executeMemoryToolCall } from '../narrator/memoryTools';

async function runTest() {
  console.log("=== INICIANDO AUDITORIA DO FULL TURN LIFECYCLE ===");
  
  const gameStateManager = new GameStateManager();
  const campaignId = gameStateManager.createCampaign().campaignId;
  const memoryManager = new MemoryManager();
  await memoryManager.clearCampaignData(campaignId);
  const narratorService = new NarratorService();

  const processor = new TurnProcessor(memoryManager, gameStateManager, narratorService);

  // Setup initial world state
  await (memoryManager as any).store.saveSnapshot({
    campaign: { campaignId, name: 'Lifecycle Test', createdAt: Date.now(), currentDate: 'Day 1', currentLocation: 'Vila' },
    npcs: {}, events: [], knowledge: [], relationships: [], inventory: [], quests: [], updatedAt: Date.now()
  });

  await memoryManager.createNPC(campaignId, { name: 'Marta', location: 'Vila', status: 'alive', faction: 'Nenhuma', personalityNotes: '', goals: [], secrets: [], inventory: [], relationships: {} });
  await memoryManager.createNPC(campaignId, { name: 'João', location: 'Vila', status: 'alive', faction: 'Nenhuma', personalityNotes: '', goals: [], secrets: [], inventory: [], relationships: {} });
  await memoryManager.createNPC(campaignId, { name: 'Carlos', location: 'Vila', status: 'alive', faction: 'Nenhuma', personalityNotes: '', goals: [], secrets: [], inventory: [], relationships: {} });

  // Marta sabe um segredo
  await memoryManager.createKnowledge(campaignId, {
    fact: 'O Duque está transportando armas secretamente.',
    truthStatus: 'true',
    epistemicStatus: 'DIRECT_OBSERVATION',
    observedBy: ['Marta'],
    knownBy: ['Marta'], source: '', suspectedBy: [], reliability: 1
  });

  gameStateManager.updateWorldState(campaignId, { currentLocation: 'Vila' });
  gameStateManager.upsertNPC(campaignId, { id: 'm', name: 'Marta', role: 'NPC', status: 'alive' });
  gameStateManager.upsertNPC(campaignId, { id: 'j', name: 'João', role: 'NPC', status: 'alive' });
  gameStateManager.upsertNPC(campaignId, { id: 'c', name: 'Carlos', role: 'NPC', status: 'alive' });

  let errors = [];

  // ==========================================
  // TESTE A: NPC NÃO SABE
  // ==========================================
  console.log("\n--- TESTE A: NPC NÃO SABE ---");
  const turn2 = await processor.processTurn(campaignId, 'Falo com João sobre qualquer coisa.');
  if (turn2.contextSummary.includes('armas') || turn2.contextSummary.includes('Duque')) {
    errors.push('[FALHA] TESTE A: Vazamento epistemológico. João recebeu acesso ao segredo de Marta no contextSummary.');
  }
  const joaoKnowsA = await memoryManager.getKnowledgeForCharacter(campaignId, 'João');
  if (joaoKnowsA.some(k => k.fact.includes('armas'))) {
    errors.push('[FALHA] TESTE A: João conhecia o segredo no banco.');
  }

  // ==========================================
  // TESTE B: TRANSMISSÃO
  // ==========================================
  console.log("\n--- TESTE B: TRANSMISSÃO ---");
  const turn3 = await processor.processTurn(campaignId, 'Digo a João: "O Duque está transportando armas secretamente!"');
  const snap3 = await memoryManager.getSnapshot(campaignId);
  const armasFactB = snap3.knowledge.find(k => k.fact.includes('armas'));
  if (!armasFactB?.knownBy?.includes('João')) {
    errors.push('[FALHA] TESTE B: Memory Extractor/Narrator não atribuiu o conhecimento a João após ele ouvir explicitamente.');
  }

  // ==========================================
  // TESTE C: NPC NÃO RECEBE POR PROXIMIDADE
  // ==========================================
  console.log("\n--- TESTE C: NPC NÃO RECEBE POR PROXIMIDADE ---");
  const turnC = await processor.processTurn(campaignId, 'Digo para mim mesmo: "O Duque está transportando armas secretamente", mas ninguém ouviu (João e Carlos estão longe).');
  const snapC = await memoryManager.getSnapshot(campaignId);
  const armasFactC = snapC.knowledge.find(k => k.fact.includes('armas'));
  if (armasFactC?.knownBy?.includes('Carlos')) {
    errors.push('[FALHA] TESTE C: Carlos aprendeu a informação indevidamente só por estar na cena.');
  }

  // ==========================================
  // TESTE D: RNG OBRIGATÓRIO
  // ==========================================
  console.log("\n--- TESTE D: RNG OBRIGATÓRIO ---");
  const turn4 = await processor.processTurn(campaignId, 'Eu tento roubar o selo do prefeito escondido na taverna.');
  const rngToolCalls = turn4.toolCalls.filter(t => t.name === 'roll_check' || t.name === 'roll_d20');
  if (rngToolCalls.length === 0) {
    errors.push('[FALHA] TESTE D: Gemini não solicitou rolar dados para ação arriscada explicitada com "Eu tento".');
  }

  // ==========================================
  // TESTE E: FIDELIDADE DO RNG
  // ==========================================
  console.log("\n--- TESTE E: FIDELIDADE DO RNG ---");
  if (turn4.diceResults.length > 0) {
     const roll = turn4.diceResults[0];
     console.log(`   [OK] Rolagem detectada: ${roll.skill || 'D20'} -> Resultado: ${roll.mechanicalResult}`);
  } else {
     errors.push('[FALHA] TESTE E: Nenhum resultado de dado registrado no turno.');
  }

  // ==========================================
  // TESTE F: MECÂNICA NÃO DEPENDE DO EXTRACTOR
  // ==========================================
  console.log("\n--- TESTE F: MECÂNICA INDEPENDENTE ---");
  const turnF = await processor.processTurn(campaignId, 'Compro uma poção de cura e coloco no inventário.');
  const snapF = await memoryManager.getSnapshot(campaignId);
  const hasPotion = snapF.inventory.some(i => i.item.toLowerCase().includes('poção'));
  if (!hasPotion) {
     errors.push('[FALHA] TESTE F: Inventário não atualizado pelo Narrador via tool call.');
  }

  console.log("\n==============================================");
  console.log("            RESULTADOS DA AUDITORIA           ");
  console.log("==============================================\n");

  if (errors.length === 0) {
    console.log("A. Teste A - NPC Não Sabe: [OK]");
    console.log("B. Teste B - Transmissão: [OK]");
    console.log("C. Teste C - Proximidade (Sem Recepção): [OK]");
    console.log("D. Teste D - RNG Obrigatório: [OK]");
    console.log("E. Teste E - Fidelidade do RNG: [OK]");
    console.log("F. Teste F - Mecânica Independente (Tools do Narrador): [OK]");
    console.log("\n>>> FULL TURN LIFECYCLE APROVADO <<<");
  } else {
    console.log("FORAM ENCONTRADOS ERROS:");
    errors.forEach(e => console.log(e));
  }
}

runTest();
