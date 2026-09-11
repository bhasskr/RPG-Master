import { Button, IconButton, Badge, Input, DrawerShell, Tabs, Spinner } from './ui';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowDown, Sparkles, Feather, Dices, Check, X as XIcon, AlertTriangle, RotateCcw, Pencil } from 'lucide-react';
import { ChatMessage, PlayerCharacter } from '../types';
import { UiPreferences, DEFAULT_UI_PREFERENCES } from '../utils/uiPreferences';

interface ChatViewProps {
  messages: ChatMessage[];
  player?: PlayerCharacter;
  isLoading: boolean;
  onQuickPrompt?: (prompt: string) => void;
  onRetry?: () => void;
  onEditLastAction?: (newContent: string) => void;
  preferences?: UiPreferences;
}

export function ChatView({
  messages,
  player,
  isLoading,
  onQuickPrompt,
  onRetry,
  onEditLastAction,
  preferences = DEFAULT_UI_PREFERENCES,
}: ChatViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const previousMessagesLengthRef = useRef<number>(messages.length);
  const isAtBottomRef = useRef<boolean>(true);
  const [showScrollBottomButton, setShowScrollBottomButton] = useState<boolean>(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');

  useEffect(() => {
    if (editingMessageId && !isLoading) {
      const msg = messages.find(m => m.id === editingMessageId);
      // Se o conteúdo oficial for igual ao conteúdo editado, significa que a edição foi salva com sucesso.
      if (msg && msg.content === editContent.trim()) {
        setEditingMessageId(null);
      }
    }
  }, [messages, editingMessageId, editContent, isLoading]);

  const scrollBehavior = preferences.enableAnimations ? 'smooth' : 'auto';

  // Monitor scroll position to show/hide "Scroll to bottom" helper button
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    
    // Increased threshold to ensure it only appears when sufficiently distant from the end
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const isFarFromBottom = distanceToBottom > (clientHeight * 0.5) || distanceToBottom > 500;
    
    setShowScrollBottomButton(isFarFromBottom);
    // Lower threshold for bottom detection to prevent accidental auto-scrolling when user scrolled up slightly
    isAtBottomRef.current = distanceToBottom <= 100;
  }, []);

  // Ensure scroll position is at bottom when a new campaign loads
  // The component remounts cleanly because of key={campaignId} in App.tsx
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
  }, []);

  // Control intelligent scrolling:
  // When a new message arrives, position comfortably at the START of the new turn,
  // without aggressively dragging the viewport to the bottom as the response streams or finishes.
  useEffect(() => {
    const isNewMessageAdded = messages.length > previousMessagesLengthRef.current;

    if (isNewMessageAdded) {
      // 2. Usuário lendo conteúdo antigo:
      // Se o jogador estiver rolando mensagens anteriores, não o puxamos 
      // automaticamente para baixo, preservando a posição de leitura.
      if (!isAtBottomRef.current) {
        previousMessagesLengthRef.current = messages.length;
        return;
      }

      // 1. Novo turno: 
      // Ancorar o novo turno confortavelmente na viewport.
      setTimeout(() => {
        if (lastUserMessageRef.current) {
          lastUserMessageRef.current.scrollIntoView({
            behavior: scrollBehavior,
            block: 'start',
          });
        } else {
          bottomRef.current?.scrollIntoView({ behavior: scrollBehavior });
        }
      }, 50);
    }

    // 5. Retry / Edit:
    // Se o tamanho da array diminuir ou ficar igual, não disparamos scroll, 
    // mantendo a viewport perfeitamente estável onde o usuário editou/pediu retry.
    previousMessagesLengthRef.current = messages.length;
  }, [messages, scrollBehavior]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: scrollBehavior });
  };

  // Typography size classes based on preferences
  const textSizeClass =
    preferences.textSize === 'small'
      ? 'text-sm'
      : preferences.textSize === 'large'
      ? 'text-base sm:text-lg'
      : 'text-sm sm:text-base';

  const userTextSizeClass =
    preferences.textSize === 'small'
      ? 'text-xs'
      : preferences.textSize === 'large'
      ? 'text-base'
      : 'text-sm';

  // Spacing density classes based on preferences
  const densityContainerPadding =
    preferences.density === 'compact'
      ? 'px-4 sm:px-6 py-4 md:py-6'
      : 'px-4 sm:px-6 md:px-8 py-6 md:py-8';

  const densityMessageSpacing =
    preferences.density === 'compact' ? 'space-y-6' : 'space-y-8';

  const densityBubblePadding =
    preferences.density === 'compact'
      ? 'px-3.5 py-2 sm:px-4 sm:py-2.5'
      : 'px-4 py-2.5 sm:px-5 sm:py-3';

  return (
    <div
      ref={containerRef}
      id="rpg-chat-container"
      onScroll={handleScroll}
      className={`flex-1 overflow-y-auto ${densityContainerPadding} bg-background relative`}
    >
      {/* Empty State / Welcome Screen */}
      {messages.length === 0 && !isLoading && (
        <div
          id="chat-empty-state"
          className="h-full min-h-[50vh] flex flex-col items-center justify-center text-center max-w-xl mx-auto px-4"
        >
          <div className="w-12 h-12 radius-medium bg-surface-elevated/80 border border-border-default text-text-secondary flex items-center justify-center mb-4">
            <Feather className="w-6 h-6 text-text-secondary" />
          </div>
          <h2 className="typo-display text-text-primary">
            Aventura Pronta para Começar
          </h2>
          <p className="typo-body text-text-secondary mt-2 max-w-md">
            Você está no comando do seu personagem. Diga o que deseja fazer, para onde quer ir ou com quem quer falar.
          </p>

          {/* Quick starter action suggestions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-md">
            {[
              'Observo ao meu redor com atenção.',
              'Procuro a taverna mais próxima para obter informações.',
              'Verifico meus pertences e preparo meus equipamentos.',
              'Pergunto a alguém na rua sobre rumores recentes.',
            ].map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onQuickPrompt?.(suggestion)}
                className="p-4 text-left bg-surface-subtle/60 hover:bg-surface-elevated/80 active:bg-surface-active border border-border-subtle hover:border-border-default radius-large typo-secondary text-text-secondary transition-colors duration-150 motion-reduce:transition-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
              >
                "{suggestion}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Conversation Stream */}
      <div className={`max-w-3xl mx-auto ${densityMessageSpacing}`}>
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          let lastUserIndex = -1;
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
              lastUserIndex = i;
              break;
            }
          }
          const isLatestUserMessage = isUser && index === lastUserIndex;

          if (isUser) {
            // Mensagem do Jogador: Bolha discreta alinhada à direita
            const isEditing = editingMessageId === msg.id;
            
            // Verificações para habilitar a edição
            const canEdit = isLatestUserMessage && !isLoading;
            
            // Check if there are mutations in the associated master message
            let associatedMasterHasMutations = false;
            let associatedMasterHasDiceRolls = false;
            if (isLatestUserMessage && index < messages.length - 1) {
              const nextMsg = messages[index + 1];
              if (nextMsg.role === 'assistant') {
                associatedMasterHasMutations = !!nextMsg.metadata?.hasMutations;
                associatedMasterHasDiceRolls = !!(nextMsg.metadata?.diceRolls && nextMsg.metadata.diceRolls.length > 0);
              }
            }

            return (
              <div
                key={msg.id || index}
                ref={isLatestUserMessage ? lastUserMessageRef : null}
                id={`player-turn-${msg.turn || index}`}
                className="flex justify-end group relative w-full"
              >
                <div className="max-w-[88%] sm:max-w-[76%] md:max-w-[65%] flex flex-col items-end">
                  
                  {isEditing ? (
                    <div className={`w-full sm:min-w-[380px] bg-surface-elevated border border-border-default focus-within:border-border-strong focus-within:ring-1 focus-within:ring-focus radius-large p-3.5 flex flex-col gap-2.5 transition-opacity duration-200 ease-out ${isLoading ? 'opacity-80' : ''}`}>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        disabled={isLoading}
                        className={`w-full bg-transparent resize-none outline-none text-text-primary ${userTextSizeClass} min-h-[72px] leading-relaxed disabled:opacity-70`}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 pt-1 border-t border-border-subtle">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMessageId(null);
                            setEditContent('');
                          }}
                          disabled={isLoading}
                          className="px-3 py-1.5 radius-medium typo-caption font-medium bg-surface-subtle hover:bg-surface-hover text-text-secondary transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editContent.trim() && editContent !== msg.content) {
                              onEditLastAction?.(editContent.trim());
                            } else {
                              setEditingMessageId(null);
                            }
                          }}
                          disabled={!editContent.trim() || isLoading}
                          className="px-3.5 py-1.5 radius-medium typo-caption font-medium bg-text-primary hover:bg-text-primary/90 text-background transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                        >
                          {isLoading && <Spinner size="xs" variant="current" />}
                          <span>{isLoading ? 'Salvando...' : 'Salvar'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 flex-row-reverse">
                      <div
                        id={`message-bubble-${msg.id}`}
                        className={`${densityBubblePadding} radius-large radius-tr-small bg-surface-subtle text-text-primary ${userTextSizeClass} font-normal leading-relaxed`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                      
                      {/* Botão de Editar */}
                      {canEdit && (
                        <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity mt-0.5">
                          <IconButton
                            type="button"
                            onClick={() => {
                              if (associatedMasterHasMutations || associatedMasterHasDiceRolls) {
                                return;
                              }
                              setEditingMessageId(msg.id);
                              setEditContent(msg.content);
                            }}
                            disabled={associatedMasterHasMutations || associatedMasterHasDiceRolls || isLoading}
                            variant="ghost"
                            size="compact"
                            title={
                              associatedMasterHasMutations
                                ? 'Esta ação não pode ser editada porque o turno já alterou o estado da campanha.'
                                : associatedMasterHasDiceRolls
                                ? 'Esta ação não pode ser editada porque o teste de dados já foi resolvido.'
                                : isLoading
                                ? 'Aguarde o Mestre concluir a narração...'
                                : 'Editar ação'
                            }
                            aria-label={
                              associatedMasterHasMutations
                                ? 'Esta ação não pode ser editada porque o turno já alterou o estado da campanha.'
                                : associatedMasterHasDiceRolls
                                ? 'Esta ação não pode ser editada porque o teste de dados já foi resolvido.'
                                : 'Editar ação'
                            }
                          >
                            <Pencil className="w-3.5 h-3.5 text-text-muted hover:text-text-secondary" />
                          </IconButton>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Resposta do Narrador: Texto aberto e focado em leitura pura
          return (
            <div
              key={msg.id || index}
              id={`narrator-turn-${msg.turn || index}`}
              className="flex items-start gap-3 sm:gap-4"
            >
              {/* Discrete Narrator Marker */}
              <div className="w-6 h-6 radius-medium bg-surface-elevated/70 border border-border-subtle flex items-center justify-center text-text-secondary shrink-0 mt-1">
                <Sparkles className="w-3.5 h-3.5 text-text-muted" />
              </div>

              {/* Open Text Area */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 typo-caption text-text-muted mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-secondary">Mestre</span>
                    {msg.turn > 0 && (
                      <span className="font-mono text-text-muted">• Turno {msg.turn}</span>
                    )}
                    {msg.metadata && 'fallback' in msg.metadata && (
                      <span
                        className="inline-flex items-center px-1.5 py-0.2 radius-small bg-warning/10 text-warning border border-warning/20 font-mono typo-caption"
                        title="Resposta gerada por sistema de contingência"
                      >
                        Contingência
                      </span>
                    )}
                  </div>

                  {/* Indicador simples de rolagem se habilitado */}
                  {preferences.showRollIndicators && (
                    <div className="flex items-center gap-1 font-mono typo-caption text-text-muted">
                      <Dices className="w-3.5 h-3.5 text-text-muted" />
                      <span>D20</span>
                    </div>
                  )}
                </div>

                <div
                  className={`markdown-body break-words text-text-primary ${textSizeClass} typo-narrative max-w-[70ch] leading-relaxed [&>p]:mb-4 [&>p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-text-primary [&_em]:text-text-secondary [&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:text-text-secondary [&_blockquote]:italic [&_blockquote]:my-3.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-3 [&_ul>li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-3 [&_ol>li]:mb-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-text-primary [&_h1]:mt-5 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-text-primary [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-text-primary [&_h3]:mt-3 [&_h3]:mb-1.5`}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>

                {/* Retry Button */}
                {index === messages.length - 1 && onRetry && (
                  <div className="pt-3 flex justify-start">
                    <button
                      type="button"
                      onClick={onRetry}
                      disabled={!!msg.metadata?.hasMutations || isLoading}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 radius-medium typo-caption font-medium transition-colors duration-150 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                        msg.metadata?.hasMutations
                          ? 'text-text-disabled cursor-not-allowed opacity-50'
                          : isLoading
                          ? 'text-text-muted opacity-70 cursor-wait'
                          : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated active:bg-surface-active cursor-pointer'
                      }`}
                      title={
                        msg.turn === 0
                          ? 'Regenerar a cena de abertura da campanha'
                          : msg.metadata?.hasMutations
                          ? 'Mudanças irreversíveis foram consolidadas. Não é possível repetir.'
                          : isLoading
                          ? 'Aguarde, regenerando a resposta...'
                          : 'Tentar novamente gerar uma resposta para sua última ação'
                      }
                      aria-label="Tentar novamente"
                    >
                      {isLoading ? (
                        <Spinner size="xs" variant="secondary" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {msg.metadata?.hasMutations
                          ? 'Consolidado'
                          : isLoading
                          ? 'Regenerando...'
                          : msg.turn === 0
                          ? 'Regenerar abertura'
                          : 'Tentar novamente'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Indicador simples: "Mestre está narrando..." */}
        {isLoading && !editingMessageId && (
          <div
            id="narrator-typing-indicator"
            role="status"
            aria-live="polite"
            className={`flex items-start gap-3 sm:gap-4 ${
              preferences.enableAnimations ? 'animate-fade-in' : ''
            }`}
          >
            <div className="w-6 h-6 radius-medium bg-surface-elevated/70 border border-border-subtle flex items-center justify-center text-text-secondary shrink-0 mt-1">
              <Sparkles
                className={`w-3.5 h-3.5 text-text-muted motion-reduce:animate-none ${
                  preferences.enableAnimations ? 'animate-pulse' : ''
                }`}
              />
            </div>

            <div className="space-y-0.5">
              <div className="typo-caption font-medium text-text-muted">Mestre</div>
              <div className="flex items-center gap-2 py-0.5 typo-body">
                <div className="flex items-center gap-1" aria-hidden="true">
                  <span
                    className={`w-1.5 h-1.5 radius-full bg-text-muted motion-reduce:animate-none ${
                      preferences.enableAnimations ? 'animate-pulse' : ''
                    }`}
                  />
                  <span
                    className={`w-1.5 h-1.5 radius-full bg-text-muted motion-reduce:animate-none ${
                      preferences.enableAnimations ? 'animate-pulse' : ''
                    }`}
                    style={preferences.enableAnimations ? { animationDelay: '200ms' } : undefined}
                  />
                  <span
                    className={`w-1.5 h-1.5 radius-full bg-text-muted motion-reduce:animate-none ${
                      preferences.enableAnimations ? 'animate-pulse' : ''
                    }`}
                    style={preferences.enableAnimations ? { animationDelay: '400ms' } : undefined}
                  />
                </div>
                <span className="typo-caption text-text-muted italic">Mestre está narrando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Floating "Scroll to bottom" button if user scrolled up */}
      {showScrollBottomButton && (
        <button
          id="scroll-to-bottom-btn"
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 z-20 px-3.5 py-2 radius-full bg-surface-elevated/95 hover:bg-surface-hover active:bg-surface-active text-text-secondary hover:text-text-primary border border-border-default shadow-sm backdrop-blur-md transition-colors duration-150 motion-reduce:transition-none cursor-pointer flex items-center gap-2 typo-caption font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-focus group"
          title="Ir para o conteúdo mais recente"
          aria-label="Ir para o conteúdo mais recente"
        >
          <ArrowDown className="w-3.5 h-3.5 text-text-secondary group-hover:text-text-primary transition-colors" />
          <span>Mais recente</span>
        </button>
      )}
    </div>
  );
}
