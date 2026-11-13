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
 *     with half A in the R channel and half B in the G channel, then
 *     area-sampled onto the emblem's grid (never redrawn);
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
 * The vector mark renders underneath as an inline SVG and the canvas
 * fades over it only once its first full frame is painted, so there
 * is no flash of wrong content and no layout shift (the box carries a
 * fixed 275/290 aspect ratio). Glyphs are hard-clipped to their cell,
 * exactly as the shader's atlas sampling clipped them, which is what
 * makes per-cell incremental redraws safe: a changed cell is cleared
 * and repainted without ever disturbing its neighbours.
 *
 * Pauses off-screen (IntersectionObserver) and on a hidden tab.
 * prefers-reduced-motion paints one static glyph frame. */

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

interface Palette {
  ink: [number, number, number];
  accent: [number, number, number];
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
  };
}

function rgb(c: [number, number, number]): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number): string {
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}

/* The channel-split raster, drawn once per page and shared by every
   emblem instance: half A red, half B green, over transparency. */
let rasterCache: HTMLCanvasElement | null = null;
function getMarkRaster(): HTMLCanvasElement | null {
  if (rasterCache) return rasterCache;
  const canvas = document.createElement("canvas");
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.translate(MARK_X, MARK_Y);
  ctx.scale(MARK_SCALE, MARK_SCALE);
  ctx.fillStyle = "#ff0000";
  ctx.fill(new Path2D(HALF_A));
  ctx.fillStyle = "#00ff00";
  ctx.fill(new Path2D(HALF_B));
  rasterCache = canvas;
  return canvas;
}

/* Area-sample the raster's mark region onto a cols x rows grid by
   drawing it down through halving steps (a single 14x drawImage
   undersamples and aliases; halving reads as true area coverage).
   Coverage per half = channel value x alpha, so a partial cell on the
   seam between the halves splits between them. */
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

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---- grid state (rebuilt on resize) ---- */
    let cols = 0;
    let rows = 0;
    let cellW = 0; // device px
    let cellH = 0;
    let lum: Float32Array = new Float32Array(0);
    let interior: Float32Array = new Float32Array(0);
    let edgeGlyph: string[] = [];
    let isB: Uint8Array = new Uint8Array(0);
    let fineN: Float32Array = new Float32Array(0);
    let rate: Float32Array = new Float32Array(0);
    let phase: Float32Array = new Float32Array(0);
    let nextTick: Float32Array = new Float32Array(0);
    let drawnCh: string[] = [];
    let drawnColor: string[] = [];
    let gridReady = false;

    /* Component clock: accumulates only while running, so a pause
       never fast-forwards the crawl on return. */
    let clock = 0;
    let lastStamp = 0;
    let running = false;
    let raf = 0;

    function cellGlyph(i: number, cx: number, cy: number, t: number): [string, string] {
      /* Edge cells draw their directional glyph, steady while the
         interior crawls: the outline is the silhouette, and a
         silhouette that holds still reads as a drawn stroke. */
      if (edgeGlyph[i]) {
        const color = isB[i]
          ? accentStr()
          : warmScale[Math.round(smoothstep(0.78, 1.0, lum[i]) * (warmScale.length - 1))];
        return [edgeGlyph[i], color];
      }
      const u = (cx + 0.5) / cols;
      const v = (cy + 0.5) / rows;
      /* Breakup, the shader's recipe: drifting mid noise over the
         static coarse zones and per-cell grain, partially quantized
         into patches, mapped into the ramp's middle and top. */
      const zone = snoise(u * 2.4 + 3.7 + t * 0.008, v * 2.4 + 9.1);
      const mid = snoise(u * 6.5 - 5.2 + t * 0.05, v * 6.5 + 1.3 + t * 0.011);
      let modN = clamp(0.58 + zone * 0.3 + mid * 0.2 + fineN[i], 0.05, 1);
      modN = lerp(modN, Math.floor(modN * 5) / 5 + 0.1, 0.35);
      const lumEff = lerp(lum[i], 0.36 + 0.64 * modN, interior[i]);

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
         same clock family; crest and edge cells never draw them. */
      const ltick = Math.floor(t * rate[i] * 0.9 + phase[i] * 12);
      const lh = hash21(cx * 3.171 + ltick * 0.9173, cy * 3.171 + ltick * 0.9173);
      const letterP =
        interior[i] *
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

      let color: string;
      if (isB[i]) {
        color = accentStr();
      } else {
        const peak = smoothstep(0.78, 1.0, lumEff);
        color = warmScale[Math.round(peak * (warmScale.length - 1))];
      }
      return [ch, color];
    }

    function drawCell(i: number, cx: number, cy: number, ch: string, color: string) {
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

    function drawAll(t: number) {
      if (!gridReady) return;
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const i = cy * cols + cx;
          if (lum[i] <= 0.001) continue;
          const [ch, color] = cellGlyph(i, cx, cy, t);
          drawCell(i, cx, cy, ch, color);
        }
      }
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

      const raster = getMarkRaster();
      const sampled = raster ? sampleCoverage(raster, cols, rows) : null;
      if (!sampled) {
        gridReady = false;
        return;
      }
      const n = cols * rows;
      lum = new Float32Array(n);
      interior = new Float32Array(n);
      edgeGlyph = new Array<string>(n).fill("");
      isB = new Uint8Array(n);
      fineN = new Float32Array(n);
      rate = new Float32Array(n);
      phase = new Float32Array(n);
      nextTick = new Float32Array(n);
      drawnCh = new Array<string>(n).fill(" ");
      drawnColor = new Array<string>(n).fill("");

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
          fineN[i] = (hash21(cx * 13.73, cy * 13.73) - 0.5) * 0.16;
          rate[i] = 0.62 + 0.55 * hash21(cx * 1.917, cy * 1.917);
          phase[i] = hash21(cx * 2.613 + 7.7, cy * 2.613 + 7.7);
          nextTick[i] = clock + (1 / rate[i]) * (0.3 + phase[i]);
        }
      }

      const fontPx = cellW * 1.8;
      ctx!.font = `500 ${fontPx}px "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      gridReady = true;
      drawAll(reduced ? 4.2 : clock);
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
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const i = cy * cols + cx;
          if (lum[i] <= 0.001 || clock < nextTick[i]) continue;
          nextTick[i] = clock + (1 / rate[i]) * (0.75 + 0.5 * hash21(cx * 9.31 + i, cy * 9.31));
          const [ch, color] = cellGlyph(i, cx, cy, clock);
          if (ch !== drawnCh[i] || color !== drawnColor[i]) drawCell(i, cx, cy, ch, color);
        }
      }
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
      if (started && gridReady) drawAll(reduced ? 4.2 : clock);
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
      if (gridReady) drawAll(reduced ? 4.2 : clock);
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
