import { demoRun } from "@/lib/runData";
import { CardHead } from "./kit";

/* The checks card: the demo run's four checks, verbatim from its
   synthe.json, in the mono treatment the site already uses for them.
   Before the merge beat they read as failing (the old prompt's replies
   broke them; the run's recorded rule breaks went 2 to 0 and its checks
   score rose 72% to 89% at the merge), and they flip to passing as the
   merged round lands, staggered so the completion reads as one beat.
   The card claims no per-check percentages: the record holds only the
   aggregate, which the report card carries. */

/* The glyphs are the site's own, not an icon set: the bare tick is
   the Tick mark the how-it-works list uses, and the cross is the
   same stroke hand without a badge circle around either. */
function CheckMark({ passing }: { passing: boolean }) {
  return passing ? (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="console-check-icon is-pass">
      <path
        d="M2.5 6.2 5 8.5 9.5 3.5"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="console-check-icon is-fail">
      <path
        d="M3 3l6 6M9 3L3 9"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChecksCard({ passing }: { passing: boolean }) {
  const passedCount = passing ? demoRun.checks.length : 0;
  return (
    <>
      <CardHead
        id="console-checks-h"
        eyebrow="The checks · synthe.json · demo run"
        right={
          <span className="console-readout">
            {passedCount}/{demoRun.checks.length} passing
          </span>
        }
      />
      <ol className="console-checks">
        {demoRun.checks.map((check, i) => (
          <li
            key={i}
            className={passing ? "console-check is-pass" : "console-check is-fail"}
            style={{ transitionDelay: passing ? `${i * 90}ms` : "0ms" }}
          >
            <CheckMark passing={passing} />
            <span>{check}</span>
          </li>
        ))}
      </ol>
      <p className="console-meta">
        Rule breaks in the run's replies: {demoRun.ruleBreaks.before} before the merge,{" "}
        {demoRun.ruleBreaks.after} after.
      </p>
    </>
  );
}
