const fs = require('fs');

const dividerCode = `import React from 'react';

interface DividerProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const Divider = ({ className = '', orientation = 'horizontal' }: DividerProps) => {
  const base = orientation === 'horizontal' ? 'w-full h-px' : 'h-full w-px';
  return <div className={\`\${base} bg-border-default \${className}\`} role="separator" />;
};
`;
fs.writeFileSync('src/components/ui/Divider.tsx', dividerCode);

let indexCode = fs.readFileSync('src/components/ui/index.ts', 'utf8');
if (!indexCode.includes('Divider')) {
  indexCode += "export { Divider } from './Divider';\n";
  fs.writeFileSync('src/components/ui/index.ts', indexCode);
}
