# Synthe Site Design Playbook

The design and interaction contract for synthe.live. Run `python3 tools/check_site.py` before shipping. Sections 0–4b below supersede older examples in the component archive.

## 0. The polish pass (2026-11-05)

The site keeps The Record's warm paper and ink, with the original logo's **brick red**, selected by Rohan on 2026-11-05. Authority comes from alignment, readable type and complete interaction states. The references are source-code studies of Ramp, Stripe, Harvey, Watershed, Brex, Rippling, Aesop, RIMOWA, Teenage Engineering, Apple, Polestar, Linear and Vercel. Source studies inform the interaction patterns; all implementation here is native HTML, CSS and JavaScript.

- One shared 1200px usable rail: outer max 1296px, with 48px desktop, 32px tablet and 24px phone gutters. Header, homepage and footer align.
- Hero: Archivo 500; headline on seven grid columns, lead and setup action on five, bottom-aligned. Stack at 960px. The headline is 64px desktop, 48px tablet and 40px phone, 1.04/1.06 leading and −.025em tracking.
- One labelled product example below the hero. Its two prompt changes advance automatically once, then report verdicts appear in order. Start when the prompt is substantially visible; on phone wait for the report to enter view before revealing its verdicts. Each visible sequence stays under five seconds. No replay, loading spinner, round timeline, fake window controls or looping motion. Reduced motion/no JS show the complete result. Reserve both text layers in the same grid cell so changes never move the layout.
- One accent system, defined in `site.css`. Main buttons stay ink. Brick marks identity and meaningful details; results also have words. Old `--gold*` names alias current semantic tokens for archived pages.
- Controls have 6px corners; the product frame 10px. Editorial setup rows have hairlines and no rounded container. No default shadows, dotted textures or decorative gradients.
- 96px section spacing and 128px chapter gaps on desktop; 56–72px on phone. Pixel padding/margin/gap values use the 4px grid. Font sizes use 11, 12, 13, 14, 16, 18, 20, 24, 32px; display sizes use `clamp()`.
- Resting selectors own transitions, so pointer leave reverses. UI: 200ms `cubic-bezier(.25,1,.5,1)`. Arrow travel: 2px. Only a clickable card's child visual lifts, by 2px over 250ms. Fixed hit areas, no layout animation, fine-pointer hover only, matching keyboard feedback.
- Native scroll. The stable 64px header (56px phone) gains its hairline and a restrained translucent surface after 8px. Anchors allow the measured header plus 32px. Below-fold, noncritical chapters may reveal once by 12px over 400ms; already-visible content stays still. No scroll hijacking.
- Theme palette changes immediately as one state, with transitions temporarily suppressed. Only the toggle's selected indicator moves for 200ms. Preference resolves before first paint, follows the system until chosen, persists and synchronizes tabs. Reduced motion removes indicator and reveal movement.
- Homepage target: under 900 words; approximately four desktop screenfuls and nine phone screenfuls at most. Detail belongs in Docs. Verify actual dimensions rather than shrinking text to meet a budget.

## 1. Design philosophy

- Calm, legible, specific. Neutral surfaces carry the work; accent is sparse.
- The product is the imagery. The example is an authored, once-only sequence, explicitly labelled, not a live product session.
- Honest states are part of polish. Clipboard failure must not report success. Static explanatory rows do not move as if clickable. Keyboard and touch get complete experiences.
- Source research establishes mechanisms; Synthe's dimensions and reduced motion amplitudes are our own design choices. Do not import proprietary fonts, imagery, shaders or frameworks.

## 1b. What the site says

The site sells **Synthe, self-improving AI agents** (public `synthelabs/synthe`, Apache-2.0, npm `synthe`). It says what Synthe does, how to start, plain limits and data handling. It does not publish a roadmap, private customer details or inner-model/performance claims.

