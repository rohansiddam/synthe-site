"use client";

import { useEffect, useRef } from "react";
import { demoRun } from "@/lib/runData";
import { Mark } from "./Mark";
import "./TiltReportCard.css";

/* The tilting morning report card.
   Motion ported from the Stripe issuing card clone
   (~/workspace/reel-clones/stripe-tilt/spec.md): pointer driven tilt with
   the recovered chase, current += (target - current) * 0.004 * deltaMs,
   plus a specular highlight that follows the pointer through the same
   chase. The original card tilted up to 27 degrees; this card is larger,
   so its tilt range is capped at 11 degrees per axis.
   All numbers below come from demoRun in @/lib/runData. */

const MAX_TILT_DEG = 11;

type ChaseState = {
  rx: number;
  ry: number;
  glareX: number;
  glareY: number;
  glareOpacity: number;
};

const REST: ChaseState = { rx: 0, ry: 0, glareX: 50, glareY: 50, glareOpacity: 0 };

export function TiltReportCard() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const enabledRef = useRef(false);
  const inViewRef = useRef(false);
  const targetRef = useRef<ChaseState>({ ...REST });
  const currentRef = useRef<ChaseState>({ ...REST });

  useEffect(() => {
    const card = cardRef.current;
    const wrap = wrapRef.current;
    if (!card || !wrap) return;

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    enabledRef.current = !coarse && !reduced;
    if (!enabledRef.current) return;

    let rafId = 0;
    let running = false;
    let lastTime = 0;

    const apply = () => {
      const cur = currentRef.current;
      card.style.transform = `rotateX(${cur.rx.toFixed(3)}deg) rotateY(${cur.ry.toFixed(3)}deg)`;
      card.style.setProperty("--glare-x", `${cur.glareX.toFixed(2)}%`);
      card.style.setProperty("--glare-y", `${cur.glareY.toFixed(2)}%`);
      card.style.setProperty("--glare-opacity", cur.glareOpacity.toFixed(3));
    };

    const tick = (now: number) => {
      if (!running) return;
      const deltaMs = lastTime === 0 ? 16.667 : now - lastTime;
      lastTime = now;
      const cur = currentRef.current;
      const target = targetRef.current;
      // The Stripe chase, verbatim: current += (target - current) * 0.004 * deltaMs.
      const step = (from: number, to: number) => from + (to - from) * 0.004 * deltaMs;
      cur.rx = step(cur.rx, target.rx);
      cur.ry = step(cur.ry, target.ry);
      cur.glareX = step(cur.glareX, target.glareX);
      cur.glareY = step(cur.glareY, target.glareY);
      cur.glareOpacity = step(cur.glareOpacity, target.glareOpacity);
      apply();
      rafId = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || !inViewRef.current || document.hidden) return;
      running = true;
      lastTime = 0;
      rafId = window.requestAnimationFrame(tick);
    };

    const stop = () => {
      running = false;
      window.cancelAnimationFrame(rafId);
    };

    const io = new IntersectionObserver(
      (entries) => {
        inViewRef.current = entries.some((entry) => entry.isIntersecting);
        if (inViewRef.current) start();
        else stop();
      },
      { threshold: 0.05 },
    );
    io.observe(wrap);

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      card.style.transform = "";
    };
  }, []);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabledRef.current) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const clampedX = Math.min(1, Math.max(0, px));
    const clampedY = Math.min(1, Math.max(0, py));
    targetRef.current = {
      ry: (clampedX - 0.5) * 2 * MAX_TILT_DEG,
      rx: -(clampedY - 0.5) * 2 * MAX_TILT_DEG,
      glareX: clampedX * 100,
      glareY: clampedY * 100,
      glareOpacity: 0.18,
    };
  };

  const onPointerLeave = () => {
    targetRef.current = { ...targetRef.current, rx: 0, ry: 0, glareOpacity: 0 };
  };

  const rows: Array<{ label: string; value: string; verdict?: boolean }> = [
    {
      label: "Checks passed",
      value: `${demoRun.checksAfter}% of the time, up from ${demoRun.checksBefore}%.`,
    },
    {
      label: "Held-out score",
      value: `${demoRun.heldOutBefore}% to ${demoRun.heldOutAfter}%.`,
    },
    {
      label: "Head to head",
      value: `${demoRun.headToHead.better} better, ${demoRun.headToHead.worse} worse.`,
    },
    {
      label: "Spend",
      value: `${demoRun.spendDisplay} of a $${demoRun.budgetUsd} budget.`,
    },
    { label: "Verdict", value: "Kept", verdict: true },
  ];

  return (
    <div className={"tc-wrapper"} ref={wrapRef}>
      <div
        className={"tc-card"}
        ref={cardRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <div className={"tc-topRow"}>
          <p className={"tc-eyebrow"}>The morning report · The demo run</p>
          <span className={"tc-markWrap"} aria-hidden="true">
            <Mark />
          </span>
        </div>

        <div className={"tc-climb"}>
          <svg
            className={"tc-climbSvg"}
            viewBox="0 0 300 64"
            role="img"
            aria-label={`Checks passed rose from ${demoRun.checksBefore}% to ${demoRun.checksAfter}%`}
          >
            <path
              className={"tc-climbPath"}
              d="M 14 52 H 108 L 132 36 H 212 L 236 16 H 286"
            />
            <circle className={"tc-startDot"} cx="14" cy="52" r="5" />
            <circle className={"tc-endDot"} cx="286" cy="16" r="5" />
            <text className={"tc-climbLabel"} x="24" y="42">
              {demoRun.checksBefore}%
            </text>
            <text className={"tc-climbLabel"} x="284" y="33" textAnchor="end">
              {demoRun.checksAfter}%
            </text>
          </svg>
        </div>

        <dl className={"tc-rows"}>
          {rows.map((row) => (
            <div className={"tc-row"} key={row.label}>
              <dt className={"tc-rowLabel"}>{row.label}</dt>
              <dd
                className={row.verdict ? `${"tc-rowValue"} ${"tc-verdict"}` : "tc-rowValue"}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className={"tc-glare"} aria-hidden="true" />
      </div>
    </div>
  );
}

export default TiltReportCard;
