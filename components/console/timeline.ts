/* The console replay timeline (Lane N2).
   One pass replays the recorded runs in about 12 seconds, then rests on
   the final state forever (no loop; spec PR B item 3, playbook section
   13's scoped exception). The order is the runs' real chronology: the
   demo run's round 1 merged, and its consequences are the peak; rounds 2
   to 4 then resolve as recorded (no winner, failed, no winner), which is
   the product's discipline story; spend and the report settle last, so
   the end of the loop is the morning report (peak-end rule).
   All state derives from `phase`; components render the final phase by
   default, which is also the server-rendered, reduced-motion, and no-JS
   state (Postel's law). */

export const LOOP_MS = 12000;

/** Phase start times in ms, indexed by phase. Phase 0 is the assembly. */
export const PHASE_STARTS = [0, 900, 3400, 5200, 6900, 8600, 10200] as const;

/** The last phase: everything resolved, the recorded end state. */
export const FINAL_PHASE = PHASE_STARTS.length - 1; // 6

/** The phase the merge lands in: PR flips, checks complete, score lands. */
export const MERGE_PHASE = 2;

/** Demo rounds completed by phase (round 1 completes at the merge beat). */
const ROUNDS_DONE = [0, 0, 1, 1, 2, 3, 4] as const;

export function roundsDone(phase: number): number {
  return ROUNDS_DONE[Math.min(phase, FINAL_PHASE)];
}

/** The demo round currently being tested, or null between rounds. */
export function activeRound(phase: number, playing: boolean): number | null {
  if (!playing) return null;
  if (phase === 1) return 1;
  if (phase >= 3 && phase <= 5) return roundsDone(phase) + 1;
  return null;
}

/** Checks pass from the merge beat on; before it they read as failing. */
export function checksPassing(phase: number): boolean {
  return phase >= MERGE_PHASE;
}

/** How many of the dogfood series' 11 measured points are drawn.
    The line climbs through phase 1 and lands its final point exactly on
    the merge beat; from the beat on it is complete. The timings between
    beat and climb are driven in Console.tsx via SCORE_STEPS. */
export const SCORE_STEPS: ReadonlyArray<{ at: number; drawn: number }> = [
  { at: 1100, drawn: 1 },
  { at: 1400, drawn: 3 },
  { at: 1700, drawn: 4 },
  { at: 2000, drawn: 6 },
  { at: 2300, drawn: 7 },
  { at: 2600, drawn: 9 },
  { at: 2900, drawn: 10 },
  { at: 3150, drawn: 11 },
];

export const SCORE_TOTAL = 11;

/** Spend fills during the last phase, once the rounds have resolved. */
export const SPEND_FILL_AT = 10400;