| Where | Approved copy |
|---|---|
| Category | Self-improving AI agents |
| Headline | Your AI agent gets better on its own. |
| Motto | You say what good looks like. Synthe tests changes and keeps only what wins. |
| Explanation | Synthe tries small changes to your agent's prompt, tests them against your checks, and keeps only clear wins. A report says what changed. |
| Header action | Get started, linking to `/docs.html` |
| Contact | Using AI agents in production? Talk to us. |

Keep current copy unless Rohan changes it. No “sleep” in the tagline. Tests are simulated; only the prompt changes; check results yourself. Explain merge versus review plainly. One public demo proof link, no invented statistics, logos, testimonials, customers, prices or certification claims. Quantitative facts come from `facts.json`.

Live pages: `/`, `docs.html`, `status.html`, `log.html`. The old commit-barrier pages remain archived/noindex and outside live navigation, sitemap and llms files. Old broker/licensing and “design-partner beta” guidance below applies only to those archived surfaces, not the current Apache-2.0 product.

## 2. Colour system

Every colour role is a CSS variable in `site.css`. Rohan chose original brick `#B5412F`; do not change it without his approval.

| Role | Light | Dark |
|---|---|---|
| Page / secondary / card | `#faf8f1` / `#f2eee2` / `#ffffff` | `#0b0c0a` / `#11120f` / `#151511` |
| Ink / soft ink | `#171410` / `#3a352c` | `#f4f2ea` / `#d8d4c8` |
| Muted / faint | `#6b6455` | `#a39c8b` |
| Line / stronger line | `#e3ddce` / `#cfc7b4` | `#262620` / `#393830` |
| `--accent`, `--accent-text`, `--accent-fill`, `--accent-mark` | `#b5412f` | `#e08c79` |
| `--accent-bg` | `#f6e6df` | `#30201c` |
| `--on-accent` | `#ffffff` | `#0b0c0a` |
| Success / danger (data only) | `#177245` / `#b0352a` | `#3fb97f` / `#e0684f` |

Legacy `--gold`, `--gold-text`, `--gold-fill`, `--gold-bg`, `--gold-mark` alias these accent roles. They no longer mean yellow. Main CTA stays ink-on-paper inverted; do not turn it into a brand-colour fill.

Light brick passes small-text AA on page, card and secondary surface (5.25/5.58/4.81:1). Dark pale brick passes there (7.65/7.15/7.34:1). **Ink on solid light brick fails (3.29:1); white on pale dark brick fails (2.56:1).** Use `--on-accent` for any solid accent fill, or tint plus ink. Results always carry text, so brand red is never the only “kept” signal. Verify composed/translucent colours in both themes; endpoint ratios alone are insufficient.

## 3. Typography

Self-hosted Archivo is the one base face. Hanken Grotesk survives only in the official wordmark; IBM Plex Mono is for commands, source excerpts, labels and record details. Fonts are declared once in `site.css`; every page preloads Archivo Latin. No font service requests.

| Role | Size / line height / weight |
|---|---|
| H1 | display `clamp()` 40–64px / 1.04 (phone 1.06) / 500; −.025em; 16ch |
| H2 | display `clamp()` 28–40px / 1.1 / 500; concise measure |
| Card heading | 20px / 1.35–1.4 / 500 |
| Lead | 18px / 1.55 / 400; strong phrase 500 |
| Body | 16px / 1.5–1.6 / 400 |
| Controls | 14px / about 20px / 500 |
| Code / metadata | 12–14px / 1.5–1.65 / 400 |

Use balanced headings and pretty wrapping for prose. Do not condense or shrink a desktop product UI onto phone; recompose it. No artificial bold weight, default text shadow or whole-page motion.

## 4. Texture

None on live pages. Depth comes from paper, secondary and card surfaces with purposeful hairlines. Do not add dot matrices, grain, watermarks, lattice or ornamental glow to the product still.

## 4b. Logo and identity

The official two hooked strokes are inline SVG, using path data in `tools/apply_chrome.py`. Top uses ink (`--agent`); bottom uses brick (`--accent-mark`, via legacy `--gold-mark`). Do not redraw it.

