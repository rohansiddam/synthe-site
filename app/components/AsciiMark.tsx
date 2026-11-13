"use client";

/* AsciiMark: the Synthe mark as a contained foreground emblem, drawn
   out of IBM Plex Mono glyphs on its own small canvas.
 *
 * This is the mark-as-artifact, not the mark-as-background: no scroll
 * uniforms, no fixed positioning, no page state. It reuses the /ascii
 * lane's proven machinery in Canvas 2D form (the integration branch
 * carries no three.js, and a 120-360px emblem does not need it):
 *
 *   - the exact HALF_A / HALF_B paths from Mark.tsx, rasterized once
 *     per mark state with half A in the R channel and half B in the G
 *     channel, then area-sampled onto the emblem's grid (never
 *     redrawn);
 *   - the density ramp + the SYNTHE letter/digit row, per-cell crawl
 *     clocks (~1-2s staggered re-rolls inside each cell's density
 *     neighbourhood, the reference band's measured mutation pace),
 *     layered-simplex breakup zones in the interior, letters surfacing
 *     and sinking in the mid-density bands, crest cells clamped to the
 *     heaviest ramp levels so the silhouette never thins;
 *   - ink / accent channel split: half A renders in --ink (with the
 *     shader's slight warmth toward the accent at its peaks), half B
 *     in --accent, both re-read from the site tokens on theme flips;
 *   - a Sobel edge pass over the coverage grid (integration fix):
 *     cells with a strong coverage gradient draw a directional
 *     glyph (- | / \) aligned to the edge tangent instead of a
 *     density-ramp glyph, so the mark's strokes read as strokes
 *     with drawn outlines rather than stipple; only flat interior
 *     cells use the ramp and the letter mixing.
 *
 * The Parca pass (2026-11-13) gives the emblem two independent
 * clocks, translated from withparca.com's measured system (one fixed
 * camera, a slow ambient motion, and a periodic rebuild into a new
 * state on its own timer; nothing scroll, hover or drag driven):
 *
 *   Clock A, ambient: the crawl above, calmed (tick intervals x1.5,
 *   slower noise drift). It never stops for clock B: settled cells
 *   keep crawling through every phase, including the flat baseline.
 *
 *   Clock B, rebuild: a 12s slot per state. The built state holds
 *   ~5.5s, dissolves over ~2.2s (cells extinguish top-first, so the
 *   mark sinks; as each column finishes sinking, its cell lands on
 *   the baseline, the thin glyph row at the emblem's foot), holds
 *   flat ~2s as that baseline alone, then regrows over ~2.3s,
 *   bottom-first, into the NEXT state. The state sequence is the
 *   demo run's own round order, each round testing first, then its
 *   recorded outcome: testing, merged, testing, no winner, testing,
 *   failed, testing, no winner. The four states are the mark
 *   system's own (Mark.tsx + globals.css): testing = halves held
 *   open, merged = halves locked, no winner = the dashed outline
 *   (the vector mark's stale state), failed = halves split wider,
 *   drawn in the error red (the vector mark's refused state). Stroke
 *   states rasterize the paths stroked, with the CSS dash pattern,
 *   so the glyph grid carries the same outline the vector draws.
 *
 * The vector mark renders underneath as an inline SVG and the canvas
 * fades over it only once its first full frame is painted, so there
 * is no flash of wrong content and no layout shift (the box carries
 * a fixed 275/290 aspect ratio; the cycle only repaints cells inside
 * it, so document height never moves). Glyphs are hard-clipped to
 * their cell, exactly as the shader's atlas sampling clipped them,
 * which is what makes per-cell incremental redraws safe: a changed
 * cell is cleared and repainted without ever disturbing its
 * neighbours.
 *
 * Pauses off-screen (IntersectionObserver) and on a hidden tab.
 * prefers-reduced-motion paints one static glyph frame of the
 * merged state, fully built, and no cycle runs. */

import { useEffect, useRef, type CSSProperties } from "react";
import { HALF_A, HALF_B } from "./Mark";
import { clamp, hash21, lerp, smoothstep, snoise } from "./ascii-mark/noise";

