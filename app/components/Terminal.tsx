export type TermLine = {
  text: string;
  tone: "command" | "output" | "dim";
};

export type TermStatus = {
  verdict: "ACCEPT" | "REJECT";
  detail: string;
};

type TerminalProps = {
  lines: TermLine[];
  title?: string;
  /** Optional final verdict row: the check result, bank-statement calm. */
  status?: TermStatus;
  className?: string;
};

/** A live check, not a static card: refined chrome plus a verdict row. */
export function Terminal({ lines, title = "terminal", status, className = "" }: TerminalProps) {
  return (
    <div
      className={`overflow-hidden rounded-[10px] border border-line bg-card ${className}`}
    >
      <div className="flex items-center gap-3 border-b border-line px-5 py-3">
        <span aria-hidden="true" className="flex gap-1.5">
          <i className="block h-2.5 w-2.5 rounded-full bg-line2" />
          <i className="block h-2.5 w-2.5 rounded-full bg-line2" />
          <i className="block h-2.5 w-2.5 rounded-full bg-line2" />
        </span>
        <span className="font-mono text-xs tracking-[0.03em] text-faint">
          {title}
        </span>
      </div>
      <div className="whitespace-pre-wrap px-5 py-4 font-mono text-sm leading-[1.75] text-muted">
        {lines.map((line, i) => (
          <div key={i}>
            {line.tone === "command" && (
              <span>
                <span className="text-faint">$ </span>
                <span className="font-medium text-human-text">{line.text}</span>
              </span>
            )}
            {line.tone === "output" && <span className="text-ink">{line.text}</span>}
            {line.tone === "dim" && <span>{line.text}</span>}
          </div>
        ))}
        {status && (
          <div className="mt-4 flex items-baseline gap-2.5 border-t border-line pt-4">
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 translate-y-[-1px] self-center rounded-full ${
                status.verdict === "ACCEPT" ? "bg-ok" : "bg-human-text"
              }`}
            />
            <span
              className={`text-xs font-bold uppercase tracking-[0.14em] ${
                status.verdict === "ACCEPT" ? "text-ok" : "text-human-text"
              }`}
            >
              {status.verdict}
            </span>
            <span className="text-xs text-muted">{status.detail}</span>
          </div>
        )}
      </div>
    </div>
  );
}
