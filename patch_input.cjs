const fs = require('fs');
let code = fs.readFileSync('src/components/MessageInput.tsx', 'utf8');

code = code.replace(
  'text-sm text-text-primary placeholder-text-muted focus:ring-0 focus:outline-none resize-none px-2 py-1.5 leading-relaxed',
  'typo-body text-text-primary placeholder-text-muted focus:ring-0 focus:outline-none resize-none px-2 py-1.5'
);
code = code.replace(
  'text-[10px] text-text-muted font-mono',
  'typo-caption text-text-muted font-mono'
);

fs.writeFileSync('src/components/MessageInput.tsx', code);
