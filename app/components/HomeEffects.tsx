"use client";

import { useEffect } from "react";

/* Homepage motion, ported from site.js:
   - The worked example: the prompt changes once, then the verdicts land.
     The prompt sequence runs when the prompt sheet is on screen; on a phone
     the report waits until it is visible, instead of finishing below the
     fold. It always ends in the complete static result (flow-ready removed).
   - Scroll reveal: offscreen, noncritical groups rise in on arrival;
     groups already in view stay still. Without JS they remain visible.
   - The card pointer glow: a soft accent light follows the pointer around
     the border (fine pointers only), in pixels, rAF-throttled. */
export function HomeEffects() {
  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: Array<() => void> = [];

    /* ---- The worked example ---- */
    const example = document.querySelector(".product-figure");
    if (example) {
      const flowMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
      const promptSheet = example.querySelector(".prompt-sheet");
      const reportSheet = example.querySelector(".report");
      const changes = Array.from(example.querySelectorAll(".changed"));
      const verdicts = Array.from(example.querySelectorAll(".report-results li"));
      const flowTimers: number[] = [];
      let flowObserver: IntersectionObserver | null = null;
      let promptStarted = false;
      let promptDone = false;
      let reportVisible = false;
      let reportStarted = false;
      let flowDone = false;
      const later = (ms: number, fn: () => void) => {
        flowTimers.push(
          window.setTimeout(() => {
            if (!flowDone) fn();
          }, ms),
        );
      };
      const finishFlow = () => {
        flowDone = true;
        flowTimers.forEach((t) => window.clearTimeout(t));
        flowObserver?.disconnect();
        changes.forEach((line) => line.classList.add("is-kept"));
        verdicts.forEach((row) => row.classList.add("is-reported"));
        example.classList.remove("flow-ready");
        example.setAttribute("data-flow-state", "complete");
      };
      const showReport = () => {
        if (!promptDone || !reportVisible || reportStarted || flowDone) return;
        reportStarted = true;
        example.setAttribute("data-flow-state", "report");
        verdicts.forEach((row, i) => {
          later(i * 160, () => row.classList.add("is-reported"));
        });
        later(720, finishFlow);
      };
      const showPrompt = () => {
        if (promptStarted || flowDone) return;
        promptStarted = true;
        example.setAttribute("data-flow-state", "prompt");
        changes.forEach((line, i) => {
          later(i * 800 + 80, () => line.classList.add("is-checking"));
          later(i * 800 + 520, () => line.classList.add("is-kept"));
        });
        later(1680, () => {
          promptDone = true;
          example.setAttribute("data-flow-state", "waiting-for-report");
          showReport();
        });
      };
      if (
        !promptSheet ||
        !reportSheet ||
        reduceMotion ||
        root.classList.contains("motion-paused") ||
        !("IntersectionObserver" in window)
      ) {
        finishFlow();
      } else {
        flowObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting || entry.intersectionRatio < 0.6) return;
              flowObserver?.unobserve(entry.target);
              if (entry.target === reportSheet) {
                reportVisible = true;
                showPrompt();
                showReport();
              } else {
                showPrompt();
              }
            });
          },
          { threshold: 0.6 },
        );
        flowObserver.observe(promptSheet);
        flowObserver.observe(reportSheet);
        example.classList.add("flow-ready");
        example.setAttribute("data-flow-state", "ready");
        const onFlowMedia = (e: MediaQueryListEvent) => {
          if (e.matches) finishFlow();
        };
        flowMedia.addEventListener?.("change", onFlowMedia);
        const onVisibility = () => {
          if (document.hidden) finishFlow();
        };
        document.addEventListener("visibilitychange", onVisibility);
        cleanups.push(() => {
          flowObserver?.disconnect();
          flowTimers.forEach((t) => window.clearTimeout(t));
          flowMedia.removeEventListener?.("change", onFlowMedia);
          document.removeEventListener("visibilitychange", onVisibility);
        });
      }
    }

    /* ---- Scroll reveal: one arrival per chapter ---- */
    if (!reduceMotion && !root.classList.contains("motion-paused") && "IntersectionObserver" in window) {
      const arrivals = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.remove("reveal-pending");
            arrivals.unobserve(entry.target);
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
      );
      document.querySelectorAll(".proof, .cards, .steps, .contact").forEach((section) => {
        if (section.getBoundingClientRect().top <= window.innerHeight) return;
        section.classList.add("scroll-reveal", "reveal-pending");
        arrivals.observe(section);
      });
      cleanups.push(() => arrivals.disconnect());
    }

    /* ---- Card pointer glow ---- */
    if (
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !reduceMotion
    ) {
      document.querySelectorAll(".card").forEach((card) => {
        const el = card as HTMLElement;
        let raf = 0;
        const onMove = (e: PointerEvent) => {
          if (raf) return;
          raf = requestAnimationFrame(() => {
            raf = 0;
            const r = el.getBoundingClientRect();
            el.style.setProperty("--mx", `${e.clientX - r.left}px`);
            el.style.setProperty("--my", `${e.clientY - r.top}px`);
          });
        };
        el.addEventListener("pointermove", onMove);
        cleanups.push(() => {
          el.removeEventListener("pointermove", onMove);
          if (raf) cancelAnimationFrame(raf);
        });
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
