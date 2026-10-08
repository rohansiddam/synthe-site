# Hosting synthe.live

The site is plain static files: no build step. Today it is served by GitHub Pages from `main`.

## Preview and publish

Preview locally with `python3 tools/serve.py` (http://127.0.0.1:8790, caching off).

## Before you publish a change

1. If you edited `site.css` or `site.js`, run `python3 tools/stamp.py` so every page links the new version.
   Then `python3 tools/check_site.py` must pass (CI runs it on every push and pull request).
2. The design-partner form opens the visitor's email app today, so nothing goes to a third
   party. To switch to Formspree: create a form at formspree.io (send submissions to
   rohansiddam@synthe.live), put its ID in `data-formspree` on the form in `index.html`, and change
   the two privacy lines that describe the form (under the form on the homepage, and "The
   partner form" on `status.html`) to say submissions go to Formspree, which keeps a copy.
   `check_site.py` fails if those lines and the form disagree.

## Why move to Cloudflare Pages

GitHub Pages can't send custom response headers, so the security headers in `_headers`
(HSTS, a CSP that also blocks framing, `nosniff`, a referrer policy and a permissions policy)
only take effect on a host that reads that file. Every page already carries the same CSP as a
`<meta>` tag, which works on any host except for `frame-ancestors`.

## Moving to Cloudflare Pages

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git, and pick
   `rohansiddam/synthe-site`. Production branch `main`, no build command, output directory `/`.
2. In the Pages project, add the custom domain `synthe.live`. If the domain's DNS is already on
   Cloudflare, it replaces the GitHub Pages records for you; otherwise point the records where it
   tells you.
3. Check the headers once DNS has switched:
   `curl -sI https://synthe.live | grep -i -E "strict-transport|content-security|x-content-type"`
4. Then turn off GitHub Pages in the repo settings. The `CNAME` and `.nojekyll` files are
   harmless on Cloudflare.

## The two GitHub workflows

- `site-check.yml` runs `tools/check_site.py` on every push and pull request.
- `refresh-facts.yml` runs every Monday (and on demand). It checks out the public checker,
  re-runs its tests and attack packets, updates `facts.json` and the pages, and opens a pull
  request if anything changed. It never publishes on its own. It needs the repo setting
  Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests".
