import os
import re

app_dir = "/Users/abhisheksoni/github/abhisheksoni27/opendoor/frontend/src"

pages = []
for root, dirs, files in os.walk(os.path.join(app_dir, "app")):
    for f in files:
        if f.endswith(".tsx") or f.endswith(".jsx"):
            pages.append(os.path.join(root, f))

components = []
for root, dirs, files in os.walk(os.path.join(app_dir, "components")):
    for f in files:
        if f.endswith(".tsx") or f.endswith(".jsx"):
            components.append(os.path.join(root, f))

all_target_files = sorted(pages + components)

updated_files = []

for file_path in all_target_files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    new_content = content

    # 1. Backgrounds & Containers -> Liquid Crystal Glass Surfaces
    new_content = re.sub(r'\bbg-zinc-950\b', 'bg-black', new_content)
    new_content = re.sub(r'\bbg-slate-900\b', 'glass-panel', new_content)
    new_content = re.sub(r'\bbg-zinc-900/80\b', 'glass-panel', new_content)
    new_content = re.sub(r'\bbg-zinc-900/90\b', 'glass-panel', new_content)
    new_content = re.sub(r'\bbg-zinc-900\b', 'glass-card', new_content)

    # 2. Text Color Contrast & Luminance
    # Ensure headings and critical numbers are pure white
    new_content = re.sub(r'\btext-zinc-100\b', 'text-white', new_content)
    new_content = re.sub(r'\btext-zinc-50\b', 'text-white', new_content)
    # Ensure body text is high contrast zinc-200/300 rather than muted 400/500
    new_content = re.sub(r'\btext-zinc-400\b', 'text-zinc-300', new_content)
    new_content = re.sub(r'\btext-zinc-500\b', 'text-zinc-400', new_content)

    # 3. Micro-Badges & Tags (Liquid Crystal Glow Chips)
    new_content = re.sub(r'bg-emerald-950/80 border-emerald-800/80 text-emerald-300', 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300', new_content)
    new_content = re.sub(r'bg-blue-950/80 border-blue-800/80 text-blue-300', 'bg-sky-500/15 border border-sky-500/30 text-sky-300', new_content)
    new_content = re.sub(r'bg-amber-950/80 border-amber-800/80 text-amber-300', 'bg-amber-500/15 border border-amber-500/30 text-amber-300', new_content)
    new_content = re.sub(r'bg-rose-950/80 border-rose-800/80 text-rose-300', 'bg-rose-500/15 border border-rose-500/30 text-rose-300', new_content)

    # 4. Spacing & Border Polishing
    new_content = re.sub(r'border-white/\[0\.06\]', 'border-white/[0.09]', new_content)
    new_content = re.sub(r'border-white/\[0\.08\]', 'border-white/[0.1]', new_content)

    if new_content != content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        updated_files.append(os.path.relpath(file_path, app_dir))

print(f"Applied Liquid Crystal styling to {len(updated_files)} files across app and components.")