const RAMP = [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"];
const LETTERS = [
  "S", "Y", "N", "T", "H", "E",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
];
const MAX_IDX = RAMP.length - 1;

/* The channel raster: the mark drawn at 800px tall inside an 880px
   square, as in the /ascii lane's logoTexture, so the sampling below
   starts from the same data the shader used. */
const TEX_SIZE = 880;
const MARK_HEIGHT = 800;
const MARK_SCALE = MARK_HEIGHT / 290; // the viewBox is 275 x 290
const MARK_W = 275 * MARK_SCALE;
const MARK_X = (TEX_SIZE - MARK_W) / 2;
const MARK_Y = (TEX_SIZE - MARK_HEIGHT) / 2;

/* ---- Clock B: the rebuild cycle ---- */
type MarkState = "testing" | "merged" | "nowinner" | "failed";
/* The demo run's rounds in order (lib/runData.ts): each round is
   tested, then resolves merged, no winner, failed, no winner. */
const STATE_SEQ: MarkState[] = [
  "testing", "merged",
  "testing", "nowinner",
  "testing", "failed",
  "testing", "nowinner",
];
const SLOT_S = 12; // one state per 12s slot
const HOLD_END = 5.5; // built, ambient only
const DISSOLVE_END = 7.7; // +2.2s sinking
const FLAT_END = 9.7; // +2.0s as the baseline alone
const DISSOLVE_S = DISSOLVE_END - HOLD_END;
const REGROW_S = SLOT_S - FLAT_END; // +2.3s growing back
/* Clock A calm factor: crawl ticks land this much farther apart
   than the original emblem's, so the drift reads as ambient. */
const CALM = 1.5;
/* The baseline's own small alphabet: a drawn line, not letters. */
const BASE_GLYPHS = ["-", "=", "-", "+", "-"];

interface Palette {
  ink: [number, number, number];
  accent: [number, number, number];
  red: [number, number, number];
  muted: [number, number, number];
}

function parseHex(value: string, fallback: [number, number, number]): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  return {
    ink: parseHex(cs.getPropertyValue("--ink"), [23, 20, 16]),
    accent: parseHex(cs.getPropertyValue("--accent"), [181, 65, 47]),
    red: parseHex(cs.getPropertyValue("--red"), [176, 53, 42]),
    muted: parseHex(cs.getPropertyValue("--muted"), [107, 100, 85]),
  };
}

function rgb(c: [number, number, number]): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number): string {
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}

/* One channel-split raster per mark state, drawn once per page and
   shared by every emblem instance: half A red, half B green, over
   transparency. Filled states fill the paths; the outline states
   (no winner, failed) stroke them with the vector mark's own stroke
   widths and, for no winner, its dash pattern (globals.css .mark).
   States whose halves spread (testing, failed) are fitted through
   the vector mark's expanded "open" viewBox (-40 -40 355 370), the
   same fit the CTA mark uses, so no stroke is clipped at the box. */
const rasterCache = new Map<MarkState, HTMLCanvasElement>();
function getStateRaster(state: MarkState): HTMLCanvasElement | null {
  const hit = rasterCache.get(state);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const spread = state === "testing" || state === "failed";
  if (spread) {
    ctx.translate(MARK_X, MARK_Y);
    ctx.scale(MARK_W / 355, MARK_HEIGHT / 370);
    ctx.translate(40, 40);
  } else {
    ctx.translate(MARK_X, MARK_Y);
    ctx.scale(MARK_SCALE, MARK_SCALE);
  }
  const off =
    state === "testing" ? { x: -30, y: -22 } : state === "failed" ? { x: -34, y: -26 } : { x: 0, y: 0 };
  const paintHalf = (path: string, channel: string, dx: number, dy: number) => {
    ctx.save();
    ctx.translate(dx, dy);
    const p = new Path2D(path);
    if (state === "nowinner" || state === "failed") {
      ctx.strokeStyle = channel;
      ctx.lineWidth = state === "failed" ? 7 : 6;
      if (state === "nowinner") ctx.setLineDash([14, 11]);
      ctx.stroke(p);
    } else {
      ctx.fillStyle = channel;
      ctx.fill(p);
    }
    ctx.restore();
  };
  paintHalf(HALF_A, "#ff0000", off.x, off.y);
  paintHalf(HALF_B, "#00ff00", -off.x, -off.y);
  rasterCache.set(state, canvas);
  return canvas;
}

/* Area-sample the raster's mark region onto a cols x rows grid by
   drawing it down through halving steps (a single 14x drawImage
   undersamples and aliases; halving reads as true area coverage).
   Coverage per half = channel value x alpha, so a partial cell on
   the seam between the halves splits between them. */
