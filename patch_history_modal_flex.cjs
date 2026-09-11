const fs = require('fs');
let code = fs.readFileSync('src/components/HistoryModal.tsx', 'utf8');

code = code.replace(
  /<div className="flex items-center gap-1">/g,
  '<div className="flex items-center gap-1 min-w-0">'
);
code = code.replace(
  /truncate max-w-\[180px\]/g,
  'truncate min-w-0' // Since it's in a min-w-0 container, truncate is enough
);

code = code.replace(
  /<div className="flex items-center gap-1 typo-caption text-text-secondary">/g,
  '<div className="flex items-center gap-1 min-w-0 typo-caption text-text-secondary">'
);
code = code.replace(
  /truncate max-w-\[130px\]/g,
  'truncate min-w-0'
);

fs.writeFileSync('src/components/HistoryModal.tsx', code);
