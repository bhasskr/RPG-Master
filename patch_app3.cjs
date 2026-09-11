const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "setCampaignId(null);",
  "setCampaignId(null as any);"
);

fs.writeFileSync('src/App.tsx', code);
