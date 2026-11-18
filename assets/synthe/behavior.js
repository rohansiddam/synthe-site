/* Synthe behavior layer (lane 4).
   Additive accessibility and politeness grafts, ported from the good
   patterns in Codex's landing.js (clone-gallery commit 8195d52) onto
   the current module build. This file REPLACES nothing: the
   rotate (flow) module, the logos (wall) module and promptbox.js keep
   doing their jobs exactly as before, with the same visuals, layout
   and timings. Everything here either sets ARIA attributes, adds
   keyboard support, or drives an existing module through its own DOM
   controls (the same idiom the phone scrollfix already uses when it
   clicks a pill). Every hook is guarded: if homepage.js internals or
   the DOM differ from what this layer expects, the affected graft
   quietly no-ops instead of throwing.

   Zero dependencies, zero network. Load AFTER promptbox.js
   (see BEHAVIOR.md). */
(function () {
  "use strict";

  /* The single reduced-motion source for this layer (behavior 3's
     map lives in BEHAVIOR.md; the bundle has its own load-time
     snapshot, climb.js and the CSS have theirs). */
  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  var state = { flowPaused: false, flowPauseReason: "" };
  try {
    window.__syntheBehavior = state;
  } catch (e) {}

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  /* ================================================================
     Behaviors 1 + 2 — the flow section (.section_home-flow)
     1: tablist semantics + keyboard navigation for the 7 pills.
     2: polite auto-advance — approximated (see BEHAVIOR.md): the
        module's 8s dwell is a GSAP timeline inside the homepage.js
        closure with no external pause handle, so this layer tracks
        the pause conditions, publishes them, and keeps the ARIA
        state truthful while the timer runs; it never advances a
        step except in direct response to a user key press.
     ================================================================ */
  function initFlow() {
    var section = document.querySelector(".section_home-flow");
    if (!section) return;

    var wired = false;
    var lastActive = null;

    function allButtons() {
      return toArray(section.querySelectorAll('[data-uses="button"]'));
    }
    function allCards() {
      return toArray(section.querySelectorAll('[data-uses="card"]'));
    }
    /* The module clones the whole pill list for its infinite strip
       and marks each clone list aria-hidden="true". The originals
       are the buttons in the one list that is not hidden. */
    function originalList() {
      var lists = toArray(
        section.querySelectorAll('[data-uses="button-list"]')
      );
      for (var i = 0; i < lists.length; i++) {
        if (lists[i].getAttribute("aria-hidden") !== "true") return lists[i];
      }
      return lists[0] || null;
    }
    function originalButtons() {
      var list = originalList();
      if (!list) return [];
      return toArray(list.querySelectorAll('[data-uses="button"]'));
    }
    /* Current step, read the same way the phone scrollfix reads it:
       the module marks exactly one button (some copy in the strip)
       with .cc-active; its data-unique is the step number. */
    function currentStep() {
      var active = section.querySelector('[data-uses="button"].cc-active');
      if (!active) return null;
      var n = parseInt(active.getAttribute("data-unique"), 10);
      return isNaN(n) ? null : n;
    }

    function tabId(unique) {
      return "synthe-flow-tab-" + unique;
    }
    function panelId(unique) {
      return "synthe-flow-panel-" + unique;
    }

    /* Idempotently (re)apply the tab pattern. Safe to call any
       time; also decontaminates module clones, which inherit
       attributes via cloneNode if wiring raced the module. */
    function enhance() {
      var list = originalList();
      if (!list) return;
      list.setAttribute("role", "tablist");
      list.setAttribute("aria-label", "Loop steps");

      var tabs = originalButtons();
      var cards = allCards();
      var active = currentStep();
      if (active === null) active = 1;

      tabs.forEach(function (btn) {
        var u = btn.getAttribute("data-unique");
        if (!u) return;
        if (!btn.getAttribute("id")) btn.setAttribute("id", tabId(u));
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-controls", panelId(u));
        var isActive = parseInt(u, 10) === active;
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
        btn.tabIndex = isActive ? 0 : -1;
      });

      /* Anything inside a module clone list is a visual duplicate:
         strip tab semantics and ids the clone may have inherited. */
      allButtons().forEach(function (btn) {
        var holder = btn.closest('[data-uses="button-list"]');
        if (holder && holder.getAttribute("aria-hidden") === "true") {
          btn.removeAttribute("role");
          btn.removeAttribute("aria-selected");
          btn.removeAttribute("aria-controls");
          if ((btn.getAttribute("id") || "").indexOf("synthe-flow-") === 0) {
            btn.removeAttribute("id");
          }
          btn.tabIndex = -1;
        }
      });

      cards.forEach(function (card) {
        var u = card.getAttribute("data-unique");
        if (!u) return;
        if (!card.getAttribute("id")) card.setAttribute("id", panelId(u));
        card.setAttribute("role", "tabpanel");
        card.setAttribute("aria-labelledby", tabId(u));
        if (parseInt(u, 10) === active) {
          card.removeAttribute("aria-hidden");
        } else {
          card.setAttribute("aria-hidden", "true");
        }
      });
    }

    function sync() {
      var active = currentStep();
      if (active === null || active === lastActive) return;
      lastActive = active;
      enhance();
    }

    /* --- behavior 1: keyboard navigation (APG tab pattern,
       automatic activation, via the module's own click path) --- */
    function onKeydown(e) {
      var btn = e.target && e.target.closest
        ? e.target.closest('[data-uses="button"]')
        : null;
      if (!btn) return;
      var tabs = originalButtons();
      var idx = tabs.indexOf(btn);
      if (idx === -1) return;
      var target = null;
      if (e.key === "ArrowRight") target = (idx + 1) % tabs.length;
      else if (e.key === "ArrowLeft")
        target = (idx - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") target = 0;
      else if (e.key === "End") target = tabs.length - 1;
      else return;
      e.preventDefault();
      var dest = tabs[target];
      if (!dest) return;
      /* Reuse the module's own switching: a real click on the pill,
         exactly what a pointer user (and the phone scrollfix) does.
         If the module never initialised (e.g. reduced motion at
         load), the click is inert and nothing breaks. */
      dest.click();
      dest.focus();
      /* cc-active moves when the module's timeline starts; the
         MutationObserver below catches it, this is a belt-and-braces
         re-sync for slow frames. */
      window.setTimeout(sync, 120);
    }

    /* --- behavior 2: pause-condition tracking (approximation) --- */
    var sectionVisible = false;
    var focusInside = false;

    function recomputePause() {
      var reason = "";
      if (document.hidden) reason = "document-hidden";
      else if (!sectionVisible) reason = "off-screen";
      else if (focusInside) reason = "focus-inside";
      else if (reduceMQ.matches) reason = "reduced-motion";
      state.flowPaused = !!reason;
      state.flowPauseReason = reason;
      if (reason) section.setAttribute("data-flow-paused", reason);
      else section.removeAttribute("data-flow-paused");
    }

    function armObservers() {
      if ("IntersectionObserver" in window) {
        try {
          new IntersectionObserver(
            function (entries) {
              sectionVisible = entries[0].isIntersecting;
              recomputePause();
            },
            { threshold: 0 }
          ).observe(section);
        } catch (e) {
          sectionVisible = true;
        }
      } else {
        sectionVisible = true;
      }
      document.addEventListener("visibilitychange", recomputePause);
      section.addEventListener("focusin", function () {
        focusInside = true;
        recomputePause();
      });
      section.addEventListener("focusout", function () {
        window.requestAnimationFrame(function () {
          focusInside = section.contains(document.activeElement);
          recomputePause();
        });
      });
      if (reduceMQ.addEventListener) {
        reduceMQ.addEventListener("change", recomputePause);
      }
      recomputePause();
    }

    function wire() {
      if (wired) return;
      wired = true;
      enhance();
      lastActive = currentStep();
      var list = originalList();
      if (list) list.addEventListener("keydown", onKeydown);
      /* The module toggles .cc-active on every step change,
         however it was triggered (timer, click, drag, scrollfix).
         Watching class changes keeps aria-selected, the roving
         tabindex and the panels' aria-hidden truthful at all
         times — including while the 8s timer advances under a
         keyboard user, which is the part of Codex's polite-timer
         behavior that can be honored from outside the closure. */
      if ("MutationObserver" in window) {
        try {
          new MutationObserver(function () {
            sync();
          }).observe(section, {
            subtree: true,
            attributes: true,
            attributeFilter: ["class"],
          });
        } catch (e) {}
      }
      armObservers();
    }

    /* Wait for the module to initialise (it marks the active pill
       and builds its clones) so originals can be told from clones.
       Fall back to wiring the static markup after ~10s: under
       reduced motion at load the module deliberately never starts,
       and the tab attributes still describe the static structure. */
    var tries = 0;
    var iv = window.setInterval(function () {
      tries++;
      var ready =
        section.querySelector('[data-uses="button"].cc-active') ||
        section.querySelector(
          '[data-uses="button-list"][aria-hidden="true"]'
        );
      if (ready || tries > 66) {
        window.clearInterval(iv);
        wire();
      }
    }, 150);
  }

  /* ================================================================
     Behavior 3 (additive part) — live reduced-motion gate for the
     wall. The wall is already gated at load (homepage.js snapshots
     prefers-reduced-motion and the logos module never builds its
     track under it). What no existing code handles is the OS
     setting changing mid-session. This gate uses the module's own
     pause control: hovering the track eases its drift speed to 0,
     so a synthetic mouseenter engages the module's own pause and a
     synthetic mouseleave releases it. If the track does not exist
     (reduced motion at load, or the bundle failed), this no-ops.
     The rest of the gating map is in BEHAVIOR.md.
     ================================================================ */
  function initWallGate() {
    var held = false;

    function tracks() {
      return toArray(document.querySelectorAll("[data-logo-track]"));
    }
    function dispatch(el, type) {
      try {
        el.dispatchEvent(
          new MouseEvent(type, { bubbles: false, cancelable: true })
        );
      } catch (e) {}
    }
    function engage() {
      /* The track is built late (the module preloads images
         first); if it is not there yet, poll briefly for it. */
      if (!tracks().length) {
        var tries = 0;
        var iv = window.setInterval(function () {
          tries++;
          if (!reduceMQ.matches || tracks().length || tries > 20) {
            window.clearInterval(iv);
            if (reduceMQ.matches && tracks().length) engage();
          }
        }, 300);
        return;
      }
      tracks().forEach(function (t) {
        dispatch(t, "mouseenter");
        /* If the user's real pointer leaves while the gate holds,
           the module resumes; re-engage its pause right after. */
        if (!t.__syntheGateGuard) {
          t.__syntheGateGuard = true;
          t.addEventListener("mouseleave", function () {
            if (held && reduceMQ.matches) {
              window.setTimeout(function () {
                if (held && reduceMQ.matches) dispatch(t, "mouseenter");
              }, 50);
            }
          });
        }
      });
      held = tracks().length > 0;
    }
    function release() {
      held = false;
      tracks().forEach(function (t) {
        var hovered = false;
        try {
          hovered = t.matches(":hover");
        } catch (e) {}
        /* If the real pointer is over the track, the module's own
           hover-pause is legitimately in charge; leave it alone. */
        if (!hovered) dispatch(t, "mouseleave");
      });
    }
    if (reduceMQ.addEventListener) {
      reduceMQ.addEventListener("change", function () {
        if (reduceMQ.matches) engage();
        else release();
      });
    }
    /* Setting was already on when this layer loaded but after the
       bundle took its snapshot: engage now if a track exists. */
    if (reduceMQ.matches) engage();
  }

  /* ================================================================
     Behavior 5 — prompt box copy button: honest failure state.
     promptbox.js already tries the clipboard API, then a textarea
     + execCommand fallback, and sets "Copied" only on success —
     but on total failure it says nothing. This layer adds the
     missing piece additively: aria-live on the button (so label
     changes are announced), and a watcher that notices when a
     click produced no "Copied" claim, then selects the generated
     prompt and labels the button "Select and copy" instead of
     leaving a silent, apparently-dead button.
     ================================================================ */
  function initCopy() {
    var form = document.querySelector(
      ".section_input-action form.home-action_form"
    );
    if (!form) return;
    var btn = form.querySelector('[data-role="copy"]');
    var out = form.querySelector('[data-role="result-prompt"]');
    var panel = form.querySelector('[data-role="result"]');
    if (!btn || !out) return;

    btn.setAttribute("aria-live", "polite");

    var checkTimer = null;
    var revertTimer = null;

    btn.addEventListener("click", function () {
      if (checkTimer) window.clearTimeout(checkTimer);
      if (revertTimer) window.clearTimeout(revertTimer);
      checkTimer = window.setTimeout(function () {
        var label = (btn.textContent || "").trim();
        var text = (out.textContent || "").trim();
        if (!text) return;
        if (panel && panel.hidden) return;
        /* promptbox.js claims success by setting "Copied" as soon
           as either of its paths resolves; both settle fast. If
           the label is untouched after 900ms, both failed. (A
           leftover "Select and copy" from an earlier failure
           counts as untouched too.) */
        if (label !== "Copy" && label !== "Select and copy") return;
        try {
          var sel = window.getSelection();
          var range = document.createRange();
          range.selectNodeContents(out);
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (e) {}
        btn.textContent = "Select and copy";
        revertTimer = window.setTimeout(function () {
          if ((btn.textContent || "").trim() === "Select and copy") {
            btn.textContent = "Copy";
          }
        }, 2000);
      }, 900);
    });
  }

  onReady(function () {
    try {
      initFlow();
    } catch (e) {}
    try {
      initWallGate();
    } catch (e) {}
    try {
      initCopy();
    } catch (e) {}
  });
})();
