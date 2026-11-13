"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useAnimationControls, useReducedMotion } from "framer-motion";
import { demoRun } from "@/lib/runData";
import {
  FINAL_PHASE,
  LOOP_MS,
  MERGE_PHASE,
  PHASE_STARTS,
  SCORE_STEPS,
  SCORE_TOTAL,
  SPEND_FILL_AT,
  activeRound,
  checksPassing,
  roundsDone,
} from "./timeline";
import { CardShell } from "./kit";
import { ScoreCard } from "./ScoreCard";
import { RunCard } from "./RunCard";
import { ChecksCard } from "./ChecksCard";
import { PullRequestCard } from "./PullRequestCard";
import { SpendCard } from "./SpendCard";
import { ReportCard } from "./ReportCard";

/* The living console (Lane N2): the hero's worked example as a bento of
   six cards, each one a real artifact of a recorded run, replayed once
   when it first scrolls into view and then resting on the recorded end
   state. The server renders the final state, so the page is complete
   with JavaScript off, with reduced motion, and before hydration
   (Postel's law). The replay never invents data: it steps through the
   states the runs actually recorded, on the timeline in timeline.ts.
   It pauses the moment it leaves the viewport (settling to the final
   state rather than performing for nobody), and it does not restart. */

const SPEND_PCT = (demoRun.spendUsd / demoRun.budgetUsd) * 100;

export function Console() {
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const shellRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(FINAL_PHASE);
  const [playing, setPlaying] = useState(false);
  const [drawn, setDrawn] = useState(SCORE_TOTAL);
  const [spendPct, setSpendPct] = useState(SPEND_PCT);
  const [expanded, setExpanded] = useState(true);

  /* On phones the grid shows three cards, the rest behind one labeled
     expansion (Hick's law). The expansion starts open so no-JS phones
     still get every card; the effect below collapses it only where the
     layout is single-column, and only once JS is running. */
  useEffect(() => {
    if (window.matchMedia("(max-width: 640px)").matches) setExpanded(false);
  }, []);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    if (reduceMotion) return;
    if (document.documentElement.classList.contains("motion-paused")) return;
    if (!("IntersectionObserver" in window)) return;

    let started = false;
    let disposed = false;
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(() => { if (!disposed) fn(); }, ms));
    };
    const settle = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.length = 0;
      setPhase(FINAL_PHASE);
      setDrawn(SCORE_TOTAL);
      setSpendPct(SPEND_PCT);
      setPlaying(false);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started) {
            started = true;
            /* Arm the replay: cards assemble, states reset to the start
               of the record, then the timeline steps through it. */
            controls.set("hidden");
            void controls.start("show");
            setPhase(0);
            setDrawn(0);
            setSpendPct(0);
            setPlaying(true);
            PHASE_STARTS.forEach((at, i) => {
              if (i > 0) later(at, () => setPhase(i));
            });
            SCORE_STEPS.forEach((step) => later(step.at, () => setDrawn(step.drawn)));
            later(SPEND_FILL_AT, () => {
              const tween = animate(0, SPEND_PCT, {
                duration: 0.9,
                ease: "easeOut",
                onUpdate: (v) => { if (!disposed) setSpendPct(v); },
              });
              timers.push(window.setTimeout(() => tween.stop(), 1200));
            });
            later(LOOP_MS, () => setPlaying(false));
          } else if (!entry.isIntersecting && started) {
            /* Off-screen: stop performing and settle on the record. */
            settle();
            io.disconnect();
          }
        });
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      disposed = true;
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [controls, reduceMotion]);

  const done = roundsDone(phase);
  const merged = phase >= MERGE_PHASE;

  return (
    <section className="stage wrap" aria-labelledby="console-h">
      <div className="console-shell" ref={shellRef}>
        <div className="console-caption">
          <h2 className="example-label" id="console-h">
            Two recorded runs, replayed
          </h2>
          <span className="console-caption-note">
            Every number below is from a real run. Nothing is simulated.
          </span>
        </div>
        <div className="console">
          <CardShell index={0} className="cell-score" controls={controls} labelledBy="console-score-h">
            <ScoreCard drawn={drawn} beat={playing && phase === MERGE_PHASE} />
          </CardShell>
          <CardShell index={1} className="cell-run" controls={controls} labelledBy="console-run-h">
            <RunCard done={done} active={activeRound(phase, playing)} />
          </CardShell>
          <CardShell index={2} className="cell-checks" controls={controls} labelledBy="console-checks-h">
            <ChecksCard passing={checksPassing(phase)} />
          </CardShell>
          <div className={expanded ? "console-more is-open" : "console-more"}>
            <CardShell index={3} className="cell-pr" controls={controls} labelledBy="console-pr-h">
              <PullRequestCard merged={merged} />
            </CardShell>
            <CardShell index={4} className="cell-spend" controls={controls} labelledBy="console-spend-h">
              <SpendCard pct={spendPct} />
            </CardShell>
            <CardShell index={5} className="cell-report" controls={controls} labelledBy="console-report-h">
              <ReportCard />
            </CardShell>
          </div>
        </div>
        <button
          type="button"
          className="console-more-btn"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show fewer cards" : "Show the merge, spend and report"}
        </button>
      </div>
    </section>
  );
}
