# Synthe Site Design Playbook

How synthe.live looks, why it looks that way, and the exact tokens and patterns to use when changing it. Read this before touching any page.

## 1. Design philosophy

The site's framing is **Archival Ledger & Notary Stamp**: a warm paper archive where agent handoffs get notarized. Think bank ledger, rubber stamps, security paper, not a SaaS dashboard.

- **Weight over wackiness.** One signature interaction exists: the ACCEPT/REJECT stamp slam. Everything else is quiet paper and ink.
- **Paper, not glass.** No glassmorphism, no gradients-as-decoration, no neon. Depth comes from borders, radius, and subtle shadow.
- **Honesty is a visual feature.** Demos are labeled as demos. Sample data is labeled as sample data. Proof claims link to their receipts. Never render anything that implies live production usage.

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

Pages also define `--mono` and terminal tokens (`--term-bg: #1c1611`, `--term-cream: #f0e6d2`, `--term-green: #7fb069`, `--term-amber: #d99a5b`). All pages share one token set; no page-level overrides.

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
4. **`--green` is for text, stamps, and small indicators only.** Small ACCEPT fills and pips use `var(--green)` (forest in light, moss in dark); never paint a large surface green in either mode. Small indicators keep the bright moss; it reads as "lit" on the dark canvas.
5. **Terminal blocks are already dark.** Leave `--term-*` untouched in dark mode.
6. **White overlays are only for already-dark surfaces** (floating pills, dark bands). If the surface adapts to the theme, the overlay must too.

## 3. Typography

- **Display:** `"Fraunces", Georgia, serif` — headlines, the wordmark, stamps, kickers. Weight 500 for headlines, 600-700 for stamps/wordmark. Italic is used sparingly for emphasis words inside headlines.
- **Body:** `"General Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- **Mono:** `"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace` — code, reason codes, kickers, eyebrows, small labels. Eyebrows/kickers are uppercase, letter-spacing `0.08em`-`0.14em`, 12-13px, rust or muted.

Fraunces and IBM Plex Mono load from Google Fonts (the one allowed exception to the no-network rule, and it was already there). Everything else is system. **Every page must include the same font links.** Playground once shipped without them and silently fell back to system fonts (its text looked noticeably thicker); the mismatch was only caught by eye. Copy the `<link>` tags verbatim from another page when adding one.

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
- **Favicon:** `favicon.svg` linked on every page via `<link rel="icon" href="favicon.svg" type="image/svg+xml">`.
- **Social card:** `og-image.png` on the homepage (`og:image`), with the logo and "Synthe" locked up on one line and the tagline "The trust layer for AI agents" beneath in the dark brick red used for the homepage's ACCEPT/REJECT line.
- The full path data lives in the page markup; when the mark needs replacing, swap the whole inline SVG on every page (all 11), not just one.

## 5. Components

### Site header (identical on every page — keep it that way)
```html
<header class="site-head">
  <a class="wordmark" href="/">
    <!-- the logo mark: inline SVG glyph, fill="currentColor", see section 4b -->
    <svg class="wordmark-logo" viewBox="0 0 275 290" aria-hidden="true">...</svg>
    Synthe
  </a>
  <nav class="topnav">
    <a href="forge.html">Forge</a>
    <a href="playground.html">Playground</a>
    <a href="tamper.html">Tamper</a>
    <a href="docs.html">Docs</a>
    <a href="https://github.com/rohansiddam/Synthe">GitHub</a>
    <button class="theme-toggle" id="theme-toggle" type="button">Dark</button>
  </nav>
</header>
```
```css
.site-head { display: flex; align-items: center; justify-content: space-between; padding: 22px 0; border-bottom: 1px solid var(--line); }
.wordmark { font-family: "Fraunces", Georgia, serif; font-size: 26px; color: var(--ink); text-decoration: none; }
.topnav { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; row-gap: 8px; }
.topnav a { margin-left: 18px; color: var(--muted); text-decoration: none; font-size: 15px; white-space: nowrap; }
.topnav a:hover { color: var(--rust); }
/* theme toggle: looks like a nav link, but a 40px tap target (padding + compensating negative margin keeps the 18px visual gap) */
.theme-toggle { background: none; border: none; padding: 10px 12px; margin: -10px -12px -10px 6px; font: inherit; font-size: 15px; color: var(--muted); cursor: pointer; white-space: nowrap; }
.theme-toggle:hover { color: var(--rust); }
.theme-toggle:focus-visible { outline: 2px solid var(--rust); outline-offset: 2px; }
```
Do not add, remove, or reorder nav items on individual pages. Past drift (docs/log had only Home+GitHub; some pages lacked Tamper) was fixed deliberately.

### Buttons
- Primary `.btn`: ink background, cream text, pill radius (`999px`), padding `14px 30px`, font-weight 650. Hover: rust background, `translateY(-1px)`.
- Ghost `.btn.ghost`: transparent, 1.5px `--line` border, ink text; hover border/text go rust.
- Small `.mini-btn` for secondary actions.
- The theme toggle is a text button styled like a nav link; its label flips Dark/Light via JS.

### Cards
`background: var(--card); border: 1px solid var(--line); border-radius: 14px-18px;` Soft shadow `0 2px 14px rgba(29,26,20,.05)` is used on the playground/forge panels.

