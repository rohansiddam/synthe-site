"use client";

import { useEffect, useRef } from "react";
import { demoRun, dogfoodRun } from "../../lib/runData";
import { observeTheme, prefersReducedMotion, readToken } from "./glBase";

/* Treatment 4: the word field (after the reference teardown).
 *
 * Rows of tiny mono fragments, all of them Synthe's own words: clauses
 * from the demo run's four recorded checks, the console's verdict
 * vocabulary, round and score labels from the dogfood run, the merged
 * changes' titles. Their brightness forms a large stable shape: the
 * climb. Fragments on the climb's line glow at full strength (accent
 * at the crest), the field under the curve stays at a middle level,
 * and the field above it is barely there. The shape does not move;
 * life comes from a slow crest pulse travelling the line and from
 * phrases quietly swapping for same-length phrases every few seconds,
 * each swap dipping through a fade so nothing snaps.
 *
 * Canvas 2D: a few hundred fillText calls, redrawn only while the
 * section is on screen. Reduced motion draws one static field.
 */

/* Verbatim clauses from the four checks in demoRun.checks
   (synthe.json on the demo repo's main, via lib/runData.ts). */
const CHECK_FRAGMENTS = [
  "never says the refund is already approved",
  "explains the return policy that applies",
  "offers an exchange or store credit",
  "free return shipping, or the 10% store credit bonus",
  "never states a delivery date, tracking number or order status",
  "gives the policy's shipping times",
  "points them to their tracking",
  "sends the customer to the right place",
];

const PHRASES: string[] = [
  ...CHECK_FRAGMENTS,
  "KEPT",
  "NOT KEPT",
  "NO WINNER",
  "MERGED",
  "FAILED",
  demoRun.pullRequest.title.toUpperCase(),
  dogfoodRun.mergedChange.toUpperCase(),
  "YOUR CHECKS PASSED 89% OF THE TIME, UP FROM 72%",
  "HELD-OUT SCORE 50% TO 80%",
  "$0.32 OF A $3 BUDGET",
  "PR #8",
  "3 ROUNDS IN A ROW FOUND NO WINNER",
  ...dogfoodRun.series.map((p) => `ROUND ${p.round} · ${p.scorePct}%`),
];

const FONT = '500 12.5px "IBM Plex Mono", ui-monospace, monospace';
const ROW_H = 25;

