/* Content-hashed asset names, computed at build time (replaces tools/stamp.py for the pages Astro builds).
   asset('assets/synthe/how.css') -> 'assets/synthe/how.<first 8 hex of sha256>.css'. The hashedAssets
   integration in astro.config.mjs writes the hashed copy next to the original in dist/, so relative
   url() references inside the stylesheet keep working. Parity mode returns the path unchanged. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const SITE_ROOT = resolve(process.cwd(), '..');

export function hash8(path) {
  return createHash('sha256').update(readFileSync(resolve(SITE_ROOT, path))).digest('hex').slice(0, 8);
}

export function asset(path) {
  if (process.env.SITE_PROOF_MODE === 'parity') return path;
  return path.replace(/\.(css|js)$/, `.${hash8(path)}.$1`);
}
