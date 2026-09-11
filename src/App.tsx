/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar, CampaignSummary } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { HomeView } from './components/HomeView';
import { MessageInput } from './components/MessageInput';
import { ErrorBanner } from './components/ErrorBanner';
import { InfoModal } from './components/InfoModal';
import { SettingsModal } from './components/SettingsModal';
import { DeveloperPanel } from './components/DeveloperPanel';
import { HistoryModal } from './components/HistoryModal';
import { JournalModal } from './components/JournalModal';
import { LibraryModal } from './components/LibraryModal';
import { LibraryScenario } from './utils/libraryStore';
import { NewCampaignModal } from './components/NewCampaignModal';
import { api, ApiError, NewCampaignPayload } from './services/api';
import { ChatMessage, GameState, ApiStatusData, AppError } from './types';
import {
  UiPreferences,
  DEFAULT_UI_PREFERENCES,
  loadUiPreferences,
  saveUiPreferences,
} from './utils/uiPreferences';

const STORAGE_CAMPAIGN_KEY = 'sandbox_rpg_campaign_id';
const STORAGE_RECENT_CAMPAIGNS_KEY = 'sandbox_rpg_recent_campaigns';

export default function App() {
  const [campaignId, setCampaignId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_CAMPAIGN_KEY) || `session_${Date.now()}`;
  });
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [statusData, setStatusData] = useState<ApiStatusData | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  // Sidebar open by default on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });

  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isDeveloperPanelOpen, setIsDeveloperPanelOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState<boolean>(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState<boolean>(false);
  const [newCampaignKey, setNewCampaignKey] = useState(Date.now());
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState<boolean>(() => {
    return sessionStorage.getItem('rpg_new_campaign_modal_open') === 'true';
  });

  useEffect(() => {
    sessionStorage.setItem('rpg_new_campaign_modal_open', isNewCampaignModalOpen.toString());
  }, [isNewCampaignModalOpen]);

  // Global UI Preferences
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(() => loadUiPreferences());

  const handleUpdatePreferences = useCallback((updated: Partial<UiPreferences>) => {
    setUiPreferences((prev) => {
      const next = { ...prev, ...updated };
      saveUiPreferences(next);
      return next;
    });
  }, []);

  // Recents state persisted in localStorage
  const [recentCampaigns, setRecentCampaigns] = useState<CampaignSummary[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_RECENT_CAMPAIGNS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Update recent list whenever campaign or turn advances
  const recordRecentCampaign = useCallback((id: string, state?: GameState | null, currentTurn?: number) => {
    setRecentCampaigns((prev) => {
      const title = state?.foundation?.title || `Aventura #${id.slice(-4)}`;
      const location = state?.worldState?.currentLocation || 'Mundo Aberto';
      const turnCount = state?.turn || currentTurn || 1;

      const filtered = prev.filter((c) => c.id !== id);
      const updated: CampaignSummary[] = [
        {
          id,
          title,
          location,
          lastPlayed: Date.now(),
          turnCount,
        },
        ...filtered,
      ].slice(0, 10);

      try {
        localStorage.setItem(STORAGE_RECENT_CAMPAIGNS_KEY, JSON.stringify(updated));
      } catch {
        // Safe fallback
      }
      return updated;
    });
  }, []);

  // 1. Carrega status da Engine e restaura a campanha atual selecionada (ou a mais recente)
  const handleRefreshStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    setStatusError(null);
    try {
      const status = await api.getStatus();
      setStatusData(status);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Falha ao obter status do servidor.';
      setStatusError(msg);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  const initializeEngine = useCallback(async () => {
    try {
      await handleRefreshStatus();

      const savedId = localStorage.getItem(STORAGE_CAMPAIGN_KEY);
      if (savedId) {
        try {
          const details = await api.getCampaignDetails(savedId);
          if (details && details.gameState) {
            setGameState(details.gameState);
            setMessages(details.messages || []);
            setCampaignId(savedId);
            recordRecentCampaign(savedId, details.gameState);
            return;
          }
        } catch {
          // Se não encontrou o id salvo, tenta a primeira da lista de recentes se existir
          localStorage.removeItem(STORAGE_CAMPAIGN_KEY);
        }
      }

      // Se não havia ID ou o ID salvo falhou, tenta restaurar a primeira das recentes
      try {
        const storedRecents = localStorage.getItem(STORAGE_RECENT_CAMPAIGNS_KEY);
        const parsedRecents: CampaignSummary[] = storedRecents ? JSON.parse(storedRecents) : [];
        if (parsedRecents.length > 0) {
          const firstId = parsedRecents[0].id;
          const details = await api.getCampaignDetails(firstId);
          if (details && details.gameState) {
            setGameState(details.gameState);
            setMessages(details.messages || []);
            setCampaignId(firstId);
            localStorage.setItem(STORAGE_CAMPAIGN_KEY, firstId);
            return;
          }
        }
      } catch {
        // Safe fallback
      }
    } catch (err: unknown) {
      console.warn('[Initialization Warning]:', err);
    }
  }, [handleRefreshStatus, recordRecentCampaign]);

  useEffect(() => {
    initializeEngine();
  }, [initializeEngine]);

  // Listener global de atalho para Developer Mode (Ctrl+Shift+D / Cmd+Shift+D)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsDeveloperPanelOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // 2. Envio de mensagem / ação do jogador para o Mestre
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setError(null);
    setLastFailedMessage(null);
    setIsLoading(true);

    const currentTurn = (gameState?.turn || messages.filter((m) => m.role === 'user').length) + 1;

    // Adiciona temporariamente a mensagem do jogador na UI para resposta visual imediata
    const tempUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      turn: currentTurn,
      metadata: { location: gameState?.worldState?.currentLocation },
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await api.sendMessage(campaignId, text);

      const resolvedCampaignId = result.campaignId || campaignId;
      setCampaignId(resolvedCampaignId);
      localStorage.setItem(STORAGE_CAMPAIGN_KEY, resolvedCampaignId);

      setGameState(result.gameState);
      recordRecentCampaign(resolvedCampaignId, result.gameState, result.turn);

      setMessages((prev) => {
        // Substitui a mensagem temporária pelas mensagens oficiais salvas pelo Game Engine
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...withoutTemp, result.playerMessage, result.masterMessage];
      });
    } catch (err: unknown) {
      console.error('[Send Message Error]:', err);
      const apiErr = err as ApiError;
      setLastFailedMessage(text);
      
      let displayMessage = apiErr.message || 'Falha ao comunicar com o Mestre do RPG.';
      
      if (apiErr.status === 429) {
        displayMessage = 'Muitas ações consecutivas. Aguarde um momento e tente novamente.';
      } else if (apiErr.status === 503 || apiErr.status === 504) {
        displayMessage = 'O Mestre está sobrecarregado. Não foi possível obter uma resposta agora.';
      } else if (apiErr.message?.toLowerCase().includes('timeout') || apiErr.message?.toLowerCase().includes('network') || apiErr.code === 'NETWORK_ERROR') {
        displayMessage = 'Sua conexão oscilou. Não foi possível obter uma resposta agora.';
      }

      setError({
        message: displayMessage,
        code: apiErr.code || 'SEND_ERROR',
        details: apiErr.details,
      });
      // Remove a mensagem temporária para permitir reenvio
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Iniciar Nova Campanha / Sessão Limpa após confirmação do usuário
  const handleConfirmNewCampaign = async (payload?: NewCampaignPayload) => {
    setError(null);
    setLastFailedMessage(null);
    setIsLoading(true);

    try {
      const newCamp = await api.startNewCampaign(payload || {});
      const newId = newCamp.campaignId;
      setCampaignId(newId);
      localStorage.setItem(STORAGE_CAMPAIGN_KEY, newId);
      setGameState(newCamp.gameState);
      setMessages(newCamp.openingMessage ? [newCamp.openingMessage] : []);
      recordRecentCampaign(newId, newCamp.gameState, 0);
    } catch (err: unknown) {
      console.error('[Create Campaign Error]:', err);
      const apiErr = err as ApiError;
      setError({
        message: apiErr.message || 'Falha ao iniciar a campanha no servidor.',
        code: 'START_ERROR',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Alternar para uma campanha existente em Recentes
  const handleRenameCampaign = async (id: string, newTitle: string) => {
    try {
      await api.renameCampaign(id, newTitle);
      
      setRecentCampaigns(prev => {
        const updated = prev.map(c => c.id === id ? { ...c, title: newTitle } : c);
        localStorage.setItem(STORAGE_RECENT_CAMPAIGNS_KEY, JSON.stringify(updated));
        return updated;
      });

      if (id === campaignId) {
        setGameState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            foundation: {
              ...prev.foundation,
              title: newTitle
            }
          } as any;
        });
      }
    } catch (e) {
      console.error('Failed to rename campaign', e);
      setError({ message: 'Erro ao renomear campanha.', code: 'RENAME_ERROR' });
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      await api.deleteCampaign(id);
      
      const updatedRecent = recentCampaigns.filter(c => c.id !== id);
      setRecentCampaigns(updatedRecent);
      localStorage.setItem(STORAGE_RECENT_CAMPAIGNS_KEY, JSON.stringify(updatedRecent));

      if (id === campaignId) {
        if (updatedRecent.length > 0) {
          // Carrega a próxima campanha válida mais recente
          await handleSelectCampaign(updatedRecent[0].id);
        } else {
          // Retorna para a tela inicial (Home) sem criar automaticamente
          setCampaignId(null as any);
          setGameState(null);
          setMessages([]);
          localStorage.removeItem(STORAGE_CAMPAIGN_KEY);
        }
      }
    } catch (e) {
      console.error('Failed to delete campaign', e);
      setError({ message: 'Erro ao excluir campanha.', code: 'DELETE_ERROR' });
    }
  };

  const handleSelectCampaign = async (selectedId: string) => {
    if (selectedId === campaignId && gameState) return;

    setError(null);
    setIsLoading(true);
    try {
      const details = await api.getCampaignDetails(selectedId);
      if (details) {
        setCampaignId(selectedId);
        localStorage.setItem(STORAGE_CAMPAIGN_KEY, selectedId);
        setGameState(details.gameState);
        setMessages(details.messages || []);
        recordRecentCampaign(selectedId, details.gameState);
      }
    } catch (err: unknown) {
      console.warn('[Load Campaign Error]:', err);
      const apiErr = err as ApiError;
      
      // Remove da lista de recentes se não foi encontrada e avisa discretamente
      if (apiErr.message && apiErr.message.toLowerCase().includes('não encontrada')) {
        setRecentCampaigns(prev => {
          const updated = prev.filter(c => c.id !== selectedId);
          localStorage.setItem(STORAGE_RECENT_CAMPAIGNS_KEY, JSON.stringify(updated));
          return updated;
        });
        
        // Se era a campanha atual que falhou ao selecionar, podemos limpar o ID
        if (localStorage.getItem(STORAGE_CAMPAIGN_KEY) === selectedId) {
          localStorage.removeItem(STORAGE_CAMPAIGN_KEY);
          setCampaignId(null);
          setGameState(null);
        }
      } else {
        setError({
          message: apiErr.message || 'Não foi possível carregar a sessão selecionada. A campanha pode ter sido apagada.',
          code: 'LOAD_ERROR',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastFailedMessage) {
      handleSendMessage(lastFailedMessage);
    } else {
      initializeEngine();
    }
  };

  const handleRetryLastAction = async () => {
    if (isLoading || !campaignId) return;
    setError(null);
    setIsLoading(true);

    try {
      const { gameState: updatedGameState, playerMessage, masterMessage } = await api.retryLastAction(campaignId);
      
      setGameState(updatedGameState);
      
      // Update messages by ensuring old master messages are fully replaced
      setMessages((prev) => {
        const newMessages = [...prev];
        let lastUserIndex = -1;
        
        // Find the last user message
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === 'user') {
            lastUserIndex = i;
            break;
          }
        }
        
        if (lastUserIndex !== -1) {
          // Re-assign the player message if provided (to maintain ID consistency)
          if (playerMessage) {
            newMessages[lastUserIndex] = playerMessage;
          }
          // Remove ALL messages after the user message (to clear any duplicate thought/auxiliary blocks)
          newMessages.splice(lastUserIndex + 1);
          newMessages.push(masterMessage);
        } else {
          // If no user message found (e.g. Turn 0 / Opening Message)
          // we just keep only the opening message (which is masterMessage)
          return [masterMessage];
        }
        
        return newMessages;
      });
    } catch (err: unknown) {
      console.error('Falha ao tentar novamente:', err);
      const apiErr = err as ApiError;
      
      let displayMessage = apiErr.message || 'Falha ao comunicar com o Mestre do RPG.';
      
      if (apiErr.status === 429) {
        displayMessage = 'Muitas ações consecutivas. Aguarde um momento e tente novamente.';
      } else if (apiErr.status === 503 || apiErr.status === 504) {
        displayMessage = 'O Mestre está sobrecarregado. Não foi possível obter uma resposta agora.';
      } else if (apiErr.message?.toLowerCase().includes('timeout') || apiErr.message?.toLowerCase().includes('network') || apiErr.code === 'NETWORK_ERROR') {
        displayMessage = 'Sua conexão oscilou. Não foi possível obter uma resposta agora.';
      }

      setError({
        message: displayMessage,
        code: apiErr.code || 'API_ERROR',
        details: apiErr.details,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditLastAction = async (newContent: string) => {
    if (isLoading || !campaignId) return;
    setError(null);
    setIsLoading(true);

    try {
      const { gameState: updatedGameState, playerMessage, masterMessage } = await api.editLastAction(campaignId, newContent);
      
      setGameState(updatedGameState);
      
      // Update messages by replacing the last user message and clearing all subsequent master messages
      setMessages((prev) => {
        const newMessages = [...prev];
        let userIndex = -1;
        
        for (let i = newMessages.length - 1; i >= 0; i--) {
          if (newMessages[i].role === 'user') {
            userIndex = i;
            break;
          }
        }
        
        if (userIndex !== -1) {
          // Replace the user message
          if (playerMessage) {
            newMessages[userIndex] = playerMessage;
          }
          // Remove ALL messages after the user message
          newMessages.splice(userIndex + 1);
          // Push the new master message
          newMessages.push(masterMessage);
        } else {
          // Fallback if no user message found
          newMessages.push(masterMessage);
        }
        
        return newMessages;
      });
    } catch (err: unknown) {
      console.error('Falha ao editar a ação:', err);
      const apiErr = err as ApiError;
      
      let displayMessage = apiErr.message || 'Falha ao comunicar com o Mestre do RPG.';
      
      if (apiErr.status === 429) {
        displayMessage = 'Muitas ações consecutivas. Aguarde um momento e tente novamente.';
      } else if (apiErr.status === 503 || apiErr.status === 504) {
        displayMessage = 'O Mestre está sobrecarregado. Não foi possível obter uma resposta agora.';
      } else if (apiErr.message?.toLowerCase().includes('timeout') || apiErr.message?.toLowerCase().includes('network') || apiErr.code === 'NETWORK_ERROR') {
        displayMessage = 'Sua conexão oscilou. Não foi possível obter uma resposta agora.';
      }

      setError({
        message: displayMessage,
        code: apiErr.code || 'API_ERROR',
        details: apiErr.details,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="sandbox-rpg-app-root"
      className="h-[100dvh] w-screen flex bg-background text-text-primary font-sans antialiased overflow-hidden select-text"
    >
      {/* Sidebar: Open by default on desktop, collapsible, drawer on mobile */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNewCampaign={() => setIsNewCampaignModalOpen(true)}
        currentCampaignId={campaignId}
        recentCampaigns={recentCampaigns}
        onSelectCampaign={handleSelectCampaign}
        onRenameCampaign={handleRenameCampaign}
        onDeleteCampaign={handleDeleteCampaign}
        gameState={gameState}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenLibrary={() => setIsLibraryModalOpen(true)}
        onOpenDeveloperPanel={() => setIsDeveloperPanelOpen(true)}
      />

      {/* Main Content Column: Header + Chat + Message Input */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Fixed Top Header */}
        <Header
          gameState={gameState}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenJournal={() => setIsJournalModalOpen(true)}
          onOpenInfo={() => setIsInfoModalOpen(true)}
        />

        {/* Error Notification Banner if any */}
        {error && (
          <ErrorBanner
            error={error}
            onRetry={handleRetry}
            onDismiss={() => setError(null)}
          />
        )}

        {/* Content Area: Chat or Home */}
        {gameState ? (
          <>
            <ChatView
              key={campaignId}
              messages={messages}
              player={gameState?.player}
              isLoading={isLoading}
              onQuickPrompt={handleSendMessage}
              onRetry={handleRetryLastAction}
              onEditLastAction={handleEditLastAction}
              preferences={uiPreferences}
            />

            <MessageInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </>
        ) : (
          <HomeView
            onNewCampaign={() => {
              sessionStorage.removeItem('rpg_new_campaign_draft');
              setNewCampaignKey(Date.now());
              setIsNewCampaignModalOpen(true);
            }}
            onSurpriseMe={() => {
              sessionStorage.setItem('rpg_new_campaign_draft', JSON.stringify({
                campaignFormat: 'sandbox',
                worldBasis: 'fictional',
                foundationSourceMode: 'generate_scenarios',
                selectedMode: 'generate_options_choice'
              }));
              setNewCampaignKey(Date.now());
              setIsNewCampaignModalOpen(true);
            }}
            onIdea={() => {
              sessionStorage.setItem('rpg_new_campaign_draft', JSON.stringify({
                campaignFormat: 'sandbox',
                worldBasis: 'fictional',
                foundationSourceMode: 'custom_idea',
                selectedMode: 'custom_idea'
              }));
              setNewCampaignKey(Date.now());
              setIsNewCampaignModalOpen(true);
            }}
            onOpenLibrary={() => setIsLibraryModalOpen(true)}
            onOpenHistory={() => setIsHistoryModalOpen(true)}
            recentCampaigns={recentCampaigns}
            onSelectCampaign={handleSelectCampaign}
          />
        )}
      </div>

      {/* Lightweight Modals / Panels */}
      <InfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        campaignId={campaignId}
        gameState={gameState}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        preferences={uiPreferences}
        onUpdatePreferences={handleUpdatePreferences}
      />

      <DeveloperPanel
        isOpen={isDeveloperPanelOpen}
        onClose={() => setIsDeveloperPanelOpen(false)}
        statusData={statusData}
        isLoadingStatus={isLoadingStatus}
        statusError={statusError}
        onRefreshStatus={handleRefreshStatus}
        campaignId={gameState ? campaignId : null}
      />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        currentCampaignId={campaignId}
        onSelectCampaign={handleSelectCampaign}
        recentCampaigns={recentCampaigns}
        onRenameCampaign={handleRenameCampaign}
        onDeleteCampaign={handleDeleteCampaign}
        onNewCampaign={() => {
          setIsHistoryModalOpen(false);
          sessionStorage.removeItem('rpg_new_campaign_draft');
          setNewCampaignKey(Date.now());
          setIsNewCampaignModalOpen(true);
        }}
      />

      <JournalModal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
        campaignId={campaignId}
      />

      <LibraryModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        recentCampaigns={recentCampaigns}
        onUsePreviousCampaign={async (summary, choice, details) => {
          try {
            if (details && details.gameState) {
              const { foundation } = details.gameState;
              sessionStorage.removeItem('rpg_new_campaign_draft');
              
              const draft: Record<string, any> = {
                campaignFormat: foundation.campaignFormat || 'sandbox',
                worldBasis: 'fictional', 
                title: foundation.title || summary.title,
                genre: foundation.genre || summary.genre,
                premise: foundation.premise || summary.premise,
                description: foundation.premise || summary.premise,
              };
              
              const worldDetails = (foundation as any).worldDetails;
              
              if (choice === 'reuse' && worldDetails) {
                draft.selectedMode = 'generate_foundation';
                draft.foundationSourceMode = 'custom_idea'; // to go back to idea if needed
                draft.selectedScenario = {
                  id: 'reused_' + summary.id,
                  title: foundation.title || summary.title || 'Mundo Importado',
                  genre: foundation.genre || summary.genre || '',
                  worldIdentity: foundation.premise || summary.premise || '',
                  description: foundation.premise || summary.premise || '',
                  startingLocation: foundation.startingLocation || worldDetails.startingLocation || '',
                  tone: foundation.tone || '',
                  themeTags: foundation.themeTags || []
                };
                draft.foundation = {
                  ...worldDetails,
                  identityAndState: worldDetails.identityAndState || foundation.rulesOfUniverse || ''
                };
                draft.customIdeaText = foundation.premise || summary.premise || '';
              } else {
                draft.selectedMode = 'custom_idea';
                draft.foundationSourceMode = 'custom_idea';
                draft.customIdeaText = foundation.premise || summary.premise || '';
              }
              
              sessionStorage.setItem('rpg_new_campaign_draft', JSON.stringify(draft));
              setIsLibraryModalOpen(false);
              setTimeout(() => {
                setNewCampaignKey(Date.now()); 
                setIsNewCampaignModalOpen(true);
              }, 100);
            }
          } catch (e) {
            console.error('Failed to process previous campaign details', e);
            setError({
              message: 'Não foi possível carregar os detalhes da campanha selecionada.',
              code: 'LOAD_ERROR'
            });
          }
        }}
        onUseScenario={(sc) => {
          // Clear current draft and setup new one based on library scenario
          sessionStorage.removeItem('rpg_new_campaign_draft');
          const draft: Record<string, any> = {
            campaignFormat: sc.campaignFormat,
            worldBasis: sc.worldBasis,
            title: sc.title,
            genre: sc.genre,
            premise: sc.premise || sc.description,
            description: sc.description,
          };
          
          if (sc.foundation) {
            draft.selectedMode = 'generate_foundation';
            draft.foundationSourceMode = 'custom_idea';
            draft.selectedScenario = {
              id: sc.id,
              title: sc.title || 'Cenário Salvo',
              genre: sc.genre || '',
              worldIdentity: sc.premise || sc.description || '',
              description: sc.description || '',
              startingLocation: '',
              tone: '',
              themeTags: sc.tropes || []
            };
            draft.foundation = sc.foundation;
            draft.customIdeaText = sc.premise || sc.description || '';
          } else {
            draft.selectedMode = 'custom_idea';
            draft.foundationSourceMode = 'custom_idea';
            draft.customIdeaText = sc.premise || sc.description;
          }
          sessionStorage.setItem('rpg_new_campaign_draft', JSON.stringify(draft));
          
          setIsLibraryModalOpen(false);
          // Pequeno timeout para dar tempo de montar o NewCampaign com o novo draft
          setTimeout(() => {
             // Forçamos um recarregamento passando uma prop? No, it reads from sessionStorage on first mount
             // Se o modal já estivesse montado e só invisível, o state não reiniciaria.
             // Para forçar o unmount, o ideal era renderizar condicionalmente, 
             // mas já que o App mantém sempre renderizado, a sessionStorage só é lida no useState inicial.
             // Vamos forçar um reload para facilitar, já que é local (e PWA like).
             setNewCampaignKey(Date.now()); setIsNewCampaignModalOpen(true);
          }, 100);
        }}
      />

      <NewCampaignModal
        key={newCampaignKey}
        isOpen={isNewCampaignModalOpen}
        onClose={() => setIsNewCampaignModalOpen(false)}
        onConfirmCreateManual={handleConfirmNewCampaign}
      />
    </div>
  );
}
