const fs = require('fs');

let code = fs.readFileSync('src/components/NewCampaignModal.tsx', 'utf8');

// 1. Add clickedOption state
if (!code.includes('const [clickedOption')) {
  code = code.replace(
    /const \[worldBasis, setWorldBasis\] = useState[^\n]+\n/,
    "const [worldBasis, setWorldBasis] = useState<'real_world' | 'fictional'>(() => loadDraft('worldBasis', 'fictional'));\n  const [clickedOption, setClickedOption] = useState<string | null>(null);\n\n  useEffect(() => {\n    setClickedOption(null);\n  }, [selectedMode]);\n"
  );
}

// 2. Replace campaign_format logic
code = code.replace(
  /onClick=\{\(\) => \{ setCampaignFormat\('sandbox'\); setMechanicalProfile\('SANDBOX_D20'\); setSelectedMode\('world_basis'\); \}\}/g,
  "onClick={() => { setClickedOption('sandbox'); setCampaignFormat('sandbox'); setMechanicalProfile('SANDBOX_D20'); setTimeout(() => setSelectedMode('world_basis'), 150); }}"
);
code = code.replace(
  /onClick=\{\(\) => \{ setCampaignFormat\('focused'\); setMechanicalProfile\('FOCUSED_REALISM'\); setSelectedMode\('world_basis'\); \}\}/g,
  "onClick={() => { setClickedOption('focused'); setCampaignFormat('focused'); setMechanicalProfile('FOCUSED_REALISM'); setTimeout(() => setSelectedMode('world_basis'), 150); }}"
);

code = code.replace(
  /campaignFormat === 'sandbox' \? 'bg-surface-subtle border-accent\/50 ring-1 ring-accent\/20 shadow-sm' : 'bg-surface hover:bg-surface-subtle border-border-subtle hover:border-border-default'/g,
  "clickedOption === 'sandbox' ? 'bg-surface-subtle border-accent/50' : 'bg-surface hover:bg-surface-hover border-border-subtle hover:border-border-strong'"
);
code = code.replace(
  /campaignFormat === 'focused' \? 'bg-surface-subtle border-accent\/50 ring-1 ring-accent\/20 shadow-sm' : 'bg-surface hover:bg-surface-subtle border-border-subtle hover:border-border-default'/g,
  "clickedOption === 'focused' ? 'bg-surface-subtle border-accent/50' : 'bg-surface hover:bg-surface-hover border-border-subtle hover:border-border-strong'"
);

code = code.replace(
  /\{campaignFormat === 'sandbox' \? <CheckCircle2 className="w-4 h-4 text-accent" \/> : <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-transform group-hover:translate-x-0.5" \/>\}/g,
  "{clickedOption === 'sandbox' ? <CheckCircle2 className=\"w-4 h-4 text-accent\" /> : <ChevronRight className=\"w-4 h-4 text-text-muted group-hover:text-text-primary transition-transform group-hover:translate-x-0.5\" />}"
);
code = code.replace(
  /\{campaignFormat === 'focused' \? <CheckCircle2 className="w-4 h-4 text-accent" \/> : <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-transform group-hover:translate-x-0.5" \/>\}/g,
  "{clickedOption === 'focused' ? <CheckCircle2 className=\"w-4 h-4 text-accent\" /> : <ChevronRight className=\"w-4 h-4 text-text-muted group-hover:text-text-primary transition-transform group-hover:translate-x-0.5\" />}"
);

// 3. Replace world_basis logic
code = code.replace(
  /onClick=\{\(\) => \{\s+setWorldBasis\('real_world'\);\s+setSelectedMode\('creation_method'\);\s+\}\}/g,
  "onClick={() => { setClickedOption('real_world'); setWorldBasis('real_world'); setTimeout(() => setSelectedMode('creation_method'), 150); }}"
);
code = code.replace(
  /onClick=\{\(\) => \{\s+setWorldBasis\('fictional'\);\s+setSelectedMode\('creation_method'\);\s+\}\}/g,
  "onClick={() => { setClickedOption('fictional'); setWorldBasis('fictional'); setTimeout(() => setSelectedMode('creation_method'), 150); }}"
);

code = code.replace(
  /worldBasis === 'real_world' \? 'bg-surface-subtle border-accent\/50 ring-1 ring-accent\/20 shadow-sm' : 'bg-surface hover:bg-surface-subtle border-border-subtle hover:border-border-default'/g,
  "clickedOption === 'real_world' ? 'bg-surface-subtle border-accent/50' : 'bg-surface hover:bg-surface-hover border-border-subtle hover:border-border-strong'"
);
code = code.replace(
  /worldBasis === 'fictional'\s*\?\s*'bg-surface-subtle border-accent\/50 ring-1 ring-accent\/20 shadow-sm'\s*:\s*'bg-surface hover:bg-surface-subtle border-border-subtle hover:border-border-default'/g,
  "clickedOption === 'fictional' ? 'bg-surface-subtle border-accent/50' : 'bg-surface hover:bg-surface-hover border-border-subtle hover:border-border-strong'"
);

code = code.replace(
  /\{worldBasis === 'real_world' \? <CheckCircle2 className="w-4 h-4 text-accent" \/> : <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-transform group-hover:translate-x-0.5" \/>\}/g,
  "{clickedOption === 'real_world' ? <CheckCircle2 className=\"w-4 h-4 text-accent\" /> : <ChevronRight className=\"w-4 h-4 text-text-muted group-hover:text-text-primary transition-transform group-hover:translate-x-0.5\" />}"
);
code = code.replace(
  /\{worldBasis === 'fictional' \? <CheckCircle2 className="w-4 h-4 text-accent" \/> : <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-transform group-hover:translate-x-0.5" \/>\}/g,
  "{clickedOption === 'fictional' ? <CheckCircle2 className=\"w-4 h-4 text-accent\" /> : <ChevronRight className=\"w-4 h-4 text-text-muted group-hover:text-text-primary transition-transform group-hover:translate-x-0.5\" />}"
);

fs.writeFileSync('src/components/NewCampaignModal.tsx', code);
console.log('Done');
