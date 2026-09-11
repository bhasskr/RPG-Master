import { MemoryManager } from './memoryManager';

async function run() {
  const m = new MemoryManager();
  const s = await (m as any).store.getSnapshot('audit_camp_100');
  console.log("Snap2 events length:", s?.events?.length);
  const npcs = (s?.npcs || {}) as Record<string, any>;
  const garret = Object.values(npcs).find((n: any) => n.name === 'Garret');
  console.log("Garret status:", garret?.status);
  const marta = Object.values(npcs).find((n: any) => n.name === 'Marta');
  console.log("Marta location:", marta?.location);
}
run();
