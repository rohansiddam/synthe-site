"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Mark } from "./Mark";
import { ThemeToggle } from "./ThemeToggle";
import "./ClayNav.css";

/* The Clay-pattern navigation: a floating white pill bar over the hero,
   with a hover mega-dropdown under Product and a drill-in panel on
   mobile. Formatting and interaction model follow the Clay study
   (floating pill, hover-open mega-menu with mono eyebrow groups,
   mobile hamburger with a Product submenu and a Back row); content
   and brand are Synthe's.

   Like the SiteHead it replaces, it keeps two layout contracts:
   the wordmark Mark locks shortly after load, and it sets the
   --head-h and --sbw CSS vars on :root (the docs page layout and
   anchored sections depend on them). It also gains a scrolled state
   after 8px of scroll, which deepens the pill shadow. */

type MegaGroup = {
  eyebrow: string;
  links: { label: string; href: string; desc: string; external?: boolean }[];
};

const MEGA_GROUPS: MegaGroup[] = [
  {
    eyebrow: "The Loop",
    links: [
      { label: "How it works", href: "/#how", desc: "The nightly loop, step by step." },
      { label: "Start tonight", href: "/#start-tonight", desc: "Install and run your first round." },
      { label: "Talk to us", href: "/#partner", desc: "Tell us about your agent." },
    ],
  },
  {
    eyebrow: "The Record",
    links: [
      {
        label: "The demo run",
        href: "https://github.com/synthelabs/support-bot/issues/3",
        desc: "A full run, recorded in public.",
        external: true,
      },
      {
        label: "The merged change",
        href: "https://github.com/synthelabs/support-bot/pull/8",
        desc: "The pull request the run produced.",
        external: true,
      },
      {
        label: "The checks file",
        href: "https://github.com/synthelabs/support-bot/blob/main/synthe.json",
        desc: "The checks Synthe tests against.",
        external: true,
      },
    ],
  },
  {
    eyebrow: "Start",
    links: [
      { label: "Docs", href: "/docs", desc: "Setup, checks and limits." },
      {
        label: "GitHub",
        href: "https://github.com/synthelabs/synthe",
        desc: "Source code and releases.",
        external: true,
      },
      {
        label: "Synthe on npm",
        href: "https://www.npmjs.com/package/synthe",
        desc: "Install the package from npm.",
        external: true,
      },
    ],
  },
];

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ClayNav() {
  const pathname = usePathname();
  const isDocs = pathname?.startsWith("/docs") ?? false;

  const headRef = useRef<HTMLElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const productBtnRef = useRef<HTMLButtonElement>(null);
  const megaRef = useRef<HTMLDivElement>(null);
  const mobileBtnRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);

  const [locked, setLocked] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"main" | "product">("main");

  const closeTimer = useRef<number>(0);

  /* The header mark locks once, shortly after load (as in SiteHead). */
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setLocked(true), reduceMotion ? 0 : 120);
    return () => window.clearTimeout(t);
  }, []);

  /* Header height and scrollbar width vars, plus the scrolled state.
     Same contract as SiteHead: --head-h is the header element height
     (the pill; the panels are absolutely positioned and add nothing),
     --sbw is the scrollbar width. */
  useEffect(() => {
    const head = headRef.current;
    if (!head) return;
    const root = document.documentElement;
    const setHeadHeight = () => root.style.setProperty("--head-h", `${head.offsetHeight}px`);
    const setScrollbar = () =>
      root.style.setProperty("--sbw", `${Math.max(0, window.innerWidth - root.clientWidth)}px`);
    const headState = () => setScrolled(window.scrollY > 8);
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

  /* Route changes close everything. */
  useEffect(() => {
    setMegaOpen(false);
    setMobileOpen(false);
    setMobileView("main");
  }, [pathname]);

  /* Closed panels are inert (mirrors SiteHead's phone-menu approach):
     the desktop mega panel whenever it is closed, and the mobile
     panel whenever it is closed. */
  useEffect(() => {
    if (megaRef.current) megaRef.current.inert = !megaOpen;
  }, [megaOpen]);
  useEffect(() => {
    if (mobilePanelRef.current) mobilePanelRef.current.inert = !mobileOpen;
  }, [mobileOpen]);

  /* Mobile panel: Escape and outside clicks close it; leaving the
     mobile breakpoint closes it too. */
  useEffect(() => {
    if (!mobileOpen) return;
    const head = headRef.current;
    const onDocClick = (e: MouseEvent) => {
      if (head && !head.contains(e.target as Node)) setMobileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        mobileBtnRef.current?.focus();
      }
    };
    const narrow = window.matchMedia("(max-width: 900px)");
    const onNarrowChange = () => {
      if (!narrow.matches) setMobileOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    narrow.addEventListener?.("change", onNarrowChange);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
      narrow.removeEventListener?.("change", onNarrowChange);
    };
  }, [mobileOpen]);

  const cancelClose = () => window.clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setMegaOpen(false), 140);
  };
  const openMega = () => {
    cancelClose();
    setMegaOpen(true);
  };
  const onProductBlur = (e: React.FocusEvent) => {
    if (!productRef.current?.contains(e.relatedTarget as Node)) setMegaOpen(false);
  };
  const onMegaKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setMegaOpen(false);
      productBtnRef.current?.focus();
    }
  };
  const closeMobile = () => {
    setMobileOpen(false);
    setMobileView("main");
  };

  return (
    <header
      ref={headRef}
      className={`${"cn-head"}${scrolled ? ` ${"cn-scrolled"}` : ""}${
        mobileOpen ? ` ${"cn-mobileOpen"}` : ""
      }`}
    >
      <div className={"cn-pill"}>
        <a className={"cn-wordmark"} href="/" aria-label="Synthe home">
          <Mark className={"cn-wordmarkLogo"} state={locked ? "" : "open"} />
          <span className={"cn-wordmarkText"}>Synthe</span>
        </a>

        <nav className={"cn-desktopNav"} aria-label="Main">
          <div
            ref={productRef}
            className={"cn-productWrap"}
            onMouseEnter={openMega}
            onMouseLeave={scheduleClose}
            onFocus={openMega}
            onBlur={onProductBlur}
            onKeyDown={onMegaKey}
          >
            <button
              ref={productBtnRef}
              type="button"
              className={"cn-navItem"}
              aria-haspopup="true"
              aria-expanded={megaOpen ? "true" : "false"}
              aria-controls="claynav-mega"
              onClick={() => (megaOpen ? setMegaOpen(false) : openMega())}
            >
              Product
              <Chevron className={`${"cn-chev"}${megaOpen ? ` ${"cn-chevOpen"}` : ""}`} />
            </button>
          </div>
          <a className={"cn-navItem"} href="/#how">
            How it works
          </a>
          <a
            className={"cn-navItem"}
            href="/docs"
            aria-current={isDocs ? "page" : undefined}
          >
            Docs
          </a>
          <a className={"cn-navItem"} href="https://github.com/synthelabs/synthe">
            GitHub
          </a>
        </nav>

        <div className={"cn-right"}>
          <span className={`${"cn-themeWrap"} clay-theme`}>
            <ThemeToggle />
          </span>
          <a className={`${"cn-navItem"} ${"cn-talkLink"}`} href="/#partner">
            Talk to us
          </a>
          <a className={"cn-cta"} href="/#start-tonight">
            Get started
          </a>
          <button
            ref={mobileBtnRef}
            type="button"
            className={"cn-burger"}
            aria-expanded={mobileOpen ? "true" : "false"}
            aria-controls="claynav-mobile"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => (mobileOpen ? closeMobile() : setMobileOpen(true))}
          >
            <span className={"cn-burgerLines"} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {/* Mega-dropdown: drops below the pill, stays in the hover zone
          of the header so moving from Product into the panel keeps it
          open; a short close delay covers the gap. */}
      <div
        ref={megaRef}
        id="claynav-mega"
        className={`${"cn-mega"}${megaOpen ? ` ${"cn-megaOpen"}` : ""}`}
        onMouseEnter={openMega}
        onMouseLeave={scheduleClose}
        onFocus={openMega}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node) &&
              !productRef.current?.contains(e.relatedTarget as Node)) {
            setMegaOpen(false);
          }
        }}
        onKeyDown={onMegaKey}
      >
        <div className={"cn-megaGrid"}>
          {MEGA_GROUPS.map((group) => (
            <div key={group.eyebrow} className={"cn-megaCol"}>
              <p className={"cn-megaEyebrow"}>{group.eyebrow}</p>
              <ul className={"cn-megaList"}>
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      className={"cn-megaLink"}
                      href={link.href}
                      {...(link.external
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                      onClick={() => setMegaOpen(false)}
                    >
                      <span className={"cn-megaLinkLabel"}>{link.label}</span>
                      <span className={"cn-megaLinkDesc"}>{link.desc}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile panel: main list, or the drilled-in Product submenu
          with a Back row at the top (Clay's mobile pattern). */}
      <div
        ref={mobilePanelRef}
        id="claynav-mobile"
        className={`${"cn-mobilePanel"}${mobileOpen ? ` ${"cn-mobilePanelOpen"}` : ""}`}
      >
        {mobileView === "main" ? (
          <nav aria-label="Mobile">
            <button
              type="button"
              className={"cn-mobileRow"}
              aria-haspopup="true"
              aria-expanded="false"
              onClick={() => setMobileView("product")}
            >
              <span>Product</span>
              <Chevron className={"cn-mobileChev"} />
            </button>
            <a className={"cn-mobileRow"} href="/#how" onClick={closeMobile}>
              How it works
            </a>
            <a
              className={"cn-mobileRow"}
              href="/docs"
              aria-current={isDocs ? "page" : undefined}
              onClick={closeMobile}
            >
              Docs
            </a>
            <a
              className={"cn-mobileRow"}
              href="https://github.com/synthelabs/synthe"
              onClick={closeMobile}
            >
              GitHub
            </a>
            <a className={"cn-mobileRow"} href="/#partner" onClick={closeMobile}>
              Talk to us
            </a>
          </nav>
        ) : (
          <nav aria-label="Product">
            <button
              type="button"
              className={`${"cn-mobileRow"} ${"cn-mobileBack"}`}
              onClick={() => setMobileView("main")}
            >
              <Chevron className={"cn-mobileBackChev"} />
              <span>Back</span>
            </button>
            {MEGA_GROUPS.map((group) => (
              <div key={group.eyebrow} className={"cn-mobileGroup"}>
                <p className={"cn-megaEyebrow"}>{group.eyebrow}</p>
                {group.links.map((link) => (
                  <a
                    key={link.label}
                    className={"cn-mobileSubRow"}
                    href={link.href}
                    {...(link.external
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                    onClick={closeMobile}
                  >
                    <span className={"cn-megaLinkLabel"}>{link.label}</span>
                    <span className={"cn-megaLinkDesc"}>{link.desc}</span>
                  </a>
                ))}
              </div>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
