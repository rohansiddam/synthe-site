/* ================================================================
   Shift section behaviour.
   A faithful vanilla port of the state machine measured in
   Spline's "One scene." export section (see SHIFT-SECTION.md):
   - the active row advances itself every 6000ms (the row's rule
     fills linearly; the fill's animationend drives the advance),
     but only while the section is on screen and the user is not
     hovering it, not focusing inside it, and has not asked for
     reduced motion;
   - hovering (mouse) or focusing a row makes it active at once;
     tapping a row selects it;
   - hovering (mouse) or focusing the stage opens it: the staged
     artifact slides aside and the setup prompt types itself in
     (60ms delay, then 5ms per character; on close the text clears
     after 320ms; reduced motion shows it whole, instantly);
   - on touch, tapping the stage toggles it open.
   Zero dependencies, zero external requests.
   ================================================================ */
(function () {
  'use strict';

  var PROMPT = 'Set up Synthe in this repo. Run npx synthe@latest guide and follow it.';
  var CYCLE_MS = 6000; /* carried by the CSS fill animation */
  var TYPE_DELAY_MS = 60;
  var TYPE_CHAR_MS = 5;
  var CLEAR_AFTER_CLOSE_MS = 320;
  var COPIED_MS = 1600;

  var section = document.querySelector('[data-shift]');
  if (!section) return;

  var stage = section.querySelector('[data-shift-stage]');
  var panel = section.querySelector('[data-shift-panel]');
  var typedEl = section.querySelector('[data-shift-typed]');
  var caretEl = section.querySelector('[data-shift-caret]');
  var copyBtn = section.querySelector('[data-shift-copy]');
  var statusEl = section.querySelector('[data-shift-status]');
  var winTitle = section.querySelector('[data-shift-win-title]');
  var items = Array.prototype.slice.call(section.querySelectorAll('[data-shift-item]'));
  var surfaces = {};
  Array.prototype.forEach.call(section.querySelectorAll('[data-shift-surface]'), function (el) {
    surfaces[el.getAttribute('data-shift-surface')] = el;
  });
  if (!stage || !items.length) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var state = {
    active: 0,
    open: false,
    hovering: false,     /* mouse pointer over the section */
    focused: false,      /* focus anywhere inside the section */
    inView: false,
    lastPointer: 'mouse'
  };

  /* ---------- progress fill / auto-advance ---------- */

  function fillOf(i) {
    return items[i].querySelector('.sh2-fill');
  }

  function running() {
    return state.inView && !state.hovering && !state.focused && !reduced.matches;
  }

  /* Restart the active row's 6s fill if conditions allow, exactly
     like the reference: any interruption resets the bar. */
  function armProgress() {
    items.forEach(function (_, i) {
      var f = fillOf(i);
      if (f) f.classList.remove('is-filling');
    });
    if (!running()) return;
    var fill = fillOf(state.active);
    if (!fill) return;
    void fill.offsetWidth; /* restart the animation from 0 */
    fill.classList.add('is-filling');
  }

  items.forEach(function (_, i) {
    var f = fillOf(i);
    if (f) f.addEventListener('animationend', function () {
      if (i === state.active && running()) {
        setActive((state.active + 1) % items.length);
      }
    });
  });

  /* ---------- row activation / artifact swap ---------- */

  var hideTimer = 0;

  function setActive(i) {
    if (i === state.active && items[i].classList.contains('is-on')) {
      armProgress();
      return;
    }
    var prev = surfaces[items[state.active].getAttribute('data-target')];
    state.active = i;
    items.forEach(function (item, j) {
      var on = j === i;
      item.classList.toggle('is-on', on);
      item.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var key = items[i].getAttribute('data-target');
    var next = surfaces[key];
    if (prev && prev !== next) {
      /* outgoing blurs to 4px and fades via its base state */
      prev.classList.remove('is-active');
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(function () {
        prev.setAttribute('aria-hidden', 'true');
      }, reduced.matches ? 0 : 460);
    }
    if (next) {
      next.setAttribute('aria-hidden', 'false');
      void next.offsetWidth;
      next.classList.add('is-active');
    }
    if (winTitle) winTitle.textContent = items[i].getAttribute('data-win-title') || '';
    stage.setAttribute('aria-label', items[i].getAttribute('data-name') + ': show the setup prompt');
    armProgress();
  }

  items.forEach(function (item, i) {
    item.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'mouse') setActive(i);
    });
    item.addEventListener('focus', function () { setActive(i); });
    item.addEventListener('click', function () { setActive(i); });
  });

  /* ---------- stage open / close + prompt typing ---------- */

  var typeTimer = 0;
  var clearTimer = 0;

  function stopTyping() {
    window.clearTimeout(typeTimer);
  }

  function startTyping() {
    stopTyping();
    window.clearTimeout(clearTimer);
    if (!typedEl) return;
    if (reduced.matches) {
      typedEl.textContent = PROMPT;
      if (caretEl) caretEl.classList.add('is-live');
      return;
    }
    typedEl.textContent = '';
    if (caretEl) caretEl.classList.add('is-live');
    var n = 0;
    var step = function () {
      n += 1;
      typedEl.textContent = PROMPT.slice(0, n);
      if (n < PROMPT.length) typeTimer = window.setTimeout(step, TYPE_CHAR_MS);
    };
    typeTimer = window.setTimeout(step, TYPE_DELAY_MS);
  }

  function scheduleClear() {
    stopTyping();
    window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(function () {
      if (typedEl) typedEl.textContent = '';
      if (caretEl) caretEl.classList.remove('is-live');
    }, reduced.matches ? 0 : CLEAR_AFTER_CLOSE_MS);
  }

  function setOpen(open) {
    if (open === state.open) return;
    state.open = open;
    stage.classList.toggle('is-open', open);
    if (panel) panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (copyBtn) copyBtn.tabIndex = open ? 0 : -1;
    if (open) startTyping(); else scheduleClear();
  }

  stage.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'mouse') setOpen(true);
  });
  stage.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse') setOpen(false);
  });
  stage.addEventListener('focusin', function () {
    /* A touch tap focuses the stage before its click lands; the
       click is the toggle there, so focus must not pre-open it. */
    if (state.lastPointer !== 'touch') setOpen(true);
  });
  stage.addEventListener('focusout', function (e) {
    if (!stage.contains(e.relatedTarget)) setOpen(false);
  });
  stage.addEventListener('click', function () {
    if (state.lastPointer !== 'mouse') setOpen(!state.open);
  });

  /* ---------- section-level pause conditions ---------- */

  section.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'mouse') { state.hovering = true; armProgress(); }
  });
  section.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse') { state.hovering = false; armProgress(); }
  });
  section.addEventListener('pointerdown', function (e) {
    state.lastPointer = e.pointerType || 'mouse';
  });
  section.addEventListener('focusin', function () {
    state.focused = true; armProgress();
  });
  section.addEventListener('focusout', function (e) {
    if (!section.contains(e.relatedTarget)) { state.focused = false; armProgress(); }
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      state.inView = entries[0].isIntersecting;
      armProgress();
    });
    io.observe(section);
  } else {
    state.inView = true;
  }

  if (reduced.addEventListener) reduced.addEventListener('change', armProgress);

  /* ---------- copy the prompt ---------- */

  if (copyBtn) {
    var copyTimer = 0;
    copyBtn.addEventListener('click', function () {
      var done = function (ok) {
        if (!ok) return;
        copyBtn.textContent = 'Copied';
        if (statusEl) statusEl.textContent = 'Copied';
        window.clearTimeout(copyTimer);
        copyTimer = window.setTimeout(function () {
          copyBtn.textContent = 'Copy';
          if (statusEl) statusEl.textContent = '';
        }, COPIED_MS);
      };
      var fallback = function () {
        var t = document.createElement('textarea');
        t.value = PROMPT;
        t.setAttribute('readonly', '');
        t.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(t);
        t.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        t.remove();
        return ok;
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(PROMPT).then(function () { done(true); }, function () { done(fallback()); });
        } else {
          done(fallback());
        }
      } catch (err) {
        done(fallback());
      }
    });
  }

  /* ---------- init ---------- */

  items.forEach(function (item, i) {
    item.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
  });
  setActive(0);
})();
