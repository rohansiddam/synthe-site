import { Logo } from "./Logo";
import { StaggeredHeadline } from "./StaggeredHeadline";
import { Eyebrow } from "./Eyebrow";
import { Button } from "./Button";
import { Terminal } from "./Terminal";
import { ReceiptCard } from "./ReceiptCard";
import { VerifiedStamp } from "./VerifiedStamp";
import { ThemeToggle } from "./ThemeToggle";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line py-12">
      <Eyebrow className="mb-4">{title}</Eyebrow>
      {children}
    </section>
  );
}

export default function ComponentsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex items-start justify-between gap-6 mb-4">
        <Eyebrow>component system</Eyebrow>
        <ThemeToggle />
      </div>
      <StaggeredHeadline
        text="Built once. Used everywhere."
        className="text-5xl font-semibold mb-4"
      />
      <p className="text-muted max-w-xl mb-4">
        Every piece below is theme aware, respects reduced motion, and matches
        the live site. Toggle the theme to see each token switch.
      </p>

      <Section title="logo: open and seated">
        <div className="flex items-center gap-16">
          <div className="text-center">
            <Logo open className="w-24 h-auto" />
            <p className="font-mono text-xs text-faint mt-3">open, waiting</p>
          </div>
          <div className="text-center">
            <Logo open={false} className="w-24 h-auto" />
            <p className="font-mono text-xs text-faint mt-3">seated, locked</p>
          </div>
        </div>
      </Section>

      <Section title="buttons">
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="primary"
            href="#install"
            icon={<Logo open={false} className="h-[18px] w-auto" />}
          >
            Install
          </Button>
          <Button variant="primary" href="#docs">
            Read the docs
          </Button>
          <Button variant="secondary" href="#how">
            How it works
          </Button>
        </div>
      </Section>

      <Section title="terminal">
        <div className="grid gap-6">
          <Terminal
            title="synthe check"
            lines={[
              { text: "synthe check h-2026-1042", tone: "command" },
              { text: "resolving handoff from registry...", tone: "dim" },
              { text: "signature binds sender, receiver, idempotency key", tone: "output" },
              { text: "approval replay: none found", tone: "output" },
              { text: "3 approvals bound to this handoff", tone: "output" },
            ]}
            status={{ verdict: "ACCEPT", detail: "h-2026-1042 verified" }}
          />
          <Terminal
            title="synthe install"
            lines={[
              { text: "git clone https://github.com/rohansiddam/Synthe ~/synthe", tone: "command" },
              { text: "Cloning into '/home/you/synthe'... done.", tone: "dim" },
              { text: "cd ~/synthe && ./setup", tone: "command" },
              { text: "Broker installed. Agents propose. You approve. Synthe commits.", tone: "output" },
            ]}
          />
        </div>
      </Section>

      <Section title="receipt card">
        <div className="max-w-md">
          <ReceiptCard
            number="0042"
            from="agent/fix-login"
            to="main"
            meta="2 files changed, 3 approvals bound"
            timestamp="2026-10-13 22:04 MDT"
            signature="9f2c...a1"
          />
        </div>
        <p className="mt-6 text-muted">
          The verified mark also stands alone:{" "}
          <VerifiedStamp signature="9f2c...a1" />
        </p>
      </Section>
    </main>
  );
}
