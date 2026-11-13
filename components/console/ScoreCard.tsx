import { dogfoodRun } from "@/lib/runData";
import { HALF_A, HALF_B } from "@/app/components/Mark";
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
   footnote says exactly that. */

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

export function ScoreCard({
  drawn,
  beat,
}: {
  /** How many of the 11 measured points are on the line so far. */
  drawn: number;
  /** True in the merge beat, when the final point lands. */
  beat: boolean;
}) {
  const shown = POINTS.slice(0, Math.max(drawn, 0));
  const current = shown[shown.length - 1];
  const path = shown
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const area = shown.length
    ? `${path} L${shown[shown.length - 1].x},${py(0)} L${shown[0].x},${py(0)} Z`
    : "";
  return (
    <>
      <CardHead
        id="console-score-h"
        eyebrow={`${dogfoodRun.label} · ${dogfoodRun.agent}`}
        right={
          <span className="console-readout" aria-live="off">
            {current
              ? `Round ${current.round} · ${current.scorePct}%`
              : `Round ${dogfoodRun.series[0].round} · ${dogfoodRun.firstMeasured}%`}
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
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={py(v)}
              y2={py(v)}
              className="console-gridline"
            />
            <text x={PAD.left - 8} y={py(v) + 4} className="console-axis" textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {/* The full recorded line sits underneath at low opacity, so the
            chart's destination is honest context, not a surprise. */}
        <path d={FULL_PATH} className="console-line-ghost" />
        {area ? <path d={area} className="console-area" /> : null}
        {path ? <path d={path} className="console-line" /> : null}
        {shown.map((p) => {
          const isMerged = p.round === dogfoodRun.mergedRound;
          const isLast = p === current && drawn >= POINTS.length;
          return (
            <g key={p.round}>
              {isMerged ? (
                <g
                  className="mark"
                  transform={`translate(${(p.x - 8.5).toFixed(1)} ${(p.y - 9).toFixed(1)}) scale(0.0618)`}
                  aria-hidden="true"
                >
                  <path className="half a" d={HALF_A} />
                  <path className="half b" d={HALF_B} />
                </g>
              ) : (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  className={
                    isLast && beat
                      ? "console-dot console-dot-beat"
                      : "console-dot"
                  }
                />
              )}
              {isMerged ? (
                <text x={p.x} y={p.y + 22} className="console-dot-label" textAnchor="middle">
                  merged
                </text>
              ) : null}
            </g>
          );
        })}
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
