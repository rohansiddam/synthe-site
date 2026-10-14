import { VerifiedStamp } from "./VerifiedStamp";

type ReceiptCardProps = {
  number: string;
  from: string;
  to: string;
  meta: string;
  signature: string;
  className?: string;
};

/**
 * Static paper receipt ticket. The paper stays cream in both themes,
 * like a physical receipt; the stamp and type adapt via tokens.
 */
export function ReceiptCard({ number, from, to, meta, signature, className = "" }: ReceiptCardProps) {
  return (
    <div
      className={`font-mono text-[15px] leading-[1.7] rounded-b-[14px] border border-line px-6 pt-4 pb-6 ${className}`}
      style={{ background: "#f4eee1", color: "#1b1613" }}
    >
      <div
        aria-hidden="true"
        className="-mx-6 mb-4"
        style={{ borderTop: "2px dashed #c9bfae" }}
      />
      <p className="font-bold uppercase tracking-[0.06em] text-[13px] mb-2">
        synthe receipt &middot; #{number}
      </p>
      <p className="m-0">
        {from} <span style={{ color: "#b5402f", fontWeight: 700 }}>&rarr;</span> {to}
      </p>
      <p className="m-0" style={{ color: "#5d544c" }}>
        {meta}
      </p>
      <p className="m-0" style={{ color: "#5d544c" }}>
        sig {signature} &middot; <VerifiedStamp />
      </p>
    </div>
  );
}
