"use client";

import { useRef } from "react";
import { useMotionValue } from "framer-motion";
import { dogfoodRun } from "@/lib/runData";
import { ScoreCard } from "@/components/console/ScoreCard";
import { DRAW_UNITS as PROD_DRAW_UNITS } from "@/components/console/timeline";
import {
  DRAW_UNITS,
  MERGE_INDEX,
  PAD,
  POINTS,
  VB_H,
  VB_W,
  bayer,
  clamp01,
  climbEase,
  easeInOut,
  fmtScore,
  headAt,
  seriesAt,
  vbY,
} from "./ditherKit";
import { useCanvasStage, type StageFrame } from "./useCanvasStage";

/* Treatment 01: the dithered climb.
   The dogfood run's recorded held-out series (11 measured points,
   rounds 4 to 14) drawn as halftone instead of a line. Two lattices
   fill the area under the curve: a coarse one (6-unit cells) that
   survives almost anywhere, and a fine one (3-unit cells) gated by a
   Bayer threshold on the local score. Where the prompt struggled
   (rounds 4 to 7, 16.7% to 21.7%) the fine lattice mostly fails the
   threshold, so the texture reads coarse and sparse; where the merged
   prompt landed (round 8 on, 95.7% to 100%) it passes nearly
   everywhere, fine and dense. The line itself is dots whose radius
   carries the score. The draw is the production one: the same
   continuous interpolation along the recorded segments, the same
   1100ms + 2300ms climb on the console's ease, then a rest beat and
   an eased reset, pausing off-screen.
   Perf: the field and the ghost are pre-rendered to offscreen
   canvases once per size/theme; a live frame is two drawImages (one
   clipped to the head) plus ~230 line dots. */

const DRAW_AT = 1100;
const DRAW_MS = 2300;
const HOLD_END = 7400;
const CYCLE_MS = 8200;

function drawValueAt(t: number, mode: "anim" | "final"): number {
  if (mode === "final") return DRAW_UNITS;
  const c = t % CYCLE_MS;
  if (c < DRAW_AT) return 0;
  if (c < DRAW_AT + DRAW_MS) return climbEase((c - DRAW_AT) / DRAW_MS) * DRAW_UNITS;
  if (c < HOLD_END) return DRAW_UNITS;
  return DRAW_UNITS * (1 - easeInOut((c - HOLD_END) / (CYCLE_MS - HOLD_END)));
}

interface ClimbCache {
  epoch: number;
  base: HTMLCanvasElement;
  field: HTMLCanvasElement;
  cells: number;
}

export function DitherClimb() {
  const readoutRef = useRef<HTMLSpanElement | null>(null);
  const cacheRef = useRef<ClimbCache | null>(null);
  const prodDraw = useMotionValue(PROD_DRAW_UNITS);

  const canvasRef = useCanvasStage((f: StageFrame) => {
    const { ctx, colors } = f;
    const scaleX = f.backingW / VB_W;
    const scaleY = f.backingH / VB_H;

    if (!cacheRef.current || cacheRef.current.epoch !== f.epoch) {
      cacheRef.current = buildCache(f, scaleX, scaleY);
    }
    const cache = cacheRef.current;

    const v = drawValueAt(f.t, f.mode);
    const head = headAt(v);

    ctx.clearRect(0, 0, f.w, f.h);
    /* Base: gridlines, axis labels, the ghost of the full line. */
    ctx.drawImage(cache.base, 0, 0, f.w, f.h);
    /* Field: revealed only as far as the head has drawn. */
    if (v > 0.02) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, head.x * (f.w / VB_W) + 2, f.h);
      ctx.clip();
      ctx.drawImage(cache.field, 0, 0, f.w, f.h);
      ctx.restore();
    }

    ctx.save();
    ctx.scale(f.w / VB_W, f.h / VB_H);
    /* The line as dots, radius carrying the local score. */
    if (v > 0.02) {
      ctx.beginPath();
      for (let s = 0; s <= v; s += 0.045) {
        const p = headAt(s);
        const r = 0.8 + 2.3 * seriesAt(p.x).score01;
        ctx.moveTo(p.x + r, p.y);
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      }
      ctx.fillStyle = colors.accent;
      ctx.globalAlpha = 0.95;
      ctx.fill();
      ctx.globalAlpha = 1;
      /* The head: a filled dot with a card-coloured core. */
      ctx.beginPath();
      ctx.arc(head.x, head.y, 3.1, 0, Math.PI * 2);
      ctx.fillStyle = colors.accent;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(head.x, head.y, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = colors.card;
      ctx.fill();
    }
    /* The merge point gets a ring and its word once the draw passes it. */
    if (v >= MERGE_INDEX) {
      const mp = POINTS[MERGE_INDEX];
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, 6, 0, Math.PI * 2);
      ctx.strokeStyle = colors.accent;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.font = '11px "IBM Plex Mono", monospace';
      ctx.textAlign = "center";
      ctx.fillStyle = colors.muted;
      ctx.fillText("merged", mp.x, mp.y + 22);
    }
    ctx.restore();

    if (readoutRef.current) {
      readoutRef.current.textContent = `Round ${head.round} · ${fmtScore(head.score)}%`;
    }
    f.cells = cache.cells + 230;
  }, "climb");

  return (
    <section className="d2-section" aria-labelledby="d2-climb-h">
      <div className="d2-sec-head">
        <h2 className="d2-sec-title" id="d2-climb-h">
          01 · The dithered climb
        </h2>
        <p className="d2-sec-note">
          The held-out score as halftone. Where the prompt struggled the dots are coarse and
          sparse; where the merged fix landed they turn fine and dense. Left: dither. Right: the
          production line, same recorded data.
        </p>
      </div>
      <div className="d2-duo">
        <div className="d2-card">
          <div className="console-card-in">
            <div className="console-card-head">
              <h3 className="console-eyebrow">
                {dogfoodRun.label} · {dogfoodRun.agent}
              </h3>
              <div>
                <span className="console-readout" ref={readoutRef}>
                  Round 14 · 100%
                </span>
              </div>
            </div>
            <p className="console-big">
              Your prompt: {dogfoodRun.firstMeasured}% to {dogfoodRun.lastMeasured}%
            </p>
            <p className="console-sub">
              Held-out score, the test cases Synthe never trains on, measured after each round.
            </p>
            <canvas
              ref={canvasRef}
              className="d2-canvas d2-climb-canvas"
              role="img"
              aria-label={`Halftone chart of the dogfood run's held-out score: ${dogfoodRun.firstMeasured}% at round 4, rising to ${dogfoodRun.lastMeasured}% by round 14. Dot density and size carry the score. Round 7 merged a fix.`}
            />
            <p className="console-note">
              Rounds 1 to 3 recorded no score, so the climb starts at round 4.{" "}
              {dogfoodRun.mergeNote}
            </p>
            <p className="console-meta">
              {dogfoodRun.roundsTotal} rounds · {dogfoodRun.dateLabel} · Spend{" "}
              {dogfoodRun.spendDisplay}
            </p>
          </div>
        </div>
        <div className="d2-card">
          <div className="console-card-in">
            <ScoreCard draw={prodDraw} beat={false} />
          </div>
        </div>
      </div>
    </section>
  );
}

