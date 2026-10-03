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

| Token | Value | Role |
|---|---|---|
| `--cream` | `#ece4d1` | Page background |
| `--cream-deep` | `#e3d7bd` | Alt background, wells, code chips |
| `--card` | `#fffdf7` | Card surfaces (lifted off the page) |
| `--ink` | `#1c1611` | Primary text |
| `--ink-soft` | `#4c4433` | Secondary text |
| `--muted` | `#8b7d64` | Muted text, nav links |
| `--line` | `#e0d4b8` | Borders, rules, dividers |
| `--rust` | `#b8490f` | Primary accent (links, eyebrows, hovers) |
| `--rust-deep` | `#93380a` | Deep accent |
| `--green` | `#0b4b41` | Success (deep pine). Text, stamps, small indicators |
| `--green-soft` | `#e9f2ec` | Success tint background |
| `--red-soft` | `#f6e3d5` | Danger tint background |

Pages also define `--mono` (`"IBM Plex Mono", ui-monospace, ...`) and terminal tokens (`--term-bg: #1c1611`, `--term-cream`, `--term-green`, `--term-amber`). The playground additionally uses `--paper`, `--red`.

### Dark mode (`html[data-theme="dark"]`)

Same names, warm inverted values. The concept is "the archive after hours": deep espresso, not blue-gray.

| Token | Value |
|---|---|
| `--cream` | `#171310` |
| `--cream-deep` | `#201a14` |
| `--card` | `#211b13` |
| `--ink` | `#ede3cd` |
| `--ink-soft` | `#cbbfa5` |
| `--muted` | `#9d8f74` |
| `--line` | `#3a3125` |
| `--rust` | `#e07840` |
| `--rust-deep` | `#b85a28` |
| `--green` | `#7fc9a8` |
| `--green-soft` | `#1d2b24` |
| `--red-soft` | `#2e1d16` |

### Hard rules learned the painful way

1. **Never use `rgba(255,255,255,X)` for a card background.** On light mode it reads as paper; in dark mode it renders as washed-out gray mush. Use `var(--card)` for every card, always.
2. **Large green fills stay deep pine in both modes.** `--green` brightens to sage in dark mode, which is correct for *text, stamps, and small indicators* but wrong for *large filled areas* (the text on them was designed for pine). Any selector with `background: var(--green)` covering a large area gets an explicit dark override:
   ```css
   html[data-theme="dark"] .proof-panel { background: #0b4b41; }
   html[data-theme="dark"] .change .card.good { background: #0b4b41; border-color: #0b4b41; }
   ```
   Small indicators (pips, step dots) keep the bright sage; it reads as "lit".
3. **Terminal blocks are already dark.** Leave `--term-*` untouched in dark mode.
4. **White overlays are only for already-dark surfaces** (floating pills, dark bands). If the surface adapts to the theme, the overlay must too.

## 3. Typography

- **Display:** `"Fraunces", Georgia, serif` — headlines, the wordmark, stamps, kickers. Weight 500 for headlines, 600-700 for stamps/wordmark. Italic is used sparingly for emphasis words inside headlines.
- **Body:** `"General Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- **Mono:** `"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace` — code, reason codes, kickers, eyebrows, small labels. Eyebrows/kickers are uppercase, letter-spacing `0.08em`-`0.14em`, 12-13px, rust or muted.

Fraunces and IBM Plex Mono load from Google Fonts (the one allowed exception to the no-network rule, and it was already there). Everything else is system.

## 4. Texture

- **The watermark** is a single inline SVG data-URI tile (lathe-like wavy lines + concentric circles), applied as `body { background-image }`. No network request, no JavaScript. Stroke color is `%23241d14` at 5% opacity in light mode; each page carries a dark-mode override swapping the stroke to `%23ede3cd`:
  ```css
  html[data-theme="dark"] body { background-image: url("data:image/svg+xml,...stroke='%23ede3cd'..."); }
  ```
  When editing the tile, change the stroke in BOTH copies.
- There is no grain overlay (it was removed). Do not add one.

## 5. Components

### Site header (identical on every page — keep it that way)
```html
<header class="site-head">
  <a class="wordmark" href="/">Synthe</a>
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
     --cream: #171310;
     /* ... full table from section 2 ... */
   }
   ```
2. **Watermark swap** (if the page has the texture): dark block overriding `body { background-image }` with the `%23ede3cd` stroke copy.
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
- [ ] No large `var(--green)` fills without a dark-mode pine pin
- [ ] Header nav identical on every page
- [ ] Watermark stroke updated in both light and dark copies
- [ ] Footer links wrap as whole units
- [ ] Toggle present, label flips, choice persists, no flash on reload
- [ ] Reduced-motion fallback present
- [ ] No em dashes in copy
- [ ] Demos labeled honestly; no fabricated usage/receipts/benchmarks
