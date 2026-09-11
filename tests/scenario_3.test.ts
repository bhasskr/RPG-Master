import assert from 'node:assert';
import { MemoryManager } from '../server/engine/memory/memoryManager';

async function runScenario3() {
  const memoryManager = new MemoryManager();
  const campaignId = 'test_scenario_3';
  await memoryManager.clearCampaignData(campaignId);

  // Initialize
  await (memoryManager as any).store.saveSnapshot({
    campaign: { campaignId, name: 'Scenario 3', createdAt: Date.now(), currentDate: 'Day 1', currentLocation: 'Taverna' },
    npcs: {
      'npc-f': { id: 'npc-f', name: 'NPC F', status: 'alive', location: 'Rua', faction: '', personalityNotes: '', goals: [], secrets: [], inventory: [], relationships: {} },
    },
    events: [], knowledge: [], relationships: [], inventory: [], quests: [], updatedAt: Date.now()
  });

  console.log('Turn 1: Event narrativamente crítico com vocabulário neutro.');
  
  // Create an old important event
  const revengeEvent = await memoryManager.createEvent(campaignId, {
    description: 'NPC F jura que fará o jogador pagar por seus crimes.',
    location: 'Taverna',
    participants: ['Player', 'NPC F'],
    timestamp: Date.now() - 100000, // old
    consequences: ['NPC F tornou-se um inimigo mortal'],
  });

  console.log('Turn 2: Vários turnos de recheio (conversas triviais).');

  // Let's create multiple recent events that might dilute it.
  for (let i = 0; i < 15; i++) {
    await memoryManager.createEvent(campaignId, {
      description: 'O jogador come pão na padaria com o padeiro.',
      location: 'Padaria',
      participants: ['Player', 'Padeiro'],
      timestamp: Date.now() - (10000 - i * 100),
      consequences: [],
    });
  }
  
  // And an event with somewhat similar vocabulary to trick semantic search if it relies solely on words
  await memoryManager.createEvent(campaignId, {
    description: 'O padeiro jura que o pão vai fazer o jogador pagar bem caro.', // similar words
    location: 'Padaria',
    participants: ['Player', 'Padeiro'],
    timestamp: Date.now() - 5000,
    consequences: [],
  });

  console.log('Turn 3: Jogador reencontra NPC F.');
  
  // Get context
  const ctx = await memoryManager.getRelevantContext({
    campaignId,
    playerCharacter: 'Player',
    targetCharacter: 'NPC F', // Narrator answers as NPC F
    presentNPCs: ['NPC F'],
    conversationSubject: 'olá como vai você', // Semantic query is unrelated to the old revenge
  });

  const ctxSummary = ctx.formattedSummary;
  
  console.log('\n--- Context for NPC F ---');
  console.log(ctxSummary);

  // Assert:
  assert.ok(ctxSummary.includes(revengeEvent.id) || ctxSummary.includes('NPC F jura'), 'O evento de vingança deve estar no contexto ao encontrar NPC F');

  console.log('✅ CENÁRIO 3 PASSOU!');
}

runScenario3().catch(e => {
  console.error('❌ CENÁRIO 3 FALHOU:', e);
  process.exit(1);
});
