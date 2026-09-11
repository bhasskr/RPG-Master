/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RefreshCw, XCircle, AlertCircle } from 'lucide-react';
import { AppError } from '../types';
import { Button, IconButton } from './ui';

interface ErrorBannerProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ error, onRetry, onDismiss }: ErrorBannerProps) {
  const isKeyError = error.code === 'MISSING_API_KEY';

  return (
    <div
      role="alert"
      aria-live="assertive"
      id="app-error-banner"
      className="mx-4 my-3 radius-medium border border-danger/40 bg-danger-subtle/40 p-3.5 shadow-sm text-text-primary animate-fade-in flex flex-col sm:flex-row items-start justify-between gap-4"
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-danger">
            {isKeyError ? 'Configuração Necessária' : 'Aviso do Sistema'}
          </p>
          <p className="text-sm text-text-primary mt-1 leading-relaxed">
            {error.message}
          </p>
          {isKeyError && (
            <p className="text-xs text-text-secondary mt-2 bg-surface-subtle p-2 radius-small border border-border-default inline-block">
              💡 Configure a <code className="font-mono text-text-primary font-semibold">GEMINI_API_KEY</code> em Settings &gt; Secrets.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
        {onRetry && (
          <Button
            id="retry-action-button"
            onClick={onRetry}
            variant="danger"
            size="compact"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </Button>
        )}
        {onDismiss && (
          <IconButton
            id="dismiss-error-button"
            onClick={onDismiss}
            variant="ghost"
            size="compact"
            title="Fechar"
            className="text-text-muted hover:text-danger"
          >
            <XCircle className="w-4 h-4" />
          </IconButton>
        )}
      </div>
    </div>
  );
}
