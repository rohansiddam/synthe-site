"use client";

import { useState } from "react";
import { useMotionValueEvent, type MotionValue } from "framer-motion";
import { dogfoodRun } from "@/lib/runData";
import { HALF_A, HALF_B } from "@/app/components/Mark";
import { DRAW_UNITS } from "./timeline";
import { CardHead } from "./kit";

/* The score card (largest): Synthe's own dogfood run, the Bean & Byte
   coffee bot, drawn from its real recorded series. The climb is the
   console's signature shape and its visual anchor; at the merge
   point the line carries the logo mark itself, the two halves locked,
   which is the product's own symbol for a kept change. The series
   starts at round 4 because rounds 1 to 3 recorded no score; the
   x-axis says so rather than inventing points (no fabricated
   numbers). Round 7's dip is the run's honest shape: it is the old
   prompt's score, recorded the round the fix merged, and the
   footnote says exactly that.
   Lane N5: the draw is continuous. Console.tsx tweens a motion
   value along the recorded polyline and this card interpolates the
   head between points, so the line flows instead of jumping point
   to point. At rest the head carries a slow radiating pulse and the
   merge mark breathes; both are CSS keyframes on sine-like eases,
   gated to no-preference motion in globals.css. */

const W = 560;
const H = 348;
const PAD = { left: 38, right: 14, top: 16, bottom: 30 };
const X0 = 4; // first measured round
const X1 = 14; // last round

const px = (round: number) =>
  PAD.left + ((round - X0) / (X1 - X0)) * (W - PAD.left - PAD.right);
const py = (pct: number) =>
  PAD.top + (1 - pct / 100) * (H - PAD.top - PAD.bottom);

const POINTS = dogfoodRun.series.map((p) => ({
  ...p,
  x: px(p.round),
  y: py(p.scorePct),
}));
const FULL_PATH = POINTS.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
const MERGE_INDEX = POINTS.findIndex((p) => p.round === dogfoodRun.mergedRound);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const fadeIn = (v: number, at: number, span: number) => clamp01((v - (at - span)) / span);

/** The head's position at draw value v (0..DRAW_UNITS): linear along
    each recorded segment, eased by the tween that drives v. */
function headAt(v: number) {
  const c = Math.min(Math.max(v, 0), DRAW_UNITS);
  const i = Math.min(Math.floor(c), POINTS.length - 2);
  const f = c - i;
  const a = POINTS[i];
  const b = POINTS[i + 1];
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    score: a.scorePct + (b.scorePct - a.scorePct) * f,
    round: POINTS[Math.round(c)].round,
  };
}

const fmtScore = (s: number) => {
  const r = Math.round(s * 10) / 10;
  return Number.isInteger(r) ? `${r}` : `${r.toFixed(1)}`;
};

export function ScoreCard({
  draw,
  beat,
}: {
  /** Continuous draw position along the series, 0..DRAW_UNITS.
      Starts at DRAW_UNITS: the recorded final state. */
  draw: MotionValue<number>;
  /** True in the merge beat, when the final point lands. */
  beat: boolean;
}) {
  const [v, setV] = useState(DRAW_UNITS);
  useMotionValueEvent(draw, "change", (latest) => setV(latest));

  const head = headAt(v);
  const whole = Math.floor(Math.min(v, DRAW_UNITS));
  const shownPts = POINTS.slice(0, whole + 1);
  const linePts =
    v > 0.02
      ? [...shownPts.slice(0, -1), { x: head.x, y: head.y }]
      : shownPts.slice(0, 1);
  const path = linePts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const area =
    v > 0.02
      ? `${path} L${head.x.toFixed(1)},${py(0)} L${shownPts[0].x},${py(0)} Z`
      : "";
  const atRest = v >= DRAW_UNITS - 0.001;

  return (
    <>
      <CardHead
        id="console-score-h"
        eyebrow={`${dogfoodRun.label} · ${dogfoodRun.agent}`}
        right={
          <span className="console-readout" aria-live="off">
            {`Round ${head.round} · ${fmtScore(head.score)}%`}
          </span>
        }
      />
      <p className="console-big">
        Your prompt: {dogfoodRun.firstMeasured}% to {dogfoodRun.lastMeasured}%
      </p>
      <p className="console-sub">
        Held-out score, the test cases Synthe never trains on, measured after each round.
      </p>
      <svg
        className="console-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Line chart of the dogfood run's held-out score: ${dogfoodRun.firstMeasured}% at round 4, rising to ${dogfoodRun.lastMeasured}% by round 14. Round 7 merged a fix.`}
      >
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={py(g)}
              y2={py(g)}
              className="console-gridline"
            />
            <text x={PAD.left - 8} y={py(g) + 4} className="console-axis" textAnchor="end">
              {g}
            </text>
          </g>
        ))}
        {/* The full recorded line sits underneath at low opacity, so the
            chart's destination is honest context, not a surprise. */}
        <path d={FULL_PATH} className="console-line-ghost" />
        {area ? <path d={area} className="console-area" /> : null}
        {v > 0.02 ? <path d={path} className="console-line" /> : null}
        {POINTS.map((p, i) => {
          if (i === MERGE_INDEX) return null;
          return (
            <circle
              key={p.round}
              cx={p.x}
              cy={p.y}
              r={4}
              className="console-dot"
              opacity={fadeIn(v, i, 0.2)}
            />
          );
        })}
        {/* The merge point carries the mark itself, breathing at rest. */}
        {MERGE_INDEX >= 0 ? (
          <g opacity={fadeIn(v, MERGE_INDEX, 0.25)}>
            <g
              transform={`translate(${(POINTS[MERGE_INDEX].x - 8.5).toFixed(1)} ${(POINTS[MERGE_INDEX].y - 9).toFixed(1)}) scale(0.0618)`}
              aria-hidden="true"
            >
              <g className="mark console-merge-mark">
                <path className="half a" d={HALF_A} />
                <path className="half b" d={HALF_B} />
              </g>
            </g>
            <text
              x={POINTS[MERGE_INDEX].x}
              y={POINTS[MERGE_INDEX].y + 22}
              className="console-dot-label"
              textAnchor="middle"
            >
              merged
            </text>
          </g>
        ) : null}
        {/* The head: a soft pulse radiates from it once the climb rests. */}
        {atRest ? (
          <circle cx={head.x} cy={head.y} r={4.5} className="console-head-halo" aria-hidden="true" />
        ) : null}
        <circle
          cx={head.x}
          cy={head.y}
          r={4}
          className={beat ? "console-dot console-dot-beat" : "console-dot"}
        />
        <text x={px(X0)} y={H - 8} className="console-axis" textAnchor="middle">
          Round {X0}
        </text>
        <text x={px(9)} y={H - 8} className="console-axis" textAnchor="middle">
          Round 9
        </text>
        <text x={W - PAD.right} y={H - 8} className="console-axis" textAnchor="end">
          Round {X1}
        </text>
      </svg>
      <p className="console-note">{dogfoodRun.mergeNote}</p>
      <p className="console-meta">
        {dogfoodRun.roundsTotal} rounds · {dogfoodRun.dateLabel} · Spend {dogfoodRun.spendDisplay}
      </p>
    </>
  );
}
