"use client";

import { useRef } from "react";
import { demoRun } from "@/lib/runData";
import { HoverArrow } from "@/app/components/Mark";
import { bayer, cellHash, clamp01, easeInOut, easeOut } from "./ditherKit";
import { useCanvasStage, type StageFrame } from "./useCanvasStage";

/* Treatment 02: dither as transition.
   The demo run's report card, re-printed on a loop. Instead of a plain
   cross-fade, the state change travels through ordered dither: a burst
   rises coarse (22px cells, big soft dots, alpha peaking mid-burst)
   and resolves fine (9px cells, tight dots), while the printed lines
   dip in opacity underneath, so the card reads as if it were being
   re-printed and re-verified rather than swapped. About one cell in
   eight carries the accent instead of ink: Synthe's own change marker
   inside the burst. The cycle is 8s: rest, 1.3s rise, 1.5s resolve,
   rest. Off-screen the stage clock pauses; under reduced motion the
   canvas never draws and the report simply sits there, complete. */

const CYCLE_MS = 8000;
const RISE_AT = 4400;
const RISE_MS = 1300;
const FALL_MS = 1500;

function envelope(t: number, mode: "anim" | "final"): number {
  if (mode === "final") return 0;
  const c = t % CYCLE_MS;
  if (c < RISE_AT) return 0;
  if (c < RISE_AT + RISE_MS) return easeOut((c - RISE_AT) / RISE_MS);
  if (c < RISE_AT + RISE_MS + FALL_MS) {
    return 1 - easeInOut((c - RISE_AT - RISE_MS) / FALL_MS);
  }
  return 0;
}

export function DitherTransition() {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const report = demoRun.report;

  const canvasRef = useCanvasStage((f: StageFrame) => {
    const { ctx, colors } = f;
    const e = envelope(f.t, f.mode);

    if (contentRef.current) {
      contentRef.current.style.opacity = `${1 - 0.85 * Math.pow(e, 1.2)}`;
    }
    ctx.clearRect(0, 0, f.w, f.h);
    if (e <= 0.001) {
      f.cells = 0;
      return;
    }

    let cells = 0;
    const pass = (cell: number, fine: boolean) => {
      const cols = Math.ceil(f.w / cell);
      const rows = Math.ceil(f.h / cell);
      const alpha = fine ? Math.pow(e, 1.5) * 0.95 : Math.min(e * (1 - e) * 2.4, 0.9);
      if (alpha <= 0.01) return;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const n = 0.72 + 0.28 * cellHash(i, j);
          const gate = fine
            ? bayer(i * 7 + j, j * 5 + i)
            : bayer(i, j);
          if (gate >= e * n * 1.15) continue;
          const cx = i * cell + cell / 2;
          const cy = j * cell + cell / 2;
          const r = cell * (fine ? 0.3 : 0.34) * (0.45 + 0.55 * e);
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = cellHash(i * 3 + 11, j * 7 + 5) > 0.88 ? colors.accent : colors.ink;
          ctx.globalAlpha = alpha;
          ctx.fill();
          cells += 1;
        }
      }
    };
    pass(22, false);
    pass(9, true);
    ctx.globalAlpha = 1;
    f.cells = cells;
  }, "transition");

  return (
    <section className="d2-section" aria-labelledby="d2-trans-h">
      <div className="d2-sec-head">
        <h2 className="d2-sec-title" id="d2-trans-h">
          02 · Dither as transition
        </h2>
        <p className="d2-sec-note">
          A state change that arrives through dither instead of a fade. Every few seconds the
          report dissolves coarse to fine and resolves, as if re-printed and re-checked.
        </p>
      </div>
      <div className="d2-card d2-trans">
        <div className="console-card-in">
          <div ref={contentRef} className="d2-trans-content">
            <div className="console-card-head">
              <h3 className="console-eyebrow">The morning report · demo run</h3>
            </div>
            <p className="console-big">{report.headline}</p>
            <div className="console-report-lines">
              {report.lines.map((line) => (
                <p key={line.key}>
                  <span className="rb-key">{line.key}</span>
                  <span className="rb-val">{line.value}</span>
                </p>
              ))}
            </div>
            <p className="console-meta">
              {demoRun.dateLabel} · {demoRun.mode}
            </p>
            <a className="arrow-link console-report-link" href={report.url}>
              Read the full report <HoverArrow />
            </a>
          </div>
          <canvas ref={canvasRef} className="d2-trans-canvas" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
