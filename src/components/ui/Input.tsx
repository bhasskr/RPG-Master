import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, helperText, error, id, ...props }, ref) => {
    const defaultId = React.useId();
    const inputId = id || defaultId;
    
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="typo-secondary font-medium text-text-primary ml-0.5">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`
            w-full h-10 px-3 bg-surface-subtle border border-border-default 
            focus:border-focus focus:ring-1 focus:ring-focus radius-medium typo-body text-text-primary 
            outline-none transition-colors placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-danger/80 focus:border-danger ring-1 ring-danger/10' : ''}
            ${className}
          `}
          {...props}
        />
        {(helperText || error) && (
          <p className={`typo-caption ml-0.5 ${error ? 'text-danger font-medium' : 'text-text-muted'}`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