function sampleCoverage(
  raster: HTMLCanvasElement,
  cols: number,
  rows: number,
): { covA: Float32Array; covB: Float32Array } | null {
  let src: HTMLCanvasElement = document.createElement("canvas");
  src.width = Math.ceil(MARK_W);
  src.height = MARK_HEIGHT;
  const sctx = src.getContext("2d");
  if (!sctx) return null;
  sctx.drawImage(raster, MARK_X, MARK_Y, MARK_W, MARK_HEIGHT, 0, 0, src.width, src.height);

  while (src.width > cols * 2 || src.height > rows * 2) {
    const next = document.createElement("canvas");
    next.width = Math.max(cols, Math.floor(src.width / 2));
    next.height = Math.max(rows, Math.floor(src.height / 2));
    const nctx = next.getContext("2d");
    if (!nctx) return null;
    nctx.imageSmoothingEnabled = true;
    nctx.imageSmoothingQuality = "high";
    nctx.drawImage(src, 0, 0, next.width, next.height);
    src = next;
  }
  const fin = document.createElement("canvas");
  fin.width = cols;
  fin.height = rows;
  const fctx = fin.getContext("2d");
  if (!fctx) return null;
  fctx.imageSmoothingEnabled = true;
  fctx.imageSmoothingQuality = "high";
  fctx.drawImage(src, 0, 0, cols, rows);
  let data: ImageData;
  try {
    data = fctx.getImageData(0, 0, cols, rows);
  } catch {
    return null;
  }
  const covA = new Float32Array(cols * rows);
  const covB = new Float32Array(cols * rows);
  const px = data.data;
  for (let i = 0; i < cols * rows; i++) {
    const a = px[i * 4 + 3] / 255;
    covA[i] = (px[i * 4] / 255) * a;
    covB[i] = (px[i * 4 + 1] / 255) * a;
  }
  return { covA, covB };
}

/* One sampled state on the emblem grid: coverage split by half, the
   interior mask and the Sobel edge glyphs, all derived from that
   state's own raster. */
interface StateGrid {
  lum: Float32Array;
  interior: Float32Array;
  edgeGlyph: string[];
  isB: Uint8Array;
  /** Per column: the dissolve moment at which the column has fully
      sunk (its baseline cell lands), and the regrow moment at which
      its first cell of this state appears (its baseline cell lifts). */
  colSinkDone: Float32Array;
  colGrowStart: Float32Array;
}

