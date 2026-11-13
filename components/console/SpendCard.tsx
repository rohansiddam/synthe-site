"use client";

import { useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { demoRun } from "@/lib/runData";
import { CardHead } from "./kit";

/* The spend card: the demo run's real cost as a quiet meter. Cost
   questions come first for this audience, so spend sits in the hero,
   stated plainly: what the run spent, of the budget it was given. The
   meter is the site's own bar treatment (the hero's before/after
   bars: an 8px track with a line border and a quiet fill), not
   Astryx's ProgressBar, whose geometry is compiled into Astryx and
   would read as a template part (brand directive, see kit.tsx). The
   progressbar semantics are kept by hand.
   Lane V2: the fill is a motion value stepped by the console's
   conductor, so spend accumulates the way the run actually spent
   it: a step as each round resolves ($0.08, then $0.12 more, a hold
   on the round that recorded no cost, then the last $0.12), landing
   exactly on the recorded total. The big number is the running
   total, read off the same motion value with no per-frame render,
   and a tick lands on the meter at each step's position. It rests
   at the recorded share. */

/** Tick positions on the meter (percent of budget): where the
    cumulative spend stood after each round that recorded a cost,
    and the recorded total at the end. */
const TICKS: number[] = (() => {
  let acc = 0;
  const out: number[] = [];
  demoRun.rounds.forEach((r, i) => {
    if (r.costUsd !== null) acc += r.costUsd;
    const usd = i === demoRun.rounds.length - 1 ? demoRun.spendUsd : acc;
    const pct = (usd / demoRun.budgetUsd) * 100;
    if (out[out.length - 1] !== pct) out.push(pct);
  });
  return out;
})();

function MeterTick({ pct, at }: { pct: MotionValue<number>; at: number }) {
  const opacity = useTransform(pct, [at - 0.5, at], [0, 1]);
  return (
    <motion.span
      className="console-meter-tick"
      style={{ left: `${at}%`, opacity }}
      aria-hidden="true"
    />
  );
}

export function SpendCard({ pct }: { pct: MotionValue<number> }) {
  const width = useTransform(pct, (v) => `${v}%`);
  const dollars = useTransform(
    pct,
    (v) => `$${((v / 100) * demoRun.budgetUsd).toFixed(2)}`,
  );
  const [now, setNow] = useState(() => Math.round(pct.get()));
  useMotionValueEvent(pct, "change", (v) => {
    const r = Math.round(v);
    setNow((prev) => (prev === r ? prev : r));
  });
  return (
    <>
      <CardHead id="console-spend-h" eyebrow="Spend · demo run" />
      <p className="console-big">
        <motion.span>{dollars}</motion.span>{" "}
        <span className="console-big-of">of a ${demoRun.budgetUsd} budget</span>
      </p>
      <div
        className="console-meter"
        role="progressbar"
        aria-label="Demo run spend against its budget"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={now}
      >
        <motion.div className="console-meter-fill" style={{ width }} />
        {TICKS.map((at) => (
          <MeterTick key={at} pct={pct} at={at} />
        ))}
      </div>
      <p className="console-meta">
        {demoRun.rounds.length} rounds · {demoRun.models}
      </p>
    </>
  );
}
