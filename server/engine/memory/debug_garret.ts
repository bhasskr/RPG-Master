import { MemoryManager } from './memoryManager';

async function run() {
  const m = new MemoryManager();
  const s = await (m as any).store.getSnapshot('audit_camp_100');
  console.log("Garret:", s?.npcs['Garret'] || s?.npcs['garret'] || s?.npcs['npc_Garret']);
  console.log("NPC Keys:", Object.keys(s?.npcs || {}));
}
run();
