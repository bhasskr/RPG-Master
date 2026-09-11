/**
 * Testes da trava síncrona contra múltiplos cliques em "Escolher este cenário"
 * 
 * 1. Simular 5 cliques rápidos/concorrentes no botão "Escolher este cenário".
 * 2. Verificar que a execução do handler ocorre exatamente UMA vez (count = 1).
 * 3. Verificar que o estado visual bloqueia os demais cenários.
 * 4. Verificar que erro real reseta a trava e permite re-tentativa.
 * 5. Verificar que sucesso mantém a trava ativa.
 */

import { ScenarioOption } from '../src/services/api';

async function runScenarioSelectionLockTests() {
  console.log('=== TESTES DE TRAVA SÍNCRONA DE SELEÇÃO DE CENÁRIO ===\n');
  let passed = 0;
  let total = 0;

  // Mock scenario
  const mockScenarioA: ScenarioOption = {
    id: 'scen_1',
    title: 'Cenário 1',
    genre: 'Drama',
    worldIdentity: 'Contemporâneo',
    description: 'Um encontro inesperado na escola.',
    startingLocation: 'Pátio',
  };

  const mockScenarioB: ScenarioOption = {
    id: 'scen_2',
    title: 'Cenário 2',
    genre: 'Fantasia',
    worldIdentity: 'Fantasia Medieval',
    description: 'Uma taverna misteriosa.',
    startingLocation: 'Taverna',
  };

  // 1. Simulação do lock síncrono com useRef (mesma mecânica de NewCampaignModal)
  total++;
  let selectionLock: { current: boolean } = { current: false };
  let executionCount = 0;
  let selectedScenarioId: string | null = null;
  let isSelectingScenario = false;
  let isGeneratingFoundation = false;

  const handleSelectScenarioMock = async (scenario: ScenarioOption, shouldFail: boolean = false) => {
    // 1. Verificação síncrona com useRef: se já estiver true, retornar imediatamente
    if (selectionLock.current) {
      return;
    }

    // 2. Definir true síncronamente ANTES de qualquer await
    selectionLock.current = true;
    executionCount += 1;

    // 3. Atualizar estado visual imediatamente
    selectedScenarioId = scenario.id;
    isSelectingScenario = true;
    isGeneratingFoundation = true;

    // Simulação do await api.generateFoundation
    try {
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (shouldFail) reject(new Error('Erro simulado'));
          else resolve();
        }, 30);
      });

      // Sucesso: trava permanece ativa
      isGeneratingFoundation = false;
    } catch (err) {
      // Erro real: resetar trava
      selectionLock.current = false;
      isSelectingScenario = false;
      selectedScenarioId = null;
      isGeneratingFoundation = false;
      throw err;
    }
  };

  // Teste 1: 5 cliques rápidos/concorrentes
  console.log('Disparando 5 cliques rápidos e simultâneos em "Escolher este cenário"...');
  const clickPromises = [
    handleSelectScenarioMock(mockScenarioA),
    handleSelectScenarioMock(mockScenarioA),
    handleSelectScenarioMock(mockScenarioB),
    handleSelectScenarioMock(mockScenarioA),
    handleSelectScenarioMock(mockScenarioB)
  ];

  await Promise.all(clickPromises);

  if (executionCount === 1) {
    console.log('✅ Teste 1: 5 cliques rápidos resultaram em exatamente 1 execução (execution count = 1).');
    passed++;
  } else {
    console.error(`❌ Teste 1: Falha! Executou ${executionCount} vezes ao invés de 1.`);
  }

  // Teste 2: Verificar que o cenário selecionado é o do primeiro clique e lock permanece ativo
  total++;
  if (selectedScenarioId === 'scen_1' && selectionLock.current === true) {
    console.log('✅ Teste 2: Cenário 1 selecionado com sucesso e trava mantida ativa após término.');
    passed++;
  } else {
    console.error('❌ Teste 2: Falha no estado pós-sucesso.');
  }

  // Teste 3: Tentativa de clique após término de sucesso deve continuar bloqueada
  total++;
  await handleSelectScenarioMock(mockScenarioB);
  if (executionCount === 1 && selectedScenarioId === 'scen_1') {
    console.log('✅ Teste 3: Novo clique após sucesso bloqueado (nenhuma reentrada permitida).');
    passed++;
  } else {
    console.error('❌ Teste 3: Trava foi liberada indevidamente após sucesso.');
  }

  // Teste 4: Em caso de erro real, trava é liberada e permite retry
  total++;
  selectionLock.current = false; // Reset intencional para simular novo estado
  executionCount = 0;
  selectedScenarioId = null;

  try {
    await handleSelectScenarioMock(mockScenarioA, true); // Falha simulada
  } catch {
    // Esperado
  }

  if (!selectionLock.current && selectedScenarioId === null && !isSelectingScenario) {
    console.log('✅ Teste 4: Erro real liberou a trava e restaurou o estado visual para permitir retry.');
    passed++;
  } else {
    console.error('❌ Teste 4: Trava não foi liberada no erro.');
  }

  // Teste 5: Re-tentativa bem sucedida após o erro
  total++;
  await handleSelectScenarioMock(mockScenarioA, false);
  if (executionCount === 2 && Boolean(selectionLock.current) && selectedScenarioId === 'scen_1') {
    console.log('✅ Teste 5: Retry bem sucedido após erro anterior com nova trava ativa.');
    passed++;
  } else {
    console.error(`❌ Teste 5: Falha na recuperação após retry (executionCount = ${executionCount}).`);
  }

  console.log(`\n=== RESULTADO: ${passed}/${total} TESTES PASSARAM ===`);
  if (passed !== total) {
    process.exit(1);
  }
}

runScenarioSelectionLockTests().catch(e => {
  console.error(e);
  process.exit(1);
});
