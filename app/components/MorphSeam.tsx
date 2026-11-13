"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { setInversionRect } from "./tendrils/inversion";

/* MorphSeam: the world-flip boundary around the morning report.
   Scrolling into the report carries the page from its own ground
   into the opposite theme's ground (dark theme: charcoal opens to
   paper; light theme: the inverse), and the footer returns through
   the same boundary mirrored.

   The boundary replicates the morph on contentarchitecture.dev as
   captured in the founder's recording (spec and measurements:
   site-visual-review/morph2/spec.md). The reference terrain is not
   blocks: one continuous monospace phrase stream covers the far
   section, and near the edge individual character cells flip
   reverse-video — near-ground block, far-ink glyph scheme inverted —
   with flip probability ramping across ~±2 rows around a nominal
   surface. The flipped cells are the teeth. This rebuild renders
   exactly that, in Synthe's own record vocabulary:

   - A text grid registered to page space (15px IBM Plex Mono,
     9px char advance, 16.7px row pitch — the reference's cells).
     The stream is the report band's own lines, flowing continuously
     across rows: character (col, row) is a pure function of its
     page-grid position.
   - Per char column, a nominal surface profile whose quantiles are
     pinned by construction: median 53px above the band edge,
     deepest tooth 119px, p90−p10 amplitude 72px on the
     cream-to-black crossing and 83px on black-to-cream.
   - Each cell flips worlds by a probability ramping over ±34px
     around the surface, decided by blended smooth + per-cell hash
     noise, so flips arrive in short runs like the reference. Far
     cells carry the stream glyph dimming with depth (1 → 0.45);
     flipped cells pop at full strength in the other world's
     block + ink. On the near side, stream glyphs scatter in near
     ink with density decaying over ~5 rows, plus rare fully
     flipped far blocks.

   The canvas is in page space and draws once per resize, font
   arrival and theme change — never on a timer — so the silhouette
   is fixed in page space, moves 1:1 with scroll, and has zero
   churn at rest by construction. It overflows the wrapper by
   OVER px top and bottom (layout height unchanged) so 119px teeth
   are not clipped at the strip edge. The band's tokens invert only
   under [data-morph="on"], set after the first successful draw:
   with no JS the band keeps the page theme, exactly as before the
   seam existed. */

const STRIP = 110; // layout padding above/below the band (globals.css)
const OVER = 16; // canvas overflow past the wrapper; layout never sees it
const FONT_PX = 15;
const CHAR_W = 9; // IBM Plex Mono advance at 15px (0.6em)
const ROW_H = 16.7;
const DITHER = 30; // flip-probability ramp half-width, px (~2 rows)
const MED = 53; // median surface height above the band edge, px
const MIN_H = -10; // shallowest surface (dips just past the edge)
const MAX_H = 119; // deepest tooth

/* Crossing targets (p10 / p90 of the surface-height distribution).
   Cream-to-black measured tighter than black-to-cream on the
   reference; which crossing is the entry depends on the theme. */
const CROSS = {
  creamBlack: { p10: 17, p90: 89 }, // amplitude 72
  blackCream: { p10: 11.5, p90: 94.5 }, // amplitude 83
};

const STREAM =
  "THE MORNING REPORT · CHECKS PASSED 89% OF THE TIME, UP FROM 72% · " +
  "HELD-OUT SCORE 50% TO 80% · STOP APPROVING REFUNDS AND INVENTING DATES (PR #8) · " +
  "4 ROUNDS: 1 MERGED, 2 NO WINNER, 1 FAILED · SPEND $0.32 OF A $3 BUDGET · " +
  "KEPT WHAT WINS, DROPPED WHAT DIDN'T · ";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Deterministic 0..1 hash per grid cell: every pattern below is a
   pure function of position, identical on every draw. */
