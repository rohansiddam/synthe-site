"use client";

import { motion } from "framer-motion";
import { VerifiedStamp } from "./VerifiedStamp";

/** Paper is a physical object: cream in both themes. */
const PAPER = "#f4eee1";
const PAPER_LINE = "#ded2ba";
const PAPER_INK = "#1b1613";
const PAPER_MUTED = "#6b5f52";
const PAPER_CRIMSON = "#b5402f";

/**
 * A row of punched holes. The holes use a dedicated --perf-hole token (not
 * the page background) so they stay visible in both themes.
 * Sized to tile seamlessly; the strip's field matches the paper color.
 * Exported so the printer footer can build its own roll remnant.
 */
export function Perf({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        height: 9,
        backgroundColor: PAPER,
        backgroundImage: `radial-gradient(circle at 7px 4.5px, var(--perf-hole) 3px, ${PAPER} 3.6px)`,
        backgroundSize: "14px 9px",
        backgroundRepeat: "repeat-x",
      }}
    />
  );
}

/**
 * Printer feed sync. When provided, the card's content lines fade in
 * staggered (delay proportional to line position) once `active` flips true
 * at feed start, like a print head. Omit for the static card.
 */
type FeedSync = { lineDelay: number; active: boolean };

type ReceiptCardProps = {
  number: string;
  from: string;
  to: string;
  meta: string;
  timestamp: string;
  signature: string;
  className?: string;
  /**
   * When true, the verified stamp mounts with a spring pop instead of
   * rendering statically. Used by the receipt-printer footer at tear time.
   */
  revealStamp?: boolean;
  /** Printer feed sync for staggered line reveals. Omit for static card. */
  feedSync?: FeedSync;
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
  revealStamp = false,
  feedSync,
}: ReceiptCardProps) {
  // Staggered print-head reveal: each content line fades in with a delay
  // proportional to its position once the feed starts. Static when omitted.
  const lineProps = (index: number) =>
    feedSync
      ? {
          initial: false as const,
          animate: { opacity: feedSync.active ? 1 : 0 },
          transition: feedSync.active
            ? {
                delay: index * feedSync.lineDelay,
                duration: 0.25,
                ease: "linear" as const,
              }
            : { duration: 0 },
        }
      : undefined;

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
        <motion.div
          className="flex items-baseline justify-between"
          {...lineProps(0)}
        >
          <p className="m-0 text-[12px] font-bold uppercase tracking-[0.14em]">
            synthe receipt
          </p>
          <p
            className="m-0 text-[12px] font-bold tracking-[0.08em]"
            style={{ color: PAPER_CRIMSON }}
          >
            #{number}
          </p>
        </motion.div>

        <div
          aria-hidden="true"
          className="my-4"
          style={{ borderTop: `1px solid ${PAPER_LINE}` }}
        />

        <motion.p className="m-0 text-[15px] leading-[1.7]" {...lineProps(1)}>
          {from}{" "}
          <span style={{ color: PAPER_CRIMSON, fontWeight: 700 }}>&rarr;</span>{" "}
          {to}
        </motion.p>
        <motion.p
          className="m-0 text-[13px] leading-[1.7]"
          style={{ color: PAPER_MUTED }}
          {...lineProps(2)}
        >
          {meta}
        </motion.p>
        <motion.p
          className="m-0 text-[13px] leading-[1.7]"
          style={{ color: PAPER_MUTED }}
          {...lineProps(3)}
        >
          {timestamp}
        </motion.p>
      </div>

      <Perf />

      {/* tear-off stub */}
      <div
        className="relative px-7 py-4 font-mono"
        style={{ background: PAPER }}
      >
        {revealStamp ? (
          <motion.span
            className="inline-flex"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 14 }}
          >
            <VerifiedStamp signature={signature} />
          </motion.span>
        ) : (
          <VerifiedStamp signature={signature} />
        )}
      </div>

      <Perf />
    </div>
  );
}
