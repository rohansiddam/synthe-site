import { demoRun } from "@/lib/runData";
import { HoverArrow } from "@/app/components/Mark";
import { CardHead } from "./kit";

/* The report card: the demo run's morning report, the same lines the
   footer band prints (pass rate, what merged, spend), because the
   report is what the run sends its owner. It summarizes; the full
   30-case detail lives one click away in the real report (Miller's
   law, progressive disclosure). */

export function ReportCard() {
  const report = demoRun.report;
  return (
    <>
      <CardHead id="console-report-h" eyebrow="The morning report · demo run" />
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
    </>
  );
}
