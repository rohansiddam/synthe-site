"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { HALF_A, HALF_B } from "../components/Mark";

/* The Thread engine (Lane D3 exploration).
   One record line in the page background. Three mechanics:
   1. Scroll-following draw: framer's useScroll -> a small head start so
      the hero is never empty -> useSpring, so the drawn head trails the
      scroll position fluidly and undraws symmetrically on the way up.
      Drawn with the pathLength=1 + strokeDashoffset technique, offsets
      driven by motion values (no React re-render per scroll frame).
   2. Autonomous travel: a rAF loop walks a short accent segment + dot
      along the already-drawn portion (ping-pong, ~26s per traverse).
      Positions are written straight to DOM refs. The loop freezes when
      the tab is hidden, when the site is motion-paused, or when the
      pulse point is outside the viewport.
   3. Branching: geometry is measured from the real sections at runtime
      (offsets + anchor rects relative to the wrap), rebuilt on resize
      and after fonts settle. Each branch's draw window is the trunk
      head's pass through the branch's fork zone, so a branch completes
      exactly as the trunk passes it. The Report branch carries the
      logo mark: its halves start spread (open) and converge to locked
      as the branch completes.
   Reduced motion: everything renders fully drawn, mark locked, no
   pulse, legend reads static. */

type Fork = {
  id: string;
  d: string;
  y1: number;
  ax: number;
  ay: number;
  markCx: number;
  start: number;
  end: number;
  mark: boolean;
};

type Geom = {
  w: number;
  h: number;
  tx: number;
  top: number;
  bottom: number;
  trunkD: string;
  forks: Fork[];
};

const MARK_BRANCH_ID = "report";

function trunkXFor(width: number) {
  if (width >= 1296 + 96) return (width - 1296) / 2 + 24;
  if (width >= 700) return 18;
  return 11;
}

function buildGeom(
  wrap: HTMLElement,
  secs: (HTMLElement | null)[],
  anchors: (HTMLElement | null)[],
  ids: string[],
): Geom | null {
  const wr = wrap.getBoundingClientRect();
  if (wr.height < 100 || wr.width < 100) return null;
  const tx = trunkXFor(wr.width);
  const top = 10;
  const bottom = wr.height - 10;
  const len = bottom - top;
  const forks: Fork[] = [];

  anchors.forEach((a, i) => {
    const sec = secs[i];
    if (!a || !sec) return;
    const ar = a.getBoundingClientRect();
    const sr = sec.getBoundingClientRect();
    const ax = ar.left - wr.left - 14; // tip stops just short of the visual
    const ay = ar.top - wr.top + ar.height / 2;
    /* Forks leave the trunk below the section's head and copy zone (about
       150px), so a branch never sweeps across the section's own text.
       Short sections fall back to a shallow lens inside whatever band
       remains under the copy. */
    const lo = sr.top - wr.top + 150;
    const hi = sr.top - wr.top + sr.height - 30;
    let y1: number;
    let y2: number;
    if (hi - lo < 140) {
      y1 = lo;
      y2 = hi;
    } else {
      y1 = Math.min(Math.max(ay - 115, lo), hi - 140);
      y2 = Math.min(Math.max(ay + 115, y1 + 140), hi);
      if (y2 <= y1) {
        y1 = lo;
        y2 = hi;
      }
    }
    const dx = Math.max(ax - tx, 48);
    const d = [
      `M ${tx.toFixed(1)},${y1.toFixed(1)}`,
      `C ${(tx + dx * 0.55).toFixed(1)},${y1.toFixed(1)} ${(ax - dx * 0.45).toFixed(1)},${ay.toFixed(1)} ${ax.toFixed(1)},${ay.toFixed(1)}`,
      `C ${(ax - dx * 0.45).toFixed(1)},${(ay + (y2 - ay) * 0.55).toFixed(1)} ${(tx + dx * 0.55).toFixed(1)},${y2.toFixed(1)} ${tx.toFixed(1)},${y2.toFixed(1)}`,
    ].join(" ");
    forks.push({
      id: ids[i],
      d,
      y1,
      ax,
      ay,
      /* The mark sits on the branch before the tip; on narrow screens
         the gutter is too thin for that offset, so clamp it back toward
         the trunk rather than letting it clip off the page edge. */
      markCx: Math.max(ax - 30, 17),
      start: (y1 - top) / len,
      end: (y2 - top) / len,
      mark: ids[i] === MARK_BRANCH_ID,
    });
  });

  return { w: wr.width, h: wr.height, tx, top, bottom, trunkD: `M ${tx},${top} L ${tx},${bottom}`, forks };
}

