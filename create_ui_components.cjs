const fs = require('fs');

const buttonCode = `import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'default' | 'compact';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'secondary', size = 'default', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center radius-medium typo-secondary transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 font-medium';
    const variants = {
      primary: 'bg-text-primary hover:bg-white active:bg-text-primary/80 text-background border border-transparent shadow-none',
      secondary: 'bg-surface-elevated hover:bg-surface-hover active:bg-surface-active text-text-primary border border-border-default shadow-none',
      ghost: 'bg-transparent hover:bg-surface-hover text-text-secondary hover:text-text-primary border border-transparent',
      danger: 'bg-danger hover:bg-danger-hover text-white shadow-none border border-transparent'
    };
    const sizes = {
      default: 'px-4 py-2',
      compact: 'px-3 py-1.5'
    };

    return (
      <button ref={ref} className={\`\${baseClasses} \${variants[variant]} \${sizes[size]} \${className}\`} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
`;
fs.writeFileSync('src/components/ui/Button.tsx', buttonCode);

const iconButtonCode = `import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'secondary' | 'danger' | 'primary';
  size?: 'default' | 'compact';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className = '', variant = 'ghost', size = 'default', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center radius-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0';
    const variants = {
      ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-hover active:bg-surface-active border border-transparent',
      secondary: 'bg-surface-elevated border border-border-default text-text-secondary hover:text-text-primary',
      danger: 'text-text-secondary hover:text-danger hover:bg-danger-subtle/20 border border-transparent',
      primary: 'bg-text-primary hover:bg-white active:bg-text-primary/80 text-background border border-transparent'
    };
    const sizes = {
      default: 'p-3',
      compact: 'p-2'
    };

    return (
      <button ref={ref} className={\`\${baseClasses} \${variants[variant]} \${sizes[size]} \${className}\`} {...props}>
        {children}
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';
`;
fs.writeFileSync('src/components/ui/IconButton.tsx', iconButtonCode);

const badgeCode = `import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge = ({ className = '', variant = 'neutral', children, ...props }: BadgeProps) => {
  const baseClasses = 'typo-caption px-2 py-0.5 radius-small font-semibold border inline-flex items-center justify-center shrink-0';
  const variants = {
    neutral: 'bg-surface-subtle text-text-secondary border-border-subtle',
    accent: 'bg-accent-subtle text-accent border-accent-subtle',
    success: 'bg-success-subtle text-success border-success-subtle',
    warning: 'bg-warning-subtle text-warning border-warning-subtle',
    danger: 'bg-danger-subtle text-danger border-danger-subtle',
    info: 'bg-info-subtle text-info border-info-subtle'
  };

  return (
    <span className={\`\${baseClasses} \${variants[variant]} \${className}\`} {...props}>
      {children}
    </span>
  );
};
`;
fs.writeFileSync('src/components/ui/Badge.tsx', badgeCode);

const inputCode = `import React from 'react';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={\`bg-background border border-border-default text-text-primary placeholder-text-muted typo-body radius-small px-3 py-2 w-full focus:outline-none focus:border-border-strong transition-colors disabled:opacity-50 \${className}\`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
`;
fs.writeFileSync('src/components/ui/Input.tsx', inputCode);

const emptyStateCode = `import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title?: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className = '' }: EmptyStateProps) => {
  return (
    <div className={\`p-8 text-center radius-large bg-surface-subtle/40 border border-border-subtle flex flex-col items-center justify-center gap-2 \${className}\`}>
      <div className="text-text-muted opacity-60 mb-2">
        {icon}
      </div>
      {title && <h3 className="typo-heading text-text-primary">{title}</h3>}
      <p className="typo-body text-text-secondary max-w-md">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
`;
fs.writeFileSync('src/components/ui/EmptyState.tsx', emptyStateCode);

const drawerShellCode = `import React from 'react';
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
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs transition-opacity duration-200" onClick={onClose} />
      <div className={\`fixed inset-y-0 right-0 z-50 w-full \${maxWidthClass} bg-background border-l border-border-default elevation-medium flex flex-col transition-transform duration-300 ease-out\`}>
        <header className="h-16 px-4 sm:px-6 border-b border-border-default flex items-center justify-between shrink-0 bg-background">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-8 h-8 radius-medium bg-surface-elevated/90 border border-border-default flex items-center justify-center text-text-primary shrink-0">
                {icon}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <h2 className="typo-section-heading text-text-primary truncate">{title}</h2>
              {subtitle && <p className="typo-caption text-text-muted truncate">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <IconButton onClick={onClose} title="Fechar" size="compact" aria-label="Fechar modal">
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto flex flex-col">
          {children}
        </div>

        {footer && (
          <footer className="p-4 border-t border-border-default bg-background flex items-center justify-between shrink-0">
            {footer}
          </footer>
        )}
      </div>
    </>
  );
};
`;
fs.writeFileSync('src/components/ui/DrawerShell.tsx', drawerShellCode);

console.log('UI Components created successfully.');
