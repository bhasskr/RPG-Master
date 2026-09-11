const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

const themeDef = `
@theme {
  --color-background: #0c0c0e;
  --color-surface: #121214;
  --color-surface-subtle: #18181b;
  --color-surface-elevated: #1f1f22;
  --color-surface-hover: #27272a;
  --color-surface-active: #3f3f46;

  --color-border-subtle: #1f1f22;
  --color-border-default: #27272a;
  --color-border-strong: #3f3f46;

  --color-text-primary: #f4f4f5; /* zinc-100 */
  --color-text-secondary: #a1a1aa; /* zinc-400 */
  --color-text-muted: #71717a; /* zinc-500 */
  --color-text-disabled: #52525b; /* zinc-600 */

  --color-accent: #34d399; /* emerald-400 */
  --color-accent-hover: #10b981; /* emerald-500 */
  --color-accent-active: #059669; /* emerald-600 */
  --color-accent-subtle: rgba(16, 185, 129, 0.1);

  --color-success: #34d399;
  --color-success-subtle: rgba(16, 185, 129, 0.1);
  
  --color-warning: #fbbf24;
  --color-warning-subtle: rgba(245, 158, 11, 0.1);
  
  --color-danger: #f87171;
  --color-danger-hover: #ef4444;
  --color-danger-subtle: rgba(239, 68, 68, 0.1);
  
  --color-info: #60a5fa;
  --color-info-subtle: rgba(59, 130, 246, 0.1);
}
`;

code = code.replace('@import "tailwindcss";', '@import "tailwindcss";' + themeDef);

// Also replace body defaults
code = code.replace('background-color: #09090b;', 'background-color: var(--color-background);');
code = code.replace('color: #e4e4e7;', 'color: var(--color-text-primary);');

// Replace custom scrollbar
code = code.replace('background: #0d0d10;', 'background: var(--color-background);');
code = code.replace('background: #27272a;', 'background: var(--color-surface-hover);');
code = code.replace('background: #3f3f46;', 'background: var(--color-surface-active);');

fs.writeFileSync('src/index.css', code);