/** One branch: ghost underneath, drawn stroke on the shared progress,
    a tip dot that turns accent on completion, and (for the report
    branch) the mark locking as the branch completes. */
function Branch({
  fork,
  progress,
  staticAll,
}: {
  fork: Fork;
  progress: MotionValue<number>;
  staticAll: boolean;
}) {
  const dash = useTransform(progress, [fork.start, fork.end], [1, 0]);
  const bp = useTransform(progress, [fork.start, fork.end], [0, 1]);
  const [done, setDone] = useState(staticAll);
  const doneRef = useRef(staticAll);
  useMotionValueEvent(bp, "change", (v) => {
    const d = v >= 0.995;
    if (d !== doneRef.current) {
      doneRef.current = d;
      setDone(d);
    }
  });

  const halfAx = useTransform(bp, [0, 1], [-30, 0]);
  const halfAy = useTransform(bp, [0, 1], [-22, 0]);
  const halfBx = useTransform(bp, [0, 1], [30, 0]);
  const halfBy = useTransform(bp, [0, 1], [22, 0]);
  const markOpacity = useTransform(bp, [0, 0.25], [0, 1]);
  const s = 30 / 275; // mark rendered 30px wide from the 275-unit lockup

  return (
    <g>
      <path d={fork.d} className="thread-ghost" pathLength={1} />
      <motion.path
        d={fork.d}
        className="thread-branch"
        pathLength={1}
        style={{ strokeDasharray: 1, strokeDashoffset: staticAll ? 0 : dash }}
      />
      <circle
        cx={fork.ax}
        cy={fork.ay}
        r={3}
        className="thread-tip"
        fill={done || staticAll ? "var(--accent)" : "var(--line2)"}
      />
      {fork.mark ? (
        /* The mark rides the branch just before its tip, in open
           background: centered on the branch line at (markCx, ay),
           clamped toward the trunk on narrow screens. It must not sit
           under the section's key visual, which is opaque content
           stacked above this layer. */
        <motion.g
          transform={`translate(${(fork.markCx - 137.5 * s).toFixed(1)} ${(fork.ay - 145 * s).toFixed(1)}) scale(${s.toFixed(4)})`}
          style={{ opacity: staticAll ? 1 : markOpacity }}
          aria-hidden="true"
        >
          <motion.g style={{ x: staticAll ? 0 : halfAx, y: staticAll ? 0 : halfAy }}>
            <path d={HALF_A} fill="var(--agent)" />
          </motion.g>
          <motion.g style={{ x: staticAll ? 0 : halfBx, y: staticAll ? 0 : halfBy }}>
            <path d={HALF_B} fill="var(--gold-mark)" />
          </motion.g>
        </motion.g>
      ) : null}
    </g>
  );
}

function Legend({
  scrollMv,
  drawMv,
  fpsRef,
  staticAll,
}: {
  scrollMv: MotionValue<number>;
  drawMv: MotionValue<number>;
  fpsRef: RefObject<number>;
  staticAll: boolean;
}) {
  const [txt, setTxt] = useState("scroll 0% · drawn 0% · fps ···");
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = Math.round(scrollMv.get() * 100);
      const d = Math.round(drawMv.get() * 100);
      setTxt(
        staticAll
          ? `scroll ${s}% · drawn 100% · reduced motion`
          : `scroll ${s}% · drawn ${d}% · ${Math.round(fpsRef.current)} fps`,
      );
    }, 200);
    return () => window.clearInterval(id);
  }, [scrollMv, drawMv, fpsRef, staticAll]);
  return (
    <div className="thread-legend" aria-hidden="true">
      {txt}
    </div>
  );
}

