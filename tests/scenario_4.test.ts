import assert from 'node:assert';
import { MemoryValidator } from '../server/engine/memory/extractor/memoryValidator';
import { MemoryManager } from '../server/engine/memory/memoryManager';
import { MemoryExtractionResult } from '../server/engine/memory/extractor/types';

async function runScenario4() {
  const memoryManager = new MemoryManager();
  const campaignId = 'test_scenario_4';
  await memoryManager.clearCampaignData(campaignId);

  await (memoryManager as any).store.saveSnapshot({
    campaign: { campaignId, name: 'Scenario 4', createdAt: Date.now(), currentDate: 'Day 1', currentLocation: 'Vila' },
    npcs: {
      'npc-g': { id: 'npc-g', name: 'NPC G', status: 'alive', location: 'Vila', faction: '', personalityNotes: '', goals: [], secrets: [], inventory: [], relationships: {} },
    },
    events: [], knowledge: [], relationships: [], inventory: [], quests: [], updatedAt: Date.now()
  });

  console.log('Proposta de extração: alterar relacionamento sem associar a um Evento.');

  const proposedExtraction: MemoryExtractionResult = {
    events: [], 
    knowledgeChanges: [],
    relationshipChanges: [
      {
        characterA: 'Player',
        characterB: 'NPC G',
        trustChange: -10,
        hostilityChange: +5,
        familiarityChange: 0,
        reason: 'Jogador insultou o NPC levemente, mas não gerou evento.',
      }
    ],
    inventoryChanges: [],
    questChanges: [],
    npcChanges: [],
    worldChanges: [],
    conflicts: []
  };

  const validationResult = await MemoryValidator.validateAndApply(campaignId, proposedExtraction, memoryManager, 1);

  console.log('\n--- Validation Result ---');
  console.log(JSON.stringify(validationResult.validRelationships, null, 2));

  // The test expects that it should be rejected if it lacks an event.
  const relChange = validationResult.validRelationships[0];
  
  if (relChange) {
     assert.fail('A mudança de relacionamento foi APROVADA sem referenciar um Event.id existente. Isso viola a regra do cenário 4.');
  } else {
     console.log('✅ Mudança de relacionamento sem evento foi rejeitada!');
  }
}

runScenario4().catch(e => {
  console.error('❌ CENÁRIO 4 FALHOU:', e.message);
  process.exit(1);
});
