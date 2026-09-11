const fs = require('fs');
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf8');

// Imports
code = code.replace(
  "import {",
  "import {\n  Button,\n  IconButton,\n  EmptyState\n} from './ui';\nimport {"
);
code = fs.readFileSync('src/components/ChatView.tsx', 'utf8');
code = code.replace(
  "import {",
  "import { Button } from './ui/Button';\nimport { IconButton } from './ui/IconButton';\nimport { EmptyState } from './ui/EmptyState';\nimport {"
);

// Empty State
code = code.replace(
  /<div className="radius-medium bg-surface-elevated\/80 border border-border-default text-text-secondary flex items-center justify-center mb-4">\n\s*<p className="typo-body">Início da aventura\.\.\.<\/p>\n\s*<\/div>/g,
  '<EmptyState icon={<Sparkles className="w-5 h-5" />} description="Início da aventura..." className="mb-4 bg-surface-elevated/80 border-border-default radius-medium py-6" />'
);

// Retry Button
code = code.replace(
  /<button\n\s*onClick={\(\) => onRetry\(\)}\n\s*disabled={isLoading}\n\s*className="px-4 py-2 radius-medium typo-secondary bg-surface-hover\/50 hover:bg-surface-hover text-text-secondary transition-colors"\n\s*>\n\s*Tentar novamente\n\s*<\/button>/g,
  '<Button variant="secondary" onClick={() => onRetry()} disabled={isLoading}>Tentar novamente</Button>'
);
code = code.replace(
  /<button\n\s*onClick={\(\) => setIsEditing\(false\)}\n\s*className="px-4 py-2 radius-medium typo-secondary bg-surface-hover\/50 hover:bg-surface-hover text-text-secondary transition-colors"\n\s*>\n\s*Cancelar\n\s*<\/button>/g,
  '<Button variant="secondary" onClick={() => setIsEditing(false)}>Cancelar</Button>'
);
code = code.replace(
  /<button\n\s*onClick={handleSaveEdit}\n\s*disabled={!editValue\.trim\(\) \|\| isLoading}\n\s*className="px-4 py-2 radius-medium typo-secondary bg-text-primary hover:bg-white text-background transition-colors disabled:opacity-50"\n\s*>\n\s*Salvar e Reenviar\n\s*<\/button>/g,
  '<Button variant="primary" onClick={handleSaveEdit} disabled={!editValue.trim() || isLoading}>Salvar e Reenviar</Button>'
);

// Inline edit icon (Pencil)
code = code.replace(
  /<button\n\s*onClick={\(\) => {\n\s*setIsEditing\(true\);\n\s*setEditValue\(message\.content\);\n\s*}}\n\s*className="p-1\.5 text-text-muted hover:text-text-primary bg-surface-subtle\/80 hover:bg-surface-elevated radius-medium transition-colors opacity-0 group-hover:opacity-100"\n\s*title="Editar ação"\n\s*>\n\s*<Pencil className="w-3\.5 h-3\.5" \/>\n\s*<\/button>/g,
  `<IconButton variant="ghost" size="compact" onClick={() => { setIsEditing(true); setEditValue(message.content); }} className="opacity-0 group-hover:opacity-100 bg-surface-subtle/80 hover:bg-surface-elevated" title="Editar ação"><Pencil className="w-3.5 h-3.5" /></IconButton>`
);

fs.writeFileSync('src/components/ChatView.tsx', code);
