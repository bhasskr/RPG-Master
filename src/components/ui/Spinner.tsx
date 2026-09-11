import React from 'react';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'current' | 'muted' | 'secondary' | 'primary' | 'accent';
  label?: string;
}

export const Spinner = ({
  size = 'md',
  variant = 'current',
  label,
  className = '',
  ...props
}: SpinnerProps) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const variantClasses = {
    current: 'text-current',
    muted: 'text-text-muted',
    secondary: 'text-text-secondary',
    primary: 'text-text-primary',
    accent: 'text-accent'
  };

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center justify-center shrink-0 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      <Loader2
        className={`${sizeClasses[size]} animate-spin motion-reduce:animate-none`}
        aria-hidden="true"
      />
      <span className="sr-only">{label || 'Carregando...'}</span>
    </span>
  );
};

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  minHeight?: string;
  className?: string;
}

export const LoadingState = ({
  message,
  size = 'md',
  minHeight = 'min-h-[140px]',
  className = ''
}: LoadingStateProps) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full flex flex-col items-center justify-center gap-2.5 py-8 px-4 text-center ${minHeight} ${className}`}
    >
      <Spinner size={size} variant="secondary" />
      {message && (
        <p className="typo-secondary text-text-muted font-medium select-none">
          {message}
        </p>
      )}
    </div>
  );
};
