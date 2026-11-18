/* Synthe flow section, second design (lane E).
   A Synthe-native stepper replacing the base build's rotate module: 7 steps on
   a rail, a progress fill, panels crossfading with the Spline-grade
   curve (.45s, cubic-bezier(.22,1,.36,1), outgoing panel blurs ~4px
   mid-crossfade, never a dead gap).

   Behaviour contract:
   - APG tab pattern: role=tablist/tab/tabpanel in the markup, roving
     tabindex, ArrowLeft/ArrowRight/Home/End with automatic
     activation (the same semantics behavior.js grafted onto the old
     pills; this component owns them natively).
   - Polite 8s auto-advance. Pause conditions are the established
     four: section off-screen, tab hidden, focus inside the section,
     prefers-reduced-motion. When behavior.js is loaded it publishes
     them (window.__syntheBehavior / the section's data-flow-paused
     attribute, which it sets on .section_home-flow; this section
     keeps that class) and this file honors that state first; it also
     tracks the same four conditions itself so it behaves identically
     standalone.
   - Phones (<=767px): steps couple to scroll position through the
     section, ported from the old scrollfix (same formula points:
     start at vh*0.8, end at vh*0.45), so the panel changes while
     scrolling the way the founder's build already did.
   - Zero dependencies, zero network. Load at end of body. */
(function () {
  "use strict";

  var section = document.querySelector(".fl2");
  if (!section) return;

  var tabs = Array.prototype.slice.call(section.querySelectorAll(".fl2-step"));
  var panels = Array.prototype.slice.call(section.querySelectorAll(".fl2-panel"));
  var fill = section.querySelector(".fl2-rail_fill");
  var stage = section.querySelector(".fl2-stage");
  var status = section.querySelector(".fl2-status");
  if (!tabs.length || tabs.length !== panels.length) return;

  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var phoneMQ = window.matchMedia("(max-width: 767px)");
  var DWELL = 8000;
  var current = 0;
  var timer = null;

  /* --- own pause-condition tracking (fallback / standalone) --- */
  var ownVisible = false;
  var ownFocus = false;
  function ownPaused() {
    return (
      document.hidden ||
      !ownVisible ||
      ownFocus ||
      reduceMQ.matches
    );
  }
  function paused() {
    var b = window.__syntheBehavior;
    if (b && typeof b.flowPaused === "boolean" && b.flowPaused) return true;
    if (section.hasAttribute("data-flow-paused")) return true;
    return ownPaused();
  }

  if ("IntersectionObserver" in window) {
    try {
      new IntersectionObserver(
        function (entries) {
          ownVisible = entries[0].isIntersecting;
        },
        { threshold: 0 }
      ).observe(section);
    } catch (e) {
      ownVisible = true;
    }
  } else {
    ownVisible = true;
  }
  section.addEventListener("focusin", function () {
    ownFocus = true;
  });
  section.addEventListener("focusout", function () {
    window.requestAnimationFrame(function () {
      ownFocus = section.contains(document.activeElement);
    });
  });

  /* --- state application --- */
  function applyState() {
    tabs.forEach(function (tab, i) {
      var isActive = i === current;
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.tabIndex = isActive ? 0 : -1;
      tab.classList.toggle("is-active", isActive);
      tab.classList.toggle("is-done", i < current);
    });
    if (fill) {
      fill.style.width = current / (tabs.length - 1) * 100 + "%";
    }
    if (status) {
      var name = tabs[current].getAttribute("data-name") || "";
      status.textContent = "Step " + (current + 1) + " of " + tabs.length + " · " + name;
    }
  }

  function go(n, focusTab) {
    var next = ((n % tabs.length) + tabs.length) % tabs.length;
    if (next === current) {
      restart();
      return;
    }
    var prev = current;
    current = next;
    if (stage) stage.setAttribute("data-dir", next > prev ? "fwd" : "back");

    var out = panels[prev];
    var inn = panels[next];
    inn.classList.add("is-active");
    inn.removeAttribute("aria-hidden");
    out.classList.remove("is-active");
    out.classList.add("is-leaving");
    window.setTimeout(function () {
      out.classList.remove("is-leaving");
      if (!out.classList.contains("is-active")) {
        out.setAttribute("aria-hidden", "true");
      }
    }, 500);

    applyState();
    if (focusTab) tabs[current].focus();
    restart();
  }

  /* --- polite auto-advance --- */
  function stop() {
    if (timer) {
      window.clearTimeout(timer);
      timer = null;
    }
  }
  function tick() {
    timer = null;
    if (reduceMQ.matches) return;
    if (paused()) {
      timer = window.setTimeout(tick, 1000);
      return;
    }
    go(current + 1, false);
  }
  function restart() {
    stop();
    if (reduceMQ.matches) return;
    timer = window.setTimeout(tick, DWELL);
  }
  if (reduceMQ.addEventListener) {
    reduceMQ.addEventListener("change", function () {
      if (reduceMQ.matches) stop();
      else restart();
    });
  }

  /* --- input: click + APG keys --- */
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () {
      go(i, false);
    });
  });
  section.addEventListener("keydown", function (e) {
    var tab = e.target && e.target.closest ? e.target.closest(".fl2-step") : null;
    if (!tab) return;
    var idx = tabs.indexOf(tab);
    if (idx === -1) return;
    var target = null;
    if (e.key === "ArrowRight") target = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") target = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") target = 0;
    else if (e.key === "End") target = tabs.length - 1;
    else return;
    e.preventDefault();
    go(target, true);
  });

  /* --- phone scroll-coupling (ported from the old scrollfix) --- */
  var scrollTimer = null;
  var lastFire = 0;
  var touching = false;
  section.addEventListener("touchstart", function () { touching = true; }, { passive: true });
  section.addEventListener("touchend", function () {
    window.setTimeout(function () { touching = false; }, 120);
  }, { passive: true });

  function targetStepFromScroll() {
    var r = section.getBoundingClientRect();
    var vh = window.innerHeight;
    var start = r.top + window.scrollY - vh * 0.8;
    var end = r.bottom + window.scrollY - vh * 0.45;
    var p = (window.scrollY - start) / Math.max(1, end - start);
    p = Math.max(0, Math.min(1, p));
    return Math.min(tabs.length, Math.floor(p * tabs.length) + 1);
  }
  function driveScroll() {
    if (!phoneMQ.matches || reduceMQ.matches || touching || ownFocus) return;
    var now = Date.now();
    if (now - lastFire < 250) return;
    var tgt = targetStepFromScroll();
    if (tgt - 1 === current) return;
    lastFire = now;
    go(tgt - 1, false);
  }
  window.addEventListener(
    "scroll",
    function () {
      if (scrollTimer) return;
      scrollTimer = window.setTimeout(function () {
        scrollTimer = null;
        driveScroll();
      }, 90);
    },
    { passive: true }
  );

  /* --- init: markup ships with step 1 active --- */
  panels.forEach(function (panel, i) {
    if (i === 0) panel.classList.add("is-active");
    else panel.setAttribute("aria-hidden", "true");
  });
  applyState();
  restart();
})();
