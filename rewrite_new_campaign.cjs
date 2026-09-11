const fs = require('fs');
let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');

// 1. Add imports
if (!code.includes("import { Button, IconButton, Badge, Input, Tabs, Divider, EmptyState } from './ui';")) {
  code = code.replace(
    "import { BookMarked } from 'lucide-react';",
    "import { BookMarked } from 'lucide-react';\nimport { Button, IconButton, Badge, Input, Tabs, Divider, EmptyState } from './ui';"
  );
}

// 2. Global Zinc replacements for basic typography and borders (to be safe, we do it step by step)
const replacements = [
  // Modal container
  ['bg-[#0c0c0e] border border-zinc-800 rounded-2xl shadow-2xl', 'bg-surface border border-border-default radius-large shadow-2xl'],
  ['bg-[#09090b]', 'bg-surface-subtle'],
  
  // Text colors
  ['text-zinc-100', 'text-text-primary'],
  ['text-zinc-200', 'text-text-secondary'],
  ['text-zinc-300', 'text-text-secondary'],
  ['text-zinc-400', 'text-text-muted'],
  ['text-zinc-500', 'text-text-muted'],
  ['text-zinc-600', 'text-text-disabled'],
  ['text-white', 'text-text-primary'],
  
  // Background colors
  ['bg-zinc-800/90', 'bg-surface-elevated'],
  ['bg-zinc-800/80', 'bg-surface-elevated/80'],
  ['bg-zinc-800/50', 'bg-surface-elevated/50'],
  ['bg-zinc-800', 'bg-surface-elevated'],
  ['bg-zinc-850', 'bg-surface-active'],
  ['bg-zinc-900/70', 'bg-surface-subtle'],
  ['bg-zinc-900/50', 'bg-surface-subtle/50'],
  ['bg-zinc-900', 'bg-surface-subtle'],
  ['bg-zinc-950/50', 'bg-surface-subtle/30'],
  ['bg-zinc-950', 'bg-background'],
  
  // Border colors
  ['border-zinc-500', 'border-accent'],
  ['border-zinc-600', 'border-border-strong'],
  ['border-zinc-700/80', 'border-border-default'],
  ['border-zinc-700', 'border-border-default'],
  ['border-zinc-800/80', 'border-border-subtle'],
  ['border-zinc-800', 'border-border-subtle'],
  
  // Hover states
  ['hover:bg-zinc-800', 'hover:bg-surface-hover'],
  ['hover:bg-zinc-850', 'hover:bg-surface-active'],
  ['hover:bg-zinc-900', 'hover:bg-surface-subtle'],
  ['hover:border-zinc-600', 'hover:border-border-strong'],
  ['hover:border-zinc-700', 'hover:border-border-default'],
  ['hover:text-zinc-100', 'hover:text-text-primary'],
  ['hover:text-zinc-300', 'hover:text-text-secondary'],
  ['hover:text-white', 'hover:text-text-primary'],
  
  // Emerald / Success
  ['bg-emerald-500/10', 'bg-success-subtle'],
  ['bg-emerald-500/20', 'bg-success-subtle'],
  ['text-emerald-400', 'text-success'],
  ['border-emerald-500/20', 'border-success/20'],
  ['border-emerald-500/30', 'border-success/30'],
  ['border-emerald-500', 'border-success'],
  ['hover:bg-emerald-500/20', 'hover:bg-success/20'],
  ['hover:text-emerald-300', 'hover:text-success'],
  ['ring-emerald-500/50', 'ring-success/50'],
  
  // Focus rings
  ['focus:ring-zinc-700', 'focus-visible:ring-border-strong'],
  ['focus:border-zinc-700', 'focus:border-border-strong'],
  
  // Input specific
  ['bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-zinc-700', 'bg-surface-subtle border-border-subtle text-text-primary placeholder-text-disabled focus:border-border-strong'],
];

replacements.forEach(([from, to]) => {
  code = code.split(from).join(to);
});

fs.writeFileSync('src/components/NewCampaignModal.tsx', code);
console.log('Done replacing tokens');
