"use client";

import { useEffect, useRef } from "react";
import { dogfoodRun } from "../../lib/runData";
import { observeTheme, prefersReducedMotion, readToken } from "./glBase";

/* Treatment 1: the dithered terrain section edge.
 *
 * Sections on this page do not end at a straight line. The boundary
 * into the inverted band is a skyline of small block cells whose
 * profile is the climb itself: the stepped shape of the dogfood run's
 * recorded score series (rounds 4 to 14, lib/runData.ts), low and
 * struggling at the left, stepping up to the plateau where the merged
 * fix landed. As the divider scrolls into view the columns rise and
 * settle toward that profile with lerped, per-column-delayed motion;
 * the top edge is dithered (Bayer-threshold cell dropout plus glyph
 * caps), never a clean vector line.
 *
 * Canvas 2D on purpose: the strip is a few thousand rects at most, and
 * 2D keeps the block/glyph mix trivial. It renders only while on
 * screen; under reduced motion it draws the settled skyline once.
 */

const CELL = 14; // CSS px per block cell
const HEIGHT = 182; // CSS px strip height

/* 4x4 Bayer matrix, values 0..15: the ordered-dither threshold field. */
const BAYER = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

function hash1(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function SkylineDivider() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let disposed = false;
    const reduced = prefersReducedMotion();

    let raf = 0;
    let visible = false;
    let reveal = reduced ? 1 : 0;
    let inkColor = "#171410";
    let accentColor = "#b5412f";
    let stopTheme: (() => void) | null = null;
    let resizeObs: ResizeObserver | null = null;

    const series = dogfoodRun.series;
    const mergedIdx = series.findIndex((p) => p.round === dogfoodRun.mergedRound);

    const readColors = () => {
      inkColor = readToken("--ink", inkColor);
      accentColor = readToken("--accent", accentColor);
      if (reduced) draw();
    };

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const w = wrap.clientWidth;
      const h = HEIGHT;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cols = Math.max(2, Math.ceil(w / CELL));
      const maxRows = Math.floor(h / CELL) - 1;
      ctx.fillStyle = inkColor;
      ctx.font = `500 ${CELL - 3}px "IBM Plex Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let i = 0; i < cols; i++) {
        const x01 = i / (cols - 1);
        /* Stepped profile: nearest recorded round, so the skyline
           literally steps where the run stepped. A deterministic
           per-column jitter of under a row keeps it terrain, not a
           bar chart. */
        const sIdx = Math.min(series.length - 1, Math.round(x01 * (series.length - 1)));
        const score = series[sIdx].scorePct / 100;
        const jitter = (hash1(i * 3.7) - 0.5) * 0.9;
        const target = Math.max(0.6, 1 + score * (maxRows - 1.6) + jitter);

        /* Rise/settle: the global reveal is this strip's smoothed
           scroll progress; each column trails it by its x position,
           so the terrain draws itself left to right as you scroll. */
        const local = Math.min(1, Math.max(0, reveal * 1.3 - x01 * 0.3));
        const eased = 1 - Math.pow(1 - local, 3);
        const shown = target * eased;
        const full = Math.floor(shown);
        const frac = shown - full;
        const x = i * CELL;

        for (let r = 0; r < full; r++) {
          const y = h - (r + 1) * CELL;
          const isTop = r === full - 1;
          if (isTop) {
            /* Dithered top edge: ordered dropout notches the skyline. */
            if (BAYER[(i % 4) * 4 + (r % 4)] / 16 > 0.82) continue;
            /* Glyph cap: the skyline's crest is type, not blocks. */
            const glyph = hash1(i * 9.1) > 0.5 ? "#" : "+";
            ctx.fillStyle = sIdx === mergedIdx ? accentColor : inkColor;
            ctx.fillText(glyph, x + CELL / 2, y + CELL / 2 + 1);
            ctx.fillStyle = inkColor;
          } else {
            ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
          }
        }
        /* Fractional top cell: Bayer threshold against the fraction,
           so columns grow cell by cell instead of sliding. */
        if (frac > 0 && full >= 1) {
          const y = h - (full + 1) * CELL;
          if (BAYER[(i % 4) * 4 + (full % 4)] / 16 < frac) {
            ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
          }
        }
        /* Sparse satellite cells above the crest: dither in the air. */
        if (full >= 2 && hash1(i * 5.3) > 0.94) {
          const y = h - (full + 2) * CELL;
          ctx.fillRect(x + CELL / 2 - 2, y + CELL / 2 - 2, 4, 4);
        }
      }
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (disposed || document.hidden || !visible) return;
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const target = Math.min(1, Math.max(0, (vh * 0.98 - rect.top) / (vh * 0.55)));
      reveal += (target - reveal) * 0.075;
      draw();
    };

    readColors();
    draw();
    stopTheme = observeTheme(readColors);
    resizeObs = new ResizeObserver(() => draw());
    resizeObs.observe(wrap);

    if (!reduced) {
      const io = new IntersectionObserver(
        (entries) => {
          visible = entries[0]?.isIntersecting ?? false;
        },
        { threshold: 0 }
      );
      io.observe(wrap);
      raf = requestAnimationFrame(loop);
      return () => {
        disposed = true;
        cancelAnimationFrame(raf);
        io.disconnect();
        stopTheme?.();
        resizeObs?.disconnect();
      };
    }
    return () => {
      disposed = true;
      stopTheme?.();
      resizeObs?.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="ascii-skyline" aria-hidden="true">
      <canvas ref={canvasRef} className="ascii-skyline-canvas" style={{ height: HEIGHT }} />
    </div>
  );
}
