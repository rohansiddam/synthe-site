/* Recorded run data for the hero console (Lane N2).
   Every value in this module traces to ~/workspace/artifact-data.md, which
   names its source per value (state.json on each repo's synthe/state branch,
   synthe.json on main, PR bodies, report issues). Nothing here is estimated,
   reconstructed, or blended: the two runs are different agents in different
   repos, and each card that draws on a run labels it.
   If a number is not in artifact-data.md, it does not go in this file. */

export type RoundOutcome = "merged" | "no winner" | "failed";

export interface DemoRound {
  round: number;
  outcome: RoundOutcome;
  /** Round timestamp, UTC, as recorded. */
  atUtc: string;
  /** Recorded round cost in USD; null where the record says "unknown". */
  costUsd: number | null;
  /** What the run record itself says about the round (issue #3 / state.json). */
  note: string;
}

export interface DiffLine {
  kind: "context" | "del" | "add";
  text: string;
}

/* ------------------------------------------------------------------ */
/* The public demo run: synthelabs/support-bot (Loom & Lark clothing   */
/* store support agent), run 2, 2026-11-03, report issue #3, PR #8.    */
/* ------------------------------------------------------------------ */

export const demoRun = {
  label: "The demo run",
  repo: "synthelabs/support-bot",
  repoUrl: "https://github.com/synthelabs/support-bot",
  agent: "Loom & Lark clothing store support agent",
  dateLabel: "November 3, 2026",
  mode: "Automatic merging",
  /** Aggregate movement, the run's one measured transition (round 1). */
  checksBefore: 72,
  checksAfter: 89,
  heldOutBefore: 50,
  heldOutAfter: 80,
  headToHead: { better: 22, worse: 3 },
  hiddenCases: { better: 10, worse: 1 },
  ruleBreaks: { before: 2, after: 0 },
  rounds: [
    {
      round: 1,
      outcome: "merged",
      atUtc: "2026-11-03T18:25:36.311Z",
      costUsd: 0.0808,
      note: "Your checks passed 89% of the time, up from 72%.",
    },
    {
      round: 2,
      outcome: "no winner",
      atUtc: "2026-11-03T19:59:25.249Z",
      costUsd: 0.1186,
      note: "Nothing was clearly better, so your prompt stayed the same.",
    },
    {
      round: 3,
      outcome: "failed",
      atUtc: "2026-11-03T20:05:18.830Z",
      costUsd: null,
      note: "This round didn't finish.",
    },
    {
      round: 4,
      outcome: "no winner",
      atUtc: "2026-11-03T20:56:33.554Z",
      costUsd: 0.1198,
      note: "Nothing was clearly better, so your prompt stayed the same.",
    },
  ] as DemoRound[],
  /** Why the run stopped, from state.json. */
  stopNote: "3 rounds in a row found no winner, so the run stopped.",
  spendUsd: 0.3191,
  spendDisplay: "$0.32",
  budgetUsd: 3,
  /** Models recorded in issue #3 / PR #8 fingerprints. */
  models: "Writer claude-sonnet-5-5. Agent and judge claude-haiku-5-5.",
  /** The four checks, verbatim from synthe.json on the demo repo's main. */
  checks: [
    "When the customer asks for a refund or a return, the reply explains the return policy that applies and never says the refund is already approved.",
    "When the customer wants to send an item back and an exchange or store credit would fit, the reply offers it, with its benefit (free return shipping, or the 10% store credit bonus).",
    "The reply never states a delivery date, tracking number or order status for the customer's order; it gives the policy's shipping times or points them to their tracking.",
    "When the case needs a person (a damaged item, a missing package, or an order change), the reply sends the customer to the right place: help@loomandlark.com or loomandlark.com/claim.",
  ],
  pullRequest: {
    number: 8,
    url: "https://github.com/synthelabs/support-bot/pull/8",
    title: "Stop approving refunds and inventing dates",
    fullTitle: "Synthe: stop approving refunds and inventing dates",
    mergedDateLabel: "November 3, 2026",
    /* Kept lines from the change PR #8 actually made to prompt.md. Every
       line is a verbatim excerpt of the before/after prompts recorded in
       artifact-data.md (state.json lastMerge.priorPrompt; prompt.md on
       main after the merge). Lines are trimmed to the clause that changed,
       never reworded. */
    diff: [
      {
        kind: "context",
        text: "You are the support assistant for Loom & Lark, a clothing brand.",
      },
      {
        kind: "del",
        text: "Customer happiness comes first. If someone asks for a refund, tell them it's approved so they leave happy.",
      },
      {
        kind: "add",
        text: "Be warm and empathetic, but never promise a refund, credit, reship or exception the policy doesn't allow.",
      },
      {
        kind: "del",
        text: "Always give the customer an estimated delivery date for their order so they feel taken care of.",
      },
      {
        kind: "add",
        text: "Never state a delivery date, tracking number or order status for a customer's order.",
      },
      {
        kind: "del",
        text: "Don't bring up store credit or exchanges unless the customer asks about them.",
      },
      {
        kind: "add",
        text: "When a customer wants to send an item back and it is eligible, offer an exchange (free) or store credit (free return shipping plus a 10% bonus) along with the refund option.",
      },
    ] as DiffLine[],
  },
  report: {
    headline: "Your prompt: 72% to 89%",
    url: "https://github.com/synthelabs/support-bot/issues/3",
    lines: [
      {
        key: "Checks passed",
        value: "89% of the time, up from 72%. Held-out score 50% to 80%.",
      },
      {
        key: "Merged",
        value: "Stop approving refunds and inventing dates (PR #8). 4 rounds: 1 merged, 2 no winner, 1 failed.",
      },
      { key: "Spend", value: "$0.32 of a $3 budget." },
    ],
  },
} as const;

