"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import {
  LOOP_T,
  MARBLE_R,
  CHUTES,
  DELTAS,
  MARBLE_T,
  MARBLE_X,
  MARBLE_Y,
  MARBLE_ROT,
  OP_T,
  OP_V,
  CUP,
} from "./marbleChoreo";

/* ------------------------------------------------------------------ */
/* Moment 2: the marble machine. A perpetual loop — no scroll, no     */
/* story. Four track segments sliced from the real logo outlines      */
/* (PATH_A / PATH_B long bars) tilt on a schedule, tipping a marble   */
/* from groove to groove: drop, roll, tip, arc, catch, repeat.        */
/* Choreography is baked in marbleChoreo.ts (generated).               */
/* ------------------------------------------------------------------ */

const VIEWBOX = "0 0 400 560";

const norm = (t: number[]) => t.map((v) => v / LOOP_T);

function Cup() {
  const { x, y } = CUP;
  return (
    <path
      d={`M ${x - 18} ${y - 17} L ${x - 18} ${y - 3} Q ${x - 18} ${y + 9} ${x} ${y + 9} Q ${x + 18} ${y + 9} ${x + 18} ${y - 3} L ${x + 18} ${y - 17}`}
      fill="none"
      stroke="var(--line)"
      strokeWidth={3}
      strokeLinecap="round"
    />
  );
}

export function MarbleRun({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();

  const mx = useMotionValue(MARBLE_X[0]);
  const my = useMotionValue(MARBLE_Y[0]);
  const mrot = useMotionValue(0);
  const mop = useMotionValue(0);
  const d0 = useMotionValue(0);
  const d1 = useMotionValue(0);
  const d2 = useMotionValue(0);
  const d3 = useMotionValue(0);
  const deltas = [d0, d1, d2, d3];

  useEffect(() => {
    if (reduce) return;
    const t = norm(MARBLE_T);
    const ctrls = [
      animate(mx, MARBLE_X, { duration: LOOP_T, times: t, ease: "linear", repeat: Infinity }),
      animate(my, MARBLE_Y, { duration: LOOP_T, times: t, ease: "linear", repeat: Infinity }),
      animate(mrot, MARBLE_ROT, { duration: LOOP_T, times: t, ease: "linear", repeat: Infinity }),
      animate(mop, OP_V, {
        duration: LOOP_T,
        times: norm(OP_T),
        ease: "linear",
        repeat: Infinity,
      }),
      ...deltas.map((dv, i) =>
        animate(dv, DELTAS[i].deg, {
          duration: LOOP_T,
          times: norm(DELTAS[i].t),
          ease: DELTAS[i].ease as never,
          repeat: Infinity,
        }),
      ),
    ];
    return () => ctrls.forEach((c) => c.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  if (reduce) {
    // Static frame: track assembled, marble resting in the first groove.
    const c = CHUTES[0];
    return (
      <svg viewBox={VIEWBOX} className={className} role="img" aria-label="Marble machine at rest">
        {CHUTES.map((ch) => (
          <path
            key={ch.name}
            d={ch.d}
            fill={ch.fill === "agent" ? "var(--agent)" : "var(--human)"}
          />
        ))}
        <Cup />
        <g transform={`translate(${c.pivot[0] + 52} ${c.pivot[1] + 5})`}>
          <circle r={MARBLE_R} fill="var(--ink)" />
          <circle r={2.6} cx={-3.2} cy={-3.2} fill="var(--bg)" opacity={0.9} />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox={VIEWBOX} className={className} aria-hidden="true">
      {CHUTES.map((ch, i) => (
        <g key={ch.name} transform={`translate(${ch.pivot[0]} ${ch.pivot[1]})`}>
          <motion.g style={{ rotate: deltas[i] }}>
            <g transform={`translate(${-ch.pivot[0]} ${-ch.pivot[1]})`}>
              <path
                d={ch.d}
                fill={ch.fill === "agent" ? "var(--agent)" : "var(--human)"}
              />
            </g>
          </motion.g>
        </g>
      ))}
      <Cup />
      <motion.g style={{ x: mx, y: my, opacity: mop }}>
        <circle r={MARBLE_R} fill="var(--ink)" />
        <motion.g style={{ rotate: mrot }}>
          <circle r={2.6} cx={-3.2} cy={-3.2} fill="var(--bg)" opacity={0.9} />
        </motion.g>
      </motion.g>
    </svg>
  );
}
