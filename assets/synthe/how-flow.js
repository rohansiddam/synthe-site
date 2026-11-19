
(function () {
  "use strict";

  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  

  
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
        
        var cur = parseInt(target.textContent, 10);
        target.textContent = String((isNaN(cur) ? 0 : cur) + st.by);
        return;
      }
      if (typeof st.value === "string") {
        
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
  var leaveTimers = [];
  var hovering = false;
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
      hovering ||
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
      fill.style.transform = "scaleX(" + current / (tabs.length - 1) + ")";
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
    
    window.clearTimeout(leaveTimers[next]);
    leaveTimers[next] = null;
    outgoing.classList.remove("is-active");
    outgoing.classList.add("is-leaving");
    incoming.classList.remove("is-leaving");
    incoming.classList.add("is-active");
    incoming.removeAttribute("aria-hidden");
    if (players[prev]) players[prev].reset();
    playCurrent();
    window.clearTimeout(leaveTimers[prev]);
    leaveTimers[prev] = window.setTimeout(function () {
      leaveTimers[prev] = null;
      if (outgoing.classList.contains("is-active")) return;
      outgoing.classList.remove("is-leaving");
      outgoing.setAttribute("aria-hidden", "true");
    }, 200);
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
  
  function onPointerIn(e) {
    if (e.pointerType === "mouse") hovering = true;
  }
  
  section.addEventListener("pointerenter", onPointerIn);
  section.addEventListener("pointermove", onPointerIn, { passive: true });
  section.addEventListener("pointerleave", function (e) {
    if (e.pointerType === "mouse") { hovering = false; restart(); }
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

  
  (function () {
    var night = document.querySelector("[data-how-night]");
    if (!night || reduceMQ.matches || !("IntersectionObserver" in window)) return;
    var PATHS = {
      settle: "M0,0 C0.08,0.38 0.18,0.80 0.38,0.92 C0.55,0.985 0.78,1 1,1",
      draw: "M0.0000,0.0000 C0.0222,0.1660 0.0889,0.1762 0.1333,0.1941 C0.1778,0.2121 0.2222,0.2201 0.2667,0.2680 C0.3111,0.3158 0.3500,0.3857 0.4000,0.4810 C0.4500,0.5763 0.5167,0.7651 0.5667,0.8397 C0.6167,0.9143 0.6556,0.9051 0.7000,0.9283 C0.7444,0.9515 0.7833,0.9670 0.8333,0.9789 C0.8833,0.9909 0.9722,0.9965 1.0000,1.0000",
      verdict: "M0,0 C0.14,0.6 0.3,1.035 0.52,1.03 C0.74,1.025 0.88,1 1,1"
    };
    function curve(d) {
      var n = d.replace(/[MC]/g, " ").trim().split(/[\s,]+/).map(Number);
      var segs = [], x0 = n[0], y0 = n[1];
      for (var i = 2; i + 5 < n.length; i += 6) {
        segs.push([x0, y0, n[i], n[i + 1], n[i + 2], n[i + 3], n[i + 4], n[i + 5]]);
        x0 = n[i + 4]; y0 = n[i + 5];
      }
      function bz(p0, p1, p2, p3, t) { var u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3; }
      return function (x) {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        for (var k = 0; k < segs.length; k++) {
          var g = segs[k];
          if (x <= g[6] || k === segs.length - 1) {
            var lo = 0, hi = 1, t = 0.5;
            for (var j = 0; j < 30; j++) { t = (lo + hi) / 2; if (bz(g[0], g[2], g[4], g[6], t) < x) lo = t; else hi = t; }
            return bz(g[1], g[3], g[5], g[7], t);
          }
        }
        return 1;
      };
    }
    function easing(fn) {
      var st = [];
      for (var i = 0; i <= 40; i++) { var x = i / 40; st.push(fn(x).toFixed(4) + " " + (x * 100).toFixed(1) + "%"); }
      return "linear(" + st.join(", ") + ")";
    }
    try {
      var settle = curve(PATHS.settle);
      var canLinear = window.CSS && CSS.supports && CSS.supports("animation-timing-function", "linear(0, 1)");
      var drawEase = canLinear ? easing(curve(PATHS.draw)) : "cubic-bezier(0.4, 0, 0.2, 1)";
      var verdictEase = canLinear ? easing(curve(PATHS.verdict)) : "cubic-bezier(0.2, 0.8, 0.2, 1)";
      var figs = Array.prototype.slice.call(night.querySelectorAll(".how-night_n"));
      var mark = night.querySelector(".how-night_mark");
      var kept = night.querySelector(".how-night_cell.is-kept .how-night_n");
      var tag = night.querySelector(".how-night_tag");
      function fmt(el, v) {
        var places = +(el.getAttribute("data-places") || 0);
        return (el.getAttribute("data-prefix") || "") + v.toFixed(places);
      }
      
      figs.forEach(function (el) { el.textContent = fmt(el, 0); });
      night.classList.add("is-armed");
      var played = false;
      function play() {
        if (played) return;
        played = true;
        var STAGGER = [0, 60, 105, 139];
        var t0 = performance.now();
        figs.forEach(function (el, i) {
          var to = +el.getAttribute("data-to"), delay = STAGGER[Math.min(i, 3)];
          (function frame(now) {
            var p = Math.max(0, Math.min(1, (now - t0 - delay) / 520));
            el.textContent = fmt(el, to * settle(p));
            if (p < 1) window.requestAnimationFrame(frame);
            else el.textContent = fmt(el, to);
          })(t0);
        });
        window.setTimeout(function () {
          night.classList.remove("is-armed");
          if (mark && mark.animate) {
            mark.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 280, easing: drawEase, fill: "backwards" });
          }
          if (kept && kept.animate) {
            kept.animate([{ transform: "none", color: (getComputedStyle(night).getPropertyValue("--ink") || "").trim() || "#141312" }, { transform: "translateY(-2px)", color: getComputedStyle(kept).color }],
              { duration: 420, delay: 200, easing: verdictEase, fill: "backwards" });
          }
          if (tag && tag.animate) {
            tag.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 208, delay: 280, easing: "linear", fill: "backwards" });
          }
        }, 520 + 139);
      }
      new IntersectionObserver(function (entries, io) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { io.disconnect(); play(); }
        });
      }, { threshold: 0.6 }).observe(night);
    } catch (e) {
      night.classList.remove("is-armed");
      Array.prototype.forEach.call(night.querySelectorAll(".how-night_n"), function (el) {
        el.textContent = (el.getAttribute("data-prefix") || "") + (+el.getAttribute("data-to")).toFixed(+(el.getAttribute("data-places") || 0));
      });
    }
  })();
})();
