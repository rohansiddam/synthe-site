"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/* The hero, scroll-tied (Lane N5; moved to the GSAP chassis in the
   home-design renovation): as the hero leaves the viewport it drifts
   down a touch and dims, scrubbed by scroll position through
   ScrollTrigger rather than fired once, so the first screen hands
   over to the console instead of cutting away. Transform and opacity
   only; at scroll position zero the tween sits at its identity, so
   the server-rendered hero is pixel-identical (Postel's law), and
   reduced motion (or the site's motion-paused opt-out) never arms
   the tween at all. */

export function HeroDrift({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.documentElement.classList.contains("motion-paused")) return;
    gsap.registerPlugin(ScrollTrigger);
    const tween = gsap.to(el, {
      y: 18,
      opacity: 0.3,
      ease: "none",
      scrollTrigger: {
        trigger: el,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(el, { clearProps: "opacity,transform" });
    };
  }, []);

  return (
    <section ref={ref} className="hero wrap" id="start">
      {children}
    </section>
  );
}
