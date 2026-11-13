/* Lane D2 shared math: ordered-dither thresholds, the console climb's
   easing, and the recorded series geometry (identical mapping to
   components/console/ScoreCard.tsx, so the dithered climb and the
   production line are the same drawing in two renderings). */

import { dogfoodRun } from "@/lib/runData";

/** Bayer 8x8 ordered-dither matrix, values 0..63. */
const BAYER8_RAW = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

/** Threshold in 0..1 for the lattice cell at integer (cx, cy). */
export function bayer(cx: number, cy: number): number {
  const x = ((cx % 8) + 8) % 8;
  const y = ((cy % 8) + 8) % 8;
  return (BAYER8_RAW[y][x] + 0.5) / 64;
}

/** Deterministic per-cell hash in 0..1 (decorrelates a second pass). */
export function cellHash(cx: number, cy: number): number {
  const s = Math.sin(cx * 127.1 + cy * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

/** A cubic-bezier easing solver (Newton + bisection fallback), so the
    canvas animations use the same curves as the site's CSS/framer
    motion instead of approximating them with polynomials. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-6) return sampleY(t);
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (hi - lo > 1e-6) {
      if (sampleX(t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

/** The climb's ease, identical to Console.tsx's CLIMB_EASE. */
export const climbEase = cubicBezier(0.65, 0, 0.35, 1);
export const easeOut = cubicBezier(0.22, 1, 0.36, 1);
export const easeInOut = cubicBezier(0.65, 0, 0.35, 1);

/* ------------------------------------------------------------------ */
/* The recorded series geometry, in ScoreCard's viewBox units.        */
/* ------------------------------------------------------------------ */

export const VB_W = 560;
export const VB_H = 348;
export const PAD = { left: 38, right: 14, top: 16, bottom: 30 };
export const X0 = 4;
export const X1 = 14;

export const vbX = (round: number) =>
  PAD.left + ((round - X0) / (X1 - X0)) * (VB_W - PAD.left - PAD.right);
export const vbY = (pct: number) =>
  PAD.top + (1 - pct / 100) * (VB_H - PAD.top - PAD.bottom);

export interface VbPoint {
  round: number;
  scorePct: number;
  outcome: string;
  x: number;
  y: number;
}

export const POINTS: VbPoint[] = dogfoodRun.series.map((p) => ({
  ...p,
  x: vbX(p.round),
  y: vbY(p.scorePct),
}));

export const MERGE_INDEX = POINTS.findIndex((p) => p.round === dogfoodRun.mergedRound);
/** Draw units run 0..(points-1) along the segments, as in ScoreCard. */
export const DRAW_UNITS = POINTS.length - 1;

/** The head's position at draw value v: linear along each recorded
    segment; the easing lives in the tween that drives v. */
export function headAt(v: number) {
  const c = Math.min(Math.max(v, 0), DRAW_UNITS);
  const i = Math.min(Math.floor(c), POINTS.length - 2);
  const f = c - i;
  const a = POINTS[i];
  const b = POINTS[i + 1];
  return {
    x: lerp(a.x, b.x, f),
    y: lerp(a.y, b.y, f),
    score: lerp(a.scorePct, b.scorePct, f),
    round: POINTS[Math.round(c)].round,
  };
}

/** Score (0..1) and line height at an arbitrary viewBox x, by segment
    interpolation of the recorded points. */
export function seriesAt(x: number): { score01: number; y: number } {
  if (x <= POINTS[0].x) return { score01: POINTS[0].scorePct / 100, y: POINTS[0].y };
  for (let i = 0; i < POINTS.length - 1; i++) {
    const a = POINTS[i];
    const b = POINTS[i + 1];
    if (x <= b.x) {
      const f = (x - a.x) / (b.x - a.x);
      return { score01: lerp(a.scorePct, b.scorePct, f) / 100, y: lerp(a.y, b.y, f) };
    }
  }
  const last = POINTS[POINTS.length - 1];
  return { score01: last.scorePct / 100, y: last.y };
}

export const fmtScore = (s: number) => {
  const r = Math.round(s * 10) / 10;
  return Number.isInteger(r) ? `${r}` : `${r.toFixed(1)}`;
};
