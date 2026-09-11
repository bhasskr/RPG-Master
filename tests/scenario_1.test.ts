import assert from 'node:assert';
import { MemoryManager } from '../server/engine/memory/memoryManager';

async function runScenario1() {
  const memoryManager = new MemoryManager();
  const campaignId = 'test_scenario_1';
  await memoryManager.clearCampaignData(campaignId);

  // Initialize
  await (memoryManager as any).store.saveSnapshot({
    campaign: { campaignId, name: 'Scenario 1', createdAt: Date.now(), currentDate: 'Day 1', currentLocation: 'Vila' },
    npcs: {
      'npc-a': { id: 'npc-a', name: 'NPC A', status: 'alive', location: 'Vila', faction: '', personalityNotes: '', goals: [], secrets: [], inventory: [], relationships: {} },
      'npc-b': { id: 'npc-b', name: 'NPC B', status: 'alive', location: 'Vila', faction: '', personalityNotes: '', goals: [], secrets: [], inventory: [], relationships: {} },
      'npc-c': { id: 'npc-c', name: 'NPC C', status: 'alive', location: 'Vila', faction: '', personalityNotes: '', goals: [], secrets: [], inventory: [], relationships: {} },
    },
    events: [], knowledge: [], relationships: [], inventory: [], quests: [], updatedAt: Date.now()
  });

  console.log('Turn 1: NPC A kills NPC C pet, but tells NPC B it was a wolf.');
  
  // Knowledge real: NPC A did it.
  const kReal = await memoryManager.createKnowledge(campaignId, {
    fact: 'NPC A matou o animal de estimação de NPC C.',
    truthStatus: 'true',
    epistemicStatus: 'WORLD_TRUTH',
    source: 'World',
    knownBy: ['NPC A'],
    observedBy: ['Player'],
  });

  // Knowledge fake (lie): Wolf did it.
  const kFake = await memoryManager.createKnowledge(campaignId, {
    fact: 'Um lobo matou o animal de estimação de NPC C.',
    truthStatus: 'false', // It's a lie
    epistemicStatus: 'BELIEF',
    source: 'NPC A',
    believedBy: ['NPC B'], // NPC B believes the lie
  });

  // Check state after turn 1
  let snap = await (memoryManager as any).store.getSnapshot(campaignId);
  const fakeBelievedBy = snap.knowledge.find((k: any) => k.id === kFake.id)?.believedBy || [];
  const realKnownBy = snap.knowledge.find((k: any) => k.id === kReal.id)?.knownBy || [];
  assert.ok(fakeBelievedBy.includes('NPC B'), 'NPC B should believe it was a wolf');
  assert.ok(realKnownBy.includes('NPC A'), 'NPC A knows the truth');

  console.log('Turn 3: Player tells NPC C the truth.');
  
  await memoryManager.updateKnowledge(campaignId, kReal.id, {
    believedBy: ['NPC C'], // NPC C now believes the player
  });

  // Check state after turn 3
  snap = await (memoryManager as any).store.getSnapshot(campaignId);
  const realBelievedByT3 = snap.knowledge.find((k: any) => k.id === kReal.id)?.believedBy || [];
  const realObservedByT3 = snap.knowledge.find((k: any) => k.id === kReal.id)?.observedBy || [];
  assert.ok(realBelievedByT3.includes('NPC C'), 'NPC C should believe the truth now');
  assert.ok(realObservedByT3.includes('Player'), 'Player observed the truth');

  console.log('Turn 4: Player enters a scene with NPC B and casually mentions the event.');
  
  const ctx = await memoryManager.getRelevantContext({
    campaignId,
    playerCharacter: 'Player',
    targetCharacter: 'NPC B', // We are retrieving context for the narrator acting as NPC B
    presentNPCs: ['NPC B'],
    conversationSubject: 'o animal de estimação de NPC C',
  });

  const ctxSummary = ctx.formattedSummary;
  
  // Assert: getRelevantContext for NPC B MUST NOT include the real version of the event.
  // It must only include what NPC B knows/believes.
  console.log('\n--- Context for NPC B ---');
  console.log(ctxSummary);

  assert.ok(ctxSummary.includes('Um lobo matou o animal'), 'Context should include the wolf lie');
  assert.ok(!ctxSummary.includes('NPC A matou o animal'), 'Context MUST NOT include the real event for NPC B, because NPC B does not know it.');
  
  console.log('✅ CENÁRIO 1 PASSOU!');
}

runScenario1().catch(e => {
  console.error('❌ CENÁRIO 1 FALHOU:', e);
  process.exit(1);
});
