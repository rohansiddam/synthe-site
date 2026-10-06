#!/usr/bin/env python3
"""Pre-ship checks for synthe.live. CI runs this on every push and pull request.

  python3 tools/check_site.py

It fails (exit 1) when:
  - a number on a page disagrees with facts.json (see tools/facts.py)
  - the header or the footer differs between pages
  - a page misses the shared head: CSP, site.css, site.js, title, description, skip link, main
  - a page loads anything from another origin (scripts, styles, fonts, images)
  - outward-facing copy contains an em dash (DESIGN_PLAYBOOK.md, section 8)
  - an internal link or #anchor points nowhere
  - sitemap.xml and the indexable pages disagree
  - the CSP <meta> tag and the CSP in _headers disagree
  - a page links an out-of-date site.css or site.js version (run tools/stamp.py)
  - the design-partner form's privacy copy doesn't match where the form sends data
It warns (exit 0) while the form uses the email fallback (no Formspree form ID yet).
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SITE / "tools"))
import facts  # noqa: E402
import stamp  # noqa: E402

PAGES = sorted(SITE.glob("*.html"))
COPY_FILES = PAGES + [SITE / "llms.txt", SITE / "llms-full.txt", SITE / ".well-known" / "security.txt"]
IN_CI = os.environ.get("GITHUB_ACTIONS") == "true"

errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def text(p: Path) -> str:
    return p.read_text(encoding="utf-8")


def block(html: str, pattern: str) -> str | None:
    m = re.search(pattern, html, re.S)
    return m.group(0) if m else None


def ids(html: str) -> set[str]:
    return set(re.findall(r'\sid="([^"]+)"', html))


def noindex(html: str) -> bool:
    return 'name="robots" content="noindex"' in html


# 1. facts
for problem in facts.mismatches(facts.load()):
    err(f"facts: {problem}")

# 2. shared chrome and head
headers, footers = {}, {}
for p in PAGES:
    h = text(p)
    head = block(h, r'<header class="site-head">.*?</header>')
    foot = block(h, r'<footer class="site-foot">.*?</footer>')
    if not head:
        err(f"{p.name}: no shared site header")
    else:
        headers[p.name] = head.replace(' aria-current="page"', "")
    if not foot:
        err(f"{p.name}: no shared site footer")
    else:
        footers[p.name] = foot
    must = {
        "CSP meta tag": 'http-equiv="Content-Security-Policy"',
        "site.css": 'href="/site.css?v=',
        "site.js": 'src="/site.js?v=',
        "skip link": 'class="skip-link" href="#main"',
        "<main id=main>": '<main id="main">',
        "meta description": '<meta name="description"',
        "theme head script": 'localStorage.getItem("synthe-theme")',
    }
    for label, needle in must.items():
        if needle not in h:
            err(f"{p.name}: missing {label}")
    if len(re.findall(r"<h1[\s>]", h)) != 1:
        err(f"{p.name}: needs exactly one <h1>")
    if not re.search(r"<title>[^<]+</title>", h):
        err(f"{p.name}: missing <title>")
    if not noindex(h):
        for needle in ('rel="canonical"', 'property="og:url"', 'property="og:image"'):
            if needle not in h:
                err(f"{p.name}: missing {needle}")

for name, group in (("header", headers), ("footer", footers)):
    variants = {}
    for page, html in group.items():
        variants.setdefault(html, []).append(page)
    if len(variants) > 1:
        sizes = sorted(variants.values(), key=len, reverse=True)
        err(f"the {name} differs between pages: {' | '.join(', '.join(v) for v in sizes)}")

# 3. nothing loads from another origin
external = [
    (r'<script[^>]+src="(?:https?:)?//', "external script"),
    (r'<link[^>]+rel="(?:stylesheet|preload|modulepreload|icon|apple-touch-icon|preconnect|dns-prefetch)"[^>]+href="(?:https?:)?//', "external stylesheet, font or icon"),
    (r'<link[^>]+href="(?:https?:)?//[^"]+"[^>]+rel="(?:stylesheet|preload|preconnect)"', "external stylesheet or preconnect"),
    (r'<(?:img|iframe|video|audio|source)[^>]+src="(?:https?:)?//', "external media"),
    (r'url\((?:["\'])?(?:https?:)?//', "external CSS url()"),
    (r'@import', "CSS @import"),
]
for p in PAGES + [SITE / "site.css"]:
    h = text(p)
    for pattern, label in external:
        for m in re.finditer(pattern, h):
            err(f"{p.name}: {label}: {h[m.start():m.start() + 90]!r}")

# 4. no em dashes in outward-facing copy
for p in COPY_FILES:
    if p.exists():
        for i, line in enumerate(text(p).splitlines(), 1):
            if "—" in line:
                err(f"{p.relative_to(SITE)}:{i}: em dash in copy")

# 5. internal links and anchors
page_ids = {p.name: ids(text(p)) for p in PAGES}
for p in PAGES:
    h = text(p)
    for href in re.findall(r'href="([^"]+)"', h):
        if re.match(r"^(?:https?:|mailto:|tel:|data:)", href):
            continue
        path, _, frag = href.partition("#")
        path = path.split("?", 1)[0]
        if path in ("", "/"):
            target = p.name if path == "" else "index.html"
        else:
            target = path.lstrip("/")
        if not (SITE / target).exists():
            err(f"{p.name}: link to missing file {href}")
            continue
        if frag and target.endswith(".html") and frag not in page_ids.get(target, set()):
            err(f"{p.name}: link to missing anchor {href}")

# 6. sitemap
sitemap = text(SITE / "sitemap.xml")
listed = {u.replace("https://synthe.live/", "") or "index.html" for u in re.findall(r"<loc>([^<]+)</loc>", sitemap)}
indexable = {p.name for p in PAGES if not noindex(text(p))}
for missing in sorted(indexable - listed):
    err(f"sitemap.xml: missing {missing}")
for extra in sorted(listed - indexable):
    err(f"sitemap.xml: lists {extra}, which is not an indexable page")

# 7. CSP meta tag matches _headers (minus frame-ancestors, which a meta tag can't carry)
hdr = re.search(r"Content-Security-Policy: (.+)", text(SITE / "_headers"))
hdr_csp = hdr.group(1).replace(" frame-ancestors 'none';", "").strip() if hdr else None
for p in PAGES:
    m = re.search(r'http-equiv="Content-Security-Policy" content="([^"]+)"', text(p))
    if m and hdr_csp and m.group(1).strip() != hdr_csp:
        err(f"{p.name}: CSP meta tag differs from _headers")

# 7b. Shared assets carry their current version, so no browser mixes new pages with an old cached file
current = stamp.versions()
for p in PAGES:
    h = text(p)
    for asset, v in current.items():
        found = re.findall(rf'/{re.escape(asset)}\?v=([0-9a-f]+)', h)
        if found and any(f != v for f in found):
            err(f"{p.name}: links an old {asset} version; run python3 tools/stamp.py")

# 8. The design-partner form: its privacy copy must match where it sends data.
#    data-formspree="" -> the form opens the visitor's email app; nothing goes to a third party.
#    data-formspree="<id>" -> the form posts to Formspree, and the copy must say so.
def visible(html: str) -> str:
    return re.sub(r"<script.*?</script>|<style.*?</style>|<!--.*?-->", "", html, flags=re.S)


index_html = text(SITE / "index.html")
fs = re.search(r'id="partner-form"[^>]*data-formspree="([^"]*)"', index_html)
if not fs:
    err("index.html: the partner form has no data-formspree attribute")
else:
    form_id = fs.group(1).strip()
    copy = {name: visible(text(SITE / name)) for name in ("index.html", "status.html")}
    if not form_id:
        warn("index.html: the partner form uses the email fallback (no Formspree form ID). See HOSTING.md.")
        for name, html in copy.items():
            if "Formspree" in html:
                err(f"{name}: copy mentions Formspree, but the form sends nothing there (data-formspree is empty)")
    else:
        if not re.fullmatch(r"[A-Za-z0-9]+", form_id):
            err(f"index.html: data-formspree '{form_id}' doesn't look like a Formspree form ID")
        for name, html in copy.items():
            if "Formspree" not in html:
                err(f"{name}: the form posts to Formspree, so this page's privacy copy must say so")
            if "Nothing is stored or sent on its own" in html:
                err(f"{name}: still says nothing is sent, but the form posts to Formspree")

# 9. Homepage length budget (DESIGN_PLAYBOOK.md section 12): new detail belongs on a deeper page
home_main = re.search(r"<main[^>]*>(.*?)</main>", index_html, re.S)
if home_main:
    shown = visible(home_main.group(1))
    # count what a visitor sees by default: collapsed FAQ answers and screen-reader-only text add no length
    shown = re.sub(r'<div class="faq-a">.*?</div>', " ", shown, flags=re.S)
    shown = re.sub(r'<(p|span) class="sr-only">.*?</\1>', " ", shown, flags=re.S)
    words = len(re.sub(r"<[^>]+>", " ", shown).split())
    if words > 900:
        warn(f"index.html: the homepage has {words} words of main text (budget 900). Move detail to how.html or docs.html.")

for w in warnings:
    print(f"::warning::{w}" if IN_CI else f"warning: {w}")
for e in errors:
    print(f"::error::{e}" if IN_CI else f"error: {e}")
print(f"{len(PAGES)} pages checked: {len(errors)} error(s), {len(warnings)} warning(s)")
sys.exit(1 if errors else 0)
