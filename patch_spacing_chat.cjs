const fs = require('fs');
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf8');

// Container padding
code = code.replace(
  "'px-3 sm:px-4 py-4 md:py-5 space-y-4'",
  "'px-4 sm:px-6 py-4 md:py-6 space-y-6'"
);
code = code.replace(
  "'px-4 sm:px-6 py-6 md:py-8 space-y-8'",
  "'px-4 sm:px-8 py-8 md:py-10 space-y-12'" // give comfortable a really good breathing room, space-y-12
);

// densityMessageSpacing - used between player/narrator elements within a turn? 
code = code.replace(
  "preferences.density === 'compact' ? 'space-y-4' : 'space-y-7'",
  "preferences.density === 'compact' ? 'space-y-6' : 'space-y-8'"
);

// Bubble padding
code = code.replace(
  "'p-2.5 sm:p-3'",
  "'p-3 sm:p-4'"
);
code = code.replace(
  "'p-3.5 sm:p-4'",
  "'p-4 sm:p-5'"
);

// General gap/padding changes
code = code.replace(/gap-3 sm:gap-4/g, 'gap-4 sm:gap-6');
code = code.replace(/p-3/g, 'p-4');
code = code.replace(/px-3 py-1\.5/g, 'px-4 py-2'); // retry button
code = code.replace(/p-1\.5/g, 'p-2'); // edit button
code = code.replace(/space-y-1\.5/g, 'space-y-2');
code = code.replace(/mt-0\.5/g, 'mt-1');
code = code.replace(/pt-1/g, 'pt-2'); // Narrator padding top 
code = code.replace(/pt-2/g, 'pt-4'); // padding top for narrator indicator/retry

fs.writeFileSync('src/components/ChatView.tsx', code);
