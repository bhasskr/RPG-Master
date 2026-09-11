const fs = require('fs');
let code = fs.readFileSync('src/components/HistoryModal.tsx', 'utf8');

code = code.replace(/gap-2\.5/g, 'gap-3');
code = code.replace(/right-2\.5/g, 'right-3');
code = code.replace(/px-1\.5 py-0\.2/g, 'px-2 py-0.5');

fs.writeFileSync('src/components/HistoryModal.tsx', code);