Header lockup: 24px mark/wordmark, 8px gap; footer 20px. The phone Menu button is 44px tall with explicit horizontal/vertical content centring, 20px line height and zero vertical padding; its centre matches the wordmark. The header mark locks once on load, 400ms with the shared easing, after a short 120ms delay; reduced motion is immediate. Copy feedback reports actual clipboard results.

Fixed-light favicon and touch icon use paper, ink and exact original brick. Sources: `favicon.svg?v=5`, raster favicon/touch icons generated from it. The social card is `og-image.png?v=6`, 2240×1120 from `tools/og-image.html`, matching the new product still without browser chrome. Update references on all pages when an image changes.

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
- Live pages use the finite motion contract in section 0: 200ms UI, 400ms/12px chapter reveal, no repeated scenes.
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
| `/` (index) | Product-led homepage (section 0) |
| `docs.html` | Short quickstart: what you need, `npx synthe init`, commands, stop or remove, link to the README |
| `status.html` | Limits and your data: status, limits, your data, this site, security contact |
| `log.html` | Changelog, user-visible changes only |
| `404.html` | Not-found page (noindex) |
| anatomy, benchmarks, forge, how, integrations, playground, quiz, race, receipts, tamper, use-cases | Retired commit-barrier pages: noindex, archived note, out of nav, sitemap and llms.txt. Their numbers still come from the `checker_*`/`beta_*` facts |

## 11. Pitfalls checklist (check before shipping)

- [ ] `python3 tools/stamp.py` run after any edit to `site.css` or `site.js`
- [ ] `python3 tools/check_site.py` passes
- [ ] Homepage under 900 words, readable at 1440x900 and 375px; new detail goes to Docs
- [ ] No `rgba(255,255,255,X)` card backgrounds (use `var(--card)`)
- [ ] Approved brick roles are readable in both themes; no ink on solid light brick or white on pale dark brick
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

## 13. UX laws and craft rules

