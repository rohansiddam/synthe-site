#!/usr/bin/env python3
"""One-time converter for the Astro proof (branch astro/two-page-proof, do not merge).

Splits the hand-written warm pages into the Astro layout's slots and writes:
  astro/src/components/SiteHeader.astro   the shared <header class="synav"> (aria-current from a prop)
  astro/src/components/SiteFooter.astro   the shared <footer class="b2-footer"> (page CTA is a slot)
  astro/src/pages/<page>.astro            each page's own head, markup and scripts

  python3 tools/astro_proof/convert.py index.html how.html

The source pages are read, never written. Re-run it if a source page changes before the real move.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parents[2]
OUT = SITE / "astro" / "src"
WARM = ["index.html", "how.html", "docs.html", "partner.html"]
HEADER_RE = re.compile(r'<header class="synav".*?</header>', re.S)
CUR = ' aria-current="page"'


def read(name: str) -> str:
    return (SITE / name).read_text(encoding="utf-8")


def slug(name: str) -> str:
    return name.removesuffix(".html")


# ---------- shared chrome ----------

def header_component() -> str:
    """The header with every aria-current turned into an expression on the page's own links."""
    stripped, inserts = None, {}
    for page in WARM:
        h = HEADER_RE.search(read(page)).group(0)
        bare, offset, pos = h.replace(CUR, ""), 0, []
        for m in re.finditer(re.escape(CUR), h):
            pos.append(m.start() - offset)
            offset += len(CUR)
        if stripped is None:
            stripped = bare
        assert bare == stripped, f"{page}: header differs from the others beyond aria-current"
        for p in pos:
            inserts.setdefault(p, []).append(slug(page))
    keys = sorted(inserts)
    chunks = [stripped[a:b] for a, b in zip([0] + keys, keys + [len(stripped)])]
    marks = [inserts[k] for k in keys]
    return ("---\n/* The shared site header. check_site.py compares it byte for byte across the warm pages (only\n"
            "   aria-current may differ). Astro would re-serialize markup (<path/> becomes <path></path>), and docs.html\n"
            "   and partner.html are still hand-written, so during the move the header is emitted raw. Once every warm\n"
            "   page is built by Astro, this can become plain markup again. */\n"
            "interface Props { current: string }\nconst { current } = Astro.props;\n"
            f"const CHUNKS: string[] = {json.dumps(chunks, ensure_ascii=False)};\n"
            f"const CURRENT_AT: string[][] = {json.dumps(marks)};\n"
            "const html = CHUNKS.map((c, i) => (i ? (CURRENT_AT[i - 1].includes(current) ? ' aria-current=\"page\"' : '') : '') + c).join('');\n"
            "---\n<Fragment set:html={html}/>\n")


def footer_parts(html: str) -> tuple[str, str, str, str]:
    fs = html.index('<footer class="b2-footer">')
    fe = html.index("</footer>", fs) + len("</footer>")
    foot = html[fs:fe]
    card = foot.index('<div class="b2-card">')
    cta_start = foot.index("<section class=\"b2-cta")
    cta_end = foot.rindex("</section>", 0, card) + len("</section>")
    return foot[:cta_start], foot[cta_start:cta_end], foot[cta_end:card], foot[card:]


def footer_component() -> str:
    ref = footer_parts(read("how.html"))
    for page in WARM:
        pre, _cta, mid, card = footer_parts(read(page))
        assert (pre, mid, card) == (ref[0], ref[2], ref[3]), f"{page}: footer card differs"
    pre, cta, mid, card = ref
    assert "{" not in pre + cta + mid + card
    return ("---\n/* The shared site footer. The b2-card (checked by check_site.py) is identical on every\n"
            "   warm page; a page may replace the default call-to-action with its own `cta` slot. */\n---\n"
            + pre + '<slot name="cta">' + cta + "</slot>" + mid + card + "\n")


# ---------- pages ----------

def escape_text(markup: str) -> str:
    """Astro reads { and } in text as expressions; script and style bodies stay raw (is:inline)."""
    parts = re.split(r"(<script\b.*?</script>|<style\b.*?</style>|<[^>]*>)", markup, flags=re.S)
    out = []
    for part in parts:
        if part.startswith("<"):
            assert part.startswith(("<script", "<style")) or ("{" not in part and "}" not in part), part[:120]
            out.append(part)
        else:
            out.append(part.replace("{", "\x00L").replace("}", "\x00R").replace("\x00L", "{'{'}").replace("\x00R", "{'}'}"))
    return "".join(out)


def inline_tags(markup: str, mode_assets: bool) -> str:
    """Every inline <script> and <style> stays exactly where it is (is:inline). In the processed mode
    stylesheet links get content-hashed names through asset(); script tags are dropped here and the page
    loads one bundle instead (see PageScripts)."""
    markup = re.sub(r"<script(?![^>]*\bsrc=)([^>]*)>", r"<script is:inline\1>", markup)
    markup = re.sub(r"<style([^>]*)>", r"<style is:inline\1>", markup)
    if mode_assets:
        markup = re.sub(r'(<link\b[^>]*\bhref=)"(assets/synthe/[\w-]+\.css)"', r"\1{asset('\2')}", markup)
        markup = SCRIPT_SRC.sub(lambda m: "{parity && <script is:inline src=\"" + m.group(1) + "\"" + (m.group(2) or "")
                                + "></script>}" + ("\n" if m.group(0).endswith("\n") else ""), markup)
    return markup


