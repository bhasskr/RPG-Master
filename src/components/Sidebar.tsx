import { useState } from 'react';
import {
  Plus,
  History,
  Settings,
  X,
  MapPin,
  BookMarked,
  Pencil,
  Check,
  Trash2,
  AlertTriangle,
  BookOpen,
  Terminal
} from 'lucide-react';
import { GameState } from '../types';
import { Button, IconButton } from './ui';

export interface CampaignSummary {
  id: string;
  title: string;
  location?: string;
  lastPlayed: number;
  turnCount: number;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewCampaign: () => void;
  currentCampaignId: string;
  recentCampaigns: CampaignSummary[];
  onSelectCampaign: (id: string) => void;
  onRenameCampaign?: (id: string, newTitle: string) => void;
  onDeleteCampaign?: (id: string) => void;
  gameState: GameState | null;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenLibrary?: () => void;
  onOpenDeveloperPanel?: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  onNewCampaign,
  currentCampaignId,
  recentCampaigns,
  onSelectCampaign,
  onRenameCampaign,
  onDeleteCampaign,
  onOpenHistory,
  onOpenSettings,
  onOpenLibrary,
  onOpenDeveloperPanel,
}: SidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Exibe apenas um conjunto pequeno de campanhas recentes na Sidebar (máximo 5)
  const displayedRecent = recentCampaigns.slice(0, 5);

  const handleSaveRename = (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed && onRenameCampaign) {
      onRenameCampaign(id, trimmed);
    }
    setRenamingId(null);
  };

  const formatShortDate = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) return 'Hoje';
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 md:w-68 lg:w-72 bg-background border-r border-border-default flex flex-col transition-transform duration-200 ease-out shrink-0 select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}
      >
        {/* Top Header / App Brand */}
        <div className="h-14 px-4 border-b border-border-default flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 radius-medium bg-surface-elevated border border-border-subtle flex items-center justify-center text-text-primary">
              <BookOpen className="w-4 h-4 text-text-secondary" />
            </div>
            <div>
              <h2 className="typo-section-heading text-text-primary">
                RPG Sandbox
              </h2>
              <p className="typo-caption text-text-muted">Narrative Engine</p>
            </div>
          </div>
          {/* Close button on mobile */}
          <IconButton
            id="close-sidebar-mobile-btn"
            type="button"
            onClick={onClose}
            className="md:hidden"
            variant="ghost"
            size="compact"
            title="Fechar menu lateral"
            aria-label="Fechar menu lateral"
          >
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-none">
          {/* 1. Ação Principal: Nova Campanha */}
          <div>
            <button
              id="sidebar-new-campaign-btn"
              type="button"
              onClick={() => {
                onNewCampaign();
                if (window.innerWidth < 768) onClose();
              }}
              className="w-full h-10 px-3.5 bg-surface-elevated hover:bg-surface-hover active:bg-surface-active border border-border-default radius-medium typo-secondary font-semibold text-text-primary transition-colors duration-150 motion-reduce:transition-none flex items-center justify-between shadow-none group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-text-secondary" />
                <span>Nova Campanha</span>
              </span>
            </button>
          </div>

          {/* 2. Campanhas Recentes */}
          <div>
            <div className="px-2 py-1 flex items-center justify-between typo-section-heading text-text-muted">
              <span>Recentes</span>
              {recentCampaigns.length > 0 && (
                <span className="typo-caption font-normal">{recentCampaigns.length}</span>
              )}
            </div>

            <div className="mt-1 space-y-0.5">
              {displayedRecent.length === 0 ? (
                <div className="px-3 py-4 text-center typo-caption text-text-muted">
                  Nenhuma campanha criada ainda.
                </div>
              ) : (
                displayedRecent.map((camp) => {
                  const isActive = camp.id === currentCampaignId;
                  const isRenaming = renamingId === camp.id;
                  const isDeleting = deletingId === camp.id;

                  return (
                    <div key={camp.id} className="relative group">
                      {/* Confirmação de exclusão em 2 passos inline */}
                      {isDeleting && (
                        <div className="absolute inset-0 z-20 bg-surface-subtle/95 backdrop-blur-xs radius-small flex flex-col items-center justify-center border border-danger/40 p-2 text-center gap-1.5 elevation-low">
                          <span className="typo-caption text-text-primary font-medium flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
                            Excluir campanha?
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              size="compact"
                              variant="secondary"
                              className="px-2.5 py-1 text-xs"
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
                              className="px-2.5 py-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDeleteCampaign) {
                                   onDeleteCampaign(camp.id);
                                }
                                setDeletingId(null);
                              }}
                            >
                              Excluir
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Item da Lista */}
                      <div
                        id={`recent-campaign-${camp.id}`}
                        onClick={() => {
                          if (isRenaming || isDeleting) return;
                          onSelectCampaign(camp.id);
                          if (window.innerWidth < 768) onClose();
                        }}
                        className={`w-full text-left px-3 py-2 radius-small transition-colors duration-150 motion-reduce:transition-none flex flex-col gap-0.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                          isActive
                            ? 'bg-surface-elevated border border-border-default text-text-primary font-medium'
                            : 'border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover/60 active:bg-surface-active'
                        }`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (isRenaming || isDeleting) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            onSelectCampaign(camp.id);
                            if (window.innerWidth < 768) onClose();
                          }
                        }}
                      >
                        {/* Linha 1: Título e Botões */}
                        <div className="flex items-center justify-between w-full min-w-0 gap-1.5">
                          {isRenaming ? (
                            <div
                              className="flex items-center gap-1 w-full"
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
                                className="bg-background border border-border-strong text-text-primary text-xs radius-small px-2 py-1 w-full focus:outline-none focus:border-border-strong"
                              />
                              <IconButton
                                size="compact"
                                variant="ghost"
                                title="Salvar"
                                aria-label="Salvar nome da campanha"
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
                                aria-label="Cancelar renomeação"
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
                                {isActive && (
                                  <span
                                    className="w-1.5 h-1.5 radius-full bg-text-primary shrink-0"
                                    title="Campanha ativa"
                                  />
                                )}
                                <span
                                  className={`typo-secondary truncate ${
                                    isActive
                                      ? 'text-text-primary font-medium'
                                      : 'text-text-secondary group-hover:text-text-primary font-normal'
                                  }`}
                                >
                                  {camp.title || 'Campanha Sem Título'}
                                </span>
                              </div>

                              {/* Ações Secundárias */}
                              <div
                                className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <IconButton
                                  onClick={() => {
                                    setRenamingId(camp.id);
                                    setRenameValue(camp.title || '');
                                  }}
                                  variant="ghost"
                                  size="compact"
                                  title="Renomear"
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
                                  title="Excluir"
                                  aria-label="Excluir campanha"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </IconButton>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Linha 2: Contexto Curto (apenas se não estiver renomeando) */}
                        {!isRenaming && (
                          <div className="flex items-center gap-2 typo-caption text-text-muted">
                            <span>Turno {camp.turnCount}</span>
                            <span>•</span>
                            <span>{formatShortDate(camp.lastPlayed)}</span>
                            {camp.location && camp.location !== 'Mundo Aberto' && !isActive && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[90px]">{camp.location}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Botão Ver Histórico / Gerenciar todas as campanhas */}
              <button
                id="open-history-link-btn"
                type="button"
                onClick={() => {
                  onOpenHistory();
                  if (window.innerWidth < 768) onClose();
                }}
                className="w-full px-3 py-2 mt-2 radius-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors flex items-center justify-between typo-secondary cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-focus group"
              >
                <span className="flex items-center gap-2.5">
                  <History className="w-4 h-4 text-text-secondary group-hover:text-text-primary transition-colors" />
                  <span>Ver Histórico</span>
                </span>
                {recentCampaigns.length > 5 && (
                  <span className="typo-caption px-1.5 py-0.5 radius-small bg-surface-subtle text-text-secondary border border-border-subtle">
                    +{recentCampaigns.length - 5}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Recursos Globais (Footer) */}
        <div className="p-3 border-t border-border-default space-y-1 shrink-0 bg-background">
          <button
            id="sidebar-library-btn"
            type="button"
            onClick={() => {
              if (onOpenLibrary) onOpenLibrary();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full px-3 py-2 radius-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors flex items-center gap-3 typo-secondary cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-focus group"
          >
            <BookMarked className="w-4 h-4 text-text-secondary group-hover:text-text-primary transition-colors" />
            <span>Biblioteca</span>
          </button>
          <button
            id="sidebar-settings-btn"
            type="button"
            onClick={() => {
              onOpenSettings();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full px-3 py-2 radius-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors flex items-center gap-3 typo-secondary cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-focus group"
          >
            <Settings className="w-4 h-4 text-text-secondary group-hover:text-text-primary transition-colors" />
            <span>Configurações</span>
          </button>
          {onOpenDeveloperPanel && (
            <button
              id="sidebar-developer-mode-btn"
              type="button"
              onClick={() => {
                onOpenDeveloperPanel();
                if (window.innerWidth < 768) onClose();
              }}
              className="w-full px-3 py-2 radius-medium text-text-muted hover:text-text-secondary hover:bg-surface-hover/60 transition-colors flex items-center justify-between typo-secondary cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-focus group"
              title="Abrir Developer Mode (Diagnóstico Técnico)"
            >
              <span className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-colors" />
                <span>Developer Mode</span>
              </span>
              <span className="typo-caption px-1.5 py-0.5 radius-small bg-surface-subtle text-text-muted border border-border-subtle text-[10px] uppercase font-mono tracking-wider">
                Dev
              </span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
