const fs = require('fs');

const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// add HomeView import
content = content.replace(
  "import { ChatView } from './components/ChatView';",
  "import { ChatView } from './components/ChatView';\nimport { HomeView } from './components/HomeView';"
);

// replace the Central Chat View Area and Bottom Message Input
const oldRender = `{/* Central Chat View Area */}
        <ChatView
          messages={messages}
          player={gameState?.player}
          isLoading={isLoading}
          onQuickPrompt={handleSendMessage}
          onRetry={handleRetryLastAction}
          onEditLastAction={handleEditLastAction}
          preferences={uiPreferences}
        />
        {/* Fixed Bottom Message Input */}
        <MessageInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />`;

const newRender = `{/* Content Area: Chat or Home */}
        {gameState ? (
          <>
            <ChatView
              messages={messages}
              player={gameState?.player}
              isLoading={isLoading}
              onQuickPrompt={handleSendMessage}
              onRetry={handleRetryLastAction}
              onEditLastAction={handleEditLastAction}
              preferences={uiPreferences}
            />
            <MessageInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </>
        ) : (
          <HomeView
            onNewCampaign={() => {
              sessionStorage.removeItem('rpg_new_campaign_draft');
              setNewCampaignKey(Date.now());
              setIsNewCampaignModalOpen(true);
            }}
            onSurpriseMe={() => {
              sessionStorage.setItem('rpg_new_campaign_draft', JSON.stringify({
                campaignFormat: 'sandbox',
                worldBasis: 'fictional',
                foundationSourceMode: 'generate_scenarios',
                selectedMode: 'generate_options_choice'
              }));
              setNewCampaignKey(Date.now());
              setIsNewCampaignModalOpen(true);
            }}
            onIdea={() => {
              sessionStorage.setItem('rpg_new_campaign_draft', JSON.stringify({
                campaignFormat: 'sandbox',
                worldBasis: 'fictional',
                foundationSourceMode: 'custom_idea',
                selectedMode: 'custom_idea'
              }));
              setNewCampaignKey(Date.now());
              setIsNewCampaignModalOpen(true);
            }}
            onOpenLibrary={() => setIsLibraryModalOpen(true)}
            recentCampaigns={recentCampaigns}
            onSelectCampaign={handleSelectCampaign}
          />
        )}`;

content = content.replace(oldRender, newRender);

fs.writeFileSync(path, content);
