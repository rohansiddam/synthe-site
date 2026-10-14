"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { PATH_A, PATH_B } from "./Logo";
import { LOOP_T, MARBLE_R, PIVOT, sample } from "./marbleChoreo";

/* ------------------------------------------------------------------ */
/* Moment 2: the marble machine. THE ASSEMBLED LOGO IS THE MACHINE.   */
/*                                                                    */
/* The two halves (PATH_A/B) stay in logo formation for the entire   */
/* loop — motion is limited to the Logo component's own open/seated   */
/* offsets plus +/-5 deg rocking around the joint. Choreography:          */
/*   open → marble drops into A's groove → A tips, marble rolls to    */
/*   the joint → halves seat (pixel-identical canonical logo, held),  */
/*   groove → B tips, marble rolls out the bottom → halves reopen.     */
/*                                                                    */
/* The marble is CONTACT-PARENTED: its position is baked from the      */
/* groove-surface transforms (same math as the SVG transform below),  */
/* so it cannot float. Pours are solved ballistic arcs. No linear     */
/* easing on the marble — gravity ease-in, micro-bounce landings,      */
/* accelerating rolls. Auto-playing loop, no scroll dependency.       */
/* ------------------------------------------------------------------ */

const VIEWBOX = "-40 -70 355 400";
// A_mouthC in logo coords (from the choreography generator) for the static frame.
const STATIC_MARBLE: [number, number] = [207.3, 52.0];

function Marble({ r = MARBLE_R }: { r?: number }) {
  return (
    <>
      <circle r={r} fill="var(--ink)" stroke="var(--bg)" strokeWidth={2} />
      <circle
        r={r * 0.24}
        cx={-r * 0.3}
        cy={-r * 0.3}
        fill="var(--bg)"
        opacity={0.9}
      />
    </>
  );
}

export function MarbleRun({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  const gA = useRef<SVGGElement>(null);
  const gAi = useRef<SVGGElement>(null);
  const gB = useRef<SVGGElement>(null);
  const gBi = useRef<SVGGElement>(null);
  const gM = useRef<SVGGElement>(null);
  const gHl = useRef<SVGGElement>(null);
  const lastX = useRef<number | null>(null);
  const rot = useRef(0);

  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, LOOP_T, {
      duration: LOOP_T,
      ease: "linear",
      repeat: Infinity,
      onUpdate: (t) => {
        // f: [t, offAx, offAy, tipA, offBx, offBy, tipB, mx, my, mop]
        const f = sample(t);
        // When all half transforms are exactly zero (the seated hold),
        // drop the transform attributes entirely so the render is
        // pixel-identical to the canonical logo (no AA shift from
        // identity transforms).
        if (
          f[1] === 0 && f[2] === 0 && f[3] === 0 &&
          f[4] === 0 && f[5] === 0 && f[6] === 0
        ) {
          gA.current?.removeAttribute("transform");
          gAi.current?.removeAttribute("transform");
          gB.current?.removeAttribute("transform");
          gBi.current?.removeAttribute("transform");
        } else {
          gA.current?.setAttribute(
            "transform",
            `translate(${f[1].toFixed(2)} ${f[2].toFixed(2)})`
          );
          gAi.current?.setAttribute(
            "transform",
            `rotate(${f[3].toFixed(2)} ${PIVOT[0]} ${PIVOT[1]})`
          );
          gB.current?.setAttribute(
            "transform",
            `translate(${f[4].toFixed(2)} ${f[5].toFixed(2)})`
          );
          gBi.current?.setAttribute(
            "transform",
            `rotate(${f[6].toFixed(2)} ${PIVOT[0]} ${PIVOT[1]})`
          );
        }
        gM.current?.setAttribute(
          "transform",
          `translate(${f[7].toFixed(2)} ${f[8].toFixed(2)})`
        );
        gM.current?.setAttribute("opacity", f[9].toFixed(3));
        // rolling highlight: accumulate from horizontal travel
        if (lastX.current !== null && f[9] > 0.5) {
          const dx = f[7] - lastX.current;
          if (Math.abs(dx) < 60) {
            rot.current -= (dx / MARBLE_R) * (180 / Math.PI);
            gHl.current?.setAttribute(
              "transform",
              `rotate(${rot.current.toFixed(1)})`
            );
          }
        }
        lastX.current = f[7];
      },
    });
    return () => controls.stop();
  }, [reduce]);

  if (reduce) {
    // Static frame: assembled logo, marble resting in A's groove.
    return (
      <svg
        viewBox={VIEWBOX}
        className={className}
        role="img"
        aria-label="Synthe logo with a marble resting in the upper groove"
      >
        <path d={PATH_A} fill="var(--agent)" />
        <path d={PATH_B} fill="var(--human)" />
        <g transform={`translate(${STATIC_MARBLE[0]} ${STATIC_MARBLE[1]})`}>
          <Marble />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox={VIEWBOX} className={className} aria-hidden="true">
      <g ref={gA} transform="translate(-30 -22)">
        <g ref={gAi}>
          <path d={PATH_A} fill="var(--agent)" />
        </g>
      </g>
      <g ref={gB} transform="translate(30 22)">
        <g ref={gBi}>
          <path d={PATH_B} fill="var(--human)" />
        </g>
      </g>
      <g ref={gM} transform="translate(177.29 -45)" opacity="0">
        <circle r={MARBLE_R} fill="var(--ink)" stroke="var(--bg)" strokeWidth={2} />
        <g ref={gHl}>
          <circle
            r={MARBLE_R * 0.24}
            cx={-MARBLE_R * 0.3}
            cy={-MARBLE_R * 0.3}
            fill="var(--bg)"
            opacity={0.9}
          />
        </g>
      </g>
    </svg>
  );
}
