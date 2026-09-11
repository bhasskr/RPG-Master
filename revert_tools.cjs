const fs = require('fs');
const path = './server/engine/narrator/narratorService.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /tools: \[\{ functionDeclarations: MEMORY_FUNCTION_DECLARATIONS\.filter\([^}]+\) \}\],/,
  'tools: [{ functionDeclarations: MEMORY_FUNCTION_DECLARATIONS }],'
);

fs.writeFileSync(path, code);
