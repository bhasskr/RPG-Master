const fs = require('fs');

const files = [
  'src/components/Header.tsx',
  'src/components/Sidebar.tsx',
  'src/components/ChatView.tsx',
  'src/components/HistoryModal.tsx',
  'src/components/MessageInput.tsx',
  'src/components/ui/Button.tsx',
  'src/components/ui/IconButton.tsx',
  'src/components/ui/EmptyState.tsx',
  'src/components/ui/DrawerShell.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    
    // Check w-3 h-3
    code = code.replace(/className="w-3 h-3"/g, 'className="w-4 h-4"');
    code = code.replace(/className="w-3 h-3 /g, 'className="w-4 h-4 ');
    
    // Check w-3.5 h-3.5
    code = code.replace(/className="w-3\.5 h-3\.5"/g, 'className="w-4 h-4"');
    code = code.replace(/className="w-3\.5 h-3\.5 /g, 'className="w-4 h-4 ');
    
    // Check w-4.5 h-4.5
    code = code.replace(/className="w-4\.5 h-4\.5"/g, 'className="w-5 h-5"');
    code = code.replace(/className="w-4\.5 h-4\.5 /g, 'className="w-5 h-5 ');
    
    fs.writeFileSync(file, code);
  }
});
