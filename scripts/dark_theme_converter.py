import os
import re

FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/src"))

LIGHT_PATTERNS = [
    # Backgrounds: gradients and solid lights
    (r'bg-gradient-to-[a-z0-9-]+ from-[a-z0-9-/]+ via-[a-z0-9-/]+ to-[a-z0-9-/]+', 'glass-panel'),
    (r'bg-gradient-to-[a-z0-9-]+ from-[a-z0-9-/]+ to-[a-z0-9-/]+', 'glass-panel'),
    (r'\bbg-\[#fafafa\]\b', 'bg-black'),
    (r'\bbg-\[#f8fafc\]\b', 'bg-black'),
    (r'\bbg-\[#f9fafb\]\b', 'bg-black'),
    (r'\bbg-\[#faf9f6\]\b', 'bg-black'),
    (r'\bbg-\[#fffdf6\]\b', 'bg-black'),
    (r'\bbg-\[#fffdfa\]\b', 'glass-panel'),
    (r'\bbg-\[#fff8db\]\b', 'glass-panel'),
    (r'\bbg-\[#faf5ff\]\b', 'glass-panel'),
    (r'\bbg-\[#f0fdf4\]\b', 'glass-panel'),
    (r'\bbg-\[#eff6ff\]\b', 'glass-panel'),
    (r'\bbg-\[#fef2f2\]\b', 'glass-panel'),
    (r'\bbg-white\b(?![\w/-])', 'glass-card'),
    (r'\bbg-zinc-50\b', 'glass-card'),
    (r'\bbg-slate-50\b', 'glass-card'),
    (r'\bbg-gray-50\b', 'glass-card'),
    (r'\bbg-amber-50\b', 'bg-amber-950/40 border border-amber-500/20'),
    (r'\bbg-amber-100\b', 'bg-amber-950/40 border border-amber-500/20'),
    (r'\bbg-emerald-50\b', 'bg-emerald-950/40 border border-emerald-500/20'),
    (r'\bbg-emerald-100\b', 'bg-emerald-950/40 border border-emerald-500/20'),
    (r'\bbg-blue-50\b', 'bg-blue-950/40 border border-blue-500/20'),
    (r'\bbg-blue-100\b', 'bg-blue-950/40 border border-blue-500/20'),
    (r'\bbg-purple-50\b', 'bg-purple-950/40 border border-purple-500/20'),
    (r'\bbg-purple-100\b', 'bg-purple-950/40 border border-purple-500/20'),
    (r'\bbg-rose-50\b', 'bg-rose-950/40 border border-rose-500/20'),
    (r'\bbg-rose-100\b', 'bg-rose-950/40 border border-rose-500/20'),
    (r'\bbg-indigo-50\b', 'bg-indigo-950/40 border border-indigo-500/20'),
    (r'\bbg-indigo-100\b', 'bg-indigo-950/40 border border-indigo-500/20'),
    (r'\bbg-cyan-50\b', 'bg-cyan-950/40 border border-cyan-500/20'),
    (r'\bbg-cyan-100\b', 'bg-cyan-950/40 border border-cyan-500/20'),
    (r'\bbg-yellow-50\b', 'bg-amber-950/40 border border-amber-500/20'),
    (r'\bbg-yellow-100\b', 'bg-amber-950/40 border border-amber-500/20'),
    (r'\bbg-yellow-200\b', 'bg-amber-400/20 text-amber-400 border border-amber-500/30'),
    (r'\bbg-yellow-300\b', 'bg-amber-400 text-zinc-950'),
    (r'\bbg-\[#ffd93d\]\b', 'bg-white text-zinc-950'),
    (r'\bbg-\[#ffdf5c\]\b', 'bg-zinc-200 text-zinc-950'),

    # Text Colors that are dark/black on former light backgrounds
    (r'\btext-slate-900\b', 'text-zinc-100'),
    (r'\btext-slate-950\b', 'text-zinc-100'),
    (r'\btext-zinc-900\b', 'text-zinc-100'),
    (r'\btext-zinc-950\b', 'text-zinc-100'),
    (r'\btext-gray-900\b', 'text-zinc-100'),
    (r'\btext-gray-950\b', 'text-zinc-100'),
    (r'\btext-black\b', 'text-zinc-100'),
    (r'\btext-emerald-900\b', 'text-emerald-300'),
    (r'\btext-emerald-950\b', 'text-emerald-300'),
    (r'\btext-blue-900\b', 'text-blue-300'),
    (r'\btext-blue-950\b', 'text-blue-300'),
    (r'\btext-amber-900\b', 'text-amber-300'),
    (r'\btext-amber-950\b', 'text-amber-300'),
    (r'\btext-purple-900\b', 'text-purple-300'),
    (r'\btext-purple-950\b', 'text-purple-300'),
    (r'\btext-rose-900\b', 'text-rose-300'),
    (r'\btext-rose-950\b', 'text-rose-300'),
    (r'\btext-indigo-900\b', 'text-indigo-300'),
    (r'\btext-indigo-950\b', 'text-indigo-300'),

    # Borders
    (r'\bborder-black\b', 'border-white/[0.08]'),
    (r'\bborder-brand-dark\b', 'border-white/[0.08]'),
    (r'\bborder-zinc-900\b', 'border-white/[0.08]'),
    (r'\bborder-slate-900\b', 'border-white/[0.08]'),
    (r'\bborder-gray-900\b', 'border-white/[0.08]'),
    (r'\bdivide-black\b', 'divide-white/[0.08]'),
    (r'\bdivide-zinc-200\b', 'divide-white/[0.08]'),
    (r'\bdivide-slate-200\b', 'divide-white/[0.08]'),
]

def scan_and_convert():
    total_files_changed = 0
    total_replacements = 0

    for root, dirs, files in os.walk(FRONTEND_DIR):
        for f in files:
            if f.endswith(('.tsx', '.ts', '.css')):
                fpath = os.path.join(root, f)
                with open(fpath, 'r', encoding='utf-8') as file:
                    content = file.read()

                original = content
                for pattern, replacement in LIGHT_PATTERNS:
                    new_content, count = re.subn(pattern, replacement, content)
                    if count > 0:
                        content = new_content
                        total_replacements += count

                if content != original:
                    with open(fpath, 'w', encoding='utf-8') as file:
                        file.write(content)
                    total_files_changed += 1
                    print(f"Fixed: {fpath.replace(FRONTEND_DIR, 'src')}")

    print(f"\nDone. Updated {total_files_changed} files with {total_replacements} color & contrast fixes.")

if __name__ == "__main__":
    scan_and_convert()
