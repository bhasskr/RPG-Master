/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  User,
  MapPin,
  Package,
  Target,
  BookOpen,
  Clock,
  Calendar,
  Coins,
  CheckCircle2,
  Circle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { DrawerShell, Divider, Badge, Button, IconButton } from './ui';
import { GameState, CampaignMemorySnapshot } from '../types';
import { api } from '../services/api';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  gameState: GameState | null;
}

export function InfoModal({ isOpen, onClose, campaignId, gameState }: InfoModalProps) {
  const [snapshot, setSnapshot] = useState<CampaignMemorySnapshot | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState<boolean>(false);

  // Carrega snapshot opcional caso necessário para complementar dados
  const loadMemoryData = useCallback(async () => {
    if (!campaignId || !isOpen) return;
    setIsLoadingSnapshot(true);
    try {
      const data = await api.getMemorySnapshot(campaignId);
      if (data) {
        setSnapshot(data);
      }
    } catch (err: unknown) {
      console.warn('[InfoModal] Aviso ao carregar snapshot complementar:', err);
    } finally {
      setIsLoadingSnapshot(false);
    }
  }, [campaignId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadMemoryData();
    }
  }, [isOpen, loadMemoryData]);

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

  // 1. Dados do Personagem
  const player = gameState?.player;
  const playerName = player?.name?.trim() || 'Protagonista';
  const playerRole = player?.occupation || player?.archetype || player?.concept || player?.origin;
  const playerAppearance = player?.appearance || player?.description;
  const playerAttributes = player?.attributes ? Object.entries(player.attributes) : [];
  
  // Status vital / Condição
  const getPlayerStatusBadge = (status?: string) => {
    switch (status) {
      case 'alive':
        return <Badge variant="success">Saudável</Badge>;
      case 'unconscious':
        return <Badge variant="warning">Inconsciente</Badge>;
      case 'deceased':
        return <Badge variant="danger">Derrotado</Badge>;
      default:
        return <Badge variant="neutral">Ativo</Badge>;
    }
  };

  // 2. Situação Atual
  const currentLocation = gameState?.worldState?.currentLocation || snapshot?.campaign?.currentLocation || 'Mundo da Campanha';
  const timeOfDay = gameState?.worldState?.timeOfDay;
  const worldDate = snapshot?.campaign?.currentDate;
  const weather = gameState?.worldState?.weather;
  const tensionLevel = gameState?.worldState?.tensionLevel || 'calm';
  const statusSummary = gameState?.worldState?.statusSummary;

  const getTensionBadge = (level: string) => {
    switch (level) {
      case 'combat':
        return <Badge variant="danger">Combate</Badge>;
      case 'critical':
        return <Badge variant="danger">Tensão Crítica</Badge>;
      case 'tense':
        return <Badge variant="warning">Tensão</Badge>;
      default:
        return null;
    }
  };

  // 3. Inventário e Recursos
  const inventoryItems = gameState?.inventory?.items || [];
  const rawCurrencies = gameState?.inventory?.currency;
  const currencies = rawCurrencies
    ? Object.entries(rawCurrencies).filter(([, val]) => typeof val === 'number' && val > 0)
    : [];

  // 4. Objetivos / Quests Ativas (apenas ativas/pendentes)
  const allQuests = gameState?.quests || (snapshot?.quests?.map((q) => ({
    id: q.id,
    title: q.title,
    description: '',
    status: (q.status as any) || 'active',
    objectives: Array.isArray(q.objectives)
      ? q.objectives.map((obj, i) => (typeof obj === 'string' ? { id: `obj_${i}`, description: obj, isCompleted: false } : { id: `obj_${i}`, description: obj.description, isCompleted: Boolean(obj.isCompleted) }))
      : [],
  })) || []);
  const activeQuests = allQuests.filter(q => q.status === 'active' || !q.status);

  // 5. Campanha Compacta
  const foundation = gameState?.foundation;
  const campaignTitle = foundation?.title || snapshot?.campaign?.name || 'Aventura Atual';
  const campaignFormat = foundation?.campaignFormat === 'focused' ? 'Foco Narrativo' : 'Sandbox Aberto';
  const genre = foundation?.genre;
  const premise = foundation?.premise;
  const currentTurn = gameState?.turn || 1;

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Ficha & Informações"
      subtitle={`${campaignTitle} • Turno ${currentTurn}`}
      icon={<User className="w-4 h-4 text-text-primary" />}
      maxWidthClass="sm:max-w-md md:max-w-lg"
      headerActions={
        <IconButton
          onClick={loadMemoryData}
          disabled={isLoadingSnapshot}
          variant="ghost"
          size="compact"
          title="Atualizar dados"
          aria-label="Atualizar dados da ficha"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingSnapshot ? 'animate-spin' : ''}`} />
        </IconButton>
      }
      footer={
        <div className="w-full flex items-center justify-between">
          <span className="typo-caption text-text-muted">
            Estado sincronizado com o turno atual
          </span>
          <Button variant="secondary" size="compact" onClick={onClose}>
            Fechar
          </Button>
        </div>
      }
    >
      <div className="p-4 sm:p-6 space-y-6">
        {/* BLOCO 1: PERSONAGEM */}
        <section id="info-section-character" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 typo-section-heading text-text-muted">
              <User className="w-4 h-4" />
              <span>Personagem</span>
            </h3>
            {player && getPlayerStatusBadge(player.status)}
          </div>

          <div className="space-y-2">
            <div>
              <h4 className="typo-heading text-text-primary">
                {playerName}
              </h4>
              {playerRole && (
                <p className="typo-secondary text-text-muted mt-0.5">
                  {playerRole}
                </p>
              )}
            </div>

            {playerAppearance && (
              <p className="typo-body text-text-secondary leading-relaxed pt-1">
                {playerAppearance}
              </p>
            )}

            {/* Atributos Mecânicos (se existirem) */}
            {playerAttributes.length > 0 && (
              <div className="pt-2">
                <span className="typo-caption text-text-muted block mb-1.5 font-medium">
                  Atributos & Capacidades
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                  {playerAttributes.map(([attr, val]) => (
                    <div
                      key={attr}
                      className="py-1 border-b border-border-subtle/40 flex items-center justify-between"
                    >
                      <span className="typo-caption capitalize text-text-secondary">
                        {attr}
                      </span>
                      <span className="text-xs font-medium text-text-primary">
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <Divider />

        {/* BLOCO 2: SITUAÇÃO ATUAL */}
        <section id="info-section-situation" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 typo-section-heading text-text-muted">
              <MapPin className="w-4 h-4" />
              <span>Situação Atual</span>
            </h3>
            {getTensionBadge(tensionLevel)}
          </div>

          <div className="space-y-2.5">
            <div>
              <span className="typo-caption text-text-muted block">Local</span>
              <p className="typo-body font-medium text-text-primary">
                {currentLocation}
              </p>
            </div>

            {(timeOfDay || worldDate || weather) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 typo-caption text-text-secondary pt-1">
                {timeOfDay && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-text-muted shrink-0" />
                    <span>{timeOfDay}</span>
                  </div>
                )}
                {worldDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-text-muted shrink-0" />
                    <span>{worldDate}</span>
                  </div>
                )}
                {weather && (
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-text-muted shrink-0" />
                    <span>{weather}</span>
                  </div>
                )}
              </div>
            )}

            {statusSummary && (
              <p className="typo-caption text-text-secondary leading-relaxed pt-1 border-l-2 border-border-default pl-3">
                {statusSummary}
              </p>
            )}
          </div>
        </section>

        <Divider />

        {/* BLOCO 3: OBJETIVOS ATIVOS */}
        <section id="info-section-quests" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 typo-section-heading text-text-muted">
              <Target className="w-4 h-4" />
              <span>Objetivos Ativos</span>
            </h3>
            {activeQuests.length > 0 && (
              <span className="typo-caption text-text-muted">
                {activeQuests.length}
              </span>
            )}
          </div>

          {activeQuests.length === 0 ? (
            <p className="typo-caption text-text-muted italic py-1">
              Nenhum objetivo pendente no momento.
            </p>
          ) : (
            <div className="space-y-3">
              {activeQuests.map((quest) => (
                <div
                  key={quest.id}
                  className="space-y-1.5 pb-3 border-b border-border-subtle/60 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="typo-body font-medium text-text-primary">
                      {quest.title}
                    </h4>
                  </div>

                  {quest.description && (
                    <p className="typo-caption text-text-secondary leading-relaxed">
                      {quest.description}
                    </p>
                  )}

                  {(() => {
                    const pendingObjs = (quest.objectives || []).filter(o => !o.isCompleted);
                    const nextObj = pendingObjs[0] || (quest.objectives && quest.objectives[0]);
                    if (!nextObj) return null;
                    return (
                      <div className="pt-1 flex items-start gap-2 typo-caption">
                        <Circle className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                        <span className="text-text-secondary">
                          <span className="text-text-muted font-medium mr-1">Próximo objetivo:</span>
                          {nextObj.description}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </section>

        <Divider />

        {/* BLOCO 4: INVENTÁRIO & RECURSOS */}
        <section id="info-section-inventory" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 typo-section-heading text-text-muted">
              <Package className="w-4 h-4" />
              <span>Inventário & Recursos</span>
            </h3>
            {inventoryItems.length > 0 && (
              <span className="typo-caption text-text-muted">
                {inventoryItems.length} {inventoryItems.length === 1 ? 'item' : 'itens'}
              </span>
            )}
          </div>

          {/* Recursos / Moedas */}
          {currencies.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pb-1">
              {currencies.map(([currencyName, amount]) => (
                <div
                  key={currencyName}
                  className="flex items-center gap-1.5 typo-caption"
                >
                  <Coins className="w-4 h-4 text-favorite shrink-0" />
                  <span className="capitalize text-text-secondary">{currencyName}:</span>
                  <span className="font-medium text-text-primary">{amount}</span>
                </div>
              ))}
            </div>
          )}

          {/* Lista de Itens */}
          {inventoryItems.length === 0 ? (
            <p className="typo-caption text-text-muted italic py-1">
              Inventário vazio.
            </p>
          ) : (
            <div className="divide-y divide-border-subtle/50">
              {inventoryItems.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-left hover:bg-surface-subtle/30 px-1.5 -mx-1.5 radius-small transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="typo-secondary font-medium text-text-primary truncate">
                        {item.name}
                      </span>
                      {item.isEquipped && (
                        <Badge variant="success" className="py-0 px-1.5">
                          Equipado
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="typo-caption text-text-muted truncate mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                  {item.quantity > 1 && (
                    <span className="typo-caption font-medium text-text-muted shrink-0">
                      x{item.quantity}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <Divider />

        {/* BLOCO 5: CAMPANHA */}
        <section id="info-section-campaign" className="space-y-2.5">
          <div className="flex items-center gap-2">
            <h3 className="flex items-center gap-2 typo-section-heading text-text-muted">
              <BookOpen className="w-4 h-4" />
              <span>Campanha</span>
            </h3>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="typo-secondary font-medium text-text-primary">
                {campaignTitle}
              </span>
              <span className="typo-caption text-text-muted">•</span>
              <span className="typo-caption text-text-muted">{campaignFormat}</span>
              {genre && (
                <>
                  <span className="typo-caption text-text-muted">•</span>
                  <span className="typo-caption text-text-muted">{genre}</span>
                </>
              )}
            </div>

            {premise && (
              <p className="typo-caption text-text-secondary leading-relaxed">
                {premise}
              </p>
            )}
          </div>
        </section>
      </div>
    </DrawerShell>
  );
}
