// Motion-on behaviour check: the bundled scripts must do what the separate scripts do today.
//   node tools/astro_proof/motion_check.mjs today=. processed=STAGE [csp=STAGE]
// For each page and width (motion allowed): console errors, page errors, CSP violations, and a fingerprint
// of what the scripts changed (element count, <html> classes, aria-expanded/hidden states) after load, a
// slow scroll pass and a few interactions: product dropdown (1440), phone menu (390, also with touch
// emulation), install chip, industry tabs and typing in the prompt form (index; these exercise
// industries.js, try.js and promptbox.js, the three scripts without "use strict" that now run strict).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, normalize } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(resolve('astro/package.json'));
const { chromium } = require('playwright-core');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const targets = Object.fromEntries(process.argv.slice(2).map((s) => s.split('=')).map(([k, v]) => [k, resolve(v)]));
const serve = (root) => new Promise((ok) => { const s = http.createServer(async (q, r) => {
  const p = normalize(decodeURIComponent(new URL(q.url, 'http://x').pathname)).replace(/^\/+/, '') || 'index.html';
  try { const b = await readFile(join(root, p)); r.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); r.end(b); }
  catch { r.writeHead(404); r.end(); } }).listen(0, '127.0.0.1', () => ok(s)); });

async function run(browser, base, page, width, touch = false) {
  const ctx = await browser.newContext({ viewport: { width, height: width > 500 ? 900 : 844 }, reducedMotion: 'no-preference',
    hasTouch: touch, isMobile: touch });
  await ctx.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  p.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 160)));
  await p.goto(base + page, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 300) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); await new Promise((r) => setTimeout(r, 600)); });
  const state = () => p.evaluate(() => ({
    elements: document.querySelectorAll('*:not(script):not(meta)').length,
    html: [...document.documentElement.classList].sort().join(' '),
    expanded: [...document.querySelectorAll('[aria-expanded]')].map((e) => e.getAttribute('aria-expanded')).join(''),
    hidden: [...document.querySelectorAll('[data-synav-drop],[data-synav-sheet]')].map((e) => (e.hidden ? 'h' : 'v')).join(''),
    canvases: document.querySelectorAll('canvas').length,
    styled: document.querySelectorAll('[style]').length > 0,
    tryText: [...document.querySelectorAll('[data-try-objective],[data-try-path],[data-try-agent]')].map((e) => e.textContent.trim()).join(' | '),
    seg: [...document.querySelectorAll('.seg_opt[data-industry]')].map((e) => e.getAttribute('aria-pressed') + e.getAttribute('aria-checked') + e.className).join(','),
  }));
  const fp = { loaded: await state() };
  if (width > 500) {
    await p.hover('button.synav-item[aria-controls="synav-product"]'); await p.waitForTimeout(700); fp.dropdown = await state();
  } else {
    await p.locator('button.synav-toggle').click(); await p.waitForTimeout(700); fp.menu = await state();
    await p.locator('button.synav-toggle').click(); await p.waitForTimeout(500);
  }
  if (page === 'index.html') {
    const chip = p.locator('.hero-install_chip[data-tool="Codex"]');
    if (await chip.isVisible()) { await chip.click(); await p.waitForTimeout(500); fp.chip = await state(); }
    const tab = p.locator('.seg_opt[data-industry]').nth(1);
    if (await tab.count()) { await tab.click(); await p.waitForTimeout(900); fp.industry = await state(); }
    const field = p.locator('#sculptor-prompt');
    if (await field.count()) { await field.fill('Answer refund questions in the customer\'s language'); await p.waitForTimeout(900); fp.typed = await state(); }
  }
  const csp = await p.evaluate(() => window.__csp);
  await ctx.close();
  return { errors, csp, fp };
}

const servers = {}; const bases = {};
for (const [k, root] of Object.entries(targets)) { servers[k] = await serve(root); bases[k] = `http://127.0.0.1:${servers[k].address().port}/`; }
const browser = await chromium.launch({ channel: 'chrome' });
console.log('| Page | Width | Build | Console/page errors | CSP violations | Script effects match today |');
console.log('|---|---|---|---|---|---|');
const steps = (fp) => Object.keys(fp).filter((k) => k !== 'loaded')
  .map((k) => k + (JSON.stringify(fp[k]) === JSON.stringify(fp.loaded) ? ' (no change)' : ' (changed)')).join(', ');
for (const page of ['index.html', 'how.html']) for (const [width, touch] of [[1440, false], [390, false], [390, true]]) {
  const ref = await run(browser, bases.today, page, width, touch);
  const w = touch ? `${width} touch` : String(width);
  console.log(`| ${page} | ${w} | today | ${ref.errors.length} | ${ref.csp.length} | reference; steps: ${steps(ref.fp)} |`);
  for (const k of Object.keys(targets).filter((x) => x !== 'today')) {
    const r = await run(browser, bases[k], page, width, touch);
    const same = JSON.stringify(r.fp) === JSON.stringify(ref.fp);
    console.log(`| ${page} | ${w} | ${k} | ${r.errors.length} | ${r.csp.length} | ${same ? 'yes' : 'NO: ' + JSON.stringify(r.fp).slice(0, 300) + ' vs ' + JSON.stringify(ref.fp).slice(0, 300)} |`);
    for (const e of r.errors) console.log('   error:', e);
  }
  for (const e of ref.errors) console.log('   today error:', e);
}
await browser.close();
for (const s of Object.values(servers)) s.close();
