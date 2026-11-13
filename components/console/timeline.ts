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

/* ------------------------------------------------------------------ */
/* Lane V2: every card lives internally. The cues below are the      */
/* per-card choreography layered on the same cycle; each is a time   */
/* on the play segment, and Console.tsx drives them off the same     */
/* conductor, so pause, resume and reset apply to all of them at     */
/* once. Nothing here changes what the record says, only when each   */
/* card shows the part of the record it already carries.             */
/* ------------------------------------------------------------------ */

/** The checks flip one at a time off the merge beat, in the order
    synthe.json lists them: the beat lands, then each check settles
    in turn over the following ~900ms. The record holds only the
    aggregate (72% to 89%, rule breaks 2 to 0), so the flips are the
    beat's punctuation, never per-check claims. */
export const CHECK_FLIP_AT = [3400, 3620, 3840, 4060] as const;

/** How many checks have flipped by cycle time t. */
export function checksFlipped(t: number): number {
  let n = 0;
  for (const at of CHECK_FLIP_AT) if (t >= at) n++;
  return n;
}

/** The PR card's diff composes while round 1 is being tested: the
    lines activate one by one and the last one lands just before the
    merge beat flips the pill. The draw runs on a motion value in
    Console.tsx, 0..(number of diff lines). */
export const DIFF_AT = 1150;
export const DIFF_MS = 2200;

/** Spend accumulates per round, at the moment each round resolves
    (the phase starts on PHASE_STARTS), over a short eased tween.
    Round 3 recorded no cost, so its step holds the total where it
    was; that hold is the record, not a gap. Console.tsx computes
    the cumulative targets from lib/runData.ts; the final target is
    the recorded total spend, not the sum of the rounded parts. */
export const SPEND_STEP_MS = 750;

/** The report prints at the end of the play: headline first, then
    its lines in sequence, settling into the rest beat (peak-end). */
export const REPORT_AT = 10600;
