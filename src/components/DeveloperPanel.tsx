/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Terminal, RefreshCw, Activity } from 'lucide-react';
import { ApiStatusData } from '../types';
import { DrawerShell, Button, IconButton } from './ui';
import { TechnicalDiagnostics } from './TechnicalDiagnostics';

export type DeveloperSection =
  | 'diagnostics'
  | 'memory'
  | 'logs'
  | 'functions'
  | 'rolls'
  | 'retrieval'
  | 'epistemology';

export interface DeveloperPanelProps {
  isOpen: boolean;
  onClose: () => void;
  statusData: ApiStatusData | null;
  isLoadingStatus?: boolean;
  statusError?: string | null;
  onRefreshStatus?: () => void;
  campaignId?: string | null;
}

/**
 * Ponto de entrada do Developer Mode.
 * Construído sobre o DrawerShell do Design System, estruturado para suportar futuras
 * extensões analíticas (Memory, Logs, Function Calls, etc.) mantendo foco estrito em
 * Technical Diagnostics nesta fase.
 */
export function DeveloperPanel({
  isOpen,
  onClose,
  statusData,
  isLoadingStatus = false,
  statusError = null,
  onRefreshStatus,
  campaignId,
}: DeveloperPanelProps) {
  // Arquitetura preparada para futuras seções: apenas 'diagnostics' ativo nesta fase
  const [activeSection] = useState<DeveloperSection>('diagnostics');

  if (!isOpen) return null;

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Developer Mode"
      icon={<Terminal className="w-4 h-4 text-text-primary" />}
      subtitle="Diagnóstico e integridade técnica da Game Engine"
      maxWidthClass="sm:max-w-md md:max-w-xl lg:max-w-2xl"
      headerActions={
        onRefreshStatus ? (
          <IconButton
            id="dev-panel-refresh-btn"
            type="button"
            onClick={onRefreshStatus}
            disabled={isLoadingStatus}
            variant="ghost"
            size="compact"
            title="Atualizar diagnóstico"
            aria-label="Atualizar dados de diagnóstico"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin text-text-muted' : 'text-text-secondary'}`}
            />
          </IconButton>
        ) : undefined
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 typo-caption text-text-muted">
            <span className="w-2 h-2 radius-full bg-success/80" />
            <span>Developer Mode • Somente leitura</span>
          </div>
          <Button
            id="footer-close-dev-panel-btn"
            variant="secondary"
            size="compact"
            onClick={onClose}
          >
            Fechar
          </Button>
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Cabeçalho da Seção Ativa */}
        <div className="flex items-center justify-between pb-2 border-b border-border-default/60">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-text-secondary" />
            <h3 className="typo-section-heading text-text-primary">
              Diagnóstico do Sistema
            </h3>
          </div>
          <span className="typo-caption px-2 py-0.5 radius-small bg-surface-elevated text-text-muted border border-border-subtle font-mono text-[11px]">
            v1.0
          </span>
        </div>

        {/* Renderização da Seção de Diagnóstico */}
        {activeSection === 'diagnostics' && (
          <TechnicalDiagnostics
            statusData={statusData}
            isLoading={isLoadingStatus}
            error={statusError}
            onRetry={onRefreshStatus}
            campaignId={campaignId}
          />
        )}
      </div>
    </DrawerShell>
  );
}
