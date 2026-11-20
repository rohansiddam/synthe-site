# Astro proof: results

Proof only. Do not merge. Nothing here changes the live site, GitHub Pages settings or the hand-written pages.

- Base: `main` at 97d47a6. Branch: `astro/two-page-proof`.
- Astro 7.4.13 (Vite 8.3.8 with Rolldown), Node 26. Screenshots: installed Google Chrome through playwright-core.
- Built pages: `index.html` and `how.html`. The other 15 pages stay hand-written.
- Plan: in the founders' private notes, with the full-size screenshots.

## The three builds

| Build | Command | What changes |
|---|---|---|
| parity | `SITE_PROOF_MODE=parity` | Layout and components only. Every script and stylesheet tag keeps its URL, order and attributes. |
| processed | default | Stylesheets under `assets/synthe/` get content-hashed names (`assets/synthe/how.3afebbb3.css`). The three Phosphor icon stylesheets keep their path, which already carries a version (`@phosphor-icons/web@2.1.1`). Each page's classic scripts become one hashed, minified module in the order they run today. |
| csp | `SITE_PROOF_CSP=1` (on processed) | The layout also writes the CSP `<meta>`, read from `_headers` at build time. The warm pages carry no CSP meta today. |

## 1. check_site.py on the built output

`tools/astro_proof/assemble.py` copies the whole site and lays the built pages over it. Then the unchanged `tools/check_site.py` runs in that copy.

| Site | Result |
|---|---|
| today (repo root) | 17 pages checked: 0 error(s), 2 warning(s) |
| parity | 17 pages checked: 0 error(s), 2 warning(s) |
| processed | 17 pages checked: 0 error(s), 2 warning(s) |
| csp | 17 pages checked: 0 error(s), 2 warning(s) |

The two warnings are the same in every row: the partner form email fallback, and the homepage word budget (1349 of 900). `tools/facts.py check` passes in every copy.

One finding: Astro writes `<path ...></path>` where the hand-written pages have `<path .../>`. The DOM is the same, but check_site compares the header as text. With the header as normal Astro markup, the check failed: `the header differs between warm pages: docs.html, partner.html | how.html, index.html`. So while docs.html and partner.html stay hand-written, `SiteHeader.astro` emits its markup raw (`set:html`). The footer block that check_site compares has no self-closing tags, so it passes as markup.

## 2. The Fact component

index.html and how.html have no `data-fact` elements today, so a fixture page tests `<Fact>`. It renders every scalar fact in facts.json. `tools/astro_proof/check_facts.py` reads it with `facts.py`'s own regex and `fmt()`:

`21 data-fact elements, 19 scalar facts: 0 mismatch(es), 0 missing`

facts.json has no floats today, so the check also compares the JS port of Python's `:g` with Python on 12 edge values (0.1, 999999.5, 1e21 and others). All match. The first port failed on 999999.5 (`1000000` against `1e+06`); it is fixed.

## 3. Screenshot diffs (1440x900 and 390x844, full page)

Reduced motion, light scheme, DPR 1, after `document.fonts.ready` and a scroll pass. "today" is captured twice to get the noise floor. Pixel threshold 0.1 (pixelmatch).

| Page | Width | Build | Page height (today / build) | Pixels that differ | Same DOM with JS off | Console errors | Failed requests | CSP violations |
|---|---|---|---|---|---|---|---|---|
| index.html | 1440 | today, second run (noise floor) | 7134 / 7134 | 0 | n/a | 0 | 0 | 0 |
| index.html | 1440 | parity | 7134 / 7134 | 0 | head order differs | 0 | 0 | 0 |
| index.html | 1440 | processed | 7134 / 7134 | 0 | head order differs | 0 | 0 | 0 |
| index.html | 1440 | csp | 7134 / 7134 | 0 | head order differs | 0 | 0 | 0 |
| index.html | 390 | today, second run (noise floor) | 10063 / 10063 | 0 | n/a | 0 | 0 | 0 |
| index.html | 390 | parity | 10063 / 10063 | 0 | head order differs | 0 | 0 | 0 |
| index.html | 390 | processed | 10063 / 10063 | 0 | head order differs | 0 | 0 | 0 |
| index.html | 390 | csp | 10063 / 10063 | 0 | head order differs | 0 | 0 | 0 |
| how.html | 1440 | today, second run (noise floor) | 6327 / 6327 | 0 | n/a | 0 | 0 | 0 |
| how.html | 1440 | parity | 6327 / 6327 | 0 | yes | 0 | 0 | 0 |
| how.html | 1440 | processed | 6327 / 6327 | 0 | yes | 0 | 0 | 0 |
| how.html | 1440 | csp | 6327 / 6327 | 0 | yes | 0 | 0 | 0 |
| how.html | 390 | today, second run (noise floor) | 8445 / 8445 | 0 | n/a | 0 | 0 | 0 |
| how.html | 390 | parity | 8445 / 8445 | 0 | yes | 0 | 0 | 0 |
| how.html | 390 | processed | 8445 / 8445 | 0 | yes | 0 | 0 | 0 |
| how.html | 390 | csp | 8445 / 8445 | 0 | yes | 0 | 0 | 0 |

