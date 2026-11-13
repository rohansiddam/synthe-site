/* Dither engine for the lane D1 exploration: ordered (Bayer) dithering over
   the Synthe mark's real path data, plus a small value-noise field for the
   ground study. Nothing here redraws the mark: the mask is rasterised from
   HALF_A / HALF_B exactly as shipped in app/components/Mark.tsx. */

import { HALF_A, HALF_B } from "../components/Mark";

export const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/* 8x8 Bayer ordered-dither thresholds, normalised to (0,1). */
const BAYER8 = [
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
];
export const bayer = (x: number, y: number) =>
  (BAYER8[((y & 7) << 3) + (x & 7)] + 0.5) / 64;

/* ---- The mark as two coverage fields ------------------------------------ */

export type MarkMask = {
  w: number;
  h: number;
  sumA: Float64Array; // summed-area table of half A coverage
  sumB: Float64Array; // summed-area table of half B coverage
};

/* Rasterise the two halves at 2x the 275x290 viewBox and build summed-area
   tables so any grid cell's average coverage is an O(1) lookup while the
   cell size animates. Red channel = half A, blue channel = half B. */
export function buildMarkMask(): MarkMask | null {
  const w = 550;
  const h = 580;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.scale(w / 275, h / 290);
  ctx.fillStyle = "rgb(255,0,0)";
  ctx.fill(new Path2D(HALF_A));
  ctx.fillStyle = "rgb(0,0,255)";
  ctx.fill(new Path2D(HALF_B));
  const img = ctx.getImageData(0, 0, w, h).data;
  const stride = w + 1;
  const sumA = new Float64Array(stride * (h + 1));
  const sumB = new Float64Array(stride * (h + 1));
  for (let y = 0; y < h; y++) {
    let runA = 0;
    let runB = 0;
    const row = y * w;
    const out = (y + 1) * stride;
    const up = y * stride;
    for (let x = 0; x < w; x++) {
      const px = (row + x) * 4;
      runA += img[px] / 255;
      runB += img[px + 2] / 255;
      sumA[out + x + 1] = sumA[up + x + 1] + runA;
      sumB[out + x + 1] = sumB[up + x + 1] + runB;
    }
  }
  return { w, h, sumA, sumB };
}

/* Average coverage of one half over a mask-space rectangle. */
export function cellAvg(
  mask: MarkMask,
  sum: Float64Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const w = mask.w;
  const h = mask.h;
  const ax = clamp(Math.floor(x0), 0, w);
  const ay = clamp(Math.floor(y0), 0, h);
  const bx = clamp(Math.ceil(x1), 0, w);
  const by = clamp(Math.ceil(y1), 0, h);
  const area = (bx - ax) * (by - ay);
  if (area <= 0) return 0;
  const stride = w + 1;
  const total =
    sum[by * stride + bx] - sum[ay * stride + bx] - sum[by * stride + ax] + sum[ay * stride + ax];
  return total / area;
}

/* ---- Theme colours ------------------------------------------------------- */

/* Custom properties like --agent are var() chains; reading them raw gives
   the unresolved token. Probing through a real element's computed `color`
   resolves the chain to rgb() in both themes. */
export function readThemeColors(vars: string[]): Record<string, string> {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const out: Record<string, string> = {};
  const cs = getComputedStyle(probe);
  for (const v of vars) {
    probe.style.color = `var(${v})`;
    out[v] = cs.color;
  }
  probe.remove();
  return out;
}

/* ---- Value noise (the ground's field) ----------------------------------- */

function hash2(x: number, y: number) {
  // Unsigned shifts only: with signed >>, the fold's top bit cancels itself
  // (b ^ b = 0) and the hash silently caps at half range.
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
export function fbm(x: number, y: number, octaves: number) {
  let v = 0;
  let amp = 0.5;
  let fx = x;
  let fy = y;
  for (let i = 0; i < octaves; i++) {
    v += amp * vnoise(fx, fy);
    fx = fx * 2.03 + 1.7;
    fy = fy * 2.03 + 9.2;
    amp *= 0.5;
  }
  return v; // roughly 0..1
}

/* Shared rAF lifecycle: runs only while visible on screen, not while the
   tab is hidden; under reduced motion draws exactly one frame. Returns a
   stop function. Mirrors the HeroField contract. */
export function runFrames(
  el: HTMLElement,
  draw: (now: number) => void,
  reducedMotion: boolean,
) {
  let frame = 0;
  let visible = true;
  const loop = (now: number) => {
    frame = 0;
    draw(now);
    if (visible && !document.hidden && !reducedMotion)
      frame = requestAnimationFrame(loop);
  };
  const run = () => {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(loop);
  };
  draw(performance.now());
  let observer: IntersectionObserver | null = null;
  if (!reducedMotion) {
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (es) => {
          visible = es[0].isIntersecting;
          if (visible) run();
        },
        { rootMargin: "20px 0px" },
      );
      observer.observe(el);
    }
    document.addEventListener("visibilitychange", run);
    run();
  }
  return () => {
    if (frame) cancelAnimationFrame(frame);
    observer?.disconnect();
    document.removeEventListener("visibilitychange", run);
  };
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
