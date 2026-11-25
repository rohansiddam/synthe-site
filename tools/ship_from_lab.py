#!/usr/bin/env python3
"""Copy the site's pages from the design lab into this repo, ready to publish.

  python3 tools/ship_from_lab.py [LAB_DIR]     (default ~/src/synthe-core-lab)

The lab (a local folder, not in git) is where the pages are designed. This script copies the shipped pages and
everything they load, and turns the lab copies into site pages:
  - dive.html becomes index.html; links to dive.html become /
  - the lab-only footer line, the noindex tag, the About link (no About page yet) and lab-only scripts go
  - the booking page talks to the booking Worker (synthelabs/synthe-booking) with Cloudflare Turnstile on
  - every page gets the security policy (the same one as _headers), and indexable pages a canonical URL and
    Open Graph tags
Then run python3 tools/check_site.py.
"""
from __future__ import annotations

import os
import re
import shutil
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
LAB = Path(sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/src/synthe-core-lab"))
ORIGIN = "https://synthe.live"
BOOKING = "https://synthe-booking.rohansiddam.workers.dev"
TURNSTILE_SITEKEY = "0x4AAAAAAGQE878BLU1yVzg9"   # public by design: it goes on the page
CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; "
       "style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; "
       f"connect-src 'self' {BOOKING}; frame-src https://challenges.cloudflare.com; "
       "form-action 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests")

PAGES = {"dive.html": "index.html", "how.html": "how.html", "docs.html": "docs.html",
         "status.html": "status.html", "book.html": "book.html", "404.html": "404.html"}
FILES = ["dive.css", "page.css", "blackhole.css", "dive.js", "home.js", "modes.js", "hero3d.js", "material.js", "page.js",
         "book.js", "blackhole-live.js", "figtree-var.woff2", "ibm-plex-mono-normal-400-latin.woff2",
         "ibm-plex-mono-normal-500-latin.woff2", "logos/claude-code-mono.svg", "logos/codex-mono.svg",
         "logos/cursor-mono.svg", "logos/github-actions.svg", "logos/github.svg", "vendor/three/LICENSE",
         "vendor/three/three.module.min.js", "vendor/three/addons/utils/BufferGeometryUtils.js",
         "vendor/three/addons/geometries/RoundedBoxGeometry.js", "vendor/three/addons/loaders/SVGLoader.js"]


def head_tags(dst: str, html: str) -> str:
    """The security policy for every page; canonical URL and Open Graph tags for indexable pages."""
    tags = [f'<meta http-equiv="Content-Security-Policy" content="{CSP}">']
    if dst != "404.html":
        url = f"{ORIGIN}/" if dst == "index.html" else f"{ORIGIN}/{dst}"
        title = re.search(r"<title>([^<]+)</title>", html).group(1)
        desc = re.search(r'<meta name="description" content="([^"]+)">', html).group(1)
        tags += [f'<link rel="canonical" href="{url}">', '<meta property="og:type" content="website">',
                 f'<meta property="og:url" content="{url}">', f'<meta property="og:title" content="{title}">',
                 f'<meta property="og:description" content="{desc}">',
                 f'<meta property="og:image" content="{ORIGIN}/og-image.png">',
                 '<meta name="twitter:card" content="summary_large_image">',
                 '<link rel="icon" href="/favicon.svg" type="image/svg+xml">']
    return "\n".join(tags) + "\n"


def main() -> None:
    for f in FILES:
        dst = SITE / f
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(LAB / f, dst)
    for src, dst in PAGES.items():
        s = (LAB / src).read_text(encoding="utf-8")
        s = re.sub(r'<meta name="robots" content="noindex">\n?', "", s)
        s = re.sub(r"<script>/\* lab only: \?accent=.*?</script>\n?", "", s, flags=re.S)
        s = re.sub(r'\s*<p class="foot-proto">.*?</p>', "", s, flags=re.S)
        s = s.replace('<a href="about.html">About</a>', "").replace('<a href="/about.html">About</a>', "")
        s = s.replace('href="dive.html#', 'href="/#').replace('href="dive.html"', 'href="/"').replace('href="index.html"', 'href="/"')
        if src == "dive.html":
            s = re.sub(r'<meta name="description" content="[^"]*">',
                       '<meta name="description" content="Synthe keeps only the changes that measurably make things '
                       'better, and attaches the evidence. It improves your agent&rsquo;s prompt against your team&rsquo;s '
                       'checks, or any file a command can score.">', s, count=1)
        if src == "book.html":
            a = '<main id="main" class="pg bk" data-book data-engine="sample">'
            assert s.count(a) == 1, "book.html: engine attribute not found"
            s = s.replace(a, f'<main id="main" class="pg bk" data-book data-engine="server" data-endpoint="{BOOKING}" '
                             f'data-turnstile-sitekey="{TURNSTILE_SITEKEY}">')
        s = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>\n?', "", s)
        s = s.replace("<title>", head_tags(dst, s) + "<title>", 1)
        for bad in ("lab.html", "about.html", "Prototype", "local only", "dive.html"):
            assert bad not in s, f"{dst}: still has {bad!r}"
        (SITE / dst).write_text(s, encoding="utf-8")
        print("wrote", dst)


if __name__ == "__main__":
    main()
