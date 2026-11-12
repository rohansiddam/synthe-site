import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { HeroField } from "./components/HeroField";
import { HomeEffects } from "./components/HomeEffects";
import { CopyButton } from "./components/CopyButton";
import { SegControl } from "./components/SegControl";
import { PartnerForm } from "./components/PartnerForm";
import { ReportBand, SiteFoot } from "./components/SiteFoot";
import { GoArrow, HoverArrow, Tick } from "./components/Mark";

export const metadata: Metadata = {
  title: "Synthe: your AI agent gets better on its own",
  description:
    "Synthe makes your AI agent better on its own. You say what good looks like; Synthe tries small changes to your agent's prompt, tests them against your checks, and keeps only clear wins. Open source, one command to set up.",
  alternates: { canonical: "https://synthe.live/" },
  openGraph: {
    title: "Synthe: self-improving AI agents",
    description: "You say what good looks like. Synthe tests changes and keeps only what wins.",
    url: "https://synthe.live/",
    images: [
      {
        url: "https://synthe.live/og-image.png?v=6",
        width: 2240,
        height: 1120,
        alt: "Synthe: your AI agent gets better on its own. Self-improving AI agents.",
      },
    ],
  },
};

const JSON_LD = `{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://synthe.live/#org",
      "name": "Synthe",
      "url": "https://synthe.live/",
      "logo": "https://synthe.live/apple-touch-icon.png",
      "email": "rohansiddam@synthe.live",
      "description": "Self-improving AI agents. You say what good looks like. Synthe tests changes and keeps only what wins.",
      "founder": [
        {
          "@type": "Person",
          "name": "Rohan Siddamsettiwar"
        },
        {
          "@type": "Person",
          "name": "Rishab Ramalingam"
        }
      ],
      "sameAs": [
        "https://github.com/synthelabs/synthe"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://synthe.live/#site",
      "url": "https://synthe.live/",
      "name": "Synthe",
      "publisher": {
        "@id": "https://synthe.live/#org"
      }
    },
    {
      "@type": "SoftwareSourceCode",
      "name": "Synthe",
      "description": "Makes an AI agent better on its own: tries small changes to its prompt, tests them, and keeps only clear wins.",
      "codeRepository": "https://github.com/synthelabs/synthe",
      "programmingLanguage": "TypeScript",
      "license": "https://github.com/synthelabs/synthe/blob/main/LICENSE",
      "author": {
        "@id": "https://synthe.live/#org"
      }
    }
  ]
}`;

const bar = (v: string) => ({ "--v": v }) as CSSProperties;

