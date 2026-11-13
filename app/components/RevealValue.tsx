"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "./Reveal";

/* A recorded number that REVEALS at its recorded value (integration
   fix, checklist G2). The component this replaces (CountUp) tweened
   0 -> value on entry, so mid-animation frames displayed figures
   that are not in the run record ("85% of the time, up from 69%",
   "$0.31 of a $3 budget") and read as copy. This component never
   changes its text: the server renders the recorded value, no-JS
   and reduced motion keep it untouched, and with motion available
   an off-screen value starts hidden (transparent, blurred, shifted
   a few px) and is revealed in place when it scrolls into view.
   At every instant, the only number on screen is the recorded one. */

export function RevealValue({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const finalText = `${prefix}${value.toFixed(decimals)}${suffix}`;

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    if (document.documentElement.classList.contains("motion-paused")) return;
    if (!("IntersectionObserver" in window)) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // in view at load: stays the record
    el.style.opacity = "0";
    let anim: ReturnType<typeof animate> | null = null;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.disconnect();
          anim = animate(
            el,
            { opacity: [0, 1], y: [5, 0], filter: ["blur(3px)", "blur(0px)"] },
            { duration: 0.7, ease: EASE_OUT },
          );
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      anim?.stop();
      el.style.opacity = "";
    };
  }, [reduce, value, decimals, prefix, suffix]);

  return (
    <span ref={ref} style={{ display: "inline-block" }}>
      {finalText}
    </span>
  );
}
