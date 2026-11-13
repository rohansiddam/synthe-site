import { HALF_A, HALF_B, HoverArrow } from "./Mark";
import { RevealSection } from "./Reveal";
import { FlapText } from "./FlapText";
import { ClimbLine } from "./Scenes";

/* The shared footer: identical on every page. */
export function SiteFoot() {
  return (
    <footer className="site-foot">
      <p className="footer-brand" data-port="footer">
        <svg className="footer-logo" viewBox="0 0 275 290" aria-hidden="true">
          <path className="a" d={HALF_A} />
          <path className="b" d={HALF_B} />
        </svg>
        Synthe
      </p>
      <p className="footer-line">
        Self-improving AI agents. You say what good looks like. Synthe tests changes and keeps only
        what wins.
      </p>
      <nav className="footer-nav" aria-label="Footer">
        <a href="/docs.html">Docs</a>
        <a href="/docs.html#remove">Limits and your data</a>
        <a href="https://github.com/synthelabs/synthe/releases">Changelog</a>
        <a href="/#partner">Contact</a>
        <a href="https://github.com/synthelabs/synthe">GitHub</a>
      </nav>
      <p className="footer-legal">
        Synthe is an early project, open source under Apache-2.0 (
        <a href="https://github.com/synthelabs/synthe/blob/main/LICENSE">license</a>). It tests
        prompt changes on simulated messages, so read what it changes before you rely on it.
      </p>
    </footer>
  );
}

/* The morning report band (PR D): the public demo run's real report, in the
   order the product sends it (pass rate, what merged, spend). Values from
   the demo run, report issue #3, run 2, 2026-11-03. The homepage's link is
   the arrow link; Docs uses its plain text link, as on the static pages. */
export function ReportBand({ variant }: { variant: "home" | "docs" }) {
  return (
    <RevealSection solo className="report-band" data-port="report" aria-labelledby="morning-report-h">
      <h2 className="report-band-label" id="morning-report-h">
        The morning report
      </h2>
      <p className="report-band-src">
        Every run ends with a report like this one.
      </p>
      <div className="report-band-main">
        <div className="report-band-lines">
          <p>
            <span className="rb-key">Checks passed</span>
            <span className="rb-val">
              <FlapText text="89% of the time, up from 72%. Held-out score 50% to 80%." />
          </span>
        </p>
        <p>
          <span className="rb-key">Merged</span>
          <span className="rb-val">
            <FlapText
              text="Stop approving refunds and inventing dates (PR #8). 4 rounds: 1 merged, 2 no winner, 1 failed."
              delay={0.18}
            />
          </span>
        </p>
        <p>
          <span className="rb-key">Spend</span>
          <span className="rb-val">
            <FlapText text="$0.32 of a $3 budget." delay={0.36} />
          </span>
          </p>
        </div>
        <ClimbLine />
      </div>
      {variant === "home" ? (
        <a className="arrow-link" href="https://github.com/synthelabs/support-bot/issues/3">
          Read the full report <HoverArrow />
        </a>
      ) : (
        <a className="textlink" href="https://github.com/synthelabs/support-bot/issues/3">
          Read the full report
        </a>
      )}
    </RevealSection>
  );
}
