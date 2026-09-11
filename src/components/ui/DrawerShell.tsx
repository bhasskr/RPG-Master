import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

interface DrawerShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
  maxWidthClass?: string;
}

export const DrawerShell = ({ isOpen, onClose, title, icon, subtitle, children, footer, headerActions, maxWidthClass = 'sm:max-w-md md:max-w-xl lg:max-w-2xl' }: DrawerShellProps) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs transition-opacity duration-200" 
        onClick={onClose} 
        aria-hidden="true"
      />
      <div 
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed inset-y-0 right-0 z-50 w-full ${maxWidthClass} bg-background border-l border-border-default elevation-medium flex flex-col transition-transform duration-300 ease-out`}
      >
        <header className="h-16 px-4 sm:px-6 border-b border-border-default flex items-center justify-between shrink-0 bg-background">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-8 h-8 radius-medium bg-surface-elevated/90 border border-border-default flex items-center justify-center text-text-primary shrink-0" aria-hidden="true">
                {icon}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <h2 className="typo-heading text-text-primary truncate">{title}</h2>
              {subtitle && <p className="typo-caption text-text-muted truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <IconButton onClick={onClose} variant="ghost" title="Fechar" size="compact" aria-label="Fechar painel">
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto flex flex-col">
          {children}
        </div>

        {footer && (
          <footer className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-border-default bg-background flex items-center justify-between shrink-0">
            {footer}
          </footer>
        )}
      </div>
    </>
  );
};