function buildCache(f: StageFrame, scaleX: number, scaleY: number): ClimbCache {
  const { colors } = f;
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = f.backingW;
    c.height = f.backingH;
    return c;
  };

  /* ---- Base: gridlines, axis labels, the ghost line as faint dots. */
  const base = mk();
  const b = base.getContext("2d");
  let cells = 0;
  if (b) {
    b.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    b.strokeStyle = colors.line;
    b.lineWidth = 1;
    [0, 50, 100].forEach((g) => {
      b.beginPath();
      b.moveTo(PAD.left, vbY(g));
      b.lineTo(VB_W - PAD.right, vbY(g));
      b.stroke();
    });
    b.font = '11px "IBM Plex Mono", monospace';
    b.fillStyle = colors.muted;
    b.textAlign = "right";
    [0, 50, 100].forEach((g) => b.fillText(`${g}`, PAD.left - 8, vbY(g) + 4));
    b.textAlign = "center";
    b.fillText(`Round ${POINTS[0].round}`, POINTS[0].x, VB_H - 8);
    b.fillText("Round 9", (PAD.left + ((9 - 4) / 10) * (VB_W - PAD.left - PAD.right)), VB_H - 8);
    b.textAlign = "end";
    b.fillText(`Round ${POINTS[POINTS.length - 1].round}`, VB_W - PAD.right, VB_H - 8);
    b.beginPath();
    for (let s = 0; s <= DRAW_UNITS; s += 0.045) {
      const p = headAt(s);
      b.moveTo(p.x + 0.9, p.y);
      b.arc(p.x, p.y, 0.9, 0, Math.PI * 2);
      cells += 1;
    }
    b.fillStyle = colors.accent;
    b.globalAlpha = 0.16;
    b.fill();
    b.globalAlpha = 1;
  }

  /* ---- Field: two dither lattices under the recorded line. */
  const field = mk();
  const g = field.getContext("2d");
  if (g) {
    g.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    const baseY = vbY(0);
    const drawLattice = (cell: number, coarse: boolean) => {
      const cols = Math.ceil((VB_W - PAD.right - PAD.left) / cell);
      const rows = Math.ceil((baseY - PAD.top) / cell);
      for (let i = 0; i <= cols; i++) {
        const cx = PAD.left + i * cell + cell / 2;
        const { score01, y: lineY } = seriesAt(cx);
        for (let j = 0; j <= rows; j++) {
          const cy = PAD.top + j * cell + cell / 2;
          if (cy <= lineY || cy >= baseY) continue;
          const falloff = clamp01((baseY - cy) / Math.max(baseY - lineY, 1));
          const intensity = coarse
            ? score01 * (0.25 + 0.75 * falloff)
            : score01 * (0.15 + 0.85 * falloff);
          const gate = coarse ? intensity * 1.6 : intensity;
          if (gate <= bayer(i, j)) continue;
          const r = coarse
            ? 1.9 * clamp01(intensity * 1.6 + 0.28)
            : 1.35 * clamp01(intensity * 1.8);
          if (r < 0.25) continue;
          g.beginPath();
          g.arc(cx, cy, r, 0, Math.PI * 2);
          g.fillStyle = colors.ink;
          g.globalAlpha = coarse ? 0.16 + 0.34 * intensity : 0.12 + 0.48 * intensity;
          g.fill();
          cells += 1;
        }
      }
    };
    drawLattice(6, true);
    drawLattice(3, false);
    g.globalAlpha = 1;
  }

  return { epoch: f.epoch, base, field, cells };
}
