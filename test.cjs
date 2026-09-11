const fs = require('fs');
let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');
console.log(code.substring(code.indexOf('Revisão Final da Campanha') - 100, code.indexOf('Revisão Final da Campanha') + 1000));
