"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const OPTIONS = [
  { label: "Automatic", out: "Automatic merges land on your default branch." },
  { label: "Review", out: "Each win waits in a pull request for you." },
] as const;

/* "You choose how wins land": a real toggle that says what each choice does.
   Review is the pressed state on load, as on the static page.
   Lane N5: the pressed state's ink is a thumb that slides between the
   two segments on one eased tween (a shared element, playbook C3),
   instead of the fill snapping from one button to the other. With
   reduced motion the thumb is a plain span: it is simply where the
   pressed state is. */
export function SegControl() {
  const [selected, setSelected] = useState(1);
  const reduce = useReducedMotion();
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
            {selected === i ? (
              reduce ? (
                <span className="seg-thumb" aria-hidden="true" />
              ) : (
                <motion.span
                  className="seg-thumb"
                  aria-hidden="true"
                  layoutId="seg-thumb"
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                />
              )
            ) : null}
            <span className="seg-label">{option.label}</span>
          </button>
        ))}
      </div>
      <p className="seg-out" id="seg-out" aria-live="polite">
        {OPTIONS[selected].out}
      </p>
    </>
  );
}
