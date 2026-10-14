import { ThemeToggle } from "../components/ThemeToggle";
import { ReceiptPrinter } from "../components/ReceiptPrinter";

/**
 * Demo page for Moment 3, the receipt-printer footer. Spacer content above
 * pushes the footer off-screen so the scroll-into-view print sequence can
 * be tested; the footer itself is full-bleed, as on a real page.
 */
export default function FooterDemoPage() {
  return (
    <main>
      <div className="mx-auto flex max-w-4xl justify-end px-6 pt-16">
        <ThemeToggle />
      </div>

      {/* spacer: keep the footer below the fold on load */}
      <div className="mx-auto max-w-4xl px-6">
        <p className="mt-6 font-mono text-[13px] text-muted">
          demo · moment 3 · receipt-printer footer
        </p>
        <div className="flex min-h-[110vh] flex-col justify-center">
          <p className="max-w-md text-lg text-muted">
            Scroll down. The footer below prints a signed receipt the moment
            it enters the viewport, then tears it off.
          </p>
          <div
            aria-hidden="true"
            className="mt-8 grid max-w-md gap-3 opacity-40"
          >
            <div className="h-3 rounded bg-line" />
            <div className="h-3 w-4/5 rounded bg-line" />
            <div className="h-3 w-3/5 rounded bg-line" />
          </div>
        </div>
      </div>

      <ReceiptPrinter />

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-8">
          <p className="m-0 font-mono text-xs text-muted">synthe</p>
          <p className="m-0 font-mono text-xs text-muted">
            from the greek synthēkē, meaning agreement
          </p>
        </div>
      </div>
    </main>
  );
}
