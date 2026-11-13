/* Cached glyph sprites (the Codrops "A Drift" pattern, per the design
   research): every glyph the tendril field can draw is pre-rendered
   once into a small offscreen canvas per character / colour / alpha
   level, and the frame loop only ever drawImage()s. Per-cell fillText
   is the difference between a calm 40 fps and a jank machine, and the
   sprite cache is also what makes the density budget cheap to honour.

   The bake happens ONLY after document.fonts.load resolves for the
   exact IBM Plex Mono face the site uses; baking earlier would burn
   fallback-font glyphs into the cache and every cell would shift when
   the real face arrived. The component re-bakes on fonts.loadingdone
   in case the face swaps in late. */

import { CELL, DIGITS, FAMILY_DIGIT, FAMILY_LETTER, LETTERS, RAMP } from "./engine";

export type Palette = {
  ink: [number, number, number];
  accent: [number, number, number];
};

export const FONT_SPEC = `${CELL}px "IBM Plex Mono"`;
export const FONT_STACK = '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

/* Alpha quantisation for settled cells (ink) and live cells (accent). */
export const INK_LEVELS = [0.16, 0.27, 0.38, 0.5, 0.63, 0.76, 0.89, 1];
export const ACCENT_LEVELS = [0.38, 0.62, 0.85, 1];

const CHARS = Array.from(new Set([...RAMP.slice(1), ...LETTERS, ...DIGITS]));

function levelFor(levels: number[], alpha: number) {
  let best = 0;
  let bd = Infinity;
  levels.forEach((l, i) => {
    const d = Math.abs(l - alpha);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}

/* Decode a trail cell's glyph byte at a given settled density. Ramp
   cells re-derive their character from density, so a thinning cell
   steps down the ramp as it fades; letters and digits are stable. */
export function glyphChar(code: number, density: number): string {
  const family = Math.floor(code / 32);
  const seed = code % 32;
  if (family === FAMILY_LETTER) return LETTERS[seed % LETTERS.length];
  if (family === FAMILY_DIGIT) return DIGITS[seed % DIGITS.length];
  const idx = Math.max(1, Math.min(RAMP.length - 1, Math.floor(density * RAMP.length)));
  return RAMP[idx];
}

export class SpriteAtlas {
  private sprites = new Map<string, HTMLCanvasElement>();
  readonly ss: number; // supersample the sprites were baked at (= dpr)

  constructor(palette: Palette, ss: number) {
    this.ss = ss;
    const size = Math.max(2, Math.round(CELL * ss));
    const bake = (char: string, kind: "ink" | "accent", rgb: [number, number, number], alpha: number) => {
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.font = `${CELL * ss}px ${FONT_STACK}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
      ctx.fillText(char, size / 2, size / 2 + ss * 0.6);
      this.sprites.set(`${char}|${kind}|${alpha}`, c);
    };
    for (const char of CHARS) {
      for (const a of INK_LEVELS) bake(char, "ink", palette.ink, a);
      for (const a of ACCENT_LEVELS) bake(char, "accent", palette.accent, a);
    }
  }

  get(char: string, kind: "ink" | "accent", alpha: number): HTMLCanvasElement | null {
    const levels = kind === "ink" ? INK_LEVELS : ACCENT_LEVELS;
    const key = `${char}|${kind}|${levels[levelFor(levels, alpha)]}`;
    return this.sprites.get(key) ?? null;
  }
}
