import re

with open('src/components/SettingsModal.tsx', 'r') as f:
    content = f.read()

# Replace Theme Grid
theme_grid_regex = r'<div className="grid grid-cols-2 gap-2 bg-surface-subtle p-1 radius-medium border border-border-subtle">.*?<Moon className="w-3\.5 h-3\.5 shrink-0" \/>.*?<\/div>\s*<\/div>'
theme_replacement = """<Tabs
              fullWidth
              activeTab={preferences.theme}
              onChange={(id) => onUpdatePreferences({ theme: id as ThemePreference })}
              tabs={[
                { id: 'dark', label: 'Escuro', icon: <Moon className="w-3.5 h-3.5" /> },
                { id: 'system', label: 'Sistema', icon: <Laptop className="w-3.5 h-3.5" /> }
              ]}
            />"""
content = re.sub(r'<div className="grid grid-cols-2 gap-2 bg-surface-subtle p-1 radius-medium border border-border-subtle">\s*\{\[\s*\{\s*id:\s*\'dark\',.*?\}\s*\)\}\s*<\/div>', theme_replacement, content, flags=re.DOTALL)

# Replace Text Size Grid
text_size_replacement = """<Tabs
              fullWidth
              activeTab={preferences.textSize}
              onChange={(id) => onUpdatePreferences({ textSize: id as TextSizePreference })}
              tabs={[
                { id: 'small', label: 'Pequeno' },
                { id: 'default', label: 'Padrão' },
                { id: 'large', label: 'Grande' }
              ]}
            />"""
content = re.sub(r'<div className="grid grid-cols-3 gap-2 bg-surface-subtle p-1 radius-medium border border-border-subtle">\s*\{\[\s*\{\s*id:\s*\'small\',.*?\}\s*\)\}\s*<\/div>', text_size_replacement, content, flags=re.DOTALL)

# Replace Density Grid
density_replacement = """<Tabs
              fullWidth
              activeTab={preferences.density}
              onChange={(id) => onUpdatePreferences({ density: id as DensityPreference })}
              tabs={[
                { id: 'compact', label: 'Compacta', icon: <Minimize2 className="w-3.5 h-3.5" /> },
                { id: 'comfortable', label: 'Confortável', icon: <Maximize2 className="w-3.5 h-3.5" /> }
              ]}
            />"""
content = re.sub(r'<div className="grid grid-cols-2 gap-2 bg-surface-subtle p-1 radius-medium border border-border-subtle">\s*\{\[\s*\{\s*id:\s*\'compact\',.*?\}\s*\)\}\s*<\/div>', density_replacement, content, flags=re.DOTALL)

with open('src/components/SettingsModal.tsx', 'w') as f:
    f.write(content)
