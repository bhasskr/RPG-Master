/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import {
  Settings,
  Moon,
  Laptop,
  Type,
  Maximize2,
  Minimize2,
  Sparkles,
  Dices,
  RotateCcw,
} from 'lucide-react';
import {
  UiPreferences,
  DEFAULT_UI_PREFERENCES,
  ThemePreference,
  TextSizePreference,
  DensityPreference,
} from '../utils/uiPreferences';
import { DrawerShell, Button, IconButton, Divider, Tabs } from './ui';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UiPreferences;
  onUpdatePreferences: (updated: Partial<UiPreferences>) => void;
}

/**
 * Modal de configurações do usuário.
 * Contém exclusivamente preferências do jogador (aparência e experiência de jogo).
 */
export function SettingsModal({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
}: SettingsModalProps) {
  // Listener para fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    onUpdatePreferences(DEFAULT_UI_PREFERENCES);
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações"
      icon={<Settings className="w-4 h-4 text-text-secondary" />}
      subtitle="Preferências visuais e de experiência"
      maxWidthClass="sm:max-w-md md:max-w-lg"
      headerActions={
        <IconButton
          id="reset-settings-btn"
          type="button"
          onClick={handleResetDefaults}
          variant="ghost"
          size="compact"
          title="Restaurar padrões"
          aria-label="Restaurar configurações padrão"
        >
          <RotateCcw className="w-4 h-4" />
        </IconButton>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="typo-caption text-text-muted">
            Preferências salvas automaticamente
          </span>
          <Button
            id="footer-close-settings-btn"
            variant="secondary"
            size="compact"
            onClick={onClose}
          >
            Concluído
          </Button>
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* SEÇÃO 1: Aparência */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="typo-section-heading text-text-muted">
              Aparência
            </h3>
          </div>

          {/* 1.1 Tema */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="typo-secondary font-medium text-text-primary flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-text-secondary" />
                <span>Tema</span>
              </label>
            </div>
            <Tabs
              fullWidth
              activeTab={preferences.theme}
              onChange={(id) => onUpdatePreferences({ theme: id as ThemePreference })}
              tabs={[
                { id: 'dark', label: 'Escuro', icon: <Moon className="w-4 h-4" /> },
                { id: 'system', label: 'Sistema', icon: <Laptop className="w-4 h-4" /> }
              ]}
            />
          </div>

          {/* 1.2 Tamanho do Texto */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="typo-secondary font-medium text-text-primary flex items-center gap-1.5">
                <Type className="w-4 h-4 text-text-secondary" />
                <span>Tamanho do texto</span>
              </label>
            </div>
            <Tabs
              fullWidth
              activeTab={preferences.textSize}
              onChange={(id) => onUpdatePreferences({ textSize: id as TextSizePreference })}
              tabs={[
                { id: 'small', label: 'Pequeno' },
                { id: 'default', label: 'Padrão' },
                { id: 'large', label: 'Grande' }
              ]}
            />
          </div>

          {/* 1.3 Densidade */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="typo-secondary font-medium text-text-primary flex items-center gap-1.5">
                <Maximize2 className="w-4 h-4 text-text-secondary" />
                <span>Densidade</span>
              </label>
            </div>
            <Tabs
              fullWidth
              activeTab={preferences.density}
              onChange={(id) => onUpdatePreferences({ density: id as DensityPreference })}
              tabs={[
                { id: 'compact', label: 'Compacta', icon: <Minimize2 className="w-4 h-4" /> },
                { id: 'comfortable', label: 'Confortável', icon: <Maximize2 className="w-4 h-4" /> }
              ]}
            />
          </div>

          {/* 1.4 Animações */}
          <div className="pt-1">
            <div className="flex items-center justify-between gap-4 py-1.5">
              <div className="min-w-0">
                <div className="typo-secondary font-medium text-text-primary flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-text-secondary" />
                  <span>Animações</span>
                </div>
                <p className="typo-caption text-text-muted mt-0.5">
                  Transições de interface e rolagem suave
                </p>
              </div>
              <button
                id="toggle-animations-btn"
                type="button"
                onClick={() => onUpdatePreferences({ enableAnimations: !preferences.enableAnimations })}
                className={`w-11 h-6 radius-full transition-colors duration-150 motion-reduce:transition-none relative cursor-pointer shrink-0 border focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                  preferences.enableAnimations ? 'bg-text-primary border-text-primary' : 'bg-surface-elevated border-border-default hover:border-border-strong'
                }`}
                role="switch"
                aria-checked={preferences.enableAnimations}
                aria-label="Ativar ou desativar animações da interface"
              >
                <span
                  className={`block w-4 h-4 radius-full transition-transform duration-150 motion-reduce:transition-none absolute top-0.5 ${
                    preferences.enableAnimations
                      ? 'translate-x-5.5 bg-background'
                      : 'translate-x-1 bg-text-secondary'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        <Divider />

        {/* SEÇÃO 2: Experiência de Jogo */}
        <section className="space-y-3">
          <h3 className="typo-section-heading text-text-muted">
            Experiência de Jogo
          </h3>

          <div className="flex items-center justify-between gap-4 py-1.5">
            <div className="min-w-0">
              <div className="typo-secondary font-medium text-text-primary flex items-center gap-1.5">
                <Dices className="w-4 h-4 text-text-secondary" />
                <span>Indicadores de D20</span>
              </div>
              <p className="typo-caption text-text-muted mt-0.5">
                Exibir resumo de testes mecânicos no chat
              </p>
            </div>
            <button
              id="toggle-roll-indicators-btn"
              type="button"
              onClick={() => onUpdatePreferences({ showRollIndicators: !preferences.showRollIndicators })}
              className={`w-11 h-6 radius-full transition-colors duration-150 motion-reduce:transition-none relative cursor-pointer shrink-0 border focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                preferences.showRollIndicators ? 'bg-text-primary border-text-primary' : 'bg-surface-elevated border-border-default hover:border-border-strong'
              }`}
              role="switch"
              aria-checked={preferences.showRollIndicators}
              aria-label="Exibir ou ocultar indicadores de rolagens de dados"
            >
              <span
                className={`block w-4 h-4 radius-full transition-transform duration-150 motion-reduce:transition-none absolute top-0.5 ${
                  preferences.showRollIndicators
                    ? 'translate-x-5.5 bg-background'
                    : 'translate-x-1 bg-text-secondary'
                }`}
              />
            </button>
          </div>
        </section>
      </div>
    </DrawerShell>
  );
}
