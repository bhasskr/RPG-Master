import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title?: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className = '' }: EmptyStateProps) => {
  return (
    <div className={`py-12 px-6 text-center flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="text-text-secondary mb-1">
        {icon}
      </div>
      {title && <h3 className="typo-secondary font-semibold text-text-primary">{title}</h3>}
      <p className="typo-caption text-text-secondary max-w-sm leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
