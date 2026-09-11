const fs = require('fs');

// 1. Patch Button
let btn = fs.readFileSync('src/components/ui/Button.tsx', 'utf8');
btn = btn.replace(
  "const baseClasses = 'inline-flex items-center justify-center radius-medium typo-secondary transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 font-medium';",
  "const baseClasses = 'inline-flex items-center justify-center radius-medium typo-secondary transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 font-medium active:scale-[0.98] disabled:active:scale-100';"
);
fs.writeFileSync('src/components/ui/Button.tsx', btn);

// 2. Patch IconButton
let ibtn = fs.readFileSync('src/components/ui/IconButton.tsx', 'utf8');
ibtn = ibtn.replace(
  "const baseClasses = 'inline-flex items-center justify-center radius-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0';",
  "const baseClasses = 'inline-flex items-center justify-center radius-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 active:scale-[0.95] disabled:active:scale-100';"
);
// Ensure aria-label fallback to title
if (!ibtn.includes("const ariaLabel = props['aria-label'] || props.title;")) {
  ibtn = ibtn.replace(
    "<button ref={ref} className={`\\${baseClasses} \\${variants[variant]} \\${sizes[size]} \\${className}`} {...props}>",
    "const ariaLabel = props['aria-label'] || props.title;\n    return (\n      <button ref={ref} className={`\\${baseClasses} \\${variants[variant]} \\${sizes[size]} \\${className}`} aria-label={ariaLabel} {...props}>"
  );
  fs.writeFileSync('src/components/ui/IconButton.tsx', ibtn);
}

// 3. Patch Input
let inp = fs.readFileSync('src/components/ui/Input.tsx', 'utf8');
inp = inp.replace(
  "className={`bg-background border border-border-default text-text-primary placeholder-text-muted typo-body radius-small px-3 py-2 w-full focus:outline-none focus:border-border-strong transition-colors disabled:opacity-50 ${className}`}",
  "className={`bg-background border border-border-default text-text-primary placeholder-text-muted typo-body radius-small px-3 py-2 w-full focus:outline-none focus-visible:border-border-strong focus-visible:ring-1 focus-visible:ring-border-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}"
);
fs.writeFileSync('src/components/ui/Input.tsx', inp);

// 4. Patch Tabs
let tabs = fs.readFileSync('src/components/ui/Tabs.tsx', 'utf8');
tabs = tabs.replace(
  "flex items-center justify-center gap-2 px-3 py-1.5 typo-body text-sm font-medium radius-small transition-all",
  "flex items-center justify-center gap-2 px-3 py-1.5 typo-body text-sm font-medium radius-small transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-border-strong active:scale-[0.98]"
);
fs.writeFileSync('src/components/ui/Tabs.tsx', tabs);

