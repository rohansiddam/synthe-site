"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ChecksScene } from "./Scenes";
import { DiffReview } from "./DiffReview";
import { SplitFlap } from "./SplitFlap";
import "./FeatureTabs.css";

/* The Clay flow pattern as Synthe's how-it-works: an options list
   beside a visual panel. The active option auto-advances every
   6.5s with a progress bar filling under its title; clicking an
   option restarts its dwell. Auto-advance (and the bar) pause
   while the pointer is over the section, while focus is inside
   it, while it is off-screen, and entirely under reduced motion.
   The panel swaps with a small pop: fade and an 8px rise. */

const DWELL_MS = 6500;

const TABS = [
  {
    title: "Your checks decide.",
    body: "Synthe tests every change against the checks you confirmed, on messages your agent really gets.",
  },
  {
    title: "Only the prompt changes.",
    body: "A winning change merges as a pull request. Nothing else in your repo is touched.",
  },
  {
    title: "You get the report.",
    body: "Every run ends with the morning report: what changed, what it scored, what it cost.",
  },
] as const;

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

export function FeatureTabs() {
  const [active, setActive] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const reduce = usePrefersReducedMotion();

  const rootRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  /* Dwell bookkeeping: remainingRef holds the ms left in the
     current dwell; resetRef tells the timer cleanup that the dwell
     was restarted (click or advance) rather than paused, so it
     refills instead of deducting the elapsed segment. */
  const remainingRef = useRef(DWELL_MS);
  const resetRef = useRef(false);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  const paused = reduce || hovered || focused || !inView;

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setInView(entry.isIntersecting));
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const goTo = useCallback((index: number, focusTab = false) => {
    const next = (index + TABS.length) % TABS.length;
    resetRef.current = true;
    remainingRef.current = DWELL_MS;
    setActive(next);
    setCycle((c) => c + 1);
    if (focusTab) tabRefs.current[next]?.focus();
  }, []);

  useEffect(() => {
    if (paused) return;
    /* Consume a reset that arrived while no timer was running
       (a click made while paused); a running timer's reset is
       consumed by its cleanup instead. */
    resetRef.current = false;
    const started = Date.now();
    const t = window.setTimeout(() => {
      resetRef.current = true;
      setActive((a) => (a + 1) % TABS.length);
      setCycle((c) => c + 1);
    }, remainingRef.current);
    return () => {
      window.clearTimeout(t);
      if (resetRef.current) {
        remainingRef.current = DWELL_MS;
        resetRef.current = false;
      } else {
        remainingRef.current = Math.max(
          0,
          remainingRef.current - (Date.now() - started),
        );
      }
    };
  }, [paused, active, cycle]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      goTo(active + 1, true);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      goTo(active - 1, true);
    } else if (e.key === "Home") {
      e.preventDefault();
      goTo(0, true);
    } else if (e.key === "End") {
      e.preventDefault();
      goTo(TABS.length - 1, true);
    }
  };

  return (
    <div
      ref={rootRef}
      className={"ft-root"}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
    >
      <div
        className={"ft-options"}
        role="tablist"
        aria-label="How Synthe works"
        onKeyDown={onKeyDown}
      >
        {TABS.map((tab, i) => {
          const selected = i === active;
          return (
            <button
              key={tab.title}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${i}`}
              aria-selected={selected}
              aria-controls={`${uid}-panel`}
              tabIndex={selected ? 0 : -1}
              className={
                selected
                  ? `${"ft-option"} ${"ft-optionActive"}`
                  : "ft-option"
              }
              onClick={() => goTo(i)}
            >
              <span className={"ft-optionTitle"}>{tab.title}</span>
              <span className={"ft-optionBody"}>{tab.body}</span>
              {selected && (
                <span className={"ft-progressTrack"} aria-hidden="true">
                  <span
                    key={`${active}-${cycle}`}
                    className={
                      paused
                        ? `${"ft-progressFill"} ${"ft-progressPaused"}`
                        : "ft-progressFill"
                    }
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div
        className={"ft-panel"}
        role="tabpanel"
        id={`${uid}-panel`}
        aria-labelledby={`${uid}-tab-${active}`}
      >
        <div key={active} className={"ft-panelInner"}>
          {active === 0 && <ChecksScene />}
          {active === 1 && <DiffReview active />}
          {active === 2 && <SplitFlap active />}
        </div>
      </div>
    </div>
  );
}

export default FeatureTabs;
