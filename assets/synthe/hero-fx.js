/* hero-fx.js — behaviour for the Spline-style Synthe hero headline.
   Companion to hero-fx.css. Vanilla JS, zero dependencies, zero requests.

   Two jobs only (the pops themselves are pure CSS :hover / :focus-within,
   exactly as Spline ships them):
   1. Pop centring: on pointer-enter / focus of a .hfx-who word, measure the
      word and write --dx so the pop centres on the word, shifted only to
      keep 16px clearance from the viewport edges (Spline's formula).
   2. The pick word's self-typing loop: first cycle 3.5s after mount, then
      every 7.0s. Box out, 450ms beat, type at 80ms/char, box back 500ms
      after the last character. Word list from data-hfx-words (comma
      separated); the sizer reserves the longest word's width, so rotating
      words later costs no layout change.
   Plus a dimming fallback: .hfx-spot / data-hfx-on mirror the :has() rules
   in the CSS for engines without :has() support.

   prefers-reduced-motion: the typing loop never runs (word rests selected,
   as shipped in the markup) and nothing here animates. */
(function () {
  'use strict';

  var h1 = document.querySelector('.hfx-h1');
  if (!h1) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- pop centring + dimming fallback ---------- */

  function centrePop(who) {
    var pop = who.querySelector('.hfx-pop');
    if (!pop) return;
    var rect = who.getBoundingClientRect();
    var popW = pop.offsetWidth;
    if (!popW) return;
    var idealLeft = rect.left + rect.width / 2 - popW / 2;
    var vw = document.documentElement.clientWidth;
    var dx = 0;
    if (idealLeft < 16) dx = 16 - idealLeft;
    else if (idealLeft + popW > vw - 16) dx = (vw - 16) - (idealLeft + popW);
    who.style.setProperty('--dx', dx.toFixed(2) + 'px');
  }

  var activeWho = null;
  function setActive(who) {
    if (activeWho === who) return;
    clearActive();
    activeWho = who;
    if (who) {
      centrePop(who);
      who.setAttribute('data-hfx-on', 'true');
      h1.classList.add('hfx-spot');
    }
  }
  function clearActive() {
    if (activeWho) activeWho.removeAttribute('data-hfx-on');
    activeWho = null;
    h1.classList.remove('hfx-spot');
  }

  var whos = h1.querySelectorAll('.hfx-who');
  Array.prototype.forEach.call(whos, function (who) {
    who.addEventListener('pointerenter', function () { setActive(who); });
    who.addEventListener('pointerleave', function () {
      if (activeWho === who) clearActive();
    });
    who.addEventListener('focus', function () { setActive(who); });
    who.addEventListener('blur', function () {
      if (activeWho === who) clearActive();
    });
    /* the pop is measurable while hidden (visibility, not display), so a
       resize while a pop is open can re-centre it */
    centrePop(who);
  });
  window.addEventListener('resize', function () {
    if (activeWho) centrePop(activeWho);
  });
  /* measure again once the web fonts have settled the words' widths */
  function recentreAll() { Array.prototype.forEach.call(whos, centrePop); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(recentreAll);
  window.addEventListener('load', recentreAll);

  /* ---------- the pick word: self-typing loop ---------- */

  var pick = h1.querySelector('[data-hfx-pick]');
  if (!pick) return;

  var textEl = pick.querySelector('.hfx-pick-text');
  var sizer = pick.querySelector('.hfx-pick-sizer');
  var words = (pick.getAttribute('data-hfx-words') || 'prompt')
    .split(',')
    .map(function (w) { return w.trim(); })
    .filter(function (w) { return w.length > 0; });
  if (!words.length || !textEl) return;

  /* reserve the longest word's width in the sizer: the headline never
     reflows, whichever word the rotation lands on */
  var longest = words.reduce(function (a, b) { return b.length > a.length ? b : a; }, '');
  if (sizer) {
    var sizerText = sizer.querySelector('.hfx-sizer-text');
    if (sizerText) sizerText.textContent = longest;
    else sizer.textContent = longest;
  }

  var wordIndex = 0;
  var timers = [];

  function later(fn, ms) { timers.push(window.setTimeout(fn, ms)); }
  function clearTimers() {
    timers.forEach(function (t) { window.clearTimeout(t); });
    timers = [];
  }
  function rest() {
    clearTimers();
    pick.setAttribute('data-state', 'sel');
    textEl.textContent = words[wordIndex % words.length];
  }

  function cycle() {
    if (reduceMotion.matches) { rest(); return; }
    wordIndex += 1;
    var word = words[wordIndex % words.length];
    pick.setAttribute('data-state', 'typing');
    textEl.textContent = '';
    later(function () {
      var i = 0;
      (function typeChar() {
        if (reduceMotion.matches) { rest(); return; }
        i += 1;
        textEl.textContent = word.slice(0, i);
        if (i < word.length) {
          later(typeChar, 80);
        } else {
          later(function () { pick.setAttribute('data-state', 'sel'); }, 500);
        }
      })();
    }, 450);
    later(cycle, 7000);
  }

  /* rest state is what the markup ships; the loop only starts if motion
     is allowed, 3.5s after mount, per Spline's coded constants */
  if (!reduceMotion.matches) later(cycle, 3500);
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener('change', function () {
      if (reduceMotion.matches) rest();
      else later(cycle, 3500);
    });
  }
})();
