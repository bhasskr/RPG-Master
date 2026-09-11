const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(/px-1\.5 py-0\.5/g, 'px-2 py-1');
code = code.replace(/mt-1\.5/g, 'mt-2');
code = code.replace(/px-2\.5 py-3/g, 'px-3 py-3');
code = code.replace(/px-2\.5 py-1/g, 'px-3 py-1.5'); 
code = code.replace(/w-1\.5 h-1\.5/g, 'w-2 h-2');
code = code.replace(/w-2\.5 h-2\.5/g, 'w-3 h-3');

fs.writeFileSync('src/components/Sidebar.tsx', code);
