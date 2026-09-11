import React from 'react';

interface DividerProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const Divider = ({ className = '', orientation = 'horizontal' }: DividerProps) => {
  const base = orientation === 'horizontal' ? 'w-full h-px' : 'h-full w-px';
  return <div className={`${base} bg-border-default ${className}`} role="separator" />;
};
