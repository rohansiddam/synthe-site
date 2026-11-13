import type { Metadata } from "next";
import { AsciiScene } from "../../components/ascii/AsciiScene";
import { ContourGlyphs } from "../../components/ascii/ContourGlyphs";
import { SkylineDivider } from "../../components/ascii/SkylineDivider";
import { WordField } from "../../components/ascii/WordField";

export const metadata: Metadata = {
  title: "Synthe — the mark in type (ASCII prototype)",
  description:
    "Exploration prototype: the Synthe mark drawn out of IBM Plex Mono glyphs by a WebGL shader, with scroll-driven flow, a dithered terrain section edge and a glyph contour form.",
};

/* /ascii: an exploration lane page (lane/ascii-shader), not production.
 * Three treatments on one tall scroll:
 *   1. the logo field (fixed WebGL canvas behind the first sections),
 *   2. a dithered terrain skyline as the section edge into the band,
 *   3. a glyph-contour whorl behind the morning report inside the band.
 * The theme toggle in the site header drives every canvas. */
export default function AsciiPage() {
  return (
    <div className="ascii-page">
      <AsciiScene />

      <section className="ascii-hero">
        <p className="ascii-kicker">Synthe · exploration lane · treatment 01</p>
        <h1 className="ascii-title">The mark, drawn in type.</h1>
        <p className="ascii-sub">
          The Synthe logo, sampled cell by cell and rebuilt from IBM Plex Mono glyphs. It flickers
          inside its own density, and it flows when you scroll.
        </p>
        <p className="ascii-depth ascii-depth-hero">scroll 000 · the field is live</p>
      </section>

      <section className="ascii-spacer">
        <p className="ascii-depth">scroll 100 · the warp follows smoothed scroll, never the raw wheel</p>
        <p className="ascii-depth ascii-depth-low">scroll 200 · still the same recorded mark, displaced</p>
        <p className="ascii-depth ascii-depth-edge">treatment 02 · the edge ahead is the climb, stepped</p>
      </section>

      <SkylineDivider />

      <section className="ascii-band">
        <ContourGlyphs />
        <div className="ascii-band-copy">
          <p className="ascii-band-eyebrow">The morning report</p>
          <p className="ascii-band-intro">Every run ends with a report like this one.</p>
          <p className="ascii-band-line">
            <span>Checks passed</span>
            <strong>89% of the time, up from 72%. Held-out score 50% to 80%.</strong>
          </p>
          <p className="ascii-band-line">
            <span>Merged</span>
            <strong>Stop approving refunds and inventing dates (PR #8). 4 rounds: 1 merged, 2 no winner, 1 failed.</strong>
          </p>
          <p className="ascii-band-line">
            <span>Spend</span>
            <strong>$0.32 of a $3 budget.</strong>
          </p>
          <p className="ascii-band-note">
            Treatment 03, behind this copy: the site&apos;s contour field drawn entirely from
            glyphs, at a fifth of full strength.
          </p>
        </div>
      </section>

      <section className="ascii-words">
        <WordField />
        <p className="ascii-words-title">Treatment 04 · the word field</p>
        <p className="ascii-words-label">
          Synthe&apos;s own phrases in rows; their brightness is the climb. Phrases swap slowly,
          inside their length class, so the shape holds.
        </p>
      </section>

      <section className="ascii-end">
        <p className="ascii-depth">end of field · lane/ascii-shader · prototype, not production</p>
      </section>
    </div>
  );
}
