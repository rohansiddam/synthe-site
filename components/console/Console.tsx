"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  useAnimationControls,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { demoRun } from "@/lib/runData";
import {
  CYCLE_MS,
  DRAW_AT,
  DRAW_MS,
  DRAW_UNITS,
  FINAL_PHASE,
  HOLD_MS,
  LOOP_MS,
  MERGE_PHASE,
  RESET_MS,
  SPEND_FILL_AT,
  SPEND_MS,
  activeRound,
  checksPassing,
  phaseAt,
  roundsDone,
} from "./timeline";
import { CardShell } from "./kit";
import { ScoreCard } from "./ScoreCard";
import { RunCard } from "./RunCard";
import { ChecksCard } from "./ChecksCard";
import { PullRequestCard } from "./PullRequestCard";
import { SpendCard } from "./SpendCard";
import { ReportCard } from "./ReportCard";

/* The living console (Lane N2; self-playing loop by Lane N5): the
   hero's worked example as a bento of six cards, each one a real
   artifact of a recorded run. The console is just playing. It has no
   controls and needs none: when it first scrolls into view the cards
   assemble and the cycle starts; each cycle plays the record
   (~12s), rests on the final recorded state for a 5s beat, eases
   back to the start over 800ms, and plays again. Scrolled out of
   view it pauses mid-cycle and resumes where it left off. The
   server renders the final state, so the page is complete with
   JavaScript off, with reduced motion, and before hydration
   (Postel's law). The replay never invents data: it steps through
   the states the runs actually recorded, on the timeline in
   timeline.ts, and the score line is drawn by a continuous eased
   tween along the recorded points, never point-to-point jumps. */

const SPEND_PCT = (demoRun.spendUsd / demoRun.budgetUsd) * 100;

/** The climb: symmetric ease-in-out, so the line gathers pace and
    lands softly exactly on the merge beat. */
const CLIMB_EASE = [0.65, 0, 0.35, 1] as const;
/** The reset: the same family, so the rewind feels like the play
    run backwards rather than a cut. */
const RESET_EASE = [0.65, 0, 0.35, 1] as const;

type Tween = ReturnType<typeof animate>;

export function Console() {
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const shellRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(FINAL_PHASE);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(true);
  /* Continuous values, rendered at their recorded finals so SSR,
     no-JS and reduced motion all show the complete record. */
  const draw = useMotionValue(DRAW_UNITS);
  const spend = useMotionValue(SPEND_PCT);

  /* On phones the grid shows three cards, the rest behind one labeled
     expansion (Hick's law). The expansion starts open so no-JS phones
     still get every card; the effect below collapses it only where the
     layout is single-column, and only once JS is running. */
  useEffect(() => {
    // SSR renders the expansion open (no-JS phones lose nothing); the
    // collapse can only be decided client-side, after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.matchMedia("(max-width: 640px)").matches) setExpanded(false);
  }, []);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    if (reduceMotion) return;
    if (document.documentElement.classList.contains("motion-paused")) return;
    if (!("IntersectionObserver" in window)) return;

    let disposed = false;
    let started = false;
    let paused = false;
    let pausedAt = 0;
    let pausedTotal = 0;
    let cycleStart = 0;
    let phaseCur = FINAL_PHASE;
    let playingCur = false;
    let drawStarted = false;
    let spendStarted = false;
    let resetStarted = false;
    let drawTween: Tween | null = null;
    let spendTween: Tween | null = null;
    let resetTweens: Tween[] = [];

    const setPhaseIf = (p: number) => {
      if (p !== phaseCur) {
        phaseCur = p;
        setPhase(p);
      }
    };
    const setPlayingIf = (v: boolean) => {
      if (v !== playingCur) {
        playingCur = v;
        setPlaying(v);
      }
    };
    const stopTweens = () => {
      drawTween?.stop();
      spendTween?.stop();
      resetTweens.forEach((t) => t.stop());
      drawTween = null;
      spendTween = null;
      resetTweens = [];
    };

    const beginCycle = (now: number) => {
      stopTweens();
      cycleStart = now;
      pausedTotal = 0;
      drawStarted = false;
      spendStarted = false;
      resetStarted = false;
      draw.set(0);
      spend.set(0);
      setPhaseIf(0);
      setPlayingIf(true);
    };

    /* The conductor: one cheap interval derives the cycle state from
       elapsed time. It only touches React state when a phase or the
       playing flag actually changes; the continuous values (score
       draw, spend fill) run on framer-motion tweens, which pause and
       resume with the cycle. */
    const tick = () => {
      if (disposed || paused || !started) return;
      const t = performance.now() - cycleStart - pausedTotal;
      if (t < LOOP_MS) {
        setPlayingIf(true);
        setPhaseIf(phaseAt(t));
        if (!drawStarted && t >= DRAW_AT) {
          drawStarted = true;
          drawTween = animate(draw, DRAW_UNITS, {
            duration: DRAW_MS / 1000,
            ease: CLIMB_EASE,
          });
        }
        if (!spendStarted && t >= SPEND_FILL_AT) {
          spendStarted = true;
          spendTween = animate(spend, SPEND_PCT, {
            duration: SPEND_MS / 1000,
            ease: "easeOut",
          });
        }
      } else if (t < LOOP_MS + HOLD_MS) {
        /* The rest beat: the finished record, held inside the cycle. */
        setPlayingIf(false);
        setPhaseIf(FINAL_PHASE);
      } else if (t < CYCLE_MS) {
        if (!resetStarted) {
          resetStarted = true;
          setPlayingIf(false);
          setPhaseIf(0);
          drawTween?.stop();
          spendTween?.stop();
          resetTweens = [
            animate(draw, 0, { duration: (RESET_MS / 1000) * 0.75, ease: RESET_EASE }),
            animate(spend, 0, { duration: (RESET_MS / 1000) * 0.6, ease: RESET_EASE }),
          ];
        }
      } else {
        beginCycle(performance.now());
      }
    };
    const interval = window.setInterval(tick, 100);

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!started) {
              started = true;
              /* First entry: cards assemble, then the cycle starts. */
              controls.set("hidden");
              void controls.start("show");
              beginCycle(performance.now());
            } else if (paused) {
              /* Back in view: resume mid-cycle, where it left off. */
              paused = false;
              pausedTotal += performance.now() - pausedAt;
              drawTween?.play();
              spendTween?.play();
              resetTweens.forEach((t) => t.play());
            }
          } else if (started && !paused) {
            /* Off-screen: freeze the cycle, tweens included. */
            paused = true;
            pausedAt = performance.now();
            drawTween?.pause();
            spendTween?.pause();
            resetTweens.forEach((t) => t.pause());
          }
        });
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      io.disconnect();
      stopTweens();
    };
  }, [controls, reduceMotion, draw, spend]);

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
            <ScoreCard draw={draw} beat={playing && phase === MERGE_PHASE} />
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
              <SpendCard pct={spend} />
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
