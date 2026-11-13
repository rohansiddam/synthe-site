"use client";

import { useRef } from "react";
import { ThreadLayer } from "./ThreadLayer";

/* The Thread, demo page (Lane D3 exploration).
   Placeholder sections mirror the real homepage's order and approximate
   heights (hero console, worked example, how it works, steps, report,
   footer) so the travel and branch geometry can be judged against
   realistic content. Each section carries one framed "key visual" block;
   the Thread's branches reach for those blocks. Quiet by design: mono
   labels, hairline frames, no real copy beyond a line per section. */

type Sec = {
  id: string;
  idx: string;
  title: string;
  note: string;
  line: string;
  minHeight: number;
  visual: { marginLeft: string; width: string; height: number; caption: string };
};

const SECTIONS: Sec[] = [
  {
    id: "console",
    idx: "01",
    title: "Console",
    note: "hero · the living console",
    line: "The run, replaying itself: rounds, checks, the merge, the spend.",
    minHeight: 860,
    visual: { marginLeft: "16%", width: "62%", height: 380, caption: "key visual · score card" },
  },
  {
    id: "example",
    idx: "02",
    title: "Worked example",
    note: "one prompt change, before and after",
    line: "A single change, shown the way the report shows it.",
    minHeight: 560,
    visual: { marginLeft: "38%", width: "48%", height: 260, caption: "key visual · the diff" },
  },
  {
    id: "how",
    idx: "03",
    title: "How it works",
    note: "checks decide · only the prompt changes",
    line: "Three cards: your checks, the one file that changes, how wins land.",
    minHeight: 620,
    visual: { marginLeft: "8%", width: "44%", height: 300, caption: "key visual · checks card" },
  },
  {
    id: "steps",
    idx: "04",
    title: "Steps",
    note: "start tonight · two steps",
    line: "Run one command. Confirm your checks. The record starts there.",
    minHeight: 430,
    visual: { marginLeft: "30%", width: "52%", height: 190, caption: "key visual · install pill" },
  },
  {
    id: "report",
    idx: "05",
    title: "Report",
    note: "the morning report · peak-end",
    line: "Every run ends as a printed record: what changed, what it cost.",
    minHeight: 380,
    visual: { marginLeft: "20%", width: "56%", height: 170, caption: "key visual · report band" },
  },
  {
    id: "footer",
    idx: "06",
    title: "Footer",
    note: "the record closes",
    line: "The line ends where the page does, at the colophon.",
    minHeight: 250,
    visual: { marginLeft: "55%", width: "34%", height: 110, caption: "key visual · wordmark" },
  },
];

export function ThreadDemo() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const anchorRefs = useRef<(HTMLDivElement | null)[]>([]);

  return (
    <div className="thread-wrap" ref={wrapRef}>
      <ThreadLayer wrapRef={wrapRef} sectionRefs={sectionRefs} anchorRefs={anchorRefs} />
      <div className="thread-content">
        <header className="thread-intro">
          <p className="thread-eyebrow">Background study · Lane D3</p>
          <h1 className="thread-title">The Thread</h1>
          <p className="thread-lede">
            One record line runs the full height of this page in the background. Scrolling draws
            it; a pulse travels what is drawn on its own; at each section the line forks toward
            the section's key visual and merges back, the way a round diverges from the prompt
            and returns. Placeholder blocks stand in for the homepage's sections, in its order
            and at about its heights.
          </p>
        </header>

        {SECTIONS.map((s, i) => (
          <section
            key={s.id}
            className="thread-sec"
            style={{ minHeight: s.minHeight }}
            ref={(el) => {
              sectionRefs.current[i] = el;
            }}
            aria-label={s.title}
          >
            <div className="thread-sec-head">
              <span className="thread-sec-idx">{s.idx}</span>
              <h2 className="thread-sec-title">{s.title}</h2>
              <span className="thread-sec-note">{s.note}</span>
            </div>
            <p className="thread-sec-line">{s.line}</p>
            <div
              className="thread-visual"
              style={{
                marginLeft: s.visual.marginLeft,
                width: s.visual.width,
                height: s.visual.height,
              }}
              ref={(el) => {
                anchorRefs.current[i] = el;
              }}
            >
              <span>{s.visual.caption}</span>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
