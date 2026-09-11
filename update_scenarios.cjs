const fs = require('fs');

let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');

// Replace the scenario rendering
code = code.replace(
  /\{scenarios\.map\(\(scenario\) => \(\s*<div key=\{scenario\.id\} className="p-4 rounded-xl bg-surface-subtle border border-border-subtle flex flex-col gap-3">[\s\S]*?<div className="flex gap-2 mt-2">\s*<Button className="flex-1" size="compact" onClick=\{([^}]+)\}>Escolher este cenário<\/Button>/,
  `{scenarios.map((scenario) => (
                      <div key={scenario.id} className="p-4 rounded-xl bg-surface border border-border-subtle hover:border-border-strong transition-colors flex flex-col gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-text-primary mb-1">{scenario.title}</h3>
                          <p className="text-[12px] text-text-secondary leading-relaxed">{scenario.description}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-auto pt-2">
                          <Button className="flex-1" size="compact" onClick={$1}>Escolher</Button>`
);

fs.writeFileSync('src/components/NewCampaignModal.tsx', code);
console.log('Scenarios updated');
