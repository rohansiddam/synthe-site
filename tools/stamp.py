#!/usr/bin/env python3
"""Version the shared assets so browsers never mix new pages with an old cached stylesheet.

Every page links /site.css?v=<hash> and /site.js?v=<hash>, where <hash> is the first 8 hex
characters of the file's SHA-256. Run this after editing site.css or site.js:

  python3 tools/stamp.py

tools/check_site.py fails if a page links an out-of-date version.
"""
import hashlib
import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
ASSETS = ("site.css", "site.js")


def versions() -> dict:
    return {a: hashlib.sha256((SITE / a).read_bytes()).hexdigest()[:8] for a in ASSETS}


def stamp() -> int:
    v = versions()
    changed = 0
    for page in sorted(SITE.glob("*.html")) + sorted((SITE / "tools").glob("*.html")):
        html = page.read_text(encoding="utf-8")
        new = html
        for asset, h in v.items():
            new = re.sub(rf'(["\'])/{re.escape(asset)}(?:\?v=[0-9a-f]+)?\1', rf'\1/{asset}?v={h}\1', new)
        if new != html:
            page.write_text(new, encoding="utf-8")
            changed += 1
    return changed


if __name__ == "__main__":
    n = stamp()
    print(f"site.css?v={versions()['site.css']} site.js?v={versions()['site.js']}: {n} page(s) updated")
    sys.exit(0)
