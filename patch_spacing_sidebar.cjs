const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Replace arbitrary or tight spacings
code = code.replace(/p-1\.5/g, 'p-2'); // Touch targets for small buttons
code = code.replace(/gap-1\.5/g, 'gap-2');
code = code.replace(/px-3\.5/g, 'px-4');
code = code.replace(/gap-2\.5/g, 'gap-3');
code = code.replace(/px-2\.5 py-2/g, 'px-3 py-2'); // Campaign items
code = code.replace(/p-2\.5/g, 'p-3'); // Sidebar history card
code = code.replace(/gap-0\.5/g, 'gap-1');
code = code.replace(/space-y-1\.5/g, 'space-y-2');
code = code.replace(/space-y-5/g, 'space-y-6'); // Increased breathing room between sidebar sections
code = code.replace(/pt-0\.5/g, 'pt-1');

fs.writeFileSync('src/components/Sidebar.tsx', code);
