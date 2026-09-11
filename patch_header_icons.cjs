const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(/<PanelLeftClose className="w-4 h-4 /g, '<PanelLeftClose className="w-5 h-5 ');
code = code.replace(/<PanelLeft className="w-4 h-4 /g, '<PanelLeft className="w-5 h-5 ');

code = code.replace(/<MapPin className="w-3\.5 h-3\.5 /g, '<MapPin className="w-4 h-4 ');
code = code.replace(/<Calendar className="w-3\.5 h-3\.5 /g, '<Calendar className="w-4 h-4 ');

fs.writeFileSync('src/components/Header.tsx', code);
