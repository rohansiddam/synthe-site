"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { demoRun } from "@/lib/runData";
import { EASE_OUT } from "./Reveal";

/* Live mini-scenes for the homepage below the hero (Lane V1, the
   visual-first pass). Each scene is a real artifact of the recorded
   demo run (lib/runData.ts), playing itself once when it scrolls
   into view: the checks flip the way the console's do, the PR pill
   lands on Merged, the report lines arrive in order. The pattern
   that keeps Postel's law: every scene renders its final recorded
   state on the server; with motion available it arms its "before"
   state in a layout effect, before the next paint, and entering
   the view plays it forward. No-JS and reduced motion keep the
   complete record untouched. Nothing here is a control: scenes
   play, they are never triggered. */

/* Arming happens in a layout effect, before the next paint, so a
   scene that hydrates late (or is already in view when it mounts)
   still arms: the old mount-time rect check silently skipped
   arming whenever hydration finished after the visitor had
   scrolled, leaving the finished record sitting static. Play
   begins two frames after entry so the armed "before" state is
   painted first, even for a scene already in view. */
const useIsoEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useEntryPlay<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const reduce = useReducedMotion();
  const [armed, setArmed] = useState(false);
  const [playing, setPlaying] = useState(false);
  useIsoEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    if (!("IntersectionObserver" in window)) return;
    setArmed(true);
    let rafInner = 0;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            io.disconnect();
            requestAnimationFrame(() => {
              rafInner = requestAnimationFrame(() => setPlaying(true));
            });
          }
        });
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(rafInner);
    };
  }, [reduce, threshold]);
  return { ref, armed, playing };
}

/* A boolean record state (checks passing, PR merged) that starts at
   the recorded final, drops to "before" when its scene arms, and
   returns to the record shortly after the scene starts playing. */
export function useFlip(armed: boolean, playing: boolean, delayMs: number) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => setFlipped(true), delayMs);
    return () => window.clearTimeout(t);
  }, [playing, delayMs]);
  return !armed || flipped;
}

/* The site's own glyphs, as in the console: the bare tick and the
   same stroke hand as a cross, no badge circles. */
export function CheckGlyph({ passing }: { passing: boolean }) {
  return passing ? (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="scene-check-icon is-pass">
      <path
        d="M2.5 6.2 5 8.5 9.5 3.5"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="scene-check-icon is-fail">
      <path d="M3 3l6 6M9 3L3 9" fill="none" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PrGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="scene-pr-glyph">
      <path
        fill="currentColor"
        d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 1.5 1.5H9.25a5.734 5.734 0 0 1-1.272.552A4.25 4.25 0 1 0 5.45 5.154Zm3.046 5.474a2.25 2.25 0 1 1-4.493-.096 4.368 4.368 0 0 1-.373-1.032H6.75a.75.75 0 1 0 0-1.5H3.612a4.372 4.372 0 0 1-.373 1.037 2.25 2.25 0 0 1 5.257 1.465ZM4.252 2.003a1.75 1.75 0 1 0 .096 4.493 1.75 1.75 0 0 0-.096-4.493Z"
      />
    </svg>
  );
}

/* GitHub's state pill in the site's stoplight language (the accent
   never means success; merged is the success token), swapping in
   place when the scene's merge lands, as the console's pill does. */
export function StatePill({ merged }: { merged: boolean }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={merged ? "merged" : "open"}
        className={merged ? "scene-pr-state is-merged" : "scene-pr-state is-open"}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <PrGlyph />
        {merged ? "Merged" : "Open"}
      </motion.span>
    </AnimatePresence>
  );
}

/* Card 1: the four checks, verbatim from the demo repo's synthe.json,
   in their file. They sit failing (the old prompt's replies broke
   them) and flip to passing in sequence when the card arrives; the
   readout counts with them. The record holds only the aggregate,
   which the card footer states: rule breaks 2 before, 0 after. */
export function ChecksScene() {
  const { ref, armed, playing } = useEntryPlay<HTMLDivElement>();
  const passing = useFlip(armed, playing, 450);
  return (
    <div ref={ref} className="scene scene-file" data-port="checks">
      <div className="scene-file-head">
        <span className="scene-file-name">synthe.json</span>
        <span className="scene-readout">
          {passing ? demoRun.checks.length : 0}/{demoRun.checks.length} passing
        </span>
      </div>
      <ol className="scene-checks">
        {demoRun.checks.map((check, i) => (
          <li
            key={i}
            className={passing ? "scene-check is-pass" : "scene-check is-fail"}
            style={{ transitionDelay: passing ? `${i * 90}ms` : "0ms" }}
          >
            <CheckGlyph passing={passing} />
            <span>{check}</span>
          </li>
        ))}
      </ol>
      <p className="scene-meta">
        Rule breaks: {demoRun.ruleBreaks.before} before the merge, {demoRun.ruleBreaks.after}{" "}
        after.
      </p>
    </div>
  );
}

/* Card 2: the merge itself. PR #8's title and state, the first
   changed pair from its real diff, and the scope it touched:
   one file improved, the rest untouched. The pill lands on Merged
   shortly after the card arrives. */
