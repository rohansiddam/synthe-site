"use client";

import { useEffect, useRef, useState } from "react";
import "./InstallTerminal.css";

/* The install terminal: a calm, looping typing sequence.
   Behaviour follows the terminal reference studied in
   ~/workspace/reel-clones/data-surfaces/ (sequence runs only while the
   window is in view, output lines fade and settle in). That reference
   has no cursor at all, so this one uses a steady block cursor with at
   most a very slow soft pulse, never a hard blink.
   The loop: type the command, pause, print the two files the setup
   writes, print the closing line, hold, fade out, restart. */

const COMMAND = "npx synthe@latest init";

const OUTPUT_LINES = [
  "  synthe.json · your checks, in your repo",
  "  .github/workflows/synthe.yml · the improvement loop",
  "  Setup complete.",
] as const;

const TYPE_MS = 34;
const PAUSE_AFTER_TYPE_MS = 500;
const LINE_GAP_MS = 120;
const HOLD_MS = 4500;
const FADE_MS = 450;

export function InstallTerminal() {
  const rootRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef(0);
  const runIdRef = useRef(0);
  const runningRef = useRef(false);

  const [typed, setTyped] = useState(0);
  const [shownLines, setShownLines] = useState(0);
  const [fading, setFading] = useState(false);
  const [staticEnd, setStaticEnd] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setStaticEnd(true);
      setTyped(COMMAND.length);
      setShownLines(OUTPUT_LINES.length);
      return;
    }

    const clearTimer = () => window.clearTimeout(timerRef.current);

    const schedule = (runId: number, delay: number, fn: () => void) => {
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        if (runIdRef.current !== runId || !runningRef.current) return;
        fn();
      }, delay);
    };

    const startCycle = (runId: number) => {
      setFading(false);
      setTyped(0);
      setShownLines(0);

      const typeStep = (count: number) => {
        schedule(runId, TYPE_MS + (Math.random() * 12 - 6), () => {
          const next = count + 1;
          setTyped(next);
          if (next < COMMAND.length) {
            typeStep(next);
          } else {
            schedule(runId, PAUSE_AFTER_TYPE_MS, () => showLine(0, runId));
          }
        });
      };

      const showLine = (index: number, id: number) => {
        setShownLines(index + 1);
        if (index + 1 < OUTPUT_LINES.length) {
          schedule(id, LINE_GAP_MS, () => showLine(index + 1, id));
        } else {
          schedule(id, HOLD_MS, () => {
            setFading(true);
            schedule(id, FADE_MS, () => {
              if (runIdRef.current !== id || !runningRef.current) return;
              startCycle(id);
            });
          });
        }
      };

      typeStep(0);
    };

    const start = () => {
      if (runningRef.current) return;
      runningRef.current = true;
      const runId = runIdRef.current + 1;
      runIdRef.current = runId;
      startCycle(runId);
    };

    const stop = () => {
      runningRef.current = false;
      runIdRef.current += 1;
      clearTimer();
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
        else stop();
      },
      { threshold: 0.3 },
    );
    io.observe(root);

    return () => {
      stop();
      io.disconnect();
    };
  }, []);

  const endState = staticEnd;
  const visibleTyped = endState ? COMMAND.length : typed;
  const visibleLines = endState ? OUTPUT_LINES.length : shownLines;

  return (
    <div className={"it-terminal"} ref={rootRef}>
      <span className={"it-srOnly"}>
        Terminal showing the install command: npx synthe@latest init
      </span>
      <div className={"it-header"} aria-hidden="true">
        <span className={`${"it-dot"} ${"it-dotA"}`} />
        <span className={`${"it-dot"} ${"it-dotB"}`} />
        <span className={`${"it-dot"} ${"it-dotC"}`} />
        <span className={"it-title"}>terminal · your repo</span>
      </div>
      <div
        className={fading ? `${"it-body"} ${"it-fading"}` : "it-body"}
        aria-hidden="true"
      >
        <p className={"it-commandLine"}>
          <span className={"it-prompt"}>$</span>{" "}
          <span>{COMMAND.slice(0, visibleTyped)}</span>
          {visibleLines === 0 ? <span className={"it-cursor"} /> : null}
        </p>
        {OUTPUT_LINES.slice(0, visibleLines).map((line, index) => (
          <p className={"it-outputLine"} key={line}>
            {line}
            {index === visibleLines - 1 ? <span className={"it-cursor"} /> : null}
          </p>
        ))}
      </div>
    </div>
  );
}

export default InstallTerminal;
