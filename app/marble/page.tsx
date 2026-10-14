import { MarbleRun } from "../components/MarbleRun";
import { ThemeToggle } from "../components/ThemeToggle";

export default function MarblePage() {
  return (
    <main className="bg-bg text-ink">
      <div className="pointer-events-none fixed left-4 top-4 z-50">
        <p className="font-mono text-[13px] text-muted">
          demo · moment 2 · marble machine
        </p>
      </div>
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>

      <section className="mx-auto flex min-h-svh w-full max-w-xl flex-col items-center justify-center px-6 py-16">
        <MarbleRun className="w-full max-w-[420px]" />
        <p className="mt-6 font-mono text-[13px] tracking-wide text-muted">
          the track, running itself
        </p>
      </section>
    </main>
  );
}
