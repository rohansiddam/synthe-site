import type { Metadata } from "next";
import { HeroField } from "./components/HeroField";
import { HeroDrift } from "./components/HeroDrift";
import {
  RevealArticle,
  RevealDiv,
  RevealH2,
  RevealLi,
  RevealSection,
} from "./components/Reveal";
import { Console } from "@/components/console/Console";
import { HomeEffects } from "./components/HomeEffects";
import { CopyButton } from "./components/CopyButton";
import { SegControl } from "./components/SegControl";
import { PartnerForm } from "./components/PartnerForm";
import { ReportBand, SiteFoot } from "./components/SiteFoot";
import { WorkedExample } from "./components/WorkedExample";
import { ChecksScene, MergeScene, ReportScene } from "./components/Scenes";
import { GoArrow, HoverArrow, Mark } from "./components/Mark";

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

export default function HomePage() {
  return (
    <>
      <main id="main" className="pg-home" tabIndex={-1}>
        <HeroField />
        <HeroDrift>
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
              <span className="record">
                Crimson Hacks, November 2026: three winning teams built with Synthe.
              </span>
            </p>
          </div>
        </HeroDrift>

                <Console />

        <RevealSection className="how wrap" aria-labelledby="how-h">
          <RevealH2 className="section-h" id="how-h">
            How it works
          </RevealH2>
          <RevealDiv className="proof-line">
            <p className="proof-label">One real run, in public · Loom &amp; Lark support bot</p>
            <a className="arrow-link" href="https://github.com/synthelabs/support-bot">
              See the run on GitHub <HoverArrow />
            </a>
          </RevealDiv>

          <WorkedExample />

          <div className="cards">
            <RevealArticle className="card">
              <div className="card-head">
                <p className="scene-eyebrow">The checks</p>
                <h3>Your checks decide.</h3>
              </div>
              <div className="viz">
                <ChecksScene />
              </div>
              <a
                className="go"
                href="https://github.com/synthelabs/support-bot/blob/main/synthe.json"
                aria-label="See the checks Synthe ran"
              >
                <GoArrow />
              </a>
            </RevealArticle>
            <RevealArticle className="card">
              <div className="card-head">
                <p className="scene-eyebrow">The merge</p>
                <h3>Only the prompt changes.</h3>
              </div>
              <div className="viz">
                <MergeScene />
              </div>
              <a
                className="go"
                href="https://github.com/synthelabs/support-bot/pull/8"
                aria-label="See a change Synthe merged"
              >
                <GoArrow />
              </a>
            </RevealArticle>
            <RevealArticle className="card">
              <div className="card-head">
                <p className="scene-eyebrow">The report</p>
                <h3>You get the report.</h3>
              </div>
              <div className="viz">
                <ReportScene />
              </div>
              <a
                className="go"
                href="https://github.com/synthelabs/support-bot/issues/3"
                aria-label="Read the full report"
              >
                <GoArrow />
              </a>
            </RevealArticle>
          </div>
        </RevealSection>

        <RevealSection className="steps wrap" id="start-tonight" aria-labelledby="steps-h">
          <RevealH2 id="steps-h">Start it with one command.</RevealH2>
          <div className="steps-strip">
            <svg
              className="steps-climb"
              viewBox="0 0 1000 56"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M4 48 L580 40 L996 6" />
            </svg>
            <span className="steps-dot is-1" aria-hidden="true" />
            <span className="steps-dot is-2" aria-hidden="true" />
            <Mark className="steps-mark" />
            <ol className="step-cards">
              <RevealLi className="step">
                <span className="num" aria-hidden="true">
                  1
                </span>
                <div className="step-head">
                  <h3>Run one command.</h3>
                </div>
                <CopyButton
                  text="npx synthe@latest init"
                  ariaLabel="Copy the command npx synthe@latest init"
                />
              </RevealLi>
              <RevealLi className="step">
                <span className="num" aria-hidden="true">
                  2
                </span>
                <div className="step-head">
                  <h3>Confirm your checks.</h3>
                </div>
                <div className="seg-anchor">
                  <SegControl />
                </div>
              </RevealLi>
            </ol>
          </div>
          <RevealDiv className="agent-line">
            <p>
              <strong>Using Claude Code, Cursor or Codex?</strong>{" "}
              <span className="muted">Tell it:</span>
            </p>
            <CopyButton
              variant="text"
              text="Set up Synthe in this repo. Run npx synthe@latest guide and follow it."
              ariaLabel="Copy the instruction for your coding agent"
            />
          </RevealDiv>
        </RevealSection>

        <RevealSection className="contact wrap" id="partner" aria-labelledby="partner-h">
          <div>
            <Mark className="contact-mark" view="open" />
            <RevealH2 id="partner-h">
              Using AI agents in production? <span>Talk to us.</span>
            </RevealH2>
          </div>
          <RevealDiv>
            <PartnerForm />
          </RevealDiv>
        </RevealSection>
      </main>
      <ReportBand variant="home" />
      <SiteFoot />
      <HomeEffects />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
    </>
  );
}
