const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  'className="text-xs sm:text-sm font-semibold tracking-tight text-text-primary truncate max-w-[140px] sm:max-w-[240px] md:max-w-[320px]"',
  'className="typo-heading text-text-primary truncate max-w-[140px] sm:max-w-[240px] md:max-w-[320px]"'
);

code = code.replace(
  'className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full bg-surface-hover text-text-secondary font-mono border border-border-default shrink-0"',
  'className="hidden sm:inline-flex typo-caption font-mono px-2 py-0.5 rounded-full bg-surface-hover text-text-secondary border border-border-default shrink-0"'
);

code = code.replace(
  'className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-subtle/90 border border-border-default text-text-secondary text-[11px] sm:text-xs"',
  'className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-subtle/90 border border-border-default text-text-secondary typo-secondary"'
);

code = code.replace(
  'className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-subtle/90 border border-border-default text-text-secondary text-[11px] sm:text-xs"',
  'className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-subtle/90 border border-border-default text-text-secondary typo-secondary"'
);

code = code.replace(
  'className="truncate max-w-[130px] font-mono text-[11px]"',
  'className="truncate max-w-[130px] font-mono typo-caption"'
);

code = code.replace(
  'className="truncate max-w-[110px] sm:max-w-[180px] font-medium"',
  'className="truncate max-w-[110px] sm:max-w-[180px]"'
);

fs.writeFileSync('src/components/Header.tsx', code);
