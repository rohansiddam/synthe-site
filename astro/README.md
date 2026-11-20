# Astro proof (do not merge)

Builds `index.html` and `how.html` with Astro 7 so they render the same as the hand-written pages.
The live site is unchanged: GitHub Pages still serves the repo root from `main`.
Results: `tools/astro_proof/RESULTS.md`. Plan: in the founders' private notes.

| File | Job |
|---|---|
| `src/layouts/Warm.astro` | Shared head lines, skip link, page wrapper, header, footer |
| `src/components/SiteHeader.astro` | The header check_site compares; `current` sets `aria-current` |
| `src/components/SiteFooter.astro` | The footer; a page can replace the call-to-action (`cta` slot) |
| `src/components/Fact.astro`, `src/lib/facts.mjs` | Numbers from `../facts.json` at build time, formatted like `tools/facts.py` |
| `src/lib/assets.mjs` | Content-hashed asset names (replaces `tools/stamp.py` for built pages) |
| `src/components/PageScripts.astro` | One hashed, minified script per page, in today's run order |
| `src/pages/*.astro` | Generated once from the HTML by `tools/astro_proof/convert.py` |
| `astro.config.mjs` | No HTML compression, `.html` file output, no inlined CSS, the two small plugins |

Build: `sh ../tools/astro_proof/build_all.sh` (from this folder) or see RESULTS.md.
