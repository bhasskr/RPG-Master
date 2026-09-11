const fs = require('fs');
let code = fs.readFileSync('src/components/MessageInput.tsx', 'utf8');

code = code.replace('px-3 sm:px-6 py-3', 'px-4 sm:px-6 py-4');
code = code.replace('rounded-2xl p-2 transition-colors', 'rounded-2xl p-2 sm:p-3 transition-colors');
code = code.replace('px-2 py-1.5', 'px-3 py-2');
code = code.replace('w-8 h-8', 'w-10 h-10 sm:w-11 sm:h-11'); // Slightly larger button
code = code.replace('w-4 h-4', 'w-5 h-5'); // Icon scales up a bit with the button
code = code.replace('ml-2 mb-0.5', 'ml-3 mb-1'); // Adjusted gap next to textarea
code = code.replace('pt-1 text-[10px]', 'pt-2 text-[10px]'); // Margin top for hint

fs.writeFileSync('src/components/MessageInput.tsx', code);
