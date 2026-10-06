# Hosting synthe.live

The site is plain static files: no build step. Today it is served by GitHub Pages from `main`.

## Before you publish a change

1. `python3 tools/check_site.py` must pass (CI runs it on every push and pull request).
2. The design-partner form needs a Formspree form ID. Create a form at formspree.io (send
   submissions to info@synthe.live), then replace `YOUR_FORM_ID` in the form's `action` in
   `index.html`. Until then the form opens the visitor's email app instead, and
   `check_site.py` prints a warning.

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
