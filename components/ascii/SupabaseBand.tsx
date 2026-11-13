"use client";

import { useEffect, useRef } from "react";
import { observeTheme, prefersReducedMotion, readToken } from "./glBase";

/* Treatment 2: the band.
 *
 * Across three versions this lane translated the Supabase Select
 * band's properties (cadence, repertoire, terrain) into other
 * treatments but never built the band itself. This is the band
 * itself, built to the two teardowns' measurements of the live
 * reference:
 *
 *  - A full-width strip (~340 px) of side-by-side panels. Each panel
 *    renders an evolving field in its OWN glyph alphabet and scene,
 *    drawn from the measured repertoire: a hex-string field with a
 *    dark diamond, a flow field of arrows turning through a closed
 *    loop, a stepped terrain with one bright peak, A-G value letters
 *    graded by value, bracket labels with digit columns, and a
 *    binary blob field with arrow border rows.
 *  - Two timescales, as measured: FAST cell mutation inside each
 *    panel (about 5% of cells re-roll per 130 ms tick, so a visible
 *    fraction of the band changes every second), and SLOW scene
 *    turnover (each panel morphs to a different scene on its own
 *    60 to 200 second clock, a 6 second per-cell dissolve, never a
 *    cut). Panels run staggered periods and phases, so the band is
 *    never all changing at once and never all still.
 *  - Colours: the band is a dark strip in BOTH themes (the
 *    reference keeps its band dark in dark mode too, and the
 *    founder's reference video is a dark strip). v4 read the
 *    ground/glyph pair from the flipping --ink/--bg tokens, which
 *    inverted the strip to a cream slab on the dark page; the pair
 *    is now pinned to the site's charcoal/paper values, and only
 *    the accent follows the theme (brightest peak, top value
 *    grade, sparse sparks in the hex field).
 *
 * The page carries two instances: one under the hero, one near the
 * footer, at a different seed and phase, mirroring the reference's
 * hero band + footer band structure.
 *
 * Canvas 2D. The turnover clock only advances while the band is on
 * screen. Reduced motion draws one static frame.
 */

const CELL = 12; // CSS px per cell
const HEIGHT = 336; // CSS px component height

/* Mutation alphabets. `drift` sets re-roll to a neighbouring glyph
   (arrow directions step around the compass, value letters step one
   grade) so a scene's structure survives its own mutation; the rest
   re-roll freely inside their alphabet. */
const SETS: { chars: string; drift: boolean }[] = [
  { chars: "0123456789ABCDEF", drift: false }, // 0 hex
  { chars: "→↘↓↙←↖↑↗", drift: true }, // 1 arrows
  { chars: "#%@*+=", drift: false }, // 2 dense
  { chars: "ABCDEFG", drift: true }, // 3 values
  { chars: "ABCDEFG:+", drift: false }, // 4 labels
  { chars: "0123456789", drift: false }, // 5 digits
  { chars: "01AI+", drift: false }, // 6 binary
];
const S_HEX = 0;
const S_ARROWS = 1;
const S_DENSE = 2;
const S_VALUES = 3;
const S_LABEL = 4;
const S_DIGITS = 5;
const S_BINARY = 6;

type SceneName = "hex" | "flow" | "terrain" | "values" | "brackets" | "binary";
const SCENE_POOL: SceneName[] = ["hex", "flow", "terrain", "values", "brackets", "binary"];

const ROLE_ALPHA = [0, 0.5, 0.8, 1, 1];

interface Grid {
  ch: string[];
  alpha: Float32Array;
  role: Uint8Array; // 0 blank, 1 dim, 2 mid, 3 bright, 4 accent
  set: Uint8Array;
}

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

function blankGrid(cols: number, rows: number): Grid {
  const n = cols * rows;
  return {
    ch: new Array<string>(n).fill(" "),
    alpha: new Float32Array(n),
    role: new Uint8Array(n),
    set: new Uint8Array(n),
  };
}