Added 2026-11-12, from the living-console improvement spec. The 20 laws are the standard set collected at [lawsofux.com](https://lawsofux.com), restated here as checks on this site's surfaces; the reel or source that surfaced each one is named with it. These rules bind every change: a pull request that violates one does not merge, and the pull request description states which rules it touches and how each was verified. Where the console work differs from the finite motion contract in sections 0 and 7 (a replay loop, a round readout), the difference is deliberate and scoped to the hero console; sections 0 and 7 still govern everything else.

1. **Aesthetic-usability effect.** Users read a polished interface as a working one. Check: the hero console looks like a real product surface, with real file chrome, real metadata and real states, never an illustration of one.
2. **Hick's law** (@zen_ux). Decision time rises with the number and complexity of choices. Check: one primary action per view (the install command); the console shows at most six cards; on phone it shows three, with the rest behind one clearly labelled expansion.
3. **Fitts's law.** Primary targets are large and near the thumb or cursor path. Check: the install pill and Get started stay the biggest interactive elements in the hero; console cards are not click targets except for their one real link.
4. **Jakob's law.** Users expect the conventions of every other developer tool. Check: file tabs, diffs, PR states and progress in the console and the report artifact read the way GitHub and CI tools render them; no invented iconography for known states.
5. **Miller's law.** Working memory holds about seven chunks. Check: six console cards maximum; the report card summarizes and does not enumerate all 30 test cases, which live one click away in the real report.
6. **Doherty threshold.** Feedback lands inside 400ms or the interaction feels broken. Check: the copy button confirms instantly, hover states stay within the 100 to 400ms UI motion band, and the console loop never makes a visitor wait for information.
7. **Law of proximity** (@zanderwhitehurst). Related elements group tightly; unrelated ones separate. Check: inside each console card, label, value and state sit as one group, and card-to-card gaps exceed every in-card gap.
8. **Law of similarity.** Same meaning, same treatment, everywhere. Check: a passing check looks identical in the console, the report artifact and Docs; semantic colour (rule C2) is the mechanism.
9. **Common region.** A card's border is what makes its contents one thing. Check: nothing straddles a card edge, and the score line never bleeds into the neighbouring card.
10. **Visual hierarchy.** Size and position say what matters. Check: score movement first, run state second, metadata last, in every console card and in the hero as a whole; one alignment anchor per card, text left-aligned, never centred stacks (@zanderwhitehurst).
11. **Progressive disclosure** (@zen_ux). Show what everyone needs; tuck the rest one tap away. Check: the hero shows the loop working, while the full 30-case detail, the raw JSON and the methodology live behind the real links to the demo run and Docs.
12. **Recognition over recall.** Labels are words, not memory tests. Check: segments read "Automatic" and "Review", states read "merged" and "no winner", and no product state is ever a bare icon.
13. **Von Restorff effect.** The one different thing is what gets remembered. Check: exactly one element on the homepage breaks pattern, the merge moment in the console loop; accent colour sprinkled around is not a substitute.
14. **Peak-end rule** (@zen_ux). People judge an experience by its peak and its end. Check: the peak is the merge moment, the end of the page is the morning report printed in the footer, and both are designed deliberately rather than left to whatever happens to be last.
15. **Goal gradient.** Effort accelerates near a visible goal. Check: the run card shows round 3 of 4, not an abstract spinner, and the install section reads as three short steps with the last one visibly closest to done.
16. **Serial position.** First and last items in a sequence are remembered. Check: the first viewport carries what Synthe is plus proof it works, the last viewport carries the morning report and one action, and middle sections carry detail, not the message.
17. **Tesler's law.** Complexity is conserved; someone absorbs it, and here the site does. Check: the console explains the loop with no prior knowledge assumed, and terms like "held-out" are glossed in place the first time they appear.
18. **Postel's law.** Be liberal in what the page accepts. Check: every page works with JavaScript off (the console shows its final recorded state), with reduced motion, at 390px, and in a text-only pass, without losing the message or the numbers.
19. **Occam's razor.** Every card, section and animation must answer what the visitor learns from it. Check: if the answer is decoration, it is cut; this rule outranks garnish of any kind.
20. **Feedback loops.** Every action answers visibly. Check: copy confirms, the theme toggle transitions, the partner form reports its real state at each step and ends in a designed success state; no silent buttons anywhere on the site.

Craft rules, same binding force:

- **C1. Invisible UX** (@zen_ux, "Invisible UX Design"). Progress bars where a wait carries uncertainty, because they give perceived control; skeleton loaders instead of spinners for anything that loads; no motion that does not carry information.
- **C2. Semantic colour is a stoplight language** (@zen_ux). System, brand, error, warning and success each get one token and one meaning across the whole site. The accent never means success, and the success colour never decorates.
- **C3. Slop removal** (@charles.unemployed / charles-unslop). One title and one call to action per screen region; concentric radii (inner radius equals outer radius minus padding) on every nested surface in the console; shadows tinted to the scene (warm dark in the dark theme, never neutral grey slabs); shared-element transitions where a thing becomes another thing, such as the PR card's open-to-merged state change.
- **C4. Design skill or slop** (Theo Browne's Fable 5.2 testing). Generated UI without a design system in the loop defaults to template output, and its known failure modes include overused eyebrow labels and subheading stacks. Check: generated code for this site works from this playbook plus this section, and its output gets a Hallmark audit before review.
- **C5. One whole job, defined done** (@daniel_strongin_ai, @sheni_icg). Whoever or whatever builds a change gets the whole change as one job, with the spec's acceptance as the definition of done. Agent-facing files follow the same hygiene: instructions layered (this playbook always loaded, per-change detail on demand), conflicting rules audited out, and hard "never" or "must" wording kept only where it is truly hard. The no-fabricated-numbers rule is one.

