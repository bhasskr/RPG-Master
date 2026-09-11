/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameEngine } from '../server/engine/gameEngine';
import { GameStateManager } from '../server/engine/gameState/gameStateManager';
import { MemoryManager } from '../server/engine/memory/memoryManager';
import { NarratorService } from '../server/engine/narrator/narratorService';
import { generateProceduralNarrative, generateDeterministicRollNarrative } from '../server/engine/narrator/fallbackNarrative';

async function runTests() {
  console.log('=== INICIANDO TESTES DE RESILIÊNCIA E FLUXO DO NARRADOR ===');
  let passed = 0;
  let total = 0;

  // Teste 1: Procedural fallback em caso de indisponibilidade
  total++;
  try {
    const fallbackText = generateProceduralNarrative({
      campaignId: 'test-camp-1',
      currentUserInput: 'Eu examino as gavetas da escrivaninha.',
      player: { id: 'p1', role: 'player', name: 'Valério', status: 'alive' },
      campaignFoundation: { id: 'test-camp-1', title: 'Teste', genre: 'Fantasia', premise: 'Teste', tone: 'Sombrio', startingLocation: 'Quarto', createdAt: Date.now() },
      worldState: { currentLocation: 'Quarto', timeOfDay: 'Noite', weather: 'Chuva', tensionLevel: 'calm', statusSummary: '' },
      recentMessages: [],
      systemInstructions: '',
    });

    if (fallbackText && fallbackText.includes('processando sua ação') && fallbackText.includes('Valério') === false) {
      console.log('✅ Teste 1: Narrativa procedural de contingência gerada corretamente e sem travar.');
      passed++;
    } else {
      console.error('❌ Teste 1: Falha no texto gerado pela narrativa procedural:', fallbackText);
    }
  } catch (err) {
    console.error('❌ Teste 1: Erro ao gerar narrativa procedural:', err);
  }

  // Teste 2: Resolução mecânica determinística de dados
  total++;
  try {
    const rollNarrative = generateDeterministicRollNarrative(
      {
        campaignId: 'test-camp-1',
        currentUserInput: 'Tento arrombar o baú de ferro',
        player: { id: 'p2', role: 'player', name: 'Eldrin', status: 'alive' },
        campaignFoundation: { id: 'test-camp-1', title: 'Teste', genre: 'Fantasia', premise: 'Teste', tone: 'Sombrio', startingLocation: 'Masmorra', createdAt: Date.now() },
        worldState: { currentLocation: 'Masmorra', timeOfDay: 'Noite', weather: 'Úmido', tensionLevel: 'tense', statusSummary: '' },
        recentMessages: [],
        systemInstructions: '',
      },
      {
        sides: 20,
        roll: 18,
        modifier: 2,
        total: 20,
        difficulty: 13,
        difficultyLevel: 'MEDIUM',
        success: true,
        outcome: 'FULL_SUCCESS',
        skill: 'lockpicking',
        actor: 'Eldrin',
        timestamp: Date.now(),
      }
    );

    if (rollNarrative.includes('Sucesso Total') && rollNarrative.includes('Eldrin') && rollNarrative.includes('lockpicking')) {
      console.log('✅ Teste 2: Narrativa determinística de rolagem formatada com sucesso.');
      passed++;
    } else {
      console.error('❌ Teste 2: Falha na formatação de rolagem mecânica:', rollNarrative);
    }
  } catch (err) {
    console.error('❌ Teste 2: Erro no teste de rolagem:', err);
  }

  // Teste 3: Processamento do GameEngine com resposta imediata e desacoplamento de extração
  total++;
  try {
    const gameStateManager = new GameStateManager();
    const memoryManager = new MemoryManager();
    const campaignId = 'test-speed-campaign';

    gameStateManager.createCampaign({
      campaignId,
      title: 'Campanha de Teste Rápido',
      startingLocation: 'Vila da Névoa',
      playerName: 'Gareth',
      playerArchetype: 'Guerreiro',
    });

    const engine = new GameEngine(memoryManager, gameStateManager);

    const start = performance.now();
    const turnResult = await engine.processPlayerAction(campaignId, 'Eu caminho até a taverna.');
    const duration = performance.now() - start;

    if (turnResult && turnResult.masterMessage && turnResult.turn === 1) {
      console.log(`✅ Teste 3: Turno processado e resposta entregue imediatamente (${duration.toFixed(2)}ms) sem bloqueio.`);
      passed++;
    } else {
      console.error('❌ Teste 3: Turno não retornou resposta esperada:', turnResult);
    }
  } catch (err) {
    console.error('❌ Teste 3: Erro durante processamento do turno:', err);
  }

  console.log(`\n=== RESULTADO FINAL: ${passed}/${total} TESTES APROVADOS ===`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
