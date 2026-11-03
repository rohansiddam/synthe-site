# Synthe Site Design Playbook

How synthe.live looks, why it looks that way, and the exact tokens and patterns to use when changing it. Read this before touching any page, and run `python3 tools/check_site.py` before you ship.

## 0. "The Record" (2026-11-02; this section wins over anything older below)

The site moved from the commit-barrier look (sand, coral, cut corners, the hooked-halves lattice) to **The Record**: an almanac page where every change your agent tries is a line in the book, and only clear wins are marked. It comes from the design direction v3 brief, taken for its look only: no scores, standings numbers, scroll stories or motion pieces, because the site stays brief and shows no internals (section 1b).

- **One palette, defined once** in `site.css` under `html:root` (and `html:root[data-theme=...]`), which outranks the `:root` blocks archived pages still carry. Old names (`--cream`, `--rust`, `--human`...) map onto it, so archived pages follow without being rewritten.
- **Gold is a marker, never a fill and never body text.** `--gold` is for underlines, rules, the current-page bar and the bottom half of the mark (3.5:1 on paper, enough for graphics); `--gold-fill` for small dots (a kept change, the merge warning); `--gold-text` only when gold must be text (it passes AA). Buttons are ink. The moment gold floods a surface the look turns into crypto and premium finance.
- **Type:** Archivo (self-hosted variable font, widths 62 to 125) for everything. Headlines are set wide and heavy: `h1` 800 at `font-stretch: 118%`, `h2` 700 at 110%. IBM Plex Mono for record lines: the command, times, small uppercase labels (12 to 13px, letter-spacing 0.06 to 0.08em, `--muted`). Hanken Grotesk survives only in the wordmark, to match the official lockup.
- **Shapes:** hairline borders (`--line`), radius `--radius` (8px) on buttons and inputs, `--radius-lg` (12px) on panels. No cut corners, no slot diagonals, no lattice on live pages (the old classes stay in `site.css` for archived pages).
- **The record** (homepage): a panel headed "Example night" with one row per change tried: mono time, the change in plain words, and the result as a word plus a dot (filled gold = kept, open = not kept), ending on "7am, Morning report". It is labelled an example, carries no numbers, and color is never the only signal. It is the only illustration on the site.
- **Chrome:** header = logo lockup, Docs, Limits (`status.html`), Contact (`/#partner`), GitHub, the theme switch, and the one call to action, **Get started** (`/docs.html`). The current page gets a 2px gold underline.
- **Homepage (about one screen, under 200 words):** eyebrow, headline, motto and paragraph on the left; the record on the right; `npx synthe init` with Copy and a Get started link; three labelled notes (Merges, Limits, Public run); a one-line contact form. No FAQ, no animation beyond the logo locking on load.
- **One type scale, one grid (CI enforces both).** Pixel font sizes come from 11, 12, 13, 14, 16, 18, 20, 24 and 32; display sizes use `clamp()`. Every padding, margin and gap in px is a multiple of 4 (1 and 2 are for hairlines).
- **No sideways scroll.** Full-bleed bands (the header, the "On this page" bar) use `100vw` corrected by `--sbw`, the scrollbar width `site.js` measures, and `html` has `overflow-x: clip` as a guard. Before 2026-11-02 the header overflowed by 8px at 1440 with a classic scrollbar.
- **Motion rules stand:** every animation has a still state under `prefers-reduced-motion`; nothing auto-loops.

## 1. Design philosophy

- **Calm and checkable.** One neutral page, one ink, one accent spent only on proof moments (a kept change, the merge warning, the current page). Everything else is paper and ink.
- **The product is the imagery.** The only picture is a plain record of what Synthe does overnight, labelled as an example. No illustration, stock, dashboards, logos or stat cards.
- **Honesty is a visual feature.** Examples are labelled as examples. Never render anything that implies customers, usage or results we can't point to.

## 1b. What the site says

