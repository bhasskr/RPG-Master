const fs = require('fs');

let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');

// Replace standard back buttons
code = code.replace(
  /<button\s*type="button"\s*onClick=\{\(\) => setSelectedMode\('generate_options_choice'\)\}\s*disabled=\{isGeneratingScenarios\}\s*className="flex items-center gap-1\.5 px-3 py-2 text-text-muted hover:text-text-secondary text-xs font-medium transition-colors cursor-pointer"\s*>/g,
  `<Button variant="ghost" size="compact" onClick={() => setSelectedMode('generate_options_choice')} disabled={isGeneratingScenarios}>`
);
code = code.replace(
  /<button\s*type="button"\s*onClick=\{\(\) => \{\s*if \(foundationSourceMode === 'custom_idea'\) \{\s*setSelectedMode\('custom_idea'\);\s*\} else \{\s*setSelectedMode\('generate_scenarios'\);\s*\}\s*\}\}\s*disabled=\{isGeneratingFoundation\}\s*className="flex items-center gap-1\.5 px-3 py-2 text-text-muted hover:text-text-secondary text-xs font-medium transition-colors cursor-pointer"\s*>/g,
  `<Button variant="ghost" size="compact" onClick={() => { if (foundationSourceMode === 'custom_idea') setSelectedMode('custom_idea'); else setSelectedMode('generate_scenarios'); }} disabled={isGeneratingFoundation}>`
);
code = code.replace(
  /<button\s*type="button"\s*onClick=\{\(\) => setSelectedMode\('creation_method'\)\}\s*disabled=\{isGeneratingMasterProposal\}\s*className="flex items-center gap-1\.5 px-3 py-2 text-text-muted hover:text-text-secondary text-xs font-medium transition-colors cursor-pointer"\s*>/g,
  `<Button variant="ghost" size="compact" onClick={() => setSelectedMode('creation_method')} disabled={isGeneratingMasterProposal}>`
);

// Close button in </button>
code = code.replace(
  /Voltar\s*<\/button>/g,
  `Voltar\n                  </Button>`
);

// Refazer/Confirmar buttons
code = code.replace(
  /<button\s*type="button"\s*onClick=\{\(\) => handleGenerateScenariosWithOptions\(generateOptionType \|\| 'surprise'\)\}\s*disabled=\{isGeneratingScenarios\}\s*className="flex items-center gap-1\.5 px-4 py-2 bg-surface-elevated hover:bg-surface-hover border border-border-default rounded-xl text-text-primary text-xs font-semibold transition-colors cursor-pointer"\s*>/g,
  `<Button variant="secondary" onClick={() => handleGenerateScenariosWithOptions(generateOptionType || 'surprise')} disabled={isGeneratingScenarios}>`
);

code = code.replace(
  /<button\s*type="button"\s*onClick=\{\(\) => generateFoundationForScenario\(selectedScenario!\)\}\s*disabled=\{isGeneratingFoundation\}\s*className="flex items-center gap-1\.5 px-4 py-2 bg-surface-elevated hover:bg-surface-hover border border-border-default rounded-xl text-text-primary text-xs font-semibold transition-colors cursor-pointer"\s*>/g,
  `<Button variant="secondary" onClick={() => generateFoundationForScenario(selectedScenario!)} disabled={isGeneratingFoundation}>`
);
code = code.replace(
  /Gerar novamente\s*<\/button>/g,
  `Gerar novamente\n                      </Button>`
);

code = code.replace(
  /<button\s*type="button"\s*onClick=\{handleConfirmFoundation\}\s*disabled=\{isGeneratingFoundation\}\s*className="flex items-center gap-1\.5 px-4 py-2 bg-text-primary hover:bg-white text-background rounded-xl text-xs font-semibold transition-colors cursor-pointer"\s*>/g,
  `<Button variant="primary" onClick={handleConfirmFoundation} disabled={isGeneratingFoundation}>`
);
code = code.replace(
  /Confirmar Mundo\s*<\/button>/g,
  `Confirmar Mundo\n                      </Button>`
);

// Master Picks all card
code = code.replace(
  /<button\s*id="btn-master-picks-all"\s*type="button"\s*onClick=\{\(\) => setSelectedMode\('master_proposal'\)\}\s*className="p-4 rounded-xl border text-left transition-all duration-150 group cursor-pointer flex items-start gap-3\.5 bg-surface hover:bg-surface-hover border-border-subtle hover:border-border-strong"\s*>/g,
  `<button
                    id="btn-master-picks-all"
                    type="button"
                    onClick={() => setSelectedMode('master_proposal')}
                    className="p-4 rounded-xl border text-left transition-all duration-150 group cursor-pointer flex items-start gap-3.5 bg-surface hover:bg-surface-hover border-border-subtle hover:border-border-strong"
                  >`
); // Already ok

// Master generate with premise
code = code.replace(
  /<button\s*id="btn-generate-with-premise"\s*type="button"\s*onClick=\{handleGenerateScenariosWithPremise\}\s*disabled=\{!premiseInput\.trim\(\) \|\| isGeneratingScenarios\}\s*className="px-4 py-2 bg-surface-elevated hover:bg-surface-hover border border-border-default rounded-xl text-text-primary text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"\s*>\s*Gerar com esta ideia\s*<\/button>/g,
  `<Button id="btn-generate-with-premise" onClick={handleGenerateScenariosWithPremise} disabled={!premiseInput.trim() || isGeneratingScenarios}>
                          Gerar com esta ideia
                        </Button>`
);

fs.writeFileSync('src/components/NewCampaignModal.tsx', code);
console.log('Buttons updated');
