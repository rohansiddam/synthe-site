/* Synthe flow section, third design (flow3 lane).
   1) The stepper/stage controller: the flow2 behavior contract
      ported unchanged (APG tablist with roving tabindex and
      arrow/Home/End keys, polite 8s auto-advance honoring
      behavior.js's published pause state, phone scroll-coupling
      with the same formula), plus an animated stage height so the
      stage fits the active panel instead of sharing one height.
   2) The scene engine: each panel is a small product scene whose
      content plays on a timed loop while the panel is active
      (checks settle, messages arrive, a diff composes, bars
      animate, gates check and the Mark locks, a timeline walks
      back, a report prints). Scenes are driven by state classes
      over the settled end state: with reduced motion, or without
      JS, every scene renders finished and static.
   Standalone panels (how.html) play when scrolled into view. */
(function () {
  "use strict";

  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------- scene engine ---------------- */

  /* Generalised counter (REF-RAMP section 4.4.1): one eased rAF
     count for percents and plain integers, up or down. suffix is
     "%" for the three percent counts and "" for plain figures.
     stale() reports that the owning player's run token has moved
     on (a reset landed mid-count); a stale frame stops without
     writing, so a reset can never be overwritten by a count that
     started before it. */
  function countTo(el, from, to, dur, suffix, stale) {
    var start = null;
    function frame(ts) {
      if (stale && stale()) return;
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e) + suffix;
      if (p < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  /* Timed beats per scene. add/remove name state classes on the
     element matched by q (index i into the match list; no q means
     the panel itself). flow4 step kinds: countTo counts a figure
     (addressed by q/i, or by data-count-to value for the three
     percent counts), bump ticks a small tally by a step, text
     swaps a label. liveStart rewinds a scene's ticking figures
     when the panel goes live; the markup itself always carries
     the settled values. */
  var SCENES = {
    checks: {
      cycle: 5900,
      liveStart: [{ q: "[data-fl4-num]", value: "0" }],
      steps: [
        { t: 150, q: ".fl3-checks .sc-row", i: 0, add: "s-in" },
        { t: 330, q: ".fl3-checks .sc-row", i: 0, add: "s-on" },
        { t: 330, q: "[data-fl4-num]", by: 1 },
        { t: 570, q: ".fl3-checks .sc-row", i: 1, add: "s-in" },
        { t: 750, q: ".fl3-checks .sc-row", i: 1, add: "s-on" },
        { t: 750, q: "[data-fl4-num]", by: 1 },
        { t: 990, q: ".fl3-checks .sc-row", i: 2, add: "s-in" },
        { t: 1170, q: ".fl3-checks .sc-row", i: 2, add: "s-on" },
        { t: 1170, q: "[data-fl4-num]", by: 1 },
        { t: 1410, q: ".fl3-checks .sc-row", i: 3, add: "s-in" },
        { t: 1590, q: ".fl3-checks .sc-row", i: 3, add: "s-on" },
        { t: 1590, q: "[data-fl4-num]", by: 1 },
        { t: 1900, q: ".fl3-guard", add: "s-in" },
        { t: 2120, q: ".fl3-guard", add: "s-on" },
        { t: 2120, q: "[data-fl4-num]", by: 1 }
      ]
    },
    messages: {
      cycle: 5600,
      liveStart: [
        { q: "[data-fl4-num]", value: "0" },
        { q: "[data-fl4-label]", value: " written" }
      ],
      steps: [
        { t: 150, q: ".fl3-msgs .sc-row", i: 0, add: "s-in" },
        { t: 150, q: "[data-fl4-num]", by: 1 },
        { t: 320, q: ".fl3-msgs .sc-pop", i: 0, add: "s-in" },
        { t: 450, q: ".fl3-msgs .sc-row", i: 1, add: "s-in" },
        { t: 450, q: "[data-fl4-num]", by: 1 },
        { t: 620, q: ".fl3-msgs .sc-pop", i: 1, add: "s-in" },
        { t: 750, q: ".fl3-msgs .sc-row", i: 2, add: "s-in" },
        { t: 750, q: "[data-fl4-num]", by: 1 },
        { t: 920, q: ".fl3-msgs .sc-pop", i: 2, add: "s-in" },
        { t: 1050, q: ".fl3-msgs .sc-row", i: 3, add: "s-in" },
        { t: 1050, q: "[data-fl4-num]", by: 1 },
        { t: 1220, q: ".fl3-msgs .sc-pop", i: 3, add: "s-in" },
        { t: 1350, q: ".fl3-msgs .sc-row", i: 4, add: "s-in" },
        { t: 1350, q: "[data-fl4-num]", by: 1 },
        { t: 1520, q: ".fl3-msgs .sc-pop", i: 4, add: "s-in" },
        {
          t: 1560,
          q: "[data-fl4-num]",
          countTo: { from: 5, to: 36, dur: 330 }
        },
        { t: 1850, q: ".fl3-morecard", add: "s-in" },
        { t: 1850, q: "[data-fl4-label]", value: " in the set" }
      ]
    },
    diff: {
      cycle: 5900,
      liveStart: [
        { q: ".fl3-plus [data-fl4-num]", value: "0" },
        { q: ".fl3-minus [data-fl4-num]", value: "0" }
      ],
      steps: [
        { t: 100, q: ".fl3-diff_h", add: "s-in" },
        { t: 300, q: ".fl3-line.is-del", i: 0, add: "s-in" },
        { t: 300, q: ".fl3-minus [data-fl4-num]", by: 1 },
        { t: 550, q: ".fl3-line.is-del", i: 1, add: "s-in" },
        { t: 550, q: ".fl3-minus [data-fl4-num]", by: 1 },
        { t: 1050, q: ".fl3-line.is-add", i: 0, add: "s-in" },
        { t: 1050, q: ".fl3-plus [data-fl4-num]", by: 1 },
        { t: 1500, q: ".fl3-line.is-add", i: 1, add: "s-in" },
        { t: 1500, q: ".fl3-plus [data-fl4-num]", by: 1 }
      ]
    },
    test: {
      cycle: 6800,
      liveStart: [
        { q: ".fl4-tally [data-fl4-num]", value: "0" },
        { q: ".fl3-statcard [data-fl4-num]", i: 0, value: "0" },
        { q: ".fl3-statcard [data-fl4-num]", i: 1, value: "0" },
        { q: ".fl3-statcard [data-fl4-num]", i: 2, value: "0" },
        { q: ".fl3-statcard [data-fl4-num]", i: 3, value: "0" },
        { q: ".fl3-statcard [data-fl4-num]", i: 4, value: "1" }
      ],
      steps: [
        { t: 250, q: ".fl3-score", i: 0, add: "s-old" },
        { t: 550, countTo: { value: "86", dur: 950 } },
        {
          t: 550,
          q: ".fl4-tally [data-fl4-num]",
          countTo: { from: 0, to: 36, dur: 1650 }
        },
        { t: 650, q: ".fl3-score", i: 0, add: "s-new" },
        { t: 950, q: ".fl3-score", i: 1, add: "s-old" },
        { t: 1250, countTo: { value: "79", dur: 950 } },
        { t: 1350, q: ".fl3-score", i: 1, add: "s-new" },
        { t: 1900, q: ".fl3-out", i: 0, add: "s-in" },
        { t: 2070, q: ".fl3-out .sc-pop", i: 0, add: "s-in" },
        { t: 2170, q: ".fl3-out", i: 1, add: "s-in" },
        { t: 2340, q: ".fl3-out .sc-pop", i: 1, add: "s-in" },
        { t: 2440, q: ".fl3-out", i: 2, add: "s-in" },
        { t: 2610, q: ".fl3-out .sc-pop", i: 2, add: "s-in" },
        { t: 2710, q: ".fl3-out", i: 3, add: "s-in" },
        { t: 2880, q: ".fl3-out .sc-pop", i: 3, add: "s-in" },
        { t: 3050, q: ".fl3-out.is-failrow", add: "s-pulse" },
        { t: 3200, q: ".fl3-statcard", i: 0, add: "s-in" },
        {
          t: 3200,
          q: ".fl3-statcard [data-fl4-num]",
          i: 0,
          countTo: { from: 0, to: 19, dur: 600 }
        },
        {
          t: 3200,
          q: ".fl3-statcard [data-fl4-num]",
          i: 1,
          countTo: { from: 0, to: 4, dur: 600 }
        },
        { t: 3350, q: ".fl3-statcard", i: 1, add: "s-in" },
        {
          t: 3350,
          q: ".fl3-statcard [data-fl4-num]",
          i: 2,
          countTo: { from: 0, to: 8, dur: 600 }
        },
        {
          t: 3350,
          q: ".fl3-statcard [data-fl4-num]",
          i: 3,
          countTo: { from: 0, to: 2, dur: 600 }
        },
        { t: 3500, q: ".fl3-statcard", i: 2, add: "s-in" },
        {
          t: 3500,
          q: ".fl3-statcard [data-fl4-num]",
          i: 4,
          countTo: { from: 1, to: 0, dur: 600 }
        }
      ]
    },
    merge: {
      cycle: 6600,
      liveStart: [
        { q: ".fl3-gate_v [data-fl4-num]", i: 0, value: "74" },
        { q: ".fl3-gate_v [data-fl4-num]", i: 1, value: "58" },
        { q: ".fl3-gate_v [data-fl4-num]", i: 2, value: "0" },
        { q: ".fl3-gate_v [data-fl4-num]", i: 3, value: "0" }
      ],
      steps: [
        { t: 300, q: ".fl3-gates .sc-gate", i: 0, add: "s-on" },
        {
          t: 300,
          q: ".fl3-gate_v [data-fl4-num]",
          i: 0,
          countTo: { from: 74, to: 86, dur: 700 }
        },
        { t: 750, q: ".fl3-gates .sc-gate", i: 1, add: "s-on" },
        {
          t: 750,
          q: ".fl3-gate_v [data-fl4-num]",
          i: 1,
          countTo: { from: 58, to: 79, dur: 700 }
        },
        { t: 1200, q: ".fl3-gates .sc-gate", i: 2, add: "s-on" },
        {
          t: 1200,
          q: ".fl3-gate_v [data-fl4-num]",
          i: 2,
          countTo: { from: 0, to: 19, dur: 600 }
        },
        {
          t: 1200,
          q: ".fl3-gate_v [data-fl4-num]",
          i: 3,
          countTo: { from: 0, to: 4, dur: 600 }
        },
        { t: 1650, q: ".fl3-gates .sc-gate", i: 3, add: "s-on" },
        { t: 2150, add: "s-locked" },
        { t: 2300, q: ".fl3-merged", add: "s-on" },
        { t: 2650, q: ".fl3-stamp", add: "s-in" }
      ]
    },
    revert: {
      cycle: 6400,
      liveStart: [
        { q: ".fl3-ev_stat [data-fl4-num]", i: 0, value: "88" },
        { q: ".fl3-ev_stat [data-fl4-num]", i: 1, value: "0" }
      ],
      steps: [
        { t: 200, q: ".fl3-tl", add: "s-in" },
        { t: 400, q: ".fl3-ev", i: 0, add: "s-in" },
        { t: 800, q: ".fl3-ev", i: 1, add: "s-in" },
        {
          t: 950,
          q: ".fl3-ev_stat [data-fl4-num]",
          i: 0,
          countTo: { from: 88, to: 70, dur: 800 }
        },
        { t: 1000, q: ".fl3-ev_stat [data-fl4-num]", i: 1, by: 1 },
        { t: 1160, q: ".fl3-ev_stat [data-fl4-num]", i: 1, by: 1 },
        { t: 1200, q: ".fl3-ev", i: 2, add: "s-in" },
        { t: 1320, q: ".fl3-ev_stat [data-fl4-num]", i: 1, by: 1 },
        { t: 1480, q: ".fl3-ev_stat [data-fl4-num]", i: 1, by: 1 },
        { t: 1560, q: ".fl3-ev", i: 1, add: "s-pulse" },
        { t: 1850, q: ".fl3-tl_cursor", add: "s-show s-pos3" },
        { t: 2650, q: ".fl3-tl_cursor", remove: "s-pos3", add: "s-pos1" },
        { t: 3500, q: ".fl3-ev", i: 0, add: "s-pulse" },
        { t: 3900, q: ".fl3-tl_cursor", remove: "s-show s-pos1" },
        { t: 4000, q: ".fl3-nowcard", add: "s-in" }
      ]
    },
    report: {
      cycle: 6400,
      liveStart: [
        { q: ".fl3-rec_v [data-fl4-num]", i: 0, value: "58" },
        { q: ".fl3-rec_v [data-fl4-num]", i: 1, value: "1" }
      ],
      steps: [
        { t: 200, q: ".fl3-report .sc-row", i: 0, add: "s-in" },
        { t: 300, countTo: { value: "86", dur: 950 } },
        { t: 480, q: ".fl3-report .sc-row", i: 1, add: "s-in" },
        {
          t: 480,
          q: ".fl3-rec_v [data-fl4-num]",
          i: 0,
          countTo: { from: 58, to: 79, dur: 800 }
        },
        { t: 760, q: ".fl3-report .sc-row", i: 2, add: "s-in" },
        { t: 1040, q: ".fl3-report .sc-row", i: 3, add: "s-in" },
        { t: 1340, q: ".fl3-rec_v [data-fl4-num]", i: 1, by: -1 },
        { t: 1500, q: ".fl3-rounds .sc-row", i: 0, add: "s-in" },
        { t: 1660, q: ".fl3-rounds .sc-pop", i: 0, add: "s-in" },
        { t: 1760, q: ".fl3-rounds .sc-row", i: 1, add: "s-in" },
        { t: 1920, q: ".fl3-rounds .sc-pop", i: 1, add: "s-in" },
        { t: 2020, q: ".fl3-rounds .sc-row", i: 2, add: "s-in" },
        { t: 2180, q: ".fl3-rounds .sc-pop", i: 2, add: "s-in" },
        { t: 2280, q: ".fl3-rounds .sc-row", i: 3, add: "s-in" },
        { t: 2440, q: ".fl3-rounds .sc-pop", i: 3, add: "s-in" }
      ]
    }
  };
  var STATE_CLASSES = [
    "s-in", "s-on", "s-old", "s-new", "s-locked",
    "s-pulse", "s-show", "s-pos1", "s-pos3"
  ];

  function makePlayer(panel) {
    var def = SCENES[panel.getAttribute("data-scene")];
    var scene = panel.querySelector(".fl3-scene");
    var timers = [];
    var running = false;
    var counts = [];
    var runToken = 0;
    if (!def || !scene) return null;
    panel.querySelectorAll("[data-count-to]").forEach(function (el) {
      counts.push({ el: el, orig: el.textContent });
    });
    /* flow4: the ticking figures (and panel 2's tally label) join
       the same restore registry, so resetStates() returns them to
       their settled markup values exactly as it does the percent
       counts. */
    panel
      .querySelectorAll("[data-fl4-num],[data-fl4-label]")
      .forEach(function (el) {
        counts.push({ el: el, orig: el.textContent });
      });
    function later(ms, fn) {
      timers.push(window.setTimeout(fn, ms));
    }
    function clearTimers() {
      timers.forEach(function (id) { window.clearTimeout(id); });
      timers = [];
    }
    function apply(st) {
      if (st.countTo) {
        var cTarget = null;
        var cFrom = 0;
        var cTo = 0;
        var cSuffix = "";
        if (typeof st.countTo.value === "string") {
          /* The three percent counts: addressed by their
             data-count-to value, from read from data-count-from,
             exactly as flow3's count steps behaved. */
          cTarget = panel.querySelector(
            '[data-count-to="' + st.countTo.value + '"]'
          );
          if (!cTarget) return;
          cFrom = parseInt(
            cTarget.getAttribute("data-count-from"),
            10
          );
          cTo = parseInt(st.countTo.value, 10);
          cSuffix = "%";
        } else {
          var cList = panel.querySelectorAll(st.q);
          cTarget = cList[typeof st.i === "number" ? st.i : 0] || null;
          if (!cTarget) return;
          cFrom = st.countTo.from;
          cTo = st.countTo.to;
          cSuffix = st.countTo.suffix || "";
        }
        var tokenAtStart = runToken;
        countTo(
          cTarget,
          cFrom,
          cTo,
          st.countTo.dur || 900,
          cSuffix,
          function () {
            return tokenAtStart !== runToken;
          }
        );
        return;
      }
      var target = panel;
      if (st.q) {
        var list = panel.querySelectorAll(st.q);
        target = list[typeof st.i === "number" ? st.i : 0] || null;
      }
      if (!target) return;
      if (typeof st.by === "number") {
        /* bump: a small tally ticks by a step at its beat. */
        var cur = parseInt(target.textContent, 10);
        target.textContent = String((isNaN(cur) ? 0 : cur) + st.by);
        return;
      }
      if (typeof st.value === "string") {
        /* text: a label swap at its beat. */
        target.textContent = st.value;
        return;
      }
      if (st.add) {
        st.add.split(" ").forEach(function (c) {
          target.classList.add(c);
        });
      }
      if (st.remove) {
        st.remove.split(" ").forEach(function (c) {
          target.classList.remove(c);
        });
      }
    }
    function resetStates() {
      /* Invalidate any count still in flight (section 4.4.1's run
         token): reset() reaches the token through here, so a count
         started before a reset can never write after it. */
      runToken += 1;
      panel
        .querySelectorAll(
          ".s-in,.s-on,.s-old,.s-new,.s-locked,.s-pulse,.s-show," +
            ".s-pos1,.s-pos3"
        )
        .forEach(function (el) {
          el.classList.remove.apply(el.classList, STATE_CLASSES);
        });
      panel.classList.remove.apply(panel.classList, STATE_CLASSES);
      counts.forEach(function (c) {
        c.el.textContent = c.orig;
      });
    }
    function cycle() {
      if (!running) return;
      def.steps.forEach(function (st) {
        later(st.t, function () {
          apply(st);
        });
      });
      later(def.cycle, function () {
        if (!running) return;
        scene.classList.add("fl3-dip");
        later(320, function () {
          resetStates();
          scene.classList.remove("fl3-dip");
          later(150, cycle);
        });
      });
    }
    return {
      play: function () {
        if (running || reduceMQ.matches) return;
        running = true;
        scene.classList.remove("fl3-dip");
        panel.classList.add("fl3-live");
        /* flow4: live-start values (section 4.4.2). The markup
           carries settled values; going live rewinds each ticking
           figure to where its count starts, and the scene's steps
           replay how the settled value was reached. */
        if (def.liveStart) {
          def.liveStart.forEach(function (ls) {
            var list = panel.querySelectorAll(ls.q);
            var el = list[typeof ls.i === "number" ? ls.i : 0] || null;
            if (el) el.textContent = ls.value;
          });
        }
        cycle();
      },
      suspend: function () {
        if (!running) return;
        running = false;
        clearTimers();
        /* Never leave the scene dipped: suspending mid-dip clears
           the timers that would have lifted it. */
        scene.classList.remove("fl3-dip");
      },
      reset: function () {
        running = false;
        clearTimers();
        resetStates();
        scene.classList.remove("fl3-dip");
        panel.classList.remove("fl3-live");
      }
    };
  }

  /* ---------------- standalone panels (how.html) ---------------- */

  var stagePanels = document.querySelectorAll(".fl3-stage .fl3-panel");
  var inStage = {};
  stagePanels.forEach(function (p) {
    inStage[p.id] = true;
  });
  var soloPlayers = [];
  document.querySelectorAll(".fl3-panel").forEach(function (p) {
    if (inStage[p.id]) return;
    var player = makePlayer(p);
    if (player) soloPlayers.push({ panel: p, player: player });
  });
  if (soloPlayers.length && "IntersectionObserver" in window) {
    var soloIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          soloPlayers.forEach(function (sp) {
            if (sp.panel !== entry.target) return;
            if (entry.isIntersecting) sp.player.play();
            else sp.player.suspend();
          });
        });
      },
      { threshold: 0.3 }
    );
    soloPlayers.forEach(function (sp) {
      soloIO.observe(sp.panel);
    });
  }

  /* ---------------- stepper + stage (index) ---------------- */

  var section = document.querySelector(".section_home-flow.fl3");
  if (!section) return;
  var tabs = Array.prototype.slice.call(
    section.querySelectorAll(".fl3-step")
  );
  var panels = Array.prototype.slice.call(
    section.querySelectorAll(".fl3-stage .fl3-panel")
  );
  var stage = section.querySelector(".fl3-stage");
  var fill = section.querySelector(".fl3-rail_fill");
  var status = section.querySelector(".fl3-status");
  if (!tabs.length || tabs.length !== panels.length) return;

  var players = panels.map(function (p) {
    return makePlayer(p);
  });
  var current = 0;
  var ownFocus = false;
  var touching = false;
  var sectionVisible = false;
  var heightTimer = null;
  var DWELL = 8000;
  var timer = null;

  function behaviorPaused() {
    if (window.__syntheBehavior && window.__syntheBehavior.flowPaused) {
      return true;
    }
    return section.getAttribute("data-flow-paused") === "true";
  }
  function paused() {
    return (
      behaviorPaused() ||
      !sectionVisible ||
      ownFocus ||
      document.hidden ||
      reduceMQ.matches
    );
  }

  function applyState() {
    tabs.forEach(function (tab, i) {
      var on = i === current;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      tab.classList.toggle("is-active", on);
      tab.classList.toggle("is-done", i < current);
    });
    if (fill && tabs.length > 1) {
      fill.style.width = (current / (tabs.length - 1)) * 100 + "%";
    }
    if (status) {
      status.textContent =
        "Step " +
        (current + 1) +
        " of " +
        tabs.length +
        " · " +
        tabs[current].getAttribute("data-name");
    }
  }

  function playCurrent() {
    if (sectionVisible && players[current]) players[current].play();
  }

  function go(i, opts) {
    opts = opts || {};
    var n = tabs.length;
    var next = ((i % n) + n) % n;
    if (next === current && !opts.force) return;
    var prev = current;
    current = next;
    if (stage) {
      stage.setAttribute("data-dir", next > prev ? "fwd" : "back");
    }
    var outgoing = panels[prev];
    var incoming = panels[next];
    var fromH = stage ? stage.offsetHeight : 0;
    outgoing.classList.remove("is-active");
    outgoing.classList.add("is-leaving");
    incoming.classList.remove("is-leaving");
    incoming.classList.add("is-active");
    incoming.removeAttribute("aria-hidden");
    if (players[prev]) players[prev].reset();
    playCurrent();
    window.setTimeout(function () {
      outgoing.classList.remove("is-leaving");
      outgoing.setAttribute("aria-hidden", "true");
    }, 500);
    /* Animate the stage height to the incoming panel so no panel
       leaves dead space under its scene. */
    if (stage && !reduceMQ.matches) {
      stage.style.height = fromH + "px";
      void stage.offsetHeight;
      /* Integrator correction (flow3 wiring): the target must be the
         incoming panel's own height. stage.scrollHeight also counts
         the absolutely-positioned outgoing panel, so on a step down
         to a shorter panel it returned the old height and the stage
         snapped instead of transitioning. */
      stage.style.height = incoming.offsetHeight + "px";
      window.clearTimeout(heightTimer);
      heightTimer = window.setTimeout(function () {
        stage.style.height = "";
      }, 500);
    }
    applyState();
    if (opts.focus) tabs[current].focus();
    restart();
  }

  function tick() {
    timer = null;
    if (paused()) {
      timer = window.setTimeout(tick, 1000);
      return;
    }
    go(current + 1);
  }
  function restart() {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(tick, DWELL);
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () {
      go(i);
    });
    tab.addEventListener("keydown", function (e) {
      var k = e.key;
      var target = null;
      if (k === "ArrowRight") target = current + 1;
      else if (k === "ArrowLeft") target = current - 1;
      else if (k === "Home") target = 0;
      else if (k === "End") target = tabs.length - 1;
      if (target !== null) {
        e.preventDefault();
        go(target, { focus: true });
      }
    });
  });
  section.addEventListener("focusin", function () {
    ownFocus = true;
  });
  section.addEventListener("focusout", function (e) {
    if (!section.contains(e.relatedTarget)) ownFocus = false;
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var was = sectionVisible;
          sectionVisible = entry.isIntersecting;
          if (sectionVisible && !was) playCurrent();
          if (!sectionVisible && was && players[current]) {
            players[current].suspend();
          }
        });
      },
      { threshold: 0.15 }
    ).observe(section);
  } else {
    sectionVisible = true;
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (players[current]) players[current].suspend();
    } else {
      playCurrent();
    }
  });
  window.addEventListener("resize", function () {
    if (stage) stage.style.height = "";
  });

  /* Phone scroll-coupling: while the section travels through the
     viewport on a phone, the scroll position picks the step
     (formula unchanged from the shipped scrollfix/flow2). */
  var phoneMQ = window.matchMedia("(max-width: 767px)");
  var couplingBusy = false;
  function targetStepFromScroll() {
    var rect = section.getBoundingClientRect();
    var vh = window.innerHeight;
    var sectionTop = rect.top;
    var sectionBottom = rect.bottom;
    var scrollY = window.scrollY;
    var start = sectionTop + scrollY - vh * 0.8;
    var end = sectionBottom + scrollY - vh * 0.45;
    var p = (scrollY - start) / (end - start);
    p = Math.max(0, Math.min(1, p));
    return Math.min(tabs.length, Math.floor(p * tabs.length) + 1);
  }
  function driveScroll() {
    if (
      !phoneMQ.matches ||
      reduceMQ.matches ||
      touching ||
      ownFocus ||
      couplingBusy
    ) {
      return;
    }
    var step = targetStepFromScroll();
    if (step - 1 !== current) {
      couplingBusy = true;
      go(step - 1);
      window.setTimeout(function () {
        couplingBusy = false;
      }, 250);
    }
  }
  var scrollTicking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (scrollTicking) return;
      scrollTicking = true;
      window.setTimeout(function () {
        scrollTicking = false;
        driveScroll();
      }, 90);
    },
    { passive: true }
  );
  window.addEventListener(
    "touchstart",
    function () {
      touching = true;
    },
    { passive: true }
  );
  window.addEventListener(
    "touchend",
    function () {
      window.setTimeout(function () {
        touching = false;
      }, 120);
    },
    { passive: true }
  );

  applyState();
  restart();

  /* ---------------- live strip (flow4, index only) ----------------
     Ramp's ticker as the section's shared ledger: three counters
     whose bases are arithmetic over the scenes' own fiction
     (36 messages x 5 checks = 180 checks run; 4 changes tested).
     A message tick schedules its own consequence: five single
     check ticks, 130ms apart, starting 700ms later (one message,
     run against five checks). Changes tick on their own slower
     chain. The strip is ambient furniture: it runs only while the
     section is in view, never while the tab is hidden, never
     under reduced motion, and it does not join the stepper's
     pause conditions. Timers are cleared on stop, so a suspended
     strip simply holds its last written values. On how.html this
     block is never reached (no stepper section, no strip). */
  var livebar = section.querySelector(".fl4-livebar");
  if (livebar) {
    var stripState = { messages: 36, checks: 180, changes: 4 };
    var stripEls = {
      messages: livebar.querySelector('[data-strip="messages"]'),
      checks: livebar.querySelector('[data-strip="checks"]'),
      changes: livebar.querySelector('[data-strip="changes"]')
    };
    var stripTimers = [];
    var stripRunning = false;
    var stripVisible = false;
    function stripLater(ms, fn) {
      stripTimers.push(window.setTimeout(fn, ms));
    }
    function stripWrite(key) {
      if (stripEls[key]) {
        stripEls[key].textContent =
          stripState[key].toLocaleString("en-US");
      }
    }
    function scheduleMessages() {
      if (!stripRunning) return;
      stripLater(6000 + Math.random() * 5000, function () {
        if (!stripRunning) return;
        stripState.messages += 1;
        stripWrite("messages");
        for (var k = 0; k < 5; k++) {
          (function (delay) {
            stripLater(delay, function () {
              if (!stripRunning) return;
              stripState.checks += 1;
              stripWrite("checks");
            });
          })(700 + k * 130);
        }
        scheduleMessages();
      });
    }
    function scheduleChanges() {
      if (!stripRunning) return;
      stripLater(50000 + Math.random() * 20000, function () {
        if (!stripRunning) return;
        stripState.changes += 1;
        stripWrite("changes");
        scheduleChanges();
      });
    }
    function stripStart() {
      /* v5: the strip shows the sample run's totals and no longer ticks;
         ticking counters read as fake live activity. */
      return;
      if (
        stripRunning ||
        reduceMQ.matches ||
        document.hidden ||
        !stripVisible
      ) {
        return;
      }
      stripRunning = true;
      scheduleMessages();
      scheduleChanges();
    }
    function stripStop() {
      stripRunning = false;
      stripTimers.forEach(function (id) {
        window.clearTimeout(id);
      });
      stripTimers = [];
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            stripVisible = entry.isIntersecting;
            if (stripVisible) stripStart();
            else stripStop();
          });
        },
        { threshold: 0.15 }
      ).observe(section);
    } else {
      stripVisible = true;
      stripStart();
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stripStop();
      else stripStart();
    });
    if (reduceMQ.addEventListener) {
      reduceMQ.addEventListener("change", function () {
        if (reduceMQ.matches) stripStop();
        else stripStart();
      });
    }
  }
})();
