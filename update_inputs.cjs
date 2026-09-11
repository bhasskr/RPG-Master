const fs = require('fs');
let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');

// Replace all standard `<input` that have `value={someState}` and `className="...w-full...bg-surface-subtle..."`
const inputRegex = /<div>\s*<label className="block text-\[11px\] font-semibold text-text-muted mb-1">\s*(.*?)\s*<\/label>\s*<input\s*(?:type="text")?\s*value=\{([^}]+)\}\s*onChange=\{\(e\) => set[A-Za-z]+\(e\.target\.value\)\}\s*(?:placeholder=\{([^}]+)\})?\s*className="w-full h-9 px-3 bg-surface-subtle\/80 border border-border-strong focus:border-accent rounded-xl text-xs text-text-primary outline-none"\s*\/>\s*<\/div>/g;
code = code.replace(inputRegex, (match, label, value, placeholder) => {
  let newLabel = label.replace(/\s*\(Opcional\)/i, ' <span className="font-normal text-text-muted">(opcional)</span>');
  return `<Input
                    label={<span>${newLabel}</span>}
                    value={${value}}
                    onChange={(e) => set${value.charAt(0).toUpperCase() + value.slice(1)}(e.target.value)}
                    ${placeholder ? `placeholder={${placeholder}}` : ''}
                  />`;
});

// Also character name input (special case)
code = code.replace(
  /<div>\s*<label className="block text-\[11px\] font-semibold text-text-muted mb-1">\s*Nome do Personagem\s*<\/label>\s*<input\s*type="text"\s*value=\{playerName\}\s*onChange=\{\(e\) => \{\s*setPlayerName\(e\.target\.value\);\s*if \(charValidationError\) setCharValidationError\(null\);\s*\}\}\s*placeholder="Ex: Alistair, Nova, Kael"\s*className="w-full h-9 px-3 bg-surface-subtle\/80 border border-border-strong focus:border-accent rounded-xl text-xs text-text-primary outline-none"\s*\/>\s*<\/div>/,
  `<Input
                    label="Nome do Personagem"
                    value={playerName}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                      if (charValidationError) setCharValidationError(null);
                    }}
                    placeholder="Ex: Alistair, Nova, Kael"
                  />`
);

const textareaRegex = /<div>\s*<label className="block text-\[11px\] font-semibold text-text-muted mb-1">\s*(.*?)\s*<\/label>\s*<textarea\s*value=\{([^}]+)\}\s*onChange=\{\(e\) => set[A-Za-z]+\(e\.target\.value\)\}\s*placeholder=(?:\{([^}]+)\}|"([^"]+)")\s*className="w-full h-(20|16|14|28|9) p-3 bg-surface-subtle\/80 border border-border-strong focus:border-accent rounded-xl text-xs text-text-primary outline-none resize-none"\s*\/>\s*<\/div>/g;
code = code.replace(textareaRegex, (match, label, value, placeholderCode, placeholderString, heightClass) => {
  let newLabel = label.replace(/\s*\(Opcional\)/i, ' <span className="font-normal text-text-muted">(opcional)</span>');
  let placeholder = placeholderCode ? `{${placeholderCode}}` : `"${placeholderString}"`;
  return `<Textarea
                    label={<span>${newLabel}</span>}
                    value={${value}}
                    onChange={(e) => set${value.charAt(0).toUpperCase() + value.slice(1)}(e.target.value)}
                    placeholder=${placeholder}
                    className="h-${heightClass} resize-none"
                  />`;
});

// Char validation error
code = code.replace(
  /<div className="p-3 rounded-xl bg-red-900\/20 border border-red-900\/50 flex items-start gap-2 text-xs">\s*<ShieldAlert className="w-4 h-4 text-red-400 shrink-0" \/>\s*<span className="font-semibold text-red-300">\{charValidationError\}<\/span>\s*<\/div>/g,
  `<div className="flex items-center gap-2 text-danger text-xs font-medium">
                    <ShieldAlert className="w-4 h-4" />
                    <span>{charValidationError}</span>
                  </div>`
);


fs.writeFileSync('src/components/NewCampaignModal.tsx', code);
console.log('Inputs updated');
