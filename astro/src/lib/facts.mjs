/* Build-time facts (replaces `tools/facts.py apply` for pages Astro builds). Same formatting as fmt() in
   tools/facts.py: *_on and *_date are ISO dates shown as "October 6, 2026"; floats use Python's :g. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SITE_ROOT } from './assets.mjs';

export const FACTS = JSON.parse(readFileSync(resolve(SITE_ROOT, 'facts.json'), 'utf8'));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December'];

export function pyG(x) {
  // Python f"{x:g}": round to 6 significant digits first, then use exponent form if that exponent is
  // below -4 or at least 6; trailing zeros are dropped either way.
  if (x === 0) return '0';
  const [m, e] = x.toExponential(5).split('e');
  const exp = Number(e);
  if (exp < -4 || exp >= 6) {
    return `${m.replace(/\.?0+$/, '')}e${exp < 0 ? '-' : '+'}${String(Math.abs(exp)).padStart(2, '0')}`;
  }
  return String(Number(x.toPrecision(6)));
}

export function factText(key) {
  if (!(key in FACTS) || key.startsWith('_')) throw new Error(`unknown fact '${key}' (add it to facts.json)`);
  const value = FACTS[key];
  if (key.endsWith('_on') || key.endsWith('_date')) {
    const [y, m, d] = String(value).split('-').map(Number);
    return `${MONTHS[m - 1]} ${d}, ${y}`;
  }
  if (typeof value === 'number' && !Number.isInteger(value)) return pyG(value);
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  return String(value);
}