function hash2(x: number, y: number, seed: number): number {
  let h = (seed ^ Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* Smooth value noise (bilinear, smoothstepped lattice) so flip
   decisions cohere over a few cells instead of salting. */
function vnoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf);
  const sy = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/* Surface heights per char column (px above the band edge). Seeded
   value noise, control points every 4–10 columns, then a piecewise
   quantile map that pins min / p10 / median / p90 / max to the
   measured targets by construction, whatever the seed drew. */
function makeProfile(
  cols: number,
  seed: number,
  target: { p10: number; p90: number },
): Float32Array {
  const rand = mulberry32(seed);
  const pts: [number, number][] = [[0, rand()]];
  let x = 0;
  while (x < cols) {
    x += 4 + Math.floor(rand() * 7);
    pts.push([Math.min(x, cols), rand()]);
  }
  const raw = new Float32Array(cols);
  for (let cx = 0; cx < cols; cx++) {
    let k = 0;
    while (k < pts.length - 2 && pts[k + 1][0] <= cx) k++;
    const [x0, h0] = pts[k];
    const [x1, h1] = pts[k + 1];
    const t = x1 > x0 ? (cx - x0) / (x1 - x0) : 0;
    const s = t * t * (3 - 2 * t);
    raw[cx] = h0 + (h1 - h0) * s + (hash2(cx, 991, seed) - 0.5) * 0.05;
  }
  const sorted = Array.from(raw).sort((a, b) => a - b);
  const q = (p: number) =>
    sorted[Math.min(cols - 1, Math.max(0, Math.floor(p * cols)))];
  const qmin = sorted[0];
  const q10 = q(0.1);
  const q50 = q(0.5);
  const q90 = q(0.9);
  const qmax = sorted[cols - 1];
  const seg = (v: number, a: number, b: number, c: number, d: number) =>
    c + (d - c) * ((v - a) / Math.max(1e-6, b - a));
  const out = new Float32Array(cols);
  for (let cx = 0; cx < cols; cx++) {
    const v = raw[cx];
    out[cx] =
      v <= q10
        ? seg(v, qmin, q10, MIN_H, target.p10)
        : v <= q50
          ? seg(v, q10, q50, target.p10, MED)
          : v <= q90
            ? seg(v, q50, q90, MED, target.p90)
            : seg(v, q90, qmax, target.p90, MAX_H);
  }
  return out;
}

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function MorphSeam({ children }: { children: ReactNode }) {
  const seamRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const seam = seamRef.current;
    const canvas = canvasRef.current;
    if (!seam || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let disposed = false;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const cores = navigator.hardwareConcurrency ?? 8;
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      coarse || cores <= 4 ? 1.25 : 1.75,
    );

    const draw = () => {
      if (disposed) return;
      /* Size from the seam, never from the canvas itself: a canvas
         is a replaced element, so its laid-out size feeds back from
         its bitmap. Pin the CSS size explicitly, then the bitmap. */
      const w = seam.clientWidth;
      const h = seam.clientHeight + 2 * OVER;
      if (w === 0 || h === 0) return;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const cs = getComputedStyle(seam);
      const ground = cs.getPropertyValue("--morph-ground").trim();
      const farInk = cs.getPropertyValue("--morph-ink").trim();
      const rootCs = getComputedStyle(document.documentElement);
      const nearGround = rootCs.getPropertyValue("--bg").trim();
      const nearInk = rootCs.getPropertyValue("--ink").trim();
      if (!ground || !farInk || !nearGround || !nearInk) return;

      /* Light theme: page cream, band black — entry (top) crosses
         cream-to-black. Dark theme swaps both crossings. */
      const farIsDark = luminance(ground) < luminance(nearGround);
      const entryTarget = farIsDark ? CROSS.creamBlack : CROSS.blackCream;
      const exitTarget = farIsDark ? CROSS.blackCream : CROSS.creamBlack;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      /* Page-space grid: row boundaries sit on page y multiples of
         ROW_H, char columns on canvas x multiples of CHAR_W (the
         canvas is full-bleed at page x 0), so the pattern is a pure
         function of page position. */
      const rect = seam.getBoundingClientRect();
      const seamPageTop = rect.top + window.scrollY;
      const canvasPageTop = seamPageTop - OVER;
      const rowBase = Math.floor(canvasPageTop / ROW_H);
      const phase = canvasPageTop - rowBase * ROW_H; // canvas y of row -rowBase's top edge offset
      const rowTop = (r: number) => r * ROW_H - phase;

      const cols = Math.ceil(w / CHAR_W) + 1;
      const bandTop = OVER + STRIP;
      const bandBottom = h - OVER - STRIP;
      const entry = makeProfile(cols, 0x5eed1, entryTarget);
      const exit = makeProfile(cols, 0x5eed2, exitTarget);
      const surfE = (cx: number) => bandTop - entry[cx];
      const surfX = (cx: number) => bandBottom + exit[cx];

      /* Solid far ground, per column, surface to surface. */
      ctx.fillStyle = ground;
      for (let cx = 0; cx < cols; cx++) {
        ctx.fillRect(cx * CHAR_W, surfE(cx), CHAR_W + 0.6, surfX(cx) - surfE(cx));
      }

      ctx.font = `${FONT_PX}px "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";

      const streamLen = STREAM.length;
      const glyph = (cx: number, absRow: number, ink: string, alpha: number) => {
        const idx = (((absRow * cols + cx) % streamLen) + streamLen) % streamLen;
        const ch = STREAM[idx];
        if (ch === " ") return;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ink;
        ctx.fillText(ch, cx * CHAR_W + 0.5, rowTop(absRow - rowBase) + ROW_H / 2 + 0.5);
        ctx.globalAlpha = 1;
      };
      const block = (cx: number, r: number, fill: string) => {
        ctx.fillStyle = fill;
        ctx.fillRect(cx * CHAR_W, rowTop(r), CHAR_W + 0.6, ROW_H + 0.6);
      };

      /* Cells: entry strip rows have centre above bandTop, exit
         strip rows below bandBottom. sd > 0 is the far side. */
      const rMin = 0;
      const rMax = Math.ceil((h + phase) / ROW_H);
      for (let r = rMin; r <= rMax; r++) {
        const yC = rowTop(r) + ROW_H / 2;
        if (yC > bandTop + 2 && yC < bandBottom - 2) continue; // band interior: solid fill only
        const absRow = rowBase + r;
        for (let cx = 0; cx < cols; cx++) {
          const sd =
            yC < bandTop ? yC - surfE(cx) : surfX(cx) - yC;
          const pFar = Math.min(
            0.98,
            Math.max(0.02, 0.5 + sd / (2 * DITHER)),
          );
          /* Flip noise: coherent along the row (flips arrive in
             short horizontal runs, as on the reference) but nearly
             independent per row — a tall smooth patch would grow
             the measured silhouette a full row past the nominal
             surface. */
          const n =
            0.6 * vnoise(cx / 3.5, absRow / 0.8, 0x7117) +
            0.4 * hash2(cx, absRow, 0x7118);
          if (n < pFar) {
            /* Far world owns the cell: ground block + stream glyph,
               full strength at the front, dimming with depth. */
            block(cx, r, ground);
            const alpha =
              sd <= 0 ? 1 : Math.max(0.45, 1 - 0.55 * (sd / 110));
            glyph(cx, absRow, farInk, alpha);
          } else if (sd > 0) {
            /* Near world punched into the far side: reverse-video
               hole — near block, near glyph, full strength. */
            block(cx, r, nearGround);
            glyph(cx, absRow, nearInk, 1);
          } else {
            /* Near side: rare fully flipped far block, else sparse
               stream glyphs in near ink decaying away from the
               surface. */
            if (sd > -3 * ROW_H && hash2(cx, absRow, 0x9a17) < 0.012) {
              block(cx, r, ground);
              glyph(cx, absRow, farInk, 1);
            } else if (
              hash2(cx, absRow, 0x5ca7) <
              0.55 * Math.exp(sd / (2.2 * ROW_H))
            ) {
              glyph(cx, absRow, nearInk, 0.85);
            }
          }
        }
      }

      seam.setAttribute("data-morph", "on");
      setInversionRect({ x: 0, y: seamPageTop, w, h: seam.clientHeight });
    };

    draw();
    /* The mono face may arrive after the first draw; redraw with
       the real glyphs once fonts settle. */
    document.fonts?.ready.then(() => draw()).catch(() => {});

    const ro = new ResizeObserver(() => draw());
    ro.observe(seam);
    const themeObs = new MutationObserver(() => draw());
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      disposed = true;
      ro.disconnect();
      themeObs.disconnect();
      setInversionRect(null);
    };
  }, []);

  return (
    <div className="morph-seam" ref={seamRef}>
      <canvas className="morph-canvas" ref={canvasRef} aria-hidden="true" />
      {children}
    </div>
  );
}
