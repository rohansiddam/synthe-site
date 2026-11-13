"use client";

/* WireframeMark: the Synthe mark as a line-drawn 3D solid on a slow
 * turntable, in the manner of Parca's hero visual (one fixed camera,
 * a wireframe form, a continuous unhurried rotation; nothing scroll,
 * hover or drag driven).
 *
 * Geometry comes from the official mark and nowhere else: the exact
 * HALF_A / HALF_B path data from Mark.tsx is sampled into polylines
 * in the browser (getTotalLength / getPointAtLength on the real path
 * data), then extruded: a front outline, a back outline at a depth
 * of about 15% of the mark's width, and connecting struts at sampled
 * intervals. The wireframe is projected with a mild perspective onto
 * a 2D canvas and drawn far-to-near with depth-cued alpha, half A in
 * the theme ink (--ink), half B in the signal red (--accent), both
 * re-read from the CSS variables when the theme flips.
 *
 * Motion: one revolution in 40s, linear, never reversing. Pauses
 * off-screen (IntersectionObserver) and on a hidden tab; the angle
 * only ever accumulates visible time. prefers-reduced-motion (and
 * the site's motion-paused opt-out) paints a single static front
 * frame. The static vector Mark sits underneath and the canvas fades
 * over it only once its first frame is painted, so no-JS, SSR and
 * pre-init all show the finished front view of the mark itself, in
 * the same 275/290 box the AsciiMark used: no layout shift.
 *
 * The current angle is mirrored to data-angle on the wrapper (whole
 * degrees) so captures can be taken at known orientations. */

import { useEffect, useRef } from "react";
import { HALF_A, HALF_B, Mark } from "./Mark";

const VIEW_W = 275;
const VIEW_H = 290;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
/** Extrusion depth: ~15% of the mark's width, split front/back. */
const DEPTH = 41;
const HALF_DEPTH = DEPTH / 2;
/** Perspective camera distance, in viewBox units. */
const CAMERA = 1000;
/** One revolution, ms. */
const PERIOD_MS = 40000;
/** Arc-length spacing between outline samples, viewBox units. */
const SAMPLE_SPACING = 11;
/** Every Nth outline sample carries a front-to-back strut. */
const STRUT_EVERY = 4;

type Pt = [number, number];

function samplePath(d: string): Pt[] {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
  el.setAttribute("d", d);
  const len = el.getTotalLength();
  const n = Math.max(48, Math.round(len / SAMPLE_SPACING));
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = el.getPointAtLength((i / n) * len);
    pts.push([p.x, p.y]);
  }
  return pts;
}

type Seg = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  z: number;
  half: 0 | 1;
  weight: number;
};

export function WireframeMark({ className = "" }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const underRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const halves: { pts: Pt[]; color: string }[] = [
      { pts: samplePath(HALF_A), color: "" },
      { pts: samplePath(HALF_B), color: "" },
    ];

    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      halves[0].color = cs.getPropertyValue("--ink").trim() || "#171410";
      halves[1].color = cs.getPropertyValue("--accent").trim() || "#b5412f";
    };
    readColors();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pausedBySite = document.documentElement.classList.contains("motion-paused");
    const animated = !reduce && !pausedBySite;

    let cssW = 0;
    let cssH = 0;
    let dpr = 1;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      cssW = r.width;
      cssH = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
    };
    resize();

    let angle = 0;
    let revealed = false;

    const draw = () => {
      if (!cssW || !cssH) return;
      const s = (cssW / VIEW_W) * dpr; // device px per viewBox unit
      const ox = (cssW / 2) * dpr;
      const oy = (cssH / 2) * dpr;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const segs: Seg[] = [];

      const project = (x: number, y: number, z: number) => {
        const dx = x - CX;
        const rx = dx * cos + z * sin;
        const rz = -dx * sin + z * cos;
        const k = CAMERA / (CAMERA - rz);
        return {
          px: ox + rx * k * s,
          py: oy + (y - CY) * k * s,
          z: rz,
        };
      };

      halves.forEach((half, hi) => {
        const pts = half.pts;
        const n = pts.length;
        const front = pts.map(([x, y]) => project(x, y, HALF_DEPTH));
        const back = pts.map(([x, y]) => project(x, y, -HALF_DEPTH));
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          segs.push({
            x1: back[i].px, y1: back[i].py, x2: back[j].px, y2: back[j].py,
            z: (back[i].z + back[j].z) / 2, half: hi as 0 | 1, weight: 1.1,
          });
          segs.push({
            x1: front[i].px, y1: front[i].py, x2: front[j].px, y2: front[j].py,
            z: (front[i].z + front[j].z) / 2, half: hi as 0 | 1, weight: 1.5,
          });
          if (i % STRUT_EVERY === 0) {
            segs.push({
              x1: front[i].px, y1: front[i].py, x2: back[i].px, y2: back[i].py,
              z: (front[i].z + back[i].z) / 2, half: hi as 0 | 1, weight: 1.1,
            });
          }
        }
      });

      segs.sort((a, b) => a.z - b.z);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const g of segs) {
        // Depth cue: far segments fade toward the page, near ones full.
        const t = Math.min(1, Math.max(0, (g.z + 130) / 260));
        ctx.globalAlpha = 0.25 + 0.75 * t;
        ctx.strokeStyle = halves[g.half].color;
        ctx.lineWidth = g.weight * dpr;
        ctx.beginPath();
        ctx.moveTo(g.x1, g.y1);
        ctx.lineTo(g.x2, g.y2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (!revealed) {
        revealed = true;
        canvas.style.opacity = "1";
        if (underRef.current) underRef.current.style.opacity = "0";
      }
    };

    draw();

    let raf = 0;
    let last = performance.now();
    let visible = true;
    let lastDeg = -1;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(250, now - last);
      last = now;
      if (!visible || document.hidden) return;
      angle = (angle + (dt / PERIOD_MS) * Math.PI * 2) % (Math.PI * 2);
      const deg = Math.round((angle * 180) / Math.PI) % 360;
      if (deg !== lastDeg) {
        lastDeg = deg;
        wrap.dataset.angle = String(deg);
      }
      draw();
    };
    if (animated) raf = requestAnimationFrame(loop);

    const intObs = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        last = performance.now();
      },
      { threshold: 0.05 },
    );
    intObs.observe(wrap);

    const resizeObs = new ResizeObserver(() => {
      resize();
      draw();
    });
    resizeObs.observe(wrap);

    const themeObs = new MutationObserver(() => {
      readColors();
      if (!animated) draw();
    });
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => {
      readColors();
      if (!animated) draw();
    };
    scheme.addEventListener?.("change", onScheme);

    return () => {
      cancelAnimationFrame(raf);
      intObs.disconnect();
      resizeObs.disconnect();
      themeObs.disconnect();
      scheme.removeEventListener?.("change", onScheme);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`wireframe-mark ${className}`}
      style={{ position: "relative", aspectRatio: "275 / 290" }}
      aria-hidden="true"
    >
      <span
        ref={underRef}
        style={{
          position: "absolute",
          inset: 0,
          transition: "opacity 240ms ease",
        }}
      >
        <Mark className="wireframe-underlay" />
      </span>
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          opacity: 0,
          transition: "opacity 240ms ease",
        }}
      />
    </div>
  );
}