export function ThreadLayer({
  wrapRef,
  sectionRefs,
  anchorRefs,
}: {
  wrapRef: RefObject<HTMLDivElement | null>;
  sectionRefs: RefObject<(HTMLElement | null)[]>;
  anchorRefs: RefObject<(HTMLDivElement | null)[]>;
}) {
  const reduced = useReducedMotion() ?? false;
  const [geom, setGeom] = useState<Geom | null>(null);
  const geomRef = useRef<Geom | null>(null);
  const drawRef = useRef(0);
  const fpsRef = useRef(60);

  const { scrollYProgress } = useScroll();
  const target = useTransform(scrollYProgress, [0, 1], [0.045, 1]);
  const springed = useSpring(target, { stiffness: 90, damping: 24, mass: 0.5 });
  const one = useMotionValue(1);
  const draw = reduced ? one : springed;
  const trunkDash = useTransform(draw, (v) => 1 - v);

  useMotionValueEvent(draw, "change", (v) => {
    drawRef.current = v;
  });

  useEffect(() => {
    geomRef.current = geom;
  }, [geom]);

  /* Measure + rebuild geometry. */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ids = ["console", "example", "how", "steps", "report", "footer"];
    const measure = () => {
      const g = buildGeom(wrap, sectionRefs.current, anchorRefs.current, ids);
      setGeom((prev) => {
        if (
          prev &&
          g &&
          Math.abs(prev.h - g.h) < 1 &&
          Math.abs(prev.w - g.w) < 1 &&
          prev.forks.length === g.forks.length &&
          prev.forks.every((f, i) => Math.abs(f.ay - g.forks[i].ay) < 1)
        ) {
          return prev;
        }
        return g;
      });
    };
    measure();
    const t = window.setTimeout(measure, 350);
    let fontsT: number | undefined;
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        fontsT = window.setTimeout(measure, 30);
      });
    }
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t);
      if (fontsT) window.clearTimeout(fontsT);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [wrapRef, sectionRefs, anchorRefs]);

  /* The autonomous pulse. */
  const segRef = useRef<SVGLineElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);
  const haloRef = useRef<SVGCircleElement | null>(null);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = performance.now();
    let dist = 0;
    let dir = 1;
    const loop = (now: number) => {
      const rawDt = now - last;
      last = now;
      if (rawDt > 0 && rawDt < 250) {
        fpsRef.current = fpsRef.current * 0.95 + (1000 / rawDt) * 0.05;
      }
      const dt = Math.min(rawDt, 50);
      const g = geomRef.current;
      const seg = segRef.current;
      const dot = dotRef.current;
      const halo = haloRef.current;
      if (g && seg && dot && halo) {
        const len = g.bottom - g.top;
        const drawnPx = drawRef.current * len;
        const paused =
          document.hidden || document.documentElement.classList.contains("motion-paused");
        if (dist > drawnPx) dist = Math.max(drawnPx, 0);
        const y = g.top + dist;
        const inView =
          y > window.scrollY - 140 && y < window.scrollY + window.innerHeight + 140;
        if (!paused && drawnPx > 30) {
          dist += dir * (drawnPx / 24000) * dt;
          if (dist >= drawnPx) {
            dist = drawnPx;
            dir = -1;
          } else if (dist <= 0) {
            dist = 0;
            dir = 1;
          }
        }
        const show = !paused && drawnPx > 30 ? "1" : "0";
        const yy = g.top + dist;
        if (inView) {
          /* Rendering writes are skipped while the pulse point is
             off-screen; travel itself continues so the pulse is
             somewhere along the drawn line whenever you look. */
          seg.setAttribute("x1", String(g.tx));
          seg.setAttribute("x2", String(g.tx));
          seg.setAttribute("y1", String(Math.max(yy - 30, g.top)));
          seg.setAttribute("y2", String(yy));
          dot.setAttribute("cx", String(g.tx));
          dot.setAttribute("cy", String(yy));
          halo.setAttribute("cx", String(g.tx));
          halo.setAttribute("cy", String(yy));
        }
        seg.setAttribute("opacity", show);
        dot.setAttribute("opacity", show);
        halo.setAttribute("opacity", show === "1" ? "0.16" : "0");
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <>
      {geom ? (
        <svg
          className="thread-layer"
          width={geom.w}
          height={geom.h}
          viewBox={`0 0 ${geom.w} ${geom.h}`}
          aria-hidden="true"
          focusable="false"
        >
          <path d={geom.trunkD} className="thread-ghost" pathLength={1} />
          <motion.path
            d={geom.trunkD}
            className="thread-trunk"
            pathLength={1}
            style={{ strokeDasharray: 1, strokeDashoffset: reduced ? 0 : trunkDash }}
          />
          {geom.forks.map((f) => (
            <circle key={`n-${f.id}`} cx={geom.tx} cy={f.y1} r={2.5} className="thread-node" />
          ))}
          {geom.forks.map((f) => (
            <Branch key={f.id} fork={f} progress={draw} staticAll={reduced} />
          ))}
          {!reduced ? (
            <g>
              <line ref={segRef} className="thread-pulse-seg" opacity={0} />
              <circle ref={haloRef} r={8} className="thread-pulse-halo" opacity={0} />
              <circle ref={dotRef} r={3} className="thread-pulse-dot" opacity={0} />
            </g>
          ) : null}
        </svg>
      ) : null}
      <Legend scrollMv={scrollYProgress} drawMv={draw} fpsRef={fpsRef} staticAll={reduced} />
    </>
  );
}
