#!/usr/bin/env python3
"""Shipped JavaScript per page, before (hand-written, repo root) and after (an Astro build folder).

  python3 tools/astro_proof/js_size.py astro/dist

Counts every executable script a page loads: external files plus inline <script> bodies.
JSON-LD (<script type="application/ld+json">) is data, not code, and is listed apart.
gzip is level 9 (GitHub Pages compresses on the fly; this is an upper bound on what it sends).
"""
import gzip
import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parents[2]
SCRIPT = re.compile(r"<script\b([^>]*)>(.*?)</script>", re.S)


def page_js(root: Path, page: str):
    html = (root / page).read_text(encoding="utf-8")
    files, inline, ldjson = [], b"", 0
    for attrs, body in SCRIPT.findall(html):
        if "application/ld+json" in attrs:
            ldjson += len(body.encode())
            continue
        src = re.search(r'\bsrc="([^"]+)"', attrs)
        if src:
            files.append(src.group(1).lstrip("/"))
        else:
            inline += body.encode()
    blobs = [(root / f).read_bytes() for f in files]
    raw = sum(map(len, blobs)) + len(inline)
    gz = sum(len(gzip.compress(b, 9)) for b in blobs) + (len(gzip.compress(inline, 9)) if inline else 0)
    return {"requests": len(files), "files_raw": sum(map(len, blobs)), "inline_raw": len(inline),
            "raw": raw, "gzip": gz, "ldjson": ldjson}


def main(dist: str) -> int:
    after_root = Path(dist).resolve()
    print("| Page | Build | Script requests | External JS | Inline JS | Total raw | Total gzip |")
    print("|---|---|---|---|---|---|---|")
    for page in ("index.html", "how.html"):
        b, a = page_js(SITE, page), page_js(after_root, page)
        for label, r in (("today", b), ("Astro", a)):
            print(f"| {page} | {label} | {r['requests']} | {r['files_raw']:,} B | {r['inline_raw']:,} B | "
                  f"{r['raw']:,} B | {r['gzip']:,} B |")
        print(f"| {page} | change | {a['requests'] - b['requests']:+d} | | | {100 * (a['raw'] - b['raw']) / b['raw']:+.1f}% | "
              f"{100 * (a['gzip'] - b['gzip']) / b['gzip']:+.1f}% |")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
