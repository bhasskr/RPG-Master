const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "        recentCampaigns={recentCampaigns}\n        onRenameCampaign={handleRenameCampaign}\n      />",
  "        recentCampaigns={recentCampaigns}\n        onRenameCampaign={handleRenameCampaign}\n        onDeleteCampaign={handleDeleteCampaign}\n      />"
);

fs.writeFileSync('src/App.tsx', code);
