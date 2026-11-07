#!/usr/bin/env python3
import os
import re

solid_bg_patterns = [
    r'bg-\[var\(--color-primary\)\]',
    r'bg-emerald-[5678]00',
    r'bg-blue-[5678]00',
    r'bg-purple-[5678]00',
    r'bg-rose-[5678]00',
    r'bg-red-[5678]00',
    r'bg-amber-[5678]00',
    r'bg-indigo-[5678]00',
    r'bg-teal-[5678]00',
    r'bg-cyan-[5678]00',
    r'bg-black',
    r'bg-\[#[0-9a-fA-F]{6}\]',
    r'bg-neutral-900',
    r'bg-gray-900',
    r'bg-zinc-900',
    r'bg-zinc-950',
]

def process_classes(classes: str) -> str:
    has_solid_bg = any(re.search(pat, classes) for pat in solid_bg_patterns)
    
    # Replace white/zinc borders with subtle border token
    classes = re.sub(r'border-white/\[0\.\d+\]|border-white/\d+', 'border-[var(--border-subtle)]', classes)
    classes = re.sub(r'border-zinc-[78]00', 'border-[var(--border-subtle)]', classes)
    
    # Replace dark card/panel backgrounds with standard surface
    # Only if NOT a button or badge
    if not re.search(r'\b(btn|button|badge|rounded-full)\b', classes):
        classes = re.sub(r'\bbg-zinc-900/[0-9]+\b|\bbg-zinc-950/[0-9]+\b|\bbg-black/40\b|\bbg-black/50\b|\bbg-black/60\b', 'bg-[var(--bg-surface)]', classes)
        classes = re.sub(r'\bbg-zinc-900\b|\bbg-zinc-950\b', 'bg-[var(--bg-surface)]', classes)
        # Re-check has_solid_bg after replacing background
        has_solid_bg = any(re.search(pat, classes) for pat in solid_bg_patterns)

    if not has_solid_bg:
        classes = re.sub(r'\btext-white\b', 'text-[var(--text-primary)]', classes)
        classes = re.sub(r'\btext-zinc-100\b|\btext-zinc-200\b', 'text-[var(--text-primary)]', classes)
        classes = re.sub(r'\btext-zinc-300\b|\btext-zinc-400\b', 'text-[var(--text-secondary)]', classes)
        classes = re.sub(r'\bhover:text-white\b', 'hover:text-[var(--text-primary)]', classes)
        classes = re.sub(r'\bhover:text-zinc-100\b|\bhover:text-zinc-200\b|\bhover:text-zinc-300\b', 'hover:text-[var(--text-primary)]', classes)
    
    return classes

def transform_content(content: str) -> str:
    # Double-quote class/className
    def repl_dq(match):
        prefix = match.group(1)
        classes = match.group(2)
        return f'{prefix}="{process_classes(classes)}"'

    # Single-quote class/className
    def repl_sq(match):
        prefix = match.group(1)
        classes = match.group(2)
        return f"{prefix}='{process_classes(classes)}'"

    # Template literal class/className={`...`}
    def repl_tl(match):
        prefix = match.group(1)
        classes = match.group(2)
        return f"{prefix}={{`{process_classes(classes)}`}}"

    content = re.sub(r'(class(?:Name)?)=\"([^\"]*)\"', repl_dq, content)
    content = re.sub(r'(class(?:Name)?)=\'([^\']*)\'', repl_sq, content)
    content = re.sub(r'(class(?:Name)?)=\{\`([^\`]*)\`\}', repl_tl, content)
    return content

def main():
    base_dir = os.path.join(os.getcwd(), 'frontend/src')
    transformed = 0
    total_files = 0

    for root, _, files in os.walk(base_dir):
        for f in files:
            if f.endswith('.tsx') or f.endswith('.ts'):
                total_files += 1
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                    original = fp.read()
                updated = transform_content(original)
                if updated != original:
                    with open(path, 'w', encoding='utf-8') as fp:
                        fp.write(updated)
                    transformed += 1
                    print(f"Updated: {os.path.relpath(path, os.getcwd())}")

    print(f"\nCompleted: {transformed} of {total_files} files transformed.")

if __name__ == '__main__':
    main()
