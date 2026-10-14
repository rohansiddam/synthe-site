"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { StaggeredHeadline } from "./StaggeredHeadline";
import { Eyebrow } from "./Eyebrow";
import { Button } from "./Button";
import { Logo } from "./Logo";
import { Terminal } from "./Terminal";
import { ReceiptCard } from "./ReceiptCard";

/* ------------------------------------------------------------------ */
/* Feature grid: the three product pillars, built from the component   */
/* system. Rendered twice (pinned transition + static section); the    */
/* pinned copy is aria-hidden so assistive tech sees it once.          */
/* ------------------------------------------------------------------ */

function FeatureGrid() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-10 text-center">
        <Eyebrow className="mb-3">how it holds</Eyebrow>
        <h2 className="text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
          One gate. Three guarantees.
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <article className="flex flex-col rounded-2xl border border-line bg-card p-6">
          <Eyebrow className="mb-4">the gate</Eyebrow>
          <h3 className="mb-2 text-xl font-semibold tracking-[-0.01em]">
            Approval binds the push
          </h3>
          <p className="mb-6 text-[15px] leading-relaxed text-muted">
            Synthe holds the only credential. Agents propose, you approve,
            Synthe pushes exactly the change you approved, once.
          </p>
          <div className="mt-auto">
            <Terminal
              title="synthe check"
              lines={[
                { text: "synthe check h-2026-1042", tone: "command" },
                {
                  text: "signature binds sender, receiver, idempotency key",
                  tone: "output",
                },
                { text: "approval replay: none found", tone: "output" },
              ]}
              status={{ verdict: "ACCEPT", detail: "h-2026-1042 verified" }}
            />
          </div>
        </article>

        <article className="flex flex-col rounded-2xl border border-line bg-card p-6">
          <Eyebrow className="mb-4">the proof</Eyebrow>
          <h3 className="mb-2 text-xl font-semibold tracking-[-0.01em]">
            Every handoff ends as a signed receipt
          </h3>
          <p className="mb-6 text-[15px] leading-relaxed text-muted">
            Synthe makes claims with receipts attached. Every handoff links to
            the run, file, or measurement behind it.
          </p>
          <div className="mt-auto">
            <ReceiptCard
              number="#0042"
              from="agent/fix-login"
              to="main"
              meta="2 files, approved by you, committed once"
              timestamp="2026-10-13 22:04 MDT"
              signature="9f2c...a1"
            />
          </div>
        </article>

        <article className="flex flex-col rounded-2xl border border-line bg-card p-6">
          <Eyebrow className="mb-4">the refusal</Eyebrow>
          <h3 className="mb-2 text-xl font-semibold tracking-[-0.01em]">
            Every shipped attack, refused
          </h3>
          <p className="mb-6 text-[15px] leading-relaxed text-muted">
            Rewrite the objective. Forge the approval. Replay the handoff. The
            checker refuses each one, and the refusal is on the record.
          </p>
          <div className="mt-auto">
            <Terminal
              title="synthe check"
              lines={[
                { text: "synthe check h-2026-1043", tone: "command" },
                {
                  text: "objective hash mismatch: expected 9f2c, got 71bd",
                  tone: "output",
                },
                {
                  text: "forged approval: signature not in registry",
                  tone: "output",
                },
              ]}
              status={{ verdict: "REJECT", detail: "h-2026-1043 refused" }}
            />
          </div>
        </article>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero copy. `animated` gates the mount choreography so the reduced-  */
/* motion path renders plain elements with no animation at all.        */
/* ------------------------------------------------------------------ */

