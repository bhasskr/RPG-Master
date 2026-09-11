import assert from 'node:assert';
import { MemoryManager } from '../server/engine/memory/memoryManager';

async function runScenario2() {
  const memoryManager = new MemoryManager();
  const campaignId = 'test_scenario_2';
  await memoryManager.clearCampaignData(campaignId);

  // Initialize
  await (memoryManager as any).store.saveSnapshot({
    campaign: { campaignId, name: 'Scenario 2', createdAt: Date.now(), currentDate: 'Day 1', currentLocation: 'Quarto' },
    npcs: {
      'npc-d': { id: 'npc-d', name: 'NPC D', status: 'alive', location: 'Quarto', faction: '', personalityNotes: '', goals: [], secrets: [], inventory: [], relationships: {} },
      'npc-e': { id: 'npc-e', name: 'NPC E', status: 'alive', location: 'Salão', faction: '', personalityNotes: '', goals: [], secrets: [], inventory: [], relationships: {} },
    },
    events: [], knowledge: [], relationships: [], inventory: [], quests: [], updatedAt: Date.now()
  });

  console.log('Turn 1: Em cena privada, NPC D revela ser filho ilegítimo do rei.');
  
  const secretKnowledge = await memoryManager.createKnowledge(campaignId, {
    fact: 'NPC D é o filho ilegítimo do rei.',
    truthStatus: 'true',
    epistemicStatus: 'DIRECT_OBSERVATION', // or WORLD_TRUTH but restricted
    source: 'NPC D',
    knownBy: ['NPC D', 'Player'], // Somente eles sabem
  });

  const snap = await (memoryManager as any).store.getSnapshot(campaignId);
  const secret = snap.knowledge.find((k: any) => k.id === secretKnowledge.id);
  
  assert.ok(secret.knownBy.includes('Player') && secret.knownBy.includes('NPC D'), 'KnownBy deve conter Jogador e NPC D');
  assert.ok(!secret.knownBy.includes('NPC E'), 'NPC E não pode saber');

  console.log('Turn 2 & 3: Jogador pergunta a NPC E algo sobre linhagem real (tentando forçar vazamento).');

  const ctx = await memoryManager.getRelevantContext({
    campaignId,
    playerCharacter: 'Player',
    targetCharacter: 'NPC E', // Retrieving context for NPC E's response
    presentNPCs: ['NPC E'],
    conversationSubject: 'linhagem real filho ilegítimo', // Query semanticamente parecida
  });

  const ctxSummary = ctx.formattedSummary;
  
  console.log('\n--- Context for NPC E ---');
  console.log(ctxSummary);

  assert.ok(!ctxSummary.includes('filho ilegítimo do rei'), 'O contexto para NPC E NÃO deve conter o segredo de NPC D, mesmo com query parecida.');

  console.log('✅ CENÁRIO 2 PASSOU!');
}

runScenario2().catch(e => {
  console.error('❌ CENÁRIO 2 FALHOU:', e);
  process.exit(1);
});