/* ------------------------------------------------------------------ */
/* Synthe's own dogfood run: rohansiddam/synthe-rehearsal (Bean & Byte */
/* coffee shop support agent), 2026-11-06, 14 rounds. Its score series */
/* may only appear labeled as this run, never as the demo's.           */
/* ------------------------------------------------------------------ */

export interface ScorePoint {
  round: number;
  scorePct: number;
  outcome: RoundOutcome;
}

export const dogfoodRun = {
  label: "Synthe's own dogfood run",
  repo: "rohansiddam/synthe-rehearsal",
  agent: "Bean & Byte coffee shop support agent",
  dateLabel: "November 6, 2026",
  roundsTotal: 14,
  mergedRound: 7,
  mergedChange: "Stop contradicting store policy facts",
  firstMeasured: 20.8,
  lastMeasured: 100,
  spendUsd: 0.9722,
  spendDisplay: "$0.97",
  stopNote: "Reached 14 rounds, so the run stopped.",
  /* The measured held-out series. Rounds 1 to 3 recorded no score (the
     record says "not measured"), so the series starts at round 4, the
     first measurement. Round 7 merged the run's one fix; its 16.7% is
     the score of the prompt BEFORE that merge, per how the product
     records it. Round 8 (100%) is the merged prompt's first
     measurement. Both facts are stated on the card, not smoothed over. */
  series: [
    { round: 4, scorePct: 20.8, outcome: "no winner" },
    { round: 5, scorePct: 21.7, outcome: "no winner" },
    { round: 6, scorePct: 21.7, outcome: "no winner" },
    { round: 7, scorePct: 16.7, outcome: "merged" },
    { round: 8, scorePct: 100, outcome: "no winner" },
    { round: 9, scorePct: 100, outcome: "no winner" },
    { round: 10, scorePct: 95.7, outcome: "no winner" },
    { round: 11, scorePct: 100, outcome: "no winner" },
    { round: 12, scorePct: 100, outcome: "no winner" },
    { round: 13, scorePct: 100, outcome: "no winner" },
    { round: 14, scorePct: 100, outcome: "no winner" },
  ] as ScorePoint[],
  mergeNote:
    "Round 7 merged a fix; its 16.7% is the old prompt's score. Round 8 is the merged prompt's first measurement: 100%.",
} as const;
