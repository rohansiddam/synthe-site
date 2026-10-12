"""Usage: python3 tools/apply_chrome.py .

Install the redesigned header and footer on every page of synthe.live (identical except aria-current),
and drop the preload of the serif the redesign no longer uses."""
import re
import sys
from pathlib import Path

site = Path(sys.argv[1])
A = ("M 135.339 35.105 119.916 56.166 65.976 129.689 75.562 201.351 C 76.765 210.340 71.240 218.418 62.432 220.185 "
     "53.895 221.859 45.295 216.549 43.298 207.725 L 32.651 127.593 C 32.196 124.170 32.576 120.045 34.689 117.171 "
     "L 83.489 50.805 113.299 10.126 C 116.532 5.714 121.004 2.677 126.682 2.564 L 196.616 1.166 C 203.544 1.028 "
     "209.471 5.555 211.787 11.932 213.849 17.594 212.818 23.577 209.138 28.271 L 95.676 182.179 89.465 135.537 "
     "144.852 60.334 163.745 34.614 Z")
B = ("M 64.894 261.544 155.983 140.236 179.779 108.392 185.927 154.879 110.451 255.747 138.531 255.614 209.078 162.002 "
     "200.172 91.235 C 199.408 85.166 200.816 79.553 205.121 75.642 209.828 71.368 216.229 70.134 221.964 72.262 "
     "228.322 74.621 231.877 79.955 232.693 86.566 L 242.414 165.286 C 242.975 169.836 241.259 173.994 238.587 177.533 "
     "L 160.448 281.001 C 157.254 285.231 152.542 288.273 147.064 288.315 L 78.043 288.836 C 73.418 288.871 69.030 "
     "287.434 65.849 284.248 59.453 277.843 59.605 268.588 64.894 261.544")


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
        <p class="footer-line">The commit barrier for AI agents. Agents propose. You approve. Synthe commits, and anyone can verify the receipt.</p>
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
