const fs = require('fs');
let code = fs.readFileSync('src/components/HistoryModal.tsx', 'utf8');

const shellReplacement = `
  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Sessões Salvas"
      subtitle="Gerencie suas campanhas e histórico de aventuras"
      icon={<History className="w-5 h-5 text-text-secondary" />}
      headerActions={
        <IconButton onClick={handleRefresh} title="Atualizar lista" size="compact" disabled={isLoading}>
          <RefreshCw className={\`w-4 h-4 \${isLoading ? 'animate-spin' : ''}\`} />
        </IconButton>
      }
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 bg-background">
`;

// Looking for the start of the return statement that currently has:
// return (
//    <>
//      <div className="fixed inset-0 ... onClick={onClose} />
//      <aside className="fixed inset-y-0 ...">
//        <header className="h-16 ..."> ... </header>
//        <div className="flex-1 overflow-y-auto ... bg-background">
const regexToReplace = /return \(\s*<>\s*<div className="fixed inset-0 z-50 bg-black\/75 backdrop-blur-xs transition-opacity duration-200" onClick={onClose} \/>\s*<aside className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md md:max-w-xl lg:max-w-2xl bg-background border-l border-border-default elevation-medium flex flex-col transition-transform duration-300 ease-out">\s*<header[\s\S]*?<\/header>\s*<div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 bg-background">/;

code = code.replace(regexToReplace, shellReplacement);

// We must also replace the end of the component
//     </div>
//   </aside>
//  </>
// );
const endRegex = /<\/div>\s*<\/aside>\s*<\/>\s*\);\s*};/;
code = code.replace(endRegex, "      </div>\n    </DrawerShell>\n  );\n};\n");

fs.writeFileSync('src/components/HistoryModal.tsx', code);
