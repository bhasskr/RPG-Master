const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Global changes for Sidebar
code = code.replace(/rounded-xl/g, 'radius-medium');
code = code.replace(/rounded-lg/g, 'radius-medium');
code = code.replace(/rounded-md/g, 'radius-medium');
code = code.replace(/rounded-l-md/g, 'radius-l-medium');
code = code.replace(/rounded-r-md/g, 'radius-r-medium');
code = code.replace(/rounded\b/g, 'radius-small');
code = code.replace(/rounded-full/g, 'radius-medium rounded-full'); // fixing where we might want real circles vs just generic rounded, actually it's for 'w-2 h-2 rounded-full bg-accent'

// Specific elements
// New Campaign Button
code = code.replace('bg-surface-elevated/50 hover:bg-surface-hover/80 border border-border-strong text-text-primary hover:text-white radius-medium text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer',
                    'bg-surface-elevated/50 hover:bg-surface-hover/80 border border-border-default text-text-primary hover:text-white radius-medium text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer');

// Engine Badge
code = code.replace('radius-small bg-surface-subtle/40 border border-border-subtle typo-caption text-text-muted italic',
                    'radius-small bg-surface-subtle/40 border border-border-subtle typo-caption text-text-muted italic'); // Kept as is

// Tag Turno
code = code.replace('radius-small bg-surface-subtle/60 text-text-secondary font-mono border border-border-default',
                    'radius-small bg-surface-subtle/60 text-text-secondary font-mono border border-border-subtle'); // softer border

// Delete Overlay
code = code.replace('bg-surface-subtle/95 backdrop-blur-sm radius-medium flex flex-col items-center justify-center border border-danger-subtle p-2 text-center gap-2 shadow-lg shadow-red-900/10',
                    'bg-surface-subtle/95 backdrop-blur-sm radius-medium flex flex-col items-center justify-center border border-danger-subtle p-2 text-center gap-2 elevation-low');

// Floating Action Menu
code = code.replace('bg-surface-elevated/80 backdrop-blur radius-medium shadow-sm border border-border-strong/50',
                    'bg-surface-elevated/80 backdrop-blur radius-medium border border-border-default elevation-low');

// Campaign List Item (Removing shadow and adjusting border for card look)
code = code.replace('border border-transparent hover:border-transparent bg-surface-elevated/90 border-border-default shadow-xs',
                    'border border-border-default bg-surface-elevated/90');
code = code.replace('bg-surface-subtle/30 hover:bg-surface-hover/60 border border-transparent',
                    'bg-surface-subtle/30 hover:bg-surface-hover/60 border border-transparent');

// Search input
code = code.replace('bg-background border border-border-strong text-text-primary text-xs radius-small px-2 py-1 w-full focus:outline-none focus:border-border-strong',
                    'bg-background border border-border-default text-text-primary text-xs radius-small px-2 py-1 w-full focus:outline-none focus:border-border-strong');

fs.writeFileSync('src/components/Sidebar.tsx', code);
