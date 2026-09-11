const fs = require('fs');

let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');

// Fix Boxed icons in world_basis
code = code.replace(
  /<div className="w-10 h-10 rounded-xl bg-surface-subtle flex items-center justify-center text-text-secondary shrink-0 transition-colors">/g,
  '<div className="flex items-center justify-center text-text-muted shrink-0 pt-0.5">'
);

// Fix btn-generate-scenarios / btn-custom-idea / btn-create-manually to match standard
code = code.replace(
  /className="p-3\.5 rounded-xl bg-surface-subtle hover:bg-surface-active border border-border-subtle hover:border-border-default transition-all text-left group cursor-pointer flex items-start gap-3\.5"/g,
  'className="p-4 rounded-xl border text-left transition-all duration-150 group cursor-pointer flex items-start gap-3.5 bg-surface hover:bg-surface-hover border-border-subtle hover:border-border-strong"'
);
code = code.replace(
  /className="w-4 h-4 text-text-secondary group-hover:scale-110 transition-transform"/g,
  'className="w-5 h-5 text-text-secondary group-hover:scale-110 transition-transform"'
);

fs.writeFileSync('src/components/NewCampaignModal.tsx', code);
console.log('Cards updated');
