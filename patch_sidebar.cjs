const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(
  'text-xs font-bold tracking-tight text-text-primary uppercase',
  'typo-section-heading text-text-primary'
);
code = code.replace(
  'text-[10px] text-text-muted font-mono',
  'typo-caption text-text-muted font-mono'
);
code = code.replace(
  'text-xs font-semibold text-text-primary',
  'typo-secondary font-semibold text-text-primary'
);
code = code.replace(
  'text-[10px] px-1.5 py-0.5 rounded bg-surface-subtle/60 text-text-secondary font-mono border border-border-default',
  'typo-caption px-1.5 py-0.5 rounded bg-surface-subtle/60 text-text-secondary font-mono border border-border-default'
);
code = code.replace(
  /text-\[11px\] font-semibold text-text-muted uppercase tracking-wider/g,
  'typo-section-heading text-text-muted'
);
code = code.replace(
  'text-[10px] text-text-disabled font-mono',
  'typo-caption text-text-disabled font-mono'
);
code = code.replace(
  'text-[11px] text-text-muted italic',
  'typo-caption text-text-muted italic'
);
code = code.replace(
  'text-[10px] text-text-secondary font-medium',
  'typo-caption text-text-secondary'
);
code = code.replace(
  'text-[10px] text-white',
  'typo-caption text-white'
);
code = code.replace(
  'text-[10px] text-text-secondary hover:text-text-primary',
  'typo-caption text-text-secondary hover:text-text-primary'
);
code = code.replace(
  'font-medium text-xs truncate',
  'typo-secondary truncate'
);
code = code.replace(
  'text-[10px] text-text-muted',
  'typo-caption text-text-muted'
);
code = code.replace(
  'text-[9px] text-text-disabled font-mono',
  'typo-caption text-text-disabled font-mono'
);
code = code.replace(
  'text-[11px] text-text-secondary leading-relaxed',
  'typo-caption text-text-secondary leading-relaxed'
);
code = code.replace(
  /text-xs font-medium/g,
  'typo-secondary'
);

fs.writeFileSync('src/components/Sidebar.tsx', code);
