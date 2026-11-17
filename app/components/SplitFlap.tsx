"use client";

import { useEffect, useState } from "react";
import { demoRun } from "@/lib/runData";
import "./SplitFlap.css";

/* The morning report as a split-flap board: a port of the clone's
   per-character flap mechanism. Each cell riffles through the
   charset with a flip animation and settles staggered left to
   right, top row first; the whole board settles in about 1.6s.
   Inactive or reduced motion shows the settled lines statically.
   Every number is the demo run's, from lib/runData. */

const CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%$.:→/-";

const LINES: string[] = [
  `CHECKS ${demoRun.checksBefore}% → ${demoRun.checksAfter}%`,
  `HELD-OUT ${demoRun.heldOutBefore}% → ${demoRun.heldOutAfter}%`,
  `SPEND ${demoRun.spendDisplay} OF $${demoRun.budgetUsd}`,
];

export function SplitFlap({ active }: { active: boolean }) {
  const [display, setDisplay] = useState<string[]>(LINES);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!active) {
      setDisplay(LINES);
      setRunning(false);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(LINES);
      setRunning(false);
      return;
    }
    /* Settle time per character: a base riffle, a per-row cascade,
       45ms per column, plus a random tail so tiles land at uneven
       times the way a real board's drums do. */
    const settles = LINES.map((line, r) =>
      Array.from(line, (ch, c) =>
        ch === " " ? 0 : 250 + r * 140 + c * 45 + Math.random() * 260,
      ),
    );
    setRunning(true);
    const start = performance.now();
    const iv = window.setInterval(() => {
      const now = performance.now() - start;
      let done = true;
      const next = LINES.map((line, r) =>
        Array.from(line, (ch, c) => {
          if (ch === " ") return " ";
          if (now >= settles[r][c]) return ch;
          done = false;
          return CHARSET[Math.floor(Math.random() * CHARSET.length)];
        }).join(""),
      );
      setDisplay(next);
      if (done) {
        window.clearInterval(iv);
        setRunning(false);
      }
    }, 55);
    return () => window.clearInterval(iv);
  }, [active]);

  return (
    <div
      className={"sf-board"}
      role="img"
      aria-label={`The morning report, the demo run: ${LINES.join(". ")}`}
    >
      <p className={"sf-header"} aria-hidden="true">
        THE MORNING REPORT · {demoRun.label.toUpperCase()}
      </p>
      <div className={"sf-rows"} aria-hidden="true">
        {display.map((line, r) => (
          <div key={r} className={"sf-row"}>
            {Array.from(line, (ch, c) => {
              const flipping = running && ch !== LINES[r][c];
              return (
                <span
                  key={c}
                  className={
                    flipping
                      ? `${"sf-cell"} ${"sf-cellFlip"}`
                      : "sf-cell"
                  }
                >
                  {ch === " " ? " " : ch}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SplitFlap;