SCRIPT_SRC = re.compile(r'<script src="(assets/synthe/[\w-]+\.js)"( defer)?></script>\n?')


def effective_order(html: str) -> list[str]:
    """Execution order today: parser-blocking scripts run when reached; deferred ones after parsing, in order."""
    sync, deferred = [], []
    for m in SCRIPT_SRC.finditer(html):
        (deferred if m.group(2) else sync).append(m.group(1))
    return sync + deferred


LAYOUT_HEAD = [
    r'<link rel="preload" href="assets/synthe/fonts/figtree-var\.woff2"[^>]*>\n?',
    r'<meta charset="utf-8"/>\n?',
    r'<title>[^<]*</title>\n?',
    r'<meta content="[^"]*" name="description"/>\n?',
    r'<meta content="width=device-width, initial-scale=1" name="viewport"/>\n?',
    r'<link href="[^"]*" rel="canonical"/>\n?',
    r'<meta content="[^"]*" property="og:url"/>\n?',
    r'<meta content="https://synthe\.live/assets/synthe/og-image\.png" property="og:image"/>\n?',
    r'<link href="assets/synthe/(?:favicon[\w.-]*|apple-touch-icon\.png)" rel="(?:icon|apple-touch-icon)"[^>]*/>\n?',
]


def page(name: str) -> str:
    html = read(name)
    s = slug(name)
    html_tag = re.search(r"<html([^>]*)>", html).group(1)
    attrs = {a: "" for a in re.findall(r"\s(data-[\w-]+)(?==|\s|$)", html_tag)}
    head = html[html.index("<head>") + 6: html.index("</head>")]
    title = re.search(r"<title>([^<]*)</title>", head).group(1)
    desc = re.search(r'<meta content="([^"]*)" name="description"/>', head).group(1)
    canon = re.search(r'<link href="([^"]*)" rel="canonical"/>', head).group(1)
    for pat in LAYOUT_HEAD:
        head = re.sub(pat, "", head)

    body = html[html.index("<body>") + 6: html.index("</body>")]
    lead = '<a class="skip-link" href="#main">Skip to content</a>'
    assert body.startswith(lead), name
    body = body[len(lead):].lstrip("\n")
    assert body.startswith('<div class="page-wrapper">'), name
    body = body[len('<div class="page-wrapper">'):].lstrip("\n")
    main_open = '<main id="main" class="page-content">'
    frame = body[: body.index(main_open)].strip("\n")
    body = body[body.index(main_open) + len(main_open):].lstrip("\n")
    hm = HEADER_RE.search(body)
    top, content_and_rest = body[: hm.start()], body[hm.end():]
    fs = content_and_rest.index('<footer class="b2-footer">')
    content = content_and_rest[:fs]
    _pre, cta, _mid, _card = footer_parts(content_and_rest)
    after = content_and_rest[content_and_rest.index("</footer>") + len("</footer>"):]
    after = re.sub(r"^\s*</main>\s*</div>", "", after)
    order = effective_order(html)
    end = after

    std_cta = footer_parts(read("how.html"))[1]
    def prep(m: str) -> str:
        return inline_tags(escape_text(m), True)

    lines = [
        "---",
        f"/* {name}, built by Astro (proof). Generated once by tools/astro_proof/convert.py from the",
        "   hand-written page; the layout owns the shared head, header and footer. */",
        "import Warm from '../layouts/Warm.astro';",
        "import PageScripts from '../components/PageScripts.astro';",
        "import { asset } from '../lib/assets.mjs';",
        "/* SITE_PROOF_MODE=parity keeps every tag as today; the default (processed) loads one hashed bundle. */",
        "const parity = process.env.SITE_PROOF_MODE === 'parity';",
        "---",
        f"<Warm current=\"{s}\" title={{{json.dumps(title)}}} description={{{json.dumps(desc)}}} canonical=\"{canon}\""
        + (f" htmlAttrs={{{json.dumps(attrs)}}}" if attrs else "") + ">",
        '<Fragment slot="head">' + prep(head) + "</Fragment>",
    ]
    if frame:
        lines.append('<Fragment slot="frame">' + prep(frame) + "</Fragment>")
    if top.strip():
        lines.append('<Fragment slot="top">' + prep(top) + "</Fragment>")
    lines.append(prep(content))
    if cta != std_cta:
        lines.append('<Fragment slot="cta">' + prep(cta) + "</Fragment>")
    lines.append('<Fragment slot="end">' + prep(end) + f'{{!parity && <PageScripts page="{s}"/>}}</Fragment>')
    lines.append("</Warm>")
    return "\n".join(lines) + "\n"


def main(argv: list[str]) -> int:
    orders = {slug(n): effective_order(read(n)) for n in (argv or ["index.html", "how.html"])}
    (OUT / "page-scripts.json").parent.mkdir(parents=True, exist_ok=True)
    (OUT / "page-scripts.json").write_text(json.dumps(orders, indent=2) + "\n", encoding="utf-8")
    (OUT / "components").mkdir(parents=True, exist_ok=True)
    (OUT / "pages").mkdir(parents=True, exist_ok=True)
    (OUT / "components" / "SiteHeader.astro").write_text(header_component(), encoding="utf-8")
    (OUT / "components" / "SiteFooter.astro").write_text(footer_component(), encoding="utf-8")
    for name in argv or ["index.html", "how.html"]:
        (OUT / "pages" / f"{slug(name)}.astro").write_text(page(name), encoding="utf-8")
        print(f"wrote astro/src/pages/{slug(name)}.astro")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
