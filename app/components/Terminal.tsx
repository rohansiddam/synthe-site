export type TermLine = {
  text: string;
  tone: "command" | "output" | "dim";
};

type TerminalProps = {
  lines: TermLine[];
  title?: string;
  className?: string;
};

export function Terminal({ lines, title = "terminal", className = "" }: TerminalProps) {
  return (
    <div className={`bg-card border border-line ${className}`}>
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <i className="block h-2.5 w-2.5 rounded-full bg-line2" />
          <i className="block h-2.5 w-2.5 rounded-full bg-line2" />
          <i className="block h-2.5 w-2.5 rounded-full bg-line2" />
        </span>
        <span className="font-mono text-xs text-faint">{title}</span>
      </div>
      <div className="font-mono text-sm leading-[1.65] text-muted p-4 whitespace-pre-wrap">
        {lines.map((line, i) => (
          <div key={i}>
            {line.tone === "command" && (
              <span>
                <span className="text-faint">$ </span>
                <span className="text-human-text">{line.text}</span>
              </span>
            )}
            {line.tone === "output" && <span className="text-ink">{line.text}</span>}
            {line.tone === "dim" && <span>{line.text}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
