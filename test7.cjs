const fs = require('fs');
let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');
const lines = code.split('\n');
console.log(lines.slice(1750, 1780).join('\n'));
