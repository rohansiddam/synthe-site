"use client";

import type { ReactNode } from "react";
import { motion, type useAnimationControls } from "framer-motion";

type AnimationControls = ReturnType<typeof useAnimationControls>;
import { Card } from "@astryxdesign/core/Card";
import { Mark } from "@/app/components/Mark";

/* The console's kit (Lane N2).
   Astryx is invisible infrastructure here (founder brand directive,
   2026-11-12): the only Astryx surface the console consumes is the
   Card primitive, and none of its default appearance survives. Two
   bindings make that work, both documented here and in
   app/providers.tsx:
   1. Mode: Providers passes the site's own theme (the data-theme
      attribute the site toggle drives) to Astryx's <Theme mode>, so
      Astryx's light-dark() tokens resolve the way the site does.
   2. Tokens: app/globals.css scopes Astryx's custom properties inside
      .console to the site's tokens (card, line, ink, ok, red, the site
      fonts, and the site's 10px card radius in place of Astryx's
      12px), so the card's background, border, text and semantic colors
      are the site's own and the stoplight language (playbook C2) has
      exactly one set of meanings. What remains of Astryx is the
      primitive's behavior, not its look.
   Two Astryx components were dropped under the same directive:
   - Badge: a pill chip is design-system vocabulary, and its geometry
     is compiled into Astryx rather than token-driven, so it cannot be
     restyled into Synthe's language. Round states are RoundState
     below: the logo mark in its locked, stale, refused and open
     states, with the state word in IBM Plex Mono, the product's
     report voice.
   - ProgressBar: the same compiled-geometry problem. SpendCard
     renders the site's own bar treatment instead (8px track, line
     border, quiet fill, as the hero's before/after bars) and keeps
     the progressbar semantics by hand.
   Card padding is set to 0: each card lays out its own content on the
   site's spacing scale, which keeps the concentric-radii math (C3) in
   the site's hands rather than Astryx's spacing steps. */

export function CardShell({
  index,
  className,
  controls,
  labelledBy,
  children,
}: {
  index: number;
  className: string;
  controls: AnimationControls;
  labelledBy: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      className={`console-cell ${className}`}
      custom={index}
      initial="rest"
      animate={controls}
      variants={{
        rest: { opacity: 1, y: 0 },
        hidden: { opacity: 0, y: 10 },
        show: (i: number) => ({
          opacity: 1,
          y: 0,
          transition: { delay: 0.08 + i * 0.055, duration: 0.35, ease: "easeOut" },
        }),
      }}
      whileHover={{ y: -2, transition: { duration: 0.18, ease: "easeOut" } }}
    >
      <Card padding={0} className="console-card" style={{ height: "100%" }}>
        <section className="console-card-in" aria-labelledby={labelledBy}>
          {children}
        </section>
      </Card>
    </motion.div>
  );
}

/* A round's state in the product's own marks and words (recognition
   over recall: never a bare icon for a product state). The mark is the
   logo itself: halves locked for a merge, dashed and apart when a
   round found no winner (the mark system's stale state), split in red
   when a round failed (refused), held open while a round is being
   tested. The word beside it is set in IBM Plex Mono, the report
   voice. The PR card's open/merged pill is NOT this component:
   GitHub's state pill is a convention of its own (Jakob's law), so
   PullRequestCard renders that pill itself in the site's tokens. */
export function RoundState({
  kind,
}: {
  kind: "merged" | "no-winner" | "failed" | "testing" | "queued";
}) {
  if (kind === "queued") {
    return <span className="console-round-state is-queued">Queued</span>;
  }
  const markState =
    kind === "merged"
      ? ""
      : kind === "no-winner"
        ? "stale"
        : kind === "failed"
          ? "refused"
          : "open";
  const word =
    kind === "merged"
      ? "Merged"
      : kind === "no-winner"
        ? "No winner"
        : kind === "failed"
          ? "Failed"
          : "Testing";
  return (
    <span className={`console-round-state is-${kind}`}>
      <Mark className="console-round-mark" state={markState} />
      {/* The word remounts on a state change (key) so it can ease in
          while the mark's halves travel on their CSS transition. */}
      <span key={kind} className="console-round-word">
        {word}
      </span>
    </span>
  );
}

export function CardHead({
  id,
  eyebrow,
  right,
}: {
  id: string;
  eyebrow: string;
  right?: ReactNode;
}) {
  return (
    <div className="console-card-head">
      <h3 className="console-eyebrow" id={id}>
        {eyebrow}
      </h3>
      {right ? <div className="console-head-right">{right}</div> : null}
    </div>
  );
}
