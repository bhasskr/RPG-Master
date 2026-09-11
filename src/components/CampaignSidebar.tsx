/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { X, Shield, MapPin, Layers, User, Package } from 'lucide-react';
import { GameState, ApiStatusData } from '../types';
import { IconButton } from './ui';

interface CampaignSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState | null;
  statusData: ApiStatusData | null;
}

export function CampaignSidebar({ isOpen, onClose, gameState, statusData }: CampaignSidebarProps) {
  if (!isOpen) return null;

  return (
    <div
      id="campaign-sidebar-drawer"
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-80 md:w-96 bg-background border-l border-border-default elevation-medium flex flex-col animate-slide-left"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-background">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 radius-medium bg-surface-elevated border border-border-default flex items-center justify-center text-text-primary">
            <Shield className="w-4 h-4 text-text-secondary" />
          </div>
          <h2 className="typo-heading text-text-primary">
            Sistemas & Estado do Mundo
          </h2>
        </div>
        <IconButton
          id="close-sidebar-button"
          onClick={onClose}
          variant="ghost"
          size="compact"
          title="Fechar painel"
          aria-label="Fechar painel"
        >
          <X className="w-4 h-4" />
        </IconButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-text-secondary">
        {/* World State */}
        {gameState && (
          <div>
            <h3 className="typo-section-heading text-text-muted mb-3 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-text-secondary" /> Estado do Mundo
            </h3>
            <div className="space-y-2">
              <div className="p-3 bg-surface-subtle/50 radius-medium border border-border-subtle">
                <p className="typo-secondary font-medium text-text-primary mb-0.5">
                  Localização: {gameState.worldState.currentLocation || 'Não definida'}
                </p>
                <p className="typo-caption text-text-muted">
                  {gameState.foundation.title ? gameState.foundation.title : 'Campanha livre'}
                </p>
              </div>

              {(gameState.worldState.timeOfDay || gameState.worldState.weather) && (
                <div className="p-3 bg-surface-subtle/50 radius-medium border border-border-subtle flex items-center justify-between">
                  <div>
                    {gameState.worldState.timeOfDay && (
                      <p className="typo-secondary text-text-primary">
                        Momento: {gameState.worldState.timeOfDay}
                      </p>
                    )}
                    {gameState.worldState.weather && (
                      <p className="typo-caption text-text-muted">
                        Clima: {gameState.worldState.weather}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Protagonist Sheet */}
        {gameState && (
          <div>
            <h3 className="typo-section-heading text-text-muted mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4 text-text-secondary" /> Ficha do Personagem
            </h3>
            <div className="p-3 bg-surface-subtle/50 radius-medium border border-border-subtle space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-text-primary typo-secondary">
                  {gameState.player.name || 'Personagem não definido'}
                </span>
                {gameState.player.archetype && (
                  <span className="typo-caption text-text-muted">{gameState.player.archetype}</span>
                )}
              </div>
              {gameState.player.description && (
                <p className="typo-caption text-text-secondary leading-relaxed">{gameState.player.description}</p>
              )}
              {gameState.player.attributes && Object.keys(gameState.player.attributes).length > 0 && (
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-border-subtle">
                  {Object.entries(gameState.player.attributes).map(([attr, val]) => (
                    <div key={attr} className="flex justify-between px-2 py-1 bg-surface-elevated radius-small border border-border-subtle">
                      <span className="capitalize typo-caption text-text-muted">{attr}:</span>
                      <span className="text-text-primary font-medium typo-caption">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inventory & Quests */}
        {gameState && (
          <div>
            <h3 className="typo-section-heading text-text-muted mb-3 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-text-secondary" /> Inventário & Objetivos
            </h3>
            <div className="p-3 bg-surface-subtle/50 radius-medium border border-border-subtle space-y-2.5">
              <div className="typo-caption font-medium text-text-muted">Itens:</div>
              {gameState.inventory.items.length === 0 ? (
                <p className="typo-caption text-text-muted italic">Nenhum item registrado.</p>
              ) : (
                <ul className="space-y-1">
                  {gameState.inventory.items.map((item) => (
                    <li key={item.id} className="typo-caption text-text-secondary pl-2 border-l border-border-default flex justify-between">
                      <span>{item.name}</span>
                      <span className="text-text-muted typo-caption">x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              )}

              {gameState.quests.length > 0 && (
                <div className="pt-2 border-t border-border-subtle">
                  <div className="typo-caption font-medium text-text-muted mb-1">Objetivo Ativo:</div>
                  <div className="text-text-primary font-medium typo-secondary">{gameState.quests[0].title}</div>
                  <p className="typo-caption text-text-muted mt-0.5 leading-relaxed">{gameState.quests[0].description}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Systems Architecture & Config */}
        <div>
          <h3 className="typo-section-heading text-text-muted mb-3 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-text-secondary" /> Arquitetura do Sistema
          </h3>
          <div className="space-y-1 mb-4">
            <div className="flex items-center space-x-3 px-3 py-2 bg-surface-elevated text-text-primary radius-medium border border-border-default">
              <span className="typo-secondary">Controle Narrativo ({statusData?.narratorModel || 'Gemini 3.7 Flash'})</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 text-text-muted">
              <span className="typo-caption">GameState Manager</span>
              <span className="typo-caption text-success">Ativo</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 text-text-muted">
              <span className="typo-caption">Persistência de Memória</span>
              <span className="typo-caption text-text-secondary">{statusData?.memoryStoreType || 'InMemory'}</span>
            </div>
          </div>

          <div className="typo-caption font-medium text-text-muted mb-2">Configuração Ativa</div>
          <div className="p-3 radius-medium bg-surface-subtle border border-border-subtle typo-caption font-mono text-text-secondary leading-relaxed">
            modelo: {statusData?.narratorModel || 'gemini-3.7-flash'}<br />
            temperatura: 0.85<br />
            profundidade_memoria: turn_aware<br />
            chave_gemini: {statusData?.isApiKeyConfigured ? 'CONECTADA' : 'PENDENTE'}
          </div>
        </div>
      </div>
    </div>
  );
}
