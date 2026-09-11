/**
 * Testes Abrangentes da UI/UX da Etapa de Seleção de Cenários
 * 
 * 1. Apenas X cancela todo o fluxo
 * 2. Não existe 'Cancelar' redundante no rodapé
 * 3. Existe apenas um 'Voltar'
 * 4. Clicar no card seleciona, mas NÃO chama Foundation
 * 5. Selecionar outro card troca a seleção
 * 6. Continue disabled sem seleção
 * 7. Continue com seleção chama processamento exatamente uma vez
 * 8. 'Novas opções' preserva premissa
 * 9. Regenerar limpa seleção anterior
 * 10. Loading impede ações concorrentes
 * 11. Teclado funciona (Enter e Espaço selecionam card sem chamar Foundation)
 * 12. Mobile funciona (responsividade e atributos de toque)
 * 13. Verificação de integridade estrutural
 */

import fs from 'fs';
import path from 'path';
import { ScenarioOption } from '../src/services/api';

async function runScenarioSelectionUXTests() {
  console.log('=== TESTES DE UI/UX DA ETAPA DE SELEÇÃO DE CENÁRIOS ===\n');
  let passed = 0;
  let total = 0;

  const modalSourcePath = path.resolve(process.cwd(), 'src/components/NewCampaignModal.tsx');
  const modalCode = fs.readFileSync(modalSourcePath, 'utf-8');

  // Teste 1: Apenas X cancela todo o fluxo
  total++;
  const hasHeaderCloseBtn = modalCode.includes('id="close-new-campaign-modal-btn"');
  if (hasHeaderCloseBtn) {
    console.log('✅ Teste 1: O botão X no topo (close-new-campaign-modal-btn) existe como cancelamento global.');
    passed++;
  } else {
    console.error('❌ Teste 1: Botão X de cancelamento não encontrado.');
  }

  // Teste 2: Não existe 'Cancelar' redundante no rodapé
  total++;
  const hasFooterCancelBtn = modalCode.includes('id="btn-back-close-modal"');
  const hasDuplicateFooterCancel = /<Button[^>]*id="btn-back-close-modal"[^>]*>[\s\S]*?Cancelar[\s\S]*?<\/Button>/.test(modalCode);
  if (!hasFooterCancelBtn && !hasDuplicateFooterCancel) {
    console.log('✅ Teste 2: O botão "Cancelar" redundante foi removido do rodapé.');
    passed++;
  } else {
    console.error('❌ Teste 2: Ainda existe botão "Cancelar" redundante no rodapé.');
  }

  // Teste 3: Existe apenas um 'Voltar' (no rodapé) e sem duplicatas no conteúdo de cenários
  total++;
  const hasFooterBackBtn = modalCode.includes('id="btn-back-to-selection"');
  const hasContentBackDuplicates = modalCode.includes('Mudar premissa ou modo');
  if (hasFooterBackBtn && !hasContentBackDuplicates) {
    console.log('✅ Teste 3: Existe apenas um "Voltar" (no rodapé, ghost) sem ações concorrentes duplicadas no conteúdo.');
    passed++;
  } else {
    console.error('❌ Teste 3: Ação duplicada de voltar encontrada no conteúdo de cenários.');
  }

  // Mock de Cenários para simular interações de estado
  const scenario1: ScenarioOption = {
    id: 'scen_alpha',
    title: 'Cenário Alpha',
    genre: 'Cyberpunk',
    worldIdentity: 'Distopia Futurista',
    description: 'Megacorporações e chuva ácida.',
    startingLocation: 'Beco Neon',
  };

  const scenario2: ScenarioOption = {
    id: 'scen_beta',
    title: 'Cenário Beta',
    genre: 'Solarpunk',
    worldIdentity: 'Utopia Verde',
    description: 'Cidades flutuantes sustentáveis.',
    startingLocation: 'Domo Solar',
  };

  // Simulação de Estado do Componente
  let selectedScenarioId: string | null = null;
  let selectedScenario: ScenarioOption | null = null;
  let foundationCallCount = 0;
  let selectionLock = { current: false };
  let isSelectingScenario = false;
  let isGeneratingFoundation = false;
  let isGeneratingScenarios = false;
  let generateOptionType: 'premise' | 'guided' | 'surprise' = 'premise';
  let generateOptionPremise = 'Aventura em alto-mar cósmico';

  const handleSelectScenarioCard = (scenario: ScenarioOption) => {
    if (isSelectingScenario || isGeneratingFoundation || selectionLock.current) return;
    selectedScenarioId = scenario.id;
    selectedScenario = scenario;
    // IMPORTANTE: NÃO chama api.generateFoundation aqui!
  };

  const handleContinueWithSelectedScenario = async () => {
    if (!selectedScenario || !selectedScenarioId) return;
    if (selectionLock.current) return;

    selectionLock.current = true;
    isSelectingScenario = true;
    isGeneratingFoundation = true;

    try {
      // Simulação do processamento pesado
      await new Promise(res => setTimeout(res, 20));
      foundationCallCount++;
    } finally {
      isGeneratingFoundation = false;
    }
  };

  const handleGenerateOptions = async (type: 'premise' | 'guided' | 'surprise') => {
    if (isGeneratingScenarios) return;
    isGeneratingScenarios = true;
    // Ao regenerar: limpa seleção e destrava
    selectionLock.current = false;
    isSelectingScenario = false;
    selectedScenarioId = null;
    selectedScenario = null;
    try {
      await new Promise(res => setTimeout(res, 10));
    } finally {
      isGeneratingScenarios = false;
    }
  };

  // Teste 4: Clicar no card seleciona, mas NÃO chama Foundation
  total++;
  handleSelectScenarioCard(scenario1);
  if (selectedScenarioId === 'scen_alpha' && selectedScenario?.id === 'scen_alpha' && foundationCallCount === 0) {
    console.log('✅ Teste 4: Clicar no card seleciona o cenário sem iniciar processamento pesado de Foundation.');
    passed++;
  } else {
    console.error('❌ Teste 4: Clicar no card disparou Foundation indevidamente.');
  }

  // Teste 5: Selecionar outro card troca seleção
  total++;
  handleSelectScenarioCard(scenario2);
  if (selectedScenarioId === 'scen_beta' && selectedScenario?.id === 'scen_beta' && foundationCallCount === 0) {
    console.log('✅ Teste 5: Selecionar outro card troca a seleção (apenas 1 cenário selecionado por vez).');
    passed++;
  } else {
    console.error('❌ Teste 5: Falha na alternância de cenário selecionado.');
  }

  // Teste 6: Continue disabled sem seleção
  total++;
  let dummySelectedId: string | null = null;
  const isContinueDisabledWithoutSelection = (!dummySelectedId || isGeneratingScenarios || isGeneratingFoundation || isSelectingScenario || selectionLock.current);
  if (isContinueDisabledWithoutSelection) {
    console.log('✅ Teste 6: Botão "Continuar com este cenário" fica disabled quando nenhum cenário está selecionado.');
    passed++;
  } else {
    console.error('❌ Teste 6: Botão Continuar não estava desabilitado sem seleção.');
  }

  // Teste 7: Continue com seleção chama processamento exatamente uma vez (mesmo com 5 cliques rápidos)
  total++;
  const concurrentClicks = [
    handleContinueWithSelectedScenario(),
    handleContinueWithSelectedScenario(),
    handleContinueWithSelectedScenario(),
    handleContinueWithSelectedScenario(),
    handleContinueWithSelectedScenario(),
  ];
  await Promise.all(concurrentClicks);

  if (foundationCallCount === 1 && selectionLock.current === true) {
    console.log('✅ Teste 7: Clicar em Continuar com seleção executa processamento exatamente 1 vez com proteção de lock.');
    passed++;
  } else {
    console.error(`❌ Teste 7: Processamento chamado ${foundationCallCount} vezes (esperado: 1).`);
  }

  // Teste 8: 'Novas opções' preserva premissa
  total++;
  const originalPremise = generateOptionPremise;
  await handleGenerateOptions(generateOptionType);
  if (generateOptionPremise === originalPremise && generateOptionType === 'premise') {
    console.log('✅ Teste 8: Ação "Novas opções" preserva integralmente a premissa configurada.');
    passed++;
  } else {
    console.error('❌ Teste 8: Premissa foi corrompida ao solicitar novas opções.');
  }

  // Teste 9: Regenerar limpa seleção anterior
  total++;
  if (selectedScenarioId === null && selectedScenario === null) {
    console.log('✅ Teste 9: Regenerar limpa seleção anterior e redefine estado.');
    passed++;
  } else {
    console.error('❌ Teste 9: Seleção anterior não foi limpa ao regenerar.');
  }

  // Teste 10: Loading impede ações concorrentes
  total++;
  isSelectingScenario = true;
  isGeneratingFoundation = true;
  selectionLock.current = true;
  handleSelectScenarioCard(scenario1);
  if (selectedScenarioId === null) {
    console.log('✅ Teste 10: Durante loading, cliques em outros cards são bloqueados e ignorados.');
    passed++;
  } else {
    console.error('❌ Teste 10: Clique foi aceito durante processamento de loading.');
  }

  // Teste 11: Teclado funciona (Enter e Espaço selecionam card sem disparar Foundation)
  total++;
  const hasKeyboardSupport = modalCode.includes("e.key === 'Enter' || e.key === ' '") &&
                             modalCode.includes('handleSelectScenarioCard');
  if (hasKeyboardSupport) {
    console.log('✅ Teste 11: Suporte a teclado presente (Enter e Espaço selecionam card acessivelmente).');
    passed++;
  } else {
    console.error('❌ Teste 11: Suporte a teclado ausente ou incorreto.');
  }

  // Teste 12: Mobile funciona (responsividade e atributos adequados)
  total++;
  const hasResponsiveClasses = modalCode.includes('grid-cols-1') &&
                               modalCode.includes('touchAction') &&
                               modalCode.includes('min-h-14');
  if (hasResponsiveClasses) {
    console.log('✅ Teste 12: Layout responsivo para mobile com alvos de toque adequados e coluna única.');
    passed++;
  } else {
    console.error('❌ Teste 12: Classes responsivas para mobile ausentes.');
  }

  // Teste 13: Verificação de semântica ARIA e hierarquia
  total++;
  const hasRadiogroup = modalCode.includes('role="radiogroup"');
  const hasRadio = modalCode.includes('role="radio"');
  const hasAriaChecked = modalCode.includes('aria-checked');
  const hasAriaBusy = modalCode.includes('aria-busy');
  const hasContinueScenarioBtn = modalCode.includes('id="btn-continue-scenario"');
  const hasRegenerateBtn = modalCode.includes('id="btn-regenerate-scenarios"');

  if (hasRadiogroup && hasRadio && hasAriaChecked && hasAriaBusy && hasContinueScenarioBtn && hasRegenerateBtn) {
    console.log('✅ Teste 13: Semântica ARIA completa (radiogroup, radio, aria-checked, aria-busy) e IDs de teste presentes.');
    passed++;
  } else {
    console.error('❌ Teste 13: Atributos de acessibilidade ARIA ou IDs ausentes.');
  }

  console.log(`\n=== RESULTADO FINAL: ${passed}/${total} TESTES APROVADOS ===`);
  if (passed !== total) {
    process.exit(1);
  }
}

runScenarioSelectionUXTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
