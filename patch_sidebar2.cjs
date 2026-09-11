const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(/hover:bg-zinc-700/g, 'hover:bg-surface-hover');
code = code.replace(/bg-zinc-700/g, 'bg-surface-hover');
code = code.replace(/focus:border-zinc-500/g, 'focus:border-border-strong');

fs.writeFileSync('src/components/Sidebar.tsx', code);
