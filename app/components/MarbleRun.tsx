"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { PATH_A, PATH_B } from "./Logo";
import { ReceiptCard } from "./ReceiptCard";
import { Eyebrow } from "./Eyebrow";

/* ------------------------------------------------------------------ */
/* Moment 2: the marble run. A handoff (the marble) drops into the     */
/* logo's dovetail channel, rolls through three checkpoints, seats    */
/* the joint, survives a pull test, and ends as a signed receipt.      */
/* The logo paths are the exact brand geometry, imported from Logo.    */
/* The viewBox extends above the mark so the drop starts in-frame.     */
/* ------------------------------------------------------------------ */

const VIEWBOX = "-40 -110 355 440";
const ROT_CX = 137;
const ROT_CY = 145;

/* Marble route, keyframed on scroll progress in viewBox coordinates.
   The channel is the diagonal seam between the halves: from the mouth
   at top-right (186, 26) down to the seat at (90, 212). */
const P = [
  0, 0.08, 0.11, 0.125, 0.14, 0.22, 0.3, 0.38, 0.46, 0.54, 0.6, 0.66, 0.7,
  0.715, 0.73, 0.86, 1,
];
const MX = [
  170, 182, 186, 186, 186, 176, 170, 152, 135, 120, 105, 96, 90, 90, 90, 90,
  90,
];
const MY = [
  -100, -20, 26, 17, 26, 72, 102, 126, 148, 168, 187, 200, 212, 205, 212,
  212, 212,
];

const CHECKPOINTS = [
  { x: 170, y: 102, t: 0.3, label: "signature" },
  { x: 135, y: 148, t: 0.46, label: "approval" },
  { x: 105, y: 187, t: 0.6, label: "evidence" },
];

const BEATS = [
  "drop · a handoff enters the system",
  "guide · the broker steers, never touching",
  "checkpoints · signature, approval, evidence",
  "seating · the joint locks. accept.",
  "pull test · tug it. it holds.",
  "receipt · every run ends as evidence",
];

function beatIndex(v: number) {
  return v < 0.14 ? 0 : v < 0.3 ? 1 : v < 0.62 ? 2 : v < 0.73 ? 3 : v < 0.86 ? 4 : 5;
}

function Checkpoint({
  x,
  y,
  t,
  label,
  p,
}: {
  x: number;
  y: number;
  t: number;
  label: string;
  p: MotionValue<number>;
}) {
  const lit = useTransform(p, [t - 0.015, t + 0.015], [0, 1]);
  const glow = useTransform(lit, [0, 1], [0, 0.28]);
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={20}
        fill="none"
        stroke="var(--line)"
        strokeWidth={2}
      />
      <motion.circle
        cx={x}
        cy={y}
        r={20}
        fill="none"
        stroke="var(--human)"
        strokeWidth={2.5}
        style={{ opacity: lit }}
      />
      <motion.circle
        cx={x}
        cy={y}
        r={28}
        fill="none"
        stroke="var(--human)"
        strokeWidth={1.5}
        style={{ opacity: glow }}
      />
      <motion.text
        x={x}
        y={y + 38}
        textAnchor="middle"
        fontSize={11}
        fill="var(--muted)"
        className="font-mono"
        style={{ opacity: lit }}
      >
        {label}
      </motion.text>
    </g>
  );
}

function Half({
  d,
  fill,
  tx,
  ty,
  tugX,
  tugY,
  tilt,
}: {
  d: string;
  fill: string;
  tx: MotionValue<number>;
  ty: MotionValue<number>;
  tugX: MotionValue<number>;
  tugY: MotionValue<number>;
  tilt: MotionValue<number>;
}) {
  return (
    <motion.g style={{ x: tx, y: ty }}>
      <motion.g style={{ x: tugX, y: tugY }}>
        <motion.g
          style={{
            rotate: tilt,
            transformBox: "view-box",
            transformOrigin: `${ROT_CX}px ${ROT_CY}px`,
          }}
        >
          <path d={d} fill={fill} />
        </motion.g>
      </motion.g>
    </motion.g>
  );
}

