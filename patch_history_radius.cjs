const fs = require('fs');
let code = fs.readFileSync('src/components/HistoryModal.tsx', 'utf8');

// Global changes
code = code.replace(/rounded-2xl/g, 'radius-large');
code = code.replace(/rounded-xl/g, 'radius-medium');
code = code.replace(/rounded-lg/g, 'radius-medium');
code = code.replace(/rounded-md/g, 'radius-medium');
code = code.replace(/rounded-l-md/g, 'radius-l-medium');
code = code.replace(/rounded-r-md/g, 'radius-r-medium');
code = code.replace(/rounded\b/g, 'radius-small');
code = code.replace(/shadow-2xl/g, 'elevation-medium');

// Search Bar
code = code.replace('bg-surface-elevated/50 border border-border-strong px-4 py-2 text-text-primary text-sm focus:outline-none focus:border-accent-subtle transition-colors',
                    'bg-surface-elevated/50 border border-border-subtle px-4 py-2 text-text-primary text-sm focus:outline-none focus:border-border-strong transition-colors');

// Search Icon Container
code = code.replace('radius-medium border border-border-strong/80 text-text-secondary flex items-center justify-center bg-surface-subtle shadow-sm',
                    'radius-medium border border-border-default text-text-secondary flex items-center justify-center bg-surface-subtle');

// Campaign Delete Overlay
code = code.replace('bg-surface-subtle/95 backdrop-blur-sm radius-medium flex flex-col items-center justify-center border border-danger-subtle p-3 text-center gap-2 shadow-lg shadow-red-900/10',
                    'bg-surface-subtle/95 backdrop-blur-sm radius-medium flex flex-col items-center justify-center border border-danger-subtle p-3 text-center gap-2 elevation-low');

// Campaign List Item (Active)
code = code.replace('bg-surface-hover/90 border-border-strong shadow-md ring-1 ring-border-strong/20',
                    'bg-surface-hover/90 border-border-default');

// Campaign List Item (Inactive)
code = code.replace('bg-surface-subtle/60 hover:bg-surface-hover/80 border-border-default/80 hover:border-border-strong',
                    'bg-surface-subtle/60 hover:bg-surface-hover/80 border-border-subtle hover:border-border-default');

// Floating Action Menu
code = code.replace('bg-surface-elevated/80 backdrop-blur radius-medium shadow-sm border border-border-strong/50',
                    'bg-surface-elevated/80 backdrop-blur radius-medium border border-border-subtle elevation-low');

// Empty state icons
code = code.replace('radius-large border border-border-default/80 text-text-muted flex items-center justify-center bg-surface-subtle shadow-sm',
                    'radius-large border border-border-subtle text-text-muted flex items-center justify-center bg-surface-subtle');

// Turno Tag
code = code.replace('px-2 py-0.5 radius-small bg-background border border-border-default',
                    'px-2 py-0.5 radius-small bg-background border border-border-subtle');
                    
// Inline Rename input
code = code.replace('bg-background border border-border-strong text-text-primary text-sm radius-small px-2 py-1 w-full focus:outline-none focus:border-border-strong',
                    'bg-background border border-border-default text-text-primary text-sm radius-small px-2 py-1 w-full focus:outline-none focus:border-border-strong');

fs.writeFileSync('src/components/HistoryModal.tsx', code);
