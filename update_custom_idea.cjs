const fs = require('fs');

let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');

code = code.replace(
  /<textarea\s*value=\{customIdeaText\}\s*onChange=\{\(e\) => setCustomIdeaText\(e\.target\.value\)\}\s*placeholder=\{t\.customIdeaPlaceholder\}\s*className="w-full h-32 p-3 bg-surface-subtle\/80 border border-border-strong focus:border-accent rounded-xl text-xs text-text-primary placeholder-text-disabled outline-none resize-none"\s*\/>/,
  `<Textarea
                  value={customIdeaText}
                  onChange={(e) => setCustomIdeaText(e.target.value)}
                  placeholder={t.customIdeaPlaceholder}
                  className="h-32 resize-none"
                />`
);

fs.writeFileSync('src/components/NewCampaignModal.tsx', code);
console.log('Custom idea updated');