"head order differs": index.html's layout writes the shared meta and icon lines in one order, so a few head lines move. A tag-by-tag check of the parity build found the same 739 elements with the same attributes.

## 4. Motion on: do the bundled scripts behave the same?

Reduced motion makes many scripts stop early, so this run allows motion. It loads the page and scrolls slowly. Then it opens the product dropdown (1440) or the phone menu (390). On index it also clicks an install chip and an industry tab, and types in the prompt form. Those three steps exercise `industries.js`, `try.js` and `promptbox.js`: the scripts without `"use strict"`, which now run in strict mode inside the module. A third run at 390 emulates a touch phone (`is-touch` path). After each step it compares:
- the element count (without script and meta tags);
- the `<html>` classes and every `aria-expanded`;
- the visibility of the dropdown and the sheet;
- the industry tab states and the prompt form's output text.

"steps" lists each interaction and whether it changed the page in today's build.

| Page | Width | Build | Console/page errors | CSP violations | Script effects match today |
|---|---|---|---|---|---|
| index.html | 1440 | today | 0 | 0 | reference; steps: dropdown (changed), chip (changed), industry (changed), typed (changed) |
| index.html | 1440 | processed | 0 | 0 | yes |
| index.html | 1440 | csp | 0 | 0 | yes |
| index.html | 390 | today | 0 | 0 | reference; steps: menu (changed), chip (changed), industry (changed), typed (changed) |
| index.html | 390 | processed | 0 | 0 | yes |
| index.html | 390 | csp | 0 | 0 | yes |
| index.html | 390 touch | today | 0 | 0 | reference; steps: menu (changed), chip (changed), industry (changed), typed (changed) |
| index.html | 390 touch | processed | 0 | 0 | yes |
| index.html | 390 touch | csp | 0 | 0 | yes |
| how.html | 1440 | today | 0 | 0 | reference; steps: dropdown (changed) |
| how.html | 1440 | processed | 0 | 0 | yes |
| how.html | 1440 | csp | 0 | 0 | yes |
| how.html | 390 | today | 0 | 0 | reference; steps: menu (changed) |
| how.html | 390 | processed | 0 | 0 | yes |
| how.html | 390 | csp | 0 | 0 | yes |
| how.html | 390 touch | today | 0 | 0 | reference; steps: menu (changed) |
| how.html | 390 touch | processed | 0 | 0 | yes |
| how.html | 390 touch | csp | 0 | 0 | yes |

## 5. Shipped JavaScript

External script files plus inline script bodies. JSON-LD is data and is not counted. gzip level 9.

| Page | Build | Script requests | External JS | Inline JS | Total raw | Total gzip |
|---|---|---|---|---|---|---|
| index.html | today | 13 | 173,199 B | 609 B | 173,808 B | 54,904 B |
| index.html | parity | 13 | 173,199 B | 609 B | 173,808 B | 54,904 B |
| index.html | processed | 1 | 113,050 B | 609 B | 113,659 B | 37,164 B |
| how.html | today | 6 | 97,866 B | 0 B | 97,866 B | 28,996 B |
| how.html | parity | 6 | 97,866 B | 0 B | 97,866 B | 28,996 B |
| how.html | processed | 1 | 62,883 B | 0 B | 62,883 B | 19,676 B |

Processed: index.html -34.6% raw, -32.3% gzip, 12 fewer requests. how.html -35.7% raw, -32.1% gzip, 5 fewer requests. The saving is minification plus one file per page. Astro adds no runtime of its own.

## Limits

- Pixels are compared at reduced motion only. With motion on, the check compares script effects, not pixels.
- The 390 screenshots have no touch emulation; the touch path is covered by the behaviour check only.
- Chrome only, light scheme only. Safari and Firefox are not tested.
- Fonts and images that the stylesheets reference keep their plain names (not hashed), and so do the three Phosphor stylesheets.
- Not served by GitHub Pages. `_astro/` needs `.nojekyll`, which the repo has.

## Reproduce

```sh
cd astro && npm ci && cd ..
sh tools/astro_proof/build_all.sh
python3 tools/astro_proof/assemble.py astro/dist /tmp/stage-processed && (cd /tmp/stage-processed && python3 tools/check_site.py)
python3 tools/astro_proof/check_facts.py astro/dist/fact-fixture.html
python3 tools/astro_proof/js_size.py astro/dist
node tools/astro_proof/shots.mjs /tmp/shots today=. processed=/tmp/stage-processed
node tools/astro_proof/motion_check.mjs today=. processed=/tmp/stage-processed
```
