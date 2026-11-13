"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/* The hero, scroll-tied (Lane N5): as the hero leaves the viewport
   it drifts down a touch and dims, scrubbed by scroll position
   rather than fired once, so the first screen hands over to the
   console instead of cutting away. Transform and opacity only, and
   at scroll position zero the values are the identity, so the
   server-rendered hero is pixel-identical (Postel's law) and
   reduced motion simply never subscribes. */

export function HeroDrift({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 18]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.3]);
  return (
    <motion.section
      ref={ref}
      className="hero wrap"
      id="start"
      style={reduce ? undefined : { y, opacity }}
    >
      {children}
    </motion.section>
  );
}
