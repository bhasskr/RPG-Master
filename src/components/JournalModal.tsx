/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  MapPin,
  HelpCircle,
  FileText,
  Clock,
  Star,
  CheckCircle2,
  Circle,
  XCircle,
  Compass,
  Sparkles,
  HeartHandshake
} from 'lucide-react';
import { DrawerShell, Divider, Badge, EmptyState, LoadingState } from './ui';
import { CampaignMemorySnapshot } from '../types';
import { api } from '../services/api';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
}

type TabType = 'people' | 'places' | 'rumors' | 'quests' | 'timeline';

export function JournalModal({ isOpen, onClose, campaignId }: JournalModalProps) {
  const [snapshot, setSnapshot] = useState<CampaignMemorySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('people');

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      api
        .getMemorySnapshot(campaignId)
        .then((data) => {
          setSnapshot(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.warn('[JournalModal] Erro ao carregar memória:', err);
          setIsLoading(false);
        });
    }
  }, [isOpen, campaignId]);

  // Tecla ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 1. Pessoas Conhecidas
  const knownPeople = useMemo(() => {
    if (!snapshot) return [];
    const peopleMap = new Map<string, {
      id: string;
      name: string;
      role?: string;
      faction?: string;
      location?: string;
      notes?: string;
      status?: string;
    }>();

    // NPCs cadastrados
    Object.values(snapshot.npcs || {}).forEach((npc) => {
      if (npc.name) {
        peopleMap.set(npc.name.toLowerCase(), {
          id: npc.id || `npc_${npc.name}`,
          name: npc.name,
          faction: npc.faction,
          location: npc.location,
          notes: npc.personalityNotes,
          status: npc.status,
        });
      }
    });

    // Pessoas vindas de relacionamentos com o jogador
    (snapshot.relationships || []).forEach((rel) => {
      const charA = rel.characterA?.trim();
      const charB = rel.characterB?.trim();
      if (charA && charA.toLowerCase() === 'player' && charB) {
        const key = charB.toLowerCase();
        if (!peopleMap.has(key)) {
          peopleMap.set(key, { id: `rel_${charB}`, name: charB });
        }
      } else if (charB && charB.toLowerCase() === 'player' && charA) {
        const key = charA.toLowerCase();
        if (!peopleMap.has(key)) {
          peopleMap.set(key, { id: `rel_${charA}`, name: charA });
        }
      }
    });

    // Pessoas que interagiram em eventos
    (snapshot.events || []).forEach((e) => {
      const participants = e.participants || [];
      if (participants.some((p) => p.toLowerCase() === 'player')) {
        participants.forEach((p) => {
          if (p.toLowerCase() !== 'player' && p.trim()) {
            const key = p.toLowerCase();
            if (!peopleMap.has(key)) {
              peopleMap.set(key, { id: `evt_${p}`, name: p });
            }
          }
        });
      }
    });

    return Array.from(peopleMap.values());
  }, [snapshot]);

  // Relações do Jogador
  const playerRelationships = useMemo(() => {
    if (!snapshot?.relationships) return [];
    return snapshot.relationships.filter(
      (rel) =>
        rel.characterA?.toLowerCase() === 'player' ||
        rel.characterB?.toLowerCase() === 'player'
    );
  }, [snapshot]);

  // Helper para descrever relação de forma qualitativa sem expor números brutos
  const getQualitativeRelation = (trust = 50, hostility = 0, familiarity = 30): { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' } => {
    if (hostility >= 60) return { label: 'Hostilidade declarada', variant: 'danger' };
    if (hostility >= 30) return { label: 'Tensão evidente', variant: 'warning' };
    if (trust >= 75) return { label: 'Vínculo de confiança', variant: 'success' };
    if (trust >= 55) return { label: 'Relação amigável', variant: 'success' };
    if (familiarity >= 60) return { label: 'Conhecido próximo', variant: 'neutral' };
    if (familiarity < 25 && trust <= 50) return { label: 'Relação distante', variant: 'neutral' };
    return { label: 'Relação neutra', variant: 'neutral' };
  };

  // 2. Lugares Conhecidos
  const currentLocation = snapshot?.campaign?.currentLocation?.trim();
  const knownPlaces = useMemo(() => {
    if (!snapshot) return [];
    const placeSet = new Set<string>();

    if (currentLocation) placeSet.add(currentLocation);
    (snapshot.events || []).forEach((e) => {
      if (e.location?.trim()) placeSet.add(e.location.trim());
    });
    Object.values(snapshot.npcs || {}).forEach((n) => {
      if (n.location?.trim()) placeSet.add(n.location.trim());
    });

    return Array.from(placeSet).filter(Boolean);
  }, [snapshot, currentLocation]);

  // 3. Rumores e Segredos (apenas conhecimento acessível ao jogador)
  const knownKnowledge = useMemo(() => {
    if (!snapshot?.knowledge) return [];
    return snapshot.knowledge.filter((k) => {
      const isKnown = k.knownBy?.some((p) => p.toLowerCase() === 'player');
      const isSuspected = k.suspectedBy?.some((p) => p.toLowerCase() === 'player');
      return isKnown || isSuspected;
    });
  }, [snapshot]);

  // 4. Quests Agrupadas por Estado
  const groupedQuests = useMemo(() => {
    const quests = snapshot?.quests || [];
    return {
      active: quests.filter((q) => !q.status || q.status === 'active'),
      completed: quests.filter((q) => q.status === 'completed'),
      failed: quests.filter((q) => q.status === 'failed'),
    };
  }, [snapshot]);

  // 5. Linha do Tempo (Eventos e Marcos)
  const nonTrivialEvents = useMemo(() => {
    if (!snapshot?.events) return [];
    return snapshot.events.filter((e) => {
      const text = `${e.description || ''} ${(e.consequences || []).join(' ')}`.toLowerCase();
      const isTrivial = /^(o jogador )?(apenas )?(olha|olhou|inspeciona|inspecionou|observa|observou|examina|examinou|nota|notou|pergunta|perguntou|fala|falou|conversa|conversou|entra|entrou|caminha|caminhou|vai para|chega|chegou) /.test(
        text.trim()
      );
      const hasImpact = Boolean(e.consequences && e.consequences.length > 0);
      return !isTrivial || hasImpact;
    });
  }, [snapshot]);

  const milestones = useMemo(() => {
    return nonTrivialEvents.filter((e) => {
      const text = `${e.description || ''} ${(e.consequences || []).join(' ')}`.toLowerCase();
      const isMajor = /(morte|morre|morreu|mata|matou|assassina|descobre|descoberta|início|começa|fim|termina|conclui|acordo|pacto|aliança|destrói|destruído|batalha|combate|luta|permanente|salva|resgata|grande impacto|revela)/.test(
        text
      );
      return e.consequences && e.consequences.length > 0 && isMajor;
    });
  }, [nonTrivialEvents]);

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'people', label: 'Pessoas', count: knownPeople.length },
    { id: 'places', label: 'Lugares', count: knownPlaces.length },
    { id: 'rumors', label: 'Rumores & Segredos', count: knownKnowledge.length },
    { id: 'quests', label: 'Quests', count: (snapshot?.quests || []).length },
    { id: 'timeline', label: 'Eventos & Marcos', count: nonTrivialEvents.length },
  ];

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Diário da Campanha"
      subtitle="Compêndio de memórias, descobertas e história"
      icon={<FileText className="w-4 h-4 text-text-primary" />}
      maxWidthClass="sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
    >
      {/* Barra de Abas */}
      <div className="px-4 sm:px-6 py-2.5 bg-background border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 radius-small typo-caption font-medium transition-colors duration-150 motion-reduce:transition-none whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-surface-elevated text-text-primary border border-border-default shadow-xs'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className="font-mono text-xs text-text-muted">
                    ({tab.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo da Aba */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <LoadingState message="Carregando diário..." size="md" />
        ) : (
          <div className="space-y-6">
            {/* ABA 1: PESSOAS & RELAÇÕES */}
            {activeTab === 'people' && (
              <div className="space-y-6">
                {/* Lista de Pessoas */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 typo-section-heading text-text-muted">
                    <Users className="w-4 h-4" />
                    <span>Pessoas Conhecidas</span>
                  </h3>

                  {knownPeople.length === 0 ? (
                    <EmptyState
                      icon={<Users className="w-6 h-6" />}
                      title="Nenhuma pessoa registrada"
                      description="Personagens e aliados conhecidos aparecerão aqui conforme você interagir com o mundo."
                    />
                  ) : (
                    <div className="divide-y divide-border-subtle/60">
                      {knownPeople.map((person) => (
                        <div
                          key={person.id}
                          className="py-3.5 first:pt-0 last:pb-0 space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="typo-body font-medium text-text-primary truncate">
                                {person.name}
                              </h4>
                              {(person.role || person.faction) && (
                                <p className="typo-caption text-text-muted truncate mt-0.5">
                                  {[person.role, person.faction].filter(Boolean).join(' • ')}
                                </p>
                              )}
                            </div>
                            {person.status && person.status !== 'alive' && (
                              <Badge variant="neutral" className="capitalize">
                                {person.status}
                              </Badge>
                            )}
                          </div>

                          {person.location && (
                            <div className="flex items-center gap-1.5 typo-caption text-text-muted">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{person.location}</span>
                            </div>
                          )}

                          {person.notes && (
                            <p className="typo-caption text-text-secondary italic border-l border-border-default pl-2 py-0.5 leading-relaxed">
                              "{person.notes}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Relações Notáveis */}
                {playerRelationships.length > 0 && (
                  <>
                    <Divider />
                    <div className="space-y-3">
                      <h3 className="flex items-center gap-2 typo-section-heading text-text-muted">
                        <HeartHandshake className="w-4 h-4" />
                        <span>Dinâmica de Relações</span>
                      </h3>

                      <div className="divide-y divide-border-subtle/60">
                        {playerRelationships.map((rel, idx) => {
                          const otherChar =
                            rel.characterA?.toLowerCase() === 'player'
                              ? rel.characterB
                              : rel.characterA;
                          const relationQualitative = getQualitativeRelation(
                            rel.trust,
                            rel.hostility,
                            rel.familiarity
                          );

                          return (
                            <div
                              key={idx}
                              className="py-3.5 first:pt-0 last:pb-0 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="typo-secondary font-medium text-text-primary">
                                  {otherChar}
                                </span>
                                <span
                                  className={`typo-caption font-medium ${
                                    relationQualitative.variant === 'danger'
                                      ? 'text-danger'
                                      : relationQualitative.variant === 'warning'
                                      ? 'text-warning'
                                      : relationQualitative.variant === 'success'
                                      ? 'text-success'
                                      : 'text-text-muted'
                                  }`}
                                >
                                  {relationQualitative.label}
                                </span>
                              </div>

                              {rel.importantHistory && rel.importantHistory.length > 0 && (
                                <div className="space-y-1">
                                  {rel.importantHistory.map((hist, hIdx) => (
                                    <p
                                      key={hIdx}
                                      className="typo-caption text-text-secondary leading-relaxed pl-2 border-l border-border-subtle"
                                    >
                                      {hist}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ABA 2: LUGARES */}
            {activeTab === 'places' && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 typo-section-heading text-text-muted">
                  <Compass className="w-4 h-4" />
                  <span>Locais Descobertos</span>
                </h3>

                {knownPlaces.length === 0 ? (
                  <EmptyState
                    icon={<Compass className="w-6 h-6" />}
                    title="Nenhum local registrado"
                    description="Cidades, marcos geográficos e salas visitadas serão anotados conforme a exploração."
                  />
                ) : (
                  <div className="divide-y divide-border-subtle/60">
                    {knownPlaces.map((place, idx) => {
                      const isCurrent = place === currentLocation;
                      return (
                        <div
                          key={idx}
                          className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <MapPin className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-text-primary' : 'text-text-muted'}`} />
                            <div className="min-w-0">
                              <h4 className={`typo-body truncate ${isCurrent ? 'font-semibold text-text-primary' : 'font-medium text-text-primary'}`}>
                                {place}
                              </h4>
                              <p className="typo-caption text-text-muted">
                                {isCurrent ? 'Localização atual da campanha' : 'Local conhecido ou visitado'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ABA 3: RUMORES & SEGREDOS */}
            {activeTab === 'rumors' && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 typo-section-heading text-text-muted">
                  <HelpCircle className="w-4 h-4" />
                  <span>Conhecimento & Descobertas</span>
                </h3>

                {knownKnowledge.length === 0 ? (
                  <EmptyState
                    icon={<HelpCircle className="w-6 h-6" />}
                    title="Nenhum rumor conhecido"
                    description="Segredos, boatos e pistas revelados durante diálogos e investigações ficarão salvos aqui."
                  />
                ) : (
                  <div className="divide-y divide-border-subtle/60">
                    {knownKnowledge.map((k) => {
                      const statusLower = (k.truthStatus || '').toLowerCase();
                      const isRumor = statusLower.includes('rumor') || statusLower.includes('report');
                      const isSuspicion = statusLower.includes('suspic');

                      let categoryLabel = 'Fato Conhecido';
                      let badgeVariant: 'neutral' | 'warning' | 'info' = 'neutral';

                      if (isRumor) {
                        categoryLabel = 'Rumor / Boato';
                        badgeVariant = 'warning';
                      } else if (isSuspicion) {
                        categoryLabel = 'Suspeita';
                        badgeVariant = 'info';
                      } else {
                        categoryLabel = 'Descoberta';
                        badgeVariant = 'neutral';
                      }

                      return (
                        <div
                          key={k.id}
                          className="py-3.5 first:pt-0 last:pb-0 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 typo-caption">
                            <span
                              className={`font-medium ${
                                badgeVariant === 'warning'
                                  ? 'text-warning'
                                  : badgeVariant === 'info'
                                  ? 'text-info'
                                  : 'text-text-secondary'
                              }`}
                            >
                              {categoryLabel}
                            </span>
                            {k.source && (
                              <span className="text-text-muted truncate">
                                Fonte: {k.source}
                              </span>
                            )}
                          </div>

                          <p className="typo-body text-text-primary leading-relaxed">
                            {k.fact}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ABA 4: QUESTS */}
            {activeTab === 'quests' && (
              <div className="space-y-6">
                {(snapshot?.quests || []).length === 0 ? (
                  <EmptyState
                    icon={<FileText className="w-6 h-6" />}
                    title="Nenhuma missão registrada"
                    description="Objetivos, tarefas e missões aceitas durante a aventura serão acompanhadas aqui."
                  />
                ) : (
                  <>
                    {/* Quests em Andamento */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 typo-section-heading text-text-muted">
                          <FileText className="w-4 h-4" />
                          <span>Em Andamento</span>
                        </h3>
                        {groupedQuests.active.length > 0 && (
                          <span className="typo-caption text-text-muted">
                            {groupedQuests.active.length}
                          </span>
                        )}
                      </div>

                      {groupedQuests.active.length === 0 ? (
                        <p className="typo-caption text-text-muted italic py-1">
                          Nenhuma missão em andamento no momento.
                        </p>
                      ) : (
                        <div className="divide-y divide-border-subtle/60">
                          {groupedQuests.active.map((quest) => (
                        <div
                          key={quest.id}
                          className="py-4 first:pt-0 last:pb-0 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="typo-body font-medium text-text-primary">
                                {quest.title}
                              </h4>
                              {quest.participants && quest.participants.length > 0 && (
                                <p className="typo-caption text-text-muted mt-0.5">
                                  Envolvidos: {quest.participants.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>

                          {quest.objectives && quest.objectives.length > 0 && (
                            <div className="space-y-1.5 pt-0.5">
                              <span className="typo-caption font-medium text-text-muted block mb-1">
                                Objetivos:
                              </span>
                              {quest.objectives.map((obj, idx) => {
                                const desc = typeof obj === 'string' ? obj : obj.description;
                                const isCompleted = typeof obj === 'string' ? false : Boolean(obj.isCompleted);
                                return (
                                  <div key={idx} className="flex items-start gap-2 typo-caption">
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                                    )}
                                    <span
                                      className={
                                        isCompleted
                                          ? 'line-through text-text-muted'
                                          : 'text-text-secondary'
                                      }
                                    >
                                      {desc}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {quest.consequences && quest.consequences.length > 0 && (
                            <div className="pt-2 border-t border-border-subtle space-y-1">
                              {quest.consequences.map((c, i) => (
                                <p key={i} className="typo-caption text-text-muted pl-2 border-l border-border-subtle">
                                  {c}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quests Concluídas ou Falhas */}
                {(groupedQuests.completed.length > 0 || groupedQuests.failed.length > 0) && (
                  <>
                    <Divider />
                    <div className="space-y-3">
                      <h3 className="flex items-center gap-2 typo-section-heading text-text-muted">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Histórico de Resoluções</span>
                      </h3>

                      <div className="divide-y divide-border-subtle/60">
                        {groupedQuests.completed.map((quest) => (
                          <div
                            key={quest.id}
                            className="py-2.5 flex items-center justify-between gap-3"
                          >
                            <span className="typo-secondary text-text-secondary truncate block">
                              {quest.title}
                            </span>
                            <Badge variant="success">Concluída</Badge>
                          </div>
                        ))}

                        {groupedQuests.failed.map((quest) => (
                          <div
                            key={quest.id}
                            className="py-2.5 flex items-center justify-between gap-3"
                          >
                            <span className="typo-secondary text-text-secondary truncate block">
                              {quest.title}
                            </span>
                            <Badge variant="danger">Falha</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                </>
              )}
              </div>
            )}

            {/* ABA 5: LINHA DO TEMPO (EVENTOS & MARCOS) */}
            {activeTab === 'timeline' && (
              <div className="space-y-6">
                {/* Seção: Marcos da Campanha */}
                {milestones.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 typo-section-heading text-text-muted">
                      <Star className="w-4 h-4 text-text-muted" />
                      <span>Marcos & Pontos de Virada</span>
                    </h3>

                    <div className="divide-y divide-border-subtle/60">
                      {milestones.map((e, idx) => (
                        <div
                          key={e.id || idx}
                          className="py-3.5 first:pt-0 last:pb-0 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="typo-caption text-text-muted">
                              Turno {e.timestamp || '?'}
                            </span>
                            {e.location && (
                              <span className="typo-caption text-text-secondary font-medium">
                                {e.location}
                              </span>
                            )}
                          </div>
                          <p className="typo-body text-text-primary leading-relaxed font-medium">
                            {e.description}
                          </p>
                          {e.consequences && e.consequences.length > 0 && (
                            <div className="pt-1 space-y-1">
                              {e.consequences.map((c, i) => (
                                <p key={i} className="typo-caption text-text-secondary flex items-center gap-2">
                                  <Sparkles className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                  <span>{c}</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <Divider />
                  </div>
                )}

                {/* Seção: Acontecimentos Recentes */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 typo-section-heading text-text-muted">
                    <Clock className="w-4 h-4" />
                    <span>Acontecimentos Relevantes</span>
                  </h3>

                  {nonTrivialEvents.length === 0 ? (
                    <EmptyState
                      icon={<Clock className="w-6 h-6" />}
                      title="Nenhum acontecimento relevante"
                      description="Conforme a narrativa avançar e decisões gerarem impacto, os eventos serão organizados aqui."
                    />
                  ) : (
                    <div className="divide-y divide-border-subtle/60">
                      {nonTrivialEvents.map((e, idx) => (
                        <div
                          key={e.id || idx}
                          className="py-3 first:pt-0 last:pb-0 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="typo-caption font-mono text-text-muted">
                              Turno {e.timestamp || '?'}
                            </span>
                            {e.location && (
                              <span className="typo-caption text-text-muted">
                                {e.location}
                              </span>
                            )}
                          </div>

                          <p className="typo-body text-text-secondary leading-relaxed">
                            {e.description}
                          </p>

                          {e.participants && e.participants.length > 0 && (
                            <p className="typo-caption text-text-muted">
                              Envolvidos: {e.participants.join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DrawerShell>
  );
}
