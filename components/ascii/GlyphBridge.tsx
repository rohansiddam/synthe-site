"use client";

import { useEffect, useRef } from "react";
import { observeTheme, prefersReducedMotion, readToken } from "./glBase";

/* Treatment 2: the glyph-field bridge.
 *
 * Where the page crosses from paper ground to the inverted band, there
 * is no drawn edge and no silhouette. The crossing is a living glyph
 * field, modelled on the reference band's measured behaviour: cells
 * mutate on a 1-2 second timescale and the whole composition turns
 * over every 10 to 15 seconds. Compositions are built from the
 * reference's own repertoire, in side-by-side zones: stepped terrain,
 * bracket-letter fields ([AAA], [AB:], [B:CC]), digit columns, and a
 * binary/arrow field.
 *
 * The ground inversion happens through the same cells: each cell's
 * ground is paper or charcoal, chosen by a dithered probability that
 * sweeps across a wandering boundary, so near the middle the two
 * grounds interleave cell-by-cell and no hard horizontal line exists
 * anywhere. Glyphs take the opposite ground's colour, so type is
 * legible on both sides of the crossing. Token-driven, so in the dark
 * theme the same strip bridges charcoal to paper instead.
 *
 * Canvas 2D: the ground layer is pre-rendered once per resize/theme;
 * frames only redraw glyphs, and only while the strip is on screen.
 * Reduced motion draws one static composition.
 */

const CELL = 13; // CSS px per cell (columns); rows divide HEIGHT evenly
const HEIGHT = 400; // CSS px strip height

type ZoneType = "terrain" | "brackets" | "digits" | "binary";
interface Zone {
  type: ZoneType;
  x0: number;
  x1: number;
}

/* Zone layouts, cycled on each turnover. */
const PRESETS: Zone[][] = [
  [
    { type: "terrain", x0: 0, x1: 0.38 },
    { type: "brackets", x0: 0.38, x1: 0.72 },
    { type: "digits", x0: 0.72, x1: 1 },
  ],
  [
    { type: "digits", x0: 0, x1: 0.3 },
    { type: "terrain", x0: 0.3, x1: 0.68 },
    { type: "binary", x0: 0.68, x1: 1 },
  ],
  [
    { type: "brackets", x0: 0, x1: 0.45 },
    { type: "binary", x0: 0.45, x1: 0.75 },
    { type: "digits", x0: 0.75, x1: 1 },
  ],
  [
    { type: "binary", x0: 0, x1: 0.33 },
    { type: "digits", x0: 0.33, x1: 0.62 },
    { type: "terrain", x0: 0.62, x1: 1 },
  ],
];

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

/* Smooth value noise over a coarse hash lattice, -1..1. */
function valueNoise(x: number, y: number, s: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf);
  const sy = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s);
  const b = hash2(xi + 1, yi, s);
  const c = hash2(xi, yi + 1, s);
  const d = hash2(xi + 1, yi + 1, s);
  return (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * 2 - 1;
}

interface Field {
  chars: string[];
  alpha: Float32Array;
  role: Uint8Array; // 1 = accent
  alphaSet: string[]; // per-cell mutation alphabet, "" = fixed
}

