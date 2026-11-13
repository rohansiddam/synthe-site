"use client";

import {
  AnimatePresence,
  motion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { demoRun, type DiffLine } from "@/lib/runData";
import { CardHead } from "./kit";

/* The PR card: the demo run's real merge, PR #8 in synthelabs/support-bot.
   GitHub's own conventions throughout (Jakob's law): a state pill that
   reads Open, then Merged; a unified diff with line numbers, red removals
   and green additions in soft tints. The diff lines are the kept lines of
   the change the PR actually made to prompt.md, verbatim excerpts of the
   recorded before/after prompts (see lib/runData.ts). Lane V2: while
   round 1 is being tested the diff composes line by line on a motion
   value (each line eases from dim to full as the change is written),
   and at the merge beat the additions flash once as the pill flips,
   the card's one shared-element-style transition (C3): the same pill,
   in the same place, becoming the merged state at the loop's peak.
   GitHub's merged purple is deliberately not imported: on this site the
   stoplight language (C2) gives merged to the success token, and the
   accent never means success. */

function PrGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="console-pr-glyph">
      <path
        fill="currentColor"
        d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 1.5 1.5H9.25a5.734 5.734 0 0 1-1.272.552A4.25 4.25 0 1 0 5.45 5.154Zm3.046 5.474a2.25 2.25 0 1 1-4.493-.096 4.368 4.368 0 0 1-.373-1.032H6.75a.75.75 0 1 0 0-1.5H3.612a4.372 4.372 0 0 1-.373 1.037 2.25 2.25 0 0 1 5.257 1.465ZM4.252 2.003a1.75 1.75 0 1 0 .096 4.493 1.75 1.75 0 0 0-.096-4.493Z"
      />
    </svg>
  );
}

function StatePill({ merged }: { merged: boolean }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={merged ? "merged" : "open"}
        className={merged ? "console-pr-state is-merged" : "console-pr-state is-open"}
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

/** One diff line, activated by the composition value: line i runs
    from dim to full as the value crosses i..i+1, with a small settle
    from the left. Motion-value driven, so composing costs no React
    renders. At rest (value at its max) every line reads full. */
function DiffRow({
  line,
  index,
  diff,
}: {
  line: DiffLine;
  index: number;
  diff: MotionValue<number>;
}) {
  const opacity = useTransform(diff, [index, index + 1], [0.22, 1]);
  const x = useTransform(diff, [index, index + 1], [6, 0]);
  return (
    <motion.div className={`console-diff-line is-${line.kind}`} style={{ opacity, x }}>
      <span className="console-diff-sign" aria-hidden="true">
        {line.kind === "add" ? "+" : line.kind === "del" ? "−" : " "}
      </span>
      <span className="console-diff-text">{line.text}</span>
    </motion.div>
  );
}

export function PullRequestCard({
  merged,
  diff,
}: {
  merged: boolean;
  /** Composition position, 0..(diff lines). Starts at max: the
      recorded, merged diff, fully written. */
  diff: MotionValue<number>;
}) {
  const pr = demoRun.pullRequest;
  return (
    <>
      <CardHead
        id="console-pr-h"
        eyebrow={`The merge · ${demoRun.repo}`}
        right={<StatePill merged={merged} />}
      />
      <p className="console-pr-title">
        {pr.title} <span className="console-pr-num">#{pr.number}</span>
      </p>
      <div
        className={merged ? "console-diff is-merged" : "console-diff"}
        role="img"
        aria-label={`Diff of prompt.md in pull request ${pr.number}: ${pr.fullTitle}`}
      >
        {pr.diff.map((line, i) => (
          <DiffRow key={i} line={line} index={i} diff={diff} />
        ))}
      </div>
      <p className="console-meta">
        prompt.md · Merged {pr.mergedDateLabel} ·{" "}
        <a className="textlink" href={pr.url}>
          See PR #{pr.number}
        </a>
      </p>
    </>
  );
}
