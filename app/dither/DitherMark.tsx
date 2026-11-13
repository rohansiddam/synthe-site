"use client";

import { useEffect, useRef } from "react";
import {
  bayer,
  buildMarkMask,
  cellAvg,
  clamp,
  easeInOut,
  lerp,
  prefersReducedMotion,
  readThemeColors,
  runFrames,
  smoothstep,
  type MarkMask,
} from "./engine";

/* The Synthe mark rendered as an ordered-dither dot field. The shape is the
   real mark: coverage is sampled from a raster of HALF_A / HALF_B (see
   engine.ts), and each grid cell whose coverage beats its Bayer threshold
   prints one dot in that half's own colour (ink for the agent's half, brick
   for yours).
 *
 * drive="cycle":  the grid resolves coarse -> fine like a print coming up,
 *                 holds while the dots breathe, then eases back and loops.
 * drive="scroll": grid resolution follows progressRef (0 coarse, 1 fine),
 *                 eased toward the target every frame.
 * Reduced motion: one still at full resolution. The still is the texture. */

type Props = {
  drive: "cycle" | "scroll";
  progressRef?: React.RefObject<number>;
  readout?: boolean;
  className?: string;
};

const COARSE = 16; // css px per cell at r=0
const FINE = 4.5; // css px per cell at r=1
const CYCLE_MS = 13000;

export function DitherMark({ drive, progressRef, readout = true, className = "" }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = prefersReducedMotion();
    const built = buildMarkMask();
    if (!built) return;
    // Aliases: narrowing on the locals above does not survive into draw().
    const cv: HTMLCanvasElement = canvas;
    const g: CanvasRenderingContext2D = ctx;
    const mask: MarkMask = built;

    let colors = readThemeColors(["--agent", "--gold-mark"]);
    const root = document.documentElement;
    const themeObserver = new MutationObserver(() => {
      colors = readThemeColors(["--agent", "--gold-mark"]);
      draw(performance.now());
    });
    themeObserver.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    const start = performance.now();
    let scrollR = 0;
    let lastReadout = 0;
    let emaMs = 0;

    const resolveAt = (u: number) => {
      // 0 -> 1 over the first 34% of the cycle, hold, back over the last 22%.
      if (u < 0.34) return easeInOut(u / 0.34);
      if (u < 0.78) return 1;
      return 1 - easeInOut((u - 0.78) / 0.22);
    };

    function draw(now: number) {
      const t0 = performance.now();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const cssW = cv.clientWidth;
      const cssH = cv.clientHeight;
      if (!cssW || !cssH) return;
      const devW = Math.round(cssW * dpr);
      const devH = Math.round(cssH * dpr);
      if (cv.width !== devW || cv.height !== devH) {
        cv.width = devW;
        cv.height = devH;
      }

      let r: number;
      let sweepFront = 2; // >1 means the print sweep has passed
      if (reduced) {
        r = 1;
      } else if (drive === "cycle") {
        const u = ((now - start) % CYCLE_MS) / CYCLE_MS;
        r = resolveAt(u);
        if (u < 0.36) sweepFront = -0.1 + (u / 0.36) * 1.35;
      } else {
        const target = clamp(progressRef?.current ?? 0, 0, 1);
        scrollR += (target - scrollR) * 0.085;
        if (Math.abs(target - scrollR) < 0.001) scrollR = target;
        r = scrollR;
      }

      const cellCss = lerp(COARSE, FINE, easeInOut(clamp(r, 0, 1)));
      const cellDev = cellCss * dpr;
      const cols = Math.max(6, Math.round(devW / cellDev));
      const rows = Math.max(6, Math.round(devH / cellDev));
      const cw = devW / cols;
      const ch = devH / rows;
      const breathe = 1 + 0.05 * Math.sin((now / 1000) * ((2 * Math.PI) / 6)) * r;
      const mx = mask.w / devW;
      const my = mask.h / devH;

      const pathA = new Path2D();
      const pathB = new Path2D();
      let dots = 0;
      for (let cy = 0; cy < rows; cy++) {
        const y0 = cy * ch;
        for (let cx = 0; cx < cols; cx++) {
          const x0 = cx * cw;
          const a = cellAvg(mask, mask.sumA, x0 * mx, y0 * my, (x0 + cw) * mx, (y0 + ch) * my);
          const b = cellAvg(mask, mask.sumB, x0 * mx, y0 * my, (x0 + cw) * mx, (y0 + ch) * my);
          const cov = a + b;
          if (cov < 0.02) continue;
          let thr = bayer(cx, cy);
          if (sweepFront <= 1.3) {
            const xfrac = (cx + 0.5) / cols;
            thr += (1 - smoothstep(sweepFront - 0.3, sweepFront, xfrac)) * 0.95;
          }
          if (cov <= thr) continue;
          const rad = Math.max(0.55, cw * 0.4 * (0.45 + 0.55 * cov) * breathe);
          const px = x0 + cw / 2;
          const py = y0 + ch / 2;
          const path = a >= b ? pathA : pathB;
          path.moveTo(px + rad, py);
          path.arc(px, py, rad, 0, 6.2832);
          dots++;
        }
      }
      g.clearRect(0, 0, devW, devH);
      g.fillStyle = colors["--agent"];
      g.fill(pathA);
      g.fillStyle = colors["--gold-mark"];
      g.fill(pathB);

      const ms = performance.now() - t0;
      emaMs = emaMs ? emaMs * 0.9 + ms * 0.1 : ms;
      if (readout && readRef.current && now - lastReadout > 250) {
        lastReadout = now;
        readRef.current.textContent =
          `cell ${cellCss.toFixed(1)}px · ${dots.toLocaleString()} dots · ` +
          `${cols}×${rows} grid · frame ${emaMs.toFixed(1)}ms`;
        const w = window as unknown as { __ditherStats?: Record<string, unknown> };
        w.__ditherStats = {
          ...(w.__ditherStats || {}),
          [drive === "cycle" ? "mark" : "markScroll"]: { dots, cellCss, ms: emaMs },
        };
      }
    }

    const stop = runFrames(wrap, draw, reduced);
    const onResize = () => draw(performance.now());
    window.addEventListener("resize", onResize);
    draw(performance.now());
    return () => {
      stop();
      themeObserver.disconnect();
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drive]);

  return (
    <div className={className}>
      <div ref={wrapRef} className="dither-mark-wrap">
        <canvas ref={canvasRef} className="dither-canvas" aria-hidden="true" />
      </div>
      {readout && <p className="dither-read" ref={readRef} aria-hidden="true" />}
    </div>
  );
}
