import { MarbleRun } from "../components/MarbleRun";
import { ThemeToggle } from "../components/ThemeToggle";
import { Eyebrow } from "../components/Eyebrow";
import { Button } from "../components/Button";

export default function MarblePage() {
  return (
    <main className="bg-bg text-ink">
      <div className="pointer-events-none fixed left-4 top-4 z-50">
        <p className="font-mono text-[13px] text-muted">
          demo · moment 2 · marble run
        </p>
      </div>
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>

      <section className="mx-auto flex min-h-svh w-full max-w-4xl flex-col items-center justify-center px-6 text-center">
        <Eyebrow className="mb-4">moment 2 · the signature</Eyebrow>
        <h1 className="text-4xl font-semibold tracking-[-0.025em] md:text-5xl">
          The marble run.
        </h1>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted">
          Scroll. A handoff drops into the logo as a marble, rides the
          dovetail channel through three checks, and seats the joint.
        </p>
        <p className="mt-12 font-mono text-[13px] tracking-wide text-muted">
          scroll
        </p>
      </section>

      <MarbleRun />

      <section className="border-t border-line">
        <div className="mx-auto max-w-4xl px-6 py-32 text-center">
          <Eyebrow className="mb-4">demo filler</Eyebrow>
          <h2 className="text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
            The page continues here.
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted">
            In the real migration this becomes the rest of the homepage: the
            feature grid, the receipt-printer footer, and the rest of the
            information architecture.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button variant="secondary" href="/hero">
              Back to the hero
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
