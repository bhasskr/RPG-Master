const fs = require('fs');
let code = fs.readFileSync('src/components/MessageInput.tsx', 'utf8');

code = code.replace(
  "import { ArrowUp } from 'lucide-react';",
  "import { ArrowUp } from 'lucide-react';\nimport { IconButton } from './ui/IconButton';"
);

// Button
code = code.replace(
  /<button\n\s*id="send-action-button"[\s\S]*?className="w-10 h-10 sm:w-11 sm:h-11 radius-medium bg-text-primary hover:bg-white active:bg-text-primary\/80 disabled:bg-surface-elevated text-background disabled:text-text-disabled flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"[\s\S]*?>\n\s*<ArrowUp className="w-5 h-5" \/>\n\s*<\/button>/,
  `<IconButton
              id="send-action-button"
              type="button"
              onClick={handleSend}
              disabled={!text.trim() || isLoading || disabled}
              variant="primary"
              className="w-10 h-10 sm:w-11 sm:h-11"
              title="Enviar ação (Enter)"
              aria-label="Enviar ação"
            >
              <ArrowUp className="w-5 h-5" />
            </IconButton>`
);

fs.writeFileSync('src/components/MessageInput.tsx', code);