export function MergeScene() {
  const { ref, armed, playing } = useEntryPlay<HTMLDivElement>();
  const merged = useFlip(armed, playing, 900);
  const pr = demoRun.pullRequest;
  const pair = pr.diff.filter((l) => l.kind !== "context").slice(0, 2);
  return (
    <div ref={ref} className="scene">
      <div className="scene-pr-head">
        <p className="scene-pr-title">
          {pr.title} <span className="scene-pr-num">#{pr.number}</span>
        </p>
        <StatePill merged={merged} />
      </div>
      <div
        className="scene-diff"
        role="img"
        aria-label={`Part of the diff of prompt.md in pull request ${pr.number}: ${pr.fullTitle}`}
      >
        {pair.map((line, i) => (
          <div key={i} className={`scene-diff-line is-${line.kind}`}>
            <span className="scene-diff-sign" aria-hidden="true">
              {line.kind === "add" ? "+" : "−"}
            </span>
            <span className="scene-diff-text">{line.text}</span>
          </div>
        ))}
      </div>
      <ul className="tree scene-tree">
        <li>
          <span>src/</span>
          <span className="lock">untouched</span>
        </li>
        <li>
          <span>tools/</span>
          <span className="lock">untouched</span>
        </li>
        <li className="on">
          <span>prompt.md</span>
          <span className="lock">improved</span>
        </li>
      </ul>
      <p className="scene-meta">prompt.md · Merged {pr.mergedDateLabel}</p>
    </div>
  );
}

const reportContainer: Variants = {
  rest: {},
  hidden: {},
  play: { transition: { staggerChildren: 0.28, delayChildren: 0.15 } },
};
const reportLine: Variants = {
  rest: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: 10 },
  play: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

/* Card 3: the report, arriving the way it lands in the repo: the
   demo run's real report lines, in the product's order, one by one. */
export function ReportScene() {
  const { ref, armed, playing } = useEntryPlay<HTMLDivElement>();
  const state = !armed ? "rest" : playing ? "play" : "hidden";
  return (
    <motion.div
      ref={ref}
      className="scene"
      initial="rest"
      animate={state}
      variants={reportContainer}
    >
      <p className="scene-file-head">
        <span className="scene-file-name">The morning report · issue #3</span>
      </p>
      <div className="scene-report-lines">
        {demoRun.report.lines.map((line) => (
          <motion.p key={line.key} variants={reportLine}>
            <span className="scene-rpt-key">{line.key}</span>
            <span className="scene-rpt-val">{line.value}</span>
          </motion.p>
        ))}
      </div>
      <p className="scene-meta">{demoRun.models}</p>
    </motion.div>
  );
}

const climbContainer: Variants = {
  rest: {},
  hidden: {},
  play: {},
};
const climbLineV: Variants = {
  rest: { pathLength: 1 },
  hidden: { pathLength: 0 },
  play: {
    pathLength: 1,
    /* One smooth sine-in-out (cubic-bezier(0.37, 0, 0.63, 1), the
       bezier form of GSAP's sine.inOut): the same curve as the
       console's and the worked example's climbs. */
    transition: { duration: 1, ease: [0.37, 0, 0.63, 1], delay: 0.15 },
  },
};
/* The markers land in sequence with the draw (0.15 to 1.15): the
   start point as the line leaves it, the end point as the line
   reaches it, not both together at the end. */
const climbDotStartV: Variants = {
  rest: { opacity: 1 },
  hidden: { opacity: 0 },
  play: { opacity: 1, transition: { duration: 0.25, delay: 0.15 } },
};
const climbDotEndV: Variants = {
  rest: { opacity: 1 },
  hidden: { opacity: 0 },
  play: { opacity: 1, transition: { duration: 0.3, delay: 1.05 } },
};

/* The climb, two honest points: the demo run's checks score before
   and after its merge (the record holds one measured transition,
   no series). Drawn when the report band arrives; the full line is
   the server-rendered state. Used by the morning report band. */
export function ClimbLine() {
  const { ref, armed, playing } = useEntryPlay<HTMLDivElement>(0.4);
  const state = !armed ? "rest" : playing ? "play" : "hidden";
  return (
    <motion.div
      ref={ref}
      className="climb"
      initial="rest"
      animate={state}
      variants={climbContainer}
      aria-hidden="true"
    >
      <svg className="climb-svg" viewBox="0 0 220 76" role="presentation">
        <path className="climb-ghost" d="M10 60 L210 16" />
        <motion.path
          className="climb-line"
          d="M10 60 L210 16"
          variants={climbLineV}
        />
        <motion.g variants={climbDotStartV}>
          <circle className="climb-dot" cx="10" cy="60" r="4" />
          <text className="climb-label" x="10" y="76">
            {demoRun.checksBefore}%
          </text>
        </motion.g>
        <motion.g variants={climbDotEndV}>
          <circle className="climb-halo" cx="210" cy="16" r="6" />
          <circle className="climb-dot is-end" cx="210" cy="16" r="4" />
          <text className="climb-label is-end" x="210" y="76" textAnchor="end">
            {demoRun.checksAfter}%
          </text>
        </motion.g>
      </svg>
    </motion.div>
  );
}
