/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  BookMarked,
  Clock,
  Star,
  Trash2,
  Plus,
  X,
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import {
  DrawerShell,
  Divider,
  Button,
  IconButton,
  Tabs,
  EmptyState,
  Spinner
} from './ui';
import {
  getLibraryScenarios,
  LibraryScenario,
  toggleLibraryFavorite,
  deleteLibraryScenario,
  updateLibraryScenarioTropes,
  saveToLibrary
} from '../utils/libraryStore';
import { api } from '../services/api';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseScenario: (scenario: LibraryScenario) => void;
  recentCampaigns?: any[];
  onUsePreviousCampaign?: (summary: any, choice: 'reuse' | 'recreate', details: any) => void;
}

export function LibraryModal({
  isOpen,
  onClose,
  onUseScenario,
  recentCampaigns = [],
  onUsePreviousCampaign
}: LibraryModalProps) {
  const [scenarios, setScenarios] = useState<LibraryScenario[]>([]);
  const [section, setSection] = useState<'saved' | 'previous'>('saved');
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [newTropeInputs, setNewTropeInputs] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingTropeId, setAddingTropeId] = useState<string | null>(null);
  const [loadingCampaignId, setLoadingCampaignId] = useState<string | null>(null);
  const [savingCampaignId, setSavingCampaignId] = useState<string | null>(null);
  const [savedCampaignsIds, setSavedCampaignsIds] = useState<Record<string, boolean>>({});
  const [choosingBaseForId, setChoosingBaseForId] = useState<{ id: string; details: any } | null>(null);
  const [localError, setLocalError] = useState<{ id: string; message: string } | null>(null);

  const loadScenarios = () => {
    setScenarios(getLibraryScenarios());
  };

  useEffect(() => {
    if (isOpen) {
      loadScenarios();
    }
  }, [isOpen]);

  const handleToggleFavorite = (id: string) => {
    toggleLibraryFavorite(id);
    loadScenarios();
  };

  const deleteTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleDelete = (id: string) => {
    if (deletingId === id) {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
      deleteLibraryScenario(id);
      loadScenarios();
      setDeletingId(null);
    } else {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
      setDeletingId(id);
      deleteTimeoutRef.current = setTimeout(() => {
        setDeletingId((prev) => (prev === id ? null : prev));
      }, 4000);
    }
  };

  const handleCancelDelete = () => {
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
    }
    setDeletingId(null);
  };

  const handleAddTrope = (id: string, rawTrope: string) => {
    const cleaned = rawTrope.trim().replace(/\s+/g, ' ');
    if (!cleaned) return;
    const scenario = scenarios.find((s) => s.id === id);
    if (scenario) {
      const currentTropes = scenario.tropes || [];
      const exists = currentTropes.some(
        (t) => t.trim().toLowerCase() === cleaned.toLowerCase()
      );
      if (!exists) {
        updateLibraryScenarioTropes(id, [...currentTropes, cleaned]);
        loadScenarios();
      }
    }
    setNewTropeInputs((prev) => ({ ...prev, [id]: '' }));
  };

  const handleRemoveTrope = (id: string, trope: string) => {
    const scenario = scenarios.find((s) => s.id === id);
    if (scenario) {
      const currentTropes = scenario.tropes || [];
      updateLibraryScenarioTropes(id, currentTropes.filter((t) => t !== trope));
      loadScenarios();
    }
  };

  if (!isOpen) return null;

  const favoriteCount = scenarios.filter((sc) => sc.favorite).length;

  const processedScenarios = scenarios
    .filter((sc) => filter === 'all' || sc.favorite)
    .sort((a, b) => {
      if (filter === 'all') {
        const aFav = !!a.favorite;
        const bFav = !!b.favorite;
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
      }
      return b.createdAt - a.createdAt;
    });

  const sectionTabs = [
    {
      id: 'saved',
      label: 'Cenários Salvos',
      icon: <BookMarked className="w-4 h-4" />
    },
    {
      id: 'previous',
      label: 'Campanhas Anteriores',
      icon: <Clock className="w-4 h-4" />
    }
  ];

  const filterTabs = [
    {
      id: 'all',
      label: `Todos (${scenarios.length})`
    },
    {
      id: 'favorites',
      label: `Favoritos (${favoriteCount})`,
      icon: <Star className="w-4 h-4" />
    }
  ];

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Biblioteca de Cenários"
      subtitle="Acervo pessoal de ideias, premissas e mundos de campanha"
      icon={<BookMarked className="w-4 h-4 text-text-primary" />}
      maxWidthClass="sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
    >
      {/* Abas Superiores (Salvos vs Campanhas Anteriores) */}
      <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border-subtle bg-background shrink-0 space-y-3">
        <Tabs
          tabs={sectionTabs}
          activeTab={section}
          onChange={(id) => setSection(id as 'saved' | 'previous')}
          fullWidth
        />

        {/* Sub-filtro de Todos / Favoritos quando na aba de salvos */}
        {section === 'saved' && scenarios.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {filterTabs.map((tab) => {
                const isActive = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id as 'all' | 'favorites')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 radius-small typo-caption font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-surface-elevated text-text-primary border border-border-default shadow-xs'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo com rolagem */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {section === 'previous' ? (
          /* Aba: Campanhas Anteriores */
          recentCampaigns.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-6 h-6" />}
              title="Nenhuma campanha anterior encontrada"
              description="Campanhas jogadas recentemente aparecerão aqui para serem reutilizadas ou servirem de inspiração."
            />
          ) : (
            <div className="space-y-4">
              {recentCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-4 radius-medium bg-surface-subtle/40 border border-border-subtle hover:border-border-default transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="typo-section-heading text-text-primary truncate">
                        {camp.title}
                      </h3>
                      <p className="typo-caption text-text-muted mt-0.5">
                        {[
                          camp.genre && `Gênero: ${camp.genre}`,
                          `Turno ${camp.turnCount || 1}`,
                          `Último acesso em ${new Date(camp.lastPlayed).toLocaleDateString('pt-BR')}`
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                      <Button
                        size="compact"
                        variant="secondary"
                        onClick={async () => {
                          if (savingCampaignId === camp.id || savedCampaignsIds[camp.id]) return;
                          setSavingCampaignId(camp.id);
                          setLocalError(null);
                          try {
                            const details = await api.getCampaignDetails(camp.id);
                            if (details?.gameState?.foundation) {
                              const found = details.gameState.foundation;
                              saveToLibrary({
                                title: found.title || camp.title,
                                campaignFormat: found.campaignFormat || 'sandbox',
                                worldBasis: 'fictional',
                                genre: found.genre || camp.genre || '',
                                premise: found.premise || '',
                                description: found.premise || '',
                                foundation: (found as any).worldDetails
                              });
                              setSavedCampaignsIds((prev) => ({ ...prev, [camp.id]: true }));
                              loadScenarios();
                            }
                          } catch (e) {
                            console.error(e);
                            setLocalError({ id: camp.id, message: 'Não foi possível salvar a premissa desta campanha.' });
                          } finally {
                            setSavingCampaignId(null);
                          }
                        }}
                        disabled={savingCampaignId === camp.id || savedCampaignsIds[camp.id]}
                        title="Salvar premissa na Biblioteca"
                        className="gap-1.5"
                      >
                        {savingCampaignId === camp.id ? (
                          <>
                            <Spinner size="xs" variant="secondary" />
                            <span>Salvando...</span>
                          </>
                        ) : savedCampaignsIds[camp.id] ? (
                          <>
                            <Star className="w-4 h-4 text-favorite fill-favorite" />
                            <span>Salvo</span>
                          </>
                        ) : (
                          <>
                            <BookMarked className="w-4 h-4" />
                            <span>Salvar no Acervo</span>
                          </>
                        )}
                      </Button>

                      {choosingBaseForId?.id !== camp.id && (
                        <Button
                          size="compact"
                          variant="primary"
                          onClick={async () => {
                            setLoadingCampaignId(camp.id);
                            setLocalError(null);
                            try {
                              const details = await api.getCampaignDetails(camp.id);
                              setChoosingBaseForId({ id: camp.id, details: details });
                            } catch (e) {
                              console.error(e);
                              setLocalError({ id: camp.id, message: 'Não foi possível carregar os detalhes desta campanha.' });
                            } finally {
                              setLoadingCampaignId(null);
                            }
                          }}
                          disabled={loadingCampaignId === camp.id}
                          className="gap-1.5"
                        >
                          {loadingCampaignId === camp.id ? (
                            <>
                              <Spinner size="xs" variant="current" />
                              <span>Carregando...</span>
                            </>
                          ) : (
                            <>
                              <span>Usar premissa</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Erro Local Discreto */}
                  {localError?.id === camp.id && (
                    <div
                      role="alert"
                      aria-live="polite"
                      className="p-2.5 radius-small bg-danger/10 border border-danger/30 text-danger typo-caption flex items-center justify-between gap-2"
                    >
                      <span>{localError.message}</span>
                      <button
                        onClick={() => setLocalError(null)}
                        className="text-danger hover:underline shrink-0 typo-caption"
                      >
                        Fechar
                      </button>
                    </div>
                  )}

                  {/* Seleção de como usar a base existente */}
                  {choosingBaseForId?.id === camp.id && (
                    <div className="pt-3 border-t border-border-subtle space-y-2">
                      <p className="typo-secondary font-medium text-text-primary">
                        Como deseja usar esta premissa?
                      </p>
                      <div className="flex flex-col divide-y divide-border-subtle/60 border border-border-subtle radius-small overflow-hidden">
                        {!!choosingBaseForId.details?.foundation?.worldDetails && (
                          <button
                            onClick={() => {
                              if (onUsePreviousCampaign) {
                                onUsePreviousCampaign(camp, 'reuse', choosingBaseForId.details);
                                setChoosingBaseForId(null);
                              }
                            }}
                            className="text-left p-2.5 hover:bg-surface-hover active:bg-surface-active transition-colors duration-150 motion-reduce:transition-none cursor-pointer"
                          >
                            <span className="block typo-secondary font-medium text-text-primary">
                              Reutilizar base existente
                            </span>
                            <span className="block typo-caption text-text-muted mt-0.5">
                              Mantém a geografia, facções e regras do mundo e avança para a criação de personagem.
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (onUsePreviousCampaign) {
                              onUsePreviousCampaign(camp, 'recreate', choosingBaseForId.details);
                              setChoosingBaseForId(null);
                            }
                          }}
                          className="text-left p-2.5 hover:bg-surface-hover active:bg-surface-active transition-colors duration-150 motion-reduce:transition-none cursor-pointer"
                        >
                          <span className="block typo-secondary font-medium text-text-primary">
                            Recriar a partir da premissa
                          </span>
                          <span className="block typo-caption text-text-muted mt-0.5">
                            Abre a premissa na aba de criação para ajustar detalhes e gerar um novo universo.
                          </span>
                        </button>
                      </div>
                      <button
                        onClick={() => setChoosingBaseForId(null)}
                        className="typo-caption text-text-muted hover:text-text-secondary self-start pt-1 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          /* Aba: Cenários Salvos */
          processedScenarios.length === 0 ? (
            <EmptyState
              icon={<BookMarked className="w-6 h-6" />}
              title={
                filter === 'favorites'
                  ? 'Nenhum cenário favoritado'
                  : 'Nenhum cenário salvo na biblioteca'
              }
              description={
                filter === 'favorites'
                  ? 'Marque a estrela nos seus cenários preferidos para encontrá-los rapidamente aqui.'
                  : 'Ideias de campanha e premissas salvas durante a criação aparecerão no seu acervo.'
              }
            />
          ) : (
            <div className="space-y-4">
              {processedScenarios.map((sc) => {
                const formatLabel =
                  sc.campaignFormat === 'sandbox' ? 'Sandbox' : 'Foco Narrativo';
                const basisLabel =
                  sc.worldBasis === 'real_world' ? 'Mundo Real' : 'Mundo Ficcional';
                const metaString = [
                  `${formatLabel} · ${basisLabel}`,
                  sc.genre && `Gênero: ${sc.genre}`
                ]
                  .filter(Boolean)
                  .join(' • ');

                return (
                  <div
                    key={sc.id}
                    className="p-4 radius-medium bg-surface-subtle/40 border border-border-subtle hover:border-border-default transition-colors space-y-3"
                  >
                    {/* Linha de Cabeçalho do Card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="typo-section-heading text-text-primary truncate">
                            {sc.title}
                          </h3>
                        </div>
                        <p className="typo-caption text-text-muted mt-0.5">
                          {metaString}
                        </p>
                      </div>

                      {/* Botão de Favorito Discreto */}
                      <button
                        onClick={() => handleToggleFavorite(sc.id)}
                        className="p-1.5 -mr-1 radius-small text-text-secondary hover:text-favorite hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
                        title={
                          sc.favorite
                            ? 'Remover dos favoritos'
                            : 'Adicionar aos favoritos'
                        }
                        aria-label={
                          sc.favorite
                            ? 'Remover dos favoritos'
                            : 'Adicionar aos favoritos'
                        }
                        aria-pressed={!!sc.favorite}
                      >
                        <Star
                          className={`w-4 h-4 transition-colors ${
                            sc.favorite
                              ? 'fill-favorite text-favorite'
                              : 'text-text-secondary'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Premissa / Descrição Principal */}
                    <p className="typo-body text-text-secondary line-clamp-3 leading-relaxed">
                      {sc.premise || sc.description}
                    </p>

                    {/* Tropes / Tags Organizacionais */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {(sc.tropes || []).map((trope) => (
                        <span
                          key={trope}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 radius-small bg-surface-subtle typo-caption text-text-secondary"
                        >
                          <span>{trope}</span>
                          <button
                            onClick={() => handleRemoveTrope(sc.id, trope)}
                            className="text-text-muted hover:text-danger transition-colors cursor-pointer"
                            title="Remover trope"
                            aria-label={`Remover trope ${trope}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}

                      {addingTropeId === sc.id ? (
                        <div className="inline-flex items-center">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Nome da trope..."
                            value={newTropeInputs[sc.id] || ''}
                            onChange={(e) =>
                              setNewTropeInputs((prev) => ({
                                ...prev,
                                [sc.id]: e.target.value
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTrope(sc.id, newTropeInputs[sc.id] || '');
                                setAddingTropeId(null);
                              } else if (e.key === 'Escape') {
                                setNewTropeInputs((prev) => ({ ...prev, [sc.id]: '' }));
                                setAddingTropeId(null);
                              }
                            }}
                            onBlur={() => {
                              // Ao perder o foco sem pressionar Enter, cancela para evitar salvar texto acidental ou incompleto
                              setNewTropeInputs((prev) => ({ ...prev, [sc.id]: '' }));
                              setAddingTropeId(null);
                            }}
                            className="bg-surface-elevated border border-border-strong text-text-primary typo-caption radius-small px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-border-strong"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAddingTropeId(sc.id);
                            setNewTropeInputs((prev) => ({ ...prev, [sc.id]: '' }));
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 radius-small bg-surface-subtle/50 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors typo-caption cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>
                            {(sc.tropes || []).length === 0
                              ? 'Adicionar trope'
                              : 'Trope'}
                          </span>
                        </button>
                      )}
                    </div>

                    <Divider className="my-1" />

                    {/* Rodapé do Card: Data, Remoção e Ação Primária */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 typo-caption text-text-muted">
                        <span>
                          Salvo em{' '}
                          {new Date(sc.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                        <span>•</span>
                        {deletingId === sc.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDelete(sc.id)}
                              className="text-danger font-medium flex items-center gap-1 cursor-pointer hover:underline"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Confirmar exclusão?</span>
                            </button>
                            <span className="text-text-muted">/</span>
                            <button
                              onClick={handleCancelDelete}
                              className="text-text-muted hover:text-text-primary cursor-pointer typo-caption"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDelete(sc.id)}
                            className="text-text-muted hover:text-danger transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Remover</span>
                          </button>
                        )}
                      </div>

                      {/* Ação Primária */}
                      <Button
                        size="compact"
                        variant="primary"
                        onClick={() => onUseScenario(sc)}
                        className="gap-1.5 self-end sm:self-auto"
                      >
                        <span>Usar como base</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </DrawerShell>
  );
}
