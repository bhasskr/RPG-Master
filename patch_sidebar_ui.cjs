const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(
  "import {",
  "import {\n  Button,\n  IconButton,\n  Badge,\n} from './ui';\nimport {"
);

// We need an index.ts in ui to export them easily, let's create it first! Wait, I'll just import directly.
code = code.replace(
  "import {",
  "import { Button } from './ui/Button';\nimport { IconButton } from './ui/IconButton';\nimport { Badge } from './ui/Badge';\nimport {"
);

// We must be careful not to duplicate imports if I run this wrong.
// Better to replace lucide-react import
code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
code = code.replace(
  "import { Plus, Settings, MessageSquare, MapPin, History, Info, Sparkles, X, ChevronRight, Pencil, Trash2, Check, LayoutGrid, BookOpen, Search, Filter, Hash, MoreVertical, Shield, FileText, User, Users, Compass, CloudRain, Clock, Moon, Sun, Cloud, BookMarked } from 'lucide-react';",
  "import { Plus, Settings, MessageSquare, MapPin, History, Info, Sparkles, X, ChevronRight, Pencil, Trash2, Check, LayoutGrid, BookOpen, Search, Filter, Hash, MoreVertical, Shield, FileText, User, Users, Compass, CloudRain, Clock, Moon, Sun, Cloud, BookMarked } from 'lucide-react';\nimport { Button } from './ui/Button';\nimport { IconButton } from './ui/IconButton';\nimport { Badge } from './ui/Badge';\nimport { Input } from './ui/Input';"
);

// New Campaign Button
code = code.replace(
  /<button\n\s*id="new-campaign-sidebar-btn"[\s\S]*?className="w-full h-10 px-4 bg-surface-elevated\/50 hover:bg-surface-hover\/80 border border-border-default text-text-primary hover:text-white radius-medium text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"[\s\S]*?>([\s\S]*?)<\/button>/,
  '<Button id="new-campaign-sidebar-btn" onClick={() => { if (onNewCampaign) onNewCampaign(); if (window.innerWidth < 768) onClose(); }} variant="secondary" className="w-full h-10">$1</Button>'
);

// Turno Tag
code = code.replace(
  /<span className="radius-small bg-surface-subtle\/60 text-text-secondary font-mono border border-border-subtle">\n\s*Turno {camp\.turnCount}\n\s*<\/span>/g,
  '<Badge variant="neutral" className="font-mono">Turno {camp.turnCount}</Badge>'
);
code = code.replace(
  /<span className="typo-caption px-2 py-1 radius-small bg-surface-subtle\/60 text-text-secondary font-mono border border-border-default">\n\s*Turno {camp\.turnCount}\n\s*<\/span>/g,
  '<Badge variant="neutral" className="font-mono">Turno {camp.turnCount}</Badge>'
); // fallback

// Edit/Delete buttons (floating)
// Rename
code = code.replace(
  /<button\n\s*onClick={\(e\) => {\n\s*e\.stopPropagation\(\);\n\s*setRenamingId\(camp\.id\);\n\s*setRenameValue\(camp\.title \|\| ''\);\n\s*}}\n\s*className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover radius-l-medium transition-colors"\n\s*title="Renomear campanha"\n\s*>\n\s*<Pencil className="w-3\.5 h-3\.5" \/>\n\s*<\/button>/g,
  `<IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(camp.id);
                            setRenameValue(camp.title || '');
                          }}
                          variant="ghost" size="compact" className="radius-l-medium radius-r-none" title="Renomear campanha"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </IconButton>`
);
// Delete
code = code.replace(
  /<button\n\s*onClick={\(e\) => {\n\s*e\.stopPropagation\(\);\n\s*setDeletingId\(camp\.id\);\n\s*}}\n\s*className="p-2 text-text-secondary hover:text-danger hover:bg-danger-hover\/10 radius-r-medium transition-colors"\n\s*title="Excluir campanha"\n\s*>\n\s*<Trash2 className="w-3\.5 h-3\.5" \/>\n\s*<\/button>/g,
  `<IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(camp.id);
                          }}
                          variant="danger" size="compact" className="radius-r-medium radius-l-none" title="Excluir campanha"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </IconButton>`
);

// Delete Confirmation buttons
code = code.replace(
  /<button\n\s*onClick={\(e\) => {\n\s*e\.stopPropagation\(\);\n\s*setDeletingId\(null\);\n\s*}}\n\s*className="px-3 py-1\.5 typo-caption text-text-secondary hover:text-text-primary bg-surface-elevated hover:bg-surface-hover radius-small transition-colors"\n\s*>\n\s*Cancelar\n\s*<\/button>/,
  '<Button size="compact" variant="secondary" className="radius-small" onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}>Cancelar</Button>'
);
code = code.replace(
  /<button\n\s*onClick={\(e\) => {\n\s*e\.stopPropagation\(\);\n\s*if \(onDeleteCampaign\) onDeleteCampaign\(camp\.id\);\n\s*setDeletingId\(null\);\n\s*}}\n\s*className="px-3 py-1\.5 typo-caption text-white bg-danger hover:bg-danger-hover radius-small transition-colors shadow-none"\n\s*>\n\s*Excluir\n\s*<\/button>/,
  '<Button size="compact" variant="danger" className="radius-small" onClick={(e) => { e.stopPropagation(); if (onDeleteCampaign) onDeleteCampaign(camp.id); setDeletingId(null); }}>Excluir</Button>'
);

// Search input
code = code.replace(
  /<input\n\s*type="text"\n\s*placeholder="Buscar companha..."\n\s*value={searchQuery}\n\s*onChange={\(e\) => setSearchQuery\(e\.target\.value\)}\n\s*className="bg-background border border-border-default text-text-primary text-xs radius-small px-2 py-1 w-full focus:outline-none focus:border-border-strong"\n\s*\/>/,
  '<Input type="text" placeholder="Buscar companha..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="text-xs px-2 py-1" />'
);

// Check button
code = code.replace(
  /<button\n\s*onClick={\(e\) => {\n\s*e\.stopPropagation\(\);\n\s*if \(renameValue\.trim\(\) && onRenameCampaign\) {\n\s*onRenameCampaign\(camp\.id, renameValue\.trim\(\)\);\n\s*}\n\s*setRenamingId\(null\);\n\s*}}\n\s*className="p-1 radius-small text-text-secondary hover:bg-surface-elevated hover:text-accent transition-colors"\n\s*>\n\s*<Check className="w-3 h-3" \/>\n\s*<\/button>/g,
  `<IconButton size="compact" variant="ghost" className="p-1 radius-small" onClick={(e) => { e.stopPropagation(); if (renameValue.trim() && onRenameCampaign) onRenameCampaign(camp.id, renameValue.trim()); setRenamingId(null); }}><Check className="w-3 h-3" /></IconButton>`
);


fs.writeFileSync('src/components/Sidebar.tsx', code);
