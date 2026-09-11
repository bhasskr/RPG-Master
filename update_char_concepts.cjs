const fs = require('fs');

let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');

code = code.replace(
  /className="p-3 rounded-xl bg-background\/70 border border-border-subtle hover:border-border-default transition-all flex flex-col gap-2"/g,
  'className="p-4 rounded-xl bg-surface border border-border-subtle hover:border-border-strong transition-all duration-150 flex flex-col gap-3 group cursor-default"'
);

code = code.replace(
  /onClick=\{\(\) => handleApplyCharacterConcept\(item\)\}\s*className="mt-1 w-full text-center px-3 py-1\.5 rounded-lg bg-surface hover:bg-surface-active text-text-primary text-\[11px\] font-semibold transition-colors border border-border-subtle hover:border-border-default"\s*>\s*Usar esta ideia\s*<\/button>/,
  `onClick={() => handleApplyCharacterConcept(item)}
                                  className="mt-1 w-full text-center px-3 py-2 rounded-lg bg-surface-subtle hover:bg-surface-hover text-text-primary text-xs font-semibold transition-colors border border-border-subtle hover:border-border-strong"
                                >
                                  Usar esta ideia
                                </button>`
);

fs.writeFileSync('src/components/NewCampaignModal.tsx', code);
console.log('Character concepts updated');
