"use client";

import { useEffect, useRef } from "react";
import { dockBus } from "./dockBus";
import { observeTheme, prefersReducedMotion, readToken } from "./glBase";

/* Treatment 2: the terrain boundary.
 *
 * The crossing into the dark section is not a dissolve and not a
 * drawn silhouette (both were tried; the founder rejected both). It
 * is the dark section's own leading edge, built the way the
 * reference builds its world: a jagged terrain of tiny glyph blocks
 * that RISES as you scroll, like a skyline being surveyed up into
 * the light section.
 *
 * Mechanics:
 *  - Columns of glyphs form the top edge of the dark ground. Each
 *    column's height is driven by smoothed scroll progress through
 *    the boundary zone: columns grow upward as the component slides
 *    up through the viewport, shrink back on scroll up, with a
 *    per-column stagger so the skyline does not rise as one wall.
 *    The profile itself is a seeded random walk with a few towers.
 *  - Columns are filled with mutating glyphs from the repertoire
 *    alphabets (letters, digits, brackets, binary, dense marks),
 *    assigned in chunks along the width. Cells re-roll at the crawl
 *    cadence (a 300 ms tick, roughly one re-roll per cell every
 *    1 to 2 seconds); crest cells re-roll fastest and burn brightest,
 *    some in the accent: the crest sparkles.
 *  - Below the crest the ground is filled, and over it a
 *    low-contrast glyph field (bracket and digit compositions at
 *    wallpaper strength, turning over every 10 to 15 seconds) so
 *    the terrain reads as the front edge of a filled world that
 *    continues into the report band below, not as a fence.
 *  - The terrain publishes its crest line to dockBus every frame;
 *    the logo scene's tendrils ease toward it and dock into the
 *    columns. A dock flashes here: the receiving column's crest
 *    goes full accent and its upper cells pick up density while
 *    the flash lasts. Growth and tendril reach are the same scroll
 *    gesture, read from the same numbers.
 *
 * Ground and glyph colours come from the site's tokens exactly as
 * the band below uses them (ground = --ink, glyphs = --bg), so in
 * the light theme charcoal terrain rises into paper, and in the
 * dark theme the paper terrain rises into charcoal. The component
 * is seamless with the band: same ground, no gap, no hard edge.
 *
 * Canvas 2D; draws only while on screen or while growth is moving.
 * Reduced motion draws one static frame at full growth.
 */

const CELL = 13; // CSS px per cell
const HEIGHT = 560; // CSS px component height

/* Repertoire alphabets, assigned to chunks of columns. */
const ALPHABETS = [
  "ABCDEFG", // letters
  "0123456789", // digits
  "01AI+", // binary / arrow field letters
  "[]ABC:+", // brackets
  "#%@*+=", // dense marks
];
const DENSE = "#%@*+=";

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x: number, y: number, s: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

/* The skyline profile over the unit interval: a seeded random walk,
   smoothed, with a few towers. Generated once per page load so the
   terrain and everything docked into it share one shape. */
let profileCtrl: number[] | null = null;
function profileAt(x01: number): number {
  if (!profileCtrl) {
    const rand = mulberry(20240);
    const n = 64;
    const pts: number[] = [];
    let cur = 0.55;
    for (let i = 0; i < n; i++) {
      cur += (rand() - 0.5) * 0.34;
      cur = Math.min(0.82, Math.max(0.2, cur));
      pts.push(cur);
    }
    for (let t = 0; t < 4; t++) {
      const i = 4 + Math.floor(rand() * (n - 8));
      pts[i] = 0.94 + rand() * 0.06;
      pts[i - 1] = Math.max(pts[i - 1], 0.72);
      pts[i + 1] = Math.max(pts[i + 1], 0.72);
    }
    const sm = pts.map((v, i) => {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(n - 1, i + 1)];
      return (a + v * 2 + b) / 4;
    });
    profileCtrl = sm.map((v) => 0.35 + 0.65 * v);
  }
  const pos = Math.min(0.9999, Math.max(0, x01)) * (profileCtrl.length - 1);
  const i = Math.floor(pos);
  const f = pos - i;
  return profileCtrl[i] + (profileCtrl[Math.min(profileCtrl.length - 1, i + 1)] - profileCtrl[i]) * f;
}

