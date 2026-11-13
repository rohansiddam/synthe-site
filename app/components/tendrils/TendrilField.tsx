"use client";

import { useEffect, useRef } from "react";
import { CELL, TendrilEngine, type DynRect } from "./engine";
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
    /* Live docks, keyed by port NAME (indices shift across world
       swaps; names do not): the timeout that clears the attribute,
       and the wall-clock expiry the remeasure re-apply reads. */
    const dockTimers = new Map<string, number>();
    const dockUntil = new Map<string, number>();

    let renders = 0;
    let drawnCells = 0;
    let pregrowMs = 0;
    let pregrowMaxSliceMs = 0;
    let pregrowSimSeconds = 0;
    let pregrowCapped = false;
    let pregrowStopReason = "";
    let pregrowRegions: number[] = [];
    /* Header keep-out (wave 3): the sticky header's band height plus
       a small margin, in viewport px. The renderer draws nothing
       above this line, so no settled glyph, head or pulse can ever
       appear inside the header band at any scroll position. The
       header is already a dynamic obstacle for movement; this is
       the render-side guarantee for glyphs laid in page space that
       later pass beneath the band as the page scrolls. */
    let headerClipPx = 0;
    const updateClip = (rects: DynRect[]) => {
      const head = rects.find((r) => r.x <= 1 && r.y <= 1);
      headerClipPx = head ? head.h + 6 : 0;
    };
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
      dockUntil.clear();
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
      const clipY = headerClipPx;
      let drawn = 0;
      for (let cy = r0; cy <= r1; cy++) {
        const rowOff = cy * w.cols;
        const yPx = cy * CELL - scrollY;
        if (yPx < clipY) continue; // header band keep-out
        for (let cx = 0; cx < w.cols; cx++) {
          const i = rowOff + cx;
          const d = engine.trail[i];
          if (d <= 0.05) continue;
          const sp = atlas.get(glyphChar(engine.glyph[i], d), "ink", 0.2 + d * 0.58);
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
          if (cy * CELL - scrollY < clipY) continue; // header band keep-out
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
        if (yPx < clipY) continue; // header band keep-out
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
          if (by * CELL - scrollY < clipY) continue; // header band keep-out
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
      dockUntil.set(name, performance.now() + 1200);
      const prev = dockTimers.get(name);
      if (prev) window.clearTimeout(prev);
      dockTimers.set(
        name,
        window.setTimeout(() => {
          el.removeAttribute("data-docked");
          dockUntil.delete(name);
          dockTimers.delete(name);
        }, 1200),
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
        portEls = nm.portEls;
        worldRects = nm.auditRects;
        /* Docks survive world swaps (wave 4): a swap used to clear
           data-docked mid-reaction, truncating the 1.2s touch to
           whatever fraction of it preceded the next remeasure
           (measured as short as ~200ms). Re-apply any still-live
           dock to its re-resolved element; the original per-name
           timer still clears it on schedule. */
        const now = performance.now();
        nm.world.ports.forEach((p, i) => {
          const until = dockUntil.get(p.name);
          const el = portEls[i];
          if (el && until !== undefined && until > now) el.setAttribute("data-docked", "true");
        });
        engine.setWorld(nm.world);
        /* Static mode: a world swap prunes glyphs that landed inside
           shifted content; grow the network back under the new world. */
        if (isStatic()) {
          engine.fastForward(60);
          render();
        }
      }
      engine.setDynRects(nm.dynRects);
      updateClip(nm.dynRects);
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
      updateClip(measured.dynRects);
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
          pregrowMaxSliceMs: Math.round(pregrowMaxSliceMs),
          pregrowSimSeconds,
          pregrowCapped,
          pregrowStopReason,
          pregrowRegions,
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
        auditHeads: () =>
          engine
            ? engine.auditHeads(
                worldRects.map((r) => ({ x: r.x - 3, y: r.y - 3, w: r.w + 6, h: r.h + 6 })),
              )
            : -1,
        /* Header band accounting at the current scroll position:
           how many settled cells and live heads sit inside the band
           the renderer clips away. Drawn violations are zero by
           construction (render skips the band); these counts prove
           the clip is load-bearing rather than decorative. */
        band: () => {
          if (!engine) return null;
          const w = engine.world;
          const sy = window.scrollY;
          let settled = 0;
          let heads = 0;
          for (let cy = 0; cy < w.rows; cy++) {
            const yPx = cy * CELL - sy;
            if (yPx >= headerClipPx) break;
            if (yPx + CELL <= 0) continue;
            for (let cx = 0; cx < w.cols; cx++) {
              if (engine.trail[cy * w.cols + cx] > 0.05) settled++;
            }
          }
          for (const tip of engine.tips) {
            const yPx = Math.round(tip.y) * CELL - sy;
            if (yPx < headerClipPx && yPx + CELL > 0) heads++;
          }
          return { clipPx: headerClipPx, settledSuppressed: settled, headsSuppressed: heads };
        },
        dockLog: () => engine?.dockLog.slice() ?? [],
        /* Wave-4 pregrow diagnostics: per-region budgets and floors
           (the coverage predicate's own arithmetic), per-hop cascade
           feasibility (each port's distance field read at the
           previous port's anchor: -1 means the hop can never be
           walked), and a raw reachability pass over the blocked grid
           from the hero sources (which regions walking physics can
           ever settle, and which rows are fully sealed). */
        regions: () => {
          const e = engine;
          if (!e) return null;
          return {
            cols: e.world.cols,
            rows: e.world.rows,
            regionRows: e.world.regionRows,
            settled: e.regionSettled(),
            budgets: e.regionSettled().map((_, r) => e.regionBudget(r)),
            floors: e
              .regionSettled()
              .map((_, r) => Math.max(28, Math.round(e.regionBudget(r) * 0.14))),
          };
        },
        hops: () => {
          const e = engine;
          if (!e) return [];
          return e.world.ports.map((p, i) => {
            if (i === 0) return { name: p.name, dock: [p.dockX, p.dockY], fromPrev: null };
            const prev = e.world.ports[i - 1];
            const f = e.world.distFields[i];
            const at =
              prev.dockX !== undefined && prev.dockY !== undefined && f
                ? f[prev.dockY * e.world.cols + prev.dockX]
                : null;
            return { name: p.name, dock: [p.dockX, p.dockY], fromPrev: at };
          });
        },
        reach: () => {
          const e = engine;
          if (!e) return null;
          const w = e.world;
          const seen = new Uint8Array(w.cols * w.rows);
          const queue: number[] = [];
          for (const s of w.heroSources) {
            const cx = Math.min(w.cols - 1, Math.max(0, Math.floor(s.x / CELL)));
            let cy = Math.min(w.rows - 1, Math.max(0, Math.floor(s.y / CELL)));
            /* Same free-cell nudge spawn() applies: a source inside
               a stamped obstacle seeds from the first free cell
               below it, not from inside the wall. */
            while (cy < w.rows - 1 && w.blocked[cy * w.cols + cx]) cy++;
            const i = cy * w.cols + cx;
            if (!w.blocked[i] && !seen[i]) {
              seen[i] = 1;
              queue.push(i);
            }
          }
          for (let qi = 0; qi < queue.length; qi++) {
            const cur = queue[qi];
            const cx = cur % w.cols;
            const cy = Math.floor(cur / w.cols);
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= w.cols || ny >= w.rows) continue;
                const ni = ny * w.cols + nx;
                if (seen[ni] || w.blocked[ni]) continue;
                if (dx !== 0 && dy !== 0 && (w.blocked[cy * w.cols + nx] || w.blocked[ny * w.cols + cx])) continue;
                seen[ni] = 1;
                queue.push(ni);
              }
            }
          }
          const regions = Math.max(1, Math.ceil(w.rows / w.regionRows));
          const reachable = new Array(regions).fill(0);
          const sealedRows: number[] = [];
          for (let cy = 0; cy < w.rows; cy++) {
            let free = 0;
            for (let cx = 0; cx < w.cols; cx++) {
              const i = cy * w.cols + cx;
              if (seen[i]) {
                reachable[Math.floor(cy / w.regionRows)]++;
                free++;
              } else if (!w.blocked[i]) free++;
            }
            if (free === 0) sealedRows.push(cy);
          }
          return { reachable, sealedRows };
        },
      };
      (window as unknown as { __tendrils?: typeof debug }).__tendrils = debug;

      if (reduced) {
        engine.fastForward(260);
        render();
        return;
      }

      /* Pregrow: fast-forward the simulation before the live loop
         starts, growing to COVERAGE, not to a fixed duration (wave
         4; wave 3 grew a fixed 120 sim-seconds, wave 2 grew 30). A
         fixed budget left Home's last region (report band + footer)
         bare at birth in every run, because the cascade's final hops
         down a 5,340px page take longer than 120 sim-seconds from a
         cold start. The stop condition is now the outcome the
         pregrow exists for: every page region holds settled network,
         judged per region from the engine's settled counts against
         a floor scaled to that region's own density budget. The
         reduced-motion path grows its full static network at 260
         sim-seconds; the ceiling here is a backstop in that class
         (typical coverage lands at 82-220 sim-seconds; the ceiling
         exists for the stochastic tail of the last hand-off, and the
         wall-clock and slow-slice guards below are what actually
         protect a slow device), and on a page the cascade can cover
         sooner (Docs), the pregrow stops as soon as coverage lands
         and costs less than the old fixed run. Growth radiates from the hero down the port cascade in
         page order, so early coverage is the old pregrow's coverage:
         the extra growth only ever extends the frontier downward.
         Guards, in the order they can fire: the tier's settled glyph
         budget (pregrowCapped, the wave-3 semantics: earlier
         sections are densest by construction, the hero-outward
         priority); a slow-device guard (three consecutive slices
         over 300ms of CPU, or 25s of wall time including yields:
         stop gracefully with whatever coverage exists; the live
         cascade continues regardless); and the sim-seconds ceiling.
         The world is fully measured above, so the pregrow respects
         the same obstacle grid as live growth. It runs after mount
         (the page has painted; init already awaited the font), in
         2 sim-second slices with a yield between them, painting the
         born network after each slice; cost is measured into the
         debug stats as pregrowMs / pregrowMaxSliceMs, the outcome
         as pregrowStopReason / pregrowRegions. */
      const PREGROW_MAX_SECONDS = 480;
      const SLICE_SECONDS = 2;
      const SLOW_SLICE_MS = 300;
      const WALL_BUDGET_MS = 25000;
      const coverageMet = () => {
        const e = engine;
        if (!e) return true;
        const counts = e.regionSettled();
        if (!counts.length) return true;
        return counts.every(
          (c, r) => c >= Math.max(28, Math.round(e.regionBudget(r) * 0.14)),
        );
      };
      const pregrowStart = performance.now();
      let slowSlices = 0;
      let doneS = 0;
      pregrowStopReason = "ceiling";
      while (!disposed && doneS < PREGROW_MAX_SECONDS) {
        if (coverageMet()) {
          pregrowStopReason = "coverage";
          break;
        }
        const t0 = performance.now();
        engine.fastForward(Math.min(SLICE_SECONDS, PREGROW_MAX_SECONDS - doneS));
        const sliceMs = performance.now() - t0;
        pregrowMs += sliceMs;
        if (sliceMs > pregrowMaxSliceMs) pregrowMaxSliceMs = sliceMs;
        doneS += SLICE_SECONDS;
        pregrowSimSeconds = Math.min(PREGROW_MAX_SECONDS, doneS);
        render();
        if (engine.stats().trailCells >= engine.glyphBudget) {
          pregrowCapped = true;
          pregrowStopReason = "glyph-budget";
          break;
        }
        slowSlices = sliceMs > SLOW_SLICE_MS ? slowSlices + 1 : 0;
        if (slowSlices >= 3) {
          pregrowStopReason = "slow-device";
          break;
        }
        if (performance.now() - pregrowStart > WALL_BUDGET_MS) {
          pregrowStopReason = "wall-clock";
          break;
        }
        if (doneS < PREGROW_MAX_SECONDS) {
          await new Promise((r) => window.setTimeout(r, 0));
        }
      }
      if (pregrowStopReason === "ceiling" && coverageMet()) pregrowStopReason = "coverage";
      pregrowRegions = engine.regionSettled();
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
