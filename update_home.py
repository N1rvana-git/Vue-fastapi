import re
content = open(r'd:\PycharmProjects\my-frontend\src\views\Home.vue', 'r', encoding='utf-8').read()
old_vars = '''--glass-bg: rgba(255, 255, 255, 0.55);\n  --glass-border: rgba(0, 0, 0, 0.06);\n  --glass-hover: rgba(255, 255, 255, 0.8);\n  --text-primary: #1A1A2E;\n  --text-secondary: #6B7280;\n  --accent: #4F46E5;\n  --accent-hover: #4338CA;\n  --accent-green: #059669;\n  --accent-red: #DC2626;\n  --radius-sm: 10px;\n  --radius-md: 16px;\n  --radius-lg: 24px;\n  --shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);\n  --shadow-md: 0 4px 20px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);\n  --shadow-lg: 0 20px 60px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04);'''
new_vars = '''--glass-bg: var(--card);\n  --glass-border: var(--border);\n  --glass-hover: var(--color-fd-background);\n  --text-primary: var(--foreground);\n  --text-secondary: var(--muted-foreground);\n  --accent: var(--primary);\n  --accent-hover: var(--ring);\n  --accent-green: var(--color-fd-success, #059669);\n  --accent-red: var(--destructive);\n  --radius-sm: var(--radius-sm);\n  --radius-md: var(--radius-md);\n  --radius-lg: var(--radius-lg);\n  --shadow-sm: 0 1px 3px rgba(0,0,0,0.04);\n  --shadow-md: 0 4px 20px rgba(0,0,0,0.06);\n  --shadow-lg: 0 20px 60px rgba(0,0,0,0.07);'''
content = content.replace(old_vars, new_vars)

old_bg = '''background: linear-gradient(180deg, #FAFAF8 0%, #F3F1ED 100%);\n  color: var(--text-primary);'''
new_bg = '''background: var(--background);\n  color: var(--foreground);'''
content = content.replace(old_bg, new_bg)
old_nav = '''background: rgba(255, 255, 255, 0.6);'''
new_nav = '''background: var(--card);\n  opacity: 0.9;'''
content = content.replace(old_nav, new_nav)
open(r'd:\PycharmProjects\my-frontend\src\views\Home.vue', 'w', encoding='utf-8').write(content)
