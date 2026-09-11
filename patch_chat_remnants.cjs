const fs = require('fs');
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf8');

code = code.replace(/p-2\.5/g, 'p-3');

fs.writeFileSync('src/components/ChatView.tsx', code);
