import type { Metadata } from "next";
import { Mark } from "../components/Mark";
import { DitherMark } from "./DitherMark";
import { DitherGround } from "./DitherGround";
import { ScrollResolve } from "./ScrollResolve";

export const metadata: Metadata = {
  title: "Dither studies — Synthe (exploration)",
  description:
    "Lane D1 exploration: the Synthe mark and hero ground rendered as ordered dither. Not production.",
  robots: { index: false, follow: false },
};

/* Exploration page for the dithered identity treatments. Production pages
   are untouched; everything here is a study the founder judges on its own.
   Labels follow the site's mono record voice. */

export default function DitherPage() {
  return (
    <main id="main" className="pg-dither" tabIndex={-1}>
      <div className="wrap dither-intro">
        <p className="dither-kicker">Synthe · Dither studies · Lane D1</p>
        <h1 className="dither-h1">Print, resolving.</h1>
        <p className="dither-lede">
          Three studies in ordered dither: the mark as a dot field, the hero ground as living
          grain, and a mark that resolves as you scroll. Exploration only; the live site is
          unchanged. Flip the theme in the header; every study follows it.
        </p>
      </div>

      <section className="wrap dither-study" aria-labelledby="d1-h">
        <p className="dither-label" id="d1-h">
          01 · The mark, printed
        </p>
        <div className="dither-mark-row">
          <div className="dither-mark-cell">
            <DitherMark drive="cycle" />
          </div>
          <div className="dither-source-cell">
            <Mark className="dither-source-mark" />
            <p className="dither-read">The source. Same paths, no redraw.</p>
          </div>
        </div>
        <p className="dither-note">
          Bayer 8×8 thresholds over the mark's true coverage. The grid prints coarse, resolves
          fine, breathes, and eases back. Ink half and brick half keep their colours through
          the grain.
        </p>
      </section>

      <section className="dither-hero" aria-labelledby="d2-h">
        <DitherGround />
        <div className="wrap dither-hero-copy">
          <p className="dither-label dither-label-on" id="d2-h">
            02 · Hero ground, dithered
          </p>
          <h2 className="dither-hero-h">Your AI agent gets better on its own.</h2>
          <p className="dither-hero-lede">
            <strong>You say what good looks like.</strong> Synthe tests changes to your agent's
            prompt in your own GitHub repo, and keeps only what wins.
          </p>
        </div>
      </section>

      <div className="wrap dither-study dither-study-tight">
        <p className="dither-label" id="d3-h">
          03 · Scroll resolves the mark
        </p>
        <p className="dither-note">
          One long scroll. The same mark starts as coarse grain and prints finer the further
          the section travels.
        </p>
      </div>
      <ScrollResolve />

      <div className="wrap dither-foot">
        <p className="dither-read">
          Reduced motion renders each study as a still, at full resolution. The still is the
          texture. · Lane D1 · Not production.
        </p>
      </div>
    </main>
  );
}
