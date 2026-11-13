"use client";

import { useEffect, useRef } from "react";
import {
  bayer,
  clamp,
  fbm,
  prefersReducedMotion,
  readThemeColors,
  runFrames,
  smoothstep,
} from "./engine";

/* The hero ground, dithered: the same warped contour field the WebGL
   HeroField draws, re-rendered as print. A value-noise field drifts slowly;
   each dot-grid cell prints at most one dot, chosen by Bayer threshold:
   sparse brick dots where the field crests, firm ink dots along the contour
   bands, faint ink dots as body tone. Quiet enough to sit behind the
   console; alive enough that the grain never sits still. */

const PITCH = 7; // css px between dot centres

export function DitherGround() {
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
    // Aliases: narrowing on the locals above does not survive into draw().
    const cv: HTMLCanvasElement = canvas;
    const g: CanvasRenderingContext2D = ctx;

    let colors = readThemeColors(["--ink", "--accent"]);
    const root = document.documentElement;
    const themeObserver = new MutationObserver(() => {
      colors = readThemeColors(["--ink", "--accent"]);
      draw(performance.now());
    });
    themeObserver.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    const start = performance.now();
    let lastReadout = 0;
    let lastDrawn = 0;
    let emaMs = 0;

    function draw(now: number) {
      // The field drifts slowly; 30fps updates are indistinguishable from
      // 60 and halve the noise cost on weak machines.
      if (!reduced && now - lastDrawn < 30) return;
      lastDrawn = now;
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
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, cssW, cssH);

      const t = reduced ? 12 : 12 + (now - start) / 1000;
      const cols = Math.ceil(cssW / PITCH);
      const rows = Math.ceil(cssH / PITCH);
      const soft = new Path2D();
      const firm = new Path2D();
      const crest = new Path2D();
      let dots = 0;

      for (let cy = 0; cy < rows; cy++) {
        const y = cy * PITCH + PITCH / 2;
        const uvY = 1 - y / cssH;
        for (let cx = 0; cx < cols; cx++) {
          const x = cx * PITCH + PITCH / 2;
          const px = x * 0.009 + t * 0.02;
          const py = y * 0.009 - t * 0.013;
          const warp = fbm(px, py, 2);
          // fbm output clusters mid-range; stretch it to a full 0..1 so the
          // thresholds below see the field's real structure. The warp folds
          // the field over itself, which is what makes contour bands cross
          // often enough to read as contours once dithered.
          const raw = fbm(px * 1.3 + warp * 2.3 - t * 0.008, py * 1.3 + warp * 1.1, 3);
          const f = clamp((raw - 0.06) / 0.74, 0, 1);
          const side = smoothstep(0.15, 1.0, (x / cssW) * 0.9 + uvY * 0.5);
          const thr = bayer(cx, cy);

          const va = smoothstep(0.78, 0.96, f) * 0.92;
          const band = Math.abs(((f * 14) % 1) - 0.5);
          const vc =
            (1 - smoothstep(0.06, 0.42, band)) * smoothstep(0.18, 0.6, f) * (0.45 + 0.55 * side);
          // Body tone stays calm on the left, where the headline sits:
          // its falloff is the square of the side gradient.
          const vb = (0.03 + smoothstep(0.25, 0.85, f) * 0.45) * (0.12 + 0.88 * side * side);

          let path: Path2D | null = null;
          let rad = 0;
          if (va > thr) {
            path = crest;
            rad = PITCH * 0.34;
          } else if (vc > thr) {
            path = firm;
            rad = PITCH * 0.36;
          } else if (vb > thr) {
            path = soft;
            rad = PITCH * 0.3;
          }
          if (!path) continue;
          path.moveTo(x + rad, y);
          path.arc(x, y, rad, 0, 6.2832);
          dots++;
        }
      }
      g.fillStyle = colors["--ink"];
      g.globalAlpha = 0.42;
      g.fill(soft);
      g.globalAlpha = 0.88;
      g.fill(firm);
      g.fillStyle = colors["--accent"];
      g.globalAlpha = 0.95;
      g.fill(crest);
      g.globalAlpha = 1;

      const ms = performance.now() - t0;
      emaMs = emaMs ? emaMs * 0.9 + ms * 0.1 : ms;
      if (readRef.current && now - lastReadout > 250) {
        lastReadout = now;
        readRef.current.textContent =
          `pitch ${PITCH}px · ${dots.toLocaleString()} dots · ` +
          `${cols}×${rows} grid · frame ${emaMs.toFixed(1)}ms`;
        const w = window as unknown as { __ditherStats?: Record<string, unknown> };
        w.__ditherStats = { ...(w.__ditherStats || {}), ground: { dots, ms: emaMs } };
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
  }, []);

  return (
    <div ref={wrapRef} className="dither-ground" aria-hidden="true">
      <canvas ref={canvasRef} className="dither-ground-canvas" />
      <p className="dither-read dither-ground-read" ref={readRef} />
    </div>
  );
}
