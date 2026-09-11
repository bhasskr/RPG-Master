const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldCode = `      if (id === campaignId) {
        // Fallback para outra campanha ou limpar tela
        if (updatedRecent.length > 0) {
          handleSelectCampaign(updatedRecent[0].id);
        } else {
          setCampaignId(null as any);
          setGameState(null);
          setMessages([]);
          localStorage.removeItem(STORAGE_CAMPAIGN_KEY);
        }
      }`;

const newCode = `      if (id === campaignId) {
        setCampaignId(null as any);
        setGameState(null);
        setMessages([]);
        localStorage.removeItem(STORAGE_CAMPAIGN_KEY);
      }`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(path, content);
