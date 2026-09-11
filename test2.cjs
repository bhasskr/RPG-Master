const fs = require('fs');
let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');
const start = code.indexOf("selectedMode === 'campaign_review'");
console.log(code.substring(start - 100, start + 3000));
