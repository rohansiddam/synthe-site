"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Mark } from "./Mark";
import { ThemeToggle } from "./ThemeToggle";

/* The site header: identical on every page (only aria-current differs).
   Ported from the static pages and site.js: the wordmark mark starts apart
   and locks once the page is ready; the header gains its hairline after 8px
   of scroll; on phones the nav collapses behind a labeled Menu button, and
   only when JavaScript runs (the head script adds the js class). */
export function SiteHead() {
  const pathname = usePathname();
  const current = pathname?.startsWith("/docs") ? "docs" : "home";
  const headRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [locked, setLocked] = useState(false);

  /* The header mark locks once, shortly after load. */
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setLocked(true), reduceMotion ? 0 : 120);
    return () => window.clearTimeout(t);
  }, []);

  /* Header height and scrollbar width vars, plus the scrolled hairline. */
  useEffect(() => {
    const head = headRef.current;
    if (!head) return;
    const root = document.documentElement;
    const setHeadHeight = () => root.style.setProperty("--head-h", `${head.offsetHeight}px`);
    const setScrollbar = () =>
      root.style.setProperty("--sbw", `${Math.max(0, window.innerWidth - root.clientWidth)}px`);
    const headState = () => head.classList.toggle("is-scrolled", window.scrollY > 8);
    setHeadHeight();
    setScrollbar();
    headState();
    const onResize = () => {
      setHeadHeight();
      setScrollbar();
    };
    window.addEventListener("scroll", headState, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("load", setScrollbar);
    return () => {
      window.removeEventListener("scroll", headState);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", setScrollbar);
    };
  }, []);

  /* Phone menu access: the closed panel is inert on narrow screens; Escape
     and outside clicks close it; choosing a link closes it. */
  useEffect(() => {
    const head = headRef.current;
    const nav = navRef.current;
    const btn = btnRef.current;
    if (!head || !nav || !btn) return;
    const narrowNav = window.matchMedia("(max-width: 900px)");
    const syncAccess = () => {
      nav.inert = narrowNav.matches && !menuOpen;
    };
    syncAccess();
    const onNarrowChange = () => {
      if (!narrowNav.matches) setMenuOpen(false);
      syncAccess();
    };
    const onDocClick = (e: MouseEvent) => {
      if (menuOpen && !head.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) {
        setMenuOpen(false);
        btn.focus();
      }
    };
    const onNavClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest?.("a")) setMenuOpen(false);
    };
    narrowNav.addEventListener?.("change", onNarrowChange);
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    nav.addEventListener("click", onNavClick);
    return () => {
      narrowNav.removeEventListener?.("change", onNarrowChange);
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
      nav.removeEventListener("click", onNavClick);
    };
  }, [menuOpen]);

  return (
    <header className={`site-head${menuOpen ? " nav-open" : ""}`} ref={headRef}>
      <a className="wordmark" href="/">
        <Mark className="wordmark-logo" state={locked ? "" : "open"} />
        Synthe
      </a>
      <button
        className="nav-toggle"
        id="nav-toggle"
        type="button"
        aria-expanded={menuOpen ? "true" : "false"}
        aria-controls="topnav"
        ref={btnRef}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? "Close" : "Menu"}
      </button>
      <nav className="topnav" id="topnav" aria-label="Main" ref={navRef}>
        <a href="/docs.html" aria-current={current === "docs" ? "page" : undefined}>
          Docs
        </a>
        <a href="/docs.html#remove">Limits</a>
        <a href="https://github.com/synthelabs/synthe">GitHub</a>
        <ThemeToggle />
        <a className="nav-cta" href="/docs.html">
          <Mark view="open" state="open" />
          Get started
        </a>
      </nav>
    </header>
  );
}
