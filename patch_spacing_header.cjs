const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Header Padding & Gap
code = code.replace('px-3 sm:px-5', 'px-4 sm:px-6');
code = code.replace('gap-3', 'gap-4');
code = code.replace('gap-2 sm:gap-3', 'gap-3 sm:gap-4');

// Button touch target (Sidebar Toggle)
// Originally: p-2 (padding 8px, icon 16px = 32px). Let's increase to p-3 (padding 12px, icon 16px = 40px)
code = code.replace('p-2 rounded-xl', 'p-3 rounded-xl');

// Current Location & Date Tags
code = code.replace('gap-1.5 px-2.5 py-1', 'gap-2 px-3 py-1.5');
code = code.replace('gap-1.5 px-2.5 py-1', 'gap-2 px-3 py-1.5');

fs.writeFileSync('src/components/Header.tsx', code);
