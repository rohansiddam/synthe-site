"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

/* Scroll choreography (Lane N5): every major section enters once,
   when it scrolls into view, with an eased fade and small rise;
   children stagger 55ms apart and overlap, rather than marching in
   blocks. The pattern that keeps Postel's law: every component
   renders in the "rest" state, fully visible, on the server and on
   first paint. Only after mount, and only for elements still below
   the fold, does the root switch to "hidden" and arm an observer;
   elements already in view never animate at all. So no-JS,
   reduced-motion, and pre-hydration all show the complete page,
   and nothing ever pops: the hidden state is set while the element
   is off-screen. Transform and opacity only. */

export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

type RevealState = "rest" | "hidden" | "show";

/* A root that only orchestrates: its own box stays put while its
   items stagger in. */
const rootVariants: Variants = {
  rest: { opacity: 1, y: 0 },
  hidden: { opacity: 1, y: 0 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.055, delayChildren: 0.04 },
  },
};

/* A root that is itself the animated surface (Docs blocks, the
   report band, the docs hero). */
const soloVariants: Variants = {
  rest: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

const itemVariants: Variants = {
  rest: { opacity: 1, y: 0 },
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

function useRevealRoot<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const reduce = useReducedMotion();
  const [state, setState] = useState<RevealState>("rest");
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    if (document.documentElement.classList.contains("motion-paused")) return;
    if (!("IntersectionObserver" in window)) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // already in view: stays still
    setState("hidden");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setState("show");
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);
  return { ref, state };
}

type RootProps = {
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
  solo?: boolean;
  children?: ReactNode;
  [key: `data-${string}`]: string | undefined;
};

type ItemProps = {
  className?: string;
  id?: string;
  children?: ReactNode;
};

export function RevealSection({ solo = false, ...props }: RootProps) {
  const { ref, state } = useRevealRoot<HTMLElement>();
  return (
    <motion.section
      ref={ref}
      initial="rest"
      animate={state}
      variants={solo ? soloVariants : rootVariants}
      {...props}
    />
  );
}

function RevealDivRoot({ solo = false, ...props }: RootProps) {
  const { ref, state } = useRevealRoot<HTMLDivElement>();
  return (
    <motion.div
      ref={ref}
      initial="rest"
      animate={state}
      variants={solo ? soloVariants : rootVariants}
      {...props}
    />
  );
}

export function RevealDiv({
  root = false,
  solo = false,
  ...props
}: RootProps & { root?: boolean }) {
  if (root) return <RevealDivRoot solo={solo} {...props} />;
  return <motion.div initial="rest" variants={itemVariants} {...props} />;
}

export function RevealH2(props: ItemProps) {
  return <motion.h2 initial="rest" variants={itemVariants} {...props} />;
}

export function RevealP(props: ItemProps) {
  return <motion.p initial="rest" variants={itemVariants} {...props} />;
}

export function RevealArticle(props: ItemProps) {
  return <motion.article initial="rest" variants={itemVariants} {...props} />;
}

export function RevealLi(props: ItemProps) {
  return <motion.li initial="rest" variants={itemVariants} {...props} />;
}
