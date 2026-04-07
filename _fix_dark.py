import re, os

# ── 1. ParentCard.tsx — remplace les bg-white internes ──
with open('components/ParentCard.tsx') as f:
    content = f.read()

content = content.replace('bg-white/80', 'bg-card/80')
content = content.replace('bg-white/60', 'bg-card/60')
content = content.replace('border-white/60', 'border-white/20 dark:border-white/10')
content = re.sub(r'\bbg-white\b', 'bg-card', content)
content = re.sub(r'\bborder-white\b', 'border-card', content)
content = re.sub(r'\btext-gray-700\b', 'text-primary', content)
content = re.sub(r'\btext-gray-600\b', 'text-secondary', content)
content = re.sub(r'\bborder-gray-200\b', 'border-border-default', content)
content = re.sub(r'\bhover:bg-gray-50\b', 'hover:bg-input', content)

with open('components/ParentCard.tsx', 'w') as f:
    f.write(content)
print("OK components/ParentCard.tsx")

# ── 2. Dark variants for pastel colors across all pages ──
PAGES = [
    'pages/ParentDashboard.tsx', 'pages/Children.tsx', 'pages/Nannies.tsx',
    'pages/Dashboard.tsx', 'pages/Feed.tsx', 'pages/Notifications.tsx',
    'pages/ReportsPage.tsx', 'pages/PaymentHistory.tsx', 'pages/PresenceSheets.tsx',
    'pages/SubscriptionManagement.tsx', 'pages/Assistant.tsx', 'pages/MonPlanning.tsx',
    'pages/ParentChildReports.tsx', 'pages/ParentChildSchedule.tsx',
    'pages/Settings.tsx', 'components/ParentCard.tsx',
]

COLORS = ['blue','yellow','purple','pink','orange','emerald','violet','red','cyan',
          'amber','rose','indigo','teal','sky','lime','fuchsia','slate']

dark_map = []
for c in COLORS:
    dark_map += [
        (f'bg-{c}-50',       f'bg-{c}-50 dark:bg-{c}-950'),
        (f'bg-{c}-100',      f'bg-{c}-100 dark:bg-{c}-900'),
        (f'border-{c}-100',  f'border-{c}-100 dark:border-{c}-800'),
        (f'border-{c}-200',  f'border-{c}-200 dark:border-{c}-800'),
        (f'text-{c}-800',    f'text-{c}-800 dark:text-{c}-200'),
        (f'text-{c}-700',    f'text-{c}-700 dark:text-{c}-300'),
    ]

for path in PAGES:
    if not os.path.exists(path):
        continue
    with open(path) as f:
        content = f.read()
    original = content
    n = 0
    for old, new in dark_map:
        pattern = re.compile(re.escape(old) + r'(?! dark:)')
        new_content, count = pattern.subn(new, content)
        content = new_content
        n += count
    if content != original:
        with open(path, 'w') as f:
            f.write(content)
        print(f"OK {path}: {n} dark: variants added")
    else:
        print(f"-- {path}: no changes")

# ── 3. Brand hex light colors → semantic tokens ──
HEX_BRAND = [
    ("'bg-[#a9ddf2]'",      "'bg-cyan-50 dark:bg-cyan-950'"),
    ('bg-[#eef9ff]',         'bg-accent-light'),
    ('bg-[#e6f4f7]',         'bg-accent-light'),
    ('bg-[#a9ddf2]',         'bg-accent-light'),
    ('hover:bg-[#d9f2fb]',   'hover:bg-accent'),
]
for path in PAGES:
    if not os.path.exists(path):
        continue
    with open(path) as f:
        content = f.read()
    original = content
    n = 0
    for old, new in HEX_BRAND:
        n += content.count(old)
        content = content.replace(old, new)
    if content != original:
        with open(path, 'w') as f:
            f.write(content)
        print(f"OK hex {path}: {n}")

print("\nAll done!")
