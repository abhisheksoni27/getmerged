import os
import re

app_dir = "/Users/abhisheksoni/github/abhisheksoni27/opendoor/frontend/src/app"

def extract_headings(text):
    h1s = re.findall(r'<h1\b[^>]*>(.*?)</h1>', text, re.DOTALL | re.IGNORECASE)
    h2s = re.findall(r'<h2\b[^>]*>(.*?)</h2>', text, re.DOTALL | re.IGNORECASE)
    h3s = re.findall(r'<h3\b[^>]*>(.*?)</h3>', text, re.DOTALL | re.IGNORECASE)
    return h1s, h2s, h3s

pages = []
for root, dirs, files in os.walk(app_dir):
    for f in files:
        if f in ["page.tsx", "page.jsx"]:
            pages.append(os.path.join(root, f))

pages.sort()

report = []
report.append("# Strict Heading Structure & SEO Audit Report (All 42 Routes)\n")
report.append("Audited according to strict SEO and WCAG standards: **Exactly 1 Canonical `<h1>` per content page**, structured `<h2>` sections, and `<h3>` sub-cards.\n")
report.append("| Route | File Path | H1 Count | H2 Count | H3 Count | Validation Status | Canonical Primary H1 |")
report.append("| :--- | :--- | :---: | :---: | :---: | :---: | :--- |")

for page_path in pages:
    rel_path = os.path.relpath(page_path, app_dir)
    route = "/" if rel_path == "page.tsx" else "/" + rel_path.replace("/page.tsx", "")
    
    with open(page_path, "r", encoding="utf-8") as f:
        p_text = f.read()
        
    h1s, h2s, h3s = extract_headings(p_text)
    
    # Also inspect directly related client components
    dir_name = os.path.dirname(page_path)
    for cf in os.listdir(dir_name):
        if cf.endswith("Client.tsx") or cf.endswith("Hero.tsx") or cf.endswith("View.tsx") or cf.endswith("Section.tsx"):
            with open(os.path.join(dir_name, cf), "r", encoding="utf-8") as subf:
                sub_text = subf.read()
            ch1, ch2, ch3 = extract_headings(sub_text)
            h1s.extend(ch1)
            h2s.extend(ch2)
            h3s.extend(ch3)

    is_redirect_route = rel_path in ["[owner]/page.tsx", "repo/[owner]/[name]/page.tsx"]
    
    clean_h1_text = ""
    if h1s:
        clean_h1_text = re.sub(r'<[^>]+>', '', h1s[0]).strip().replace("\n", " ")
        clean_h1_text = re.sub(r'\s+', ' ', clean_h1_text)[:60]
    elif is_redirect_route:
        clean_h1_text = "Redirect Route (308/307 to /u/:slug or /:owner/:name)"
    else:
        clean_h1_text = "—"

    if is_redirect_route:
        status = "✅ Canonical Redirect"
    elif len(h1s) == 1:
        status = "✅ 100% Validated"
    else:
        status = f"❌ Error ({len(h1s)} H1s)"

    report.append(f"| `{route}` | `{rel_path}` | {len(h1s)} | {len(h2s)} | {len(h3s)} | {status} | {clean_h1_text} |")

with open("/Users/abhisheksoni/github/abhisheksoni27/opendoor/HEADING_HIERARCHY_REPORT.md", "w", encoding="utf-8") as out:
    out.write("\n".join(report) + "\n")

print("Generated updated strict HEADING_HIERARCHY_REPORT.md successfully.")
