const fs = require('fs');
let codeS = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
codeS = codeS.replace(/border-border-strong\/80 radius-medium/g, 'border-border-default radius-medium');
codeS = codeS.replace(/shadow-xs/g, 'shadow-none');
codeS = codeS.replace(/shadow-sm/g, 'shadow-none');
fs.writeFileSync('src/components/Sidebar.tsx', codeS);

let codeC = fs.readFileSync('src/components/ChatView.tsx', 'utf8');
codeC = codeC.replace(/rounded-xl/g, 'radius-large');
codeC = codeC.replace(/rounded-lg/g, 'radius-medium');
codeC = codeC.replace(/rounded-md/g, 'radius-medium');
codeC = codeC.replace(/rounded-2xl rounded-tr-xs/g, 'radius-large radius-tr-small');
codeC = codeC.replace(/rounded-full/g, 'radius-full');
codeC = codeC.replace(/shadow-xs/g, 'shadow-none');
codeC = codeC.replace(/border-border-strong\/60/g, 'border-border-subtle');
codeC = codeC.replace(/border-border-default\/80 hover:border-border-strong\/80/g, 'border-border-subtle hover:border-border-default');
codeC = codeC.replace(/border-border-strong radius-large/g, 'border-border-subtle radius-large');
fs.writeFileSync('src/components/ChatView.tsx', codeC);

let codeH = fs.readFileSync('src/components/HistoryModal.tsx', 'utf8');
codeH = codeH.replace(/shadow-lg shadow-red-900\/10/g, 'elevation-low');
codeH = codeH.replace(/shadow-sm/g, 'shadow-none');
fs.writeFileSync('src/components/HistoryModal.tsx', codeH);

