"use client";

import { motion, type Variants } from "framer-motion";
import { demoRun } from "@/lib/runData";
import { HoverArrow } from "@/app/components/Mark";
import { CardHead } from "./kit";

/* The report card: the demo run's morning report, the same lines the
   footer band prints (pass rate, what merged, spend), because the
   report is what the run sends its owner. It summarizes; the full
   30-case detail lives one click away in the real report (Miller's
   law, progressive disclosure). Lane V2: the report prints. At the
   end of the cycle the headline lands first, then its lines in
   order, then the link, like a report arriving line by line; the
   rest beat holds the finished report, and the reset clears it
   quickly and quietly. It starts printed: the server, reduced
   motion and no-JS all show the complete report. */

const PRINT_EASE = [0.22, 1, 0.36, 1] as const;

const item: Variants = {
  shown: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: PRINT_EASE, delay },
  }),
  out: { opacity: 0, y: 4, transition: { duration: 0.25, ease: "easeIn", delay: 0 } },
};

export function ReportCard({ printed }: { printed: boolean }) {
  const report = demoRun.report;
  const state = printed ? "shown" : "out";
  return (
    <>
      <CardHead id="console-report-h" eyebrow="The morning report · demo run" />
      <motion.p
        className="console-big"
        variants={item}
        custom={0}
        initial={false}
        animate={state}
      >
        {report.headline}
      </motion.p>
      <div className="console-report-lines">
        {report.lines.map((line, i) => (
          <motion.p
            key={line.key}
            variants={item}
            custom={0.22 + i * 0.34}
            initial={false}
            animate={state}
          >
            <span className="rb-key">{line.key}</span>
            <span className="rb-val">{line.value}</span>
          </motion.p>
        ))}
      </div>
      <motion.p
        className="console-meta"
        variants={item}
        custom={0.22 + report.lines.length * 0.34}
        initial={false}
        animate={state}
      >
        {demoRun.dateLabel} · {demoRun.mode}
      </motion.p>
      <motion.a
        className="arrow-link console-report-link"
        href={report.url}
        variants={item}
        custom={0.22 + report.lines.length * 0.34}
        initial={false}
        animate={state}
      >
        Read the full report <HoverArrow />
      </motion.a>
    </>
  );
}
