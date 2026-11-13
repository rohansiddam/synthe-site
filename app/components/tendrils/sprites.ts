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

import { CELL, RAMP } from "./engine";

export type Palette = {
  ink: [number, number, number];
  accent: [number, number, number];
  /* The morph seam's ink: the colour tendrils take inside the
     inverted region, so they read on the far ground. */
  invInk: [number, number, number];
};

export type SpriteKind = "ink" | "accent" | "inkInv";

export const FONT_SPEC = `${CELL}px "IBM Plex Mono"`;
export const FONT_STACK = '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

/* Alpha quantisation for settled cells (ink) and live cells (accent). */
export const INK_LEVELS = [0.16, 0.27, 0.38, 0.5, 0.63, 0.76, 0.89, 1];
export const ACCENT_LEVELS = [0.38, 0.62, 0.85, 1];

/* The trail alphabet is the ramp and nothing else (wave 2): letters
   and digits in a margin read as floating debris, not as a path.
   They remain in the emblem, which has its own renderer. */
const CHARS = Array.from(new Set([...RAMP.slice(1)]));

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

/* Decode a trail cell at a given settled density. The character is
   re-derived from density, so a thinning cell steps down the ramp
   (from * through + = - : to .) as it fades, and only clears once it
   has faded through the light end: lightness is expressed by glyph
   choice, never by a missing cell in the middle of a path. The
   stored byte's seed is unused now that the ramp is the whole
   alphabet; it is kept in the encoding for stability across world
   swaps within a session. */
export function glyphChar(code: number, density: number): string {
  void code;
  const idx = Math.max(1, Math.min(RAMP.length - 1, Math.floor(density * RAMP.length)));
  return RAMP[idx];
}

export class SpriteAtlas {
  private sprites = new Map<string, HTMLCanvasElement>();
  readonly ss: number; // supersample the sprites were baked at (= dpr)

  constructor(palette: Palette, ss: number) {
    this.ss = ss;
    const size = Math.max(2, Math.round(CELL * ss));
    const bake = (char: string, kind: SpriteKind, rgb: [number, number, number], alpha: number) => {
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
      for (const a of INK_LEVELS) bake(char, "inkInv", palette.invInk, a);
      for (const a of ACCENT_LEVELS) bake(char, "accent", palette.accent, a);
    }
  }

  get(char: string, kind: SpriteKind, alpha: number): HTMLCanvasElement | null {
    const levels = kind === "accent" ? ACCENT_LEVELS : INK_LEVELS;
    const key = `${char}|${kind}|${levels[levelFor(levels, alpha)]}`;
    return this.sprites.get(key) ?? null;
  }
}
