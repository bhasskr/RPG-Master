const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

if (!css.includes('.radius-full')) {
  css = css.replace('.radius-none { border-radius: 0; }', '.radius-none { border-radius: 0; }\n  .radius-full { border-radius: 9999px; }');
  fs.writeFileSync('src/index.css', css);
}
