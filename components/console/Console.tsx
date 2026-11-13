"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  useAnimationControls,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { demoRun } from "@/lib/runData";
import {
  CHECK_FLIP_AT,
  CYCLE_MS,
  DIFF_AT,
  DIFF_MS,
  DRAW_AT,
  DRAW_MS,
  DRAW_UNITS,
  FINAL_PHASE,
  HOLD_MS,
  LOOP_MS,
  MERGE_PHASE,
  PHASE_STARTS,
  REPORT_AT,
  RESET_MS,
  SPEND_STEP_MS,
  activeRound,
  checksFlipped,
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

/* The living console (Lane N2; self-playing loop by Lane N5; every
   card alive internally by Lane V2): the hero's worked example as a
   bento of six cards, each one a real artifact of a recorded run.
   The console is just playing. It has no controls and needs none:
   when it first scrolls into view the cards assemble and the cycle
   starts; each cycle plays the record (~12s), rests on the final
   recorded state for a 5s beat, eases back to the start over 800ms,
   and plays again. Scrolled out of view it pauses mid-cycle and
   resumes where it left off. The server renders the final state, so
   the page is complete with JavaScript off, with reduced motion,
   and before hydration (Postel's law).
   Inside the cycle, each card runs its own part of the record on
   the cues in timeline.ts: the climb draws continuously, the diff
   composes line by line while round 1 is tested, the checks settle
   one at a time off the merge beat, spend accumulates round by
   round (holding where a round recorded no cost), and the report
   prints line by line at the end. The continuous values run on
   framer-motion tweens registered with the conductor, so a pause
   freezes all of them at once; React state changes only when a
   phase, a check count, or the report flag actually flips. */

const SPEND_PCT = (demoRun.spendUsd / demoRun.budgetUsd) * 100;
const DIFF_LINES = demoRun.pullRequest.diff.length;

/** Cumulative spend targets (percent of budget) as each demo round
    resolves: rounds 1, 2 and 4 add their recorded costs; round 3
    recorded no cost, so its target holds; the last target is the
    recorded total spend, which the parts round to. */
const SPEND_STEPS: { at: number; pct: number }[] = (() => {
  /* Rounds resolve at phases 2, 4, 5 and 6 (see ROUNDS_DONE in
     timeline.ts), so their spend lands at those phase starts. */
  const resolveAt = [PHASE_STARTS[2], PHASE_STARTS[4], PHASE_STARTS[5], PHASE_STARTS[6]];
  let acc = 0;
  return demoRun.rounds.map((r, i) => {
    if (r.costUsd !== null) acc += r.costUsd;
    const usd = i === demoRun.rounds.length - 1 ? demoRun.spendUsd : acc;
    return { at: resolveAt[i], pct: (usd / demoRun.budgetUsd) * 100 };
  });
})();

/** The climb: symmetric ease-in-out, so the line gathers pace and
    lands softly exactly on the merge beat. */
const CLIMB_EASE = [0.65, 0, 0.35, 1] as const;
/** The reset: the same family, so the rewind feels like the play
    run backwards rather than a cut. */
const RESET_EASE = [0.65, 0, 0.35, 1] as const;

type Tween = ReturnType<typeof animate>;

/** A live tween, tracked so the conductor can pause, resume and
    stop every card's motion as one. Finished tweens are skipped:
    replaying one would restart a card's part from its beginning. */
interface Live {
  ctrl: Tween;
  done: boolean;
}

export function Console() {
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const shellRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(FINAL_PHASE);
  const [playing, setPlaying] = useState(false);
  const [checksStep, setChecksStep] = useState<number>(CHECK_FLIP_AT.length);
  const [reportPrinted, setReportPrinted] = useState(true);
  const [expanded, setExpanded] = useState(true);
  /* Continuous values, rendered at their recorded finals so SSR,
     no-JS and reduced motion all show the complete record. */
  const draw = useMotionValue(DRAW_UNITS);
  const spend = useMotionValue(SPEND_PCT);
  const diff = useMotionValue(DIFF_LINES);

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

  /* Container-scroll tilt (Part 3, clean-room on ScrollTrigger):
     the whole console surface enters with a subtle perspective
     recline and scrubs to flat through its entry zone only, then
     stays flat for the whole reading zone. Transforms only, so
     document height and the console's internals never move (B6).
     The Lenis chassis already pumps ScrollTrigger from the GSAP
     ticker (SmoothScroll), so the scrub rides the site's own
     scroll. Reduced motion and the motion-paused opt-out leave it
     flat; at phone widths the recline is halved, not removed: the
     captures show it still reading as depth, not distortion. */
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    if (reduceMotion) return;
    if (document.documentElement.classList.contains("motion-paused")) return;
    gsap.registerPlugin(ScrollTrigger);
    const parent = shell.parentElement;
    if (parent) gsap.set(parent, { perspective: 1400 });
    const angle = window.matchMedia("(max-width: 640px)").matches ? 5 : 10;
    const tween = gsap.fromTo(
      shell,
      { rotationX: angle, scale: 0.97, transformOrigin: "50% 0%" },
      {
        rotationX: 0,
        scale: 1,
        ease: "none",
        scrollTrigger: {
          trigger: shell,
          start: "top 98%",
          end: "top 45%",
          scrub: 0.5,
        },
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(shell, { clearProps: "transform" });
      if (parent) gsap.set(parent, { clearProps: "perspective" });
    };
  }, [reduceMotion]);

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
    let checksCur: number = CHECK_FLIP_AT.length;
    let printedCur = true;
    let drawStarted = false;
    let diffStarted = false;
    let resetStarted = false;
    let spendStarted: boolean[] = SPEND_STEPS.map(() => false);
    let live: Live[] = [];

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
    const setChecksIf = (n: number) => {
      if (n !== checksCur) {
        checksCur = n;
        setChecksStep(n);
      }
    };
    const setPrintedIf = (v: boolean) => {
      if (v !== printedCur) {
        printedCur = v;
        setReportPrinted(v);
      }
    };

    const reg = (ctrl: Tween): Live => {
      const entry: Live = { ctrl, done: false };
      ctrl.then(() => {
        entry.done = true;
      });
      live.push(entry);
      return entry;
    };
    const pauseLive = () => live.forEach((e) => {
      if (!e.done) e.ctrl.pause();
    });
    const playLive = () => live.forEach((e) => {
      if (!e.done) e.ctrl.play();
    });
    const stopLive = () => {
      live.forEach((e) => e.ctrl.stop());
      live = [];
    };

    const beginCycle = (now: number) => {
      stopLive();
      cycleStart = now;
      pausedTotal = 0;
      drawStarted = false;
      diffStarted = false;
      resetStarted = false;
      spendStarted = SPEND_STEPS.map(() => false);
      draw.set(0);
      spend.set(0);
      diff.set(0);
      setPhaseIf(0);
      setChecksIf(0);
      setPrintedIf(false);
      setPlayingIf(true);
    };

    /* The conductor: one cheap interval derives the cycle state from
       elapsed time. It only touches React state when a phase, the
       playing flag, the flipped-check count or the report flag
       actually changes; the continuous values (score draw, diff
       composition, spend accumulation) run on registered tweens,
       which pause and resume with the cycle. */
    const tick = () => {
      if (disposed || paused || !started) return;
      const t = performance.now() - cycleStart - pausedTotal;
      if (t < LOOP_MS) {
        setPlayingIf(true);
        setPhaseIf(phaseAt(t));
        setChecksIf(checksFlipped(t));
        setPrintedIf(t >= REPORT_AT);
        if (!drawStarted && t >= DRAW_AT) {
          drawStarted = true;
          reg(animate(draw, DRAW_UNITS, { duration: DRAW_MS / 1000, ease: CLIMB_EASE }));
        }
        if (!diffStarted && t >= DIFF_AT) {
          diffStarted = true;
          reg(animate(diff, DIFF_LINES, { duration: DIFF_MS / 1000, ease: "easeInOut" }));
        }
        SPEND_STEPS.forEach((step, i) => {
          if (!spendStarted[i] && t >= step.at) {
            spendStarted[i] = true;
            if (Math.abs(spend.get() - step.pct) > 0.001) {
              reg(
                animate(spend, step.pct, {
                  duration: SPEND_STEP_MS / 1000,
                  ease: "easeOut",
                }),
              );
            }
          }
        });
      } else if (t < LOOP_MS + HOLD_MS) {
        /* The rest beat: the finished record, held inside the cycle. */
        setPlayingIf(false);
        setPhaseIf(FINAL_PHASE);
        setChecksIf(CHECK_FLIP_AT.length);
        setPrintedIf(true);
      } else if (t < CYCLE_MS) {
        if (!resetStarted) {
          resetStarted = true;
          setPlayingIf(false);
          setPhaseIf(0);
          setChecksIf(0);
          setPrintedIf(false);
          stopLive();
          reg(animate(draw, 0, { duration: (RESET_MS / 1000) * 0.75, ease: RESET_EASE }));
          reg(animate(spend, 0, { duration: (RESET_MS / 1000) * 0.6, ease: RESET_EASE }));
          reg(animate(diff, 0, { duration: (RESET_MS / 1000) * 0.7, ease: RESET_EASE }));
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
              playLive();
            }
          } else if (started && !paused) {
            /* Off-screen: freeze the cycle, tweens included. */
            paused = true;
            pausedAt = performance.now();
            pauseLive();
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
      stopLive();
    };
  }, [controls, reduceMotion, draw, spend, diff]);

  const done = roundsDone(phase);
  const merged = phase >= MERGE_PHASE;

  return (
    <section className="stage wrap" aria-labelledby="console-h">
      <div className="console-shell" ref={shellRef}>
        <div className="console-caption">
          <h2 className="example-label" id="console-h">
            Two recorded runs, replayed
          </h2>
        </div>
        <div className="console">
          <CardShell index={0} className="cell-score" controls={controls} labelledBy="console-score-h" dataPort="score">
            <ScoreCard draw={draw} beat={playing && phase === MERGE_PHASE} />
          </CardShell>
          <CardShell index={1} className="cell-run" controls={controls} labelledBy="console-run-h">
            <RunCard done={done} active={activeRound(phase, playing)} />
          </CardShell>
          <CardShell index={2} className="cell-checks" controls={controls} labelledBy="console-checks-h">
            <ChecksCard flipped={checksStep} />
          </CardShell>
          <div className={expanded ? "console-more is-open" : "console-more"}>
            <CardShell index={3} className="cell-pr" controls={controls} labelledBy="console-pr-h">
              <PullRequestCard merged={merged} diff={diff} />
            </CardShell>
            <CardShell index={4} className="cell-spend" controls={controls} labelledBy="console-spend-h">
              <SpendCard pct={spend} />
            </CardShell>
            <CardShell index={5} className="cell-report" controls={controls} labelledBy="console-report-h">
              <ReportCard printed={reportPrinted} />
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
