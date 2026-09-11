const fs = require('fs');
let code = fs.readFileSync('src/components/HistoryModal.tsx', 'utf8');

code = code.replace(/p-3\.5 sm:p-4/g, 'p-4 sm:p-5');
code = code.replace(/gap-y-1\.5 gap-x-3/g, 'gap-y-2 gap-x-4');
code = code.replace(/p-1\.5/g, 'p-2');
code = code.replace(/px-3 py-1\.5/g, 'px-4 py-2');
code = code.replace(/space-y-2\.5/g, 'space-y-3');
code = code.replace(/p-3 sm:p-5/g, 'p-4 sm:p-6');
code = code.replace(/gap-1\.5/g, 'gap-2');
code = code.replace(/px-2 py-0\.5/g, 'px-2 py-1');

fs.writeFileSync('src/components/HistoryModal.tsx', code);
