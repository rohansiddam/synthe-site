"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { HALF_A, HALF_B } from "./Mark";

/* The Thread, integrated on the homepage (Lane T2).
   One record line runs the full height of the page in the background,
   in the gutter, behind content. Three mechanics, ported from the D3
   exploration (app/thread on lane/thread) and rebuilt around a walker:

   1. Scroll-following draw: framer's useScroll -> useSpring, so the
      drawn head trails the scroll position fluidly and undraws
      symmetrically on the way up. The head start is not a constant: it
      is set from the measured geometry so the console branch is already
      complete when the page loads (the hero is never empty, and the
      walker has somewhere to go before any scrolling happens).
   2. Branching: fork geometry is measured from the real sections at
      runtime. Positions come from offset chains (layout truth), not
      getBoundingClientRect, so the Reveal sections' entrance transforms
      never pollute a measurement. Each branch's draw window is the
      trunk head's pass through the branch's fork zone, so a branch
      completes exactly as the trunk passes it. Forks leave the trunk
      below each section's copy zone, per D3's fork hygiene; on the real
      rail most key visuals start a few px from the trunk, so the lenses
      are shallow and the walker's visit carries the read.
   3. The walker: an autonomous traveler (accent trail + dot + halo,
      carrying a small mark) that walks the DRAWN portion of the trunk
      on its own cycle. It takes every fully drawn branch it reaches:
      out to the key visual, a beat at the tip, back to the trunk, then
      down to the next fork. On the report branch its arrival seals the
      mark (halves converge to locked and stay locked). At the bottom
      it rests, fades, and starts again from the top, the same
      play / rest / reset grammar as the console loop. It freezes when
      the tab is hidden or the site is motion-paused, and if the line
      undraws beneath it (scroll up) it fades out and reappears at the
      drawn head.
   All walker motion is written straight to DOM refs from one rAF
   loop: no React re-renders per frame. Reduced motion: the whole
   system renders statically drawn, mark locked, no walker. */

type Fork = {
  id: string;
  d: string;
  y1: number;
  y2: number;
  ax: number;
  ay: number;
  start: number;
  end: number;
  mark: boolean;
  markW: number;
};

type Geom = {
  w: number;
  h: number;
  tx: number;
  top: number;
  bottom: number;
  trunkD: string;
  forks: Fork[];
  wrapTopDoc: number;
  headStart: number;
};

const MARK_FORK_ID = "report";

/* Section + key-visual hooks on the real homepage, in page order. */
const FORK_SPEC: { id: string; sec: string; anchor: string }[] = [
  { id: "console", sec: ".stage", anchor: ".cell-score" },
  { id: "example", sec: ".wx", anchor: ".wx-diff" },
  { id: "how", sec: ".cards .card", anchor: ".scene-file" },
  { id: "steps", sec: "#start-tonight", anchor: "#start-tonight .step .copy" },
  { id: "report", sec: ".report-band", anchor: ".report-band-lines" },
  { id: "footer", sec: ".site-foot", anchor: ".footer-brand" },
];

function gutterFor(w: number) {
  return w > 960 ? 48 : w > 640 ? 32 : 24;
}

function trunkXFor(w: number) {
  const rail = Math.max(0, (w - 1296) / 2);
  return rail + gutterFor(w) / 2;
}

/* Layout position of el relative to wrap, from the offset chain.
   Immune to transforms (Reveal entrances) by construction. */
function relBox(el: HTMLElement, wrap: HTMLElement) {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== wrap) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  if (n !== wrap) return null;
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

