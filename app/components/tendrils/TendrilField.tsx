"use client";

import { useEffect, useRef } from "react";
import { CELL, TendrilEngine } from "./engine";
import { measure, type MeasureResult, type Rect } from "./measure";
import { FONT_SPEC, SpriteAtlas, glyphChar, type Palette } from "./sprites";

/* TendrilField: a page-scale overlay of autonomous glyph tendrils.
   One fixed canvas between the page background and the content; the
   simulation lives in page space (engine.ts) and only the visible
   slice is ever drawn, from cached glyph sprites (sprites.ts), on a
   simulation clock capped well under the display rate. Tendrils grow
   at rest, snake the gutters and section edges, dock at ports and
   cascade downward. They never cross content: the obstacle grid is
   measured from the real page, interactive elements included, and the
   sticky header / fixed buttons are dynamic obstacles.

   Device tiers (the award-site norm): full and reduced are chosen by
   hardware heuristics at boot; a runtime governor steps the tier down
   if the frame budget keeps being missed. Reduced motion gets a
   pre-grown static network, rendered once per view. No JS, no field. */

type TierName = "full" | "reduced" | "minimal";
/* Each tier carries a NAMED glyph budget: the maximum number of
   settled glyph cells allowed on the page at once. */
const TIERS: {
  name: TierName;
  dprCap: number;
  maxTips: number;
  simHz: number;
  budgetScale: number;
  glyphBudget: number;
}[] = [
  { name: "full", dprCap: 1.75, maxTips: 12, simHz: 40, budgetScale: 1, glyphBudget: 9000 },
  { name: "reduced", dprCap: 1.25, maxTips: 6, simHz: 30, budgetScale: 0.7, glyphBudget: 5200 },
  { name: "minimal", dprCap: 1, maxTips: 4, simHz: 24, budgetScale: 0.5, glyphBudget: 3000 },
];

