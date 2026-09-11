import React, { TextareaHTMLAttributes, forwardRef } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  helperText?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, helperText, error, id, ...props }, ref) => {
    const defaultId = React.useId();
    const textareaId = id || defaultId;
    
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={textareaId} className="typo-secondary font-medium text-text-primary ml-0.5">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={`
            w-full bg-surface-subtle border border-border-default 
            focus:border-focus focus:ring-1 focus:ring-focus radius-medium typo-body text-text-primary 
            outline-none transition-colors p-3 placeholder:text-text-muted disabled:opacity-50 disabled:cursor-not-allowed
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

Textarea.displayName = 'Textarea';