function AnimatedMarble() {
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  /* Marble along its route. */
  const marbleX = useTransform(p, P, MX);
  const marbleY = useTransform(p, P, MY);

  /* Seating: halves travel from apart (open) to seated across 0.55-0.68. */
  const seatT = useTransform(p, [0.55, 0.68], [0, 1]);
  const ax = useTransform(seatT, [0, 1], [-30, 0]);
  const ay = useTransform(seatT, [0, 1], [-22, 0]);
  const bx = useTransform(seatT, [0, 1], [30, 0]);
  const by = useTransform(seatT, [0, 1], [22, 0]);

  /* Pull test: a tug apart and back across 0.72-0.86. */
  const tug = useTransform(p, [0.72, 0.79, 0.86], [0, 1, 0]);
  const tugAx = useTransform(tug, [0, 1], [0, -9]);
  const tugAy = useTransform(tug, [0, 1], [0, -7]);
  const tugBx = useTransform(tug, [0, 1], [0, 9]);
  const tugBy = useTransform(tug, [0, 1], [0, 7]);

  /* Guide: the halves tilt a few degrees in opposition, as if steering. */
  const tiltA = useTransform(p, [0.14, 0.25, 0.36, 0.46], [0, 2, -2, 0]);
  const tiltB = useTransform(p, [0.14, 0.25, 0.36, 0.46], [0, -2, 2, 0]);

  /* Seam flash: flares as the joint seats, shimmers under the pull test. */
  const flash = useTransform(
    p,
    [0.6, 0.68, 0.74, 0.79, 0.86, 0.95],
    [0, 0.85, 0.25, 0.6, 0.15, 0]
  );

  /* Receipt beat: the logo group lifts and shrinks to free space below,
     then the receipt settles into that space. The caption fades out just
     before the receipt arrives, so no text ever lands on the receipt. */
  const logoLift = useTransform(p, [0.86, 0.95], [0, -100]);
  const logoShrink = useTransform(p, [0.86, 0.95], [1, 0.8]);
  const captionO = useTransform(p, [0.81, 0.85], [1, 0]);
  const receiptY = useTransform(p, [0.86, 0.95], [64, 0]);
  const receiptO = useTransform(p, [0.86, 0.93], [0, 1]);

  const [beat, setBeat] = useState(0);
  useMotionValueEvent(p, "change", (v) => setBeat(beatIndex(v)));

  return (
    <div ref={trackRef} className="relative h-[340vh]">
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden px-6">
        <p className="sr-only">
          A marble drops into the Synthe logo channel, rolls through three
          checkpoints, seats the dovetail joint, holds under a pull test, and
          ends as a signed receipt.
        </p>

        <div className="mb-1 text-center" aria-hidden="true">
          <Eyebrow>the handoff, visualized</Eyebrow>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
            Watch a handoff get checked.
          </h2>
        </div>

        {/* logo group: lifts and shrinks during the receipt beat to free
            space below for the receipt */}
        <motion.div style={{ y: logoLift, scale: logoShrink }}>
          <svg
            viewBox={VIEWBOX}
            className="h-[50svh] w-auto max-w-[94vw]"
            aria-hidden="true"
          >
          {/* hairline of crimson light along the seam */}
          <motion.line
            x1={186}
            y1={28}
            x2={90}
            y2={212}
            stroke="var(--human)"
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ opacity: flash }}
          />

          <Half
            d={PATH_A}
            fill="var(--agent)"
            tx={ax}
            ty={ay}
            tugX={tugAx}
            tugY={tugAy}
            tilt={tiltA}
          />
          <Half
            d={PATH_B}
            fill="var(--human)"
            tx={bx}
            ty={by}
            tugX={tugBx}
            tugY={tugBy}
            tilt={tiltB}
          />

          {CHECKPOINTS.map((c) => (
            <Checkpoint key={c.label} p={p} {...c} />
          ))}

          {/* the marble: the handoff */}
          <motion.g style={{ x: marbleX, y: marbleY }}>
            <circle
              r={14}
              fill="var(--ink)"
              stroke="var(--line)"
              strokeWidth={1.5}
            />
            <circle cx={-4.5} cy={-5} r={4} fill="#ffffff" opacity={0.35} />
          </motion.g>
          </svg>
        </motion.div>

        <motion.div
          className="mt-2 flex h-7 items-center justify-center"
          style={{ opacity: captionO }}
          aria-hidden="true"
        >
          <motion.p
            key={beat}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="font-mono text-[13px] lowercase text-muted"
          >
            {BEATS[beat]}
          </motion.p>
        </motion.div>

        {/* receipt: settles into the space freed by the lifted logo group */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center"
          aria-hidden="true"
        >
          <motion.div
            style={{ y: receiptY, opacity: receiptO }}
            className="w-full max-w-[300px]"
          >
            <ReceiptCard
              number="0043"
              from="agent/marble-run"
              to="main"
              meta="1 handoff, 3 checks passed, committed once"
              timestamp="printed just now"
              signature="7a1e...c4"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StaticMarble() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-24 text-center">
      <Eyebrow className="mb-4">the handoff, visualized</Eyebrow>
      <h2 className="text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
        Watch a handoff get checked.
      </h2>
      <svg
        viewBox={VIEWBOX}
        className="mx-auto mt-8 h-[46svh] w-auto max-w-[94vw]"
        role="img"
        aria-label="The Synthe mark seated, a marble resting in its joint, three checkpoints lit crimson"
      >
        <g>
          <path d={PATH_A} fill="var(--agent)" />
        </g>
        <g>
          <path d={PATH_B} fill="var(--human)" />
        </g>
        <line
          x1={186}
          y1={28}
          x2={90}
          y2={212}
          stroke="var(--human)"
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.25}
        />
        {CHECKPOINTS.map((c) => (
          <g key={c.label}>
            <circle
              cx={c.x}
              cy={c.y}
              r={20}
              fill="none"
              stroke="var(--human)"
              strokeWidth={2.5}
            />
            <text
              x={c.x}
              y={c.y + 38}
              textAnchor="middle"
              fontSize={11}
              fill="var(--muted)"
              className="font-mono"
            >
              {c.label}
            </text>
          </g>
        ))}
        <g transform="translate(90 212)">
          <circle
            r={14}
            fill="var(--ink)"
            stroke="var(--line)"
            strokeWidth={1.5}
          />
          <circle cx={-4.5} cy={-5} r={4} fill="#ffffff" opacity={0.35} />
        </g>
      </svg>
      <p className="mx-auto mt-8 max-w-xl leading-relaxed text-muted">
        A handoff enters the system as a marble. The broker guides it through
        three checks, signature, approval, evidence, then seats the dovetail
        joint. The joint holds under a pull test, and every run ends as a
        signed receipt.
      </p>
      <div className="mx-auto mt-8 w-full max-w-[300px]">
        <ReceiptCard
          number="0043"
          from="agent/marble-run"
          to="main"
          meta="1 handoff, 3 checks passed, committed once"
          timestamp="printed just now"
          signature="7a1e...c4"
        />
      </div>
    </section>
  );
}

export function MarbleRun() {
  const reduce = useReducedMotion();
  if (reduce) return <StaticMarble />;
  return <AnimatedMarble />;
}