function buildGeom(wrap: HTMLElement): Geom | null {
  const w = wrap.offsetWidth;
  const h = wrap.offsetHeight;
  if (w < 100 || h < 100) return null;
  const tx = trunkXFor(w);
  const top = 10;
  const bottom = h - 10;
  const len = bottom - top;
  const markW = Math.min(30, Math.max(20, gutterFor(w) * 0.62));
  const forks: Fork[] = [];

  for (const spec of FORK_SPEC) {
    const sec = wrap.querySelector<HTMLElement>(spec.sec);
    const anchor = wrap.querySelector<HTMLElement>(spec.anchor);
    if (!sec || !anchor) continue;
    const sb = relBox(sec, wrap);
    const ab = relBox(anchor, wrap);
    if (!sb || !ab) continue;
    /* The tip stops just short of the visual, but never left of the
       trunk: on narrow rails the visual starts almost at the trunk,
       so the tip settles a few px right of it instead. */
    const ax = Math.max(ab.x - 14, tx + 6);
    const ay = ab.y + ab.h / 2;
    /* Forks leave the trunk below the section's head and copy zone
       (about 150px), so a branch never sweeps across the section's own
       text. Short containers (report band, footer) fall back to a
       shallow lens centred on the anchor. */
    const lo = sb.y + 150;
    const hi = sb.y + sb.h - 30;
    let y1: number;
    let y2: number;
    if (hi - lo >= 140 && ay > lo + 30 && ay < hi - 30) {
      y1 = Math.min(Math.max(ay - 115, lo), hi - 140);
      y2 = Math.min(Math.max(ay + 115, y1 + 140), hi);
      if (y2 <= y1 + 60) {
        y1 = lo;
        y2 = hi;
      }
    } else {
      y1 = Math.max(top + 6, ay - 55);
      y2 = Math.min(bottom - 6, ay + 65);
      if (y2 - y1 < 60) y1 = Math.max(top + 6, y2 - 60);
    }
    const dx = Math.max(ax - tx, 10);
    const d = [
      `M ${tx.toFixed(1)},${y1.toFixed(1)}`,
      `C ${(tx + dx * 0.55).toFixed(1)},${y1.toFixed(1)} ${(ax - dx * 0.45).toFixed(1)},${ay.toFixed(1)} ${ax.toFixed(1)},${ay.toFixed(1)}`,
      `C ${(ax - dx * 0.45).toFixed(1)},${(ay + (y2 - ay) * 0.55).toFixed(1)} ${(tx + dx * 0.55).toFixed(1)},${y2.toFixed(1)} ${tx.toFixed(1)},${y2.toFixed(1)}`,
    ].join(" ");
    forks.push({
      id: spec.id,
      d,
      y1,
      y2,
      ax,
      ay,
      start: (y1 - top) / len,
      end: (y2 - top) / len,
      mark: spec.id === MARK_FORK_ID,
      markW,
    });
  }

  const rect = wrap.getBoundingClientRect();
  return {
    w,
    h,
    tx,
    top,
    bottom,
    trunkD: `M ${tx},${top} L ${tx},${bottom}`,
    forks,
    wrapTopDoc: rect.top + window.scrollY,
    /* Draw far enough at scroll 0 for the first (console) branch to
       be complete: the hero is never empty and the walker has
       somewhere to go before any scrolling happens. */
    headStart: forks.length
      ? Math.min(0.25, Math.max(0.045, forks[0].end + 0.01))
      : 0.045,
  };
}

/** One branch: ghost underneath, drawn stroke on the shared progress,
    a tip dot that turns accent on completion, and (for the report
    branch) the mark riding the fork as a seal on the trunk. The seal
    sits at the brand's open spread while it waits, and the walker's
    arrival is what closes it: lock follows the walker's progress out
    the branch, and once the walker has sealed it, it stays locked. */
