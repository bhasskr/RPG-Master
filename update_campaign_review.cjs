const fs = require('fs');

let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');

const regex = /<div className="p-4 rounded-xl bg-surface-subtle border border-border-subtle space-y-4 max-h-\[50vh\] overflow-y-auto">([\s\S]*?)<\/div>\s*<\/div>\s*<div className="flex justify-between pt-2">/g;

code = code.replace(regex, (match, innerContent) => {
  return `<div className="space-y-5 max-h-[50vh] overflow-y-auto pr-2">
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Aventura & Mundo</h4>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[13px]">
                      <div><span className="text-text-muted">Título:</span> <span className="text-text-primary font-medium">{title || selectedScenario?.title || 'Personalizado'}</span></div>
                      <div><span className="text-text-muted">Gênero:</span> <span className="text-text-primary font-medium">{genre || selectedScenario?.genre || 'N/A'}</span></div>
                      <div><span className="text-text-muted">Formato:</span> <span className="text-text-primary font-medium">{t.formatBadge}</span></div>
                      <div><span className="text-text-muted">Ambientação:</span> <span className="text-text-primary font-medium">{t.basisBadge}</span></div>
                      <div className="col-span-2"><span className="text-text-muted">Local Inicial:</span> <span className="text-text-primary font-medium">{startingLocation || selectedScenario?.startingLocation || foundation?.startingLocation || 'A definir'}</span></div>
                    </div>
                  </div>
                  
                  <Divider />

                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Identidade do Personagem</h4>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[13px]">
                      <div className="col-span-2"><span className="text-text-muted">Nome:</span> <span className="text-text-primary font-medium">{playerName}</span></div>
                      <div><span className="text-text-muted">Idade:</span> <span className="text-text-primary font-medium">{charAge || '-'}</span></div>
                      <div><span className="text-text-muted">Pronomes:</span> <span className="text-text-primary font-medium">{charPronouns || '-'}</span></div>
                      <div className="col-span-2"><span className="text-text-muted">Conceito:</span> <span className="text-text-primary font-medium">{charConcept || '-'}</span></div>
                    </div>
                  </div>

                  <Divider />
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Sistema & Mestre</h4>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[13px]">
                      <div className="col-span-2">
                        <span className="text-text-muted">Perfil Mecânico:</span>{' '}
                        <span className="text-text-primary font-medium">
                          {mechanicalProfile === 'FOCUSED_REALISM' || mechanicalProfile === 'realistic' || (!mechanicalProfile && campaignFormat === 'focused') ? 'Focado / Realismo' : mechanicalProfile === 'custom' ? 'Personalizado' : 'Sandbox / D20'}
                        </span>
                      </div>
                      <div><span className="text-text-muted">Foco:</span> <span className="text-text-primary font-medium capitalize">{masterFocus || 'balanced'}</span></div>
                      <div><span className="text-text-muted">Tom:</span> <span className="text-text-primary font-medium capitalize">{masterTone || 'neutral'}</span></div>
                      <div><span className="text-text-muted">Ritmo:</span> <span className="text-text-primary font-medium capitalize">{masterPacing || 'balanced'}</span></div>
                      <div><span className="text-text-muted">Descrição:</span> <span className="text-text-primary font-medium capitalize">{masterDescriptionLevel || 'medium'}</span></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between pt-2">`;
});

// Update submit button
code = code.replace(
  /<Button\s*onClick=\{handleConfirmCreation\}\s*disabled=\{isSubmitting\}\s*>\s*\{isSubmitting \? \(\s*<>\s*<Loader2 className="w-3\.5 h-3\.5 animate-spin" \/>\s*Criando\.\.\.\s*<\/>\s*\) : \(\s*'Criar Campanha'\s*\)\}\s*<\/Button>/g,
  `<Button onClick={handleConfirmCreation} disabled={isSubmitting} className="min-w-[140px]">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Começar aventura'
                    )}
                  </Button>`
);

fs.writeFileSync('src/components/NewCampaignModal.tsx', code);
console.log('Campaign review updated');
