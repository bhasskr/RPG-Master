const fs = require('fs');
let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');
const lines = code.split('\n');
const start = lines.findIndex(l => l.includes("Revisão Final da Campanha"));
console.log(lines.slice(start - 10, start + 30).join('\n'));
