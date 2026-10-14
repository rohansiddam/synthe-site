import { ThemeToggle } from "./components/ThemeToggle";
import { SwatchGrid } from "./components/SwatchGrid";

export default function StyleGuide() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-14">
      <header className="flex items-center justify-between">
        <p className="font-mono text-[13px] text-human-text">design tokens</p>
        <ThemeToggle />
      </header>

      <h1 className="mt-14 text-5xl font-semibold tracking-tight sm:text-6xl">
        Agents propose. You approve. Synthe commits.
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
        Synthe holds the only credential, pushes exactly the change you
        approved, once, and signs a receipt anyone can verify.
      </p>

      <p className="mt-4 max-w-2xl leading-relaxed text-muted">
        This is muted body text. It carries secondary information without
        competing with the headline above it.
      </p>

      <h2 className="mt-14 text-3xl font-semibold tracking-tight">
        One accent, used <span className="text-human-text">once</span> per
        screen.
      </h2>

      <p className="mt-4 max-w-2xl leading-relaxed text-muted">
        The crimson accent marks the single most important thing in view. The
        two halves of the mark follow the same rule: the agent&apos;s half is
        ink, your half is crimson. A receipt signed with{" "}
        <span className="font-mono text-sm text-ok">ok green</span> means
        verified.
      </p>

      <h2 className="mt-14 text-3xl font-semibold tracking-tight">Palette</h2>
      <p className="mb-6 mt-3 max-w-2xl leading-relaxed text-muted">
        Live swatches. Toggle the theme to see each token switch. Hex pairs
        show light, then dark.
      </p>
      <SwatchGrid />

      <footer className="mt-16 border-t border-line pt-6">
        <p className="font-mono text-xs text-faint">
          synthe-site-v2 · scaffold step 1: tokens and theme only
        </p>
      </footer>
    </main>
  );
}
