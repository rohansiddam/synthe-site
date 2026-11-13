"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "./Reveal";

/* A recorded number that counts up to itself when it scrolls into
   view (Lane N5). The server renders the recorded value, so no-JS
   and reduced motion read the real figure. With motion available,
   an off-screen element is first set to zero (while nobody can see
   it), then, on entry, one eased tween runs the value up: a strong
   ease-out, so it travels fast and settles softly onto the recorded
   number instead of ticking digit by digit. Animation only: the
   end value is always the recorded one. */

export function CountUp({
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
  const format = (v: number) => `${prefix}${v.toFixed(decimals)}${suffix}`;
  const finalText = format(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    if (document.documentElement.classList.contains("motion-paused")) return;
    if (!("IntersectionObserver" in window)) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // in view at load: stays the record
    el.textContent = format(0);
    let tween: ReturnType<typeof animate> | null = null;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.disconnect();
          tween = animate(0, value, {
            duration: 1.25,
            ease: EASE_OUT,
            onUpdate: (v) => {
              el.textContent = format(v);
            },
            onComplete: () => {
              el.textContent = finalText;
            },
          });
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      tween?.stop();
      el.textContent = finalText;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, value, decimals, prefix, suffix]);

  return <span ref={ref}>{finalText}</span>;
}