interface Fields {
  bodyChar: string[];
  bodySet: string[]; // per-cell re-roll alphabet ("" = fixed)
  bodyRole: Uint8Array; // 1 = accent-leaning
  wallChar: string[];
  wallAlpha: Float32Array;
}

function buildFields(cols: number, rows: number, seed: number): Fields {
  const rand = mulberry(seed);
  const n = cols * rows;
  const bodyChar = new Array<string>(n).fill(" ");
  const bodySet = new Array<string>(n).fill("");
  const bodyRole = new Uint8Array(n);
  const wallChar = new Array<string>(n).fill(" ");
  const wallAlpha = new Float32Array(n);

  /* Column zone chunks. */
  const colZone = new Int16Array(cols);
  {
    let x = 0;
    let z = Math.floor(rand() * ALPHABETS.length);
    while (x < cols) {
      const w = 6 + Math.floor(rand() * 10);
      for (let k = 0; k < w && x + k < cols; k++) colZone[x + k] = z;
      x += w;
      z = (z + 1 + Math.floor(rand() * (ALPHABETS.length - 1))) % ALPHABETS.length;
    }
  }
  /* Wallpaper zone chunks, offset so they do not echo the columns. */
  const wallZone = new Int16Array(cols);
  {
    let x = 0;
    let z = Math.floor(rand() * 3);
    const wallSets = ["[]ABC:", "0123456789", "ABCDEFG"];
    while (x < cols) {
      const w = 9 + Math.floor(rand() * 12);
      for (let k = 0; k < w && x + k < cols; k++) wallZone[x + k] = z;
      x += w;
      z = (z + 1 + Math.floor(rand() * 2)) % 3;
    }
    for (let cx = 0; cx < cols; cx++) {
      const set = wallSets[wallZone[cx]];
      for (let y = 0; y < rows; y++) {
        const i = y * cols + cx;
        if (rand() < 0.42) {
          wallChar[i] = set[Math.floor(rand() * set.length)];
          wallAlpha[i] = 0.05 + rand() * 0.11;
        }
      }
    }
  }

  for (let x = 0; x < cols; x++) {
    const set = ALPHABETS[colZone[x]];
    for (let y = 0; y < rows; y++) {
      const i = y * cols + x;
      /* Body cells mix their zone alphabet with dense marks, the way
         the reference band mixes a hex field with solid runs. */
      bodySet[i] = set + DENSE;
      bodyChar[i] =
        rand() < 0.38
          ? DENSE[Math.floor(rand() * DENSE.length)]
          : set[Math.floor(rand() * set.length)];
      bodyRole[i] = rand() < 0.07 ? 1 : 0;
    }
  }
  return { bodyChar, bodySet, bodyRole, wallChar, wallAlpha };
}

