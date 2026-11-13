import type { Metadata } from "next";
import { ThreadDemo } from "./ThreadDemo";

export const metadata: Metadata = {
  title: "The Thread: a background study · Synthe",
  description:
    "Exploration: a single record line that travels the full page in the background, draws with scroll, pulses on its own, and branches into each section the way Synthe's rounds diverge from a prompt and merge back.",
  robots: { index: false, follow: false },
};

export default function ThreadPage() {
  return (
    <main id="main" className="pg-thread" tabIndex={-1}>
      <ThreadDemo />
    </main>
  );
}
