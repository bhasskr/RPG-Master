/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CheckCircle2, AlertCircle, HelpCircle, AlertTriangle, RefreshCw, Cpu, Database, Bot, KeyRound, HardDrive, Layers } from 'lucide-react';
import { ApiStatusData } from '../types';
import { Button } from './ui';

interface TechnicalDiagnosticsProps {
  statusData: ApiStatusData | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  campaignId?: string | null;
  className?: string;
}

/**
 * Componente estruturado de diagnósticos técnicos (Developer Mode).
 * Exibe métricas e configurações do sistema de forma somente leitura,
 * garantindo que nenhum secret ou dump não tratado seja exposto.
 */
export function TechnicalDiagnostics({
  statusData,
  isLoading = false,
  error = null,
  onRetry,
  campaignId,
  className = '',
}: TechnicalDiagnosticsProps) {
  // Estado de erro ao consultar diagnóstico
  if (error) {
    return (
      <div
        id="technical-diagnostics-error"
        className={`p-4 radius-medium bg-danger/10 border border-danger/30 text-text-primary space-y-3 ${className}`}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h4 className="typo-secondary font-medium text-danger">
              Falha ao consultar diagnósticos do sistema
            </h4>
            <p className="typo-caption text-text-muted mt-1 break-words">
              {error}
            </p>
          </div>
        </div>
        {onRetry && (
          <div className="flex justify-end pt-1">
            <Button
              id="retry-diagnostics-btn"
              size="compact"
              variant="secondary"
              onClick={onRetry}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar novamente</span>
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Estado de carregamento
  if (isLoading && !statusData) {
    return (
      <div
        id="technical-diagnostics-loading"
        className={`p-6 text-center space-y-3 radius-medium bg-surface-subtle/50 border border-border-subtle ${className}`}
      >
        <RefreshCw className="w-5 h-5 text-text-secondary animate-spin mx-auto" />
        <p className="typo-caption text-text-muted">
          Carregando informações de diagnóstico da Game Engine...
        </p>
      </div>
    );
  }

  // Helpers para renderização consistente de badges de status
  const renderStatusBadge = (
    state: 'healthy' | 'unavailable' | 'unknown',
    label: string
  ) => {
    switch (state) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 radius-small bg-success/10 text-success border border-success/20 typo-caption font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
          </span>
        );
      case 'unavailable':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 radius-small bg-warning/10 text-warning border border-warning/20 typo-caption font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
          </span>
        );
      case 'unknown':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 radius-small bg-surface-elevated text-text-muted border border-border-subtle typo-caption font-medium">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
          </span>
        );
    }
  };

  // Avaliação do status da API Gemini
  const geminiStatusBadge = () => {
    if (statusData?.isApiKeyConfigured === true) {
      return renderStatusBadge('healthy', 'Configurada & Conectada');
    }
    if (statusData?.isApiKeyConfigured === false) {
      return renderStatusBadge('unavailable', 'Não configurada');
    }
    return renderStatusBadge('unknown', 'Desconhecido');
  };

  // Avaliação do status geral da Engine
  const engineStatusBadge = () => {
    if (statusData?.status === 'online') {
      return renderStatusBadge('healthy', 'Online / Saudável');
    }
    if (statusData?.status) {
      return renderStatusBadge('unavailable', statusData.status);
    }
    if (!statusData) {
      return renderStatusBadge('unknown', 'Desconhecido');
    }
    return renderStatusBadge('healthy', 'Ativo');
  };

  return (
    <div
      id="technical-diagnostics-panel"
      className={`space-y-4 ${className}`}
    >
      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Card 1: Estado da Engine */}
        <div className="p-3.5 radius-medium bg-surface-subtle border border-border-subtle flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="typo-caption text-text-muted flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-text-secondary" />
              <span>Game Engine</span>
            </span>
          </div>
          <div>
            <div className="mt-1">{engineStatusBadge()}</div>
            <p className="typo-caption text-text-muted mt-1.5 font-mono text-[11px] truncate" title={statusData?.engine || 'Sandbox RPG Engine'}>
              {statusData?.engine || 'Sandbox RPG Engine'}
            </p>
          </div>
        </div>

        {/* Card 2: API Gemini */}
        <div className="p-3.5 radius-medium bg-surface-subtle border border-border-subtle flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="typo-caption text-text-muted flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-text-secondary" />
              <span>API Gemini</span>
            </span>
          </div>
          <div>
            <div className="mt-1">{geminiStatusBadge()}</div>
            <p className="typo-caption text-text-muted mt-1.5 font-mono text-[11px] truncate">
              {statusData?.isApiKeyConfigured ? 'Pronto para inferência' : 'Chave GEMINI_API_KEY ausente'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabela Estruturada de Campos Somente-Leitura */}
      <div className="p-4 radius-medium bg-surface-subtle/70 border border-border-subtle divide-y divide-border-subtle/60">
        <h4 className="typo-section-heading text-text-muted pb-2.5">
          Configurações e Subsistemas
        </h4>

        {/* 1. Modelo Narrativo */}
        <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="w-4 h-4 text-text-secondary shrink-0" />
            <span className="typo-secondary text-text-primary">Modelo Narrativo</span>
          </div>
          <div className="sm:text-right max-w-full sm:max-w-[60%]">
            {statusData?.narratorModel ? (
              <span
                className="font-mono text-xs text-text-secondary bg-surface-elevated px-2 py-0.5 radius-small border border-border-subtle inline-block truncate max-w-full"
                title={statusData.narratorModel}
              >
                {statusData.narratorModel}
              </span>
            ) : (
              <span className="typo-caption text-text-muted italic">Desconhecido</span>
            )}
          </div>
        </div>

        {/* 2. Motor de Persistência */}
        <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Database className="w-4 h-4 text-text-secondary shrink-0" />
            <span className="typo-secondary text-text-primary">Motor de Persistência</span>
          </div>
          <div className="sm:text-right max-w-full sm:max-w-[60%]">
            {statusData?.memoryStoreType ? (
              <span
                className="font-mono text-xs text-text-secondary bg-surface-elevated px-2 py-0.5 radius-small border border-border-subtle inline-block truncate max-w-full"
                title={statusData.memoryStoreType}
              >
                {statusData.memoryStoreType}
              </span>
            ) : (
              <span className="typo-caption text-text-muted italic">Desconhecido</span>
            )}
          </div>
        </div>

        {/* 3. Campanha Ativa */}
        <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-4 h-4 text-text-secondary shrink-0" />
            <span className="typo-secondary text-text-primary">Campanha Ativa</span>
          </div>
          <div className="sm:text-right">
            {campaignId ? (
              <span
                className="font-mono text-xs text-text-secondary bg-surface-elevated px-2 py-0.5 radius-small border border-border-subtle inline-block truncate max-w-full"
                title={campaignId}
              >
                {campaignId}
              </span>
            ) : (
              <span className="typo-caption text-text-muted">Nenhuma campanha ativa</span>
            )}
          </div>
        </div>

        {/* 4. Ambiente de Execução */}
        <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <HardDrive className="w-4 h-4 text-text-secondary shrink-0" />
            <span className="typo-secondary text-text-primary">Ambiente de Execução</span>
          </div>
          <div className="sm:text-right">
            {statusData?.environment ? (
              <span className="font-mono text-xs text-text-secondary capitalize">
                {statusData.environment}
              </span>
            ) : (
              <span className="typo-caption text-text-muted italic">Desconhecido</span>
            )}
          </div>
        </div>
      </div>

      {/* Nota de Isolamento e Segurança */}
      <div className="p-3 radius-small bg-surface-subtle/40 border border-border-subtle text-text-muted typo-caption flex items-center gap-2">
        <span className="w-1.5 h-1.5 radius-full bg-text-muted shrink-0" />
        <span>
          Visualização em modo somente leitura. Chaves de acesso, prompts completos e dados sensíveis são omitidos por segurança.
        </span>
      </div>
    </div>
  );
}
