// Astro proof for synthe.live (branch astro/two-page-proof, do not merge). Builds index.html and how.html.
//   SITE_PROOF_MODE=parity     every tag as today (same script and stylesheet URLs)
//   SITE_PROOF_MODE=processed  (default) hashed stylesheet names and one hashed, minified script per page
import { defineConfig } from 'astro/config';
import { readFileSync, readdirSync, copyFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_ROOT, hash8 } from './src/lib/assets.mjs';

const ORDER = JSON.parse(readFileSync(new URL('./src/page-scripts.json', import.meta.url), 'utf8'));

/* virtual:page-js/<page> = that page's classic scripts in the order they execute today. Each file stays an
   IIFE inside its own try block, so one failing script does not stop the next (as with separate tags). */
function pageScripts() {
  const PREFIX = 'virtual:page-js/';
  return {
    name: 'synthe-page-scripts',
    resolveId(id) { return id.startsWith(PREFIX) ? '\0' + id : null; },
    load(id) {
      if (!id.startsWith('\0' + PREFIX)) return null;
      const page = id.slice(PREFIX.length + 1);
      if (!ORDER[page]) throw new Error(`no script order for page ${page}`);
      return ORDER[page].map((src) => {
        const file = resolve(SITE_ROOT, src);
        this.addWatchFile(file);
        return `/* ${src} */\ntry {\n${readFileSync(file, 'utf8')}\n} catch (e) { console.error(${JSON.stringify(src)}, e); }\n`;
      }).join('\n');
    },
  };
}

/* Copies each assets/synthe/<name>.<hash>.(css|js) that a built page links, after re-checking the hash. */
function hashedAssets() {
  return {
    name: 'synthe-hashed-assets',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        const seen = new Set();
        for (const f of readdirSync(out).filter((n) => n.endsWith('.html'))) {
          const html = readFileSync(join(out, f), 'utf8');
          for (const m of html.matchAll(/assets\/synthe\/([\w-]+)\.([0-9a-f]{8})\.(css|js)/g)) seen.add(m[0]);
        }
        mkdirSync(join(out, 'assets/synthe'), { recursive: true });
        for (const ref of seen) {
          const [, name, h, ext] = ref.match(/assets\/synthe\/([\w-]+)\.([0-9a-f]{8})\.(css|js)/);
          const src = `assets/synthe/${name}.${ext}`;
          if (hash8(src) !== h) throw new Error(`${ref}: hash does not match ${src}`);
          copyFileSync(resolve(SITE_ROOT, src), join(out, ref));
        }
        logger.info(`${seen.size} hashed asset copies written`);
      },
    },
  };
}

export default defineConfig({
  site: 'https://synthe.live',
  compressHTML: false,               // Astro 7 defaults to JSX whitespace rules; keep the hand-written spacing
  outDir: process.env.SITE_PROOF_OUT || './dist',
  build: { format: 'file', inlineStylesheets: 'never', assets: '_astro' },
  devToolbar: { enabled: false },
  integrations: [hashedAssets()],
  vite: { plugins: [pageScripts()] },
});
