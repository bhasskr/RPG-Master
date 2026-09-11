const fs = require('fs');
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf8');

// Empty state
code = code.replace('rounded-2xl bg-surface-elevated/80 border border-border-strong/70 text-text-secondary flex items-center justify-center mb-4 shadow-sm',
                    'radius-medium bg-surface-elevated/80 border border-border-default text-text-secondary flex items-center justify-center mb-4');
                    
// User message bubble
code = code.replace('bg-surface-elevated/80 border border-border-strong/60 text-text-primary rounded-2xl rounded-tr-xs shadow-xs',
                    'bg-surface-elevated/80 border border-border-subtle text-text-primary radius-large radius-tr-small');

// Action Context icon
code = code.replace('rounded-xl bg-surface-subtle/80 border border-border-strong/40 text-text-muted flex items-center justify-center shrink-0 shadow-xs',
                    'radius-medium bg-surface-subtle/80 border border-border-subtle text-text-muted flex items-center justify-center shrink-0');

// System message bubble
code = code.replace('rounded-lg bg-surface-elevated/80 border border-border-strong/60 flex items-center justify-center text-text-secondary shrink-0 mt-1 shadow-2xs',
                    'radius-medium bg-surface-elevated/80 border border-border-subtle flex items-center justify-center text-text-secondary shrink-0 mt-1');
code = code.replace('rounded-lg bg-surface-elevated/80 border border-border-strong/60 flex items-center justify-center text-text-secondary shrink-0 mt-1',
                    'radius-medium bg-surface-elevated/80 border border-border-subtle flex items-center justify-center text-text-secondary shrink-0 mt-1');

// Retry Button
code = code.replace(/rounded-md/g, 'radius-medium'); // also affects other rounded-md

// Scroll to bottom button
code = code.replace('rounded-full bg-surface-elevated/90 hover:bg-surface-hover text-text-primary border border-border-strong/80 shadow-lg backdrop-blur-xs',
                    'rounded-full bg-surface-elevated/90 hover:bg-surface-hover text-text-primary border border-border-default elevation-medium backdrop-blur-xs');

fs.writeFileSync('src/components/ChatView.tsx', code);
