"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CELL } from "./tendrils/engine";
import { setInversionRect } from "./tendrils/inversion";

/* MorphSeam: the world-flip boundary around the morning report.
   Scrolling into the report carries the page from its own ground
   into the opposite theme's ground (dark theme: charcoal opens to
   paper; light theme: the inverse), and the footer returns through
   the same boundary mirrored. The gesture is the one measured on
   the reference (contentarchitecture.dev, founder's recording,
   .reanimate/morph/spec.md): a skyline of reverse-video text cells
   — teeth — intruding into the near world, fixed in page space,
   revealed 1:1 by scroll, with flipped cells of both polarities
   interleaved across the divide and zero motion at rest.

   The ground is painted here, on a page-space canvas registered to
   the tendril grid (CELL px, IBM Plex Mono): per column, one solid
   run of the far ground between the entry surface and the exit
   surface, fringe cells above each surface flipping with a
   probability that ramps over five rows, and sparse back-flips two
   rows into the solid side. The band's own tokens invert only
   under [data-morph="on"], set after the first successful draw:
   with no JS (or no canvas) the band keeps the page theme and the
   page reads exactly as it did before the seam existed. The seam
   registers its far-ground rect with the tendril field so tendrils
   cross the flip in the inverted ink and keep docking.

   The boundary is static by measurement, not by shortcut: the
   reference's parked frames show zero churn, so this canvas draws
   once per resize, font arrival and theme change, and never on a
   timer. Reduced motion therefore gets the identical designed
   boundary, and scroll costs nothing — the canvas is in page
   space and scrolls with the document. */

const STRIP = CELL * 10; // 110px boundary band on each side of the band
const FRINGE_ROWS = 5; // flip-probability ramp depth, in cells
const INTERLEAVE_ROWS = 2; // back-flips inside the solid side

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

/* Deterministic 0..1 hash per grid cell: the fringe pattern is a
   pure function of position, identical on every draw. */