export function AsciiMark({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const svg = svgRef.current;
    if (!wrap || !canvas || !svg) return;
    const canvasEl: HTMLCanvasElement = canvas;
    const svgEl: SVGSVGElement = svg;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    let disposed = false;
    let palette = readPalette();
    /* Half A's warmth scale toward the accent (5 buckets of the
       shader's 0..0.22 peak blend), rebuilt on theme flips. */
    let warmScale: string[] = [];
    const buildWarmScale = () => {
      warmScale = [0, 0.055, 0.11, 0.165, 0.22].map((k) => mixRgb(palette.ink, palette.accent, k));
    };
    buildWarmScale();
    const accentStr = () => rgb(palette.accent);
    const redStr = () => rgb(palette.red);
    const mutedStr = () => rgb(palette.muted);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---- grid state (rebuilt on resize) ---- */
    let cols = 0;
    let rows = 0;
    let cellW = 0; // device px
    let cellH = 0;
    let grids: StateGrid[] = []; // one per STATE_SEQ entry, by state name below
    let gridByState = new Map<MarkState, StateGrid>();
    let fineN: Float32Array = new Float32Array(0);
    let rate: Float32Array = new Float32Array(0);
    let phase: Float32Array = new Float32Array(0);
    let nextTick: Float32Array = new Float32Array(0);
    /* Clock B per-cell transition moments (seconds into the phase):
       extinction runs top-first (the mark sinks), appearance runs
       bottom-first (it grows up out of the baseline). */
    let extT: Float32Array = new Float32Array(0);
    let appT: Float32Array = new Float32Array(0);
    /* The baseline: one row at the emblem's foot, spanning the
       mark's columns; each column's cell takes its colour from the
       half whose foot owns that column in the merged state. */
    let baseRow = 0;
    let baseColMin = 0;
    let baseColMax = -1;
    let baseIsB: Uint8Array = new Uint8Array(0);
    /* Render state: what each cell currently shows. */
    let cellVis: Uint8Array = new Uint8Array(0);
    let cellState: MarkState[] = [];
    let drawnCh: string[] = [];
    let drawnColor: string[] = [];
    let baseDrawn: Uint8Array = new Uint8Array(0);
    let baseCh: string[] = [];
    let baseColor: string[] = [];
    let baseNextTick: Float32Array = new Float32Array(0);
    let gridReady = false;

    /* Component clock: accumulates only while running, so a pause
       never fast-forwards the crawl or the cycle on return. */
    let clock = 0;
    let lastStamp = 0;
    let running = false;
    let raf = 0;

    function stateColor(state: MarkState, grid: StateGrid, i: number, lumEff: number): string {
      if (state === "failed") return redStr();
      if (state === "nowinner") return mutedStr();
      if (grid.isB[i]) return accentStr();
      const peak = smoothstep(0.78, 1.0, lumEff);
      return warmScale[Math.round(peak * (warmScale.length - 1))];
    }

    function cellGlyph(state: MarkState, i: number, cx: number, cy: number, t: number): [string, string] {
      const grid = gridByState.get(state);
      if (!grid) return [" ", ""];
      const lum = grid.lum;
      /* Edge cells draw their directional glyph, steady while the
         interior crawls: the outline is the silhouette, and a
         silhouette that holds still reads as a drawn stroke. */
      if (grid.edgeGlyph[i]) {
        const color = stateColor(state, grid, i, lum[i]);
        return [grid.edgeGlyph[i], color];
      }
      /* The outline states (no winner, failed) are line drawings,
         not density fields: every covered cell shows, floored to a
         visible ramp level, and holds steady like an edge cell.
         Through the crawl's density swap their thinner dashed
         strokes thinned to specks and the outline disintegrated;
         the dash itself still comes from the raster, so the gaps
         that make it dashed are the vector mark's own. */
      if (state === "nowinner" || state === "failed") {
        const idx = clamp(Math.max(Math.floor(lum[i] * MAX_IDX + 0.5), 3), 0, MAX_IDX);
        return [RAMP[idx], stateColor(state, grid, i, lum[i])];
      }
      const u = (cx + 0.5) / cols;
      const v = (cy + 0.5) / rows;
      /* Breakup, the shader's recipe: drifting mid noise over the
         static coarse zones and per-cell grain, partially quantized
         into patches, mapped into the ramp's middle and top. Clock
         A runs calmer than the original emblem: the drift terms
         move at roughly two-thirds their old pace. */
      const zone = snoise(u * 2.4 + 3.7 + t * 0.005, v * 2.4 + 9.1);
      const mid = snoise(u * 6.5 - 5.2 + t * 0.032, v * 6.5 + 1.3 + t * 0.008);
      let modN = clamp(0.58 + zone * 0.3 + mid * 0.2 + fineN[i], 0.05, 1);
      modN = lerp(modN, Math.floor(modN * 5) / 5 + 0.1, 0.35);
      const lumEff = lerp(lum[i], 0.36 + 0.64 * modN, grid.interior[i]);

      /* The crawl: this cell's own tick, swapping 1-2 levels inside
         its density neighbourhood; crest cells clamp to the heaviest
         three levels so the outline sparkles without thinning. */
      const idxBase = Math.floor(lumEff * MAX_IDX + 0.5);
      const ctick = Math.floor(t * rate[i] + phase[i] * 16);
      const cr1 = hash21(cx * 3.31 + ctick * 0.7317, cy * 3.31 + ctick * 0.7317);
      const cr2 = hash21(cx * 5.77 + ctick * 1.9131, cy * 5.77 + ctick * 1.9131);
      const mag = cr2 < 0.62 ? 1 : 2;
      const swap = (cr1 >= 0.5 ? 1 : -1) * mag;
      const mask = smoothstep(0.03, 0.15, lumEff);
      let idx = clamp(idxBase + swap * mask, 0, MAX_IDX);
      if (idxBase >= MAX_IDX - 1) idx = clamp(idx, MAX_IDX - 2, MAX_IDX);

      /* Letters surface and sink in the interior's mid bands, on the
         same clock family; crest and edge cells never draw them.
         Outline states carry no interior, so they never grow letters:
         they stay the drawn outline the vector mark shows. */
      const ltick = Math.floor(t * rate[i] * 0.9 + phase[i] * 12);
      const lh = hash21(cx * 3.171 + ltick * 0.9173, cy * 3.171 + ltick * 0.9173);
      const letterP =
        grid.interior[i] *
        0.5 *
        smoothstep(0.36, 0.52, lumEff) *
        (1 - smoothstep(0.84, 0.97, lumEff));
      let ch: string;
      if (lh < letterP) {
        const li = Math.floor(hash21(cx * 7.77 + ltick * 1.371, cy * 7.77 + ltick * 1.371) * LETTERS.length);
        ch = LETTERS[clamp(li, 0, LETTERS.length - 1)];
      } else {
        ch = RAMP[Math.round(idx)];
      }
      return [ch, stateColor(state, grid, i, lumEff)];
    }

    function paintCell(i: number, cx: number, cy: number, ch: string, color: string) {
      const x = cx * cellW;
      const y = cy * cellH;
      ctx!.save();
      ctx!.beginPath();
      ctx!.rect(x, y, cellW + 0.5, cellH + 0.5);
      ctx!.clip();
      ctx!.clearRect(x, y, cellW + 0.5, cellH + 0.5);
      if (ch !== " ") {
        ctx!.fillStyle = color;
        ctx!.fillText(ch, x + cellW / 2, y + cellH / 2 + cellH * 0.03);
      }
      ctx!.restore();
      drawnCh[i] = ch;
      drawnColor[i] = color;
    }

    function clearCellAt(cx: number, cy: number) {
      const x = cx * cellW;
      const y = cy * cellH;
      ctx!.save();
      ctx!.beginPath();
      ctx!.rect(x, y, cellW + 0.5, cellH + 0.5);
      ctx!.clip();
      ctx!.clearRect(x, y, cellW + 0.5, cellH + 0.5);
      ctx!.restore();
    }

    /* The cycle position for a clock reading: which state is built,
       which comes next, and how far into the slot we are. Reduced
       motion pins the merged state in its hold phase forever. */
    function cycleAt(t: number): { cur: MarkState; next: MarkState; tPhase: number } {
      if (reduced) return { cur: "merged", next: "merged", tPhase: 0 };
      const slot = Math.floor(t / SLOT_S);
      const idx = ((slot % STATE_SEQ.length) + STATE_SEQ.length) % STATE_SEQ.length;
      return {
        cur: STATE_SEQ[idx],
        next: STATE_SEQ[(idx + 1) % STATE_SEQ.length],
        tPhase: t - slot * SLOT_S,
      };
    }

    /* What a cell should show right now, per clock B. */
    function desiredCell(
      i: number,
      cyc: { cur: MarkState; next: MarkState; tPhase: number },
    ): { vis: boolean; state: MarkState } {
      const cur = gridByState.get(cyc.cur);
      const nxt = gridByState.get(cyc.next);
      if (!cur || !nxt) return { vis: false, state: cyc.cur };
      if (cyc.tPhase < HOLD_END) {
        return { vis: cur.lum[i] > 0.001, state: cyc.cur };
      }
      if (cyc.tPhase < DISSOLVE_END) {
        const el = cyc.tPhase - HOLD_END;
        return { vis: cur.lum[i] > 0.001 && el < extT[i], state: cyc.cur };
      }
      if (cyc.tPhase < FLAT_END) {
        return { vis: false, state: cyc.cur };
      }
      const el = cyc.tPhase - FLAT_END;
      return { vis: nxt.lum[i] > 0.001 && el >= appT[i], state: cyc.next };
    }

    /* What a baseline column should show right now, per clock B. */
    function desiredBase(cx: number, cyc: { cur: MarkState; next: MarkState; tPhase: number }): boolean {
      if (cx < baseColMin || cx > baseColMax) return false;
      const cur = gridByState.get(cyc.cur);
      const nxt = gridByState.get(cyc.next);
      if (!cur || !nxt) return false;
      if (cyc.tPhase < HOLD_END) return false;
      if (cyc.tPhase < DISSOLVE_END) {
        return cyc.tPhase - HOLD_END >= cur.colSinkDone[cx];
      }
      if (cyc.tPhase < FLAT_END) return true;
      return cyc.tPhase - FLAT_END < nxt.colGrowStart[cx];
    }

    function baseGlyph(cx: number, t: number): [string, string] {
      const tick = Math.floor(t * rate[baseRow * cols + cx] + phase[baseRow * cols + cx] * 16);
      const h = hash21(cx * 3.31 + tick * 0.7317, baseRow * 3.31 + tick * 0.7317);
      const ch = BASE_GLYPHS[Math.floor(h * BASE_GLYPHS.length) % BASE_GLYPHS.length];
      const color = baseIsB[cx] ? accentStr() : warmScale[0];
      return [ch, color];
    }

    /* Paint every cell and baseline column exactly as the current
       cycle position demands (build, theme flips). */
    function paintAll() {
      if (!gridReady) return;
      const cyc = cycleAt(clock);
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const i = cy * cols + cx;
          const d = desiredCell(i, cyc);
          cellVis[i] = d.vis ? 1 : 0;
          cellState[i] = d.state;
          if (d.vis) {
            const [ch, color] = cellGlyph(d.state, i, cx, cy, reduced ? 4.2 : clock);
            paintCell(i, cx, cy, ch, color);
          } else if (drawnCh[i] !== " ") {
            paintCell(i, cx, cy, " ", "");
          }
        }
      }
      paintBaseline(cyc, true);
    }

    function paintBaseline(cyc: { cur: MarkState; next: MarkState; tPhase: number }, force = false) {
      /* A visible mark cell at the baseline row owns its pixels;
         the baseline never draws or clears over it. */
      for (let cx = 0; cx < cols; cx++) {
        const i = baseRow * cols + cx;
        const want = desiredBase(cx, cyc) && !cellVis[i];
        if (want) {
          if (force || !baseDrawn[cx] || clock >= baseNextTick[cx]) {
            const [ch, color] = baseGlyph(cx, clock);
            if (force || ch !== baseCh[cx] || color !== baseColor[cx] || !baseDrawn[cx]) {
              paintCell(i, cx, baseRow, ch, color);
              baseCh[cx] = ch;
              baseColor[cx] = color;
            }
            baseDrawn[cx] = 1;
            baseNextTick[cx] = clock + (1 / rate[i]) * CALM * (0.75 + 0.5 * hash21(cx * 9.31, baseRow * 9.31));
          }
        } else if (baseDrawn[cx]) {
          if (!cellVis[i]) clearCellAt(cx, baseRow);
          baseDrawn[cx] = 0;
          baseCh[cx] = " ";
          baseColor[cx] = "";
          /* The cell at the baseline row may still be recorded as
             drawn in the mark arrays from an earlier overlay; its
             own bookkeeping is refreshed by the cell pass, which
             runs before this one each frame. */
          if (!cellVis[i]) {
            drawnCh[i] = " ";
            drawnColor[i] = "";
          }
        }
      }
    }

    function buildStateGrid(state: MarkState): StateGrid | null {
      const raster = getStateRaster(state);
      const sampled = raster ? sampleCoverage(raster, cols, rows) : null;
      if (!sampled) return null;
      const n = cols * rows;
      const lum = new Float32Array(n);
      const interior = new Float32Array(n);
      const edgeGlyph = new Array<string>(n).fill("");
      const isB = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        lum[i] = Math.max(sampled.covA[i], sampled.covB[i]);
        isB[i] = sampled.covB[i] > sampled.covA[i] ? 1 : 0;
      }
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const i = cy * cols + cx;
          const gL = cx > 0 ? lum[i - 1] : lum[i];
          const gR = cx < cols - 1 ? lum[i + 1] : lum[i];
          const gD = cy > 0 ? lum[i - cols] : lum[i];
          const gU = cy < rows - 1 ? lum[i + cols] : lum[i];
          const grad = Math.max(
            Math.abs(gL - lum[i]),
            Math.abs(gR - lum[i]),
            Math.abs(gD - lum[i]),
            Math.abs(gU - lum[i]),
          );
          interior[i] = smoothstep(0.985, 1.0, lum[i]) * (1 - clamp(grad * 2.2, 0, 1));
          /* Sobel pass on the coverage grid: where coverage changes
             fast, this cell sits on a stroke edge. Its glyph is the
             one whose stroke runs along the edge (the tangent, i.e.
             the gradient direction rotated 90 degrees), quantized to
             the four orientations a mono grid can draw. */
          const L = (x: number, y: number) =>
            lum[Math.min(rows - 1, Math.max(0, y)) * cols + Math.min(cols - 1, Math.max(0, x))];
          const gx =
            L(cx + 1, cy - 1) + 2 * L(cx + 1, cy) + L(cx + 1, cy + 1) -
            (L(cx - 1, cy - 1) + 2 * L(cx - 1, cy) + L(cx - 1, cy + 1));
          const gy =
            L(cx - 1, cy + 1) + 2 * L(cx, cy + 1) + L(cx + 1, cy + 1) -
            (L(cx - 1, cy - 1) + 2 * L(cx, cy - 1) + L(cx + 1, cy - 1));
          const mag = Math.sqrt(gx * gx + gy * gy);
          if (mag >= 1.15 && lum[i] > 0.3) {
            let phi = Math.atan2(gy, gx) + Math.PI / 2;
            phi = ((phi % Math.PI) + Math.PI) % Math.PI;
            edgeGlyph[i] =
              phi < Math.PI / 8 || phi >= (7 * Math.PI) / 8
                ? "-"
                : phi < (3 * Math.PI) / 8
                  ? "\\"
                  : phi < (5 * Math.PI) / 8
                    ? "|"
                    : "/";
          }
        }
      }
      const colSinkDone = new Float32Array(cols);
      const colGrowStart = new Float32Array(cols);
      for (let cx = 0; cx < cols; cx++) {
        let sink = 0;
        let grow = Number.POSITIVE_INFINITY;
        for (let cy = 0; cy < rows; cy++) {
          const i = cy * cols + cx;
          if (lum[i] > 0.001) {
            if (extT[i] > sink) sink = extT[i];
            if (appT[i] < grow) grow = appT[i];
          }
        }
        colSinkDone[cx] = sink;
        colGrowStart[cx] = grow;
      }
      return { lum, interior, edgeGlyph, isB, colSinkDone, colGrowStart };
    }

    function buildGrid(cssW: number, cssH: number) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasEl.width = Math.max(2, Math.round(cssW * dpr));
      canvasEl.height = Math.max(2, Math.round(cssH * dpr));
      /* Denser than the page fields by design: ~64 columns at hero
         size (5-5.6px cells), holding ~44 columns down to footer
         size so the strokes keep several cells of width. */
      const targetCols = cssW >= 280 ? 64 : cssW >= 100 ? 44 : Math.max(12, Math.round(cssW / 3));
      cols = targetCols;
      rows = Math.max(8, Math.round(cols * (290 / 275)));
      cellW = canvasEl.width / cols;
      cellH = canvasEl.height / rows;

      const n = cols * rows;
      fineN = new Float32Array(n);
      rate = new Float32Array(n);
      phase = new Float32Array(n);
      nextTick = new Float32Array(n);
      extT = new Float32Array(n);
      appT = new Float32Array(n);
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const i = cy * cols + cx;
          fineN[i] = (hash21(cx * 13.73, cy * 13.73) - 0.5) * 0.16;
          rate[i] = 0.62 + 0.55 * hash21(cx * 1.917, cy * 1.917);
          phase[i] = hash21(cx * 2.613 + 7.7, cy * 2.613 + 7.7);
          nextTick[i] = clock + (1 / rate[i]) * CALM * (0.3 + phase[i]);
          const v = rows > 1 ? cy / (rows - 1) : 0;
          extT[i] = DISSOLVE_S * (0.06 + 0.8 * v + 0.14 * hash21(cx * 4.39 + 3.1, cy * 4.39));
          appT[i] = REGROW_S * (0.06 + 0.8 * (1 - v) + 0.14 * hash21(cx * 6.17 + 9.4, cy * 6.17));
        }
      }

      gridByState = new Map();
      const states: MarkState[] = ["testing", "merged", "nowinner", "failed"];
      for (const s of states) {
        const g = buildStateGrid(s);
        if (!g) {
          gridReady = false;
          return;
        }
        gridByState.set(s, g);
      }
      grids = states.map((s) => gridByState.get(s)!);

      /* The baseline geometry: the foot row and column span of the
         mark across all four states, and each column's owning half
         from the merged state's lowest cell in that column. */
      baseRow = 0;
      baseColMin = cols;
      baseColMax = -1;
      for (const g of grids) {
        for (let cy = 0; cy < rows; cy++) {
          for (let cx = 0; cx < cols; cx++) {
            if (g.lum[cy * cols + cx] > 0.001) {
              if (cy > baseRow) baseRow = cy;
              if (cx < baseColMin) baseColMin = cx;
              if (cx > baseColMax) baseColMax = cx;
            }
          }
        }
      }
      baseIsB = new Uint8Array(cols);
      const merged = gridByState.get("merged")!;
      for (let cx = 0; cx < cols; cx++) {
        for (let cy = rows - 1; cy >= 0; cy--) {
          const i = cy * cols + cx;
          if (merged.lum[i] > 0.001) {
            baseIsB[cx] = merged.isB[i];
            break;
          }
        }
      }

      cellVis = new Uint8Array(n);
      cellState = new Array<MarkState>(n).fill("merged");
      drawnCh = new Array<string>(n).fill(" ");
      drawnColor = new Array<string>(n).fill("");
      baseDrawn = new Uint8Array(cols);
      baseCh = new Array<string>(cols).fill(" ");
      baseColor = new Array<string>(cols).fill("");
      baseNextTick = new Float32Array(cols);

      const fontPx = cellW * 1.8;
      ctx!.font = `500 ${fontPx}px "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      gridReady = true;
      paintAll();
      /* First full frame is in: fade the canvas over the vector mark. */
      canvasEl.style.opacity = "1";
      svgEl.style.opacity = "0";
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!running || document.hidden) {
        lastStamp = now;
        return;
      }
      const dt = Math.min(0.1, (now - lastStamp) / 1000 || 0);
      lastStamp = now;
      clock += dt;
      if (!gridReady) return;
      const cyc = cycleAt(clock);
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const i = cy * cols + cx;
          const d = desiredCell(i, cyc);
          const vis = d.vis ? 1 : 0;
          if (vis !== cellVis[i] || (vis === 1 && d.state !== cellState[i])) {
            cellVis[i] = vis;
            cellState[i] = d.state;
            if (vis) {
              const [ch, color] = cellGlyph(d.state, i, cx, cy, clock);
              paintCell(i, cx, cy, ch, color);
            } else if (drawnCh[i] !== " ") {
              paintCell(i, cx, cy, " ", "");
            }
            continue;
          }
          if (!vis || clock < nextTick[i]) continue;
          nextTick[i] = clock + (1 / rate[i]) * CALM * (0.75 + 0.5 * hash21(cx * 9.31 + i, cy * 9.31));
          const [ch, color] = cellGlyph(cellState[i], i, cx, cy, clock);
          if (ch !== drawnCh[i] || color !== drawnColor[i]) paintCell(i, cx, cy, ch, color);
        }
      }
      paintBaseline(cyc);
    }

    /* ---- lifecycle: fonts first (the glyphs are the picture), with
       a timeout so a slow font never leaves the vector mark waiting;
       if the real face lands later, one redraw swaps it in. ---- */
    let started = false;
    const start = () => {
      if (started || disposed) return;
      started = true;
      const rect = wrap.getBoundingClientRect();
      if (rect.width > 0) buildGrid(rect.width, rect.width * (290 / 275));
      if (!reduced) {
        lastStamp = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const fontReady = (async () => {
      try {
        await Promise.race([
          (async () => {
            await document.fonts.load('500 100px "IBM Plex Mono"');
            await document.fonts.ready;
          })(),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      } catch {
        /* fall through with whatever mono face is available */
      }
    })();
    void fontReady.then(start);
    document.fonts?.addEventListener?.("loadingdone", () => {
      if (started && gridReady) paintAll();
    });

    const resizeObs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0 && started) {
          const wantCols = w >= 280 ? 64 : w >= 100 ? 44 : Math.max(12, Math.round(w / 3));
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          if (!gridReady || wantCols !== cols || Math.round(w * dpr) !== canvasEl.width) {
            buildGrid(w, w * (290 / 275));
          }
        }
      }
    });
    resizeObs.observe(wrap);

    const intObs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) running = entry.isIntersecting;
      },
      { rootMargin: "80px" },
    );
    intObs.observe(wrap);

    const themeObs = new MutationObserver(() => {
      palette = readPalette();
      buildWarmScale();
      if (gridReady) paintAll();
    });
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObs.disconnect();
      intObs.disconnect();
      themeObs.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: "relative", aspectRatio: "275 / 290", ...style }}
      aria-hidden="true"
    >
      <svg
        ref={svgRef}
        viewBox="0 0 275 290"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          transition: "opacity 240ms ease",
        }}
      >
        <path d={HALF_A} style={{ fill: "var(--agent)" }} />
        <path d={HALF_B} style={{ fill: "var(--gold-mark)" }} />
      </svg>
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          opacity: 0,
          transition: "opacity 240ms ease",
        }}
      />
    </div>
  );
}
