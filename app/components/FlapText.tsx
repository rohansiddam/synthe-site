"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/* Split-flap print for the report band's record lines (Part 3).
   Adapted from the Annnimate Starter Pack's split-flap-board riffle
   (licensed: "yours to use in any project. No attribution, no
   expiry."; provenance in the Part 3 report, internal only): each
   tile walks a drum of glyphs and lands on its character, tiles
   cascading left to right, rows staggered. Three changes make it
   the record's, not a departures board:
   - A digit tile's drum is glyphs only, never other digits, so a
     flap in flight can never show a wrong number (G2).
   - The tiles are borderless character cells inside the band's own
     mono line (the band is already IBM Plex Mono, so a 1ch cell is
     exactly one character wide and the line's layout never moves).
   - When the run completes, the tiles are removed and the plain
     recorded line is restored, byte-identical.
   Reduced motion and no-JS keep the plain line, static. */

const GLYPHS = "#@/\\|+=<>*~^";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const MAX_STEPS = 3;
const CHAR_STAGGER = 0.016;

function drumFor(target: string): string {
  if (/[0-9]/.test(target)) return GLYPHS;
  if (/[A-Z]/.test(target)) return UPPER;
  if (/[a-z]/.test(target)) return LOWER;
  return GLYPHS;
}

/** The glyphs a tile passes through on its way to its target,
    thinned to at most MAX_STEPS intermediates and always ending on
    the target (the reference riffle, adapted). Letters walk their
    own alphabet drum from blank; digits and punctuation ride the
    glyph drum, so the only digit a digit tile ever shows is its
    own. */
function riffle(target: string): string[] {
  if (target === " ") return [];
  const drum = drumFor(target);
  if (drum === GLYPHS) {
    const seq: string[] = [];
    let i = Math.floor(Math.random() * GLYPHS.length);
    for (let s = 0; s < MAX_STEPS; s += 1) {
      seq.push(GLYPHS[i]);
      i = (i + 1) % GLYPHS.length;
    }
    seq.push(target);
    return seq;
  }
  const full = " " + drum;
  const end = full.indexOf(target);
  const walked: string[] = [];
  let i = 0;
  while (i !== end) {
    i = (i + 1) % full.length;
    walked.push(full[i]);
  }
  if (walked.length <= MAX_STEPS + 1) return walked;
  const thinned: string[] = [];
  for (let s = 0; s < MAX_STEPS; s += 1) {
    thinned.push(walked[Math.floor((s * (walked.length - 1)) / MAX_STEPS)]);
  }
  thinned.push(walked[walked.length - 1]);
  return thinned;
}

interface Tile {
  el: HTMLSpanElement;
  charEl: HTMLSpanElement;
  shadeEl: HTMLSpanElement;
  target: string;
}

export function FlapText({
  text,
  delay = 0,
}: {
  text: string;
  /** Row cascade: later lines start a beat after earlier ones. */
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let master: gsap.core.Timeline | null = null;
    let built = false;
    let cancelled = false;

    const restore = () => {
      if (host) {
        host.textContent = text;
        host.removeAttribute("aria-label");
      }
      built = false;
    };

    const run = () => {
      if (cancelled || built) return;
      if (document.documentElement.classList.contains("motion-paused")) return;
      built = true;
      host.setAttribute("aria-label", text);
      host.textContent = "";
      const vis = document.createElement("span");
      vis.setAttribute("aria-hidden", "true");
      const tiles: Tile[] = [];
      text.split(" ").forEach((word, wi) => {
        if (wi > 0) vis.appendChild(document.createTextNode(" "));
        const w = document.createElement("span");
        w.className = "flap-word";
        for (const ch of word) {
          const el = document.createElement("span");
          el.className = "flap-tile";
          const charEl = document.createElement("span");
          charEl.className = "flap-char";
          charEl.textContent = " ";
          const shadeEl = document.createElement("span");
          shadeEl.className = "flap-shade";
          el.appendChild(charEl);
          el.appendChild(shadeEl);
          w.appendChild(el);
          tiles.push({ el, charEl, shadeEl, target: ch });
        }
        vis.appendChild(w);
      });
      host.appendChild(vis);

      master = gsap.timeline({ delay, onComplete: restore });
      tiles.forEach((tile, idx) => {
        const seq = riffle(tile.target);
        if (seq.length === 0) {
          tile.charEl.textContent = tile.target;
          return;
        }
        const tl = gsap.timeline();
        let cursor = 0;
        let prev = " ";
        seq.forEach((ch, si) => {
          const landing = si === seq.length - 1;
          const period = landing ? 0.17 : 0.1;
          const fall = period * 0.45;
          tl.call(
            () => {
              tile.charEl.textContent = prev;
              gsap.set(tile.el, { rotationX: 0 });
            },
            undefined,
            cursor,
          );
          tl.to(tile.el, { rotationX: -86, duration: fall, ease: "power2.in" }, cursor);
          tl.call(
            () => {
              tile.charEl.textContent = ch;
              gsap.set(tile.el, { rotationX: 86 });
            },
            undefined,
            cursor + fall,
          );
          tl.to(
            tile.el,
            { rotationX: 0, duration: period - fall, ease: landing ? "power2.out" : "power1.out" },
            cursor + fall,
          );
          if (landing) {
            tl.fromTo(
              tile.shadeEl,
              { opacity: 0.55 },
              { opacity: 0, duration: 0.22, ease: "power1.out" },
              cursor + fall,
            );
          }
          cursor += period;
          prev = ch;
        });
        master!.add(tl, idx * CHAR_STAGGER);
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(host);
    return () => {
      cancelled = true;
      io.disconnect();
      if (master) master.kill();
      if (built) restore();
      host.removeAttribute("aria-label");
    };
  }, [text, delay]);

  return <span ref={ref}>{text}</span>;
}
