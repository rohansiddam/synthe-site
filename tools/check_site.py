#!/usr/bin/env python3
"""Pre-ship checks for synthe.live. CI runs this on every push and pull request.

  python3 tools/check_site.py

Since the Nov 25, 2026 redesign, the site is six pages made in the design lab (see tools/ship_from_lab.py):
index, how, docs, status, book and 404. The old pages are redirects. It fails (exit 1) when:
  - a page misses its title, description, one <h1>, <main id="main"> or the skip link
  - the header or the footer differs between pages
  - a page has no security policy, or its policy differs from the one in _headers
  - an indexable page misses its canonical URL or Open Graph image
  - a page loads a script, style, font or image from another origin
  - outward-facing copy has an em dash, or a phrase the 1.11.0 brief rules out
  - an internal link or #anchor points nowhere, or a file a page loads is missing
  - sitemap.xml and the indexable pages disagree
  - a redirect page points at a page that does not exist
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
PAGES = sorted(SITE.glob("*.html"))
COPY = PAGES + [SITE / "llms.txt", SITE / "llms-full.txt"]
BANNED = ["github:synthelabs", "EVENT_CODE", "TEAM_CODE", "event credit", "npx synthe pilot", "synthe/pilot",
          "Crimson", "synthe-crimson", "Redo"]

errors: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def text(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def is_redirect(html: str) -> bool:
    return 'http-equiv="refresh"' in html


def norm_links(block: str) -> str:
    """The 404 page uses root-absolute links, the homepage's footer brand points at #top, the homepage's header is
    see-through (no "solid") and only the homepage, which moves, has the Reduce motion button: compare them as equal."""
    block = re.sub(r'\s+aria-current="page"', "", block)
    block = block.replace('class="nav solid"', 'class="nav"')
    block = re.sub(r' &middot; <button type="button" class="foot-motion" data-motion>Reduce motion</button>', "", block)
    block = re.sub(r'href="/(?!/)', 'href="', block)
    return block.replace('href="#top"', 'href=""')


def csp_of(html: str) -> str | None:
    m = re.search(r'<meta http-equiv="Content-Security-Policy" content="([^"]+)">', html)
    return m.group(1) if m else None


headers_csp = re.search(r"Content-Security-Policy: (.+)", text(SITE / "_headers")).group(1).strip()
expected_csp = headers_csp.replace("frame-ancestors 'none'; ", "")   # a meta tag cannot carry frame-ancestors

navs, foots, indexable = {}, {}, set()
for p in PAGES:
    h = text(p)
    csp = csp_of(h)
    if csp is None:
        err(f"{p.name}: no security policy (CSP meta tag)")
    elif csp != expected_csp:
        err(f"{p.name}: its security policy differs from _headers")
    if is_redirect(h):
        m = re.search(r'http-equiv="refresh" content="0; url=([^"]+)"', h)
        to = m.group(1) if m else ""
        if not to.startswith("https://") and not (SITE / (to.lstrip("/") or "index.html")).exists():
            err(f"{p.name}: redirects to {to!r}, which does not exist")
        if 'name="robots" content="noindex"' not in h:
            err(f"{p.name}: a redirect page must be noindex")
        continue
    for label, pattern in (("<title>", r"<title>[^<]+</title>"), ("meta description", r'<meta name="description" content="[^"]+">'),
                           ("<main id=main>", r'<main id="main"[\s>]'), ("skip link", r'class="skip" href="#main"')):
        if not re.search(pattern, h):
            err(f"{p.name}: missing {label}")
    if len(re.findall(r"<h1[\s>]", h)) != 1:
        err(f"{p.name}: needs exactly one <h1>")
    nav = re.search(r'<nav class="nav[^"]*" data-nav.*?</nav>', h, re.S)
    foot = re.search(r'<footer class="foot">.*?</footer>', h, re.S)
    if nav:
        navs[p.name] = norm_links(nav.group(0))
    else:
        err(f"{p.name}: no site header")
    if foot:
        foots[p.name] = norm_links(foot.group(0))
    else:
        err(f"{p.name}: no site footer")
    if p.name != "404.html" and 'name="robots" content="noindex"' not in h:
        indexable.add(p.name)
        for needle in ('rel="canonical"', 'property="og:url"', 'property="og:image"'):
            if needle not in h:
                err(f"{p.name}: missing {needle}")

for name, group in (("header", navs), ("footer", foots)):
    variants: dict[str, list[str]] = {}
    for page, html in group.items():
        variants.setdefault(html, []).append(page)
    if len(variants) > 1:
        err(f"the {name} differs between pages: {' | '.join(', '.join(v) for v in sorted(variants.values(), key=len, reverse=True))}")

# nothing loads from another origin (the booking page loads Cloudflare Turnstile from its script, allowed by the policy)
external = [
    (r'<script[^>]+src="(?:https?:)?//', "external script"),
    (r'<link[^>]+rel="(?:stylesheet|preload|modulepreload|icon|preconnect)"[^>]+href="(?:https?:)?//', "external stylesheet, font or icon"),
    (r'<(?:img|iframe|video|audio|source)[^>]+src="(?:https?:)?//', "external media"),
    (r'url\((?:["\'])?(?:https?:)?//', "external CSS url()"),
]
for p in PAGES + sorted(SITE.glob("*.css")):
    h = text(p)
    for pattern, label in external:
        for m in re.finditer(pattern, h):
            err(f"{p.name}: {label}: {h[m.start():m.start() + 90]!r}")

# copy: no em dashes, nothing the brief rules out
for p in COPY:
    if not p.exists():
        continue
    for i, line in enumerate(text(p).splitlines(), 1):
        if "—" in line or "&mdash;" in line:
            err(f"{p.name}:{i}: em dash in copy")
        for b in BANNED:
            if b in line:
                err(f"{p.name}:{i}: {b!r} is ruled out (website brief, 1.11.0)")

# internal links, anchors, and the files pages load
all_ids = {p.name: set(re.findall(r'\sid="([^"]+)"', text(p))) for p in PAGES}
for p in PAGES:
    h = text(p)
    if is_redirect(h):
        continue
    for ref in re.findall(r'(?:href|src)="([^"]+)"', h):
        if re.match(r"(?:https?:|mailto:|data:|//)", ref):
            continue
        path, _, frag = ref.partition("#")
        path = path.split("?")[0].lstrip("/") or (p.name if ref.startswith("#") else "index.html")
        if not (SITE / path).exists():
            err(f"{p.name}: link to {ref!r}: no such file")
        elif frag and path.endswith(".html") and frag not in all_ids.get(path, set()):
            err(f"{p.name}: link to {ref!r}: no such anchor")

# the sitemap lists exactly the indexable pages
listed = set()
for loc in re.findall(r"<loc>https://synthe\.live/([^<]*)</loc>", text(SITE / "sitemap.xml")):
    listed.add(loc or "index.html")
for page in sorted(indexable - listed):
    err(f"sitemap.xml: missing {page}")
for page in sorted(listed - indexable):
    err(f"sitemap.xml: lists {page}, which is not an indexable page")

for e in errors:
    print("ERROR", e)
print(f"{len(PAGES)} pages checked, {len(errors)} errors")
sys.exit(1 if errors else 0)
