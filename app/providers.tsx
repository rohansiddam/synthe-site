"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";

/* Astryx wiring (N1): the neutral theme provider and the Next link provider,
   per the Astryx Next.js guide. The ported pages are Synthe's own components;
   Astryx supplies the component kit for the console surfaces (later lanes).
   Its styles are layered (app/globals.css), so the site's unlayered styles
   keep governing the ported pages. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <Theme theme={neutralTheme}>
      <LinkProvider component={Link}>{children}</LinkProvider>
    </Theme>
  );
}
