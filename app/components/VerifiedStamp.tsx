type VerifiedStampProps = {
  /** Optional signature hash shown after the mark, e.g. "9f2c...a1". */
  signature?: string;
  className?: string;
};

/**
 * A quiet inline verified mark: thin crimson ring with a check,
 * lowercase mono "verified", optional sig hash. Confident and calm,
 * like a bank statement line. No rotation, no rubber stamp.
 */
export function VerifiedStamp({ signature, className = "" }: VerifiedStampProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs ${className}`}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 15 15"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle
          cx="7.5"
          cy="7.5"
          r="6.75"
          fill="none"
          stroke="var(--human-text)"
          strokeWidth="1"
        />
        <path
          d="M4.8 7.7l2 2 3.6-4.1"
          fill="none"
          stroke="var(--human-text)"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="lowercase tracking-[0.04em] text-human-text">verified</span>
      {signature && <span className="text-muted">· {signature}</span>}
    </span>
  );
}
