import type { Metadata } from "next";
import { CopyButton } from "../components/CopyButton";
import { RevealDiv, RevealSection } from "../components/Reveal";
import { ReportBand, SiteFoot } from "../components/SiteFoot";

export const metadata: Metadata = {
  title: "Docs · Synthe",
  description:
    "Set up Synthe in your agent's GitHub repo with npx synthe init: what you need, the commands, and how to stop or remove it.",
  alternates: { canonical: "https://synthe.live/docs.html" },
  openGraph: {
    title: "Docs · Synthe",
    description:
      "Set up Synthe in your agent's GitHub repo with npx synthe init: what you need, the commands, and how to stop or remove it.",
    url: "https://synthe.live/docs.html",
    images: [{ url: "https://synthe.live/og-image.png?v=6" }],
  },
};

export default function DocsPage() {
  return (
    <>
      <main id="main" className="pg-docs" tabIndex={-1}>
        <div className="doc">
          <RevealDiv root solo className="doc-hero">
            <p className="eyebrow">Docs</p>
            <h1>Get started with Synthe</h1>
            <p className="lede">
              A short quickstart. Everything else is in the{" "}
              <a className="textlink" href="https://github.com/synthelabs/synthe#readme">
                README on GitHub
              </a>
              .
            </p>
          </RevealDiv>
          <RevealSection solo className="block" id="need" data-toc-target="" aria-labelledby="need-h">
            <h2 id="need-h">What you need</h2>
            <ul>
              <li>
                A GitHub repo you can admin, with your agent's system prompt in it, as its own file
                or a string in your code.
              </li>
              <li>
                The{" "}
                <a className="textlink" href="https://cli.github.com">
                  GitHub CLI
                </a>
                , signed in with <code>gh auth login</code>, and Node{" "}
                <span data-fact="node_min">20</span> or later.
              </li>
            </ul>
          </RevealSection>
          <RevealSection solo className="block" id="setup" data-toc-target="" aria-labelledby="setup-h">
            <h2 id="setup-h">Set it up</h2>
            <p>On your main branch, in the repo, run:</p>
            <div className="cmd">
              <span className="prompt" aria-hidden="true">
                ${" "}
              </span>
              <code>npx synthe@latest init</code>
              <CopyButton variant="docs" text="npx synthe@latest init" ariaLabel="Copy the command npx synthe@latest init" />
            </div>
            <p>
              Say what your agent should get better at, confirm the checks Synthe proposes, paste
              your key, and choose automatic merges or review. When the run ends, open the{" "}
              <strong>Synthe: prompt report</strong> issue in your repo.
            </p>
            <p>Using Claude Code, Cursor or Codex? Tell it:</p>
            <div className="term">
              Set up Synthe in this repo. Run npx synthe@latest guide and follow it.
            </div>
            <div className="warn">
              <svg className="warn-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3.5 2.8 19.5h18.4L12 3.5z" />
                <path d="M12 10v4.2" />
                <path d="M12 17.3v.2" />
              </svg>
              <p>
                <span className="warn-label">Merge setting</span>
                Automatic merges land on your main branch. If it deploys your app, choose review.
              </p>
            </div>
          </RevealSection>
          <RevealSection solo className="block" id="commands" data-toc-target="" aria-labelledby="commands-h">
            <h2 id="commands-h">While it runs</h2>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Command</th>
                    <th>What it does</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>npx synthe status</code>
                    </td>
                    <td>Show where it is</td>
                  </tr>
                  <tr>
                    <td>
                      <code>npx synthe stop</code>
                    </td>
                    <td>Stop it. Nothing more runs or changes</td>
                  </tr>
                  <tr>
                    <td>
                      <code>npx synthe restart</code>
                    </td>
                    <td>Start it again after a stop</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>You can keep editing your prompt. After Synthe changes it, pull before you edit.</p>
          </RevealSection>
          <RevealSection solo className="block" id="data" data-toc-target="" aria-labelledby="data-h">
            <h2 id="data-h">Your data at the event</h2>
            <p>
              During the event, Synthe shares your prompt, your test cases and how the run goes
              with the Synthe team. It never sends your code, and it removes keys, emails and phone
              numbers first. Turn it off any time with <code>"share": "none"</code> in{" "}
              <code>synthe.json</code>.{" "}
              <a className="textlink" href="https://github.com/synthelabs/synthe#data">
                Details in the README
              </a>
              .
            </p>
          </RevealSection>
          <RevealSection solo className="block" id="remove" data-toc-target="" aria-labelledby="remove-h">
            <h2 id="remove-h">Stop or remove it</h2>
            <p>
              Run <code>npx synthe stop</code> at any time. To remove it, also delete{" "}
              <code>synthe.json</code>, <code>.synthe/</code> and{" "}
              <code>.github/workflows/synthe.yml</code>, and the repo secrets Synthe saved (
              <code>SYNTHE_EVENT_CODE</code> and <code>SYNTHE_TEAM_CODE</code>, or{" "}
              <code>SYNTHE_ANTHROPIC_KEY</code>). To undo a change, click <strong>Revert</strong>{" "}
              on its pull request.
            </p>
            <div className="next">
              <a className="textlink" href="https://github.com/synthelabs/synthe#readme">
                Read the README
              </a>
              <a className="textlink" href="/status.html">
                Limits and your data
              </a>
              <a className="textlink" href="https://github.com/synthelabs/synthe/issues">
                Report a problem
              </a>
            </div>
          </RevealSection>
        </div>
      </main>
      <ReportBand variant="docs" />
      <SiteFoot />
    </>
  );
}
