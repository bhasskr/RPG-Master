import { IconButton } from './ui';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, isLoading, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const handleSend = () => {
    if (!text.trim() || isLoading || disabled) return;
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Prevent sending during IME composition (e.g. typing accents, CJK)
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  return (
    <div
      id="app-fixed-message-bar"
      className="sticky bottom-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border-subtle px-4 sm:px-6 py-3 sm:py-3.5 shrink-0"
    >
      <div className="max-w-3xl mx-auto">
        <div className={`relative flex items-end bg-surface-subtle/80 border border-border-default focus-within:border-border-strong focus-within:ring-1 focus-within:ring-border-strong radius-large p-1.5 sm:p-2 transition-colors ${(isLoading || disabled) ? "opacity-60" : ""}`}>
          <textarea
            ref={textareaRef}
            id="player-action-textarea"
            rows={1}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isLoading || disabled}
            placeholder="Descreva sua ação..."
            className="w-full bg-transparent border-0 typo-body text-text-primary placeholder:text-text-muted focus:ring-0 focus:outline-none resize-none px-3 py-1.5 max-h-[180px] min-h-[40px] leading-relaxed"
            style={{ overflowY: text.split('\n').length > 5 || (textareaRef.current?.scrollHeight || 0) > 180 ? 'auto' : 'hidden' }}
          />
          <div className="flex items-center gap-2 shrink-0 ml-1.5 mb-0.5">
            <IconButton
              id="send-action-button"
              type="button"
              onClick={handleSend}
              disabled={!text.trim() || isLoading || disabled}
              variant="primary"
              className="w-9 h-9 sm:w-10 sm:h-10 shrink-0"
              title="Enviar ação (Enter)"
              aria-label="Enviar ação"
            >
              <ArrowUp className="w-4 h-4" />
            </IconButton>
          </div>
        </div>
        {/* Keyboard shortcut hint */}
        <div className="hidden sm:flex items-center justify-between px-2 pt-1.5 typo-caption text-text-muted">
          <span>Enter para enviar • Shift+Enter para quebra de linha</span>
        </div>
      </div>
    </div>
  );
}
