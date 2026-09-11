const fs = require('fs');
let codeS = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
codeS = codeS.replace(/border-border-strong\/80/g, 'border-border-default');
codeS = codeS.replace(/border border-border-strong/g, 'border border-border-subtle');
fs.writeFileSync('src/components/Sidebar.tsx', codeS);
