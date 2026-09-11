import { IconButton } from './ui';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PanelLeft, PanelLeftClose, MapPin, Calendar, Compass, BookOpen, Info } from 'lucide-react';
import { GameState } from '../types';

interface HeaderProps {
  gameState: GameState | null;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenJournal: () => void;
  onOpenInfo: () => void;
}

export function Header({
  gameState,
  isSidebarOpen,
  onToggleSidebar,
  onOpenJournal,
  onOpenInfo,
}: HeaderProps) {
  const campaignName = gameState?.foundation?.title || 'Campanha Sandbox';
  const currentLocation = gameState?.worldState?.currentLocation || 'Mundo Aberto';
  const worldDate = gameState?.worldState?.timeOfDay
    ? `${gameState.worldState.timeOfDay}${gameState.worldState.weather ? ` • ${gameState.worldState.weather}` : ''}`
    : 'Turno Inicial';

  return (
    <header
      id="app-fixed-header"
      className="sticky top-0 z-30 h-14 bg-background/95 backdrop-blur-md border-b border-border-default px-4 sm:px-6 flex items-center justify-between shrink-0 select-none gap-4"
    >
      {/* Left: Sidebar Toggle & Campaign Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <IconButton id="toggle-sidebar-button" onClick={onToggleSidebar} title={isSidebarOpen ? 'Recolher barra lateral' : 'Abrir barra lateral'} aria-label={isSidebarOpen ? 'Recolher barra lateral' : 'Abrir barra lateral'} className="shrink-0">
          {isSidebarOpen ? (
            <PanelLeftClose className="w-5 h-5 text-text-secondary" />
          ) : (
            <PanelLeft className="w-5 h-5 text-text-secondary" />
          )}
        </IconButton>

        {gameState && (
          <div className="flex flex-col min-w-0 justify-center">
            <h1
              id="header-campaign-name"
              className="typo-heading text-text-primary truncate min-w-0"
              title={campaignName}
            >
              {campaignName}
            </h1>
            <div className="flex items-center gap-3 text-text-muted typo-caption min-w-0 overflow-hidden">
              <span className="flex items-center gap-1 truncate" title={`Localização: ${currentLocation}`}>
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{currentLocation}</span>
              </span>
              <span className="hidden sm:flex items-center gap-1 shrink-0" title={`Momento: ${worldDate}`}>
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{worldDate}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {gameState && (
          <>
            <IconButton 
              onClick={onOpenInfo} 
              title="Ficha & Informações" 
              aria-label="Ficha & Informações"
              className="text-text-secondary hover:text-text-primary"
            >
              <Info className="w-5 h-5" />
            </IconButton>

            <IconButton 
              onClick={onOpenJournal} 
              title="Diário da Campanha" 
              aria-label="Diário da Campanha"
              className="text-text-secondary hover:text-text-primary"
            >
              <BookOpen className="w-5 h-5" />
            </IconButton>
          </>
        )}
      </div>
    </header>
  );
}
