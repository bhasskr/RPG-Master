const fs = require('fs');
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf8');
code = code.replace(/bg-zinc-100/g, 'bg-text-primary');
fs.writeFileSync('src/components/ChatView.tsx', code);
