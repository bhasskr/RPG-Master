const fs = require('fs');
let code = fs.readFileSync('src/components/HistoryModal.tsx', 'utf8');

code = code.replace(
  'text-xs sm:text-sm font-bold text-text-primary uppercase tracking-wider truncate',
  'typo-section-heading text-text-primary truncate'
);
code = code.replace(
  'text-[11px] text-text-muted font-medium',
  'typo-caption text-text-muted'
);
code = code.replace(
  'text-[11px] font-medium',
  'typo-caption'
);
code = code.replace(
  /text-\[11px\] text-text-secondary/g,
  'typo-caption text-text-secondary'
);
code = code.replace(
  'font-bold text-xs sm:text-sm text-text-primary group-hover:text-white truncate',
  'typo-heading text-text-primary group-hover:text-white truncate'
);
code = code.replace(
  'text-[10px] font-semibold bg-accent-subtle',
  'typo-caption font-semibold bg-accent-subtle'
);
code = code.replace(
  'text-[10px] text-text-secondary',
  'typo-caption text-text-secondary'
);
code = code.replace(
  /text-\[10px\] text-text-muted/g,
  'typo-caption text-text-muted'
);
code = code.replace(
  'text-[10px] text-text-disabled',
  'typo-caption text-text-disabled'
);
code = code.replace(
  /text-xs font-semibold/g,
  'typo-secondary font-semibold'
);
code = code.replace(
  /text-xs font-medium/g,
  'typo-secondary'
);
code = code.replace(
  'text-xs text-text-secondary',
  'typo-secondary text-text-secondary'
);

fs.writeFileSync('src/components/HistoryModal.tsx', code);
