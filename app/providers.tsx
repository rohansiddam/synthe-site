"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";

/* Astryx wiring (N1) plus the dark-mode binding (N2).
   The neutral theme provider and the Next link provider, per the Astryx
   Next.js guide. Its styles are layered (app/globals.css), so the site's
   unlayered styles keep governing the ported pages.

   The binding problem: Astryx resolves its theme through CSS
   light-dark() tokens, keyed to the color-scheme its <Theme> mode
   establishes, and a root Theme left on mode="system" removes the
   data-theme attribute from <html> on hydration. The site's own theme
   lives in that attribute (set before first paint in layout.tsx, driven
   by the theme toggle and the "synthe-theme" localStorage key), so an
   unbound Astryx would fight the toggle and strip the site's dark
   palette the moment it hydrated.
   The solution: the site stays the single source of truth, and this
   provider subscribes Astryx to it.
   - State starts at "system" so server and first client render agree.
   - A layout effect then seeds the mode from the same inputs the
     pre-paint script uses (the saved choice, else the OS preference).
     It deliberately never reads data-theme here: this effect runs in
     the same commit as Astryx's own root sync, after it, and the
     attribute may already have been cleared by the "system" pass. The
     seeded mode makes Astryx set the attribute back to the same value
     before paint.
   - A MutationObserver follows data-theme from then on, so every flip
     of the site's toggle re-renders <Theme> with the matching mode and
     Astryx's tokens land on the same side as the site's. */
type SiteTheme = "light" | "dark";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function savedTheme(): SiteTheme | null {
  try {
    const value = localStorage.getItem("synthe-theme");
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): SiteTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function Providers({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SiteTheme | "system">("system");

  useIsoLayoutEffect(() => {
    setMode(savedTheme() ?? systemTheme());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      const value = root.getAttribute("data-theme");
      if (value === "light" || value === "dark") setMode(value);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <Theme theme={neutralTheme} mode={mode}>
      <LinkProvider component={Link}>{children}</LinkProvider>
    </Theme>
  );
}
