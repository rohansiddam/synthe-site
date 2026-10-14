"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Eyebrow } from "./Eyebrow";
import { StaggeredHeadline } from "./StaggeredHeadline";
import { Button } from "./Button";
import { ReceiptCard, Perf } from "./ReceiptCard";

/** Paper is a physical object: cream in both themes. */
const PAPER = "#f4eee1";

type Phase = "hidden" | "feeding" | "pause" | "torn";

/** Real machines feed at constant velocity: no spring, no overshoot. */
const FEED_S = 1.6;
const PAUSE_MS = 500;
/** Content lines that print in sequence: header, route, meta, timestamp. */
const LINE_COUNT = 4;

/**
 * Moment 3 — the receipt-printer footer.
 *
 * "Don't take our word for it. Print one." When the section scrolls into
 * view, the sheet feeds out of the slot at constant velocity (the feed
 * window grows while the sheet translates down at the same rate, so the
 * paper visibly travels out of the machine), lines print in sequence as
 * they exit the slot, then the sheet tears off: the roll remnant stays in
 * the printer while the receipt drops, tilts, and lifts off the page, and
 * the verified mark pops in with a spring.
 */
export function ReceiptPrinter() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, {
    once: true,
    margin: "-12% 0px -12% 0px",
  });
  const [phase, setPhase] = useState<Phase>("hidden");
  const [runId, setRunId] = useState(0);
  const [count, setCount] = useState(42);

  useEffect(() => {
    if (reduce || !inView) return;
    setPhase("feeding");
    const t1 = window.setTimeout(() => setPhase("pause"), FEED_S * 1000);
    const t2 = window.setTimeout(
      () => setPhase("torn"),
      FEED_S * 1000 + PAUSE_MS,
    );
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [inView, runId, reduce]);

  const replay = () => {
    if (reduce) return;
    setPhase("hidden");
    setCount((c) => c + 1);
    window.setTimeout(() => setRunId((id) => id + 1), 90);
  };

  const torn = reduce || phase === "torn";
  const revealed = reduce || phase !== "hidden";
  const fed = reduce || phase !== "hidden";
  const feedMotion =
    phase === "hidden"
      ? { duration: 0 }
      : { duration: FEED_S, ease: "easeInOut" as const };

  return (
    <section
      ref={sectionRef}
      aria-label="Print a signed receipt"
      className="border-t border-line"
    >
      <div className="mx-auto max-w-4xl px-6 py-20 md:py-28">
        <Eyebrow className="mb-4">proof, not promises</Eyebrow>
        <StaggeredHeadline
          text="Don't take our word for it. Print one."
          className="mb-4 text-4xl font-semibold tracking-[-0.02em] md:text-5xl"
        />
        <p className="mb-12 max-w-xl text-muted">
          Every handoff ends as a signed receipt. Watch one print itself.
        </p>

        {/* printer */}
        <div className="relative mx-auto w-full max-w-[560px]">
          {/* housing */}
          <div
            className="relative z-10 rounded-[20px] border border-line bg-bg2 px-6 pt-5"
            style={{ paddingBottom: 16 }}
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="m-0 font-mono text-xs text-muted">receipt printer</p>
              <span className="flex items-center gap-2 font-mono text-xs text-muted">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    background: "var(--ok)",
                    boxShadow: "0 0 8px var(--ok)",
                  }}
                />
                ready
              </span>
            </div>
            {/* slot: a recessed opening, not a bar. The paper column tucks
                up behind it, so the sheet passes through the slot with no
                gap at any point in the animation. */}
            <div
              aria-hidden="true"
              className="relative mx-auto w-[min(424px,94%)]"
            >
              <div
                className="h-[14px] rounded-[7px]"
                style={{
                  background: "#040404",
                  boxShadow:
                    "inset 0 5px 10px rgba(0,0,0,0.95), inset 0 -1px 3px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.05)",
                }}
              />
            </div>
          </div>

          {/* paper column: top tucked 18px under the housing, behind the
              slot, so the sheet emerges from the opening itself. The tuck
              leaves the roll remnant's perforated edge peeking out below
              the housing after the feed. */}
          <div className="relative z-0 mx-auto -mt-[18px] w-[min(400px,88%)]">
            {/* feed window: grows at the same constant rate the sheet
                travels down, so the paper's leading edge tracks the
                window's bottom edge like a real feed */}
            <motion.div
              className="overflow-hidden"
              initial={reduce ? { height: "auto" } : { height: 0 }}
              animate={{ height: revealed ? "auto" : 0 }}
              transition={feedMotion}
            >
              <motion.div
                initial={reduce ? { y: "0%" } : { y: "-100%" }}
                animate={{ y: revealed ? "0%" : "-100%" }}
                transition={feedMotion}
              >
                <div className="px-4 pb-10">
                  {/* roll remnant: the paper still in the printer */}
                  <div style={{ background: PAPER }}>
                    <div
                      aria-hidden="true"
                      style={{ height: 22, background: PAPER }}
                    />
                    <Perf />
                  </div>

                  {/* the printed receipt: tears off at the perforation */}
                  <motion.div
                    initial={false}
                    animate={
                      torn
                        ? {
                            y: 12,
                            rotate: -1.5,
                            filter:
                              "drop-shadow(0 18px 22px rgba(27,22,19,0.30))",
                          }
                        : {
                            y: 0,
                            rotate: 0,
                            filter: "drop-shadow(0 0 0 rgba(27,22,19,0))",
                          }
                    }
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 280, damping: 17 }
                    }
                    style={{ transformOrigin: "50% 0%" }}
                  >
                    <ReceiptCard
                      key={runId}
                      number={String(count).padStart(4, "0")}
                      from="agent/fix-login"
                      to="main"
                      meta="2 files changed, 3 approvals bound"
                      timestamp="printed just now"
                      signature="9f2c...a1"
                      feedSync={
                        reduce
                          ? undefined
                          : { lineDelay: FEED_S / LINE_COUNT, active: fed }
                      }
                      revealStamp={!reduce && phase === "torn"}
                    />
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        <div className="mt-2 flex justify-center">
          <Button variant="secondary" onClick={replay}>
            Print another
          </Button>
        </div>
      </div>
    </section>
  );
}
