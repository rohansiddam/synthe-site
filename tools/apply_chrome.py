"""Usage: python3 tools/apply_chrome.py .

Install the redesigned header and footer on every page of synthe.live (identical except aria-current),
and drop the preload of the serif the redesign no longer uses."""
import re
import sys
from pathlib import Path

site = Path(sys.argv[1])
# The mark, level (both flat edges horizontal) and point-symmetric: the bottom half is the top half turned
# 180 degrees. Same centre, width and gap as the original. A is the agent's half (ink), B is yours (coral).
A = ("M 137.089 36.089 L 121.248 56.837 65.850 129.267 74.001 201.107 C 75.025 210.118 69.339 218.084 60.498 219.675 "
     "51.929 221.178 43.437 215.697 41.616 206.835 L 32.573 126.506 C 32.187 123.074 32.649 118.958 34.819 116.127 L "
     "84.936 50.749 115.553 10.674 C 118.873 6.328 123.405 3.381 129.084 3.381 L 199.032 3.381 C 205.962 3.382 "
     "211.797 8.026 213.985 14.448 215.933 20.150 214.783 26.111 211.010 30.731 L 94.495 182.341 89.217 135.584 "
     "146.096 61.503 165.499 36.165 Z")
B = ("M 137.911 253.913 L 153.752 233.165 209.151 160.735 200.999 88.895 C 199.976 79.884 205.661 71.918 214.503 "
     "70.327 223.072 68.824 231.564 74.305 233.384 83.167 L 242.427 163.496 C 242.814 166.928 242.352 171.044 "
     "240.182 173.875 L 190.065 239.253 159.448 279.328 C 156.127 283.674 151.595 286.621 145.916 286.621 L 75.968 "
     "286.621 C 69.039 286.620 63.204 281.976 61.016 275.554 59.067 269.852 60.218 263.891 63.991 259.271 L 180.506 "
     "107.661 185.784 154.418 128.905 228.499 109.501 253.837 Z")


def mark(cls, box="0 0 275 290", half=True):
    hc = "half " if half else ""
    return (f'<svg class="{cls}" viewBox="{box}" aria-hidden="true"><path class="{hc}a" d="{A}"/>'
            f'<path class="{hc}b" d="{B}"/></svg>')


SUN = ('<span class="opt sun"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
       '<span class="sr-only">Light</span></span>')
MOON = ('<span class="opt moon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
        '<span class="sr-only">Dark</span></span>')

HEADER = f"""<header class="site-head">
        <a class="wordmark" href="/">{mark("mark wordmark-logo open")}Synthe</a>
        <button class="nav-toggle" id="nav-toggle" type="button" aria-expanded="false" aria-controls="topnav">Menu</button>
        <nav class="topnav" id="topnav" aria-label="Main">
          <a href="/how.html">How it works</a>
          <a href="/status.html">Security</a>
          <a href="/docs.html">Docs</a>
          <a href="https://github.com/rohansiddam/Synthe">GitHub</a>
          <button class="themeswitch" id="theme-toggle" type="button" role="switch" aria-checked="false" aria-label="Dark mode" title="Dark mode">{SUN}{MOON}</button>
          <a class="nav-cta" href="/#install">{mark("mark open", box="-40 -40 355 370")}Install</a>
        </nav>
      </header>"""

FOOTER = f"""<footer class="site-foot">
        <p class="footer-brand">{mark("footer-logo", half=False)}Synthe</p>
        <p class="footer-line">The trust layer for AI agents. Agents propose. You approve. Synthe commits, and anyone can verify the receipt.</p>
        <nav class="footer-nav" aria-label="Footer">
          <a href="/how.html">How it works</a>
          <a href="/status.html">Security and limits</a>
          <a href="/docs.html">Docs</a>
          <a href="/integrations.html">Integrations</a>
          <a href="/use-cases.html">Use cases</a>
          <a href="/race.html">Race two agents</a>
          <a href="/forge.html">Forge this handoff</a>
          <a href="/playground.html">Playground</a>
          <a href="/tamper.html">Tamper evidence</a>
          <a href="/anatomy.html">Anatomy of a handoff</a>
          <a href="/quiz.html">Do I need this?</a>
          <a href="/receipts.html">Receipts</a>
          <a href="/benchmarks.html">Benchmarks</a>
          <a href="/log.html">Changelog</a>
          <a href="/#partner">Design partners</a>
          <a href="https://github.com/rohansiddam/Synthe">GitHub</a>
        </nav>
        <p class="footer-legal">Synthe is an early project. The spec, checker, clients and integrations are open source under Apache-2.0; the commit broker is source-available under FSL-1.1-ALv2. <a href="https://github.com/rohansiddam/Synthe/blob/main/LICENSING.md">How it's licensed</a>. Synthe produces evidence; it doesn't make anyone certified, compliant or insured.</p>
        <p class="colophon">From the Greek <em>synthēkē</em>, meaning agreement.</p>
      </footer>"""

CURRENT = {"how.html": "/how.html", "status.html": "/status.html", "docs.html": "/docs.html"}
PRELOAD = re.compile(r'\s*<link rel="preload" href="/fonts/fraunces-[^"]+" as="font" type="font/woff2" crossorigin />')

for page in sorted(site.glob("*.html")):
    html = page.read_text()
    head = HEADER
    if page.name in CURRENT:
        href = CURRENT[page.name]
        head = head.replace(f'<a href="{href}">', f'<a href="{href}" aria-current="page">', 1)
    new, n1 = re.subn(r'<header class="site-head">.*?</header>', lambda m: head, html, count=1, flags=re.S)
    new, n2 = re.subn(r'<footer class="site-foot">.*?</footer>', lambda m: FOOTER, new, count=1, flags=re.S)
    new = PRELOAD.sub("", new)
    if n1 != 1 or n2 != 1:
        raise SystemExit(f"{page.name}: header {n1}, footer {n2}")
    page.write_text(new)
    print(f"{page.name}: chrome installed")
