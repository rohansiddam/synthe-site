"use client";

import { useEffect, useState } from "react";

/* Back to top: one labeled, stationary button, rendered only on pages
   longer than four screens and shown once the reader is well down (past
   one and a half screens). Ported from site.js, which creates the button
   the same way. */
export function BackToTop() {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (document.documentElement.scrollHeight > window.innerHeight * 4) {
      const raf = requestAnimationFrame(() => setMounted(true));
      const onScroll = () => setShown(window.scrollY >= window.innerHeight * 1.5);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("scroll", onScroll);
      };
    }
  }, []);

  if (!mounted) return null;

  const onClick = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    document.querySelector<HTMLElement>(".wordmark")?.focus({ preventScroll: true });
  };

  return (
    <button type="button" className="to-top" hidden={!shown} onClick={onClick}>
      Back to top
    </button>
  );
}
