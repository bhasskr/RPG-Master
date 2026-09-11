const fs = require('fs');

let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');

code = code.replace(
  /<div>\s*<label className="block text-\[11px\] font-semibold text-text-muted mb-1">\s*\{t\.manualPremiseLabel\}\s*<\/label>\s*<textarea\s*value=\{premise\}\s*onChange=\{\(e\) => \{\s*setPremise\(e\.target\.value\);\s*if \(manualValidationError\) setManualValidationError\(null\);\s*\}\}\s*placeholder=\{t\.manualPremisePlaceholder\}\s*className="w-full h-16 p-3 bg-surface-subtle\/80 border border-border-strong focus:border-accent rounded-xl text-xs text-text-primary placeholder-text-disabled outline-none resize-none"\s*\/>\s*<\/div>/,
  `<Textarea
                  label={t.manualPremiseLabel}
                  value={premise}
                  onChange={(e) => {
                    setPremise(e.target.value);
                    if (manualValidationError) setManualValidationError(null);
                  }}
                  placeholder={t.manualPremisePlaceholder}
                  className="h-20 resize-none"
                />`
);

code = code.replace(
  /<div>\s*<label className="block text-\[11px\] font-semibold text-text-muted mb-1">\s*\{t\.manualRulesLabel\}\s*<\/label>\s*<textarea\s*value=\{rulesOfUniverse\}\s*onChange=\{\(e\) => setRulesOfUniverse\(e\.target\.value\)\}\s*placeholder=\{t\.manualRulesPlaceholder\}\s*className="w-full h-16 p-3 bg-surface-subtle\/80 border border-border-strong focus:border-accent rounded-xl text-xs text-text-primary placeholder-text-disabled outline-none resize-none"\s*\/>\s*<\/div>/,
  `<Textarea
                  label={<span>{t.manualRulesLabel} <span className="font-normal text-text-muted">(opcional)</span></span>}
                  value={rulesOfUniverse}
                  onChange={(e) => setRulesOfUniverse(e.target.value)}
                  placeholder={t.manualRulesPlaceholder}
                  className="h-20 resize-none"
                />`
);

fs.writeFileSync('src/components/NewCampaignModal.tsx', code);
console.log('Manual form part 2 updated');