Since November 2, 2026 the site sells one thing: **Synthe, self-improving AI agents** (source: [synthelabs/synthe](https://github.com/synthelabs/synthe), Apache-2.0, npm `synthe`). **The site deliberately stays brief** (founders' decision, November 2, 2026): it says what Synthe does for a team, how to start, the plain limits and where data goes. It shows no roadmap or plans, no inner mechanics (test counts, edits per round, models, statistics, judging, costs per round), and no pilot or design-partner programme. Details live in the GitHub README; link to it instead of repeating it.

The old "trust layer / commit barrier" product is retired: its pages (anatomy, benchmarks, forge, how, integrations, playground, quiz, race, receipts, tamper, use-cases) stay in the repo, `noindex`, out of the nav, sitemap and `llms.txt`, each with an "Archived" note. Don't link to them from live pages. Live pages: `/`, `docs.html`, `status.html`, `log.html`.

Use these lines word for word; don't invent new taglines.

| Where | Line |
|---|---|
| Category (eyebrow, social card, footer) | Self-improving AI agents |
| Homepage headline | Your AI agent gets better while you sleep. |
| Motto (under the headline, footer) | You say what good looks like. Synthe tests changes overnight and keeps only what wins. |
| What it does (the most detail the site gives) | Every hour Synthe tries small changes to your agent's prompt, tests them, and keeps only clear wins. You wake up to a report. |
| Header call to action | Get started (to `/docs.html`) |
| Company contact | Using AI agents in production? Talk to us. (`/#partner`, labelled "Contact" in the nav and footer) |

Rules:

- **Limits, short and plain:** tests are simulated, only the prompt changes (code and tools never run), check the results yourself; automatic merges land on the default branch, so choose review if it deploys. No model names.
- **Proof:** at most one sentence linking the public demo run (synthelabs/support-bot pull request #7). No stat cards.
- **Never say** certified, guaranteed, "proven to improve"; no customers, logos, prices, SLAs, dates or plans.
- **Only our own numbers, and only through `facts.json`** (section 9), each with its source under `_manual`. Keep them few.
- **Homepage budget:** about one screen at 1440x900 and under 200 words of visible text.

## 2. Color system

All colors go through CSS variables in `site.css`. Never hardcode a hex in a page.

### Light mode (the almanac page)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#faf8f1` | Page (almanac paper) |
| `--bg2` | `#f2eee2` | Wells, inline code |
| `--card` | `#ffffff` | Panels, the command box, inputs |
| `--line` / `--line2` | `#e3ddce` / `#cfc7b4` | Hairlines / control borders |
| `--ink` | `#171410` | Text, buttons, the top half of the mark |
| `--ink-soft` | `#3a352c` | Body text on docs pages |
| `--muted` / `--faint` | `#6b6455` | Secondary text, labels, dates (5.5:1 on paper) |
| `--gold` | `#a97b00` | Underlines, rules, current page, bottom half of the mark. Graphics only (3.5:1) |
| `--gold-fill` | `#e8b90f` | Small dots: kept, the merge warning |
| `--gold-text` | `#7a5900` | Gold as text, when unavoidable (AA) |
| `--ok` / `--red` | `#177245` / `#b0352a` | Data only, always with a word or symbol |

### Dark mode (the night match)

| Token | Value |
|---|---|
| `--bg` / `--bg2` / `--card` | `#0b0c0a` / `#11120f` / `#151511` |
| `--line` / `--line2` | `#262620` / `#393830` |
| `--ink` / `--ink-soft` / `--muted` | `#f4f2ea` / `#d8d4c8` / `#a39c8b` |
| `--gold` / `--gold-fill` / `--gold-text` / `--gold-mark` | `#d9a91f` / `#f0c420` / `#d9a91f` / `#f0c420` |
| `--ok` / `--red` | `#3fb97f` / `#e0684f` |

Dark mode follows the system until the visitor picks one with the theme switch.

### Hard rules

1. **Gold never fills a surface and never sets body text** (section 0).
2. **Every text color passes WCAG AA (4.5:1) in both themes**; check new styles with the skill's `contrast.js`.
3. **Use `var(--card)` for every panel**; never a white overlay, which turns to grey mush in dark mode.
4. **Color is never the only signal:** kept and not kept differ by fill and by word.
5. **Async validators must always resolve promises** (archived demos).

## 3. Typography

- **Text and headlines:** `var(--sans)`, Archivo. Body 16px at 1.5 to 1.6 line height, lines 45 to 75 characters. Hierarchy comes from width and weight, not a second face.
- **Mono:** `var(--mono)`, IBM Plex Mono: the command, times, labels, code.
- **Wordmark:** `var(--wordmark)`, Hanken Grotesk 500, only in the header and footer lockups.
- **Every font is self-hosted** in `/fonts` (SIL Open Font License 1.1; texts and sources in `fonts/LICENSES.md`), declared once in `site.css`. No page loads a font service. Each page preloads `/fonts/archivo-normal-62-125-100-900-latin.woff2`. The name "Fraunces" in archived pages resolves to Archivo.

## 4. Texture

None. No watermark, grain or lattice on live pages; depth comes from hairlines and the paper and panel tones.

## 4b. Logo and identity

The official mark (the brand kit's `OfficialSyntheLogo.png`, two hooked strokes forming an S) is an inline SVG on every page, from the path data in `tools/apply_chrome.py`.

- **Colors:** path `.a` (top) takes `--agent` (ink); path `.b` (bottom) takes `--gold-mark`. The brand kit's original is ink and brick red on cream; the site uses gold for the bottom stroke to match The Record. The favicon and social card still use the kit's colors until the founders decide otherwise.
- **Lockup:** mark 8px left of "Synthe" in Hanken Grotesk 500, 24px in the header (`.wordmark-logo` 24 x 25), 20px in the footer.
- **States:** the header mark starts apart and locks once on load (`.mark.open`); copy buttons lock on success. Nothing else moves.
- **Icon, favicon and social card:** unchanged (`favicon.svg?v=4`, `og-image.png?v=4`); bump the version if they change.

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
- "Get started" is the one call to action, and it is always in the header (section 0 has the current header; the HTML above is the older shape).
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
| `/` (index) | One-screen homepage (section 0) |
| `docs.html` | Short quickstart: what you need, `npx synthe init`, commands, stop or remove, link to the README |
| `status.html` | Limits and your data: status, limits, your data, this site, security contact |
| `log.html` | Changelog, user-visible changes only |
| `404.html` | Not-found page (noindex) |
| anatomy, benchmarks, forge, how, integrations, playground, quiz, race, receipts, tamper, use-cases | Retired commit-barrier pages: noindex, archived note, out of nav, sitemap and llms.txt. Their numbers still come from the `checker_*`/`beta_*` facts |

## 11. Pitfalls checklist (check before shipping)

- [ ] `python3 tools/stamp.py` run after any edit to `site.css` or `site.js`
- [ ] `python3 tools/check_site.py` passes
- [ ] Homepage still about one screen at 1440x900 and under 200 words; new detail goes to docs or the README
- [ ] No `rgba(255,255,255,X)` card backgrounds (use `var(--card)`)
- [ ] Gold only as a marker: no gold fills, no gold body text
- [ ] Header and footer identical on every page (only `aria-current` differs)
- [ ] Every page links `/site.css` and `/site.js`; nothing loads from another origin
- [ ] Every number is a `data-fact` span backed by `facts.json`
- [ ] Logo mark present next to the wordmark and in the footer on every page; favicon linked
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

