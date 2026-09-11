const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Sidebar Toggle Button
code = code.replace('p-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-hover active:bg-surface-active transition-colors cursor-pointer shrink-0 border border-transparent hover:border-border-default',
                    'p-3 radius-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover active:bg-surface-active transition-colors cursor-pointer shrink-0 border border-transparent');
// Tag Turno
code = code.replace('radius-small bg-surface-hover text-text-secondary border border-border-default', // might not be this yet
                    'radius-small bg-surface-hover text-text-secondary border border-border-subtle');
code = code.replace('rounded-full bg-surface-hover text-text-secondary border border-border-default',
                    'radius-small bg-surface-hover text-text-secondary border border-border-subtle');
// Current Location & Date Tags
code = code.replace(/rounded-lg bg-surface-subtle\/90 border border-border-default/g,
                    'radius-medium bg-surface-subtle/90 border border-border-subtle');

fs.writeFileSync('src/components/Header.tsx', code);
