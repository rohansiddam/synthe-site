# Synthe Site Design Playbook

How synthe.live looks, why it looks that way, and the exact tokens and patterns to use when changing it. Read this before touching any page, and run `python3 tools/check_site.py` before you ship.

## 1. Design philosophy

The site's framing is **Archival Ledger & Notary Stamp**: a warm paper archive where agent actions get notarized. Think bank ledger, rubber stamps, security paper, not a SaaS dashboard.

- **Weight over wackiness.** One signature interaction exists: the ACCEPT/REJECT stamp slam. Everything else is quiet paper and ink.
- **Paper, not glass.** No glassmorphism, no gradients-as-decoration, no neon. Depth comes from borders, radius, and subtle shadow.
- **Honesty is a visual feature.** Demos are labeled as demos. Sample data is labeled as sample data. Proof claims link to their receipts. Never render anything that implies live production usage.

## 1b. What the site says

The site sells one thing: **Synthe, the commit barrier for AI agents.** Use these lines word for word; don't invent new taglines.

| Where | Line |
|---|---|
| Category (titles, social card, footer) | The commit barrier for AI agents |
| Motto (under every headline that names Synthe) | Agents propose. Synthe commits. Anyone can verify. |
| Homepage headline | Synthe is the bouncer for your AI agents. Every action gets *checked* at the door. (The italic word rotates: checked, verified, screened.) |

