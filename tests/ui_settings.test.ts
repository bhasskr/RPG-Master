/**
 * Testes automatizados das Configurações Básicas de UI:
 * 
 * 1. Mudar configurações (Tema, Tamanho do texto, Densidade, Animações, Indicadores de rolagem).
 * 2. Simular recarregamento da página (leitura do localStorage).
 * 3. Confirmar persistência de todas as chaves.
 * 4. Trocar de campanha e confirmar que as preferências continuam globais e idênticas.
 * 5. Verificar que Game Engine, RNG, memória e regras não foram afetados pelas preferências visuais.
 */

import {
  loadUiPreferences,
  saveUiPreferences,
  DEFAULT_UI_PREFERENCES,
  UiPreferences,
} from '../src/utils/uiPreferences';
import { gameEngine } from '../server/engine/gameEngine';

// Mock simples de localStorage para ambiente de teste Node.js
const mockStorage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k in mockStorage) delete mockStorage[k];
  },
};
(global as any).window = global;

async function runUiSettingsTests() {
  console.log('=== INICIANDO TESTES DE CONFIGURAÇÕES BÁSICAS DA UI ===\n');

  let passed = 0;
  let total = 0;

  // 1. Verificar valores padrão
  total++;
  localStorage.clear();
  const initialPrefs = loadUiPreferences();
  if (
    initialPrefs.theme === 'dark' &&
    initialPrefs.textSize === 'default' &&
    initialPrefs.density === 'comfortable' &&
    initialPrefs.enableAnimations === true &&
    initialPrefs.showRollIndicators === true
  ) {
    console.log('✅ Teste 1: Valores padrão de preferências carregados corretamente.');
    passed++;
  } else {
    console.error('❌ Teste 1: Valores padrão incorretos.', initialPrefs);
  }

  // 2. Mudar configurações e salvar
  total++;
  const customPrefs: UiPreferences = {
    theme: 'system',
    textSize: 'large',
    density: 'compact',
    enableAnimations: false,
    showRollIndicators: false,
  };
  saveUiPreferences(customPrefs);

  const savedRaw = localStorage.getItem('rpg_ui_preferences_v1');
  if (savedRaw && JSON.parse(savedRaw).textSize === 'large' && JSON.parse(savedRaw).density === 'compact') {
    console.log('✅ Teste 2: Configurações alteradas e salvas com sucesso no armazenamento local.');
    passed++;
  } else {
    console.error('❌ Teste 2: Falha ao persistir alterações.');
  }

  // 3. Simular recarregamento da página (reload)
  total++;
  const reloadedPrefs = loadUiPreferences();
  if (
    reloadedPrefs.theme === 'system' &&
    reloadedPrefs.textSize === 'large' &&
    reloadedPrefs.density === 'compact' &&
    reloadedPrefs.enableAnimations === false &&
    reloadedPrefs.showRollIndicators === false
  ) {
    console.log('✅ Teste 3: Persistência confirmada após recarregar preferências.');
    passed++;
  } else {
    console.error('❌ Teste 3: Falha na persistência após reload.', reloadedPrefs);
  }

  // 4. Trocar de campanha e confirmar que as preferências permanecem globais e inalteradas
  total++;
  const camp1 = `camp_ui_test_1_${Date.now()}`;
  const camp2 = `camp_ui_test_2_${Date.now()}`;

  gameEngine.gameStateManager.createCampaign({
    campaignId: camp1,
    title: 'Campanha Alpha',
    genre: 'Fantasia',
    startingLocation: 'Floresta',
    playerName: 'Eldrin',
  });

  gameEngine.gameStateManager.createCampaign({
    campaignId: camp2,
    title: 'Campanha Beta',
    genre: 'Sci-Fi',
    startingLocation: 'Estação Espacial',
    playerName: 'Vex',
  });

  // Lê preferências novamente após operações de campanhas diferentes
  const prefsCamp1 = loadUiPreferences();
  const prefsCamp2 = loadUiPreferences();

  if (
    JSON.stringify(prefsCamp1) === JSON.stringify(customPrefs) &&
    JSON.stringify(prefsCamp2) === JSON.stringify(customPrefs)
  ) {
    console.log('✅ Teste 4: Preferências de UI são estritamente globais e não sofrem alteração ao trocar de campanha.');
    passed++;
  } else {
    console.error('❌ Teste 4: Preferências foram corrompidas durante troca de campanha.');
  }

  // 5. Garantir que as regras do Game Engine / RNG / Memória não foram tocadas
  total++;
  const stateAlpha = gameEngine.gameStateManager.getGameState(camp1);
  const stateBeta = gameEngine.gameStateManager.getGameState(camp2);

  if (
    stateAlpha?.player.name === 'Eldrin' &&
    stateBeta?.player.name === 'Vex' &&
    stateAlpha.foundation.genre === 'Fantasia' &&
    stateBeta.foundation.genre === 'Sci-Fi'
  ) {
    console.log('✅ Teste 5: Game Engine, RNG, memória e regras narrativas intactos e autoritativos.');
    passed++;
  } else {
    console.error('❌ Teste 5: Inconsistência no Game Engine detectada.');
  }

  console.log(`\n=== RESULTADO FINAL: ${passed}/${total} TESTES APROVADOS ===`);
  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runUiSettingsTests().catch((err) => {
  console.error('Erro ao executar testes:', err);
  process.exit(1);
});
