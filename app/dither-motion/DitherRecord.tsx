"use client";

import { useRef } from "react";
import { ReportBand } from "@/app/components/SiteFoot";
import { bayer, clamp01, easeOut } from "./ditherKit";
import { useCanvasStage, type StageFrame } from "./useCanvasStage";

/* Treatment 03: dithered texture for the record.
   The real morning report band (the same component the homepage and
   Docs end with) given a print register. A halftone ground sits behind
   the band at a whisper density, and above its rule an ink edge
   dissolves upward: ordered-dither dots at full density on the rule
   itself, thinning by a power curve until they vanish about 54px up,
   the way ink soaks off a printed line. When the band first scrolls
   into view the edge prints in, a sweep travelling left to right over
   1.5s; after that it breathes at ±4% density on a slow sine, present
   but not performing. Registration crosses in the accent sit on the
   rule's corners, like crop marks. Under reduced motion the finished
   texture renders once, static.
   Perf: one canvas, ~8k lattice cells checked per redraw, and the
   redraw throttles itself to ~20fps once the print sweep completes,
   because the shimmer has nothing faster to say. */

const EDGE_H = 54;
const PRINT_AT = 200;
const PRINT_MS = 1500;

export function DitherRecord() {
  const lastDrawn = useRef(-1);

  const canvasRef = useCanvasStage((f: StageFrame) => {
    const { ctx, colors } = f;
    const printed =
      f.mode === "final" ? 1 : easeOut(clamp01((f.t - PRINT_AT) / PRINT_MS));
    if (f.mode === "anim" && printed >= 1 && f.t - lastDrawn.current < 48) return;
    lastDrawn.current = f.t;

    ctx.clearRect(0, 0, f.w, f.h);
    const front = printed * (f.w + 160) - 80;
    let cells = 0;

    /* The ground: a whisper of speckle behind the whole band. */
    const gCell = 7;
    for (let i = 0; i * gCell < f.w; i++) {
      for (let j = 0; j * gCell < f.h; j++) {
        const cy = j * gCell + gCell / 2;
        if (cy < EDGE_H) continue;
        let density = 0.05;
        if (cy < EDGE_H + 66) density += 0.1 * (1 - (cy - EDGE_H) / 66);
        if (bayer(i, j) >= density) continue;
        ctx.beginPath();
        ctx.arc(i * gCell + gCell / 2, cy, 1, 0, Math.PI * 2);
        ctx.fillStyle = colors.ink;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        cells += 1;
      }
    }

    /* The edge: ink density on the rule, dissolving upward. */
    const eCell = 6;
    for (let i = 0; i * eCell < f.w; i++) {
      const cx = i * eCell + eCell / 2;
      const sweep = clamp01((front - cx + 45) / 90);
      if (sweep <= 0) continue;
      const shimmer =
        f.mode === "final" ? 1 : 0.96 + 0.04 * Math.sin(f.t / 1500 + cx / 260);
      for (let j = 0; j * eCell < EDGE_H; j++) {
        const cy = j * eCell + eCell / 2;
        const density = Math.pow(1 - cy / EDGE_H, 1.7) * sweep * shimmer;
        if (density <= bayer(i, j)) continue;
        ctx.beginPath();
        ctx.arc(cx, cy, 0.6 + 1.4 * density, 0, Math.PI * 2);
        ctx.fillStyle = colors.ink;
        ctx.globalAlpha = 0.22 + 0.5 * density;
        ctx.fill();
        cells += 1;
      }
    }

    /* Registration crosses on the rule's corners. */
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1.2;
    const cross = (x: number, y: number) => {
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y);
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x, y + 5);
      ctx.stroke();
    };
    cross(16, EDGE_H);
    cross(f.w - 16, EDGE_H);
    ctx.globalAlpha = 1;
    f.cells = cells;
  }, "record");

  return (
    <section className="d2-section" aria-labelledby="d2-record-h">
      <div className="d2-sec-head">
        <h2 className="d2-sec-title" id="d2-record-h">
          03 · Texture for the record
        </h2>
        <p className="d2-sec-note">
          The morning report band with a halftone ground and an ink edge that dissolves upward
          off its rule. Print register for the product's record voice: pressed, not rendered.
        </p>
      </div>
      <div className="d2-record">
        <canvas ref={canvasRef} className="d2-record-canvas" aria-hidden="true" />
        <ReportBand variant="home" />
      </div>
    </section>
  );
}
