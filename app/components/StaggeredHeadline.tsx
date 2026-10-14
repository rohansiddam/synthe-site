"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

type StaggeredHeadlineProps = {
  text: string;
  className?: string;
};

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.024, delayChildren: 0.15 } },
};

const letter: Variants = {
  hidden: { opacity: 0, y: "0.45em" },
  show: {
    opacity: 1,
    y: "0em",
    transition: { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] },
  },
};

export function StaggeredHeadline({ text, className = "" }: StaggeredHeadlineProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <h1 className={className}>{text}</h1>;
  }

  return (
    <motion.h1
      className={className}
      aria-label={text}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {text.split(" ").map((word, wi, words) => (
        <span key={wi}>
          <span aria-hidden="true" className="inline-block whitespace-nowrap">
            {word.split("").map((ch, ci) => (
              <motion.span key={ci} variants={letter} className="inline-block">
                {ch}
              </motion.span>
            ))}
          </span>
          {wi < words.length - 1 ? " " : null}
        </span>
      ))}
    </motion.h1>
  );
}
