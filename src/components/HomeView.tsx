import { Plus, Wand2, Lightbulb, BookMarked, Play, History, ArrowRight } from 'lucide-react';
import { Button } from './ui';
import { CampaignSummary } from './Sidebar';

interface HomeViewProps {
  onNewCampaign: () => void;
  onSurpriseMe: () => void;
  onIdea: () => void;
  onOpenLibrary: () => void;
  onOpenHistory?: () => void;
  recentCampaigns: CampaignSummary[];
  onSelectCampaign: (id: string) => void;
}

export function HomeView({
  onNewCampaign,
  onSurpriseMe,
  onIdea,
  onOpenLibrary,
  onOpenHistory,
  recentCampaigns,
  onSelectCampaign,
}: HomeViewProps) {
  const hasCampaigns = recentCampaigns.length > 0;
  const isSingleCampaign = recentCampaigns.length === 1;
  const mostRecent = hasCampaigns ? recentCampaigns[0] : null;
  const otherRecent = hasCampaigns ? recentCampaigns.slice(1, 4) : [];

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 h-full p-4 sm:p-8 md:p-12 overflow-y-auto">
      <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center space-y-6 sm:space-y-8 animate-fade-in my-auto py-4">
        
        {/* State 0: Nenhuma campanha salva */}
        {!hasCampaigns && (
          <>
            {/* Header / Apresentação discreta */}
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto radius-large bg-surface-subtle border border-border-default flex items-center justify-center">
                <BookMarked className="w-6 h-6 text-text-primary" />
              </div>
              <h1 className="typo-title text-text-primary font-semibold">
                Sua próxima história começa aqui
              </h1>
              <p className="typo-body text-text-secondary max-w-sm mx-auto leading-relaxed">
                Crie um novo universo com o Mestre ou defina uma premissa personalizada.
              </p>
            </div>

            {/* Ação Primária */}
            <div className="w-full flex justify-center">
              <Button
                id="home-primary-new-campaign-btn"
                size="default"
                variant="primary"
                className="w-full sm:w-auto px-6 h-11"
                onClick={onNewCampaign}
              >
                <Plus className="w-4 h-4 mr-2" />
                <span>Criar Nova Campanha</span>
              </Button>
            </div>

            {/* Atalhos Rápidos */}
            <div className="w-full pt-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  id="home-shortcut-surprise-btn"
                  onClick={onSurpriseMe}
                  className="inline-flex items-center gap-2 px-3 py-2 radius-medium bg-surface-subtle hover:bg-surface-hover active:bg-surface-active border border-border-default hover:border-border-strong transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
                >
                  <Wand2 className="w-4 h-4 text-text-muted" />
                  <span className="typo-caption text-text-primary font-medium">Surpreenda-me</span>
                </button>
                
                <button
                  id="home-shortcut-idea-btn"
                  onClick={onIdea}
                  className="inline-flex items-center gap-2 px-3 py-2 radius-medium bg-surface-subtle hover:bg-surface-hover active:bg-surface-active border border-border-default hover:border-border-strong transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
                >
                  <Lightbulb className="w-4 h-4 text-text-muted" />
                  <span className="typo-caption text-text-primary font-medium">Tenho uma ideia</span>
                </button>

                <button
                  id="home-shortcut-library-btn"
                  onClick={onOpenLibrary}
                  className="inline-flex items-center gap-2 px-3 py-2 radius-medium bg-surface-subtle hover:bg-surface-hover active:bg-surface-active border border-border-default hover:border-border-strong transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
                >
                  <BookMarked className="w-4 h-4 text-text-muted" />
                  <span className="typo-caption text-text-primary font-medium">Biblioteca</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* State 1 / Multiple: Com campanhas existentes */}
        {hasCampaigns && mostRecent && (
          <div className="w-full space-y-6">
            
            {/* Card Principal: Continuar a Campanha Mais Recente */}
            <div className="w-full text-left bg-surface-subtle border border-border-default hover:border-border-strong radius-large p-4 sm:p-5 transition-colors">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="typo-caption font-medium uppercase tracking-wider text-text-muted">
                  Última sessão jogada
                </span>
                <span className="typo-caption text-text-muted font-mono">
                  {new Date(mostRecent.lastPlayed).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <h2 className="typo-body text-base sm:text-lg font-semibold text-text-primary mb-1 truncate">
                {mostRecent.title || 'Campanha Sem Título'}
              </h2>

              <div className="flex items-center gap-3 typo-caption text-text-secondary mb-4">
                <span>Turno {mostRecent.turnCount}</span>
                {mostRecent.location && (
                  <>
                    <span>•</span>
                    <span className="truncate">{mostRecent.location}</span>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-border-subtle">
                <Button
                  id="home-continue-recent-campaign-btn"
                  size="default"
                  variant="primary"
                  className="w-full sm:w-auto px-5 h-10 justify-center"
                  onClick={() => onSelectCampaign(mostRecent.id)}
                >
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  <span>Continuar história</span>
                </Button>

                <button
                  id="home-new-campaign-alt-btn"
                  onClick={onNewCampaign}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 radius-medium text-text-secondary hover:text-text-primary typo-caption font-medium transition-colors hover:bg-surface-hover/60"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar outra campanha</span>
                </button>
              </div>
            </div>

            {/* Outras campanhas recentes (se houver mais de 1) */}
            {!isSingleCampaign && otherRecent.length > 0 && (
              <div className="w-full text-left space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="typo-caption font-medium uppercase tracking-wider text-text-muted">
                    Outras campanhas
                  </span>
                  {onOpenHistory && recentCampaigns.length > 4 && (
                    <button
                      onClick={onOpenHistory}
                      className="typo-caption text-text-muted hover:text-text-primary inline-flex items-center gap-1 transition-colors"
                    >
                      <span>Ver todas ({recentCampaigns.length})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="divide-y divide-border-subtle border border-border-subtle radius-medium bg-surface-subtle/50 overflow-hidden">
                  {otherRecent.map((camp) => (
                    <button
                      key={camp.id}
                      onClick={() => onSelectCampaign(camp.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-surface-hover/80 active:bg-surface-active transition-colors text-left group cursor-pointer"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="typo-body text-text-primary font-medium truncate group-hover:text-text-primary">
                          {camp.title || 'Campanha Sem Título'}
                        </div>
                        <div className="typo-caption text-text-muted truncate">
                          Turno {camp.turnCount} • {new Date(camp.lastPlayed).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="w-7 h-7 radius-small bg-surface-elevated flex items-center justify-center shrink-0 text-text-secondary group-hover:text-text-primary border border-border-subtle">
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Atalhos Secundários Rápidos */}
            <div className="w-full pt-1 flex flex-wrap items-center justify-center gap-2">
              <button
                id="home-shortcut-surprise-btn"
                onClick={onSurpriseMe}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 radius-medium bg-surface-subtle hover:bg-surface-hover active:bg-surface-active border border-border-default hover:border-border-strong transition-colors cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5 text-text-muted" />
                <span className="typo-caption text-text-primary font-medium">Surpreenda-me</span>
              </button>

              <button
                id="home-shortcut-idea-btn"
                onClick={onIdea}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 radius-medium bg-surface-subtle hover:bg-surface-hover active:bg-surface-active border border-border-default hover:border-border-strong transition-colors cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5 text-text-muted" />
                <span className="typo-caption text-text-primary font-medium">Tenho uma ideia</span>
              </button>

              <button
                id="home-shortcut-library-btn"
                onClick={onOpenLibrary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 radius-medium bg-surface-subtle hover:bg-surface-hover active:bg-surface-active border border-border-default hover:border-border-strong transition-colors cursor-pointer"
              >
                <BookMarked className="w-3.5 h-3.5 text-text-muted" />
                <span className="typo-caption text-text-primary font-medium">Biblioteca</span>
              </button>

              {onOpenHistory && (
                <button
                  id="home-shortcut-history-btn"
                  onClick={onOpenHistory}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 radius-medium bg-surface-subtle hover:bg-surface-hover active:bg-surface-active border border-border-default hover:border-border-strong transition-colors cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-text-muted" />
                  <span className="typo-caption text-text-primary font-medium">Histórico</span>
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
