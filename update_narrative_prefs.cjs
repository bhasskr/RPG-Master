const fs = require('fs');

let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');

// Size
code = code.replace(
  /<div>\s*<label className="block text-\[11px\] font-semibold text-text-muted mb-1">Tamanho da Resposta<\/label>\s*<select\s*value=\{masterResponseLength \|\| 'medium'\}\s*onChange=\{\(e\) => setMasterResponseLength\(e\.target\.value as any\)\}\s*className="w-full h-9 px-2\.5 bg-surface-subtle\/80 border border-border-strong focus:border-accent rounded-xl text-xs text-text-primary outline-none cursor-pointer"\s*>\s*<option value="short">Curta \(Direta ao ponto\)<\/option>\s*<option value="medium">Média \(Equilibrada\)<\/option>\s*<option value="long">Longa \(Muito detalhada\)<\/option>\s*<\/select>\s*<\/div>/,
  `<div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1.5">Tamanho da Resposta</label>
                    <Tabs
                      fullWidth
                      activeTab={masterResponseLength || 'medium'}
                      onChange={(id) => setMasterResponseLength(id as any)}
                      tabs={[
                        { id: 'short', label: 'Curta' },
                        { id: 'medium', label: 'Média' },
                        { id: 'long', label: 'Longa' }
                      ]}
                    />
                  </div>`
);

// Pacing
code = code.replace(
  /<div>\s*<label className="block text-\[11px\] font-semibold text-text-muted mb-1">Ritmo<\/label>\s*<select\s*value=\{masterPacing \|\| 'balanced'\}\s*onChange=\{\(e\) => setMasterPacing\(e\.target\.value as any\)\}\s*className="w-full h-9 px-2\.5 bg-surface-subtle\/80 border border-border-strong focus:border-accent rounded-xl text-xs text-text-primary outline-none cursor-pointer"\s*>\s*<option value="slow">Lento \(Tempo para refletir\)<\/option>\s*<option value="balanced">Equilibrado \(Ritmo padrão\)<\/option>\s*<option value="fast">Rápido \(Ação contínua\)<\/option>\s*<\/select>\s*<\/div>/,
  `<div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1.5">Ritmo</label>
                    <Tabs
                      fullWidth
                      activeTab={masterPacing || 'balanced'}
                      onChange={(id) => setMasterPacing(id as any)}
                      tabs={[
                        { id: 'slow', label: 'Lento' },
                        { id: 'balanced', label: 'Equilibrado' },
                        { id: 'fast', label: 'Rápido' }
                      ]}
                    />
                  </div>`
);

// Description Level
code = code.replace(
  /<div>\s*<label className="block text-\[11px\] font-semibold text-text-muted mb-1">Nível de Descrição<\/label>\s*<select\s*value=\{masterDescriptionLevel \|\| 'medium'\}\s*onChange=\{\(e\) => setMasterDescriptionLevel\(e\.target\.value as any\)\}\s*className="w-full h-9 px-2\.5 bg-surface-subtle\/80 border border-border-strong focus:border-accent rounded-xl text-xs text-text-primary outline-none cursor-pointer"\s*>\s*<option value="low">Baixo \(Foco em ação\/diálogo\)<\/option>\s*<option value="medium">Médio \(Equilibrado\)<\/option>\s*<option value="high">Alto \(Mundo vívido\)<\/option>\s*<\/select>\s*<\/div>/,
  `<div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1.5">Nível de Descrição</label>
                    <Tabs
                      fullWidth
                      activeTab={masterDescriptionLevel || 'medium'}
                      onChange={(id) => setMasterDescriptionLevel(id as any)}
                      tabs={[
                        { id: 'low', label: 'Baixo' },
                        { id: 'medium', label: 'Médio' },
                        { id: 'high', label: 'Alto' }
                      ]}
                    />
                  </div>`
);

// Focus
code = code.replace(
  /<div>\s*<label className="block text-\[11px\] font-semibold text-text-muted mb-1">Foco Principal<\/label>\s*<select\s*value=\{masterFocus \|\| 'balanced'\}\s*onChange=\{\(e\) => setMasterFocus\(e\.target\.value as any\)\}\s*className="w-full h-9 px-2\.5 bg-surface-subtle\/80 border border-border-strong focus:border-accent rounded-xl text-xs text-text-primary outline-none cursor-pointer"\s*>\s*<option value="exploration">Exploração<\/option>\s*<option value="combat">Combate & Ação<\/option>\s*<option value="relationships">Relações & Intriga<\/option>\s*<option value="balanced">Equilibrado<\/option>\s*<\/select>\s*<\/div>/,
  `<div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1.5">Foco Principal</label>
                    <Tabs
                      fullWidth
                      activeTab={masterFocus || 'balanced'}
                      onChange={(id) => setMasterFocus(id as any)}
                      tabs={[
                        { id: 'exploration', label: 'Exploração' },
                        { id: 'combat', label: 'Combate' },
                        { id: 'relationships', label: 'Relações' },
                        { id: 'balanced', label: 'Equilíbrio' }
                      ]}
                    />
                  </div>`
);

// Tone
code = code.replace(
  /<div>\s*<label className="block text-\[11px\] font-semibold text-text-muted mb-1">Tom<\/label>\s*<select\s*value=\{masterTone \|\| 'neutral'\}\s*onChange=\{\(e\) => setMasterTone\(e\.target\.value as any\)\}\s*className="w-full h-9 px-2\.5 bg-surface-subtle\/80 border border-border-strong focus:border-accent rounded-xl text-xs text-text-primary outline-none cursor-pointer"\s*>\s*<option value="neutral">Neutro \(Imparcial\)<\/option>\s*<option value="realistic">Realista \(Consequências duras\)<\/option>\s*<option value="adventurous">Aventureiro \(Épico e otimista\)<\/option>\s*<option value="dark">Sombrio \(Tenso e perigoso\)<\/option>\s*<option value="comedic">Cômico \(Leve e divertido\)<\/option>\s*<\/select>\s*<\/div>/,
  `<div>
                    <label className="block text-[11px] font-semibold text-text-muted mb-1.5">Tom</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'neutral', label: 'Neutro' },
                        { id: 'realistic', label: 'Realista' },
                        { id: 'adventurous', label: 'Aventureiro' },
                        { id: 'dark', label: 'Sombrio' },
                        { id: 'comedic', label: 'Cômico' }
                      ].map(option => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setMasterTone(option.id as any)}
                          className={\`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border \${masterTone === option.id ? 'bg-surface-elevated text-text-primary border-border-strong shadow-sm' : 'bg-surface-subtle text-text-secondary border-border-subtle hover:bg-surface-hover hover:text-text-primary hover:border-border-default'}\`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>`
);

fs.writeFileSync('src/components/NewCampaignModal.tsx', code);
console.log('Narrative Preferences updated');
