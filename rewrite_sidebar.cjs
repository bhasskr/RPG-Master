const fs = require('fs');

const newSidebar = `import { Button, IconButton, Badge, Input, EmptyState, DrawerShell, Tabs } from './ui';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Plus, Clock, History, Info, Settings, X, BookOpen, MessageSquare, MapPin, BookMarked, Pencil, Check, Trash2, AlertTriangle } from 'lucide-react';
import { GameState } from '../types';

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
  onOpenInfo: () => void;
  onOpenSettings: () => void;
  onOpenJournal?: () => void;
  onOpenLibrary?: () => void;
}

import { useState } from 'react';

export function Sidebar({
  isOpen,
  onClose,
  onNewCampaign,
  currentCampaignId,
  recentCampaigns,
  onSelectCampaign,
  onRenameCampaign,
  onDeleteCampaign,
  gameState,
  onOpenHistory,
  onOpenInfo,
  onOpenSettings,
  onOpenJournal,
  onOpenLibrary,
}: SidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

      {/* Sidebar Container: Drawer on mobile, inline collapsible column on desktop */}
      <aside
        id="app-sidebar"
        className={\`fixed md:static inset-y-0 left-0 z-50 w-72 md:w-68 lg:w-72 bg-background border-r border-border-default/80 flex flex-col transition-transform duration-300 ease-in-out shrink-0 select-none \${
          isOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        }\`}
      >
        {/* Top Header / App Brand */}
        <div className="h-14 px-4 border-b border-border-default/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 radius-medium bg-surface-elevated border border-border-subtle/70 flex items-center justify-center text-text-primary">
              <BookOpen className="w-4 h-4 text-text-secondary" />
            </div>
            <div>
              <h2 className="typo-section-heading text-text-primary">
                RPG Sandbox
              </h2>
              <p className="typo-caption text-text-muted font-mono">Narrative Engine</p>
            </div>
          </div>
          {/* Close button on mobile */}
          <IconButton
            id="close-sidebar-mobile-btn"
            type="button"
            onClick={onClose}
            className="md:hidden"
            variant="ghost"
            title="Fechar menu lateral"
          >
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 text-xs text-text-secondary scrollbar-none">
          
          {/* 1. Ação Principal: Nova Campanha */}
          <div>
            <button
              id="sidebar-new-campaign-btn"
              type="button"
              onClick={() => {
                onNewCampaign();
                if (window.innerWidth < 768) onClose();
              }}
              className="w-full h-10 px-4 bg-surface-elevated/90 hover:bg-surface-hover/90 active:bg-surface-active border border-border-default radius-medium typo-secondary font-semibold text-text-primary transition-all flex items-center justify-between shadow-none group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-text-secondary group-hover:rotate-90 transition-transform duration-200" />
                <span>Nova Campanha</span>
              </span>
            </button>
          </div>

          {/* 2. Campanhas */}
          <div>
            <div className="px-2 py-1 typo-section-heading text-text-muted">
              Campanhas
            </div>
            <div className="mt-1 space-y-1">
              {recentCampaigns.length === 0 ? (
                <div className="px-3 py-3 text-center radius-medium bg-surface-subtle/40 border border-border-subtle typo-caption text-text-muted italic">
                  Nenhuma campanha salva.
                </div>
              ) : (
                recentCampaigns.map((camp) => {
                  const isActive = camp.id === currentCampaignId;
                  const isRenaming = renamingId === camp.id;
                  const isDeleting = deletingId === camp.id;

                  return (
                    <div key={camp.id} className="relative group">
                      {isDeleting && (
                        <div className="absolute inset-0 z-20 bg-surface-subtle/95 backdrop-blur-sm radius-medium flex flex-col items-center justify-center border border-danger-subtle p-2 text-center gap-2 elevation-low">
                          <span className="typo-caption text-text-secondary">Excluir definitivamente?</span>
                          <div className="flex items-center gap-2">
                            <Button size="compact" variant="secondary" className="radius-small" onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}>Cancelar</Button>
                            <Button
                              variant="danger"
                              size="compact"
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
                      
                      <button
                        id={\`recent-campaign-\${camp.id}\`}
                        type="button"
                        onClick={() => {
                          if (isRenaming) return;
                          onSelectCampaign(camp.id);
                          if (window.innerWidth < 768) onClose();
                        }}
                        className={\`w-full text-left px-3 py-2 radius-medium transition-colors flex flex-col gap-1 cursor-pointer border \${
                          isActive
                            ? 'bg-surface-elevated/90 text-text-primary border-border-default shadow-none'
                            : 'hover:bg-surface-subtle/80 text-text-secondary hover:text-text-primary border-transparent'
                        }\`}
                      >
                        <div className="flex items-center justify-between w-full min-w-0 gap-2">
                          {isRenaming ? (
                            <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                              <input
                                autoFocus
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (renameValue.trim() && onRenameCampaign) {
                                      onRenameCampaign(camp.id, renameValue.trim());
                                    }
                                    setRenamingId(null);
                                  } else if (e.key === 'Escape') {
                                    setRenamingId(null);
                                  }
                                }}
                                className="bg-background border border-border-default text-text-primary text-xs radius-small px-2 py-1 w-full focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-border-strong"
                              />
                              <IconButton size="compact" variant="ghost" className="p-1 radius-small" title="Salvar" aria-label="Salvar" onClick={(e) => { e.stopPropagation(); if (renameValue.trim() && onRenameCampaign) onRenameCampaign(camp.id, renameValue.trim()); setRenamingId(null); }}><Check className="w-4 h-4" /></IconButton>
                            </div>
                          ) : (
                            <span className={\`typo-secondary truncate min-w-0 flex-1 \${isActive ? 'text-text-primary font-medium' : 'text-text-secondary'}\`}>
                              {camp.title || 'Campanha Sem Título'}
                            </span>
                          )}
                        </div>
                        
                        {/* Hide repetitive details if campaign is active (already in Header) */}
                        {!isActive && !isRenaming && (
                          <>
                            <div className="flex items-center gap-2 typo-caption text-text-muted">
                              {camp.location && (
                                <span className="flex items-center gap-1 truncate min-w-0 flex-1">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{camp.location}</span>
                                </span>
                              )}
                              <span className="ml-auto font-mono shrink-0">Turno {camp.turnCount}</span>
                            </div>
                            <div className="flex items-center justify-between typo-caption text-text-muted font-mono pt-1">
                              <span>{new Date(camp.lastPlayed).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}</span>
                            </div>
                          </>
                        )}
                      </button>

                      {!isRenaming && (
                        <div className="absolute right-2 top-2 flex items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-all z-10 bg-surface-elevated/80 backdrop-blur radius-medium border border-border-default elevation-low">
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingId(camp.id);
                              setRenameValue(camp.title || '');
                            }}
                            variant="ghost" size="compact" className="radius-l-medium radius-r-none" title="Renomear campanha"
                          >
                            <Pencil className="w-4 h-4" />
                          </IconButton>
                          <div className="w-px h-3.5 bg-surface-hover"></div>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(camp.id);
                            }}
                            variant="danger" size="compact" className="radius-r-medium radius-l-none" title="Excluir campanha"
                          >
                            <Trash2 className="w-4 h-4" />
                          </IconButton>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              
              <button
                id="open-history-link-btn"
                type="button"
                onClick={() => {
                  onOpenHistory();
                  if (window.innerWidth < 768) onClose();
                }}
                className="w-full px-3 py-2 mt-2 radius-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors flex items-center gap-3 typo-secondary cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
              >
                <History className="w-4 h-4" />
                <span>Ver Histórico</span>
              </button>
            </div>
          </div>

          {/* 3. Recursos da Campanha */}
          <div>
            <div className="px-2 py-1 typo-section-heading text-text-muted">
              Recursos da Campanha
            </div>
            <div className="mt-1 space-y-1">
              <button
                id="sidebar-journal-btn"
                type="button"
                disabled={!gameState}
                onClick={() => {
                  if (onOpenJournal) onOpenJournal();
                  if (window.innerWidth < 768) onClose();
                }}
                className="w-full px-3 py-2 radius-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-3 typo-secondary cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
              >
                <BookOpen className="w-4 h-4" />
                <span>Diário</span>
              </button>
              <button
                id="sidebar-info-btn"
                type="button"
                disabled={!gameState}
                onClick={() => {
                  onOpenInfo();
                  if (window.innerWidth < 768) onClose();
                }}
                className="w-full px-3 py-2 radius-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-3 typo-secondary cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
              >
                <Info className="w-4 h-4" />
                <span>Informações</span>
              </button>
            </div>
          </div>

        </div>

        {/* 4. Recursos Globais (Footer) */}
        <div className="p-3 border-t border-border-default/80 space-y-1 shrink-0 bg-background">
          <div className="px-2 py-1 mb-1 typo-section-heading text-text-muted hidden md:block">
            Geral
          </div>
          <button
            id="sidebar-library-btn"
            type="button"
            onClick={() => {
              if (onOpenLibrary) onOpenLibrary();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full px-3 py-2 radius-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors flex items-center gap-3 typo-secondary cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
          >
            <BookMarked className="w-4 h-4" />
            <span>Biblioteca</span>
          </button>
          <button
            id="sidebar-settings-btn"
            type="button"
            onClick={() => {
              onOpenSettings();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full px-3 py-2 radius-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors flex items-center gap-3 typo-secondary cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
          >
            <Settings className="w-4 h-4" />
            <span>Configurações</span>
          </button>
        </div>
      </aside>
    </>
  );
}
`

fs.writeFileSync('src/components/Sidebar.tsx', newSidebar);