function buildField(cols: number, rows: number, presetIdx: number, seed: number): Field {
  const rand = mulberry(seed);
  const n = cols * rows;
  const chars = new Array<string>(n).fill(" ");
  const alpha = new Float32Array(n);
  const role = new Uint8Array(n);
  const alphaSet = new Array<string>(n).fill("");

  /* Zones with jittered interior boundaries. */
  const zones: Zone[] = PRESETS[presetIdx % PRESETS.length].map((z) => ({ ...z }));
  for (let i = 1; i < zones.length; i++) {
    const jitter = (rand() - 0.5) * 0.05;
    zones[i].x0 += jitter;
    zones[i - 1].x1 += jitter;
  }
  const zoneAt = (x: number): Zone => {
    const x01 = (x + 0.5) / cols;
    for (const z of zones) if (x01 >= z.x0 && x01 < z.x1) return z;
    return zones[zones.length - 1];
  };

  /* Per-zone precomputation. */
  const terrainH = new Map<Zone, Float32Array>();
  const digitCols = new Map<Zone, Map<number, string>>();
  const digitRun = new Map<Zone, { row: number; x: number; text: string }>();
  const blob = new Map<Zone, { cx: number; cy: number; rx: number; ry: number; diamond: boolean }>();
  for (const z of zones) {
    if (z.type === "terrain") {
      const h = new Float32Array(cols);
      let cur = rows * (0.3 + rand() * 0.2);
      for (let x = Math.floor(z.x0 * cols); x < Math.ceil(z.x1 * cols); x++) {
        if (rand() < 0.55) cur += (rand() - 0.5) * 5;
        cur = Math.min(rows * 0.78, Math.max(rows * 0.14, cur));
        h[x] = cur;
      }
      terrainH.set(z, h);
    } else if (z.type === "digits") {
      const colsMap = new Map<number, string>();
      const count = 4 + Math.floor(rand() * 3);
      const digits = "1379245680";
      for (let k = 0; k < count; k++) {
        const fx = z.x0 + ((k + 0.5) / count) * (z.x1 - z.x0) + (rand() - 0.5) * 0.02;
        colsMap.set(Math.round(fx * cols), digits[Math.floor(rand() * digits.length)]);
      }
      if (rand() < 0.25) {
        const cx = [...colsMap.keys()][Math.floor(rand() * colsMap.size)];
        colsMap.set(cx, "+");
      }
      digitCols.set(z, colsMap);
      if (rand() < 0.7) {
        digitRun.set(z, {
          row: 3 + Math.floor(rand() * (rows - 6)),
          x: Math.floor((z.x0 + rand() * (z.x1 - z.x0 - 0.08)) * cols),
          text: "76543210",
        });
      }
    } else if (z.type === "binary") {
      blob.set(z, {
        cx: (z.x0 + z.x1) / 2 + (rand() - 0.5) * 0.04,
        cy: 0.5 + (rand() - 0.5) * 0.15,
        rx: (z.x1 - z.x0) * (0.42 + rand() * 0.12),
        ry: 0.34 + rand() * 0.14,
        diamond: rand() < 0.5,
      });
    }
  }

  /* Bracket tokens, generated row by row across bracket zones. */
  const bracketChar = new Map<number, string>();
  {
    const letters = "ABCDEFG";
    for (let y = 1; y < rows - 1; y++) {
      const rowDensity = 0.3 + rand() * 0.35;
      let x = 0;
      while (x < cols) {
        const z = zoneAt(x);
        if (z.type !== "brackets") {
          x++;
          continue;
        }
        if (rand() < rowDensity) {
          const L = letters[Math.floor(rand() * letters.length)];
          const M = letters[Math.floor(rand() * letters.length)];
          const patterns = [
            [L, L, L],
            [L, M, ":"],
            [L, ":", M],
            [L, "+", M, M],
            [L, M, M],
          ];
          const body = patterns[Math.floor(rand() * patterns.length)];
          const token = ["[", ...body, "]"];
          token.forEach((ch, k) => {
            if (x + k < cols && zoneAt(x + k) === z) bracketChar.set(y * cols + x + k, ch);
          });
          x += token.length + 1 + Math.floor(rand() * 5);
        } else {
          x += 1 + Math.floor(rand() * 4);
        }
      }
    }
  }

  const pick = (s: string) => s[Math.floor(rand() * s.length)];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const z = zoneAt(x);
      if (z.type === "terrain") {
        const h = terrainH.get(z);
        const height = h ? h[x] : 0;
        const fromBottom = rows - 1 - y;
        if (fromBottom < height) {
          const depth = height - 1 - fromBottom;
          if (depth < 0.6) {
            chars[i] = pick("+#");
            alpha[i] = 0.95;
            role[i] = rand() < 0.45 ? 1 : 0;
            alphaSet[i] = "+#";
          } else if (depth < 2.2) {
            chars[i] = pick("#%*");
            alpha[i] = 0.8;
            alphaSet[i] = "#%*";
          } else {
            chars[i] = pick("%%@#*");
            alpha[i] = 0.62 + rand() * 0.3;
            alphaSet[i] = "%@#*";
          }
        } else if (rand() < 0.05) {
          chars[i] = ".";
          alpha[i] = 0.16;
        }
      } else if (z.type === "digits") {
        const colsMap = digitCols.get(z);
        const run = digitRun.get(z);
        const d = colsMap?.get(x);
        if (run && y === run.row && x >= run.x && x < run.x + run.text.length) {
          chars[i] = run.text[x - run.x];
          alpha[i] = 0.9;
          alphaSet[i] = "0123456789";
        } else if (d !== undefined && y >= 1 && y <= rows - 2) {
          chars[i] = d;
          alpha[i] = 0.88;
          role[i] = y === 1 && rand() < 0.3 ? 1 : 0;
          alphaSet[i] = d.repeat(6) + "0123456789";
        } else if (rand() < 0.04) {
          chars[i] = ".";
          alpha[i] = 0.15;
        }
      } else if (z.type === "brackets") {
        const bc = bracketChar.get(i);
        if (bc !== undefined) {
          chars[i] = bc;
          alpha[i] = 0.55 + rand() * 0.4;
          alphaSet[i] = "ABCDEFG:+";
        } else if (rand() < 0.03) {
          chars[i] = ".";
          alpha[i] = 0.14;
        } else if (rand() < 0.012) {
          chars[i] = pick("ABCDEFG");
          alpha[i] = 0.4;
          alphaSet[i] = "ABCDEFG";
        }
      } else {
        /* binary / arrow field */
        const b = blob.get(z);
        if (y === 1) {
          chars[i] = "→";
          alpha[i] = 0.6;
        } else if (y === rows - 2) {
          chars[i] = "←";
          alpha[i] = 0.6;
        } else if (b) {
          const dx = (x + 0.5) / cols - b.cx;
          const dy = (y + 0.5) / rows - b.cy;
          const dist = b.diamond
            ? Math.abs(dx) / b.rx + Math.abs(dy) / b.ry
            : Math.sqrt((dx / b.rx) ** 2 + (dy / b.ry) ** 2);
          if (dist < 1) {
            chars[i] = pick("0011AI+");
            alpha[i] = 0.35 + 0.55 * (1 - dist) + rand() * 0.1;
            role[i] = dist < 0.3 && rand() < 0.06 ? 1 : 0;
            alphaSet[i] = "01AI+";
          } else if (rand() < 0.05) {
            chars[i] = ".";
            alpha[i] = 0.15;
          }
        }
      }
    }
  }
  return { chars, alpha, role, alphaSet };
}

