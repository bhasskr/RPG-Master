const fs = require('fs');

const indexCode = `export { Button } from './Button';
export { IconButton } from './IconButton';
export { Badge } from './Badge';
export { Input } from './Input';
export { EmptyState } from './EmptyState';
export { DrawerShell } from './DrawerShell';
export { Tabs } from './Tabs';
`;
fs.writeFileSync('src/components/ui/index.ts', indexCode);