function HeroContent({
  animated,
  logoOpen,
}: {
  animated: boolean;
  logoOpen: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Fade: any = animated ? motion.div : "div";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Rise: any = animated ? motion.p : "p";
  const fade = (delay: number) =>
    animated
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.5, delay, ease: "easeOut" as const },
        }
      : {};
  const rise = (delay: number) =>
    animated
      ? {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: "easeOut" as const },
        }
      : {};

  return (
    <div className="flex flex-col items-center px-6 text-center">
      <Fade {...fade(0.05)}>
        <Logo open={logoOpen} className="mb-6 h-14 w-14" />
      </Fade>
      <Fade {...fade(0.15)}>
        <Eyebrow className="mb-5">agent handoff contracts</Eyebrow>
      </Fade>
      <StaggeredHeadline
        text="Let AI agents ship code without handing them the keys."
        className="max-w-4xl text-5xl font-semibold tracking-[-0.03em] md:text-7xl"
      />
      <Rise
        {...rise(0.6)}
        className="mt-6 max-w-2xl text-lg leading-relaxed text-muted"
      >
        <b className="font-semibold text-ink">
          Agents propose. You approve. Synthe commits.
        </b>{" "}
        Synthe holds the only credential, pushes exactly the change you
        approved, once, and signs a receipt anyone can verify.
      </Rise>
      <Fade {...fade(0.75)}>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="primary"
            href="#install"
            icon={<Logo open={false} className="h-[18px] w-[18px]" />}
          >
            Install
          </Button>
          <Button variant="secondary" href="#how">
            How it works
          </Button>
        </div>
      </Fade>
      <Fade {...fade(0.9)}>
        <p className="mt-6 font-mono text-[13px] text-muted">
          Public beta · macOS and Linux · Claude Code, OpenClaw or any git push
        </p>
      </Fade>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Animated: pinned 260vh track. The hero settles and fades while the  */
/* grid rises to meet the viewport, then scrolls off naturally into    */
/* the static grid section below. Transform and opacity only.          */
/* ------------------------------------------------------------------ */

function AnimatedHero() {
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  // Hero exit: progress 0.35 -> 0.7
  const heroOpacity = useTransform(scrollYProgress, [0.35, 0.7], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0.35, 0.7], [1, 0.85]);
  const heroY = useTransform(scrollYProgress, [0.35, 0.7], [0, -80]);

  // Scroll cue fades almost immediately
  const cueOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  // Grid: rises 0.45 -> 0.8 and settles. No exit animation: the pin
  // releases and the sticky scrolls off naturally, tiling seamlessly into
  // the identical static grid section below (one continuous surface).
  const gridY = useTransform(scrollYProgress, [0.45, 0.8], ["32vh", "0vh"]);
  const gridOpacity = useTransform(scrollYProgress, [0.45, 0.62], [0, 1]);

  const [logoOpen, setLogoOpen] = useState(false);
  const [heroActive, setHeroActive] = useState(true);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setLogoOpen(v > 0.45);
    setHeroActive(v < 0.6);
  });

  return (
    <>
      <div ref={trackRef} className="relative h-[260vh]">
        <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden">
          <motion.div
            style={{
              opacity: heroOpacity,
              scale: heroScale,
              y: heroY,
            }}
            className={`w-full ${heroActive ? "" : "pointer-events-none"}`}
          >
            <HeroContent animated logoOpen={logoOpen} />
          </motion.div>

          <motion.div
            aria-hidden="true"
            style={{ opacity: gridOpacity, y: gridY }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center px-6"
          >
            <FeatureGrid />
          </motion.div>

          <motion.p
            style={{ opacity: cueOpacity }}
            className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[13px] tracking-wide text-muted"
          >
            scroll
          </motion.p>
        </div>
      </div>

      {/* The real grid: centered in a full viewport section so it tiles
          seamlessly with the pinned grid as the pin releases. */}
      <section className="mx-auto flex min-h-svh w-full max-w-6xl items-center px-6 pb-32">
        <FeatureGrid />
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Reduced motion: no pinning, no scroll animation. Hero, then grid,    */
/* all fully visible.                                                  */
/* ------------------------------------------------------------------ */

function StaticHero() {
  return (
    <>
      <section className="mx-auto flex min-h-svh w-full max-w-4xl flex-col items-center justify-center py-24">
        <HeroContent animated={false} logoOpen={false} />
      </section>
      <section className="mx-auto max-w-6xl px-6 pb-32">
        <FeatureGrid />
      </section>
    </>
  );
}

export function ScrollHero() {
  const reduce = useReducedMotion();
  if (reduce) return <StaticHero />;
  return <AnimatedHero />;
}
