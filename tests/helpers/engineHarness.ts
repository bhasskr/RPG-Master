import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GameEngine } from '../../server/engine/gameEngine';
import { GameStateManager } from '../../server/engine/gameState/gameStateManager';
import { MemoryManager } from '../../server/engine/memory/memoryManager';
import { FilePersistentMemoryStore } from '../../server/engine/memory/filePersistentStore';
import { NarratorService } from '../../server/engine/narrator/narratorService';

export const ai = require('./fake-genai.cjs');

export function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

export async function within<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Barreira não progrediu')), 5000);
    })]);
  } finally { clearTimeout(timer!); }
}

export async function withEngine(run: (h: {
  engine: GameEngine; memory: MemoryManager; store: FilePersistentMemoryStore;
  state: GameStateManager; memoryDir: string; stateDir: string; drain: () => Promise<void>;
}) => Promise<void>) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'engine_'));
  const memoryDir = path.join(base, 'memory');
  const stateDir = path.join(base, 'state');
  ai.reset();
  const store = new FilePersistentMemoryStore(memoryDir);
  const memory = new MemoryManager(store);
  const state = new GameStateManager(stateDir);
  const engine = new GameEngine(memory, state, new NarratorService());
  const pending: Promise<void>[] = [];
  const original = (engine as any).processPostTurnMemoryExtraction.bind(engine);
  // Observação do término: o método real, extractor e validator continuam executando.
  (engine as any).processPostTurnMemoryExtraction = (...args: any[]) => {
    const work = original(...args);
    pending.push(work);
    return work;
  };
  const drain = async () => { await within(Promise.all(pending)); };
  try {
    await run({ engine, memory, store, state, memoryDir, stateDir, drain });
  } finally {
    try { await drain(); }
    finally {
      ai.reset();
      await fs.rm(base, { recursive: true, force: true });
    }
  }
}

export async function runCases(cases: Record<string, () => Promise<void>>) {
  let passed = 0;
  let failed = 0;
  for (const [guarantee, run] of Object.entries(cases)) {
    try { await run(); passed++; console.log(`PASS: ${guarantee}`); }
    catch (error) { failed++; console.error(`FAIL: ${guarantee}`, error); }
  }
  console.log(`CASOS: ${passed} passaram; ${failed} falharam.`);
  (globalThis as any).__RPG_SUITE_COMPLETE__ = true;
  assert.equal(failed, 0, 'Garantias não atendidas; não converter regressões abertas em aprovação');
}