function hash2(x: number, y: number, seed: number): number {
  let h = (seed ^ Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* Teeth heights per column (px into the strip): seeded value noise,
   control points every 3–7 cells with heights 4–108px (the measured
   profile: median ~53px, range ~114px), smoothstep between points,
   plus a small one-cell octave so the skyline stays jagged rather
   than wavy. */
function makeProfile(cols: number, seed: number): Float32Array {
  const rand = mulberry32(seed);
  const pts: [number, number][] = [[0, 4 + rand() * 104]];
  let x = 0;
  while (x < cols) {
    x += 3 + Math.floor(rand() * 5);
    pts.push([Math.min(x, cols), 4 + rand() * 104]);
  }
  const out = new Float32Array(cols);
  for (let cx = 0; cx < cols; cx++) {
    let k = 0;
    while (k < pts.length - 2 && pts[k + 1][0] <= cx) k++;
    const [x0, h0] = pts[k];
    const [x1, h1] = pts[k + 1];
    const t = x1 > x0 ? (cx - x0) / (x1 - x0) : 0;
    const s = t * t * (3 - 2 * t);
    const jag = (hash2(cx, 991, seed) - 0.5) * 10;
    out[cx] = Math.max(2, Math.min(STRIP - 2, h0 + (h1 - h0) * s + jag));
  }
  return out;
}

const LETTERS = "SYNTHE·";
const RAMP_CHARS = ".:-=+*";

function pickGlyph(cx: number, ry: number): string {
  const r = hash2(cx, ry, 777);
  if (r < 0.55) return RAMP_CHARS[Math.floor(hash2(cx, ry, 778) * RAMP_CHARS.length)];
  return LETTERS[Math.floor(hash2(cx, ry, 779) * LETTERS.length)];
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
    const dpr = Math.min(window.devicePixelRatio || 1, coarse || cores <= 4 ? 1.25 : 1.75);

    const draw = () => {
      if (disposed) return;
      const w = seam.clientWidth;
      const h = seam.clientHeight;
      if (w === 0 || h === 0) return;
      const cs = getComputedStyle(seam);
      const ground = cs.getPropertyValue("--morph-ground").trim();
      const farInk = cs.getPropertyValue("--morph-ink").trim();
      const nearGround = getComputedStyle(document.documentElement)
        .getPropertyValue("--bg")
        .trim();
      const nearInk = getComputedStyle(document.documentElement)
        .getPropertyValue("--ink")
        .trim();
      if (!ground || !farInk || !nearGround || !nearInk) return;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      /* Align the cell grid to page space, as the tendril field's
         grid is page-anchored: shift the first row by the seam's
         page-top phase so morph cells and tendril cells coincide. */
      const rect = seam.getBoundingClientRect();
      const pageTop = rect.top + window.scrollY;
      const phase = ((pageTop % CELL) + CELL) % CELL;

      const cols = Math.ceil(w / CELL) + 1;
      const bandTop = STRIP;
      const bandBottom = h - STRIP;
      const entry = makeProfile(cols, 0x5eed1);
      const exit = makeProfile(cols, 0x5eed2);

      /* Surfaces snap to grid rows (the reference's teeth are text
         rows, not freeform heights): row r covers canvas y
         [r*CELL - phase, (r+1)*CELL - phase). Per column, the solid
         far ground runs from the entry surface row to the exit
         surface row; this also fills the whole band box. */
      const rowTop = (r: number) => r * CELL - phase;
      const entryRow = (cx: number) =>
        Math.max(1, Math.round((bandTop - entry[cx] + phase) / CELL));
      const exitRow = (cx: number) =>
        Math.round((bandBottom + exit[cx] + phase) / CELL);
      ctx.fillStyle = ground;
      for (let cx = 0; cx < cols; cx++) {
        ctx.fillRect(cx * CELL, rowTop(entryRow(cx)), CELL + 0.5, (exitRow(cx) - entryRow(cx)) * CELL);
      }

      ctx.font = `${CELL}px "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cell = (cx: number, r: number, block: string, glyphInk: string) => {
        ctx.fillStyle = block;
        ctx.fillRect(cx * CELL, rowTop(r), CELL + 0.5, CELL + 0.5);
        ctx.fillStyle = glyphInk;
        ctx.fillText(pickGlyph(cx, r), cx * CELL + CELL / 2, rowTop(r) + CELL / 2 + 0.6);
      };

      /* Fringe above the entry surface and below the exit surface:
         far-ground blocks with near-ink glyphs, probability ramping
         toward the surface over five rows. Interleave inside the
         solid: sparse near-ground blocks with far-ink glyphs, two
         rows deep. Row indices are page-grid rows, stable across
         draws, so the pattern never re-randomises. */
      for (let cx = 0; cx < cols; cx++) {
        const re = entryRow(cx);
        const rx = exitRow(cx);
        for (let d = 0; d < FRINGE_ROWS; d++) {
          const p = 0.85 * Math.pow(1 - d / FRINGE_ROWS, 1.4);
          if (hash2(cx, re - 1 - d, 0xa11ce) < p) cell(cx, re - 1 - d, ground, nearInk);
          if (hash2(cx, rx + d, 0xb0b) < p) cell(cx, rx + d, ground, nearInk);
        }
        for (let d = 0; d < INTERLEAVE_ROWS; d++) {
          if (hash2(cx, re + d, 0xa11ce ^ 0x9e37) < 0.16) cell(cx, re + d, nearGround, farInk);
          if (hash2(cx, rx - 1 - d, 0xb0b ^ 0x9e37) < 0.16) cell(cx, rx - 1 - d, nearGround, farInk);
        }
      }

      seam.setAttribute("data-morph", "on");
      setInversionRect({ x: 0, y: pageTop + 14, w, h: h - 28 });
    };

    draw();
    /* The mono face may arrive after the first draw; redraw with
       the real glyphs once fonts settle (the tendril discipline). */
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
