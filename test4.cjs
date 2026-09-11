const fs = require('fs');
let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');
const lines = code.split('\n');
const start = lines.findIndex(l => l.includes("selectedMode === 'campaign_review'"));
console.log(lines.slice(start, start + 100).join('\n'));
