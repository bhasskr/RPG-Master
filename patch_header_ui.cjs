const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  "import { PanelLeft, PanelLeftClose, MapPin, Calendar, Compass } from 'lucide-react';",
  "import { PanelLeft, PanelLeftClose, MapPin, Calendar, Compass } from 'lucide-react';\nimport { IconButton } from './ui/IconButton';\nimport { Badge } from './ui/Badge';"
);

// Button
code = code.replace(
  /<button[\s\S]*?id="toggle-sidebar-button"[\s\S]*?className="p-3 radius-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover active:bg-surface-active transition-colors cursor-pointer shrink-0 border border-transparent"[\s\S]*?aria-label="Toggle Sidebar"[\s\S]*?>([\s\S]*?)<\/button>/,
  '<IconButton id="toggle-sidebar-button" onClick={onToggleSidebar} title={isSidebarOpen ? \'Recolher barra lateral\' : \'Abrir barra lateral\'} aria-label="Toggle Sidebar">$1</IconButton>'
);

// Badge Turno
code = code.replace(
  /<span className="hidden sm:inline-flex typo-caption font-mono px-2 py-0\.5 radius-small bg-surface-hover text-text-secondary border border-border-subtle shrink-0">([\s\S]*?)<\/span>/,
  '<Badge variant="neutral" className="hidden sm:inline-flex font-mono">$1</Badge>'
);

fs.writeFileSync('src/components/Header.tsx', code);
