const fs = require('fs');
let code = fs.readFileSync('src/components/HistoryModal.tsx', 'utf8');

// Imports
code = code.replace(
  "import {",
  "import {\n  Button,\n  IconButton,\n  Badge,\n  Input,\n  EmptyState,\n  DrawerShell\n} from './ui';\nimport {"
);
// or if I didn't create index.ts:
code = fs.readFileSync('src/components/HistoryModal.tsx', 'utf8');
code = code.replace(
  "import {",
  "import { Button } from './ui/Button';\nimport { IconButton } from './ui/IconButton';\nimport { Badge } from './ui/Badge';\nimport { Input } from './ui/Input';\nimport { EmptyState } from './ui/EmptyState';\nimport { DrawerShell } from './ui/DrawerShell';\nimport {"
);

// We must replace the wrapper.
// The current wrapper looks like:
// return (
//   <>
//     <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs transition-opacity duration-200" onClick={onClose} />
//     <aside className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md md:max-w-xl lg:max-w-2xl bg-background border-l border-border-default elevation-medium flex flex-col transition-transform duration-300 ease-out">
//       <header ...>
//         ... (title and icons)
//       </header>
//       <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 bg-background"> ...
//
// Let's just do a big replace since the header is standard.
// Actually, I can use a simpler approach. I'll write a script that reconstructs the component return block.
const componentStart = code.indexOf('return (');
if (componentStart !== -1) {
  let topPart = code.slice(0, componentStart);
  let renderPart = code.slice(componentStart);

  // Search input
  renderPart = renderPart.replace(
    /<input\n\s*type="text"\n\s*placeholder="Buscar companhas, turnos ou locais..."\n\s*value={searchQuery}\n\s*onChange={\(e\) => setSearchQuery\(e\.target\.value\)}\n\s*className="w-full bg-surface-elevated\/50 border border-border-subtle px-4 py-2 text-text-primary text-sm focus:outline-none focus:border-border-strong transition-colors"\n\s*\/>/g,
    '<Input type="text" placeholder="Buscar companhas, turnos ou locais..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-surface-elevated/50" />'
  );
  
  // Empty state
  renderPart = renderPart.replace(
    /<div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">\n\s*<div className="w-12 h-12 radius-large border border-border-subtle text-text-muted flex items-center justify-center bg-surface-subtle mb-4">\n\s*<History className="w-6 h-6" \/>\n\s*<\/div>\n\s*<h3 className="typo-heading text-text-primary mb-2">Nenhuma campanha encontrada<\/h3>\n\s*<p className="typo-body text-text-secondary max-w-sm">\n\s*Tente ajustar os filtros ou limpar sua busca para encontrar o que procura\.\n\s*<\/p>\n\s*<\/div>/g,
    '<EmptyState icon={<History className="w-6 h-6" />} title="Nenhuma campanha encontrada" description="Tente ajustar os filtros ou limpar sua busca para encontrar o que procura." className="border-transparent bg-transparent" />'
  );

  // Turno badge
  renderPart = renderPart.replace(
    /<span className="px-2 py-0\.5 radius-small bg-background border border-border-subtle">\n\s*Turno {camp\.turnCount}\n\s*<\/span>/g,
    '<Badge variant="neutral" className="bg-background">Turno {camp.turnCount}</Badge>'
  );
  // Active Badge
  renderPart = renderPart.replace(
    /<span className="px-2 py-0\.5 radius-small typo-caption font-semibold bg-accent-subtle text-accent border border-accent-subtle shrink-0">\n\s*Sessão Ativa\n\s*<\/span>/g,
    '<Badge variant="accent">Sessão Ativa</Badge>'
  );

  // Cancel/Delete buttons in the card
  renderPart = renderPart.replace(
    /<button\n\s*onClick={\(e\) => {\n\s*e\.stopPropagation\(\);\n\s*setDeletingId\(null\);\n\s*}}\n\s*className="px-4 py-2 typo-caption text-text-secondary hover:text-text-primary bg-surface-elevated hover:bg-surface-hover radius-medium transition-colors"\n\s*>\n\s*Cancelar\n\s*<\/button>/g,
    '<Button size="compact" variant="secondary" onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}>Cancelar</Button>'
  );
  renderPart = renderPart.replace(
    /<button\n\s*onClick={\(e\) => {\n\s*e\.stopPropagation\(\);\n\s*if \(onDeleteCampaign\) onDeleteCampaign\(camp\.id\);\n\s*setDeletingId\(null\);\n\s*}}\n\s*className="px-4 py-2 typo-caption text-white bg-danger hover:bg-danger-hover radius-medium transition-colors shadow-none"\n\s*>\n\s*Excluir\n\s*<\/button>/g,
    '<Button size="compact" variant="danger" onClick={(e) => { e.stopPropagation(); if (onDeleteCampaign) onDeleteCampaign(camp.id); setDeletingId(null); }}>Excluir</Button>'
  );

  // Inline rename
  renderPart = renderPart.replace(
    /<button\n\s*onClick={\(e\) => {\n\s*e\.stopPropagation\(\);\n\s*if \(renameValue\.trim\(\) && onRenameCampaign\) {\n\s*onRenameCampaign\(camp\.id, renameValue\.trim\(\)\);\n\s*setAllCampaigns\(prev => prev\.map\(c => c\.id === camp\.id \? { \.\.\.c, title: renameValue\.trim\(\) } : c\)\);\n\s*}\n\s*setRenamingId\(null\);\n\s*}}\n\s*className="p-1 radius-small text-text-secondary hover:bg-surface-elevated hover:text-accent transition-colors shrink-0"\n\s*>\n\s*<Check className="w-4 h-4" \/>\n\s*<\/button>/g,
    `<IconButton size="compact" variant="ghost" className="p-1" onClick={(e) => { e.stopPropagation(); if (renameValue.trim() && onRenameCampaign) { onRenameCampaign(camp.id, renameValue.trim()); setAllCampaigns(prev => prev.map(c => c.id === camp.id ? { ...c, title: renameValue.trim() } : c)); } setRenamingId(null); }}><Check className="w-4 h-4" /></IconButton>`
  );

  // Delete/Rename icon buttons (floating)
  renderPart = renderPart.replace(
    /<button\n\s*onClick={\(e\) => {\n\s*e\.stopPropagation\(\);\n\s*setRenamingId\(camp\.id\);\n\s*setRenameValue\(camp\.title \|\| ''\);\n\s*}}\n\s*className="p-1\.5 text-text-secondary hover:text-text-primary hover:bg-surface-hover radius-l-medium transition-colors"\n\s*title="Renomear campanha"\n\s*>\n\s*<Pencil className="w-3\.5 h-3\.5" \/>\n\s*<\/button>/g,
    `<IconButton size="compact" variant="ghost" className="radius-l-medium radius-r-none" title="Renomear campanha" onClick={(e) => { e.stopPropagation(); setRenamingId(camp.id); setRenameValue(camp.title || ''); }}><Pencil className="w-3.5 h-3.5" /></IconButton>`
  );
  renderPart = renderPart.replace(
    /<button\n\s*onClick={\(e\) => {\n\s*e\.stopPropagation\(\);\n\s*setDeletingId\(camp\.id\);\n\s*}}\n\s*className="p-1\.5 text-text-secondary hover:text-danger hover:bg-danger\/10 radius-r-medium transition-colors"\n\s*title="Excluir campanha"\n\s*>\n\s*<Trash2 className="w-3\.5 h-3\.5" \/>\n\s*<\/button>/g,
    `<IconButton size="compact" variant="danger" className="radius-r-medium radius-l-none" title="Excluir campanha" onClick={(e) => { e.stopPropagation(); setDeletingId(camp.id); }}><Trash2 className="w-3.5 h-3.5" /></IconButton>`
  );

  // Wrap inside DrawerShell instead of <><div className="fixed inset-0 ...">...</div><aside>...</aside></>
  // This might be tricky with regex, let's write a small script for that inside node
}

fs.writeFileSync('src/components/HistoryModal.tsx', topPart + renderPart);
