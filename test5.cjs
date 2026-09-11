const fs = require('fs');
let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');
const lines = code.split('\n');
const errLine = 1768;
console.log(lines.slice(errLine - 10, errLine + 10).join('\n'));
