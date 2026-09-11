const fs = require('fs');

const files = [
  'src/components/Sidebar.tsx',
  'src/components/HistoryModal.tsx',
  'src/components/ChatView.tsx'
];

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(
    /opacity-0 group-hover:opacity-100/g,
    'opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100'
  );
  fs.writeFileSync(file, code);
});
