const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldInit = `      // Se não havia ID ou o ID salvo falhou, tenta restaurar a primeira das recentes
      try {
        const storedRecents = localStorage.getItem(STORAGE_RECENT_CAMPAIGNS_KEY);
        const parsedRecents: CampaignSummary[] = storedRecents ? JSON.parse(storedRecents) : [];
        if (parsedRecents.length > 0) {
          const firstId = parsedRecents[0].id;
          const details = await api.getCampaignDetails(firstId);
          if (details && details.gameState) {
            setGameState(details.gameState);
            setMessages(details.messages || []);
            setCampaignId(firstId);
            localStorage.setItem(STORAGE_CAMPAIGN_KEY, firstId);
            return;
          }
        }
      } catch {
        // Ignora e cria/mostra placeholder vazio
      }`;

const newInit = `      // We intentionally do NOT auto-load the most recent campaign here,
      // so the user can see the Home view (empty state) and choose what to do.
      // We just parse recents so the HomeView can display them.
      try {
        const storedRecents = localStorage.getItem(STORAGE_RECENT_CAMPAIGNS_KEY);
        if (storedRecents) {
           // just ensuring it doesn't crash
           JSON.parse(storedRecents);
        }
        setCampaignId(null as any);
      } catch {
        // Ignore
      }`;

content = content.replace(oldInit, newInit);

// Also remove `setCampaignId(null as any)` fallback from setting `session_${Date.now()}` in useState
// wait, the useState for campaignId:
// const [campaignId, setCampaignId] = useState<string>(() => {
//    return localStorage.getItem(STORAGE_CAMPAIGN_KEY) || `session_${Date.now()}`;
// });
// If it's `session_...` but gameState is null, it's fine. 

fs.writeFileSync(path, content);