export function TerrainBoundary() {
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
    let cols = 0;
    let rows = 0;
    let cellW = CELL;
    let cellH = CELL;
    let fields: Fields | null = null;
    let wallNext: Fields | null = null;
    let flipAt = new Float32Array(0);
    let nextTurnover = Number.POSITIVE_INFINITY;
    let growth = reduced ? 1 : 0;
    let lastTick = 0;
    let dirty = true;
    let stopTheme: (() => void) | null = null;
    let resizeObs: ResizeObserver | null = null;

    let groundColor = "#171410";
    let glyphColor = "#faf8f1";
    let accentColor = "#b5412f";

    const readColors = () => {
      groundColor = readToken("--ink", groundColor);
      glyphColor = readToken("--bg", glyphColor);
      accentColor = readToken("--accent", accentColor);
    };

    /* Column top (component px) at the current growth. */
    const colTopPx = (x: number, g: number): number => {
      const start = hash2(x, 3, 7) * 0.3;
      const cg = Math.min(1, Math.max(0, (g * 1.3 - start) / (1 - start * 0.7)));
      const eased = cg * cg * (3 - 2 * cg);
      const h = profileAt((x + 0.5) / cols) * HEIGHT * (0.22 + 0.78 * eased);
      return HEIGHT - h;
    };

    const publish = () => {
      const rect = wrap.getBoundingClientRect();
      const crest = new Float32Array(cols);
      for (let x = 0; x < cols; x++) crest[x] = rect.top + colTopPx(x, growth);
      dockBus.terrain.present = true;
      dockBus.terrain.growth = growth;
      dockBus.terrain.topViewportY = rect.top;
      dockBus.terrain.bottomViewportY = rect.bottom;
      dockBus.terrain.cols = cols;
      dockBus.terrain.colWidthPx = cellW;
      dockBus.terrain.crestViewportY = crest;
    };

    const draw = (now: number) => {
      if (!fields) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = wrap.clientWidth;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(HEIGHT * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(HEIGHT * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, HEIGHT);

      /* The dark ground: one staircase path across the crests. */
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT);
      for (let x = 0; x < cols; x++) {
        const top = colTopPx(x, growth);
        ctx.lineTo(x * cellW, top);
        ctx.lineTo((x + 1) * cellW, top);
      }
      ctx.lineTo(w, HEIGHT);
      ctx.closePath();
      ctx.fillStyle = groundColor;
      ctx.fill();

      ctx.font = '500 12px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const turning = wallNext !== null;
      for (let x = 0; x < cols; x++) {
        const top = colTopPx(x, growth);
        const crestRow = Math.floor(top / cellH);
        const flashAt = dockBus.flashes.get(x);
        const flashAge = flashAt === undefined ? Infinity : now - flashAt;
        const flash = flashAge < 800 ? 1 - flashAge / 800 : 0;
        if (flashAt !== undefined && flashAge >= 800) dockBus.flashes.delete(x);
        for (let y = crestRow; y < rows; y++) {
          const depth = y - top / cellH; // cells below the crest line
          const i = y * cols + x;
          if (depth < 5.5) {
            /* Column body: crest burns brightest, density and alpha
               decay over the first few cells. */
            const isCrest = depth < 1;
            let alpha = isCrest ? 0.98 : 0.88 - (depth - 1) * 0.13;
            let color = fields.bodyRole[i] || (isCrest && hash2(x, 1, 4) < 0.3)
              ? accentColor
              : glyphColor;
            if (flash > 0 && depth < 3) {
              alpha = Math.min(1, alpha + flash * 0.5);
              if (isCrest) color = accentColor;
            }
            ctx.fillStyle = color;
            ctx.globalAlpha = Math.max(0.25, alpha);
            const ch = flash > 0.4 && isCrest ? "@" : fields.bodyChar[i];
            ctx.fillText(ch, (x + 0.5) * cellW, (y + 0.5) * cellH + 0.5);
          } else {
            /* The filled world below: wallpaper-strength field. */
            const src = turning && now >= flipAt[i] ? (wallNext as Fields) : fields;
            const ch = src.wallChar[i];
            if (ch === " ") continue;
            ctx.fillStyle = glyphColor;
            ctx.globalAlpha = src.wallAlpha[i];
            ctx.fillText(ch, (x + 0.5) * cellW, (y + 0.5) * cellH + 0.5);
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    const rebuild = () => {
      const w = wrap.clientWidth;
      cols = Math.max(2, Math.ceil(w / CELL));
      rows = Math.round(HEIGHT / CELL);
      cellW = w / cols;
      cellH = HEIGHT / rows;
      fields = buildFields(cols, rows, 3100);
      wallNext = null;
      dirty = true;
    };

    /* The crawl: a 300 ms tick re-rolls cells inside their own
       alphabets. Crest cells (each column's current top cell) re-roll
       at 60% per tick, body cells at 20%, wallpaper at 10%: an
       effective per-cell cadence of roughly 0.5 s at the crest,
       1.5 s in the body, 3 s deep in the field. */
    const mutate = () => {
      if (!fields) return;
      for (let x = 0; x < cols; x++) {
        const crestRow = Math.floor(colTopPx(x, growth) / cellH);
        for (let y = 0; y < rows; y++) {
          const i = y * cols + x;
          const depth = y - crestRow;
          const p = depth === 0 ? 0.6 : depth < 6 ? 0.2 : 0.1;
          if (Math.random() >= p) continue;
          if (depth < 6) {
            const set = fields.bodySet[i];
            if (set) fields.bodyChar[i] = set[Math.floor(Math.random() * set.length)];
          } else if (fields.wallChar[i] !== " " && wallNext === null) {
            const set = "[]ABC:0123456789";
            fields.wallChar[i] = set[Math.floor(Math.random() * set.length)];
          }
        }
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (disposed || document.hidden) return;
      /* Growth target from the component's own position: 0 when its
         top is at the viewport's bottom edge, 1 once it has slid up
         through 95% of a viewport height. Smoothed toward target. */
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const gRaw = Math.min(1, Math.max(0, (vh - rect.top) / (vh * 0.95)));
      const dg = gRaw - growth;
      if (Math.abs(dg) > 0.0004) {
        growth += dg * 0.09;
        dirty = true;
      } else if (growth !== gRaw) {
        growth = gRaw;
        dirty = true;
      }
      publish();
      if (!visible && !dirty) return;
      if (now - lastTick >= 300) {
        lastTick = now;
        mutate();
        dirty = true;
      }
      if (wallNext === null && now >= nextTurnover && fields) {
        wallNext = buildFields(cols, rows, 3100 + Math.floor(now / 1000));
        flipAt = new Float32Array(cols * rows);
        for (let i = 0; i < flipAt.length; i++) {
          flipAt[i] = now + hash2(i % cols, Math.floor(i / cols), 5) * 1500;
        }
        nextTurnover = now + 10500 + Math.random() * 4000;
        dirty = true;
      }
      if (wallNext !== null && fields) {
        let done = true;
        for (let i = 0; i < flipAt.length; i++) {
          if (now < flipAt[i]) {
            done = false;
            break;
          }
        }
        if (done) {
          fields.wallChar = wallNext.wallChar;
          fields.wallAlpha = wallNext.wallAlpha;
          wallNext = null;
        }
        dirty = true;
      }
      /* A live dock flash forces redraws while it decays. */
      if (dockBus.flashes.size > 0) dirty = true;
      if (dirty) {
        draw(now);
        dirty = false;
      }
    };

    readColors();
    rebuild();
    publish();
    if (reduced) {
      draw(performance.now());
      stopTheme = observeTheme(() => {
        readColors();
        rebuild();
        publish();
        draw(performance.now());
      });
      resizeObs = new ResizeObserver(() => {
        rebuild();
        publish();
        draw(performance.now());
      });
      resizeObs.observe(wrap);
      return () => {
        disposed = true;
        dockBus.terrain.present = false;
        stopTheme?.();
        resizeObs?.disconnect();
      };
    }

    nextTurnover = performance.now() + 10500 + Math.random() * 4000;
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? false;
      },
      { threshold: 0 }
    );
    io.observe(wrap);
    stopTheme = observeTheme(() => {
      readColors();
      dirty = true;
    });
    resizeObs = new ResizeObserver(() => rebuild());
    resizeObs.observe(wrap);
    raf = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      dockBus.terrain.present = false;
      stopTheme?.();
      resizeObs?.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="ascii-terrain" aria-hidden="true">
      <canvas ref={canvasRef} className="ascii-terrain-canvas" style={{ height: HEIGHT }} />
    </div>
  );
}
