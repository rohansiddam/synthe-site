"use client";

import { useEffect, useRef } from "react";

/* The theme switch, ported from site.js: a sun and a moon, the current mode
   filled. It reports the theme the page is actually showing, as the
   stylesheet resolves it (--mode), so it is right even before a choice is
   saved. The palette changes together (transitions suppressed while setting);
   only the page surface cross-fades, and the switch indicator slides. */
export function ThemeToggle() {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    let themeFrame = 0;
    let themeFadeTimer = 0;

    const savedTheme = (): "light" | "dark" | null => {
      try {
        const value = localStorage.getItem("synthe-theme");
        return value === "light" || value === "dark" ? value : null;
      } catch {
        return null;
      }
    };
    let themePreference = savedTheme();
    const showing = (): "light" | "dark" =>
      getComputedStyle(root).getPropertyValue("--mode").trim() === "dark" ? "dark" : "light";

    const paint = () => {
      const dark = showing() === "dark";
      btn.setAttribute("aria-checked", dark ? "true" : "false");
      btn.title = dark ? "Dark mode is on. Switch to light." : "Light mode is on. Switch to dark.";
    };

    const setTheme = (next: "light" | "dark") => {
      cancelAnimationFrame(themeFrame);
      root.classList.add("theme-setting");
      if (!reduceMotion) {
        root.classList.add("theme-fade");
        window.clearTimeout(themeFadeTimer);
        themeFadeTimer = window.setTimeout(() => root.classList.remove("theme-fade"), 280);
      }
      root.setAttribute("data-theme", next);
      root.style.colorScheme = next;
      paint();
      void root.offsetHeight;
      themeFrame = requestAnimationFrame(() => {
        themeFrame = requestAnimationFrame(() => root.classList.remove("theme-setting"));
      });
    };

    const onClick = () => {
      const next = showing() === "dark" ? "light" : "dark";
      themePreference = next;
      try {
        localStorage.setItem("synthe-theme", next);
      } catch {
        /* storage unavailable; the theme still applies for this page */
      }
      setTheme(next);
    };
    const followSystem = () => {
      if (!themePreference) setTheme(systemTheme.matches ? "dark" : "light");
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "synthe-theme" || e.key === null) {
        const saved = savedTheme();
        themePreference = saved;
        setTheme(saved ?? (systemTheme.matches ? "dark" : "light"));
      }
    };
    const onLoad = () => paint();

    btn.addEventListener("click", onClick);
    systemTheme.addEventListener?.("change", followSystem);
    window.addEventListener("storage", onStorage);
    window.addEventListener("load", onLoad);
    paint();

    return () => {
      btn.removeEventListener("click", onClick);
      systemTheme.removeEventListener?.("change", followSystem);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("load", onLoad);
      cancelAnimationFrame(themeFrame);
      window.clearTimeout(themeFadeTimer);
    };
  }, []);

  return (
    <button
      ref={btnRef}
      className="themeswitch"
      id="theme-toggle"
      type="button"
      role="switch"
      aria-checked="false"
      aria-label="Dark mode"
      title="Dark mode"
    >
      <span className="opt sun">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <span className="sr-only">Light</span>
      </span>
      <span className="opt moon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
        <span className="sr-only">Dark</span>
      </span>
    </button>
  );
}
