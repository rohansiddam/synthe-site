/* The Climb: hero animation driver.
   Draws the sample run's two pass-rate lines (checks, held-out) in the
   hero, pops each round's node / label / Mark-state glyph in as the
   line reaches it, then rests with a soft pulse on the merged point.
   Vanilla JS, no libraries, no requests.
   No-JS and prefers-reduced-motion both get the completed chart:
   the markup is authored in its final state and this script is the
   only thing that ever hides or offsets anything. */
(function () {
  var root = document.querySelector(".hc-hero");
  if (!root) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return; // static completed line; CSS also kills the pulse

  var DRAW = [
    { sel: ".hc-line-checks", delay: 0.15, dur: 1.7, ease: easeInOutCubic },
    { sel: ".hc-line-held", delay: 0.55, dur: 1.3, ease: easeOutCubic },
  ];
  var END = 2.3; // last data-t is 2.0; pulse starts as the dust settles

  var lines = [];
  root.querySelectorAll(".hc-svg").forEach(function (svg) {
    DRAW.forEach(function (cfg) {
      var p = svg.querySelector(cfg.sel);
      if (!p) return;
      var len = 0;
      try {
        len = p.getTotalLength();
      } catch (e) {
        len = 0;
      }
      if (!len) len = 1000;
      p.style.strokeDasharray = String(len);
      p.style.strokeDashoffset = String(len);
      lines.push({ p: p, len: len, cfg: cfg });
    });
  });

  var timed = Array.prototype.slice.call(root.querySelectorAll("[data-t]"));
  root.classList.add("hc-anim");

  var t0 = null;
  function frame(now) {
    if (t0 === null) t0 = now;
    var t = (now - t0) / 1000;

    lines.forEach(function (o) {
      var k = (t - o.cfg.delay) / o.cfg.dur;
      if (k < 0) k = 0;
      if (k > 1) k = 1;
      o.p.style.strokeDashoffset = String(o.len * (1 - o.cfg.ease(k)));
    });

    timed.forEach(function (el) {
      if (!el.classList.contains("on") && t >= parseFloat(el.getAttribute("data-t"))) {
        el.classList.add("on");
      }
    });

    if (t >= END) {
      root.classList.add("hc-live");
      return;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }
})();