function hash1(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

interface Frag {
  x: number;
  y: number;
  text: string;
  bright: number;
  glow: number;
  seed: number;
  swapStart: number; // ms timestamp, 0 = not swapping
  nextText: string | null;
}

export function WordField() {
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

    let frags: Frag[] = [];
    let raf = 0;
    let visible = false;
    let lastTick = 0;
    let inkColor = "#171410";
    let accentColor = "#b5412f";
    let stopTheme: (() => void) | null = null;
    let resizeObs: ResizeObserver | null = null;

    const series = dogfoodRun.series;

    /* The climb as a smooth polyline over the section, in px.
       x01 is clamped: fragments bleed off both edges by design. */
    const climbY = (x01: number, h: number): number => {
      const pos = Math.min(series.length - 1, Math.max(0, x01 * (series.length - 1)));
      const i = Math.min(series.length - 2, Math.floor(pos));
      const f = pos - i;
      const score = series[i].scorePct + (series[i + 1].scorePct - series[i].scorePct) * f;
      return h * 0.08 + (1 - score / 100) * h * 0.8;
    };

    const build = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      frags = [];
      ctx.font = FONT;
      let row = 0;
      for (let y = 20; y < h - 6; y += ROW_H, row++) {
        let x = -hash1(row * 7.3) * 60;
        let k = 0;
        while (x < w) {
          const text = PHRASES[Math.floor(hash1(row * 131.7 + k * 17.31) * PHRASES.length) % PHRASES.length];
          const width = ctx.measureText(text).width;
          const cx = x + width / 2;
          const cy = climbY(cx / w, h);
          const dLine = Math.abs(y - cy) / h;
          const glow = Math.exp(-Math.pow(dLine / 0.065, 2));
          const under = y > cy ? Math.max(0, 1 - (y - cy) / (h * 0.52)) * 0.22 : 0.02;
          const bright = Math.min(1, Math.max(0.02, under + glow + (hash1(row * 3.1 + k * 9.7) - 0.5) * 0.05));
          frags.push({ x, y, text, bright, glow, seed: row * 1000 + k, swapStart: 0, nextText: null });
          x += width + 16 + hash1(row * 5.9 + k * 3.3) * 26;
          k++;
        }
      }
    };

    const draw = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.font = FONT;
      ctx.textBaseline = "middle";

      /* A slow pulse travelling the climb's crest. */
      const crestX = reduced ? 0.38 : ((now * 0.000016) % 1.3) - 0.15;

      for (const f of frags) {
        let fade = 1;
        if (f.swapStart > 0) {
          const t = (now - f.swapStart) / 550;
          if (t >= 1) {
            if (f.nextText) f.text = f.nextText;
            f.nextText = null;
            f.swapStart = 0;
          } else {
            fade = t < 0.5 ? 1 - t * 1.5 : 0.25 + (t - 0.5) * 1.5;
          }
        }
        const x01 = f.x / w;
        const crest = Math.exp(-Math.pow((x01 - crestX) / 0.07, 2)) * f.glow * 0.45;
        const alpha = Math.min(1, (0.05 + f.bright * 0.85 + crest) * fade);
        ctx.fillStyle = f.glow > 0.5 ? accentColor : inkColor;
        ctx.globalAlpha = alpha;
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
    };

    const scheduleSwaps = (now: number) => {
      if (now - lastTick < 2600) return;
      lastTick = now;
      for (const f of frags) {
        if (f.swapStart === 0 && hash1(f.seed * 1.7 + now * 0.0001) < 0.06) {
          for (let tries = 0; tries < 6; tries++) {
            const cand = PHRASES[Math.floor(hash1(f.seed * 3.9 + now * 0.001 + tries * 7.7) * PHRASES.length)];
            if (cand !== f.text && Math.abs(cand.length - f.text.length) <= f.text.length * 0.35 + 4) {
              f.nextText = cand;
              f.swapStart = now + hash1(f.seed * 8.3) * 350;
              break;
            }
          }
        }
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (disposed || document.hidden || !visible) return;
      scheduleSwaps(now);
      draw(now);
    };

    const readColors = () => {
      inkColor = readToken("--ink", inkColor);
      accentColor = readToken("--accent", accentColor);
      if (reduced) draw(performance.now());
    };

    readColors();
    build();
    if (reduced) {
      draw(performance.now());
    } else {
      lastTick = performance.now();
      const io = new IntersectionObserver(
        (entries) => {
          visible = entries[0]?.isIntersecting ?? false;
        },
        { threshold: 0 }
      );
      io.observe(wrap);
      raf = requestAnimationFrame(loop);
      resizeObs = new ResizeObserver(() => {
        build();
      });
      resizeObs.observe(wrap);
      stopTheme = observeTheme(readColors);
      return () => {
        disposed = true;
        cancelAnimationFrame(raf);
        io.disconnect();
        resizeObs?.disconnect();
        stopTheme?.();
      };
    }
    resizeObs = new ResizeObserver(() => {
      build();
      draw(performance.now());
    });
    resizeObs.observe(wrap);
    stopTheme = observeTheme(readColors);
    return () => {
      disposed = true;
      resizeObs?.disconnect();
      stopTheme?.();
    };
  }, []);

  return (
    <div ref={wrapRef} className="ascii-words-field" aria-hidden="true">
      <canvas ref={canvasRef} className="ascii-words-canvas" />
    </div>
  );
}
