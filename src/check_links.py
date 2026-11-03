"""Check every link in docs/: internal files and #anchors must exist; external URLs are listed with their HTTP status.

    python src/check_links.py [--external]
"""

import re
import sys
import urllib.request
from pathlib import Path

DOCS = Path(__file__).resolve().parent.parent / "docs"
bad, external = [], set()
pages = {p: p.read_text(encoding="utf8") for p in DOCS.rglob("*.html")}
ids = {p: set(re.findall(r'\sid="([^"]+)"', html)) for p, html in pages.items()}
for page, html in pages.items():
    for ref in re.findall(r'(?:href|src)="([^"]+)"', html):
        if ref.startswith(("http://", "https://")):
            external.add(ref.replace("&amp;", "&"))
            continue
        ref = ref.split("?", 1)[0]  # version tags like styles.css?v=... point at the same file
        if page.name == "404.html" and ref.startswith("/"):
            target, anchor = (DOCS / ref.lstrip("/").split("#")[0]), None
        else:
            path, _, anchor = ref.partition("#")
            target = (page.parent / path).resolve() if path else page
        if target.is_dir():
            target = target / "index.html"
        if not target.exists():
            bad.append(f"{page.relative_to(DOCS)}: missing {ref}")
        elif anchor and anchor not in ids.get(target, set()):
            bad.append(f"{page.relative_to(DOCS)}: no #{anchor} in {target.name}")
print(f"{len(pages)} pages, internal links: {'OK' if not bad else 'PROBLEMS'}")
print("\n".join(bad))
for url in sorted(external):
    status = ""
    if "--external" in sys.argv:
        try:
            req = urllib.request.Request(url, method="GET", headers={"User-Agent": "Mozilla/5.0"})
            status = urllib.request.urlopen(req, timeout=15).status
        except Exception as e:  # noqa: BLE001 - report whatever went wrong
            status = getattr(e, "code", type(e).__name__)
    print(f"  {status!s:>5}  {url}")
sys.exit(1 if bad else 0)
