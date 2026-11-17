import type { Metadata } from "next";
import {
  RevealDiv,
  RevealH2,
  RevealSection,
} from "./components/Reveal";
import { Console } from "@/components/console/Console";
import { HomeEffects } from "./components/HomeEffects";
import { CopyButton } from "./components/CopyButton";
import { SegControl } from "./components/SegControl";
import { PartnerForm } from "./components/PartnerForm";
import { MorphSeam } from "./components/MorphSeam";
import { ReportBand, SiteFoot } from "./components/SiteFoot";
import { HoverArrow, Mark } from "./components/Mark";
import { DitherField } from "./components/DitherField";
import { InstallDirectly } from "./components/InstallDirectly";
import { TiltReportCard } from "./components/TiltReportCard";
import { CompanyBar } from "./components/CompanyBar";
import { FeatureTabs } from "./components/FeatureTabs";
import { InstallTerminal } from "./components/InstallTerminal";
import "./page.css";

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
        <section className={"pg-hero"}>
          <DitherField />
          <div className={"pg-heroScrim"} aria-hidden="true" />
          <div className={"pg-heroInner"}>
            <div className={"pg-heroText"}>
              <h1 className={"pg-heroTitle"}>Your AI agent gets better on its own.</h1>
              <p className={"pg-heroLede"}>
                <strong>You say what good looks like.</strong> Synthe tests changes to your agent's
                prompt in your own GitHub repo, and keeps only what wins.
              </p>
              <div className={"pg-heroActions"}>
                <CopyButton
                  text="npx synthe@latest init"
                  ariaLabel="Copy the command npx synthe@latest init"
                />
                <a className={"pg-howStart"} href="#start-tonight">
                  How to start <HoverArrow />
                </a>
              </div>
              <div className={"pg-heroInstall"}>
                <InstallDirectly />
              </div>
              <p className={"pg-eventLine"}>
                <span className={"pg-eventDot"} aria-hidden="true"></span>
                <span>
                  Crimson Hacks, November 2026: three winning teams built with Synthe.
                </span>
              </p>
            </div>
            <div className={"pg-heroCard"}>
              <TiltReportCard />
            </div>
          </div>
        </section>

        <CompanyBar />

        <RevealSection className="how wrap" id="how" aria-labelledby="how-h">
          <RevealH2 className="section-h" id="how-h">
            How it works
          </RevealH2>
          <FeatureTabs />
        </RevealSection>

        <Console />

        <RevealSection className="steps wrap" id="start-tonight" aria-labelledby="steps-h">
          <RevealH2 id="steps-h">Start it with one command.</RevealH2>
          <div className={"pg-startGrid"}>
            <RevealDiv>
              <InstallTerminal />
            </RevealDiv>
            <div className={"pg-startSteps"}>
              <div className={"pg-startCard"}>
                <span className={"pg-stepNum"} aria-hidden="true">
                  1
                </span>
                <h3 className={"pg-stepTitle"}>Run one command.</h3>
                <CopyButton
                  text="npx synthe@latest init"
                  ariaLabel="Copy the command npx synthe@latest init"
                  dataPort="install"
                />
              </div>
              <div className={"pg-startCard"}>
                <span className={"pg-stepNum"} aria-hidden="true">
                  2
                </span>
                <h3 className={"pg-stepTitle"}>Confirm your checks.</h3>
                <div className="seg-anchor">
                  <SegControl />
                </div>
              </div>
            </div>
          </div>
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
      <MorphSeam>
        <ReportBand variant="home" />
      </MorphSeam>
      <SiteFoot />
      <HomeEffects />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
    </>
  );
}
