"use client";

import { motion, type Variants } from "framer-motion";
import { demoRun } from "@/lib/runData";
import { EASE_OUT } from "./Reveal";
import { CheckGlyph, StatePill, useEntryPlay, useFlip } from "./Scenes";
import { HoverArrow, Mark } from "./Mark";

/* The worked example (Lane V1): the demo run's one change, played at
   full width under the hero. The diff of PR #8 reveals line by line;
   the four checks then flip from the old prompt's failures to
   passing, the pill lands on Merged, and the verdict draws the
   run's one measured climb: checks passed 72% to 89% (two honest
   points, before and after the merge; the record holds no series
   for this run). It plays once when scrolled into view, then rests
   on the record with only the merge mark breathing, so the console
   above stays the page's one looping peak. The server renders the
   finished record: no-JS and reduced motion see the complete
   example, and the pre-paint arming step is the only thing that
   ever hides a line. */

const diffBox: Variants = {
  rest: {},
  hidden: {},
  play: { transition: { staggerChildren: 0.42, delayChildren: 0.25 } },
};
const diffLineV: Variants = {
  rest: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: 8 },
  play: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};
const verdictV: Variants = {
  rest: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: 12 },
  play: { opacity: 1, y: 0, transition: { delay: 3.8, duration: 0.6, ease: EASE_OUT } },
};
const climbV: Variants = {
  rest: { pathLength: 1 },
  hidden: { pathLength: 0 },
  play: {
    pathLength: 1,
    /* One smooth sine-in-out (cubic-bezier(0.37, 0, 0.63, 1), the
       bezier form of GSAP's sine.inOut): the same curve as the
       console's and the report band's climbs. */
    transition: { delay: 3.95, duration: 0.9, ease: [0.37, 0, 0.63, 1] },
  },
};
/* The markers land in sequence with the draw: the start point as
   the line leaves it, the end point as the line reaches it (draw
   runs 3.95 to 4.85), never before the line does. */
const climbDotStartV: Variants = {
  rest: { opacity: 1 },
  hidden: { opacity: 0 },
  play: { opacity: 1, transition: { delay: 3.95, duration: 0.2 } },
};
const climbDotEndV: Variants = {
  rest: { opacity: 1 },
  hidden: { opacity: 0 },
  play: { opacity: 1, transition: { delay: 4.75, duration: 0.3 } },
};

export function WorkedExample() {
  const { ref, armed, playing } = useEntryPlay<HTMLElement>(0.3);
  const passing = useFlip(armed, playing, 3300);
  const state = !armed ? "rest" : playing ? "play" : "hidden";
  const pr = demoRun.pullRequest;
  return (
    <motion.figure ref={ref} className="wx" initial="rest" animate={state}>
      <figcaption className="wx-cap">
        <span className="wx-label">The worked example</span>
        <span className="wx-cap-note">
          {demoRun.agent} · {demoRun.repo}
        </span>
        <a className="arrow-link" href={demoRun.repoUrl}>
          See the run on GitHub <HoverArrow />
        </a>
      </figcaption>
      <div className="wx-grid">
        <div className="wx-file">
          <div className="wx-file-chrome">
            <span className="wx-file-name">prompt.md</span>
            <span className="wx-pill">
              <StatePill merged={passing} />
            </span>
          </div>
          <motion.div
            className="wx-diff"
            data-port="diff"
            variants={diffBox}
            role="img"
            aria-label={`Diff of prompt.md in pull request ${pr.number}: ${pr.fullTitle}`}
          >
            {pr.diff.map((line, i) => (
              <motion.div key={i} className={`wx-diff-line is-${line.kind}`} variants={diffLineV}>
                <span className="wx-diff-sign" aria-hidden="true">
                  {line.kind === "add" ? "+" : line.kind === "del" ? "−" : " "}
                </span>
                <span className="wx-diff-text">{line.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
        <div className="wx-side">
          <p className="wx-side-label">The checks · synthe.json</p>
          <ol className="wx-checks">
            {demoRun.checks.map((check, i) => (
              <li
                key={i}
                className={passing ? "wx-check is-pass" : "wx-check is-fail"}
                style={{ transitionDelay: passing ? `${i * 90}ms` : "0ms" }}
              >
                <CheckGlyph passing={passing} />
                <span>{check}</span>
              </li>
            ))}
          </ol>
          <motion.div className="wx-verdict" variants={verdictV}>
            <div className="wx-climb">
              <svg className="wx-climb-svg" viewBox="0 0 260 84" aria-hidden="true">
                <path className="wx-climb-ghost" d="M10 66 L250 18" />
                <motion.path className="wx-climb-line" d="M10 66 L250 18" variants={climbV} />
                <motion.g variants={climbDotStartV}>
                  <circle className="wx-dot" cx="10" cy="66" r="4" />
                </motion.g>
                <text className="wx-axis" x="10" y="82">
                  {demoRun.checksBefore}%
                </text>
                <motion.g variants={climbDotEndV}>
                  <circle className="wx-dot" cx="250" cy="18" r="4" />
                </motion.g>
                <text className="wx-axis" x="250" y="82" textAnchor="end">
                  {demoRun.checksAfter}%
                </text>
              </svg>
              <Mark className="wx-merge-mark" />
            </div>
            <p className="wx-verdict-line">
              <span className="wx-kept">Merged</span>
              <span>
                Checks passed {demoRun.checksAfter}% of the time, up from {demoRun.checksBefore}
                %. Held-out score {demoRun.heldOutBefore}% to {demoRun.heldOutAfter}%.
              </span>
            </p>
            <p className="wx-verdict-meta">
              PR #{pr.number} · merged {pr.mergedDateLabel} · spend {demoRun.spendDisplay} of a $
              {demoRun.budgetUsd} budget
            </p>
          </motion.div>
        </div>
      </div>
    </motion.figure>
  );
}
