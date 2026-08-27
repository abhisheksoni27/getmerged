import os
import re

app_dir = "/Users/abhisheksoni/github/abhisheksoni27/opendoor/frontend/src/app"
report_rows = []

# Map of pages to check
pages = []
for root, dirs, files in os.walk(app_dir):
    for f in files:
        if f in ["page.tsx", "page.jsx"]:
            pages.append(os.path.join(root, f))

pages.sort()

def extract_headings_from_text(text):
    # Regex to find <h1...>, <h2...>, <h3...> in JSX/HTML
    h1s = re.findall(r'<h1\b[^>]*>(.*?)</h1>', text, re.DOTALL | re.IGNORECASE)
    h2s = re.findall(r'<h2\b[^>]*>(.*?)</h2>', text, re.DOTALL | re.IGNORECASE)
    h3s = re.findall(r'<h3\b[^>]*>(.*?)</h3>', text, re.DOTALL | re.IGNORECASE)
    return h1s, h2s, h3s

for page_path in pages:
    rel_path = os.path.relpath(page_path, app_dir)
    with open(page_path, "r", encoding="utf-8") as pf:
        p_text = pf.read()

    p_h1, p_h2, p_h3 = extract_headings_from_text(p_text)
    
    # Check imported client components in same dir or @/components
    comp_imports = re.findall(r'import\s+.*?(?:\{|\b)([A-Z][a-zA-Z0-9]+Client|[A-Z][a-zA-Z0-9]+Hero|[A-Z][a-zA-Z0-9]+Detail)\b.*?from\s+["\']([^"\']+)["\']', p_text)
    
    all_h1 = list(p_h1)
    all_h2 = list(p_h2)
    all_h3 = list(p_h3)

    for comp_name, import_src in comp_imports:
        # resolve file
        target_file = None
        if import_src.startswith("."):
            cand = os.path.normpath(os.path.join(os.path.dirname(page_path), import_src + ".tsx"))
            if os.path.exists(cand): target_file = cand
        elif import_src.startswith("@/"):
            cand = os.path.normpath(os.path.join(app_dir, "..", import_src[2:] + ".tsx"))
            if os.path.exists(cand): target_file = cand

        if target_file and os.path.exists(target_file):
            with open(target_file, "r", encoding="utf-8") as cf:
                c_text = cf.read()
            ch1, ch2, ch3 = extract_headings_from_text(c_text)
            all_h1.extend(ch1)
            all_h2.extend(ch2)
            all_h3.extend(ch3)

    clean_h1 = len([h for h in all_h1 if "sr-only" not in h]) # count visible vs sr-only
    status = "PASS" if len(all_h1) >= 1 and (len(all_h2) >= 1 or len(all_h3) >= 1) else "CHECK"
    report_rows.append({
        "route": "/" if rel_path == "page.tsx" else "/" + rel_path.replace("/page.tsx", ""),
        "file": rel_path,
        "h1_count": len(all_h1),
        "h2_count": len(all_h2),
        "h3_count": len(all_h3),
        "status": status,
        "sample_h1": re.sub(r'<[^>]+>', '', all_h1[0]).strip() if all_h1 else "None"
    })

print(f"Total Routes Scanned: {len(report_rows)}")
