import { VerifiedStamp } from "./VerifiedStamp";

/** Paper is a physical object: cream in both themes. */
const PAPER = "#f4eee1";
const PAPER_LINE = "#ded2ba";
const PAPER_INK = "#1b1613";
const PAPER_MUTED = "#6b5f52";
const PAPER_CRIMSON = "#b5402f";

/**
 * A row of punched holes: page background showing through the paper.
 * Sized to tile seamlessly; the strip's field matches the paper color.
 */
function Perf({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        height: 9,
        backgroundColor: PAPER,
        backgroundImage: `radial-gradient(circle at 7px 4.5px, var(--bg) 3px, ${PAPER} 3.6px)`,
        backgroundSize: "14px 9px",
        backgroundRepeat: "repeat-x",
      }}
    />
  );
}

type ReceiptCardProps = {
  number: string;
  from: string;
  to: string;
  meta: string;
  timestamp: string;
  signature: string;
  className?: string;
};

/**
 * The signature artifact: torn-from-the-roll receipt with real perforated
 * edges, paper grain, hairline section rules, and a tear-off stub carrying
 * the verified mark and signature hash.
 */
export function ReceiptCard({
  number,
  from,
  to,
  meta,
  timestamp,
  signature,
  className = "",
}: ReceiptCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[6px] ${className}`}
      style={{
        background: PAPER,
        color: PAPER_INK,
        boxShadow:
          "0 1px 2px rgba(27,22,19,0.08), 0 12px 32px rgba(27,22,19,0.10)",
      }}
    >
      {/* paper grain */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(27,22,19,0.022) 0px, rgba(27,22,19,0.022) 1px, transparent 1px, transparent 4px)",
        }}
      />

      <Perf />

      <div className="relative px-7 pb-6 pt-5 font-mono">
        <div className="flex items-baseline justify-between">
          <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em]">
            synthe receipt
          </p>
          <p
            className="m-0 text-[12px] font-bold tracking-[0.08em]"
            style={{ color: PAPER_CRIMSON }}
          >
            #{number}
          </p>
        </div>

        <div
          aria-hidden="true"
          className="my-4"
          style={{ borderTop: `1px solid ${PAPER_LINE}` }}
        />

        <p className="m-0 text-[15px] leading-[1.7]">
          {from}{" "}
          <span style={{ color: PAPER_CRIMSON, fontWeight: 700 }}>&rarr;</span>{" "}
          {to}
        </p>
        <p className="m-0 text-[13px] leading-[1.7]" style={{ color: PAPER_MUTED }}>
          {meta}
        </p>
        <p className="m-0 text-[13px] leading-[1.7]" style={{ color: PAPER_MUTED }}>
          {timestamp}
        </p>
      </div>

      <Perf />

      {/* tear-off stub */}
      <div
        className="relative px-7 py-4 font-mono"
        style={{ background: PAPER }}
      >
        <VerifiedStamp signature={signature} />
      </div>

      <Perf />
    </div>
  );
}
