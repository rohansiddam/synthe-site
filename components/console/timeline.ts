/* The console cycle timeline (Lane N2, lifecycle reworked by Lane N5).
   The console is JUST PLAYING: a self-running loop with no controls.
   One cycle is: assemble (first entry only) -> play the recorded runs
   in about 12 seconds -> hold on the final recorded state for a 5s
   rest beat -> a smooth eased reset back to the start -> play again.
   The rest is a beat inside the cycle, not an end state. Off-screen
   the cycle pauses mid-beat and resumes where it left off when the
   console returns to view. The order is the runs' real chronology:
   the demo run's round 1 merged, and its consequences are the peak;
   rounds 2 to 4 then resolve as recorded (no winner, failed, no
   winner), which is the product's discipline story; spend and the
   report settle last, so the end of the play is the morning report
   (peak-end rule).
   All state derives from `phase`, plus two continuous motion values
   (the score draw and the spend fill) that Console.tsx drives with
   eased tweens on this timeline. Components render the final phase
   by default, which is also the server-rendered, reduced-motion,
   and no-JS state (Postel's law). */

/** The play segment: the recorded runs resolve over ~12s. */
export const LOOP_MS = 12000;

/** The rest beat inside the cycle: the finished record holds, 5s. */
export const HOLD_MS = 5000;

/** The reset segment: states ease back to the start of the record. */
export const RESET_MS = 800;

/** One full cycle: play, rest beat, reset. */
export const CYCLE_MS = LOOP_MS + HOLD_MS + RESET_MS;

/** Phase start times in ms, indexed by phase. Phase 0 is the assembly. */
export const PHASE_STARTS = [0, 900, 3400, 5200, 6900, 8600, 10200] as const;

/** The last phase: everything resolved, the recorded end state. */
export const FINAL_PHASE = PHASE_STARTS.length - 1; // 6

/** The phase the merge lands in: PR flips, checks complete, score lands. */
export const MERGE_PHASE = 2;

/** The phase in effect at cycle time t (play segment only). */
export function phaseAt(t: number): number {
  let p = 0;
  for (let i = 0; i < PHASE_STARTS.length; i++) {
    if (t >= PHASE_STARTS[i]) p = i;
  }
  return p;
}

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

/** The score draw: a continuous climb, not point-to-point steps.
    It starts just after the assembly (DRAW_AT), eases over DRAW_MS,
    and lands its final point exactly as the merge phase begins
    (1100 + 2300 = 3400 = PHASE_STARTS[MERGE_PHASE]). The draw value
    runs 0..DRAW_UNITS along the recorded polyline; ScoreCard turns
    it into a clip edge, so the line interpolates smoothly between
    points. */
export const DRAW_AT = 1100;
export const DRAW_MS = 2300;

/** Draw units: the series has 11 measured points, so the head runs
    from point 0 to point 10 along the segments between them. */
export const DRAW_UNITS = 10;

/** Spend fills during the last phase, once the rounds have resolved. */
export const SPEND_FILL_AT = 10400;
export const SPEND_MS = 900;
