const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(/className="w-3 h-3 /g, 'className="w-4 h-4 ');
code = code.replace(/className="w-3\.5 h-3\.5 /g, 'className="w-4 h-4 ');

fs.writeFileSync('src/components/Sidebar.tsx', code);
