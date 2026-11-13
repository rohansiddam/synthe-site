"use client";

import { useEffect, useRef } from "react";
import { DitherMark } from "./DitherMark";
import { clamp } from "./engine";

/* Treatment 3: the tall section. A sticky stage holds the mark while the
   section scrolls past; scroll progress (0 at the stage's arrival, 1 when
   the section is spent) drives the dither resolution from coarse grain to
   fully printed. DitherMark eases toward the target, so the resolve feels
   like focus pulling, not a scrub. */

export function ScrollResolve() {
  const sectionRef = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const pctRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
      progress.current = p;
      if (pctRef.current)
        pctRef.current.textContent = `${Math.round(p * 100)}% scrolled · cell ${
          p < 0.02 ? "coarse" : p > 0.98 ? "fine" : "resolving"
        }`;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section ref={sectionRef} className="dither-scroll" aria-label="Scroll-linked dither study">
      <div className="dither-scroll-stage">
        <p className="dither-read dither-scroll-read">
          <span ref={pctRef}>0% scrolled · cell coarse</span>
        </p>
        <div className="dither-scroll-mark">
          <DitherMark drive="scroll" progressRef={progress} readout={false} />
        </div>
        <p className="dither-scroll-hint">Keep scrolling. The grain resolves as you go.</p>
      </div>
    </section>
  );
}
