
(function () {
  'use strict';
  if (window.SyntheKept) return;

  
  var PATHS = {
    draw: 'M0.0000,0.0000 C0.0222,0.1660 0.0889,0.1762 0.1333,0.1941 C0.1778,0.2121 0.2222,0.2201 0.2667,0.2680 C0.3111,0.3158 0.3500,0.3857 0.4000,0.4810 C0.4500,0.5763 0.5167,0.7651 0.5667,0.8397 C0.6167,0.9143 0.6556,0.9051 0.7000,0.9283 C0.7444,0.9515 0.7833,0.9670 0.8333,0.9789 C0.8833,0.9909 0.9722,0.9965 1.0000,1.0000',
    verdict: 'M0,0 C0.14,0.6 0.3,1.035 0.52,1.03 C0.74,1.025 0.88,1 1,1',
    fade: 'M0,0 C0.25,0.4 0.4,1 1,1',
    exit: 'M0,0 C0.45,0 0.8,0.35 1,1'
  };
  var linearOK = !!(window.CSS && CSS.supports && CSS.supports('animation-timing-function', 'linear(0, 1)'));
  var FALLBACK = { draw: 'cubic-bezier(.3,.2,.2,1)', verdict: 'cubic-bezier(.2,.9,.3,1.03)', fade: 'cubic-bezier(.25,.4,.4,1)', exit: 'cubic-bezier(.45,0,.8,.35)' };
  function curve(d) {
    var n = d.replace(/[MC]/g, ' ').trim().split(/[\s,]+/).map(Number), segs = [], x0 = n[0], y0 = n[1];
    for (var i = 2; i + 5 < n.length; i += 6) { segs.push([x0, y0, n[i], n[i + 1], n[i + 2], n[i + 3], n[i + 4], n[i + 5]]); x0 = n[i + 4]; y0 = n[i + 5]; }
    function b(a, c, e, f, t) { var u = 1 - t; return u * u * u * a + 3 * u * u * t * c + 3 * u * t * t * e + t * t * t * f; }
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      for (var i = 0; i < segs.length; i++) {
        var s = segs[i];
        if (x <= s[6] || i === segs.length - 1) {
          var lo = 0, hi = 1, t = 0.5;
          for (var k = 0; k < 40; k++) { t = (lo + hi) / 2; if (b(s[0], s[2], s[4], s[6], t) < x) lo = t; else hi = t; }
          return b(s[1], s[3], s[5], s[7], t);
        }
      }
      return 1;
    };
  }
  var FN = {}, EASE = {};
  Object.keys(PATHS).forEach(function (k) {
    var fn = FN[k] = curve(PATHS[k]);
    if (!linearOK) { EASE[k] = FALLBACK[k]; return; }
    var st = []; for (var i = 0; i <= 60; i++) { var x = i / 60; st.push(fn(x).toFixed(4) + ' ' + (x * 100).toFixed(2) + '%'); }
    EASE[k] = 'linear(' + st.join(', ') + ')';
  });

  
  var T = { draw: 480, at: 200, out: 100, verdict: 420, exit: 180, hold: 1600, gap: 4, rm: 120, minW: 96 };
  var IN = T.at + 40, OUT = IN - T.out, FADE_IN = Math.round(T.verdict * 0.4); 
  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var registry = []; 

  function play(el, frames, o) {
    var dur = o.dur, delay = o.delay || 0;
    if (reduceMQ.matches) {
      var fadeOnly = frames.every(function (f) { return Object.keys(f).every(function (k) { return k === 'opacity' || k === 'offset'; }); });
      dur = fadeOnly ? (o.rm ? o.rm[0] : T.rm) : 0; delay = fadeOnly ? (o.rm ? o.rm[1] : Math.min(delay, 60)) : 0;
    }
    var a = el.animate(frames, { duration: dur, delay: delay, easing: EASE[o.curve], fill: 'both' });
    if (o.spec && dur) registry.push({ el: el, anim: a, prop: o.spec[0], from: o.spec[1], to: o.spec[2], curve: o.curve, dur: dur, delay: delay, label: o.label || '' });
    return a;
  }
  
  function freeze(el, props) {
    var cs = getComputedStyle(el), snap = {}, kill = [];
    el.getAnimations().forEach(function (a) {
      var drives = false;
      a.effect.getKeyframes().forEach(function (k) { props.forEach(function (p) { if (k[p] !== undefined) drives = true; }); });
      if (drives) kill.push(a);
    });
    props.forEach(function (p) { snap[p] = cs[p]; });
    props.forEach(function (p) { el.style[p] = snap[p]; });
    kill.forEach(function (a) { a.cancel(); });
  }
  function op(el) { return parseFloat(getComputedStyle(el).opacity); }
  function sx(el) {
    var m = getComputedStyle(el).transform;
    if (!m || m === 'none') return 1;
    return parseFloat(m.match(/matrix(3d)?\(([^)]+)\)/)[2].split(',')[0]);
  }
  function to(el, frame, o) {
    var keys = Object.keys(frame), cs = getComputedStyle(el), from = {};
    keys.forEach(function (k) { from[k] = cs[k]; });
    freeze(el, keys);
    return play(el, [from, frame], o);
  }
  function emit(el, state, ok) {
    try { el.dispatchEvent(new CustomEvent('synthe:kept', { bubbles: true, detail: { state: state, ok: ok } })); } catch (e) {}
  }
  function later(fn, ms) { return setTimeout(fn, ms); }

  
  var liveEl = null;
  function makeLive() { if (!liveEl && document.body) { liveEl = document.createElement('p'); liveEl.className = 'kept-live'; liveEl.setAttribute('aria-live', 'polite'); document.body.appendChild(liveEl); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', makeLive); else makeLive();
  function say(el, text) {
    var near = null;
    for (var p = el; p && p !== document.body && !near; p = p.parentElement) near = p.querySelector && p.querySelector('[data-kp-live]');
    if (!near) { makeLive(); near = liveEl; }
    near.textContent = '';
    setTimeout(function () { near.textContent = text; }, 30);
  }

  
  function kpParts(kp) {
    var P = { tint: kp.querySelector('.kp-tint'), fill: kp.querySelector('.kp-fill'), L: {} };
    ['rest', 'wait', 'done', 'fail'].forEach(function (n) { P.L[n] = kp.querySelector('.kp-' + n); });
    
    [P.tint, P.fill, P.L.rest, P.L.wait, P.L.done, P.L.fail].forEach(function (el) { if (el) el.style.transition = 'none'; });
    return P;
  }
  function feedbackKp(kp, ok) {
    var st = kp.__kept || (kp.__kept = {}), P = st.P || (st.P = kpParts(kp));
    clearTimeout(st.back);
    var show = ok ? P.L.done : P.L.fail;
    var same = st.ok === ok && P.fill && op(P.fill) > 0.5;
    var from = P.fill && op(P.fill) > 0.5 ? sx(P.fill) : 0; 
    st.ok = ok;
    clearTimeout(st.cls);
    if (P.fill) {
      freeze(P.fill, ['transform', 'opacity']); P.fill.style.opacity = '1';
      if (from < 0.999) play(P.fill, [{ transform: 'scaleX(' + from + ')' }, { transform: 'scaleX(1)' }], { dur: T.draw, curve: 'draw', spec: from === 0 ? ['scaleX', 0, 1] : null, label: 'kp line' });
    }
    emit(kp, 'start', ok);
    if (!(same && show && op(show) > 0.99)) {
      [P.L.rest, P.L.wait, P.L.done, P.L.fail].forEach(function (l) { if (l && l !== show && op(l) > 0) to(l, { opacity: 0 }, { dur: T.out, delay: OUT, curve: 'fade', rm: [60, 0] }); });
      if (show) {
        freeze(show, ['transform', 'opacity']);
        if (ok) play(show, [{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { dur: T.verdict, delay: IN, curve: 'verdict', spec: ['scale', 0.94, 1], label: 'kp label' });
        play(show, [{ opacity: op(show) }, { opacity: 1 }], { dur: FADE_IN, delay: IN, curve: 'fade', rm: [60, 60] });
      }
      if (P.tint) { if (ok) to(P.tint, { opacity: 1 }, { dur: T.verdict, delay: T.at, curve: 'fade', rm: [60, 60] }); else if (op(P.tint) > 0) to(P.tint, { opacity: 0 }, { dur: T.exit, curve: 'exit' }); }
    }
    
    st.cls = later(function () { kp.classList.toggle('is-fail', !ok); kp.classList.toggle('is-done', ok); }, T.at);
    say(kp, ok ? (kp.getAttribute('data-kept-ok') || 'Copied') : (kp.getAttribute('data-kept-fail') || 'Could not copy. Try again.'));
    st.back = later(function () { resetKp(kp); }, T.hold);
  }
  function resetKp(kp) {
    var st = kp.__kept, P = st.P;
    st.ok = null;
    ['done', 'fail', 'wait'].forEach(function (n) { var l = P.L[n]; if (l && op(l) > 0) to(l, { opacity: 0 }, { dur: T.out, curve: 'fade', rm: [60, 0] }); });
    if (P.tint && op(P.tint) > 0) to(P.tint, { opacity: 0 }, { dur: T.exit, delay: T.out, curve: 'exit', rm: [60, 60] });
    if (P.fill) to(P.fill, { opacity: 0 }, { dur: T.exit, curve: 'exit' });
    if (P.L.rest) { freeze(P.L.rest, ['opacity']); play(P.L.rest, [{ opacity: op(P.L.rest) }, { opacity: 1 }], { dur: 208, delay: T.out, curve: 'fade', rm: [60, 60] }); }
    clearTimeout(st.cls);
    later(function () { if (st.ok === null) { kp.classList.remove('is-done', 'is-fail'); emit(kp, 'end', null); } }, 260);
  }

  
  var CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4 6.6 11.4 12.5 4.6"/></svg>';
  var active = [];
  function layerOf(ctrl) {
    if (ctrl.__keptLayer && ctrl.__keptLayer.root.isConnected) return ctrl.__keptLayer;
    var root = document.createElement('div'); root.className = 'kept-layer'; root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '<div class="kept-was"></div><div class="kept-face"></div><div class="kept-line"><div class="kept-fill"></div></div>';
    document.body.appendChild(root);
    var o = root.getBoundingClientRect(); 
    var L = { root: root, was: root.firstChild, face: root.children[1], line: root.lastChild, fill: root.lastChild.firstChild, ctrl: ctrl, ox: o.left + window.scrollX, oy: o.top + window.scrollY };
    ctrl.__keptLayer = L;
    return L;
  }
  function place(L) {
    var c = L.ctrl, r = c.getBoundingClientRect(), cs = getComputedStyle(c), st = L.root.style;
    st.left = (r.left + window.scrollX - L.ox) + 'px'; st.top = (r.top + window.scrollY - L.oy) + 'px';
    st.width = r.width + 'px'; st.height = r.height + 'px';
    [L.face, L.was].forEach(function (f) { f.style.borderRadius = cs.borderRadius; f.style.font = cs.fontWeight + ' ' + cs.fontSize + ' / 1 ' + cs.fontFamily; f.style.letterSpacing = cs.letterSpacing; });
    L.line.style.top = (r.height + parseFloat(c.getAttribute('data-kept-gap') || T.gap)) + 'px';
  }
  
  function warm(c) { var L = layerOf(c); place(L); }
  function cool(c) {
    clearTimeout(c.__keptCool);
    c.__keptCool = setTimeout(function () { 
      var L = c.__keptLayer, st = c.__kept;
      if (!L || (st && st.busy) || c.matches(':hover') || document.activeElement === c) return;
      L.root.remove(); c.__keptLayer = null;
    }, 400);
  }
  function doneLabel(c) {
    var d = c.getAttribute('data-kept-done');
    if (d !== null) return d;
    var k = kindOf(c);
    return k ? k.done : 'Done';
  }
  function feedbackPlain(c, ok) {
    var L = layerOf(c), st = c.__kept || (c.__kept = {});
    clearTimeout(st.back); clearTimeout(st.drop);
    st.busy = true;
    if (active.indexOf(L) < 0) active.push(L);
    place(L);
    var same = st.ok === ok && op(L.fill) > 0.5, from = op(L.fill) > 0.5 ? sx(L.fill) : 0;
    st.ok = ok;
    L.root.classList.toggle('is-fail', !ok);
    freeze(L.fill, ['transform', 'opacity']); L.fill.style.opacity = '1';
    if (from < 0.999) play(L.fill, [{ transform: 'scaleX(' + from + ')' }, { transform: 'scaleX(1)' }], { dur: T.draw, curve: 'draw', spec: from === 0 ? ['scaleX', 0, 1] : null, label: 'line ' + (c.className || c.tagName) });
    emit(c, 'start', ok);
    if (ok) {
      if (!(same && op(L.face) > 0.99)) {
        if (op(L.was) < 0.01) coverNow(c, L); 
        var wt = L.was.firstChild;
        if (wt && op(wt) > 0) to(wt, { opacity: 0 }, { dur: T.out, delay: OUT, curve: 'fade', rm: [60, 0] });
        var label = doneLabel(c);
        if (label !== '' && !c.textContent.trim()) label = ''; 
        L.face.innerHTML = '<span class="kept-face-t"></span>';
        if (label === '') L.face.firstChild.innerHTML = CHECK; else L.face.firstChild.textContent = label;
        freeze(L.face, ['transform', 'opacity']);
        play(L.face, [{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { dur: T.verdict, delay: IN, curve: 'verdict', spec: ['scale', 0.94, 1], label: 'face ' + (c.className || c.tagName) });
        play(L.face, [{ opacity: op(L.face) }, { opacity: 1 }], { dur: FADE_IN, delay: IN, curve: 'fade', rm: [60, 60] });
        to(L.was, { opacity: 0 }, { dur: T.out, delay: IN + FADE_IN, curve: 'fade', rm: [1, 120] }); 
      }
    } else if (op(L.face) > 0) to(L.face, { opacity: 0 }, { dur: T.out, curve: 'fade', rm: [60, 0] });
    var k = kindOf(c);
    say(c, ok ? (c.getAttribute('data-kept-ok') || (k && k.ok) || 'Done') : (c.getAttribute('data-kept-fail') || (k && k.fail) || 'That did not work. Try again.'));
    st.back = later(function () { resetPlain(c); }, T.hold);
  }
  function resetPlain(c) {
    var L = c.__keptLayer, st = c.__kept;
    if (!L) return;
    st.ok = null;
    if (op(L.was) > 0) to(L.was, { opacity: 0 }, { dur: T.out, curve: 'fade', rm: [60, 0] });
    var ft = L.face.firstChild;
    if (ft && ft.nodeType === 1 && op(L.face) > 0) to(ft, { opacity: 0 }, { dur: T.out, curve: 'fade', rm: [60, 0] });
    if (op(L.face) > 0) to(L.face, { opacity: 0 }, { dur: T.out, delay: T.out, curve: 'fade', rm: [60, 60] }); 
    to(L.fill, { opacity: 0 }, { dur: T.exit, curve: 'exit' });
    st.drop = later(function () {
      if (st.ok !== null) return;
      st.busy = false;
      if (!c.matches(':hover') && document.activeElement !== c) { L.root.remove(); c.__keptLayer = null; }
      active = active.filter(function (x) { return x !== L; });
      emit(c, 'end', null);
    }, Math.max(T.exit, 2 * T.out) + 40);
  }
  addEventListener('resize', function () { active.forEach(place); });

  function feedback(el, ok) {
    if (!el) return;
    ok = !!ok;
    var kp = el.classList && el.classList.contains('kp') ? el : (el.closest && el.closest('.kp'));
    if (kp && kp.querySelector('.kp-labels')) feedbackKp(kp, ok); else feedbackPlain(el, ok);
  }
  
  function feedbackSoon(el, ok) { requestAnimationFrame(function () { if (visible(el)) feedback(el, ok); }); }

  
  var HOOKS = [
    { sel: '.pg-copybtn[data-copy], .docs-copy, .sv-copy, .synthe-promptbox_copy', kind: 'copy', done: 'Copied', ok: 'Copied', fail: 'Could not copy. Select the text and copy it.' },
    { sel: '.home-action_button[data-role="submit"]', kind: 'generate', done: 'Generated', ok: 'Generated your setup prompt', fail: 'Write a check first, then generate.' },
    { sel: '.pt-continue', kind: 'continue', done: 'Done', ok: 'Done', fail: 'Check the highlighted field.' },
    { sel: '#partner-submit', kind: 'submit', done: 'Opened', ok: 'Your email app is opening', fail: 'That did not go through. Try again.' }
  ];
  
  function lockWidth(c) {
    if (c.__keptLocked || !c.offsetParent) return;
    var k = kindOf(c); if (!k || k.kind !== 'copy') return;
    var probe = c.cloneNode(false), w = c.getBoundingClientRect().width;
    probe.removeAttribute('id'); probe.setAttribute('aria-hidden', 'true'); probe.tabIndex = -1;
    probe.style.cssText += ';position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;width:auto;min-width:0;max-width:none';
    c.parentNode.insertBefore(probe, c.nextSibling);
    ['Copied', c.textContent.trim()].concat(c.matches('.sv-copy') ? ['Press \u2318C'] : []).forEach(function (t) { probe.textContent = t; w = Math.max(w, probe.getBoundingClientRect().width); });
    probe.remove();
    c.style.minWidth = Math.ceil(Math.max(T.minW, w)) + 'px';
    c.__keptLocked = true;
  }
  function lockAll() { document.querySelectorAll(HOOKS[0].sel).forEach(lockWidth); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockAll); else lockAll();
  addEventListener('load', lockAll);

  function kindOf(c) {
    for (var i = 0; i < HOOKS.length; i++) if (c.matches && c.matches(HOOKS[i].sel)) return HOOKS[i];
    return null;
  }
  function visible(el) { return !!(el && el.isConnected && el.offsetParent !== null && !el.closest('[hidden]')); }

  
  var armed = null, fallbackFor = null;
  function take() { var a = armed; if (a && !a.used) { a.used = true; return a; } return null; }
  function settle(a, ok) {
    if (a.done) return; a.done = true;
    if (ok && a.snap && visible(a.ctrl)) cover(a); 
    feedbackSoon(a.ctrl, ok);
  }
  
  function cover(a) {
    var L = layerOf(a.ctrl);
    if (!L.root.style.width) place(L);
    paintCover(L, a.label, a.snap);
  }
  function coverNow(c, L) {
    var cs = getComputedStyle(c), t = c.textContent.trim();
    paintCover(L, t || null, { bg: solidBg(c), color: cs.color, shadow: cs.boxShadow === 'none' ? '' : cs.boxShadow }, t ? null : c.innerHTML);
  }
  function paintCover(L, label, sn, html) {
    var w = L.was;
    w.innerHTML = '<span></span>';
    if (html) w.firstChild.innerHTML = html; else w.firstChild.textContent = label;
    w.style.background = sn.bg; w.style.color = sn.color; w.style.boxShadow = sn.shadow;
    freeze(w, ['opacity']); w.style.opacity = '1';
  }
  var cb = navigator.clipboard;
  if (cb && typeof cb.writeText === 'function') {
    var origWrite = cb.writeText;
    try {
      cb.writeText = function () {
        var p = origWrite.apply(cb, arguments), a = take();
        if (a && p && p.then) {
          p.then(function () { settle(a, true); }, function () {
            
            fallbackFor = a;
            setTimeout(function () { if (fallbackFor === a) { fallbackFor = null; settle(a, false); } }, 0);
          });
        }
        return p;
      };
    } catch (e) {}
  }
  var origExec = document.execCommand;
  try {
    document.execCommand = function (cmd) {
      var r = origExec.apply(document, arguments);
      if (String(cmd).toLowerCase() === 'copy') {
        var a = fallbackFor || take();
        if (a) { fallbackFor = null; settle(a, !!r); }
      }
      return r;
    };
  } catch (e) {}

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    for (var i = 0; i < HOOKS.length; i++) {
      var c = t.closest(HOOKS[i].sel);
      if (!c || c.closest('[data-kept]') || c.hasAttribute('data-kept-off')) continue;
      onPress(c, HOOKS[i]);
      return;
    }
  }, true);

  function hooked(t) {
    if (!t || !t.closest) return null;
    for (var i = 0; i < HOOKS.length; i++) { var c = t.closest(HOOKS[i].sel); if (c && !c.closest('[data-kept]') && !c.hasAttribute('data-kept-off')) return c; }
    return null;
  }
  document.addEventListener('pointerover', function (e) { var c = hooked(e.target); if (c && (!c.__keptLayer || !c.__keptLayer.root.isConnected)) warm(c); }, { passive: true });
  document.addEventListener('focusin', function (e) { var c = hooked(e.target); if (c) warm(c); });
  document.addEventListener('pointerout', function (e) { var c = hooked(e.target); if (c && !c.contains(e.relatedTarget)) cool(c); }, { passive: true });
  document.addEventListener('focusout', function (e) { var c = hooked(e.target); if (c) cool(c); });

  
  function solidBg(el) {
    var layers = [];
    for (var p = el; p && p.nodeType === 1; p = p.parentElement) {
      var bg = getComputedStyle(p).backgroundColor, m = bg.match(/rgba?\(([^)]+)\)/);
      if (!m) continue;
      var v = m[1].split(',').map(parseFloat), a = v.length > 3 ? v[3] : 1;
      if (a > 0) layers.push([v[0], v[1], v[2], a]);
      if (a >= 1) break;
    }
    if (!layers.length) return '#fcfaf6';
    var out = layers.pop().slice(0, 3); 
    while (layers.length) { var l = layers.pop(); out = out.map(function (c, i) { return c * (1 - l[3]) + l[i] * l[3]; }); }
    return 'rgb(' + out.map(Math.round).join(',') + ')';
  }

  function onPress(c, h) {
    if (h.kind === 'copy') {
      var cs = getComputedStyle(c);
      var a = armed = { ctrl: c, label: c.textContent.trim(), snap: { bg: solidBg(c), color: cs.color, shadow: cs.boxShadow === 'none' ? '' : cs.boxShadow } };
      setTimeout(function () { if (armed === a && !a.used) armed = null; }, 0); 
      return;
    }
    if (h.kind === 'generate') {
      var form = c.form || c.closest('form'), box = form && form.querySelector('textarea');
      var had = box ? box.value.trim() !== '' : true;
      setTimeout(function () {
        var out = form && form.querySelector('[data-role="result-prompt"]'), panel = form && form.querySelector('[data-role="result"]');
        var ok = had && !!out && out.textContent.trim() !== '' && !(panel && panel.hidden);
        feedbackSoon(c, ok);
      }, 0);
      return;
    }
    if (h.kind === 'continue') {
      setTimeout(function () {
        
        if (!visible(c)) return;
        var err = document.getElementById('partner-email-error');
        feedbackSoon(c, !(err && !err.hidden));
      }, 0);
      return;
    }
    if (h.kind === 'submit') {
      var label = c.querySelector('.pt-submit-label') || c, seen = [];
      var mo = new MutationObserver(function () {
        var txt = label.textContent.trim(); seen.push(txt);
        if (/^try again$/i.test(txt)) { mo.disconnect(); feedbackSoon(c, false); }
        else if (seen.length > 1 && /^opening/i.test(seen[seen.length - 2]) && !/^opening|^sending/i.test(txt)) { mo.disconnect(); feedbackSoon(c, true); }
      });
      mo.observe(label, { childList: true, characterData: true, subtree: true });
      setTimeout(function () { mo.disconnect(); }, 8000);
    }
  }

  
  function reset(el) {
    var kp = el.classList && el.classList.contains('kp') ? el : (el.closest && el.closest('.kp'));
    var t = kp && kp.__kept ? kp : el;
    if (!t.__kept) return;
    clearTimeout(t.__kept.back);
    if (t === kp) resetKp(kp); else resetPlain(el);
  }
  window.SyntheKept = { feedback: feedback, timing: T, easing: EASE, curves: FN, _registry: registry, _reset: reset };
})();
