import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge = ({ className = '', variant = 'neutral', children, ...props }: BadgeProps) => {
  const baseClasses = 'typo-caption px-2 py-0.5 radius-small font-medium border inline-flex items-center justify-center shrink-0';
  const variants = {
    neutral: 'bg-surface-elevated text-text-secondary border-border-default',
    accent: 'bg-accent-subtle text-accent border-accent/30',
    success: 'bg-success-subtle text-success border-success/30',
    warning: 'bg-warning-subtle text-warning border-warning/30',
    danger: 'bg-danger-subtle text-danger border-danger/30',
    info: 'bg-info-subtle text-info border-info/30'
  };

  return (
    <span className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};
