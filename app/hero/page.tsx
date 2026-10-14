import { ScrollHero } from "../components/ScrollHero";
import { ThemeToggle } from "../components/ThemeToggle";
import { Eyebrow } from "../components/Eyebrow";
import { Button } from "../components/Button";

export default function HeroPage() {
  return (
    <main className="bg-bg text-ink">
      <div className="pointer-events-none fixed left-4 top-4 z-50">
        <p className="font-mono text-[13px] text-muted">
          demo · moment 1 · scroll-scrubbed hero
        </p>
      </div>
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>

      <ScrollHero />

      <section className="border-t border-line">
        <div className="mx-auto max-w-4xl px-6 py-32 text-center">
          <Eyebrow className="mb-4">demo filler</Eyebrow>
          <h2 className="text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
            The page continues here.
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted">
            In the real migration this becomes the rest of the homepage: How it
            works, Security, Docs, and the rest of the information
            architecture.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button variant="secondary" href="/components">
              Back to components
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
