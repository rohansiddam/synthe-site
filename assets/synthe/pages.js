
(function () {
  "use strict";

  
  document.querySelectorAll(".pg-copybtn[data-copy]").forEach(function (btn) {
    var label = btn.textContent;
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      function done() {
        btn.textContent = "Copied";
        window.setTimeout(function () { btn.textContent = label; }, 1600);
      }
      
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try { if (document.execCommand("copy")) done(); } catch (e) {}
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else {
        fallback();
      }
    });
  });

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  
  (function () {
    var card = document.getElementById("partner-box");
    if (!card || reduce || !("MutationObserver" in window)) return;
    var settle = getComputedStyle(document.documentElement).getPropertyValue("--pg-settle").trim() || "cubic-bezier(0.16, 1, 0.3, 1)";
    var lastH = card.getBoundingClientRect().height;
    var busy = false;
    var endTimer = null;
    function finish() {
      card.style.transition = "";
      card.style.height = "";
      card.classList.remove("is-sizing");
      busy = false;
      lastH = card.getBoundingClientRect().height;
    }
    function resize() {
      var from = busy ? card.getBoundingClientRect().height : lastH;
      card.style.transition = "none";
      card.style.height = "";
      var to = card.getBoundingClientRect().height;
      if (Math.abs(to - from) < 1) { finish(); return; }
      busy = true;
      card.classList.add("is-sizing");
      card.style.height = from + "px";
      void card.offsetHeight;
      card.style.transition = "height 520ms " + settle;
      card.style.height = to + "px";
      window.clearTimeout(endTimer);
      endTimer = window.setTimeout(finish, 560);
    }
    var queued = false;
    new MutationObserver(function () {
      if (queued) return;
      queued = true;
      
      Promise.resolve().then(function () { queued = false; resize(); });
    }).observe(card, { subtree: true, attributes: true, attributeFilter: ["hidden"] });
    window.addEventListener("resize", function () { if (!busy) lastH = card.getBoundingClientRect().height; });
  })();

  
  (function () {
    if (reduce || !window.requestAnimationFrame) return;
    var RAILS = [
      { box: ".how-loop .fl3-stepper",
        targets: [[".fl3-step.is-active .fl3-step_name", 6], [".fl3-step.is-active .fl3-step_node", 8]] },
      { box: ".pt-rail-wrap",
        targets: [[".pt-rail-item.is-current .pt-rail-label", 0]], line: ".pt-rail-track" }
    ];
    
    var DRAW = "M0,0 C0.0222,0.1660 0.0889,0.1762 0.1333,0.1941 C0.1778,0.2121 0.2222,0.2201 0.2667,0.2680 C0.3111,0.3158 0.3500,0.3857 0.4000,0.4810 C0.4500,0.5763 0.5167,0.7651 0.5667,0.8397 C0.6167,0.9143 0.6556,0.9051 0.7000,0.9283 C0.7444,0.9515 0.7833,0.9670 0.8333,0.9789 C0.8833,0.9909 0.9722,0.9965 1,1";
    function curve(d) {
      var n = d.replace(/[MC]/g, " ").trim().split(/[\s,]+/).map(Number);
      var segs = [], x0 = n[0], y0 = n[1];
      for (var i = 2; i + 5 < n.length; i += 6) {
        segs.push([x0, y0, n[i], n[i + 1], n[i + 2], n[i + 3], n[i + 4], n[i + 5]]);
        x0 = n[i + 4]; y0 = n[i + 5];
      }
      function bz(a, b, c, e, t) { var u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * e; }
      return function (x) {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        for (var k = 0; k < segs.length; k++) {
          var g = segs[k];
          if (x <= g[6] || k === segs.length - 1) {
            var lo = 0, hi = 1, t = 0.5;
            for (var j = 0; j < 24; j++) { t = (lo + hi) / 2; if (bz(g[0], g[2], g[4], g[6], t) < x) lo = t; else hi = t; }
            return bz(g[1], g[3], g[5], g[7], t);
          }
        }
        return 1;
      };
    }
    var draw = curve(DRAW);
    function spring(x) { return { x: x, v: 0, t: x }; }
    
    function stepSpring(s, dt) {
      var a = -170 * (s.x - s.t) - 26 * s.v;
      s.v += a * dt;
      s.x += s.v * dt;
      if (Math.abs(s.x - s.t) < 0.05 && Math.abs(s.v) < 0.5) { s.x = s.t; s.v = 0; return false; }
      return true;
    }
    var dpr = window.devicePixelRatio || 1;

    RAILS.forEach(function (cfg) {
      var box = document.querySelector(cfg.box);
      if (!box) return;
      var mark = document.createElement("span");
      try {
        mark.className = "pg-mark";
        mark.setAttribute("aria-hidden", "true");
        var X = spring(0), W = spring(0), Y = spring(0);
        var raf = 0, last = 0, drawn = false, drawAt = 0;
        var measure = function () {
          var br = box.getBoundingClientRect();
          for (var i = 0; i < cfg.targets.length; i++) {
            var el = box.querySelector(cfg.targets[i][0]);
            if (!el) continue;
            var r = el.getBoundingClientRect();
            if (r.width < 1) continue;
            var y = r.bottom - br.top + cfg.targets[i][1];
            if (cfg.line) {
              var ln = box.querySelector(cfg.line);
              if (ln) { var lr = ln.getBoundingClientRect(); y = lr.top - br.top + lr.height / 2 - 1; }
            }
            return { x: r.left - br.left, w: r.width, y: y };
          }
          return null;
        };
        var paint = function () {
          var y = Math.round(Y.x * dpr) / dpr;
          mark.style.transform = "translate3d(" + X.x.toFixed(2) + "px," + y + "px,0) scaleX(" + Math.max(0, W.x).toFixed(2) + ")";
        };
        var frame = function (now) {
          var dt = Math.min(0.032, (now - (last || now)) / 1000);
          last = now;
          var moving = false;
          if (drawAt) {
            if (drawAt < 0) drawAt = now;
            var p = Math.min(1, (now - drawAt) / 280);
            W.x = W.t * draw(p); W.v = 0;
            if (p < 1) moving = true; else drawAt = 0;
          } else if (stepSpring(W, dt)) moving = true;
          if (stepSpring(X, dt)) moving = true;
          if (stepSpring(Y, dt)) moving = true;
          paint();
          if (moving) raf = window.requestAnimationFrame(frame);
          else { raf = 0; last = 0; }
        };
        var kick = function () { if (!raf) raf = window.requestAnimationFrame(frame); };
        var update = function (jump) {
          var m = measure();
          if (!m) { mark.style.opacity = "0"; return; }
          mark.style.opacity = "";
          X.t = m.x; W.t = m.w; Y.t = m.y;
          if (jump || !drawn) {
            X.x = m.x; X.v = 0; Y.x = m.y; Y.v = 0;
            if (drawn && !drawAt) { W.x = m.w; W.v = 0; }
            paint();
            return;
          }
          kick();
        };
        var startDraw = function () {
          if (drawn) return;
          drawn = true;
          update(true);
          drawAt = -1;
          kick();
        };
        box.appendChild(mark);
        paint();
        box.classList.add("has-mark");
        update(true);
        var queued = false;
        new MutationObserver(function () {
          if (queued) return;
          queued = true;
          window.requestAnimationFrame(function () { queued = false; update(false); });
        }).observe(box, { subtree: true, attributes: true, attributeFilter: ["class"] });
        window.addEventListener("resize", function () { update(true); });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { update(true); });
        if ("IntersectionObserver" in window) {
          var io = new IntersectionObserver(function (entries) {
            if (entries.some(function (en) { return en.isIntersecting; })) { io.disconnect(); startDraw(); }
          }, { threshold: 0.5 });
          io.observe(box);
        } else {
          startDraw();
        }
      } catch (e) {
        box.classList.remove("has-mark");
        if (mark.parentNode) mark.parentNode.removeChild(mark);
      }
    });
  })();

  
  if (reduce || !("IntersectionObserver" in window)) return;
  var root = document.documentElement;
  var STAGGER = [0, 60, 105, 139, 164, 182, 196];
  function disarm() {
    root.classList.remove("pg-reveal");
    document.querySelectorAll(".pg-rv").forEach(function (el) {
      el.classList.remove("pg-rv", "is-in");
      el.style.removeProperty("--pg-rv-delay");
    });
  }
  try {
    var groups = [];
    document.querySelectorAll("[data-pg-reveal]").forEach(function (box) {
      var sel = box.getAttribute("data-pg-reveal") || ":scope > *";
      var items = Array.prototype.slice.call(box.querySelectorAll(sel));
      if (items.length) groups.push(items);
    });
    var tagged = [];
    groups.forEach(function (items) {
      items.forEach(function (el, i) {
        el.classList.add("pg-rv");
        el.style.setProperty("--pg-rv-delay", STAGGER[Math.min(i, STAGGER.length - 1)] + "ms");
        tagged.push(el);
      });
    });
    if (!tagged.length) return;
    var pending = new Set(tagged);
    function reveal(el) {
      if (!pending.has(el)) return;
      pending.delete(el);
      io.unobserve(el);
      el.classList.add("is-in");
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) reveal(en.target); });
    }, { threshold: 0.12 });
    
    var queued = false;
    function sweep() {
      queued = false;
      pending.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top < window.innerHeight * 0.95) reveal(el);
      });
    }
    window.addEventListener("scroll", function () {
      if (!queued) { queued = true; window.requestAnimationFrame(sweep); }
    }, { passive: true });
    root.classList.add("pg-reveal");
    tagged.forEach(function (el) { io.observe(el); });
    window.requestAnimationFrame(function () { window.requestAnimationFrame(sweep); });
  } catch (e) {
    disarm();
  }
})();
