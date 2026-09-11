const fs = require('fs');
let code = fs.readFileSync('src/components/HistoryModal.tsx', 'utf8');

code = code.replace(/placeholder-zinc-500/g, 'placeholder-text-muted');
code = code.replace(/focus:border-zinc-500/g, 'focus:border-border-strong');
code = code.replace(/text-zinc-300/g, 'text-text-secondary');

fs.writeFileSync('src/components/HistoryModal.tsx', code);