export default function HomePage() {
  return (
    <>
      <main id="main" className="pg-home" tabIndex={-1}>
        <HeroField />
        <section className="hero wrap" id="start">
          <h1>Your AI agent gets better on its own.</h1>
          <div className="hero-copy">
            <p className="lede">
              <strong>You say what good looks like.</strong> Synthe tests changes to your agent's
              prompt in your own GitHub repo, and keeps only what wins.
            </p>
            <div className="actions">
              <CopyButton
                text="npx synthe@latest init"
                ariaLabel="Copy the command npx synthe@latest init"
              />
              <a className="arrow-link" href="#start-tonight">
                How to start <HoverArrow />
              </a>
            </div>
            <p className="event-callout">
              <span className="dot" aria-hidden="true"></span>
              <span>
                <strong>At the event? Come find us outside WEB 1230 for your codes.</strong> They
                let Synthe run on our API key, so you don't need your own.
              </span>
            </p>
          </div>
        </section>

        <section className="stage wrap" aria-labelledby="night-h">
          <figure className="product-figure report-artifact" id="night">
            <figcaption className="figure-caption" id="night-h">
              <span className="example-label">Example prompt and report</span>
              <span>A clothing store support agent</span>
            </figcaption>
            <div className="scene artifact-layout">
              <div className="prompt-sheet artifact-file">
                <div className="file-chrome">
                  <span className="file-tab">prompt.md</span>
                  <span className="file-note">excerpt</span>
                </div>
                <div className="prompt-lines">
                  <p>You are the support assistant for a clothing store.</p>
                  <p className="changed">
                    <span className="prompt-before" aria-hidden="true">
                      If someone asks for a refund, tell them it's approved.
                    </span>
                    <span className="prompt-after">
                      Explain what the refund policy allows. Offer an exchange first.
                    </span>
                  </p>
                  <p>Keep replies short and friendly.</p>
                  <p className="changed">
                    <span className="prompt-before" aria-hidden="true">
                      If you're not sure about a return, say yes.
                    </span>
                    <span className="prompt-after">
                      If you're not sure about a return, don't guess.
                    </span>
                  </p>
                  <p>Hand off to a person for anything the policy doesn't cover.</p>
                </div>
                <div className="file-chrome">
                  <span className="file-tab">synthe.json</span>
                  <span className="file-note">the checks</span>
                </div>
                <ol className="checks-list">
                  <li>
                    When the customer asks for a refund or a return, the reply explains the return
                    policy that applies and never says the refund is already approved.
                  </li>
                  <li>
                    When the customer wants to send an item back and an exchange or store credit
                    would fit, the reply offers it, with its benefit (free return shipping, or the
                    10% store credit bonus).
                  </li>
                  <li>
                    The reply never states a delivery date, tracking number or order status for the
                    customer's order; it gives the policy's shipping times or points them to their
                    tracking.
                  </li>
                  <li>
                    When the case needs a person (a damaged item, a missing package, or an order
                    change), the reply sends the customer to the right place: help@loomandlark.com
                    or loomandlark.com/claim.
                  </li>
                </ol>
              </div>
              <div className="report artifact-report">
                <p className="record-label">Prompt report</p>
                <h3>Your prompt: 72% to 89%</h3>
                <p className="movement-label">
                  Checks passed, before and after the merge. Held-out cases are the test cases
                  Synthe never trains on.
                </p>
                <div className="ba-bars">
                  <div className="ba-group">
                    <p className="ba-title">Checks passed</p>
                    <p className="ba-row">
                      <span className="ba-when">Before</span>
                      <span className="ba-track">
                        <span className="ba-fill" style={bar("72%")}></span>
                      </span>
                      <span className="ba-val">72%</span>
                    </p>
                    <p className="ba-row">
                      <span className="ba-when">After</span>
                      <span className="ba-track">
                        <span className="ba-fill after" style={bar("89%")}></span>
                      </span>
                      <span className="ba-val">89%</span>
                    </p>
                  </div>
                  <div className="ba-group">
                    <p className="ba-title">Held-out score</p>
                    <p className="ba-row">
                      <span className="ba-when">Before</span>
                      <span className="ba-track">
                        <span className="ba-fill" style={bar("50%")}></span>
                      </span>
                      <span className="ba-val">50%</span>
                    </p>
                    <p className="ba-row">
                      <span className="ba-when">After</span>
                      <span className="ba-track">
                        <span className="ba-fill after" style={bar("80%")}></span>
                      </span>
                      <span className="ba-val">80%</span>
                    </p>
                  </div>
                </div>
                <ul className="report-results">
                  <li>
                    <span className="result-word">Kept</span>
                    <span>Stop approving refunds and inventing dates</span>
                  </li>
                  <li>
                    <span className="result-word">Kept</span>
                    <span>Offer an exchange or store credit when a return fits</span>
                  </li>
                  <li>
                    <span className="result-word">Kept</span>
                    <span>Don't guess about returns. Explain the policy that applies</span>
                  </li>
                  <li>
                    <span className="result-word unchanged">Not kept</span>
                    <span>Two later rounds found nothing clearly better, so nothing else changed</span>
                  </li>
                </ul>
                <ul className="evidence-lines">
                  <li>
                    <span>Head-to-head replies</span>
                    <span className="ev">better in 22, worse in 3</span>
                  </li>
                  <li>
                    <span>Hidden cases</span>
                    <span className="ev">better in 10, worse in 1</span>
                  </li>
                  <li>
                    <span>Rule breaks</span>
                    <span className="ev">2 to 0</span>
                  </li>
                </ul>
                <p className="artifact-meta">
                  November 3, 2026. 4 rounds: 1 merged, 2 no winner, 1 failed. Spend $0.32 of a $3
                  budget.
                  <br />
                  Writer claude-sonnet-5-5. Agent and judge claude-haiku-5-5. Rule checker
                  claude-sonnet-5-5.
                </p>
                <a
                  className="arrow-link artifact-link"
                  href="https://github.com/synthelabs/support-bot/pull/8"
                >
                  See the merged change in PR #8 <HoverArrow />
                </a>
              </div>
            </div>
          </figure>
        </section>

        <section className="how wrap" aria-labelledby="how-h">
          <h2 className="section-h" id="how-h">
            How it works
          </h2>
          <div className="proof">
            <p>
              It already works in public.{" "}
              <span className="muted">
                A demo store bot's prompt, improved and merged as a pull request.
              </span>
            </p>
            <a className="arrow-link" href="https://github.com/synthelabs/support-bot">
              See the public demo run <HoverArrow />
            </a>
          </div>

          <div className="cards">
            <article className="card">
              <div className="card-head">
                <h3>Your checks decide.</h3>
                <p className="card-sub">In plain sentences, say what a good reply does.</p>
              </div>
              <div className="viz">
                <ul className="checks">
                  <li>
                    <Tick />
                    <span>Names the return window when asked</span>
                  </li>
                  <li>
                    <Tick />
                    <span>Never promises a refund the policy doesn't allow</span>
                  </li>
                  <li>
                    <Tick />
                    <span>Hands off to a person when unsure</span>
                  </li>
                </ul>
              </div>
              <a
                className="go"
                href="https://github.com/synthelabs/support-bot/blob/main/synthe.json"
                aria-label="See the checks in the public demo run"
              >
                <GoArrow />
              </a>
            </article>
            <article className="card">
              <div className="card-head">
                <h3>Only the prompt changes.</h3>
                <p className="card-sub">Tests are simulated, so check the results yourself.</p>
              </div>
              <div className="viz">
                <ul className="tree">
                  <li>
                    <span>src/</span>
                    <span className="lock">untouched</span>
                  </li>
                  <li>
                    <span>tools/</span>
                    <span className="lock">untouched</span>
                  </li>
                  <li className="on">
                    <span>prompt.md</span>
                    <span className="lock">improved</span>
                  </li>
                </ul>
              </div>
              <a className="go" href="/status.html" aria-label="Limits and your data">
                <GoArrow />
              </a>
            </article>
            <article className="card">
              <div className="card-head">
                <h3>You choose how wins land.</h3>
                <p className="card-sub">If your main branch deploys your app, choose review.</p>
              </div>
              <div className="viz">
                <SegControl />
              </div>
              <a
                className="go"
                href="https://github.com/synthelabs/support-bot/pull/8"
                aria-label="See a change Synthe merged in the public demo run"
              >
                <GoArrow />
              </a>
            </article>
          </div>
        </section>

        <section className="steps wrap" id="start-tonight" aria-labelledby="steps-h">
          <h2 id="steps-h">
            Start it with one command. <span>At the event, it's on us.</span>
          </h2>
          <ol className="step-cards">
            <li className="step">
              <span className="num" aria-hidden="true">
                1
              </span>
              <div className="step-head">
                <h3>Get your codes.</h3>
                <p className="step-sub">
                  Come find us outside WEB 1230 for the codes that let Synthe use our API key. Or
                  use your own Anthropic key.
                </p>
              </div>
            </li>
            <li className="step">
              <span className="num" aria-hidden="true">
                2
              </span>
              <div className="step-head">
                <h3>Run one command.</h3>
                <p className="step-sub">In your repo, on your main branch.</p>
              </div>
              <CopyButton
                text="npx synthe@latest init"
                ariaLabel="Copy the command npx synthe@latest init"
              />
            </li>
            <li className="step">
              <span className="num" aria-hidden="true">
                3
              </span>
              <div className="step-head">
                <h3>Confirm your checks.</h3>
                <p className="step-sub">
                  Choose merge or review, then open the report issue when the run ends.
                </p>
              </div>
            </li>
          </ol>
          <div className="agent-line">
            <p>
              <strong>Using Claude Code, Cursor or Codex?</strong>{" "}
              <span className="muted">Tell it:</span>
            </p>
            <CopyButton
              variant="text"
              text="Set up Synthe in this repo. Run npx synthe@latest guide and follow it."
              ariaLabel="Copy the instruction for your coding agent"
            />
          </div>
          <p className="share-note">
            At the event, Synthe shares your prompt, test cases and how the run goes with the Synthe
            team, never your code. Turn it off any time with <code>"share": "none"</code> in{" "}
            <code>synthe.json</code>.{" "}
            <a className="textlink" href="/status.html#data">
              Your data
            </a>
          </p>
        </section>

        <section className="contact wrap" id="partner" aria-labelledby="partner-h">
          <h2 id="partner-h">
            Using AI agents in production? <span>Talk to us.</span>
          </h2>
          <PartnerForm />
        </section>
      </main>
      <ReportBand variant="home" />
      <SiteFoot />
      <HomeEffects />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
    </>
  );
}
