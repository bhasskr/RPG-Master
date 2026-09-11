const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  /truncate max-w-\[140px\] sm:max-w-\[240px\] md:max-w-\[320px\]/g,
  'truncate min-w-0'
);
code = code.replace(
  /truncate max-w-\[110px\] sm:max-w-\[180px\]/g,
  'truncate min-w-0'
);
code = code.replace(
  /truncate max-w-\[130px\]/g,
  'truncate min-w-0'
);

fs.writeFileSync('src/components/Header.tsx', code);
