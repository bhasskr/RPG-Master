const fs = require('fs');
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf8');

code = code.replace(
  'text-lg sm:text-xl font-semibold tracking-tight text-text-primary',
  'typo-display text-text-primary'
);
code = code.replace(
  'text-sm text-text-secondary mt-2 leading-relaxed max-w-md',
  'typo-body text-text-secondary mt-2 max-w-md'
);
code = code.replace(
  'text-xs text-text-secondary transition-all cursor-pointer leading-snug',
  'typo-secondary text-text-secondary transition-all cursor-pointer'
);
code = code.replace(
  'text-[11px] text-text-muted font-mono',
  'typo-caption text-text-muted font-mono'
);
code = code.replace(
  /text-xs font-medium/g,
  'typo-secondary'
);
code = code.replace(
  /\$\{userTextSizeClass\} leading-relaxed/g,
  '${userTextSizeClass} typo-narrative'
);
code = code.replace(
  /\$\{textSizeClass\} leading-relaxed space-y-3 prose-p:leading-relaxed/g,
  '${textSizeClass} typo-narrative space-y-3 prose-p:typo-narrative'
);
code = code.replace(
  /text-\[11px\] font-semibold text-text-secondary/g,
  'typo-caption font-semibold text-text-secondary'
);
code = code.replace(
  'text-text-disabled font-mono font-normal',
  'typo-caption text-text-disabled font-mono font-normal'
);
code = code.replace(
  'text-[10px] font-mono text-text-muted',
  'typo-caption font-mono text-text-muted'
);
code = code.replace(
  'text-xs sm:text-sm italic',
  'typo-body italic'
);

fs.writeFileSync('src/components/ChatView.tsx', code);
