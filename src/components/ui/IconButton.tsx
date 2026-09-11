import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'secondary' | 'danger' | 'primary';
  size?: 'default' | 'compact';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className = '', variant = 'ghost', size = 'default', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center radius-medium transition-colors duration-150 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 active:opacity-90';
    const variants = {
      ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-hover active:bg-surface-active border border-transparent',
      secondary: 'bg-surface-elevated border border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-hover active:bg-surface-active',
      danger: 'text-text-secondary hover:text-danger hover:bg-danger-subtle/20 active:bg-danger-subtle/30 border border-transparent',
      primary: 'bg-text-primary hover:bg-white active:bg-text-primary/80 text-background border border-transparent'
    };
    const sizes = {
      default: 'p-2.5 sm:p-2 min-w-[38px] min-h-[38px] sm:min-w-[36px] sm:min-h-[36px]',
      compact: 'p-1.5 min-w-[32px] min-h-[32px]'
    };

    return (
      <button ref={ref} className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
        {children}
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';
