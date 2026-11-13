import type { Metadata } from "next";
import { AsciiScene } from "../../components/ascii/AsciiScene";
import { ContourGlyphs } from "../../components/ascii/ContourGlyphs";
import { SupabaseBand } from "../../components/ascii/SupabaseBand";
import { TerrainBoundary } from "../../components/ascii/TerrainBoundary";
import { WordField } from "../../components/ascii/WordField";

export const metadata: Metadata = {
  title: "Synthe — the mark in type (ASCII prototype)",
  description:
    "Exploration prototype: the Synthe mark drawn out of IBM Plex Mono glyphs by a WebGL shader, its body crawling with mixed letters and digits, a generative band of five glyph fields turning over on their own clocks, glyph tendrils that dock into a rising glyph terrain at the dark section's edge, and the mark dissolving into that dark field.",
};

/* /ascii: an exploration lane page (lane/ascii-shader), not production.
 * Five treatments on one tall scroll:
 *   1. the logo field (fixed WebGL canvas behind the first sections),
 *   2. the band: five glyph fields side by side, each in its own
 *      alphabet, mutating fast and turning over slowly, with a
 *      second instance at a different phase near the footer,
 *   3. the terrain boundary: the dark section's leading edge as a
 *      living glyph terrain that rises on scroll and receives the
 *      logo's tendrils, after which the mark dissolves into the
 *      dark glyph field,
 *   4. a glyph-contour whorl behind the morning report inside the band,
 *   5. the word field, Synthe's own phrases forming the climb.
 * The theme toggle in the site header drives every canvas. */
export default function AsciiPage() {
  return (
    <div className="ascii-page">
      <AsciiScene />

      <section className="ascii-hero">
        <p className="ascii-kicker">Synthe · exploration lane · treatment 01</p>
        <h1 className="ascii-title">The mark, drawn in type.</h1>
        <p className="ascii-sub">
          The Synthe logo, sampled cell by cell and rebuilt from IBM Plex Mono glyphs: letters,
          digits and density marks crawling through its body, never sitting still. Scroll, and
          it strains, then reaches down to meet the terrain rising below.
        </p>
        <p className="ascii-depth ascii-depth-hero">scroll 000 · the field is live</p>
      </section>

      <section className="ascii-bandwrap">
        <SupabaseBand variant={0} />
        <p className="ascii-bandstrip-label">
          Treatment 02 · the band · five fields, five alphabets, mutating by the second and
          turning over on their own clocks
        </p>
      </section>

      <section className="ascii-spacer">
        <p className="ascii-depth">scroll 100 · the mark strains first: a small warp, tension before reach</p>
        <p className="ascii-depth ascii-depth-low">scroll 200 · below, the dark section's front edge is rising to meet it</p>
        <p className="ascii-depth ascii-depth-edge">treatment 03 · a living glyph terrain: the mark reaches down, the crest receives it, then the mark dissolves into the field</p>
      </section>

      <TerrainBoundary />

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
            Treatment 04, behind this copy: the site&apos;s contour field drawn entirely from
            glyphs, at a fifth of full strength.
          </p>
        </div>
      </section>

      <section className="ascii-words">
        <WordField />
        <p className="ascii-words-title">Treatment 05 · the word field</p>
        <p className="ascii-words-label">
          Synthe&apos;s own phrases in rows; their brightness is the climb. Phrases swap
          constantly, inside their length class, so the shape holds while the text churns.
        </p>
      </section>

      <section className="ascii-bandwrap">
        <SupabaseBand variant={1} />
        <p className="ascii-bandstrip-label">
          The band, again · second instance, different seed and phase
        </p>
      </section>

      <section className="ascii-end">
        <p className="ascii-depth">end of field · lane/ascii-shader · prototype, not production</p>
      </section>
    </div>
  );
}
