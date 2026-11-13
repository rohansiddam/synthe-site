"use client";

import { useEffect, useRef, type RefObject } from "react";

/* Lane D2 canvas stage: one lifecycle for every dither canvas on the
   page, mirroring the console's rules. The animation clock accumulates
   only while the canvas is in view, so off-screen canvases pause
   mid-cycle and resume where they left off; the tab hiding stops rAF
   on its own. Under prefers-reduced-motion (or before the canvas has
   ever been visible) the stage renders the final state once, and
   re-renders it on resize, theme change and font load. Colors are read
   from the site's CSS tokens on <html>, so both themes come from the
   same source as the rest of the site.
   Cost guard: the loop measures its own draw time (EMA) and the last
   reported cell count into window.__d2[statKey] for the review rig. */

export interface StageColors {
  ink: string;
  inkSoft: string;
  accent: string;
  muted: string;
  faint: string;
  line: string;
  line2: string;
  card: string;
  bg: string;
  bg2: string;
}

export function readStageColors(): StageColors {
  const cs = getComputedStyle(document.documentElement);
  const g = (n: string) => cs.getPropertyValue(n).trim();
  return {
    ink: g("--ink"),
    inkSoft: g("--ink-soft"),
    accent: g("--accent"),
    muted: g("--muted"),
    faint: g("--faint"),
    line: g("--line"),
    line2: g("--line2"),
    card: g("--card"),
    bg: g("--bg"),
    bg2: g("--bg2"),
  };
}

export interface StageFrame {
  ctx: CanvasRenderingContext2D;
  /** Canvas size in CSS pixels. The ctx transform is preset so that
      drawing in CSS pixels lands correctly on the backing store. */
  w: number;
  h: number;
  backingW: number;
  backingH: number;
  /** Accumulated in-view milliseconds. Pauses off-screen. */
  t: number;
  colors: StageColors;
  /** "anim": a live frame of the cycle. "final": the resting state
      (reduced motion, first paint, or a still re-render). */
  mode: "anim" | "final";
  /** Bumps whenever size, theme or fonts change: cache key. */
  epoch: number;
  /** Out field: the draw callback reports its approximate cell count. */
  cells: number;
}

interface D2Stats {
  draws: number;
  avgMs: number;
  cells: number;
}

export function useCanvasStage(
  draw: (f: StageFrame) => void,
  statKey: string,
): RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let colors = readStageColors();
    let epoch = 0;
    let visible = false;
    let started = false;
    let disposed = false;
    let raf = 0;
    let lastTs = 0;
    let tAcc = 0;
    let emaMs = 0;
    let draws = 0;
    let lastCells = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const render = (mode: "anim" | "final") => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const frame: StageFrame = {
        ctx,
        w,
        h,
        backingW: canvas.width,
        backingH: canvas.height,
        t: tAcc,
        colors,
        mode,
        epoch,
        cells: 0,
      };
      const t0 = performance.now();
      drawRef.current(frame);
      const dt = performance.now() - t0;
      emaMs = draws === 0 ? dt : emaMs * 0.9 + dt * 0.1;
      draws += 1;
      lastCells = frame.cells || lastCells;
      if (draws % 15 === 0 || mode === "final") {
        const wnd = window as unknown as { __d2?: Record<string, D2Stats> };
        (wnd.__d2 ??= {})[statKey] = {
          draws,
          avgMs: Math.round(emaMs * 100) / 100,
          cells: lastCells,
        };
      }
    };

    const renderSettled = () => {
      render(reduced.matches || !started ? "final" : "anim");
    };

    const loop = (ts: number) => {
      if (disposed) return;
      const dt = lastTs ? Math.min(ts - lastTs, 100) : 16;
      lastTs = ts;
      tAcc += dt;
      render("anim");
      raf = requestAnimationFrame(loop);
    };
    const startLoop = () => {
      if (raf || disposed || reduced.matches) return;
      started = true;
      lastTs = 0;
      raf = requestAnimationFrame(loop);
    };
    const stopLoop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
        epoch += 1;
      }
      renderSettled();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visible = true;
            startLoop();
          } else {
            visible = false;
            stopLoop();
          }
        });
      },
      { threshold: 0.2 },
    );
    io.observe(canvas);

    const mo = new MutationObserver(() => {
      colors = readStageColors();
      epoch += 1;
      renderSettled();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const onReducedChange = () => {
      if (reduced.matches) {
        stopLoop();
        render("final");
      } else if (visible) {
        startLoop();
      }
    };
    reduced.addEventListener("change", onReducedChange);

    let fontsCancelled = false;
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (fontsCancelled || disposed) return;
        epoch += 1;
        renderSettled();
      });
    }

    return () => {
      disposed = true;
      fontsCancelled = true;
      stopLoop();
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      reduced.removeEventListener("change", onReducedChange);
    };
  }, [statKey]);

  return canvasRef;
}
