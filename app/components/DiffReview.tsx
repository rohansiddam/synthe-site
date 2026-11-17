"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { demoRun } from "@/lib/runData";
import "./DiffReview.css";

/* The merge, as a diff review: PR #8's real diff lines stream in one
   by one, hold, then collapse (the clone's Accept-all collapse) into
   the kept summary. Replays whenever `active` goes false then true.
   Reduced motion, or inactive, shows the summary directly. The whole
   cycle runs about 3.4s, inside the 6.5s tab dwell. */

const SIGNS: Record<string, string> = { context: " ", del: "-", add: "+" };

type Phase = "summary" | "streaming" | "collapsing";

export function DiffReview({ active }: { active: boolean }) {
  const diff = demoRun.pullRequest.diff;
  const [phase, setPhase] = useState<Phase>(() =>
    active ? "streaming" : "summary",
  );
  const [visible, setVisible] = useState(0);
  const [collapseH, setCollapseH] = useState(0);
  const rowsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) {
      setPhase("summary");
      setVisible(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("summary");
      return;
    }
    const timers: number[] = [];
    setPhase("streaming");
    setVisible(0);
    const total = demoRun.pullRequest.diff.length;
    for (let i = 0; i < total; i += 1) {
      timers.push(window.setTimeout(() => setVisible(i + 1), 240 + i * 260));
    }
    const allInAt = 240 + total * 260 + 200;
    timers.push(
      window.setTimeout(() => {
        setCollapseH(rowsRef.current?.offsetHeight ?? 0);
        setPhase("collapsing");
      }, allInAt + 1000),
    );
    timers.push(
      window.setTimeout(() => setPhase("summary"), allInAt + 1000 + 540),
    );
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [active]);

  const renderRows = (count: number): ReactNode => (
    <div className={"dr-rows"} ref={rowsRef}>
      {diff.slice(0, count).map((line, i) => (
        <div key={i} className={`${"dr-row"} ${("dr-" + line.kind)}`}>
          <span className={"dr-sign"} aria-hidden="true">
            {SIGNS[line.kind]}
          </span>
          <span className={"dr-text"}>{line.text}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className={"dr-root"}>
      <p className={"dr-record"}>
        {demoRun.repo} · PR #{demoRun.pullRequest.number}
      </p>
      <p className={"dr-title"}>{demoRun.pullRequest.title}</p>
      {phase === "summary" ? (
        <div className={"dr-summary"}>
          <svg
            className={"dr-summaryCheck"}
            viewBox="0 0 12 12"
            aria-hidden="true"
          >
            <path
              d="M2.5 6.2 5 8.5 9.5 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={"dr-kept"}>Kept</span>
          <span className={"dr-summaryText"}>
            {diff.length} lines kept · merged{" "}
            {demoRun.pullRequest.mergedDateLabel}
          </span>
        </div>
      ) : phase === "collapsing" ? (
        <div
          className={"dr-collapser"}
          style={{ "--h": `${collapseH}px` } as CSSProperties}
          aria-hidden="true"
        >
          {renderRows(diff.length)}
        </div>
      ) : (
        renderRows(visible)
      )}
    </div>
  );
}

export default DiffReview;
