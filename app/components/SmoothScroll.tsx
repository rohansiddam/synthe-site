"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

/* Lenis smooth scrolling, under the research pass's conditions
   (2026-11-13): desktop wheel only (a fine pointer is required;
   syncTouch is off, so phones keep native touch scrolling, which
   Lenis's own README recommends on iOS), disabled entirely under
   prefers-reduced-motion and under the site's motion-paused opt-out,
   and driven from the GSAP ticker with ScrollTrigger.update wired to
   Lenis's scroll event, the canonical sync, so scroll-driven scenes
   never jitter against the smoothed position. Mounted once in the
   shared layout; renders nothing. */

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.documentElement.classList.contains("motion-paused")) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    /* anchors: Lenis owns same-page fragment clicks (the hero's "How
       to start" link), so a fragment jump can never race the smoothed
       scroll's internal state. */
    const lenis = new Lenis({ syncTouch: false, anchors: true });
    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);
    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    return () => {
      window.removeEventListener("load", onLoad);
      gsap.ticker.remove(tick);
      lenis.off("scroll", onScroll);
      lenis.destroy();
    };
  }, []);

  return null;
}
