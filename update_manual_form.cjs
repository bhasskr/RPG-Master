const fs = require('fs');

let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');

// Replace the manualValidationError div
code = code.replace(
  /<div className="p-3 rounded-xl bg-red-900\/20 border border-red-900\/50 flex items-start gap-2 text-xs">\s*<ShieldAlert className="w-4 h-4 text-red-400 shrink-0" \/>\s*<span className="font-semibold text-red-300">\{manualValidationError\}<\/span>\s*<\/div>/,
  `<div className="flex items-center gap-2 text-danger text-xs font-medium">
                    <ShieldAlert className="w-4 h-4" />
                    <span>{manualValidationError}</span>
                  </div>`
);

// Title Input
code = code.replace(
  /<div>\s*<label className="block text-\[11px\] font-semibold text-text-muted mb-1">\s*Título da Campanha \(Opcional\)\s*<\/label>\s*<input\s*id="new-campaign-title-input"\s*type="text"\s*value=\{title\}\s*onChange=\{\(e\) => setTitle\(e\.target\.value\)\}\s*placeholder=\{t\.manualTitlePlaceholder\}\s*className="w-full h-9 px-3 bg-surface-subtle\/80 border border-border-strong focus:border-accent rounded-xl text-xs text-text-primary placeholder-text-disabled outline-none"\s*\/>\s*<\/div>/,
  `<Input
                    id="new-campaign-title-input"
                    label={<span>Título <span className="font-normal text-text-muted">(opcional)</span></span>}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t.manualTitlePlaceholder}
                  />`
);

// Genre select
code = code.replace(
  /<div>\s*<label className="block text-\[11px\] font-semibold text-text-muted mb-1">\s*\{t\.manualGenreLabel\}\s*<\/label>\s*<select\s*id="new-campaign-genre-select"\s*value=\{genre\}\s*onChange=\{\(e\) => \{\s*setGenre\(e\.target\.value\);\s*if \(manualValidationError\) setManualValidationError\(null\);\s*\}\}\s*className="w-full h-9 px-2\.5 bg-surface-subtle\/80 border border-border-strong focus:border-accent rounded-xl text-xs text-text-primary outline-none cursor-pointer"\s*>\s*([\s\S]*?)<\/select>\s*<\/div>/,
  `<div>
                    <label className="text-[13px] font-semibold text-text-primary ml-0.5">
                      {t.manualGenreLabel} <span className="font-normal text-text-muted">(opcional)</span>
                    </label>
                    <select
                      id="new-campaign-genre-select"
                      value={genre}
                      onChange={(e) => {
                        setGenre(e.target.value);
                        if (manualValidationError) setManualValidationError(null);
                      }}
                      className="w-full h-10 px-2.5 mt-1.5 bg-surface-subtle border border-border-strong focus:border-accent rounded-xl text-[13px] text-text-primary outline-none cursor-pointer"
                    >
                      $1</select>
                  </div>`
);

fs.writeFileSync('src/components/NewCampaignModal.tsx', code);
console.log('Manual form part 1 updated');
