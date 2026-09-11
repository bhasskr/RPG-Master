const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(
  /<div className="flex items-center justify-between w-full">/g,
  '<div className="flex items-center justify-between w-full min-w-0 gap-2">'
);

code = code.replace(
  /truncate max-w-\[150px\]/g,
  'truncate min-w-0 flex-1'
);

code = code.replace(
  /truncate max-w-\[95px\]/g,
  'truncate min-w-0 flex-1'
);

fs.writeFileSync('src/components/Sidebar.tsx', code);
