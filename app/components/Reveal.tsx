"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";

/* Scroll choreography, on the renovation's GSAP + ScrollTrigger chassis
   (research constraint, 2026-11-13; previously framer-motion variants).
   The behavioral contract is unchanged from the system this replaces:
   every component renders in the "rest" state, fully visible, on the
   server and on first paint. Only after mount, and only for roots
   still below the fold, does the root hide its items (opacity 0, a
   14px rise) and arm a ScrollTrigger that plays them in with a 55ms
   stagger when the root scrolls into view; elements already in view
   never animate at all. So no-JS, reduced-motion, the site's
   motion-paused opt-out, and pre-hydration all show the complete
   page, and nothing ever pops: the hidden state is set while the
   element is off-screen. Transform and opacity only.
   A root orchestrates: its own box stays put while its registered
   items stagger in. A solo root is itself the animated surface (Docs
   blocks, the report band, the docs hero). Items register with the
   nearest root through context, at any DOM depth, in mount order.
   Framer Motion remains load-bearing only inside the console's
   component tweens and the entry-played scenes; GSAP owns scroll,
   and the two systems never drive the same property. */

export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

let pluginsReady = false;
let revealEase: gsap.EaseFunction | undefined;
function ensureGsap() {
  if (pluginsReady) return;
  pluginsReady = true;
  gsap.registerPlugin(ScrollTrigger, CustomEase);
  revealEase = CustomEase.create("reveal", "0.22, 1, 0.36, 1");
}

/* Page height changes that are not viewport resizes (the console
   expanding, fonts landing) would stale every trigger's measured
   start. One shared observer refreshes ScrollTrigger, rAF-throttled. */
let layoutWatchStarted = false;
function watchLayout() {
  if (layoutWatchStarted || typeof ResizeObserver === "undefined") return;
  layoutWatchStarted = true;
  let queued = false;
  const ro = new ResizeObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      ScrollTrigger.refresh();
    });
  });
  ro.observe(document.body);
}

type Registry = { add: (el: HTMLElement) => void };
const RevealContext = createContext<Registry | null>(null);

function useRevealRoot<T extends HTMLElement>(solo: boolean) {
  const ref = useRef<T>(null);
  /* The registry and its item list live in one state-held box, created
     once: items register into it from their own effects, and the
     root's effect reads it after mount. */
  const [box] = useState(() => {
    const items: HTMLElement[] = [];
    const registry: Registry = {
      add: (el) => {
        if (!items.includes(el)) items.push(el);
      },
    };
    return { items, registry };
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.documentElement.classList.contains("motion-paused")) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return; // in view: stays still
    ensureGsap();
    watchLayout();
    const targets = solo ? [el] : box.items.slice();
    if (!targets.length) return;
    gsap.set(targets, { opacity: 0, y: 14 });
    const tween = gsap.to(targets, {
      opacity: 1,
      y: 0,
      duration: 0.55,
      ease: revealEase,
      stagger: 0.055,
      delay: solo ? 0 : 0.04,
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(targets, { clearProps: "opacity,transform" });
    };
  }, [solo, box]);

  return { ref, registry: box.registry };
}

function useRevealItem<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const registry = useContext(RevealContext);
  useEffect(() => {
    const el = ref.current;
    if (el) registry?.add(el);
  }, [registry]);
  return ref;
}

type RootProps = {
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
  solo?: boolean;
  children?: ReactNode;
  [key: `data-${string}`]: string | undefined;
};

type ItemProps = {
  className?: string;
  id?: string;
  children?: ReactNode;
};

export function RevealSection({ solo = false, ...props }: RootProps) {
  const { ref, registry } = useRevealRoot<HTMLElement>(solo);
  return (
    <RevealContext.Provider value={registry}>
      <section ref={ref} {...props} />
    </RevealContext.Provider>
  );
}

function RevealDivRoot({ solo = false, ...props }: RootProps) {
  const { ref, registry } = useRevealRoot<HTMLDivElement>(solo);
  return (
    <RevealContext.Provider value={registry}>
      <div ref={ref} {...props} />
    </RevealContext.Provider>
  );
}

export function RevealDiv({
  root = false,
  solo = false,
  ...props
}: RootProps & { root?: boolean }) {
  const itemRef = useRevealItem<HTMLDivElement>();
  if (root) return <RevealDivRoot solo={solo} {...props} />;
  return <div ref={itemRef} {...props} />;
}

export function RevealH2(props: ItemProps) {
  const ref = useRevealItem<HTMLHeadingElement>();
  return <h2 ref={ref} {...props} />;
}

export function RevealP(props: ItemProps) {
  const ref = useRevealItem<HTMLParagraphElement>();
  return <p ref={ref} {...props} />;
}

export function RevealArticle(props: ItemProps) {
  const ref = useRevealItem<HTMLElement>();
  return <article ref={ref} {...props} />;
}

export function RevealLi(props: ItemProps) {
  const ref = useRevealItem<HTMLLIElement>();
  return <li ref={ref} {...props} />;
}
