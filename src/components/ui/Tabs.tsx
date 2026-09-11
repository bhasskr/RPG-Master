import React from 'react';

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  fullWidth?: boolean;
}

export const Tabs = ({ tabs, activeTab, onChange, className = '', fullWidth = false }: TabsProps) => {
  return (
    <div className={`flex items-center p-1 bg-surface-subtle border border-border-subtle radius-medium ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              ${fullWidth ? 'flex-1' : ''}
              flex items-center justify-center gap-2 px-3 py-1.5 typo-secondary font-medium radius-small transition-colors duration-150 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-focus
              ${isActive 
                ? 'bg-surface-elevated text-text-primary shadow-none border border-border-default' 
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent'}
            `}
            aria-selected={isActive}
            role="tab"
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
