import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'default' | 'compact';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'secondary', size = 'default', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center radius-medium typo-secondary transition-colors duration-150 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 font-medium active:opacity-90';
    const variants = {
      primary: 'bg-text-primary hover:bg-white active:bg-text-primary/80 text-background border border-transparent shadow-none',
      secondary: 'bg-surface-elevated hover:bg-surface-hover active:bg-surface-active text-text-primary border border-border-default shadow-none',
      ghost: 'bg-transparent hover:bg-surface-hover text-text-secondary hover:text-text-primary border border-transparent',
      danger: 'bg-danger hover:bg-danger-hover text-white shadow-none border border-transparent'
    };
    const sizes = {
      default: 'px-4 py-2 min-h-[38px] sm:min-h-[36px]',
      compact: 'px-3 py-1.5 min-h-[32px]'
    };

    return (
      <button ref={ref} className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