function put(
  g: Grid,
  cols: number,
  x: number,
  y: number,
  ch: string,
  alpha: number,
  role: number,
  set: number
) {
  const i = y * cols + x;
  g.ch[i] = ch;
  g.alpha[i] = alpha;
  g.role[i] = role;
  g.set[i] = set;
}

/* One scene of the repertoire, rendered into a fresh grid at panel
   resolution. Every builder fills structure (masks, profiles,
   fields) plus per-cell alphabets, so the mutation tick can re-roll
   glyphs forever without eroding the scene's shape. */
function buildScene(name: SceneName, cols: number, rows: number, seed: number): Grid {
  const rand = mulberry(seed);
  const g = blankGrid(cols, rows);
  const pick = (s: string) => s[Math.floor(rand() * s.length)];

  if (name === "hex") {
    /* Rows of hex-string text (the reference's "0C+2FE2AD43+..."
       texture) with a dark diamond punched out of the middle. */
    const cx = cols / 2;
    const cy = rows / 2;
    const rad = Math.min(cols, rows) * 0.34;
    for (let y = 0; y < rows; y++) {
      let line = "";
      while (line.length < cols + 8) {
        const len = 6 + Math.floor(rand() * 10);
        for (let k = 0; k < len; k++) line += pick("0123456789ABCDEF");
        line += rand() < 0.4 ? "+" : " ";
      }
      const off = Math.floor(rand() * 8);
      for (let x = 0; x < cols; x++) {
        if (Math.abs(x - cx) + Math.abs(y - cy) < rad) continue; // the diamond
        const ch = line[x + off] || " ";
        if (ch === " ") continue;
        const spark = rand() < 0.02;
        put(g, cols, x, y, ch, 0.5 + rand() * 0.45, spark ? 4 : ch === "+" ? 3 : 2, S_HEX);
      }
    }
  } else if (name === "flow") {
    /* Arrows following a tangent flow around a centre: they turn in
       90-degree steps and close a loop, brightest on the ring. */
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    const ring = rows * 0.40;
    const arrows = SETS[S_ARROWS].chars;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const dx = x - cx;
        const dy = (y - cy) * (cols / rows) * 0.55;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < rows * 0.13) continue; // hollow centre
        const ang = Math.atan2(dy, dx) + Math.PI / 2 + 0.4 * Math.sin(x * 0.33 + y * 0.21);
        const step = Math.round(ang / (Math.PI / 4)) % 8;
        const ch = arrows[(step + 8) % 8];
        const a = 0.22 + 0.78 * Math.exp(-((dist - ring) * (dist - ring)) / (2 * ring * ring * 0.55));
        put(g, cols, x, y, ch, Math.min(1, a), a > 0.8 ? 3 : a > 0.5 ? 2 : 1, S_ARROWS);
      }
    }
  } else if (name === "terrain") {
    /* A stepped skyline: random-walk column heights, dense fill,
       one bright peak in the accent. */
    const heights: number[] = [];
    let h = rows * (0.35 + rand() * 0.3);
    for (let x = 0; x < cols; x++) {
      h += (rand() - 0.5) * rows * 0.22;
      h = Math.min(rows * 0.96, Math.max(rows * 0.18, h));
      heights.push(h);
    }
    let peakX = 0;
    for (let x = 0; x < cols; x++) if (heights[x] > heights[peakX]) peakX = x;
    for (let x = 0; x < cols; x++) {
      const top = rows - Math.round(heights[x]);
      for (let y = 0; y < rows; y++) {
        if (y < top) {
          if (rand() < 0.03) put(g, cols, x, y, ".", 0.3, 1, S_DENSE);
          continue;
        }
        const depth = y - top;
        if (depth === 0) {
          const isPeak = x === peakX;
          put(g, cols, x, y, isPeak ? "@" : pick(SETS[S_DENSE].chars), 1, isPeak ? 4 : 3, S_DENSE);
        } else {
          const a = Math.max(0.4, 0.92 - depth * 0.06);
          put(g, cols, x, y, pick(SETS[S_DENSE].chars), a, depth < 3 ? 2 : 1, S_DENSE);
        }
      }
    }
  } else if (name === "values") {
    /* A-G letters graded by a value field: brightness and letter
       both rise toward the hot spot; the top grade runs accent. */
    const cx = cols * (0.3 + rand() * 0.4);
    const cy = rows * (0.3 + rand() * 0.4);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy) * 2.2);
        let v = 1.18 - d / (rows * 0.92) + 0.16 * Math.sin(x * 0.23) * Math.cos(y * 0.31) + (rand() - 0.5) * 0.1;
        v = Math.min(1, Math.max(0.02, v));
        const grade = Math.min(6, Math.floor(v * 7));
        const accent = grade === 6 && rand() < 0.45;
        put(
          g, cols, x, y,
          SETS[S_VALUES].chars[grade],
          0.16 + 0.84 * v,
          accent ? 4 : grade >= 5 ? 3 : grade >= 3 ? 2 : 1,
          S_VALUES
        );
      }
    }
  } else if (name === "brackets") {
    /* Bracket labels on a lattice ([A:B], [BC:C] in the reference)
       interleaved with digit columns, some of them descending runs. */
    const digitCol = new Array<boolean>(cols).fill(false);
    const colDigit = new Array<number>(cols).fill(0);
    const colDesc = new Array<boolean>(cols).fill(false);
    for (let x = 0; x < cols; x++) {
      if (rand() < 0.3) {
        digitCol[x] = true;
        colDigit[x] = Math.floor(rand() * 10);
        colDesc[x] = rand() < 0.4;
      }
    }
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (digitCol[x]) {
          const d = colDesc[x]
            ? (((colDigit[x] - y) % 10) + 10) % 10
            : colDigit[x];
          put(g, cols, x, y, String(d), 0.45 + rand() * 0.3, 1, S_DIGITS);
        } else if (rand() < 0.035) {
          put(g, cols, x, y, ".", 0.3, 1, S_DIGITS);
        }
      }
    }
    for (let ly = 1; ly + 1 < rows; ly += 3) {
      for (let lx = 1; lx + 5 < cols; lx += 7) {
        if (rand() < 0.18) continue;
        const token =
          "[" +
          pick("ABCDEFG") +
          (rand() < 0.5 ? ":" : "+") +
          pick("ABCDEFG") +
          (rand() < 0.3 ? pick("ABCDEFG") : "") +
          "]";
        for (let k = 0; k < token.length && lx + k < cols; k++) {
          put(g, cols, lx + k, ly, token[k], 0.85, 2, S_LABEL);
        }
      }
    }
  } else {
    /* binary: a blob of 0/1/A/I/+ graded from its centre, framed by
       the reference's arrow border rows (top ->, bottom <-). */
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (y === 0) {
          put(g, cols, x, y, "→", 0.7, 2, S_ARROWS);
          continue;
        }
        if (y === rows - 1) {
          put(g, cols, x, y, "←", 0.7, 2, S_ARROWS);
          continue;
        }
        const dx = (x - cx) / (cols * 0.36);
        const dy = (y - cy) / (rows * 0.42);
        const q = dx * dx + dy * dy;
        if (q < 1) {
          const a = 0.95 * (1 - q * 0.75) + (rand() - 0.5) * 0.1;
          put(g, cols, x, y, pick(SETS[S_BINARY].chars), Math.min(1, Math.max(0.3, a)), a > 0.8 ? 3 : 2, S_BINARY);
        } else if (rand() < 0.03) {
          put(g, cols, x, y, ".", 0.3, 1, S_BINARY);
        }
      }
    }
  }
  return g;
}

