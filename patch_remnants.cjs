const fs = require('fs');
let codeS = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
codeS = codeS.replace(
  'text-[10px] text-text-secondary hover:text-text-primary cursor-pointer font-medium hover:underline',
  'typo-caption text-text-secondary hover:text-text-primary cursor-pointer hover:underline'
);
codeS = codeS.replace(
  'font-mono text-text-secondary text-[10px]',
  'font-mono text-text-secondary typo-caption'
);
codeS = codeS.replace(
  'text-[10px] text-text-muted',
  'typo-caption text-text-muted'
);
fs.writeFileSync('src/components/Sidebar.tsx', codeS);

let codeH = fs.readFileSync('src/components/HistoryModal.tsx', 'utf8');
codeH = codeH.replace(
  'text-[11px] text-text-muted',
  'typo-caption text-text-muted'
);
fs.writeFileSync('src/components/HistoryModal.tsx', codeH);