export function GlyphBridge() {
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
    let groundCanvas: HTMLCanvasElement | null = null;
    let groundBottom = new Uint8Array(0);
    let cur: Field | null = null;
    let nxt: Field | null = null;
    let flipAt = new Float32Array(0);
    let compIndex = 0;
    let lastTick = 0;
    let nextTurnover = Number.POSITIVE_INFINITY;
    let dirty = true;
    let stopTheme: (() => void) | null = null;
    let resizeObs: ResizeObserver | null = null;

    let groundTop = "#faf8f1";
    let groundBottomColor = "#171410";
    let glyphOnTop = "#171410";
    let glyphOnBottom = "#faf8f1";
    let accentColor = "#b5412f";

    const readColors = () => {
      groundTop = readToken("--bg", groundTop);
      groundBottomColor = readToken("--ink", groundBottomColor);
      glyphOnTop = readToken("--ink", glyphOnTop);
      glyphOnBottom = readToken("--bg", glyphOnBottom);
      accentColor = readToken("--accent", accentColor);
    };

    /* The ground layer: paper above, charcoal below, interleaved at
       the cell level around a wandering boundary. Drawn once per
       resize/theme into an offscreen canvas. */
    const buildGround = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = wrap.clientWidth;
      groundCanvas = document.createElement("canvas");
      groundCanvas.width = Math.round(w * dpr);
      groundCanvas.height = Math.round(HEIGHT * dpr);
      const g = groundCanvas.getContext("2d");
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      groundBottom = new Uint8Array(cols * rows);
      const rand = mulberry(1234);
      const ctrl: number[] = [];
      const nCtrl = Math.ceil(cols / 6) + 2;
      for (let k = 0; k < nCtrl; k++) ctrl.push((rand() * 2 - 1) * 2.6);
      const ZH = 3.0; // interleave half-height, rows
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const pos = x / 6;
          const ci = Math.min(nCtrl - 2, Math.floor(pos));
          const cf = pos - ci;
          const wander = ctrl[ci] + (ctrl[ci + 1] - ctrl[ci]) * cf;
          const boundary = rows * 0.52 + wander;
          let t = (y - (boundary - ZH)) / (2 * ZH);
          t = Math.min(1, Math.max(0, t));
          /* Patch noise, but its pull decays with distance from the
             boundary: far above and below, the grounds are pure; only
             near the crossing do blobs of one ground push into the
             other, so the dissolve lives at the divide, not all over. */
          const prox = Math.exp(-Math.pow((y - boundary) / (ZH * 1.7), 2));
          t = Math.min(1, Math.max(0, t + valueNoise(x / 5, y / 5, 9) * 0.3 * prox));
          const p = Math.pow(t, 1.15);
          const bottom = hash2(x, y, 77) < p ? 1 : 0;
          groundBottom[y * cols + x] = bottom;
          g.fillStyle = bottom ? groundBottomColor : groundTop;
          g.fillRect(x * cellW, y * cellH, cellW + 0.6, cellH + 0.6);
        }
      }
    };

    const draw = (now: number) => {
      if (!cur || !groundCanvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = wrap.clientWidth;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(HEIGHT * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(HEIGHT * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, HEIGHT);
      ctx.drawImage(groundCanvas, 0, 0, w, HEIGHT);
      ctx.font = '500 12px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const turning = nxt !== null;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const src = turning && now >= flipAt[i] ? (nxt as Field) : cur;
          const ch = src.chars[i];
          if (ch === " ") continue;
          ctx.fillStyle = src.role[i]
            ? accentColor
            : groundBottom[i]
              ? glyphOnBottom
              : glyphOnTop;
          ctx.globalAlpha = src.alpha[i];
          ctx.fillText(ch, (x + 0.5) * cellW, (y + 0.5) * cellH + 0.5);
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
      buildGround();
      compIndex = 0;
      cur = buildField(cols, rows, 0, 1000);
      nxt = null;
      dirty = true;
    };

    const mutate = () => {
      const apply = (f: Field | null) => {
        if (!f) return;
        for (let i = 0; i < f.chars.length; i++) {
          const set = f.alphaSet[i];
          if (set && Math.random() < 0.05) {
            f.chars[i] = set[Math.floor(Math.random() * set.length)];
          }
        }
      };
      apply(cur);
      apply(nxt);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (disposed || document.hidden || !visible) return;
      if (now - lastTick >= 320) {
        lastTick = now;
        mutate();
        dirty = true;
      }
      if (nxt === null && now >= nextTurnover) {
        compIndex += 1;
        nxt = buildField(cols, rows, compIndex % PRESETS.length, 1000 + compIndex * 131);
        flipAt = new Float32Array(cols * rows);
        for (let i = 0; i < flipAt.length; i++) flipAt[i] = now + hash2(i % cols, Math.floor(i / cols), 5) * 1500;
        nextTurnover = now + 10500 + Math.random() * 4000;
        dirty = true;
      }
      if (nxt !== null) {
        let done = true;
        for (let i = 0; i < flipAt.length; i++) {
          if (now < flipAt[i]) {
            done = false;
            break;
          }
        }
        if (done) {
          cur = nxt;
          nxt = null;
        }
        dirty = true;
      }
      if (dirty) {
        draw(now);
        dirty = false;
      }
    };

    readColors();
    rebuild();
    if (reduced) {
      draw(performance.now());
      stopTheme = observeTheme(() => {
        readColors();
        rebuild();
        draw(performance.now());
      });
      resizeObs = new ResizeObserver(() => {
        rebuild();
        draw(performance.now());
      });
      resizeObs.observe(wrap);
      return () => {
        disposed = true;
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
      buildGround();
      dirty = true;
    });
    resizeObs = new ResizeObserver(() => rebuild());
    resizeObs.observe(wrap);
    raf = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      stopTheme?.();
      resizeObs?.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="ascii-bridge" aria-hidden="true">
      <canvas ref={canvasRef} className="ascii-bridge-canvas" style={{ height: HEIGHT }} />
    </div>
  );
}