function bootTier(): number {
  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return cores <= 4 || mem <= 4 || (coarse && cores <= 6) ? 1 : 0;
}

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const parse = (v: string, fallback: [number, number, number]): [number, number, number] => {
    const m = v.trim().match(/^#([0-9a-f]{6})$/i);
    if (!m) return fallback;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  return {
    ink: parse(cs.getPropertyValue("--ink"), [23, 20, 16]),
    accent: parse(cs.getPropertyValue("--accent"), [181, 65, 47]),
  };
}

export function TendrilField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let disposed = false;
    let raf = 0;
    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("motion-paused");

    let tierIdx = bootTier();
    let dpr = Math.min(window.devicePixelRatio || 1, TIERS[tierIdx].dprCap);
    let palette = readPalette();
    let atlas: SpriteAtlas | null = null;
    let engine: TendrilEngine | null = null;
    let measured: MeasureResult | null = null;
    /* Audit rects belonging to the world the engine is actually
       running (set at init and on every world swap). Auditing against
       a newer measure than the engine's world would flag glyphs for
       layout the engine has not adopted yet. */
    let worldRects: Rect[] = [];
    let portEls: HTMLElement[] = [];
    const dockTimers = new Map<number, number>();

    let renders = 0;
    let drawnCells = 0;
    let pregrowMs = 0;
    let pregrowSimSeconds = 0;
    let frameCostEma = 0;
    let rafDeltaEma = 16;
    let govChecks = 0;
    let govBad = 0;
    /* Scroll discipline: advancement pauses while the page is
       actively scrolling and resumes ~200ms after it stops; the
       static-frozen state is the designed fallback if even the
       minimal tier cannot hold the frame budget. */
    let scrollActive = false;
    let resumePending = false;
    let scrollStopTimer = 0;
    let staticFrozen = false;
    const isStatic = () => reduced || staticFrozen;

    const clearDocks = () => {
      for (const [, t] of dockTimers) window.clearTimeout(t);
      dockTimers.clear();
      for (const el of portEls) el.removeAttribute("data-docked");
    };

    const applyTier = () => {
      const t = TIERS[tierIdx];
      dpr = Math.min(window.devicePixelRatio || 1, t.dprCap);
      if (engine) {
        engine.maxTips = t.maxTips;
        engine.budgetScale = t.budgetScale;
        engine.glyphBudget = t.glyphBudget;
      }
      sizeCanvas();
      atlas = new SpriteAtlas(palette, dpr);
    };

    const sizeCanvas = () => {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = () => {
      if (!engine || !atlas) return;
      const t0 = performance.now();
      const w = engine.world;
      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const r0 = Math.max(0, Math.floor(scrollY / CELL) - 1);
      const r1 = Math.min(w.rows - 1, Math.ceil((scrollY + vh) / CELL) + 1);
      let drawn = 0;
      for (let cy = r0; cy <= r1; cy++) {
        const rowOff = cy * w.cols;
        const yPx = cy * CELL - scrollY;
        for (let cx = 0; cx < w.cols; cx++) {
          const i = rowOff + cx;
          const d = engine.trail[i];
          if (d <= 0.05) continue;
          const sp = atlas.get(glyphChar(engine.glyph[i], d), "ink", 0.13 + d * 0.55);
          if (sp) {
            ctx.drawImage(sp, cx * CELL, yPx, CELL, CELL);
            drawn++;
          }
        }
      }
      /* Pulses: accent packets on retired paths. */
      for (const pulse of engine.pulses) {
        const center = Math.round(pulse.pos);
        for (let k = -2; k <= 2; k++) {
          const idx = center + k;
          if (idx < 0 || idx >= pulse.path.length) continue;
          const cell = pulse.path[idx];
          const cx = cell % w.cols;
          const cy = Math.floor(cell / w.cols);
          if (cy < r0 || cy > r1) continue;
          const ch = k === 0 ? "@" : glyphChar(engine.glyph[cell], engine.trail[cell] || 0.6);
          const sp = atlas.get(ch, "accent", k === 0 ? 1 : k % 2 === 0 ? 0.38 : 0.62);
          if (sp) {
            ctx.drawImage(sp, cx * CELL, cy * CELL - scrollY, CELL, CELL);
            drawn++;
          }
        }
      }
      /* Live heads: heaviest glyph, accent only while docked. */
      for (const tip of engine.tips) {
        const cx = Math.round(tip.x);
        const cy = Math.round(tip.y);
        if (cy < r0 || cy > r1) continue;
        const yPx = cy * CELL - scrollY;
        if (tip.state === "docked") {
          const sp = atlas.get("@", "accent", 1);
          if (sp) ctx.drawImage(sp, cx * CELL, yPx, CELL, CELL);
          drawn++;
          continue;
        }
        const tail = tip.path;
        for (let b = 1; b <= 4 && b <= tail.length; b++) {
          const cell = tail[tail.length - b];
          const bx = cell % w.cols;
          const by = Math.floor(cell / w.cols);
          if (by < r0 || by > r1) continue;
          const sp = atlas.get(glyphChar(engine.glyph[cell], 0.7), "ink", 0.72 - b * 0.11);
          if (sp) {
            ctx.drawImage(sp, bx * CELL, by * CELL - scrollY, CELL, CELL);
            drawn++;
          }
        }
        const headCh = tip.width >= 0.62 ? "@" : tip.width >= 0.45 ? "#" : "%";
        const sp = atlas.get(headCh, "ink", 1);
        if (sp) {
          ctx.drawImage(sp, cx * CELL, yPx, CELL, CELL);
          drawn++;
        }
      }
      renders++;
      drawnCells = drawn;
      const cost = performance.now() - t0;
      frameCostEma = frameCostEma * 0.92 + cost * 0.08;
    };

    const onDock = (portIdx: number) => {
      if (reduced || staticFrozen || disposed) return;
      const el = portEls[portIdx];
      const name = engine?.world.ports[portIdx]?.name;
      if (!el || !name) return;
      el.setAttribute("data-docked", "true");
      el.dispatchEvent(new CustomEvent("tendril-dock", { bubbles: true, detail: { port: name } }));
      const prev = dockTimers.get(portIdx);
      if (prev) window.clearTimeout(prev);
      dockTimers.set(
        portIdx,
        window.setTimeout(() => el.removeAttribute("data-docked"), 1200),
      );
    };

    const remeasure = () => {
      if (disposed || !engine) return;
      const nm = measure(document);
      const prev = measured;
      measured = nm;
      const changed =
        !prev ||
        Math.abs(prev.world.pageH - nm.world.pageH) > 2 ||
        Math.abs(prev.world.pageW - nm.world.pageW) > 2 ||
        prev.world.ports.length !== nm.world.ports.length;
      if (changed) {
        clearDocks();
        portEls = nm.portEls;
        worldRects = nm.auditRects;
        engine.setWorld(nm.world);
        /* Static mode: a world swap prunes glyphs that landed inside
           shifted content; grow the network back under the new world. */
        if (isStatic()) {
          engine.fastForward(60);
          render();
        }
      }
      engine.setDynRects(nm.dynRects);
      engine.version++;
    };

    let remeasureTimer = 0;
    const scheduleRemeasure = (ms: number) => {
      window.clearTimeout(remeasureTimer);
      remeasureTimer = window.setTimeout(remeasure, ms);
    };

    const init = async () => {
      /* Sprites bake only once the real mono face is in hand. */
      try {
        await Promise.race([
          document.fonts.load(FONT_SPEC).then(() => document.fonts.ready),
          new Promise((r) => window.setTimeout(r, 1500)),
        ]);
      } catch {
        /* fall through: the loadingdone re-bake will fix the atlas */
      }
      if (disposed) return;

      measured = measure(document);
      portEls = measured.portEls;
      worldRects = measured.auditRects;
      engine = new TendrilEngine(measured.world);
      engine.onDock = onDock;
      engine.setDynRects(measured.dynRects);
      const t = TIERS[tierIdx];
      engine.maxTips = t.maxTips;
      engine.budgetScale = t.budgetScale;
      engine.glyphBudget = t.glyphBudget;
      atlas = new SpriteAtlas(palette, dpr);
      sizeCanvas();

      const debug = {
        stats: () => ({
          ...(engine?.stats() ?? {}),
          tier: TIERS[tierIdx].name,
          glyphBudget: TIERS[tierIdx].glyphBudget,
          frozen: staticFrozen,
          scrollPaused: scrollActive,
          renders,
          drawnCells,
          pregrowMs: Math.round(pregrowMs),
          pregrowSimSeconds,
          frameCostMs: Math.round(frameCostEma * 100) / 100,
          rafDeltaMs: Math.round(rafDeltaEma * 10) / 10,
          dpr,
        }),
        ports: () => engine?.world.ports.map((p) => ({ ...p })) ?? [],
        tips: () => engine?.tipsSnapshot() ?? [],
        sources: () => engine?.world.heroSources.map((s) => ({ ...s })) ?? [],
        audit: () =>
          engine
            ? engine.auditRects(
                worldRects.map((r) => ({ x: r.x - 3, y: r.y - 3, w: r.w + 6, h: r.h + 6 })),
              )
            : -1,
        dockLog: () => engine?.dockLog.slice() ?? [],
      };
      (window as unknown as { __tendrils?: typeof debug }).__tendrils = debug;

      if (reduced) {
        engine.fastForward(260);
        render();
        return;
      }

      /* Pregrow: fast-forward the simulation ~30 sim-seconds before
         the live loop starts, so the page is born with a connected
         network through the first sections and the dock cascade
         already staged downward, instead of spending its first half
         minute as a few glyphs around the hero. The world is fully
         measured above, so the pregrow respects the same obstacle
         grid as live growth. It runs after mount (the page has
         painted; init already awaited the font), in 2 sim-second
         slices with a yield between them, and its main-thread cost
         is measured into the debug stats as pregrowMs. The
         reduced-motion path above keeps its own 90s+ static
         fast-forward and never reaches here. */
      const PREGROW_SECONDS = 30;
      const SLICE_SECONDS = 2;
      for (let doneS = 0; doneS < PREGROW_SECONDS && !disposed; doneS += SLICE_SECONDS) {
        const t0 = performance.now();
        engine.fastForward(Math.min(SLICE_SECONDS, PREGROW_SECONDS - doneS));
        pregrowMs += performance.now() - t0;
        pregrowSimSeconds = Math.min(PREGROW_SECONDS, doneS + SLICE_SECONDS);
        if (doneS + SLICE_SECONDS < PREGROW_SECONDS) {
          await new Promise((r) => window.setTimeout(r, 0));
        }
      }
      if (disposed) return;
      engine.spawnFromHero();
      render();

      let last = performance.now();
      let lastScrollY = window.scrollY;
      let vel = 0;
      let simAcc = 0;
      let lastVersion = -1;
      let lastRenderedScroll = -100;

      const loop = (now: number) => {
        if (disposed || staticFrozen) return;
        raf = requestAnimationFrame(loop);
        const dtMs = now - last;
        last = now;
        if (document.hidden || !engine) return;
        rafDeltaEma = rafDeltaEma * 0.95 + Math.min(dtMs, 100) * 0.05;

        const scrollY = window.scrollY;
        if (resumePending) {
          /* Scroll bias applies only after the resume: the velocity
             estimate restarts from rest, so the scroll that just
             happened never steers a tendril. */
          resumePending = false;
          lastScrollY = scrollY;
          vel = 0;
          simAcc = 0;
        }
        const dtSec = Math.min(dtMs, 100) / 1000;
        if (dtSec > 0 && !scrollActive) {
          const rawVel = (scrollY - lastScrollY) / dtSec;
          vel = vel * 0.78 + rawVel * 0.22;
        }
        lastScrollY = scrollY;

        /* Pause during scroll: while the page is moving, the sim
           does not advance at all (rendering still follows the
           viewport slice). A dock is an event in sim time, so it
           can never be scrubbed or half-played by scrolling. */
        const simStart = performance.now();
        if (!scrollActive) {
          const quantum = 1000 / TIERS[tierIdx].simHz;
          simAcc += Math.min(dtMs, 250);
          let steps = 0;
          while (simAcc >= quantum && steps < 8) {
            engine.step(quantum / 1000, scrollY, scrollY + window.innerHeight, vel);
            simAcc -= quantum;
            steps++;
          }
          if (steps === 8) simAcc = 0;
        }
        frameCostEma = frameCostEma * 0.92 + (performance.now() - simStart) * 0.08;

        if (engine.version !== lastVersion || Math.abs(scrollY - lastRenderedScroll) >= 1) {
          lastVersion = engine.version;
          lastRenderedScroll = scrollY;
          render();
        }

        /* Governor: sustained misses step the tier down, one way.
           Judged on the tendril layer's OWN frame cost (sim + draw),
           not the rAF delta: the delta measures the whole page's
           rendering, which this layer does not control. Below the
           minimal tier sits the designed static fallback. */
        govChecks++;
        if (govChecks >= 110) {
          govChecks = 0;
          if (frameCostEma > 16) {
            govBad++;
            if (govBad >= 2) {
              govBad = 0;
              if (tierIdx < TIERS.length - 1) {
                tierIdx++;
                applyTier();
                lastVersion = -1;
              } else if (!staticFrozen) {
                staticFrozen = true;
                engine.fastForward(90);
                render();
              }
            }
          } else {
            govBad = 0;
          }
        }
      };
      raf = requestAnimationFrame(loop);
    };

    /* Lifecycle wiring. */
    const onResize = () => {
      sizeCanvas();
      scheduleRemeasure(300);
      if (isStatic()) {
        remeasure();
        engine?.fastForward(120);
        render();
      } else if (engine) {
        engine.version++;
      }
    };
    const onScrollStatic = () => {
      if (isStatic()) render();
    };
    /* Any scroll marks the page active; 200ms after the last scroll
       event the sim may resume (handled in the loop). */
    const onScrollAny = () => {
      scrollActive = true;
      window.clearTimeout(scrollStopTimer);
      scrollStopTimer = window.setTimeout(() => {
        scrollActive = false;
        resumePending = true;
      }, 200);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScrollStatic, { passive: true });
    window.addEventListener("scroll", onScrollAny, { passive: true });

    const themeObs = new MutationObserver(() => {
      palette = readPalette();
      atlas = new SpriteAtlas(palette, dpr);
      if (engine) engine.version++;
      if (isStatic()) render();
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const fontsSet = document.fonts as FontFaceSet & {
      addEventListener?: (t: string, cb: () => void) => void;
    };
    const onFonts = () => {
      atlas = new SpriteAtlas(palette, dpr);
      if (engine) engine.version++;
      if (isStatic()) render();
      scheduleRemeasure(200);
    };
    fontsSet.addEventListener?.("loadingdone", onFonts);

    const ro = new ResizeObserver(() => scheduleRemeasure(400));
    if (document.body) ro.observe(document.body);
    const headObs = new MutationObserver(() => scheduleRemeasure(500));
    const head = document.querySelector(".site-head");
    if (head) headObs.observe(head, { attributes: true, attributeFilter: ["class"] });
    const interval = window.setInterval(remeasure, 3000);

    void init();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScrollStatic);
      window.removeEventListener("scroll", onScrollAny);
      window.clearTimeout(scrollStopTimer);
      themeObs.disconnect();
      ro.disconnect();
      headObs.disconnect();
      window.clearInterval(interval);
      window.clearTimeout(remeasureTimer);
      clearDocks();
      delete (window as unknown as { __tendrils?: unknown }).__tendrils;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="tendril-field"
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1,
        pointerEvents: "none",
      }}
    />
  );
}