Rules for copy that describes the product (they come from the strategy's scope; the strategy wins if they ever differ):

- **Label public vs. beta every time.** The handoff checker, spec, tests and GitHub Action are public. The commit broker (credential custody, compare-and-swap, receipts) is in design-partner beta. Use the `Public today` / `Design-partner beta` tags (section 5).
- **Say open source only for the Apache-2.0 parts** (spec, checker, everything you install). The commit broker is source-available under FSL-1.1: never call it open source. (Changed 2026-10-07, when the code went public.)
- **Never say certified, compliant, insured or "gap-free".** Synthe produces the evidence auditors and underwriters ask for.
- **Only our own numbers, and only through `facts.json`** (section 9). No borrowed speed claims. Commit-path performance numbers stay off the site until the founders decide to publish them.
- **Don't name the MCP server, the A2A adapter or the Lab** on the site until their public scope is decided (decision D7). Say "agent connectors come with the design-partner beta".
- **State the limits** where people decide: approved actions do exactly what was approved; receipts prove key and connector, not model; agents must lose their own credentials. The full list lives on `status.html#limits`.

## 2. Color system

All colors go through CSS variables. Never hardcode a hex in a component; use the token.

### Light mode (`:root`)

The site's paper side: warm sand backgrounds, brick-red brand accent, forest success.

| Token | Value | Role |
|---|---|---|
| `--cream` | `#f5efe2` | Page background (sand) |
| `--cream-deep` | `#e9dfc8` | Alt background, wells, code chips |
| `--card` | `#fbf7ec` | Card surfaces (lifted off the page) |
| `--ink` | `#2b2118` | Primary text (bark) |
| `--ink-soft` | `#4e4436` | Secondary text |
| `--muted` | `#675c4c` | Muted text, nav links |
| `--line` | `#dacdaf` | Borders, rules, dividers |
| `--rust` | `#8a1919` | Primary accent = brick (links, eyebrows, hovers) |
| `--rust-deep` | `#6b1212` | Deep brick (large brand fills) |
| `--green` | `#286920` | Success = forest. Text, stamps, small indicators |
| `--green-soft` | `#e3ebda` | Success tint background |
| `--red-soft` | `#f0e0d3` | Danger tint background |
| `--red` | `#b3401f` | Signal red: REJECT text, stamps, fail ticks. Brighter than brick, never confused with the brand |

Pages also define `--mono` and terminal tokens (`--term-bg: #2b2118`, `--term-cream: #f0e6d2`, `--term-green: #7fb069`, `--term-amber: #d99a5b`). All pages share one token set; no page-level overrides.

### Dark mode (`html[data-theme="dark"]`)

The **Stark** theme: the archive after dark. Neutral charcoal, not blue-gray and not brown. Same token names, inverted values; the brand accent flips from brick to signal red in dark mode.

| Token | Value | Role |
|---|---|---|
| `--cream` | `#0e0d0c` | Page background (neutral charcoal) |
| `--cream-deep` | `#161513` | Alt background, wells |
| `--card` | `#1a1917` | Card surfaces |
| `--ink` | `#f2ede4` | Primary text (warm paper white) |
| `--ink-soft` | `#d6cec0` | Secondary text |
| `--muted` | `#a8a094` | Muted text, nav links |
| `--line` | `#38352f` | Borders, rules, dividers |
| `--rust` | `#ec5358` | Primary accent = signal red (links, eyebrows, hovers) |
| `--rust-deep` | `#ef6a52` | Deep variant (rare fills) |
| `--green` | `#7fb069` | Success = moss. Text, stamps, small indicators |
| `--green-soft` | `#161d17` | Success tint background |
| `--red-soft` | `#241a16` | Danger tint background |
| `--red` | `#f2555a` | Signal red: REJECT text, stamps, fail ticks |

### Hard rules learned the painful way

1. **Never use `rgba(255,255,255,X)` for a card background.** On light mode it reads as paper; in dark mode it renders as washed-out gray mush. Use `var(--card)` for every card, always.
2. **Async validators must always resolve promises.** `validateHandoff` once returned a plain object on its early sender-failure path, so `.then()` threw and the playground's "stranger" attack silently died. Every direct return is now `Promise.resolve(...)`.
3. **Large brand fills stay deep brick in both modes.** Hardcode `background: #6b1212` (never a theme token) on large filled areas like the proof panel and "With Synthe" cards, so no dark-mode override is needed at all.
4. **`--green` is for text, stamps, and small indicators only.** Small ACCEPT fills and pips use `var(--green)` (forest in light, moss in dark); never paint a large surface green in either mode. `--green-soft` is fine as a tint (the race outcome box).
5. **Terminal blocks are already dark.** Leave `--term-*` untouched in dark mode.
6. **White overlays are only for already-dark surfaces** (floating pills, dark bands). If the surface adapts to the theme, the overlay must too.
7. **Demos keep their own state.** A demo attack must never change another attack's verdict. The forge's replay attack once wrote to a page-wide ledger; it now uses its own.

## 3. Typography

- **Display:** `"Fraunces", Georgia, serif`: headlines, the wordmark, stamps, kickers. Weight 500 for headlines, 600-700 for stamps/wordmark. Italic is used sparingly for emphasis words inside headlines.
- **Body:** `"Hanken Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. It replaced General Sans in October 2026, because General Sans's license doesn't clearly allow its files in a public repo.
- **Mono:** `"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace`: code, reason codes, kickers, eyebrows, small labels. Eyebrows/kickers are uppercase, letter-spacing `0.08em`-`0.14em`, 12-13px, rust or muted.

**Every font is self-hosted** in `/fonts` (SIL Open Font License 1.1; licenses in `fonts/LICENSES.md`) and declared once, in `site.css`. No page loads Google Fonts, Fontshare or any other font service, so loading a page sends no request anywhere else. Each page preloads the two fonts the hero needs:

```html
<link rel="preload" href="/fonts/fraunces-normal-400-650-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/hanken-grotesk-normal-400-700-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="/site.css" />
<script src="/site.js" defer></script>
```

Playground once shipped without its font links and silently fell back to system fonts; `tools/check_site.py` now fails any page without `site.css`.

## 4. Texture

- **The watermark** is a single inline SVG data-URI tile (lathe-like wavy lines + concentric circles), applied as `body { background-image }`. No network request, no JavaScript. Stroke color is `%23241d14` in light mode; each page carries a dark-mode override swapping the stroke to `%23f2ede4`:
  ```css
  html[data-theme="dark"] body { background-image: url("data:image/svg+xml,...stroke='%23f2ede4'..."); }
  ```
  When editing the tile, change the stroke in BOTH copies.
- There is no grain overlay (it was removed). Do not add one.

## 4b. Logo and identity

The mark is an inline SVG of the Synthe stamp glyph, carried directly in the HTML (no `<img>` tag, no request).

- **`fill="currentColor"` everywhere.** The glyph inherits `--ink`, so it adapts to the theme automatically. Never hardcode a fill color on it.
- **Nav wordmark:** mark sits directly left of the "Synthe" text, `.wordmark-logo { width: 26px; height: 28px; flex: none; }`. Optically centered on the wordmark cap height; check the alignment by eye in both themes whenever the wordmark size changes.
- **Footer:** same glyph at `.footer-logo { width: 22px; height: 24px; }`, next to the brand line.
- **Favicon:** `/favicon.svg` linked on every page via `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`.
- **Social card:** `og-image.png` (2240 x 1120), with the logo and "Synthe" locked up on one line, the category line "The commit barrier for AI agents" beneath in brick italic, the motto under it, and a terminal card on the right. Its source is `tools/og-image.html`; render it with headless Chrome (the command is in that file) against the local server so the self-hosted fonts load.
- The full path data lives in the page markup; when the mark needs replacing, swap the whole inline SVG on every page, not just one. `check_site.py` fails if the header or footer differs between pages.

## 5. Components

### Site header (identical on every page; CI enforces it)
```html
<header class="site-head">
  <a class="wordmark" href="/"><svg class="wordmark-logo" viewBox="0 0 275 290" aria-hidden="true">...</svg>Synthe</a>
  <button class="nav-toggle" id="nav-toggle" type="button" aria-expanded="false" aria-controls="topnav">Menu</button>
  <nav class="topnav" id="topnav" aria-label="Main">
    <a href="/how.html">How it works</a>
    <details class="nav-group">
      <summary>Demos</summary>
      <div class="nav-panel">
        <a href="/race.html"><strong>Race two agents</strong><span>Two agents, one change, exactly one commit.</span></a>
        <!-- Forge, Playground, Tamper evidence, Anatomy of a handoff -->
      </div>
    </details>
    <a href="/docs.html">Docs</a>
    <details class="nav-group">
      <summary>Proof</summary>
      <div class="nav-panel"><!-- Receipts, Benchmarks, Status & trust, Changelog --></div>
    </details>
    <a href="https://github.com/rohansiddam/Synthe">GitHub</a>
    <a class="nav-cta" href="/#partner">Become a design partner</a>
    <button class="theme-toggle" id="theme-toggle" type="button">Dark</button>
  </nav>
</header>
```
- Labels name what people are looking for, never our nicknames: the four demo names live inside "Demos", each with a one-line description (information scent, section 12).
- The groups are native `<details>` disclosures, the pattern the W3C ARIA guide recommends for site navigation (not `role="menu"`). They open without JavaScript; `site.js` keeps one open at a time, closes on Escape (focus returns to the group) and on a click outside, and marks the group that holds the current page.
- "Become a design partner" is the one call to action, and it is always in the header.
- Links are root-absolute (`/race.html`), so the header works on any path, including the 404 page.
- The current page's link carries `aria-current="page"`. That attribute is the only allowed difference between pages.
- The CSS lives in `site.css`. Change the header everywhere at once (the round-2 generator is the model: one function writes it for every page).
- **Phone menu:** at 900px and below, the nav collapses behind a button labeled "Menu" (not an icon alone) into a panel under the header, where the groups become accordions and the call to action is a full-width button. It only collapses when JavaScript runs (the head script adds a `js` class to `<html>`); without JavaScript the nav simply wraps.

### "On this page" and Back to top
Pages longer than about four screens (How it works, Docs) carry a sticky `<nav class="page-toc" aria-label="On this page">` under the header: a label, then links whose text matches the headings they jump to. `site.js` marks the section in view with `aria-current="true"`. Target headings or sections get `data-toc-target` so they land below the sticky bars. `site.js` also adds one labeled "Back to top" button, bottom right, on any page taller than four screens, shown once the reader is 1.5 screens down.

### Skip link
`<a class="skip-link" href="#main">Skip to content</a>` is the first thing in `<body>`, and every page's `<main>` has `id="main"`.

### Buttons
- Primary `.btn`: ink background, cream text, pill radius (`999px`), padding `14px 30px`, font-weight 650. Hover: rust background, `translateY(-1px)`.
- Ghost `.btn.ghost`: transparent, 1.5px `--line` border, ink text; hover border/text go rust.
- Small `.mini-btn` for secondary actions.
- The theme toggle is a text button styled like a nav link; its label flips Dark/Light via `site.js`.

### Cards
`background: var(--card); border: 1px solid var(--line); border-radius: 14px-18px;` Soft shadow `0 2px 14px rgba(29,26,20,.05)` is used on the playground, forge and race panels.

### The stamp (the one signature interaction)
```css
.stamp { font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 30px; letter-spacing: .06em; padding: 8px 22px; border: 3px solid; border-radius: 8px; transform: rotate(-8deg); display: inline-block; }
.stamp.accept { color: var(--green); border-color: var(--green); }
.stamp.reject { color: var(--red); border-color: var(--red); }
.stamp.show { animation: stampIn .45s cubic-bezier(.2,1.4,.4,1) both; }
@keyframes stampIn { 0% { opacity: 0; transform: scale(2.4) rotate(-14deg); } 60% { opacity: 1; transform: scale(.94) rotate(-8deg); } 100% { opacity: 1; transform: scale(1) rotate(-8deg); } }
```
Always rotated -8deg. Always slammed once via the `show` class (re-trigger by removing, forcing reflow, re-adding). No sound, ever. The race demo's "without Synthe" mode uses a muted `.stamp.plain` reading PUSHED: it is not a verdict, so it is never green or red.

### Check rows
Dashed `--line` separators, ✓ in `--green`, ✕ in `--red`. On verdict reveals they stagger in (opacity + translateX, ~90ms stagger). Code inside a passing row stays ink; only a failing row's reason code is red.

### Packet field rows
Two-column grid: small uppercase muted label (`12.5px`, `letter-spacing: .08em`) + semibold value. Zebra striping via `:nth-child(odd)` at 2.5% ink. A tampered field gets `.flash` (red left border + `@keyframes fieldFlash` background pulse) and a `changed` tag (red pill, uppercase 11.5px).

### Attack cards / option buttons
`var(--card)` background, 1.5px `--line` border, radius 12-14px. Hover: `translateY(-2px)`, rust border, soft shadow. Active: slight press (`scale(.99)`).

### Pills, tags and reason codes
- Reason codes: mono 12.5px, rust text, 1px rust-ish border, radius 6px.
- Status pills (e.g. `CHECKER v0.5 · PACKET SCHEMA 0.1`): mono uppercase, `--line` border, pill radius.
- **Availability tags:** `Public today` (green outline) and `Design-partner beta` (rust outline), mono uppercase 11-11.5px, pill radius, `border: 1px solid currentColor`. A smaller inline `Beta` tag marks a single beta-only item, like the `non_fast_forward` row on the homepage.
- `changed` tag: white text on `--red`, uppercase.

### Segmented control (race demo)
Radio inputs in a `<fieldset>` with a mono uppercase `<legend>`. The options sit in a `--cream-deep` pill track; the checked option lifts to `var(--card)` with a small shadow. Keyboard focus shows on the label.

### Details/summary
Used for "How this works" explainers. `var(--card)` background, `--line` border, pointer cursor on summary.

### Footer (identical on every page; CI enforces it)
Logo and brand line, the category line and motto, one nav of whole links (`flex-wrap: wrap` + `white-space: nowrap`, so no link wraps mid-phrase), the license line (Apache-2.0 for what you install, FSL-1.1 source-available for the broker, linking LICENSING.md), and the colophon in italic serif ("From the Greek synthēkē, meaning agreement."). CSS lives in `site.css`.

### Marquee (homepage trust strip)
Right under the hero: "Works with any stack that emits JSON", then a scrolling tape of company names (LangChain, LangGraph, CrewAI, OpenAI, Anthropic, Google, Meta, Microsoft, Hugging Face, Vercel, Cloudflare) on a `var(--ink)` band, mono uppercase 14px, dots in rust, level. Names only, no logo files: several owners restrict their marks (Microsoft and OpenAI had theirs pulled from Simple Icons at their request). The note "Names shown for compatibility only. No endorsement implied." sits under it, next to the **Pause motion** button. The tape pauses on hover; screen readers get the list once, as plain text.

### Rotating headline word
One word in the homepage headline rotates (checked, verified, screened), looping every 7.5 s. Screen readers hear only "checked" (an `sr-only` copy; the animation is `aria-hidden`). It stops for reduced motion and with the Pause motion button.

### Terminal blocks
Already-dark panels (`--term-bg`), green/amber mono text. Untouched by theme. Transcripts show real output; shorten it with `…` and say "Output shortened". Copy buttons copy the commands only (`.cmd` spans), never the output.

## 6. Dark mode implementation pattern

Every page follows the same pattern. To add dark mode to a new page, copy it exactly:

1. **Variable overrides** right after `:root`:
   ```css
   html[data-theme="dark"] {
     color-scheme: dark;
     --cream: #0e0d0c;
     /* ... full table from section 2 ... */
   }
   ```
2. **Watermark swap** (if the page has the texture): dark block overriding `body { background-image }` with the `%23f2ede4` stroke copy.
3. **Head script** (runs before first paint, prevents flash, turns on script-only layouts):
   ```html
   <script>
     try { (function () {
       var d = document.documentElement;
       d.classList.add("js");
       var t = null;
       try { t = localStorage.getItem("synthe-theme"); } catch (e) {}
       var dark = t ? t === "dark" : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
       d.setAttribute("data-theme", dark ? "dark" : "light");
     })(); } catch (e) {}
   </script>
   ```
4. **Toggle wiring** is in `site.js`: it flips `data-theme`, persists to `localStorage["synthe-theme"]`, and updates the button label and aria-label. Pages don't carry their own copy.
5. `body { transition: background-color .25s ease, color .25s ease; }` for a smooth flip.
6. `<meta name="color-scheme" content="light dark" />` in every head.

## 7. Motion and interaction principles

- Functional interactions may use client-side JS and CSS transitions. Decorative work must add **no network requests and no JavaScript** (the marquee's one-line loop copy is the exception).
- Scene changes crossfade + slight rise (`opacity`/`translateY`, ~0.45s). Stagger reveals at ~70-90ms.
- `@media (prefers-reduced-motion: reduce)` must kill transitions and animations (instant swaps).
- Anything that moves by itself for more than 5 seconds next to other content needs a pause control (WCAG 2.2.2, Level A). The site has one, **Pause motion**: it adds `motion-paused` to `<html>`, which pauses every decorative animation, and the choice is remembered (`localStorage["synthe-motion"]`, applied by the head script before first paint). The race demo then jumps straight to each result.
- No sound. No emojis in UI chrome.

## 8. Copy voice

- Plain English first. Short sentences. Explain what happened and what it means.
- **No em dashes** in any outward-facing copy. Ever. `check_site.py` fails on one in any page, `llms.txt`, `llms-full.txt` or `security.txt`.
- No AI-sounding jargon ("repro", "delve", "leverage").
- Reason codes are shown as mono tags next to plain-English explanations, never instead of them. Use the real codes from the public spec; a demo never invents a code the checker doesn't have.
- Honesty labels: demos say demo; sample ledger entries say sample; the forge's HMAC model is labeled a teaching model; the race says it is a model of the rules with a demo key, not the product.

## 9. Facts, checks and shipping

- **`facts.json` holds every number on the site.** Pages never hard-code one: wrap it, e.g. `<span data-fact="tests_passed">57</span>`. `python3 tools/facts.py apply` writes the values in; `python3 tools/facts.py check` compares them. Dates in `facts.json` are ISO and render as "October 6, 2026".
- **`tools/facts.py refresh --synthe PATH`** re-measures a checkout of the public checker: commit, version, passing tests, and the shipped attacks (all must be rejected, or it refuses to update). The real-runner results and the clone timing are recorded by hand; their sources are under `_manual`.
- **`tools/check_site.py`** is the pre-ship gate (CI runs it on every push and pull request): facts, identical header and footer, shared head, no third-party loads, no em dashes, working links and anchors, sitemap, CSP meta vs. `_headers`. It warns while the Formspree form ID is unset.
- **`.github/workflows/refresh-facts.yml`** runs the refresh every Monday and opens a pull request when something changed. It never publishes by itself.
- **Security headers:** every page carries the CSP as a `<meta>` tag; `_headers` carries the same CSP plus HSTS, `frame-ancestors`, `nosniff`, referrer and permissions policies for when the site moves to Cloudflare Pages (`HOSTING.md`). Change both together.
- **The partner form** opens the visitor's email app (its `action` is a `mailto:` link, so it works without JavaScript too). Setting a Formspree form ID in `data-formspree` makes it post to Formspree instead; then the privacy lines under the form and on `status.html` must say so, and `check_site.py` fails until they do. If the form ever posts somewhere else, update the CSP (`connect-src`, `form-action`) as well.
- **Asset versions:** pages link `/site.css?v=<hash>` and `/site.js?v=<hash>`. After editing either file, run `python3 tools/stamp.py`; `check_site.py` fails on an old version. Without this, a browser could pair new pages with an old cached stylesheet (GitHub Pages caches for 10 minutes) and break the header.
- **Local preview:** `python3 tools/serve.py` serves the site at http://127.0.0.1:8790 with caching off.
- **Adding a page:** copy the head, header and footer from an existing page, add it to `sitemap.xml` (or mark it `noindex`), add it to the footer on every page if it belongs there, and run `check_site.py`.

## 10. Page inventory

| Page | What it is |
|---|---|
| `/` (index) | Homepage, about 6 screens: hero (bouncer headline), trust strip, how it works (four steps), demos, proof, who it's for, FAQ accordion, final call to action with the partner form |
| `how.html` | How it works, in detail: the commit path, without and with Synthe, what it stops, the attack loop and stepper, run it yourself, what it can't stop |
| `race.html` | Race two agents for one commit: claim and compare-and-swap rules, signed and hash-chained demo receipts, chain verification |
| `forge.html` | Adversarial playground: 6 attacks on a signed handoff, five checks in the real checker's order, inline verdicts |
| `playground.html` | Click-through story: sign a real Ed25519 handoff, then sabotage it 5 ways |
| `tamper.html` | Hash-chain demo: edit/delete/reorder/forge entries, find the broken block |
| `anatomy.html` | CSS-only scrollytelling of a handoff's anatomy |
| `docs.html` | Docs: the commit barrier, quickstart, check order, concepts, the complete reason-code reference, with the sticky "On this page" bar |
| `log.html` | Benefit-led changelog with proof links |
| `quiz.html` | "Do I need a commit barrier?" quiz |
| `receipts.html` | Source-linked proof claims; sample ledger labeled demo |
| `benchmarks.html` | Every number on the site and its source |
| `status.html` | Status, what's unproven, what Synthe can't stop, what it is not, your data, security contact |
| `404.html` | Not-found page (noindex) |

## 11. Pitfalls checklist (check before shipping)

- [ ] `python3 tools/stamp.py` run after any edit to `site.css` or `site.js`
- [ ] `python3 tools/check_site.py` passes
- [ ] Homepage still about 6 screens at 1440x900 and about 9 on a phone; new detail goes to a deeper page with a link, not onto the homepage
- [ ] No `rgba(255,255,255,X)` card backgrounds (use `var(--card)`)
- [ ] No large `var(--green)` fills; large brand fills hardcode `#6b1212` in both modes
- [ ] Header and footer identical on every page (only `aria-current` differs)
- [ ] Every page links `/site.css` and `/site.js`; nothing loads from another origin
- [ ] Every number is a `data-fact` span backed by `facts.json`
- [ ] Logo mark present next to the wordmark and in the footer on every page; favicon linked
- [ ] Watermark stroke updated in both light and dark copies
- [ ] Toggle present, label flips, choice persists, no flash on reload; phone menu opens and closes
- [ ] Reduced-motion fallback present, and moving content has the Pause motion control
- [ ] No em dashes in copy
- [ ] Public vs. beta labeled; "open source" only for the Apache-2.0 parts, never the broker; no certified/compliant claims
- [ ] Demos labeled honestly; no fabricated usage, receipts or benchmarks

## 12. Navigation and page length: the research behind the structure

The October 2026 restructure (homepage from 10.8 to 5.8 screens at 1440x900, 17.4 to 8.9 on a phone) follows these findings. Keep them when adding content.

| Finding | Source | Rule on this site |
|---|---|---|
| 57% of viewing time is above the fold; 74% in the first two screenfuls | [NN/g, Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/) (120 users, 130,000 fixations) | The first two screens carry the value proposition, the call to action, the trust strip and how it works. Demos sit in the first half. |
| Users decide in about 10 seconds whether a page is worth their time | [NN/g, How Long Do Users Stay](https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/) | The hero says what Synthe is in one headline and one lede. |
| Visual appeal is judged in about 50 ms | [Lindgaard et al. 2006](https://www.semanticscholar.org/paper/Attention-web-designers:-You-have-50-milliseconds-a-Lindgaard-Fernandes/f9715b117c57d4e7064afe1c1cb95d5bf4cc1831) | Clean, quiet hero; one signature interaction. |
| People scroll when there is a reason; signposts help; avoid false floors | [NN/g, Page Fold Manifesto](https://www.nngroup.com/articles/page-fold-manifesto/) | Each homepage section is a summary with a link to go deeper. |
| Show essentials first, defer the rest; no more than two levels | [NN/g, Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Homepage, then a detail page (How it works, Docs). Nothing deeper. |
| Split distantly related topics across pages; long pages get an "On this page" index | [NN/g, In-Page Links](https://www.nngroup.com/articles/in-page-links-content-navigation/) | Sticky "On this page" on How it works and Docs. |
| People scan headings (layer-cake); descriptive headings make that work | [NN/g, Layer-Cake Pattern](https://www.nngroup.com/articles/layer-cake-pattern-scanning/) | Every section heading states its point. |
| Link labels must predict what's behind them; clever names mislead | [NN/g, Information Scent](https://www.nngroup.com/articles/information-scent/) | Nav says How it works, Demos, Docs, Proof, not Race, Forge, Tamper. |
| Hidden navigation is used less and found slower, desktop and mobile | [NN/g, hidden vs visible navigation](https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/) (179 users) | Visible nav on desktop; the phone button is labeled "Menu". |
| Site navigation dropdowns should be simple disclosures, not ARIA menus | [W3C ARIA APG, disclosure navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/) | `<details>` groups with Escape and outside-click handling. |
| Sticky headers give quick access to navigation; keep them compact and opaque | [NN/g, Sticky Headers](https://www.nngroup.com/articles/sticky-headers/) | One sticky header with the call to action; no other floating bars. |
| FAQs work well as accordions with a caret or plus icon | [NN/g, Accordions on Desktop](https://www.nngroup.com/articles/accordions-on-desktop/) | Homepage FAQ is an accordion. |
| Back to Top for pages longer than four screens, labeled, bottom right | [NN/g, Back to Top](https://www.nngroup.com/articles/back-to-top/) | `site.js` adds it on long pages only. |
| Auto-moving content is often ignored and annoys; give control | [NN/g, Auto-Forwarding](https://www.nngroup.com/articles/auto-forwarding/) | Only two small motions (one word, one tape), both pausable. |
| Moving content over 5 seconds needs a pause, stop or hide control (Level A) | [WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) | The Pause motion button, remembered across pages. |
| Developer-tool pages: hero, trust strip, features, proof, FAQ, final call to action; scrolling logo strips save vertical space; "no salesy BS" | [Evil Martians, 100+ devtool landing pages](https://evilmartians.com/chronicles/we-studied-100-devtool-landing-pages-here-is-what-actually-works-in-2025) | That is the homepage order. |
| B2B buyers rank pricing first and need enough product detail to judge fit | [NN/g, B2B usability](https://www.nngroup.com/articles/b2b-usability/), [B2B vs B2C](https://www.nngroup.com/articles/b2b-vs-b2c/) | The FAQ answers cost plainly; How it works and Docs carry the detail. |
| 50 to 75 characters per line read best | [Baymard, line length](https://baymard.com/blog/line-length-readability) | Body text measures stay around 38 to 46em. |
| Long pages win for complex, unfamiliar products; short ones for simple, familiar ones | [CXL, long vs short pages](https://cxl.com/blog/long-form-or-short-form/) | The full story exists (How it works, Docs), one click from a short homepage. |

Budgets `check_site.py` watches: the homepage's main text stays under 900 words (warning).

