const fs = require('fs');
let code = fs.readFileSync('src/components/MessageInput.tsx', 'utf8');

// Container
code = code.replace('border-t border-border-default/80', 'border-t border-border-subtle');
// Input wrapper
code = code.replace('border border-border-default/80 focus-within:border-border-strong/80 rounded-2xl p-2 sm:p-3 transition-colors shadow-xs',
                    'border border-border-subtle focus-within:border-border-default radius-large p-2 sm:p-3 transition-colors elevation-low');
// Send button
code = code.replace('rounded-xl bg-text-primary hover:bg-white active:bg-text-primary/80 disabled:bg-surface-elevated text-background disabled:text-text-disabled flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs shrink-0',
                    'radius-medium bg-text-primary hover:bg-white active:bg-text-primary/80 disabled:bg-surface-elevated text-background disabled:text-text-disabled flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shrink-0');

fs.writeFileSync('src/components/MessageInput.tsx', code);
