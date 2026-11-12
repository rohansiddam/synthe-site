"use client";

import { useState } from "react";

const OPTIONS = [
  { label: "Automatic", out: "Automatic merges land on your default branch." },
  { label: "Review", out: "Each win waits in a pull request for you." },
] as const;

/* "You choose how wins land": a real toggle that says what each choice does.
   Review is the pressed state on load, as on the static page. */
export function SegControl() {
  const [selected, setSelected] = useState(1);
  return (
    <>
      <div className="seg" role="group" aria-label="How wins land">
        {OPTIONS.map((option, i) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={selected === i ? "true" : "false"}
            onClick={() => setSelected(i)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="seg-out" id="seg-out" aria-live="polite">
        {OPTIONS[selected].out}
      </p>
    </>
  );
}
