const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

const radiusTokens = `
  .radius-small { border-radius: 4px; }
  .radius-medium { border-radius: 8px; }
  .radius-large { border-radius: 12px; }
  .radius-l-medium { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
  .radius-r-medium { border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
  .radius-tr-small { border-top-right-radius: 4px; }
  .radius-none { border-radius: 0; }

  .elevation-none { box-shadow: none; }
  .elevation-low { box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.4); }
  .elevation-medium { box-shadow: 0 12px 32px -4px rgba(0, 0, 0, 0.5); }
`;

// Insert before the last closing brace (assuming it's safe)
css = css.replace(/}\s*$/, radiusTokens + '}');
fs.writeFileSync('src/index.css', css);