/* Re-roll one cell inside its own scene: structure (role, alphabet)
   is kept, only the glyph changes. Drift alphabets step to a
   neighbour so flows and grades stay coherent while they move. */
function reroll(g: Grid, i: number, rand: () => number) {
  if (g.role[i] === 0) return;
  const set = SETS[g.set[i]];
  const chars = set.chars;
  const cur = chars.indexOf(g.ch[i]);
  if (set.drift && cur >= 0) {
    const next = (cur + (rand() < 0.5 ? 1 : chars.length - 1)) % chars.length;
    g.ch[i] = chars[next];
  } else {
    g.ch[i] = chars[Math.floor(rand() * chars.length)];
  }
}

interface Panel {
  x0: number;
  cols: number;
  a: Grid;
  b: Grid | null;
  dissolveT: number; // -1 idle, else 0..1
  flipAt: number; // band-clock ms of the next turnover
  period: number;
  sceneIdx: number; // index into SCENE_POOL of grid a's scene
  seq: number;
}

const PANEL_PROPS = [0.2, 0.24, 0.16, 0.2, 0.2];
const DISSOLVE_MS = 6000;
const TICK_MS = 130;

export function SupabaseBand({ variant = 0 }: { variant?: number }) {
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
    const rand = mulberry(7700 + variant * 104729);

    let raf = 0;
    let visible = false;
    let cols = 0;
    const rows = Math.round(HEIGHT / CELL);
    let cellW = CELL;
    let cellH = CELL;
    let panels: Panel[] = [];
    let clock = 0; // ms, advances only while visible
    let lastFrame = performance.now();
    let lastTick = 0;
    let dirty = true;
    let stopTheme: (() => void) | null = null;
    let resizeObs: ResizeObserver | null = null;

    /* Pinned strip palette: near-black ground, luminous glyphs,
       regardless of site theme. Only the accent is theme-read. */
    const groundColor = "#171410";
    const glyphColor = "#faf8f1";
    let accentColor = "#b5412f";
    const readColors = () => {
      accentColor = readToken("--accent", accentColor);
    };

    const buildPanels = () => {
      const w = wrap.clientWidth;
      cols = Math.max(10, Math.floor(w / CELL));
      cellW = w / cols;
      cellH = HEIGHT / rows;
      /* Narrow frames get three wider panels instead of five. */
      const props = cols >= 60 ? PANEL_PROPS : [0.34, 0.33, 0.33];
      panels = [];
      let x = 0;
      for (let i = 0; i < props.length; i++) {
        const pc =
          i === props.length - 1
            ? Math.max(4, cols - x)
            : Math.max(8, Math.round(cols * props[i]));
        const sceneIdx = (i + variant * 2) % SCENE_POOL.length;
        panels.push({
          x0: x,
          cols: pc,
          a: buildScene(SCENE_POOL[sceneIdx], pc, rows, 5000 + variant * 977 + i * 131),
          b: null,
          dissolveT: -1,
          /* Staggered first flips (14 s, 30 s, 46 s, ... plus the
             variant's offset) so a 45 s look always catches panels
             mid-dissolve; steady-state periods run 62 to 190 s. */
          flipAt: 14000 + i * 16000 + variant * 9000,
          period: 62000 + i * 21000 + variant * 17000,
          sceneIdx,
          seq: 0,
        });
        x += pc + 1; // one divider column between panels
      }
      dirty = true;
    };

    const drawPanel = (p: Panel) => {
      const dissolving = p.b !== null && p.dissolveT >= 0;
      const e = p.dissolveT < 0 ? 0 : p.dissolveT * p.dissolveT * (3 - 2 * p.dissolveT);
      for (let y = 0; y < rows; y++) {
        for (let lx = 0; lx < p.cols; lx++) {
          const i = y * p.cols + lx;
          let src = p.a;
          if (dissolving && hash2(p.x0 + lx, y, 991) < e) src = p.b as Grid;
          const role = src.role[i];
          if (role === 0) continue;
          ctx.fillStyle = role === 4 ? accentColor : glyphColor;
          ctx.globalAlpha = src.alpha[i] * ROLE_ALPHA[role];
          ctx.fillText(src.ch[i], (p.x0 + lx + 0.5) * cellW, (y + 0.5) * cellH + 0.5);
        }
      }
    };

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = wrap.clientWidth;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(HEIGHT * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(HEIGHT * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = groundColor;
      ctx.fillRect(0, 0, w, HEIGHT);
      ctx.font = `500 ${CELL - 1}px "IBM Plex Mono", ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const p of panels) drawPanel(p);
      /* Divider columns: a sparse dotted seam between panels. */
      ctx.fillStyle = glyphColor;
      for (let i = 0; i < panels.length - 1; i++) {
        const dx = panels[i].x0 + panels[i].cols;
        for (let y = 2; y < rows; y += 4) {
          ctx.globalAlpha = 0.22;
          ctx.fillText(".", (dx + 0.5) * cellW, (y + 0.5) * cellH + 0.5);
        }
      }
      ctx.globalAlpha = 1;
    };

    const mutate = () => {
      for (const p of panels) {
        const n = p.cols * rows;
        const hits = Math.ceil(n * 0.05);
        for (let k = 0; k < hits; k++) {
          reroll(p.a, Math.floor(rand() * n), rand);
        }
        if (p.b) {
          const hitsB = Math.ceil(n * 0.025);
          for (let k = 0; k < hitsB; k++) {
            reroll(p.b, Math.floor(rand() * n), rand);
          }
        }
      }
    };

    const advanceScenes = (dtMs: number) => {
      for (let i = 0; i < panels.length; i++) {
        const p = panels[i];
        if (p.b === null && clock >= p.flipAt) {
          p.seq += 1;
          const nextIdx =
            (p.sceneIdx + 2 + Math.floor(rand() * 3)) % SCENE_POOL.length;
          p.b = buildScene(
            SCENE_POOL[nextIdx],
            p.cols,
            rows,
            5000 + variant * 977 + i * 131 + p.seq * 7919
          );
          p.sceneIdx = nextIdx;
          p.dissolveT = 0;
        }
        if (p.b !== null && p.dissolveT >= 0) {
          p.dissolveT += dtMs / DISSOLVE_MS;
          if (p.dissolveT >= 1) {
            p.a = p.b;
            p.b = null;
            p.dissolveT = -1;
            p.flipAt = clock + p.period * (0.85 + rand() * 0.3);
          }
          dirty = true;
        }
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (disposed || document.hidden || !visible) {
        lastFrame = now;
        return;
      }
      /* Real elapsed time, clamped only against the stale-frame
         jump when a hidden tab wakes (rAF stops while hidden, so
         the first frame back would otherwise leap). The clock must
         track wall time even on slow frames: the turnover schedule
         is specified in seconds, not frames. */
      const dt = Math.min(1000, now - lastFrame);
      lastFrame = now;
      clock += dt;
      advanceScenes(dt);
      if (clock - lastTick >= TICK_MS) {
        lastTick = clock;
        mutate();
        dirty = true;
      }
      if (dirty) {
        draw();
        dirty = false;
      }
    };

    readColors();
    buildPanels();
    if (reduced) {
      draw();
      stopTheme = observeTheme(() => {
        readColors();
        draw();
      });
      resizeObs = new ResizeObserver(() => {
        buildPanels();
        draw();
      });
      resizeObs.observe(wrap);
      return () => {
        disposed = true;
        stopTheme?.();
        resizeObs?.disconnect();
      };
    }

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
    resizeObs = new ResizeObserver(() => buildPanels());
    resizeObs.observe(wrap);
    lastFrame = performance.now();
    raf = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      stopTheme?.();
      resizeObs?.disconnect();
    };
  }, [variant]);

  return (
    <div ref={wrapRef} className="ascii-bandstrip" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="ascii-bandstrip-canvas"
        style={{ height: HEIGHT }}
      />
    </div>
  );
}