### The stamp (the one signature interaction)
```css
.stamp { font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 30px; letter-spacing: .06em; padding: 8px 22px; border: 3px solid; border-radius: 8px; transform: rotate(-8deg); display: inline-block; }
.stamp.accept { color: var(--green); border-color: var(--green); }
.stamp.reject { color: var(--red); border-color: var(--red); }
.stamp.show { animation: stampIn .45s cubic-bezier(.2,1.4,.4,1) both; }
@keyframes stampIn { 0% { opacity: 0; transform: scale(2.4) rotate(-14deg); } 60% { opacity: 1; transform: scale(.94) rotate(-8deg); } 100% { opacity: 1; transform: scale(1) rotate(-8deg); } }
```
Always rotated -8deg. Always slammed once via the `show` class (re-trigger by removing, forcing reflow, re-adding). No sound, ever.

### Check rows
Dashed `--line` separators, ✓ in `--green`, ✕ in `--red`. On verdict reveals they stagger in (opacity + translateX, ~90ms stagger via inline `transition-delay`).

### Packet field rows
Two-column grid: small uppercase muted label (`12.5px`, `letter-spacing: .08em`) + semibold value. Zebra striping via `:nth-child(odd)` at 2.5% ink. A tampered field gets `.flash` (red left border + `@keyframes fieldFlash` background pulse) and a `changed` tag (red pill, uppercase 11.5px).

### Attack cards / option buttons
`var(--card)` background, 1.5px `--line` border, radius 12-14px. Hover: `translateY(-2px)`, rust border, soft shadow. Active: slight press (`scale(.99)`).

### Pills and reason tags
- Reason codes: mono 12.5px, rust text, 1px rust-ish border, radius 6px.
- Status pills (e.g. `PACKET SCHEMA 0.1`): mono uppercase, `--line` border, pill radius.
- `changed` tag: white text on `--red`, uppercase.

### Details/summary
Used for "How this works" explainers. `var(--card)` background, `--line` border, pointer cursor on summary.

### Footer
License line, nav (wraps as whole links: `flex-wrap: wrap` + `white-space: nowrap` on links — never let a link wrap mid-phrase), colophon in italic serif ("From the Greek synthēkē, meaning agreement.").

### Marquee (homepage)
Text-only scrolling tape, `var(--ink)` band with `--cream` text, slight -1.2deg rotation, mono uppercase 13px. Dots in rust.

### Terminal blocks
Already-dark panels (`--term-bg`), green/amber mono text. Untouched by theme.

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
3. **Head script** (runs before first paint, prevents flash):
   ```html
   <script>
     try { (function () {
       var t = null;
       try { t = localStorage.getItem("synthe-theme"); } catch (e) {}
       var dark = t ? t === "dark" : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
       document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
     })(); } catch (e) {}
   </script>
   ```
4. **Toggle wiring** before `</body>`: flips `data-theme`, persists to `localStorage["synthe-theme"]`, updates the button label and aria-label.
5. `body { transition: background-color .25s ease, color .25s ease; }` for a smooth flip.

## 7. Motion and interaction principles

- Functional interactions may use client-side JS and CSS transitions. Decorative work must add **no network requests and no JavaScript**.
- Scene changes crossfade + slight rise (`opacity`/`translateY`, ~0.45s). Stagger reveals at ~70-90ms.
- `@media (prefers-reduced-motion: reduce)` must kill transitions and animations (instant swaps).
- No sound. No emojis in UI chrome.

## 8. Copy voice

- Plain English first. Short sentences. Explain what happened and what it means.
- **No em dashes** in any outward-facing copy. Ever.
- No AI-sounding jargon ("repro", "delve", "leverage").
- Reason codes are shown as mono tags next to plain-English explanations, never instead of them.
- Honesty labels: demos say demo; sample ledger entries say sample; the forge's HMAC model is labeled a teaching model, not the production scheme.

## 9. Page inventory

| Page | What it is |
|---|---|
| `/` (index) | Homepage: hero, marquee, interactive demos, proof panel, changelog teaser, footer |
| `forge.html` | Adversarial playground: 6 attacks on a signed handoff, side-by-side lab, inline verdicts |
| `playground.html` | Click-through story: sign a real Ed25519 handoff, then sabotage it 5 ways |
| `tamper.html` | Hash-chain demo: edit/delete/reorder/forge entries, find the broken block |
| `anatomy.html` | CSS-only scrollytelling of a handoff's anatomy |
| `docs.html` | Docs: TOC, check order, full reason-code reference |
| `log.html` | Benefit-led changelog with proof links |
| `quiz.html` | "Do I need this?" quiz |
| `receipts.html` | Source-linked proof claims; sample ledger labeled demo |
| `benchmarks.html` | Measured benchmark table |
| `status.html` | Status and trust notes |

## 10. Pitfalls checklist (check before shipping)

- [ ] No `rgba(255,255,255,X)` card backgrounds (use `var(--card)`)
- [ ] No large `var(--green)` fills; large brand fills hardcode `#6b1212` in both modes
- [ ] Header nav identical on every page
- [ ] Every page loads the same Google Fonts links (Fraunces + IBM Plex Mono)
- [ ] Logo mark present next to the wordmark and in the footer on every page; favicon linked
- [ ] Watermark stroke updated in both light and dark copies
- [ ] Footer links wrap as whole units
- [ ] Toggle present, label flips, choice persists, no flash on reload
- [ ] Reduced-motion fallback present
- [ ] No em dashes in copy
- [ ] Demos labeled honestly; no fabricated usage/receipts/benchmarks
