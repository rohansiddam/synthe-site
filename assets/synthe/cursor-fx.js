/* cursor-fx.js — labeled custom cursor for Synthe's editor-equivalent
   surfaces. Companion to cursor-fx.css; see CURSOR-FX.md.

   How it works:
   - Any element with class .fx-cursor-zone is a zone. While the pointer
     is over a zone, the native cursor is hidden (CSS, .fx-cursor-on)
     and a small dark pill follows the pointer: a cursor-arrow glyph
     plus a label taken from the zone's data-cursor-label attribute.
     This adapts Spline's editor-graphic pattern (native cursor hidden
     over the graphic, a labeled arrow chip does the pointing) to a
     surface the user actually drives.
   - Form fields inside a zone (input, textarea, select, contenteditable)
     are exempt: they keep their native text cursor.
   - Fully off on touch (pointer: coarse) and under
     prefers-reduced-motion; the CSS-only crosshair fallback then
     applies. Vanilla, zero dependencies, zero external requests. */
(function () {
  'use strict';

  var POS_LERP = 0.45;        // position follow, per frame (~60fps):
                              // closes ~83% of the gap in 3 frames,
                              // settles in ~120ms. Fast, no trailing.
  var SCALE_STIFFNESS = 0.2;  // scale spring toward its target
  var SCALE_DAMPING = 0.68;   // under-damped: slight overshoot on entry
  var PRESS_SCALE = 0.92;     // mousedown squash
  var ENTER_SCALE = 0.6;      // scale the pill grows in from

  var finePointer = window.matchMedia('(pointer: fine)');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var el = null;          // the follower pill element
  var labelEl = null;     // its label span
  var enabled = false;    // media conditions currently allow the effect
  var active = false;     // pointer is currently over a zone
  var pressing = false;   // mouse button held while active
  var rafId = 0;          // rAF handle; 0 = loop stopped

  var tx = 0, ty = 0;     // pointer target (client coords)
  var x = 0, y = 0;       // pill position (lerped)
  var scale = ENTER_SCALE, scaleV = 0, targetScale = 0;
  var opacity = 0, targetOpacity = 0;
  var currentLabel = null;

  var FIELD_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

  function build() {
    el = document.createElement('div');
    el.className = 'fx-cursor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<svg class="fx-cursor-arrow" width="10" height="10" viewBox="0 0 16 16" aria-hidden="true">' +
      '<path d="M2 1l12 6-5.5 1.6L6 14z" fill="currentColor"/></svg>' +
      '<span class="fx-cursor-label"></span>';
    labelEl = el.querySelector('.fx-cursor-label');
    document.body.appendChild(el);
  }

  function render() {
    el.style.transform =
      'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)' +
      ' translate(-50%,-160%) scale(' + scale.toFixed(3) + ')';
    el.style.opacity = opacity.toFixed(3);
    el.style.visibility = opacity > 0.02 ? 'visible' : 'hidden';
  }

  function tick() {
    x += (tx - x) * POS_LERP;
    y += (ty - y) * POS_LERP;
    scaleV += (targetScale - scale) * SCALE_STIFFNESS;
    scaleV *= SCALE_DAMPING;
    scale += scaleV;
    opacity += (targetOpacity - opacity) * 0.3;
    render();
    var settled =
      Math.abs(tx - x) < 0.1 && Math.abs(ty - y) < 0.1 &&
      Math.abs(targetScale - scale) < 0.002 && Math.abs(scaleV) < 0.002 &&
      Math.abs(targetOpacity - opacity) < 0.01;
    if (settled && !active) {
      rafId = 0;            // fully gone: stop the loop
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  function kick() {
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function setLabel(text) {
    if (text === currentLabel) return;
    currentLabel = text;
    labelEl.textContent = text || '';
  }

  function activate(zone, snap) {
    setLabel(zone.getAttribute('data-cursor-label'));
    if (!active || snap) {
      x = tx; y = ty;                       // never fly in from a corner
      if (!active) { scale = ENTER_SCALE; scaleV = 0; }
    }
    active = true;
    targetScale = pressing ? PRESS_SCALE : 1;
    targetOpacity = 1;
    kick();
  }

  function deactivate() {
    if (!active) return;
    active = false;
    targetScale = 0;
    targetOpacity = 0;
    kick();
  }

  function zoneFromEvent(e) {
    var t = e.target;
    if (!t || !t.closest) return null;
    if (t.closest(FIELD_SELECTOR)) return null;  // text fields keep I-beam
    return t.closest('.fx-cursor-zone');
  }

  function onPointerMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    tx = e.clientX; ty = e.clientY;
    var zone = zoneFromEvent(e);
    if (zone) activate(zone, false);
    else deactivate();
  }

  function onPointerDown(e) {
    if (!active) return;
    pressing = true;
    targetScale = PRESS_SCALE;
    kick();
  }

  function onPointerUp() {
    pressing = false;
    if (active) { targetScale = 1; kick(); }
  }

  function onLeaveWindow(e) {
    if (!e.relatedTarget) deactivate();     // pointer left the document
  }

  function enable() {
    if (enabled) return;
    enabled = true;
    if (!el) build();
    document.documentElement.classList.add('fx-cursor-on');
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    document.addEventListener('pointerout', onLeaveWindow);
    window.addEventListener('blur', deactivate);
    window.addEventListener('scroll', deactivate, { passive: true });
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    deactivate();
    document.documentElement.classList.remove('fx-cursor-on');
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    document.removeEventListener('pointerout', onLeaveWindow);
    window.removeEventListener('blur', deactivate);
    window.removeEventListener('scroll', deactivate);
  }

  function evaluate() {
    if (finePointer.matches && !reducedMotion.matches) enable();
    else disable();
  }

  if (typeof finePointer.addEventListener === 'function') {
    finePointer.addEventListener('change', evaluate);
    reducedMotion.addEventListener('change', evaluate);
  }
  evaluate();
})();
