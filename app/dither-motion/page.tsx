import type { Metadata } from "next";
import { SiteFoot } from "../components/SiteFoot";
import { DitherClimb } from "./DitherClimb";
import { DitherTransition } from "./DitherTransition";
import { DitherRecord } from "./DitherRecord";

/* Lane D2 exploration route: dithered motion studies. Not linked from
   the site nav and marked noindex; it exists so the founder can judge
   the treatments on the branch preview next to the real pages. The
   production pages are untouched. */

export const metadata: Metadata = {
  title: "Dither studies · Synthe",
  description:
    "Design exploration: ordered dithering applied to Synthe's recorded run visuals.",
  robots: { index: false, follow: false },
};

export default function DitherMotionPage() {
  return (
    <>
      <main id="main" className="pg-home pg-dither" tabIndex={-1}>
        <div className="d2-wrap">
          <header className="d2-head">
            <p className="console-eyebrow">Explorations · Dither</p>
            <h1 className="d2-title">Dither studies</h1>
            <p className="d2-lede">
              Three prototypes in ordered dithering, drawn from Synthe's recorded runs. The
              numbers are the real record, the same ones the console replays. Judge the texture,
              not the copy.
            </p>
          </header>
          <DitherClimb />
          <DitherTransition />
          <DitherRecord />
          <p className="d2-foot-note">
            Prototype route, not part of the site. Bayer 8 by 8 ordered dither on canvas, in the
            site's tokens in both themes. Motion pauses off-screen; reduced motion gets the
            static final render.
          </p>
        </div>
      </main>
      <SiteFoot />
    </>
  );
}
