import { demoRun } from "@/lib/runData";
import { CardHead, RoundState } from "./kit";

/* The run card: the demo run's four rounds, in their recorded order,
   resolving one at a time as the replay reaches them. States render
   as the logo mark in its locked, stale, refused and open states with
   the state word in mono (see RoundState in kit.tsx). The failed
   round reads as failed (never smoothed into a skip), and its cost
   reads as not recorded, because the record says its cost is
   unknown. */

export function RunCard({
  done,
  active,
}: {
  /** Rounds that have resolved in the replay so far. */
  done: number;
  /** The round currently being tested, or null. */
  active: number | null;
}) {
  const readout =
    done >= demoRun.rounds.length
      ? `${demoRun.rounds.length} rounds`
      : `Round ${(active ?? done + 1)} of ${demoRun.rounds.length}`;
  return (
    <>
      <CardHead
        id="console-run-h"
        eyebrow={`${demoRun.label} · ${demoRun.agent}`}
        right={<span className="console-readout">{readout}</span>}
      />
      <ol className="console-rounds">
        {demoRun.rounds.map((r) => {
          const isDone = r.round <= done;
          const isActive = r.round === active;
          return (
            <li
              key={r.round}
              className={
                isDone
                  ? "console-round is-done"
                  : isActive
                    ? "console-round is-active"
                    : "console-round"
              }
            >
              <span className="console-round-n">Round {r.round}</span>
              {isDone ? (
                <RoundState
                  kind={
                    r.outcome === "no winner"
                      ? "no-winner"
                      : r.outcome === "failed"
                        ? "failed"
                        : "merged"
                  }
                />
              ) : isActive ? (
                <RoundState kind="testing" />
              ) : (
                <RoundState kind="queued" />
              )}
              <span className="console-round-cost">
                {r.costUsd === null ? (
                  <span title="The record does not give this round a cost">no cost recorded</span>
                ) : (
                  `$${r.costUsd.toFixed(2)}`
                )}
              </span>
              <span className="console-round-note">{isDone ? r.note : ""}</span>
            </li>
          );
        })}
      </ol>
      <p className="console-meta">{demoRun.stopNote}</p>
    </>
  );
}
