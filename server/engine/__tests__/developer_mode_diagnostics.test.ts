/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameEngine } from '../gameEngine';
import { GameStateManager } from '../gameState/gameStateManager';
import { MemoryManager } from '../memory/memoryManager';
import { FilePersistentMemoryStore } from '../memory/filePersistentStore';
import path from 'path';

async function runDeveloperDiagnosticsTest() {
  console.log('===============================================================');
  console.log('TESTE: Developer Mode - Technical Diagnostics (Fase 1)');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  const testDir = path.join(process.cwd(), 'data', 'test_dev_mode_' + Date.now());
  const memoryStore = new FilePersistentMemoryStore(path.join(testDir, 'memory'));
  const memoryManager = new MemoryManager(memoryStore);
  const gameStateManager = new GameStateManager(path.join(testDir, 'gamestate'));

  const mockNarrator: any = {
    generateOpeningMessage: async () => ({ text: 'Oi', executedTools: [], diceRolls: [] }),
    generateMasterResponse: async () => ({ text: 'Ok', executedTools: [], diceRolls: [] }),
  };

  const gameEngine = new GameEngine(memoryManager, gameStateManager, mockNarrator);

  // 1. Validar endpoint de status / dados retornados pela GameEngine
  total++;
  console.log('[TESTE 1] Verificando estrutura e campos do EngineStatus...');
  const status = gameEngine.getStatus();

  if (
    typeof status.activeCampaignsCount === 'number' &&
    typeof status.memoryStoreType === 'string' &&
    typeof status.narratorModel === 'string' &&
    typeof status.isApiKeyConfigured === 'boolean'
  ) {
    console.log(' -> PASSED: EngineStatus contém campos reais esperados (activeCampaigns, memoryStore, narratorModel, isApiKeyConfigured).\n');
    passed++;
  } else {
    console.error(' -> FAILED: Campos do EngineStatus ausentes ou inválidos.\n', status);
  }

  // 2. Validar que nenhum segredo/API key ou dump privado é exposto no status
  total++;
  console.log('[TESTE 2] Garantindo que nenhum segredo ou API key é exposto no status...');
  const statusString = JSON.stringify(status);
  const containsRawSecret = statusString.includes('AIza') || statusString.includes('sk-') || statusString.includes('GEMINI_API_KEY');

  if (!containsRawSecret) {
    console.log(' -> PASSED: Nenhum secret ou API key exposto nos dados de status.\n');
    passed++;
  } else {
    console.error(' -> FAILED: Secret ou token detectado nos dados de status!\n');
  }

  // 3. Validar contagem de campanhas ativas refletindo criação real
  total++;
  console.log('[TESTE 3] Validando contagem de campanhas ativas em tempo real...');
  const initialCount = gameEngine.getStatus().activeCampaignsCount;
  await gameEngine.startNewCampaign({ title: 'Campanha de Diagnóstico' });
  const afterCount = gameEngine.getStatus().activeCampaignsCount;

  if (afterCount === initialCount + 1) {
    console.log(` -> PASSED: Contagem de campanhas ativas atualizada com sucesso (${initialCount} -> ${afterCount}).\n`);
    passed++;
  } else {
    console.error(` -> FAILED: Contagem de campanhas inconsistente (${initialCount} vs ${afterCount}).\n`);
  }

  console.log('===============================================================');
  console.log(`RESULTADO DOS TESTES: ${passed}/${total} APROVADOS`);
  console.log('===============================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runDeveloperDiagnosticsTest().catch((err) => {
  console.error('Erro nos testes de diagnóstico:', err);
  process.exit(1);
});
