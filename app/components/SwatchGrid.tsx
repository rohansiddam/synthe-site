"use client";

import { motion } from "framer-motion";

const swatches: { name: string; light: string; dark: string; kind: "fill" | "line" }[] = [
  { name: "bg", light: "#f6f0e8", dark: "#131110", kind: "fill" },
  { name: "bg2", light: "#efe7dc", dark: "#1a1715", kind: "fill" },
  { name: "card", light: "#fbf7f1", dark: "#1e1a17", kind: "fill" },
  { name: "line", light: "#e2d8cb", dark: "#2e2824", kind: "line" },
  { name: "line2", light: "#cfc3b4", dark: "#3d3631", kind: "line" },
  { name: "ink", light: "#1b1613", dark: "#f2eadf", kind: "fill" },
  { name: "ink-soft", light: "#3d352e", dark: "#d9cfc2", kind: "fill" },
  { name: "muted", light: "#5d544c", dark: "#ab9f92", kind: "fill" },
  { name: "faint", light: "#6a6056", dark: "#978b7f", kind: "fill" },
  { name: "agent", light: "#1b1613", dark: "#f2eadf", kind: "fill" },
  { name: "human", light: "#b5402f", dark: "#e06a57", kind: "fill" },
  { name: "human-text", light: "#a63a2a", dark: "#ec7d6b", kind: "fill" },
  { name: "human-bg", light: "#f6dfd8", dark: "#3a1f1a", kind: "fill" },
  { name: "ok", light: "#26663b", dark: "#8fc9a0", kind: "fill" },
  { name: "red", light: "#b3401f", dark: "#f2665a", kind: "fill" },
];

export function SwatchGrid() {
  return (
    <motion.div
      className="grid grid-cols-3 gap-4 sm:grid-cols-5"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
    >
      {swatches.map((s) => (
        <motion.div
          key={s.name}
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
          }}
        >
          <div
            className="h-16 rounded-xl border border-line"
            style={
              s.kind === "fill"
                ? { backgroundColor: `var(--${s.name})` }
                : { backgroundColor: "var(--card)", border: `4px solid var(--${s.name})` }
            }
            aria-hidden="true"
          />
          <p className="mt-2 font-mono text-xs text-ink">{s.name}</p>
          <p className="font-mono text-[11px] leading-relaxed text-faint">
            {s.light}
            <br />
            {s.dark}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}
