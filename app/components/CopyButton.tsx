"use client";

import { useEffect, useRef, useState } from "react";
import { Mark } from "./Mark";

function CopyIcon() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" />
      <path d="M9.5 4.5V3a1 1 0 0 0-1-1H3a1 1 0 0 0 1 1v5.5a1 1 0 0 0 1 1h1.5" />
    </svg>
  );
}

type CopyButtonProps = {
  /** The exact text that goes to the clipboard. */
  text: string;
  /** pill: the homepage command pill. text: the long agent instruction.
      docs: the ink button in a Docs command row (mark instead of copy icon). */
  variant?: "pill" | "text" | "docs";
  ariaLabel?: string;
};

/* Copy buttons, ported from site.js: the command goes to the clipboard and
   the button reports what actually happened (Copied, or Failed when the
   clipboard is unavailable or refuses). The mark locks on success. */
export function CopyButton({ text, variant = "pill", ariaLabel }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = () => {
    const result = (copied: boolean) => {
      window.clearTimeout(timer.current);
      setState(copied ? "done" : "failed");
      timer.current = window.setTimeout(() => setState("idle"), 2200);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => result(true),
        () => result(false),
      );
    } else {
      result(false);
    }
  };

  const label = state === "done" ? "Copied" : state === "failed" ? "Failed" : "Copy";

  if (variant === "docs") {
    return (
      <button
        className={`copy${state === "done" ? " done" : ""}${state === "failed" ? " failed" : ""}`}
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
      >
        <Mark view="open" state={state === "done" ? "" : "open"} />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      className={`copy${variant === "text" ? " copy-text" : ""}${state === "done" ? " done" : ""}${state === "failed" ? " failed" : ""}`}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? `Copy the command ${text}`}
    >
      {variant === "pill" ? (
        <span className="prompt" aria-hidden="true">
          $
        </span>
      ) : null}
      <code>{text}</code>
      <span className="btn-label">
        <CopyIcon />
        <span>{label}</span>
      </span>
    </button>
  );
}
