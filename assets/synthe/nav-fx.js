/* Synthe nav indicator (founder-fixes lane 5).
 *
 * A notch marker on the nav bar's bottom edge that tracks the hovered or
 * focused top-level item and SLIDES between items on the base build's own spring,
 * measured from the base build's nav.js (the old nav script):
 *
 *   spring:  a = w^2 * (target - x) - 2 * w * v,  w = 19 rad/s, zeta = 1
 *            (critically damped), integrated in 1/120 s substeps,
 *            settle when |target - x| < 0.05 px and |v| < 0.5 px/s.
 *   show:    0.26 s, hide: 0.20 s, GSAP "sine.out" easing
 *            (the base build's --nav-corner-on tween: D6 = 0.26, O6 = 0.20, N6).
 *   notch:   25 px wide x 9 px high (--nav-notch-w / --nav-notch-h),
 *            positioned from the item's measured centre, exactly as
 *            the base build's NK() measures it (centre of item minus left edge
 *            of the notch's element).
 *
 * First appearance snaps to the item (the base build snaps when there is no prior
 * state); reduced-motion snaps and skips the fade. The marker is driven
 * by continuous spring integration, never by a CSS transition, so it
 * cannot jump the way a class/transition toggle does.
 *
 * Self-contained: it creates its own marker element inside .nav__layout
 * and only observes pointer/focus. It never opens or closes a menu;
 * the base build's nav.js keeps that job. It also keeps the base build's --nav-corner-x
 * custom property updated on .nav__layout, so if the integrator ever
 * re-enables the base build's built-in notch cut (fixes.css sets
 * --nav-corner-on: 0 on the layout to retire the static one), the
 * built-in notch tracks with the same values.
 */
(function () {
  var layout = document.querySelector(".nav__layout");
  if (!layout) return;
  var container = layout.closest(".nav__container") || layout.parentElement;
  if (!container) return;

  var items = Array.prototype.slice.call(
    layout.querySelectorAll(
      ".nav__list--main .nav__list--link, .nav__layout--end a"
    )
  );
  if (!items.length) return;

  var NOTCH_W = 25;
  var marker = document.createElement("div");
  marker.className = "synthe-nav-notch";
  marker.setAttribute("aria-hidden", "true");
  marker.innerHTML =
    '<svg width="25" height="9" viewBox="0 0 25 9" focusable="false">' +
    '<path d="M0 0 H25 C25 4.5 19.5 6.2 15.8 7.7 C14 8.5 11 8.5 9.2 7.7 ' +
    'C5.5 6.2 0 4.5 0 0 Z" fill="#fff"/>' +
    '<path d="M0 0 C0 4.5 5.5 6.2 9.2 7.7 C11 8.5 14 8.5 15.8 7.7 ' +
    'C19.5 6.2 25 4.5 25 0" fill="none" ' +
    'stroke="rgba(14,13,12,0.16)" stroke-width="1"/></svg>';
  layout.appendChild(marker);

  var OMEGA = 19; // The base build D7
  var SUBSTEP = 1 / 120; // The base build's integrator substep
  var SETTLE_X = 0.05; // The base build's settle thresholds
  var SETTLE_V = 0.5;
  var FADE_IN = 260; // The base build D6 = 0.26 s
  var FADE_OUT = 200; // The base build O6 = 0.20 s

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  var x = 0;
  var v = 0;
  var target = 0;
  var hasState = false;
  var currentItem = null;

  var opacity = 0;
  var fadeFrom = 0;
  var fadeTo = 0;
  var fadeStart = 0;
  var fadeDur = 0;

  var rafId = 0;
  var lastTime = 0;

  function sineOut(t) {
    return Math.sin(t * Math.PI * 0.5); // GSAP "sine.out"
  }

  function centreOf(item) {
    var r = item.getBoundingClientRect();
    if (!r.width) return null; // hidden (mobile layout): do not track
    var lr = layout.getBoundingClientRect();
    return r.left + r.width / 2 - lr.left;
  }

  function render() {
    marker.style.transform = "translateX(" + (x - NOTCH_W / 2) + "px)";
    marker.style.opacity = opacity.toFixed(3);
    layout.style.setProperty("--nav-corner-x", x + "px");
    layout.style.setProperty("--nav-corner-on", opacity.toFixed(3));
  }

  function springSettled() {
    return Math.abs(target - x) < SETTLE_X && Math.abs(v) < SETTLE_V;
  }

  function fadeDone(now) {
    return fadeDur <= 0 || now - fadeStart >= fadeDur;
  }

  function tick(now) {
    var dt = Math.min((now - lastTime) / 1000, 0.064); // The base build clamps to 64 ms
    lastTime = now;

    if (!springSettled() && dt > 0) {
      var remaining = dt;
      while (remaining > 0) {
        var h = Math.min(remaining, SUBSTEP);
        var a = OMEGA * OMEGA * (target - x) - 2 * OMEGA * v;
        v += a * h;
        x += v * h;
        remaining -= h;
      }
      if (springSettled()) {
        x = target;
        v = 0;
      }
    }

    if (!fadeDone(now)) {
      var p = Math.min((now - fadeStart) / fadeDur, 1);
      opacity = fadeFrom + (fadeTo - fadeFrom) * sineOut(p);
    } else {
      opacity = fadeTo;
    }

    render();

    if (!springSettled() || !fadeDone(now)) {
      rafId = window.requestAnimationFrame(tick);
    } else {
      rafId = 0;
    }
  }

  function startLoop() {
    if (rafId) return;
    lastTime = window.performance.now();
    rafId = window.requestAnimationFrame(tick);
  }

  function startFade(to, dur) {
    fadeFrom = opacity;
    fadeTo = to;
    fadeDur = reduceMotion.matches ? 0 : dur;
    fadeStart = window.performance.now();
    if (fadeDur <= 0) opacity = to;
    render();
    startLoop();
  }

  function show(item) {
    var c = centreOf(item);
    if (c === null) return;
    currentItem = item;
    if (!hasState || reduceMotion.matches) {
      x = c;
      v = 0;
      target = c;
      hasState = true;
      render();
    } else {
      target = c;
      startLoop();
    }
    if (fadeTo !== 1) startFade(1, FADE_IN);
  }

  function hide() {
    currentItem = null;
    if (fadeTo !== 0) startFade(0, FADE_OUT);
  }

  items.forEach(function (item) {
    item.addEventListener("pointerenter", function (e) {
      if (e.pointerType === "touch") return;
      show(item);
    });
    item.addEventListener("focusin", function () {
      show(item);
    });
  });

  container.addEventListener("pointerleave", hide);
  container.addEventListener("focusout", function (e) {
    if (!container.contains(e.relatedTarget)) hide();
  });

  window.addEventListener("resize", function () {
    if (currentItem && fadeTo === 1) {
      var c = centreOf(currentItem);
      if (c !== null) {
        target = c;
        if (reduceMotion.matches) {
          x = c;
          v = 0;
          render();
        } else {
          startLoop();
        }
      }
    }
  });
})();
