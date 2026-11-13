import { demoRun } from "@/lib/runData";
import { CardHead } from "./kit";

/* The checks card: the demo run's four checks, verbatim from its
   synthe.json, in the mono treatment the site already uses for them.
   Before the merge beat they read as failing (the old prompt's replies
   broke them; the run's recorded rule breaks went 2 to 0 and its checks
   score rose 72% to 89% at the merge), and as the merged round lands
   they settle one at a time, in the order synthe.json lists them: each
   glyph crossfades from the cross to the tick, the row flashes once as
   it settles, and the header count walks up with the flips. Lane V2:
   the flips are individual events on the cycle timeline (timeline.ts),
   not one boolean; the record holds only the aggregate, so the card
   claims no per-check percentages, which the report card carries. */

/* The glyphs are the site's own, not an icon set: the bare tick is
   the Tick mark the how-it-works list uses, and the cross is the
   same stroke hand without a badge circle around either. Both live
   in the DOM and crossfade, so a flip is a morph, not a swap. */
function CheckGlyph({ passing }: { passing: boolean }) {
  return (
    <span className={passing ? "console-check-glyph is-pass" : "console-check-glyph is-fail"}>
      <svg viewBox="0 0 12 12" aria-hidden="true" className="console-check-icon is-pass-icon">
        <path
          d="M2.5 6.2 5 8.5 9.5 3.5"
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg viewBox="0 0 12 12" aria-hidden="true" className="console-check-icon is-fail-icon">
        <path d="M3 3l6 6M9 3L3 9" fill="none" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function ChecksCard({ flipped }: { flipped: number }) {
  return (
    <>
      <CardHead
        id="console-checks-h"
        eyebrow="The checks · synthe.json · demo run"
        right={
          <span className="console-readout">
            <span key={flipped} className="console-count-pop">
              {flipped}
            </span>
            /{demoRun.checks.length} passing
          </span>
        }
      />
      <ol className="console-checks">
        {demoRun.checks.map((check, i) => {
          const passing = i < flipped;
          return (
            <li key={i} className={passing ? "console-check is-pass" : "console-check is-fail"}>
              <CheckGlyph passing={passing} />
              <span>{check}</span>
            </li>
          );
        })}
      </ol>
      <p className="console-meta">
        Rule breaks in the run's replies: {demoRun.ruleBreaks.before} before the merge,{" "}
        {demoRun.ruleBreaks.after} after.
      </p>
    </>
  );
}
