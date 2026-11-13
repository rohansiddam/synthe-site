"use client";

import { demoRun } from "@/lib/runData";
import { CardHead } from "./kit";

/* The spend card: the demo run's real cost as a quiet meter. Cost
   questions come first for this audience, so spend sits in the hero,
   stated plainly: what the run spent, of the budget it was given. The
   meter is the site's own bar treatment (the hero's before/after
   bars: an 8px track with a line border and a quiet fill), not
   Astryx's ProgressBar, whose geometry is compiled into Astryx and
   would read as a template part (brand directive, see kit.tsx). The
   progressbar semantics are kept by hand. The fill animates from 0
   to the recorded share as the loop's last phase settles. */

export function SpendCard({ pct }: { pct: number }) {
  return (
    <>
      <CardHead id="console-spend-h" eyebrow="Spend · demo run" />
      <p className="console-big">
        {demoRun.spendDisplay} <span className="console-big-of">of a ${demoRun.budgetUsd} budget</span>
      </p>
      <div
        className="console-meter"
        role="progressbar"
        aria-label="Demo run spend against its budget"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div className="console-meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="console-meta">
        {demoRun.rounds.length} rounds · {demoRun.models}
      </p>
    </>
  );
}