function Branch({
  fork,
  tx,
  progress,
  staticAll,
  walkerLock,
  sealed,
  pathRefCb,
}: {
  fork: Fork;
  tx: number;
  progress: MotionValue<number>;
  staticAll: boolean;
  walkerLock: MotionValue<number>;
  sealed: boolean;
  pathRefCb: (id: string, el: SVGPathElement | null) => void;
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

  const sealedRef = useRef(sealed);
  useEffect(() => {
    sealedRef.current = sealed;
  }, [sealed]);
  const lock = useMotionValue(staticAll ? 1 : 0);
  useMotionValueEvent(walkerLock, "change", () => {
    lock.set(sealedRef.current ? 1 : walkerLock.get());
  });
  useEffect(() => {
    lock.set(sealedRef.current ? 1 : walkerLock.get());
  }, [sealed, walkerLock, lock]);

  const halfAx = useTransform(lock, [0, 1], [-30, 0]);
  const halfAy = useTransform(lock, [0, 1], [-22, 0]);
  const halfBx = useTransform(lock, [0, 1], [30, 0]);
  const halfBy = useTransform(lock, [0, 1], [22, 0]);
  const markOpacity = useTransform(bp, [0, 0.25], [0, 1]);
  const s = fork.markW / 275;

  return (
    <g>
      <path d={fork.d} className="thread-ghost" pathLength={1} />
      <motion.path
        d={fork.d}
        className="thread-branch"
        pathLength={1}
        ref={(el: SVGPathElement | null) => pathRefCb(fork.id, el)}
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
        /* The seal sits on the trunk at the fork, centred on the line:
           the one place beside the branch that is open background at
           every width, sized to stay inside the gutter. */
        <motion.g
          transform={`translate(${(tx - 137.5 * s).toFixed(1)} ${(fork.ay - 145 * s).toFixed(1)}) scale(${s.toFixed(4)})`}
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

/* Walker tuning. Trunk travel is velocity-based (cruise with soft
   accel/braking so arrivals land gently); branch legs are duration
   based with an ease, so the tip arrival is exact. */
const WALK_CRUISE = 125; // px/s down the trunk
const WALK_ACCEL = 520; // px/s^2, also the braking rate
const BRANCH_SPEED = 175; // px/s along a branch
const TIP_PAUSE_MS = 950;
const REST_MS = 2600;

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clampNum = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type WalkerMode = "trunk" | "out" | "pause" | "back" | "rest";

export function ThreadLayer() {
  const reduced = useReducedMotion() ?? false;
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [geom, setGeom] = useState<Geom | null>(null);
  const geomRef = useRef<Geom | null>(null);
  const drawRef = useRef(0);
  const branchEls = useRef(new Map<string, SVGPathElement>());
  const walkerLock = useMotionValue(0);
  const [reportSealed, setReportSealed] = useState(false);
  const onSeal = useCallback(() => setReportSealed(true), []);

  const { scrollYProgress } = useScroll();
  const target = useTransform(scrollYProgress, [0, 1], [geom?.headStart ?? 0.045, 1]);
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

  const pathRefCb = (id: string, el: SVGPathElement | null) => {
    if (el) branchEls.current.set(id, el);
    else branchEls.current.delete(id);
  };

  /* Measure + rebuild geometry (same cadence as D3: on mount, after
     fonts settle, on resize and whenever the wrap changes size, which
     covers the mobile console expansion changing the page height). */
  useEffect(() => {
    const layer = layerRef.current;
    const wrap = layer?.parentElement as HTMLElement | null;
    if (!layer || !wrap) return;
    const measure = () => {
      const g = buildGeom(wrap);
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
    const rafId = requestAnimationFrame(measure);
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
      cancelAnimationFrame(rafId);
      window.clearTimeout(t);
      if (fontsT) window.clearTimeout(fontsT);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  /* The walker. One rAF loop; every visual is a DOM ref write. */
  const walkerGRef = useRef<SVGGElement | null>(null);
  const segRef = useRef<SVGPolylineElement | null>(null);
  const haloRef = useRef<SVGCircleElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);
  const wMarkRef = useRef<SVGGElement | null>(null);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = performance.now();
    let lastGeom: Geom | null = null;
    let mode: WalkerMode = "trunk";
    let forkIdx = 0;
    let y = 0;
    let v = 0;
    let legT = 0; // ms into the current out/pause/back/rest leg
    let legDur = 0;
    let legLen = 0;
    let legPath: SVGPathElement | null = null;
    let opacity = 0;
    let pendingClamp = false;
    let started = false;

    const branchDrawn = (g: Geom, f: Fork) => drawRef.current >= f.end - 0.002;
    const branchBp = (f: Fork) =>
      clampNum((drawRef.current - f.start) / Math.max(f.end - f.start, 0.0001), 0, 1);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const rawDt = now - last;
      last = now;
      const g = geomRef.current;
      const wg = walkerGRef.current;
      if (!g || !wg) return;
      /* The clamp only guards against clock jumps; hidden tabs and
         the site's motion pause freeze the walker explicitly below,
         so a generous clamp lets a slow renderer keep real-time pace
         instead of falling behind wall-clock. */
      const dt = clampNum(rawDt, 0, 250);
      const paused =
        document.hidden || document.documentElement.classList.contains("motion-paused");

      if (g !== lastGeom) {
        /* Geometry changed under the walker (resize, expansion):
           restart the itinerary at the first fork below where it was. */
        lastGeom = g;
        if (!started) {
          y = g.top;
          started = true;
        }
        forkIdx = g.forks.findIndex((f) => f.y1 > y + 2);
        if (forkIdx < 0) forkIdx = g.forks.length;
        mode = "trunk";
        v = 0;
        legPath = null;
        walkerLock.set(0);
      }

      const len = g.bottom - g.top;
      const headY = g.top + drawRef.current * len;
      let ot = paused ? 0 : 1; // opacity target
      let px = g.tx;
      let py = y;
      let trail: string | null = null;

      const clampNow = () => {
        pendingClamp = true;
        ot = 0;
      };

      if (!paused && !pendingClamp) {
        if (mode === "trunk") {
          const targetFork = forkIdx < g.forks.length ? g.forks[forkIdx] : null;
          const targetY = targetFork ? targetFork.y1 : g.bottom;
          const limitY = Math.min(targetY, headY);
          if (y > headY + 2) {
            clampNow();
          } else if (y < limitY - 0.5) {
            /* Travel: accelerate to cruise, brake into the target. */
            const dist = limitY - y;
            const brake = Math.sqrt(2 * WALK_ACCEL * Math.max(dist, 0));
            const want = Math.min(WALK_CRUISE, brake);
            v = v < want ? Math.min(v + WALK_ACCEL * (dt / 1000), want) : want;
            y += v * (dt / 1000);
            if (y > limitY) y = limitY;
            py = y;
            const pts: string[] = [];
            for (let d = 36; d >= 0; d -= 9) pts.push(`${g.tx},${(y - d).toFixed(1)}`);
            trail = pts.join(" ");
          } else {
            /* Parked at the frontier or at a fork node. Rides the head
               as it draws; leaves the moment its branch is complete. */
            y = limitY;
            v = 0;
            py = y;
            if (targetFork && y >= targetFork.y1 - 0.5 && branchDrawn(g, targetFork)) {
              const el = branchEls.current.get(targetFork.id);
              if (el) {
                legPath = el;
                legLen = el.getTotalLength();
                legDur = clampNum((legLen / BRANCH_SPEED) * 1000, 700, 2800);
                legT = 0;
                mode = "out";
              } else {
                forkIdx += 1;
              }
            } else if (!targetFork && y >= g.bottom - 0.5 && headY >= g.bottom - 0.5) {
              mode = "rest";
              legT = 0;
              legDur = REST_MS;
            }
          }
        } else if (mode === "out" || mode === "back" || mode === "pause") {
          const fork = g.forks[forkIdx];
          if (!fork || !legPath) {
            mode = "trunk";
          } else {
            const u01 = mode === "pause" ? 1 : easeInOut(clampNum(legT / legDur, 0, 1));
            const frac = mode === "out" ? u01 : mode === "pause" ? 1 : 1 - u01;
            if (branchBp(fork) < frac - 0.03) {
              /* The line undrew beneath the walker. */
              walkerLock.set(0);
              clampNow();
            } else {
              legT += dt;
              const s = frac * legLen;
              const pt = legPath.getPointAtLength(s);
              px = pt.x;
              py = pt.y;
              if (fork.mark) walkerLock.set(frac);
              const pts: string[] = [];
              const back = Math.min(36, s);
              for (let d = back; d >= 0; d -= 9) {
                const p = legPath.getPointAtLength(Math.max(s - d, 0));
                pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
              }
              trail = pts.join(" ");
              if (legT >= legDur) {
                if (mode === "out") {
                  mode = "pause";
                  legT = 0;
                  legDur = TIP_PAUSE_MS;
                } else if (mode === "pause") {
                  if (fork.mark) onSeal();
                  mode = "back";
                  legT = 0;
                  legDur = clampNum((legLen / BRANCH_SPEED) * 1000, 700, 2800);
                } else {
                  if (fork.mark) walkerLock.set(0);
                  y = fork.y2;
                  forkIdx += 1;
                  legPath = null;
                  v = 0;
                  mode = "trunk";
                  py = y;
                  px = g.tx;
                  trail = null;
                }
              }
            }
          }
        } else if (mode === "rest") {
          py = g.bottom;
          px = g.tx;
          y = g.bottom;
          legT += dt;
          if (legT > legDur - 600) ot = 0;
          if (legT >= legDur) {
            forkIdx = 0;
            y = g.top;
            v = 0;
            mode = "trunk";
            walkerLock.set(0);
            py = y;
          }
        }
      } else if (pendingClamp) {
        ot = 0;
      }

      /* Fade envelope: fast, and the clamp reposition happens only
         once the walker is invisible. */
      const step = dt / 160;
      opacity += clampNum(ot - opacity, -step, step);
      if (pendingClamp && opacity <= 0.04) {
        pendingClamp = false;
        const forks = g.forks;
        forkIdx = forks.findIndex((f) => f.y1 > headY + 2);
        if (forkIdx < 0) forkIdx = forks.length;
        y = Math.min(headY, forkIdx < forks.length ? forks[forkIdx].y1 : g.bottom);
        mode = "trunk";
        v = 0;
        legPath = null;
        py = y;
        px = g.tx;
        trail = null;
      }

      const docY = g.wrapTopDoc + py;
      const inView = docY > window.scrollY - 160 && docY < window.scrollY + window.innerHeight + 160;
      wg.setAttribute("opacity", opacity.toFixed(3));
      if (inView && opacity > 0.01) {
        const seg = segRef.current;
        const halo = haloRef.current;
        const dot = dotRef.current;
        const wm = wMarkRef.current;
        if (seg) {
          if (trail) {
            seg.setAttribute("points", trail);
            seg.setAttribute("opacity", "1");
          } else {
            seg.setAttribute("opacity", "0");
          }
        }
        if (halo) {
          halo.setAttribute("cx", px.toFixed(1));
          halo.setAttribute("cy", py.toFixed(1));
          const waiting = mode === "trunk" && v === 0;
          halo.setAttribute(
            "opacity",
            waiting ? (0.1 + 0.05 * Math.sin(now / 620)).toFixed(3) : "0.16",
          );
        }
        if (dot) {
          dot.setAttribute("cx", px.toFixed(1));
          dot.setAttribute("cy", py.toFixed(1));
        }
        if (wm) {
          const ms = 16 / 275;
          wm.setAttribute(
            "transform",
            `translate(${(px - 137.5 * ms).toFixed(1)} ${(py - 145 * ms).toFixed(1)}) scale(${ms.toFixed(4)})`,
          );
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, walkerLock, onSeal]);

  return (
    <div className="thread-home-layer" ref={layerRef} aria-hidden="true">
      {geom ? (
        <svg
          className="thread-layer"
          width={geom.w}
          height={geom.h}
          viewBox={`0 0 ${geom.w} ${geom.h}`}
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
            <Branch
              key={f.id}
              fork={f}
              tx={geom.tx}
              progress={draw}
              staticAll={reduced}
              walkerLock={walkerLock}
              sealed={reportSealed}
              pathRefCb={pathRefCb}
            />
          ))}
          {!reduced ? (
            <g ref={walkerGRef} opacity={0}>
              <polyline ref={segRef} className="thread-walker-seg" points="" opacity={0} />
              <circle ref={haloRef} r={9} className="thread-walker-halo" opacity={0.16} />
              <circle ref={dotRef} r={3} className="thread-walker-dot" />
              <g ref={wMarkRef}>
                <path d={HALF_A} fill="var(--agent)" />
                <path d={HALF_B} fill="var(--gold-mark)" />
              </g>
            </g>
          ) : null}
        </svg>
      ) : null}
    </div>
  );
}
