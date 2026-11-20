// Screenshot and DOM diffs: hand-written pages (repo root) against staged Astro builds.
//   node tools/astro_proof/shots.mjs OUT_DIR today=. parity=STAGE1 processed=STAGE2 csp=STAGE3
// Serves each folder from an in-process static server, captures index.html and how.html full-page at
// 1440x900 and 390x844 in installed Chrome (playwright-core, channel 'chrome'), reduced motion, DPR 1,
// after fonts load and a scroll pass. "today" is captured twice to measure the noise floor.
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, join, resolve, normalize } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(resolve('astro/package.json'));
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch').default ?? require('pixelmatch');

const [outDir, ...specs] = process.argv.slice(2);
const targets = Object.fromEntries(specs.map((s) => s.split('=')).map(([k, v]) => [k, resolve(v)]));
const PAGES = ['index.html', 'how.html'];
const VIEWPORTS = [{ name: '1440', width: 1440, height: 900 }, { name: '390', width: 390, height: 844 }];
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon' };

function serve(root) {
  return new Promise((ok) => {
    const srv = http.createServer(async (req, res) => {
      const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^\/+/, '') || 'index.html';
      try {
        const body = await readFile(join(root, path));
        res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(body);
      } catch { res.writeHead(404); res.end('not found'); }
    }).listen(0, '127.0.0.1', () => ok(srv));
  });
}

async function capture(browser, base, page, vp, file) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1,
    reducedMotion: 'reduce', colorScheme: 'light' });
  await ctx.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  const p = await ctx.newPage();
  const errors = [], failed = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  p.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 200)));
  p.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().replace(base, '/')}`); });
  await p.goto(base + page, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(async () => {           // scroll pass so scroll-revealed sections settle the same way
    const step = Math.max(200, innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    scrollTo(0, 0); await new Promise((r) => setTimeout(r, 300));
  });
  await p.waitForTimeout(1200);
  const height = await p.evaluate(() => document.documentElement.scrollHeight);
  const csp = await p.evaluate(() => window.__csp);
  await p.screenshot({ path: file, fullPage: true, animations: 'disabled', caret: 'hide' });
  await ctx.close();
  return { height, errors, failed, csp };
}

async function dom(browser, base, page) {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.goto(base + page, { waitUntil: 'load' });
  const html = await p.evaluate(() => document.documentElement.outerHTML);
  await ctx.close();
  return html
    .replace(/<script\b[^>]*\bsrc="[^"]*"[^>]*><\/script>\s*/g, '')       // script tags differ by design
    .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\s*/g, '')
    .replace(/(assets\/synthe\/[\w-]+)\.[0-9a-f]{8}\.(css|js)/g, '$1.$2')  // hashed names
    .replace(/>\s+</g, '><').replace(/\s+/g, ' ');                       // whitespace between tags
}

function diff(a, b, out) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const crop = (img) => { const c = new PNG({ width: w, height: h }); PNG.bitblt(img, c, 0, 0, w, h, 0, 0); return c; };
  const ca = crop(A), cb = crop(B), d = new PNG({ width: w, height: h });
  const n = pixelmatch(ca.data, cb.data, d.data, w, h, { threshold: 0.1 });
  return { pixels: n, pct: (100 * n) / (w * h), sizeA: [A.width, A.height], sizeB: [B.width, B.height], png: n ? PNG.sync.write(d) : null };
}

await mkdir(outDir, { recursive: true });
const servers = {}, bases = {};
for (const [k, root] of Object.entries(targets)) { servers[k] = await serve(root); bases[k] = `http://127.0.0.1:${servers[k].address().port}/`; }
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
for (const page of PAGES) {
  const domToday = await dom(browser, bases.today, page);
  for (const vp of VIEWPORTS) {
    const shots = {};
    const runs = [['today', 'today'], ['today2', 'today'], ...Object.keys(targets).filter((k) => k !== 'today').map((k) => [k, k])];
    for (const [label, key] of runs) {
      const file = join(outDir, `${page.replace('.html', '')}-${vp.name}-${label}.png`);
      shots[label] = { file, ...(await capture(browser, bases[key], page, vp, file)) };
    }
    for (const [label, s] of Object.entries(shots)) {
      if (label === 'today') continue;
      const d = diff(await readFile(shots.today.file), await readFile(s.file));
      if (d.png) await writeFile(join(outDir, `${page.replace('.html', '')}-${vp.name}-${label}-diff.png`), d.png);
      const sameDom = label === 'today2' ? null : (await dom(browser, bases[label], page)) === domToday;
      results.push({ page, viewport: vp.name, against: label, height_today: shots.today.height, height: s.height,
        diff_pixels: d.pixels, diff_pct: +d.pct.toFixed(4), same_dom_without_js: sameDom,
        console_errors: s.errors, failed_requests: s.failed, csp_violations: s.csp,
        today_console_errors: shots.today.errors, today_failed: shots.today.failed });
    }
  }
}
await browser.close();
for (const s of Object.values(servers)) s.close();
await writeFile(join(outDir, 'results.json'), JSON.stringify(results, null, 2));
console.log('| Page | Width | Compared with today | Height (today / build) | Pixels differing | DOM same (no JS) | Console errors | Failed requests | CSP violations |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const r of results) {
  console.log(`| ${r.page} | ${r.viewport} | ${r.against === 'today2' ? 'today again (noise floor)' : r.against} | ${r.height_today} / ${r.height} | ` +
    `${r.diff_pixels} (${r.diff_pct}%) | ${r.same_dom_without_js === null ? 'n/a' : r.same_dom_without_js ? 'yes' : 'NO'} | ` +
    `${r.console_errors.length} | ${r.failed_requests.length} | ${r.csp_violations.length} |`);
}
