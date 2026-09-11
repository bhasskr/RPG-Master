import { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  MapPin,
  Clock,
  RefreshCw,
  BookOpen,
  User,
  Pencil,
  Check,
  Trash2,
  AlertTriangle,
  X,
  Plus
} from 'lucide-react';
import { api } from '../services/api';
import { CampaignSummary } from './Sidebar';
import { Button, IconButton, DrawerShell, EmptyState, LoadingState, Spinner } from './ui';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCampaignId: string;
  onSelectCampaign: (id: string) => void;
  recentCampaigns: CampaignSummary[];
  onRenameCampaign?: (id: string, newTitle: string) => void;
  onDeleteCampaign?: (id: string) => void;
  onNewCampaign?: () => void;
}

export interface SavedCampaignItem {
  id: string;
  title: string;
  location?: string;
  lastPlayed: number;
  turnCount: number;
  genre?: string;
  playerName?: string;
}

export function HistoryModal({
  isOpen,
  onClose,
  currentCampaignId,
  onSelectCampaign,
  recentCampaigns,
  onRenameCampaign,
  onDeleteCampaign,
  onNewCampaign,
}: HistoryModalProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [allCampaigns, setAllCampaigns] = useState<SavedCampaignItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Carrega todas as campanhas do servidor e mescla com recentes
  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const serverList = await api.listCampaigns();
      
      const map = new Map<string, SavedCampaignItem>();
      
      // 1. Adiciona lista do servidor
      for (const item of serverList) {
        map.set(item.id, {
          id: item.id,
          title: item.title || 'Campanha Sem Título',
          location: item.location || 'Mundo Aberto',
          lastPlayed: item.lastPlayed || Date.now(),
          turnCount: item.turnCount || 0,
          genre: item.genre,
          playerName: item.playerName,
        });
      }

      // 2. Mescla com os recentes locais
      for (const rec of recentCampaigns) {
        if (!map.has(rec.id)) {
          map.set(rec.id, {
            id: rec.id,
            title: rec.title || 'Campanha Sem Título',
            location: rec.location || 'Mundo Aberto',
            lastPlayed: rec.lastPlayed || Date.now(),
            turnCount: rec.turnCount || 0,
          });
        } else {
          const existing = map.get(rec.id)!;
          if (rec.lastPlayed > existing.lastPlayed) {
            existing.lastPlayed = rec.lastPlayed;
          }
          if (rec.turnCount > existing.turnCount) {
            existing.turnCount = rec.turnCount;
          }
          if (rec.location && rec.location !== 'Mundo Aberto') {
            existing.location = rec.location;
          }
          if (rec.title && !existing.title.includes('#')) {
            existing.title = rec.title;
          }
        }
      }

      const merged = Array.from(map.values()).sort((a, b) => b.lastPlayed - a.lastPlayed);
      setAllCampaigns(merged);
    } catch (err) {
      console.warn('[HistoryModal] Aviso ao carregar lista de campanhas:', err);
      // Fallback para lista de recentes locais
      setAllCampaigns(
        recentCampaigns.map((r) => ({
          id: r.id,
          title: r.title,
          location: r.location,
          lastPlayed: r.lastPlayed,
          turnCount: r.turnCount,
        }))
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCampaigns();
      setSearchTerm('');
      setRenamingId(null);
      setDeletingId(null);
    }
  }, [isOpen]);

  // Filtragem por busca
  const filteredCampaigns = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allCampaigns;
    return allCampaigns.filter((c) => {
      const titleMatch = c.title.toLowerCase().includes(term);
      const locMatch = c.location?.toLowerCase().includes(term);
      const playerMatch = c.playerName?.toLowerCase().includes(term);
      const genreMatch = c.genre?.toLowerCase().includes(term);
      return titleMatch || locMatch || playerMatch || genreMatch;
    });
  }, [allCampaigns, searchTerm]);

  // Formatação de data amigável
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'Sem registro';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return `Hoje às ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleSaveRename = (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed && onRenameCampaign) {
      onRenameCampaign(id, trimmed);
      setAllCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c))
      );
    }
    setRenamingId(null);
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Histórico de Campanhas"
      icon={<History className="w-4 h-4 text-text-secondary" />}
      subtitle={`${allCampaigns.length} ${allCampaigns.length === 1 ? 'campanha salva' : 'campanhas salvas'}`}
      headerActions={
        <IconButton
          id="refresh-history-btn"
          type="button"
          onClick={fetchCampaigns}
          disabled={isLoading}
          variant="ghost"
          size="compact"
          title="Atualizar lista"
          aria-label="Atualizar lista"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-text-primary' : ''}`} />
        </IconButton>
      }
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          {onNewCampaign && (
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                onClose();
                onNewCampaign();
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nova Campanha
            </Button>
          )}
          <Button variant="secondary" size="compact" onClick={onClose} className="ml-auto">
            Fechar
          </Button>
        </div>
      }
    >
      {/* Barra de Busca */}
      <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border-default/80 bg-background shrink-0">
        <div className="relative flex items-center w-full">
          <Search className="w-4 h-4 text-text-muted absolute left-3 pointer-events-none" />
          <input
            id="search-campaigns-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, local ou personagem..."
            className="w-full h-9 pl-9 pr-9 bg-surface-subtle border border-border-strong focus:border-border-strong focus:outline-none radius-medium typo-secondary text-text-primary placeholder:text-text-muted transition-colors"
          />
          {searchTerm && (
            <IconButton
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-1.5"
              variant="ghost"
              size="compact"
              title="Limpar busca"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </IconButton>
          )}
        </div>
      </div>

      {/* Lista de Campanhas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-border-subtle/60">
        {isLoading && allCampaigns.length === 0 ? (
          <LoadingState message="Carregando campanhas..." size="md" />
        ) : allCampaigns.length === 0 ? (
          /* Estado Vazio: Nenhuma campanha existente */
          <EmptyState
            icon={<BookOpen className="w-6 h-6" />}
            title="Nenhuma campanha criada ainda"
            description="Crie uma campanha para começar uma nova aventura."
            action={
              onNewCampaign ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    onClose();
                    onNewCampaign();
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Campanha
                </Button>
              ) : undefined
            }
          />
        ) : filteredCampaigns.length === 0 ? (
          /* Estado Vazio: Busca sem resultados */
          <EmptyState
            icon={<Search className="w-6 h-6" />}
            title="Nenhum resultado"
            description={`Sua busca por "${searchTerm}" não encontrou correspondências.`}
            action={
              <Button
                variant="secondary"
                size="compact"
                onClick={() => setSearchTerm('')}
              >
                Limpar busca
              </Button>
            }
          />
        ) : (
          filteredCampaigns.map((camp) => {
            const isActive = camp.id === currentCampaignId;
            const isRenaming = renamingId === camp.id;
            const isDeleting = deletingId === camp.id;

            return (
              <div key={camp.id} className="relative group first:pt-0 py-1">
                {/* Confirmação de exclusão em dois passos inline */}
                {isDeleting && (
                  <div className="absolute inset-0 z-20 bg-surface-subtle/95 backdrop-blur-xs radius-small flex flex-col items-center justify-center border border-danger/40 p-3 text-center gap-2 elevation-low">
                    <span className="typo-secondary text-text-primary font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
                      Excluir permanentemente esta campanha?
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        variant="secondary"
                        size="compact"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(null);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="danger"
                        size="compact"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDeleteCampaign) {
                            onDeleteCampaign(camp.id);
                            setAllCampaigns((prev) => prev.filter((c) => c.id !== camp.id));
                          }
                          setDeletingId(null);
                        }}
                      >
                        Excluir definitivamente
                      </Button>
                    </div>
                  </div>
                )}

                {/* Item da Campanha */}
                <div
                  id={`history-item-${camp.id}`}
                  onClick={() => {
                    if (isRenaming || isDeleting) return;
                    onSelectCampaign(camp.id);
                    onClose();
                  }}
                  className={`py-3 px-3 -mx-3 radius-small transition-colors duration-150 motion-reduce:transition-none cursor-pointer flex flex-col gap-1.5 relative select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                    isActive
                      ? 'bg-surface-elevated border border-border-default'
                      : 'border border-transparent hover:bg-surface-hover/60 active:bg-surface-active'
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (isRenaming || isDeleting) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      onSelectCampaign(camp.id);
                      onClose();
                    }
                  }}
                >
                  {/* Linha 1: Título e Ações */}
                  <div className="flex items-center justify-between gap-2 w-full min-w-0">
                    {isRenaming ? (
                      <div
                        className="flex items-center gap-1.5 w-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          autoFocus
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveRename(camp.id);
                            } else if (e.key === 'Escape') {
                              setRenamingId(null);
                            }
                          }}
                          className="bg-background border border-border-strong text-text-primary typo-secondary radius-small px-2.5 py-1 w-full focus:outline-none focus:border-border-strong"
                        />
                        <IconButton
                          size="compact"
                          variant="ghost"
                          title="Salvar nome"
                          aria-label="Salvar nome"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveRename(camp.id);
                          }}
                        >
                          <Check className="w-4 h-4 text-text-primary" />
                        </IconButton>
                        <IconButton
                          size="compact"
                          variant="ghost"
                          title="Cancelar"
                          aria-label="Cancelar"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </IconButton>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <h3
                            className={`typo-secondary truncate ${
                              isActive ? 'text-text-primary font-semibold' : 'text-text-primary font-medium'
                            }`}
                          >
                            {camp.title || 'Campanha Sem Título'}
                          </h3>
                          {isActive && (
                            <span className="flex items-center gap-1 typo-caption text-text-secondary font-medium shrink-0">
                              <span className="w-1.5 h-1.5 radius-full bg-text-primary shrink-0" />
                              Ativa
                            </span>
                          )}
                        </div>

                        {/* Ações Secundárias (Renomear / Excluir) */}
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconButton
                            onClick={() => {
                              setRenamingId(camp.id);
                              setRenameValue(camp.title || '');
                            }}
                            variant="ghost"
                            size="compact"
                            title="Renomear campanha"
                            aria-label="Renomear campanha"
                          >
                            <Pencil className="w-4 h-4" />
                          </IconButton>
                          <IconButton
                            onClick={() => {
                              setDeletingId(camp.id);
                            }}
                            variant="danger"
                            size="compact"
                            title="Excluir campanha"
                            aria-label="Excluir campanha"
                          >
                            <Trash2 className="w-4 h-4" />
                          </IconButton>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Linha 2: Informação Contextual Curta e Útil */}
                  {!isRenaming && (
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 typo-caption text-text-muted">
                      <span>Turno {camp.turnCount}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-text-muted" />
                        <span>{formatTimestamp(camp.lastPlayed)}</span>
                      </div>
                      {camp.location && camp.location !== 'Mundo Aberto' && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1 min-w-0 max-w-[140px] sm:max-w-[200px] truncate">
                            <MapPin className="w-3 h-3 text-text-muted shrink-0" />
                            <span className="truncate">{camp.location}</span>
                          </div>
                        </>
                      )}
                      {camp.playerName && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1 min-w-0 max-w-[120px] truncate">
                            <User className="w-3 h-3 text-text-muted shrink-0" />
                            <span className="truncate">{camp.playerName}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </DrawerShell>
  );
}
