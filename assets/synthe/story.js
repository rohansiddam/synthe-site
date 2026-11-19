
(function () {
  'use strict';
  var night = document.querySelector('[data-night]'), barChart = document.querySelector('[data-bar]');
  if (!night && !barChart) return;

  
  var PATHS = {
    settle:  'M0,0 C0.08,0.38 0.18,0.80 0.38,0.92 C0.55,0.985 0.78,1 1,1',
    commit:  'M0.0000,0.0000 C0.0214,0.0412 0.0873,0.0301 0.1282,0.0375 C0.1692,0.0447 0.2080,0.0590 0.2457,0.0856 C0.2834,0.1123 0.3170,0.1238 0.3545,0.1971 C0.3921,0.2704 0.4321,0.4122 0.4709,0.5254 C0.5097,0.6385 0.5499,0.8044 0.5873,0.8760 C0.6246,0.9476 0.6575,0.9360 0.6950,0.9550 C0.7326,0.9739 0.7617,0.9819 0.8125,0.9894 C0.8633,0.9970 0.9688,0.9982 1.0000,1.0000',
    draw:    'M0.0000,0.0000 C0.0222,0.1660 0.0889,0.1762 0.1333,0.1941 C0.1778,0.2121 0.2222,0.2201 0.2667,0.2680 C0.3111,0.3158 0.3500,0.3857 0.4000,0.4810 C0.4500,0.5763 0.5167,0.7651 0.5667,0.8397 C0.6167,0.9143 0.6556,0.9051 0.7000,0.9283 C0.7444,0.9515 0.7833,0.9670 0.8333,0.9789 C0.8833,0.9909 0.9722,0.9965 1.0000,1.0000',
    exit:    'M0,0 C0.45,0 0.8,0.35 1,1',
    fade:    'M0,0 C0.25,0.4 0.4,1 1,1'
  };
  function parse(d) {
    var n = d.replace(/[MC]/g, ' ').trim().split(/[\s,]+/).map(Number), segs = [], x0 = n[0], y0 = n[1];
    for (var i = 2; i + 5 < n.length; i += 6) { segs.push([x0, y0, n[i], n[i + 1], n[i + 2], n[i + 3], n[i + 4], n[i + 5]]); x0 = n[i + 4]; y0 = n[i + 5]; }
    return segs;
  }
  function bez(a, b, c, d, t) { var u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; }
  function curveFn(segs) {
    return function (x) {
      if (x <= 0) return 0; if (x >= 1) return 1;
      for (var i = 0; i < segs.length; i++) {
        var s = segs[i];
        if (x <= s[6] || i === segs.length - 1) {
          var lo = 0, hi = 1, t = 0.5;
          for (var k = 0; k < 40; k++) { t = (lo + hi) / 2; if (bez(s[0], s[2], s[4], s[6], t) < x) lo = t; else hi = t; }
          return bez(s[1], s[3], s[5], s[7], t);
        }
      }
      return 1;
    };
  }
  var linearOK = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timing-function', 'linear(0, 1)');
  var C = {};
  Object.keys(PATHS).forEach(function (k) {
    var fn = curveFn(parse(PATHS[k])), stops = [];
    for (var i = 0; i <= 60; i++) { var x = i / 60; stops.push(fn(x).toFixed(4) + ' ' + (x * 100).toFixed(2) + '%'); }
    C[k] = { fn: fn, easing: linearOK ? 'linear(' + stops.join(', ') + ')' : 'cubic-bezier(.2,.8,.2,1)' };
  });
  var T = { exit: 180, settle: 520, commit: 640, draw: 760 };
  function stagger(i, first) { var g = first || 60, t = 0; for (var k = 0; k < i; k++) { t += g; g *= 0.75; } return Math.round(t); }
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var rate = 1;
  try { var q = parseFloat(new URLSearchParams(location.search).get('motion')); if (q > 0 && q <= 1) rate = q; } catch (e) {}
  var M = { curves: C, T: T, registry: [], get reduced() { return reduceMQ.matches; }, get rate() { return rate; } };

  
  M.play = function (el, frames, o) {
    o = o || {};
    var dur = o.dur, delay = o.delay || 0;
    if (M.reduced && !o.keepInReduced) {
      var fadeOnly = frames.every(function (f) { return Object.keys(f).every(function (k) { return k === 'opacity' || k === 'offset' || k === 'filter'; }); });
      dur = fadeOnly ? 120 : 0; delay = 0;
    }
    var a = el.animate(frames, { duration: dur, delay: delay, easing: C[o.curve || 'settle'].easing, fill: 'both' });
    a.updatePlaybackRate(rate);
    if (o.spec && dur) M.registry.push({ anim: a, el: el, spec: o.spec, curve: o.curve || 'settle', dur: dur, delay: delay, label: o.label || '' });
    return a;
  };
  
  M.to = function (el, target, o) {
    var cs = getComputedStyle(el), keys = Object.keys(target), from = {};
    keys.forEach(function (k) { from[k] = k === 'transform' ? (cs.transform === 'none' ? 'none' : cs.transform) : cs[k]; });
    M.handoff(el, keys);
    return M.play(el, [from, target], o);
  };
  M.handoff = function (el, keys) {
    var cs = getComputedStyle(el), snap = {}, kill = [];
    el.getAnimations().forEach(function (a) {
      var props = {};
      a.effect.getKeyframes().forEach(function (k) { Object.keys(k).forEach(function (p) { if (['offset', 'easing', 'composite', 'computedOffset'].indexOf(p) < 0) props[p] = 1; }); });
      if (keys.some(function (k) { return props[k]; })) { Object.keys(props).forEach(function (p) { snap[p] = cs[p]; }); kill.push(a); }
    });
    Object.keys(snap).forEach(function (p) { el.style[p] = snap[p]; });
    kill.forEach(function (a) { a.cancel(); });
  };
  
  M.follow = function (x0, onUpdate, opt) {
    opt = opt || {};
    var k = 170, c = 26, x = x0, v = 0, target = x0, raf = 0, last = 0, eps = opt.eps || 0.0005;
    function step(now) {
      var dt = Math.min(0.032, (now - (last || now)) / 1000) * rate; last = now;
      var a = -k * (x - target) - c * v; v += a * dt; x += v * dt;
      if (Math.abs(x - target) < eps && Math.abs(v) < eps * 10) { x = target; v = 0; onUpdate(x); raf = 0; last = 0; return; }
      onUpdate(x); raf = requestAnimationFrame(step);
    }
    return {
      set: function (t) { target = t; if (M.reduced) { x = t; v = 0; onUpdate(x); return; } if (!raf) raf = requestAnimationFrame(step); },
      jump: function (t) { if (raf) { cancelAnimationFrame(raf); raf = 0; last = 0; } target = x = t; v = 0; onUpdate(x); },
      get value() { return x; }
    };
  };
  M.snap = function (px) { var d = window.devicePixelRatio || 1; return Math.round(px * d) / d; };
  function later(fn, ms) { return setTimeout(fn, M.reduced ? 0 : ms / rate); }
  function onView(el, fn, th) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); fn(); } }, { threshold: th || 0.4 });
    io.observe(el);
  }
  function cancelAll(el) { el.getAnimations().forEach(function (a) { a.cancel(); }); }
  function prune() { M.registry = M.registry.filter(function (r) { return r.anim.playState !== 'idle' && r.el.isConnected; }); }

  
  function s2l(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function l2s(c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
  function hexRgb(hex) { return [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16) / 255; }); }
  function toOklch(hex) {
    var c = hexRgb(hex).map(s2l), r = c[0], g = c[1], b = c[2];
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    var L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    return [L, Math.sqrt(A * A + B * B), Math.atan2(B, A)];
  }
  function fromOklch(o) {
    var A = o[1] * Math.cos(o[2]), B = o[1] * Math.sin(o[2]);
    var l = Math.pow(o[0] + 0.3963377774 * A + 0.2158037573 * B, 3), m = Math.pow(o[0] - 0.1055613458 * A - 0.0638541728 * B, 3), s = Math.pow(o[0] - 0.0894841775 * A - 1.2914855480 * B, 3);
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s].map(function (c) { return Math.max(0, Math.min(1, l2s(c))); });
  }
  function mixOklch(a, b, t) {
    var dh = b[2] - a[2]; if (dh > Math.PI) dh -= 2 * Math.PI; if (dh < -Math.PI) dh += 2 * Math.PI;
    var h = a[1] < 0.02 ? b[2] : a[2] + dh * t;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, h];
  }
  function lum(rgb) { return rgb.map(s2l).reduce(function (s, c, i) { return s + c * [0.2126, 0.7152, 0.0722][i]; }, 0); }
  function contrast(l1, l2) { return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }

  
  var nightApi = null;
  if (night) nightApi = (function () {
    var view = night.querySelector('.st-night-view');
    var chs = [].slice.call(night.querySelectorAll('.st-ch')), dots = [].slice.call(night.querySelectorAll('.st-night-dots i'));
    var plot = night.querySelector('.st-nc-plot'), colsHost = night.querySelector('.st-nc-cols');
    var hair = night.querySelector('.st-nc-hair'), lineEl = night.querySelector('.st-nc-line'), lineLbl = night.querySelector('.st-nc-lbl');
    var LIGHT = '#fcfaf6', DARK = '#141312';               
    var LL = lum(hexRgb(LIGHT)), LD = lum(hexRgb(DARK));
    
    var RED = toOklch('#8e2d36'), NIGHT = toOklch('#2a1619'), CREAM = toOklch('#fbf1e2');
    var DUSK = 0.22, DAWN = 0.86, MORN = 0.90;   
    function rgbOf(o) { return fromOklch(o); }
    
    var gapA = 0, gapB = 1;
    for (var gi = 0; gi <= 400; gi++) { var gt = gi / 400, gL = lum(rgbOf(mixOklch(NIGHT, CREAM, gt))); if (contrast(gL, LL) >= 4.6) gapA = gt; }
    for (gi = 400; gi >= 0; gi--) { gt = gi / 400; gL = lum(rgbOf(mixOklch(NIGHT, CREAM, gt))); if (contrast(gL, LD) >= 4.6) gapB = gt; }
    function skipGap(t) { return t > gapA && t < gapB ? (t < (gapA + gapB) / 2 ? gapA : gapB) : t; }
    function dawnRgb(t) { return rgbOf(mixOklch(NIGHT, CREAM, skipGap(t))); }
    
    function bgAt(p) {
      if (p <= DUSK) return rgbOf(mixOklch(RED, NIGHT, Math.max(0, p) / DUSK));
      return p < MORN ? rgbOf(NIGHT) : dawnRgb(1);
    }
    
    var LO = 60, HI = 95, BAR = 80;
    var DATA = [['A', 71], ['B', 75], ['C', 86], ['D', 68], ['E', 88]];
    var cols = DATA.map(function (d, i) {
      var el = document.createElement('div'); el.className = 'st-nc-col';
      el.innerHTML = '<span class="st-nc-base"></span><span class="st-nc-fill"></span><span class="st-nc-win"></span><span class="st-nc-peak"></span><span class="st-nc-val">' + d[1] + '%</span>' +
        (i === 2 ? '<span class="st-nc-tag"><i></i>PR #214</span>' : i === 4 ? '<span class="st-nc-tag is-out"><i></i>Reverted</span>' : '');
      colsHost.appendChild(el);
      return { el: el, id: d[0], fill: el.querySelector('.st-nc-fill'), win: el.querySelector('.st-nc-win'), peak: el.querySelector('.st-nc-peak'), val: el.querySelector('.st-nc-val'), tag: el.querySelector('.st-nc-tag'), clears: false, aim: 0 };
    });
    function ratio(v) { return Math.max(0, (v - LO) / (HI - LO)); }
    
    var CHECKS = {
      ecommerce: ['Explain the return policy that applies', 'Offer an exchange when it fits', 'Never invent dates', 'Send hard cases to a person', 'Never promise what the policy does not allow'],
      finance: ['Verify identity first', 'No investment advice', 'Explain fees plainly', 'Freeze a lost card first', 'Never share a balance before verifying'],
      travel: ['Confirm before booking', 'Rebook a cancelled flight first', 'Never promise upgrades', 'Ask for the booking reference', 'Explain the change fee first'],
      insurance: ['Ask for the claim number first', 'Never decide a claim', 'Quote the coverage that applies', 'List the documents a claim needs', 'Never guess a payout'],
      software: ['Link the right docs page', 'Hand billing to a person', 'Never invent features', 'Ask for steps to reproduce a bug', "Never share another customer's data"]
    };
    var checksEl = document.createElement('ol'); checksEl.className = 'st-nc-checks';
    var checkRows = [0, 1, 2, 3, 4].map(function (i) {
      var li = document.createElement('li'); li.innerHTML = '<span class="st-tnum">' + (i + 1) + '</span><span></span>';
      checksEl.appendChild(li); return li;
    });
    night.querySelector('.st-nc').insertBefore(checksEl, plot);
    var rounds = night.querySelector('.st-nc-rounds'), bases = [].slice.call(night.querySelectorAll('.st-nc-base'));
    function setChecks(id) { (CHECKS[id] || CHECKS.ecommerce).forEach(function (t, i) { checkRows[i].lastChild.textContent = t; }); }
    setChecks('ecommerce');
    
    function showChecks(on, prev) {
      if (on) {
        cancelAll(checksEl); checksEl.style.opacity = '1';
        checkRows.forEach(function (r, i) {
          M.handoff(r, ['transform', 'opacity']);
          M.play(r, [{ transform: 'translateY(8px)', opacity: 0 }, { transform: 'translateY(0px)', opacity: 1 }], { dur: T.settle, delay: (prev < 0 ? 200 : T.exit) + stagger(i, 90), curve: 'settle', spec: { prop: 'translateY', from: 8, to: 0 }, label: 'night · check ' + (i + 1) + ' arrives' });
        });
      } else fadeTo(checksEl, false);
    }
    
    function stateOf(ch) {
      return {
        checks: ch === 0,
        line: ch >= 1,
        h: [ch >= 1 ? 71 : 0, ch >= 1 ? 75 : 0, ch >= 1 ? 86 : 0, ch >= 1 ? 68 : 0, ch >= 3 ? 70 : 0],
        dim: ch >= 2,                 
        merged: ch >= 2, reverted: ch >= 3
      };
    }
    var active = -1, started = false, fgDark = false, seqTimer = 0, raf = 0;
    night.classList.add('is-live');
    function plotH() { return plot.clientHeight; }
    function placeLine() {
      lineEl.style.transform = 'translateY(' + M.snap((1 - ratio(BAR)) * plotH()) + 'px)';
      cols[4].peak.style.transform = 'translateY(' + M.snap((1 - ratio(88)) * plotH()) + 'px)';   
    }
    
    function sync() {
      var H = plotH(), moving = false;
      cols.forEach(function (c, i) {
        var r = readProp(c.fill, 'scaleY'), v = LO + r * (HI - LO), top = r * H;
        if (c.fill.getAnimations().length) moving = true;
        c.val.textContent = Math.round(r > 0.001 ? v : DATA[i][1]) + '%';
        c.val.style.transform = 'translate(-50%, ' + (-top - 6).toFixed(1) + 'px)';
        
        if (c.tag) c.tag.style.transform = 'translate(-50%, ' + (-(i === 4 ? ratio(88) * H : top) - (i === 4 ? 12 : 36)).toFixed(1) + 'px)';
        var clears = r > 0.001 && v >= BAR - 0.01;
        if (clears !== c.clears) {
          c.clears = clears;
          var from = parseFloat(getComputedStyle(c.win).opacity) || 0, to = clears ? 1 : 0;
          M.to(c.win, { opacity: String(to) }, { dur: 320, curve: 'settle', spec: from === to ? null : { prop: 'opacity', from: from, to: to }, label: 'night · change ' + c.id + (clears ? ' clears' : ' falls under') + ' the bar' });
        }
        var showVal = r > 0.001;
        if ((c.val.style.opacity === '1') !== showVal) c.val.style.opacity = showVal ? '1' : '0';
      });
      raf = moving ? requestAnimationFrame(sync) : 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(sync); }
    function rise(c, v, o) {
      var to = ratio(v), from = readProp(c.fill, 'scaleY');
      if (Math.abs(from - to) < 0.0005) return;
      o = o || {};
      
      [c.fill, c.win].forEach(function (el, k) {
        M.handoff(el, ['transform']);
        M.play(el, [{ transform: 'scaleY(' + from.toFixed(4) + ')' }, { transform: 'scaleY(' + to.toFixed(4) + ')' }], { dur: o.dur || T.draw, delay: o.delay || 0, curve: o.curve || 'draw', spec: k ? null : { prop: 'scaleY', from: +from.toFixed(4), to: +to.toFixed(4) }, label: 'night · change ' + c.id + ' ' + (to > from ? 'rises' : 'falls') });
      });
      kick();
    }
    function fadeTo(el, on, o) {
      if (!el) return;
      var cur = parseFloat(getComputedStyle(el).opacity), want = on ? (o && o.op || 1) : 0;
      if (Math.abs(cur - want) < 0.01 && !el.getAnimations().length) return;
      M.to(el, { opacity: String(want) }, { dur: on ? 208 : T.exit, delay: on && o && o.delay || 0, curve: on ? 'fade' : 'exit' });
    }
    
    function drop(c) {
      if (c.out || readProp(c.fill, 'scaleY') <= 0.001) return;
      c.out = true; fadeTo(c.el, false);
      c.timer = later(function () {
        [c.fill, c.win].forEach(function (el) { M.handoff(el, ['transform']); el.style.transform = 'scaleY(0)'; });
        cancelAll(c.win); c.win.style.opacity = '0'; c.clears = false;
        cancelAll(c.val); c.val.style.opacity = '0';
        [c.tag, c.peak].forEach(function (el) { if (el) { cancelAll(el); el.style.opacity = '0'; } });
        c.out = false; fadeTo(c.el, true);
      }, T.exit);
    }
    function keep(c) { if (c.out) { clearTimeout(c.timer); c.out = false; fadeTo(c.el, true); } }
    function place(c, v, o) { if (v) { keep(c); rise(c, v, o); } else drop(c); }
    function goTo(ch, prev) {
      var st = stateOf(ch);
      clearTimeout(seqTimer);
      
      var hx = readProp(hair, 'scaleX'), hTo = st.line ? 1 : 0;
      if (Math.abs(hTo - hx) > 0.0005) { M.handoff(hair, ['transform']); M.play(hair, [{ transform: 'scaleX(' + hx.toFixed(4) + ')' }, { transform: 'scaleX(' + hTo + ')' }], { dur: T.draw, curve: 'draw', spec: { prop: 'scaleX', from: +hx.toFixed(4), to: hTo }, label: 'night · your bar ' + (hTo ? 'draws' : 'clears') }); }
      fadeTo(lineLbl, st.line, { delay: 240 });
      if (st.checks !== (prev === 0)) showChecks(st.checks, prev);
      fadeTo(rounds, st.line, { delay: 120 });
      bases.forEach(function (b) { fadeTo(b, st.line, { op: 0.24, delay: 120 }); });
      
      for (var i = 0; i < 4; i++) place(cols[i], st.h[i], { delay: st.h[i] && prev < 1 ? 120 + stagger(i, 80) : 0 });
      cols.forEach(function (c, i) { if (i !== 2 && i < 4) fadeTo(c.fill, true, { op: st.dim ? 0.1 : 0.18 }); });
      fadeTo(cols[2].tag, st.merged, { delay: prev < 2 ? 200 : 0 });
      
      var E = cols[4];
      if (st.h[4] && readProp(E.fill, 'scaleY') < 0.001) {
        keep(E); rise(E, 88, { delay: 80 });
        seqTimer = later(function () { rise(E, 70, { curve: 'commit', dur: T.commit }); fadeTo(E.peak, true, { op: 0.7 }); fadeTo(E.tag, true, { delay: T.commit }); }, 80 + T.draw + 420);
      } else {
        place(E, st.h[4]);
        if (st.h[4]) { fadeTo(E.peak, st.reverted, { op: 0.7 }); fadeTo(E.tag, st.reverted); }
      }
    }
    
    var CH_OUT = 140, CH_WAIT = 120;
    function setChapter(i) {
      if (i === active) return;
      var prev = active;
      if (active >= 0) M.to(chs[active], { opacity: 0, transform: 'translateY(-8px)' }, { dur: CH_OUT, curve: 'exit' });
      active = i;
      dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
      if (i >= 0) {
        var el = chs[i], op0 = readProp(el, 'opacity') || 0, y0 = readProp(el, 'translateY');
        var back = op0 >= 0.15, wait = !back && prev >= 0 ? CH_WAIT : 0;
        if (!back) { op0 = 0; y0 = 8; }
        cancelAll(el); prune();
        M.play(el, [{ transform: 'translateY(' + y0.toFixed(2) + 'px)' }, { transform: 'translateY(0px)' }], { dur: T.settle, delay: wait, curve: 'settle', spec: Math.abs(y0) > 0.0005 ? { prop: 'translateY', from: +y0.toFixed(2), to: 0 } : null, label: 'night · chapter ' + (i + 1) });
        M.play(el, [{ opacity: op0 }, { opacity: 1 }], { dur: Math.round(T.settle * 0.4), delay: wait, curve: 'fade' });
        goTo(i, prev);
      }
    }
    
    function pickDark(L, cur) { var cD = contrast(L, LD), cL = contrast(L, LL); return cur ? cD > cL * 0.97 : cD > cL * 1.03; }
    function paint(rgb) {
      var L = lum(rgb);
      view.style.backgroundColor = 'rgb(' + rgb.map(function (c) { return Math.round(c * 255); }).join(',') + ')';
      var wantDark = pickDark(L, fgDark);
      if (wantDark !== fgDark) {
        var from = fgDark ? DARK : LIGHT, to = wantDark ? DARK : LIGHT;
        fgDark = wantDark; cancelAll(view);
        M.play(view, [{ color: from }, { color: to }], { dur: 120, curve: 'fade', keepInReduced: true });
      }
      view.setAttribute('data-contrast', (fgDark ? contrast(L, LD) : contrast(L, LL)).toFixed(2));
    }
    
    var DAWN_MS = 400, day = false, dawnT = 0, dawnFrom = 0, dawnTo = 0, dawnStart = 0, dawnRaf = 0, painted = false;
    function dawnStep(now) {
      var f = Math.min(1, (now - dawnStart) * rate / DAWN_MS);
      dawnT = dawnFrom + (dawnTo - dawnFrom) * C.fade.fn(f);
      paint(dawnRgb(dawnT));
      dawnRaf = f < 1 ? requestAnimationFrame(dawnStep) : 0;
    }
    function toward(t, jump) {
      if (jump || M.reduced) { cancelAnimationFrame(dawnRaf); dawnRaf = 0; dawnT = dawnTo = t; paint(dawnRgb(t)); return; }
      if (dawnRaf) { if (t === dawnTo) return; }
      else if (dawnT === t) { paint(dawnRgb(t)); return; }
      dawnFrom = dawnT; dawnTo = t; dawnStart = performance.now();
      if (!dawnRaf) dawnRaf = requestAnimationFrame(dawnStep);
    }
    function render(p) {
      if (p <= DUSK) { cancelAnimationFrame(dawnRaf); dawnRaf = 0; dawnT = dawnTo = 0; day = false; paint(bgAt(p)); }
      else { day = day ? p >= DAWN : p >= MORN; toward(day ? 1 : 0, !painted); }
      painted = true;
      if (!started) return;
      var idx = -1; chs.forEach(function (c, k) { if (p >= +c.dataset.a && p <= +c.dataset.b) idx = k; });
      setChapter(idx);
    }
    function progress() {
      var r = night.getBoundingClientRect(), top = parseFloat(getComputedStyle(view).top) || 0;
      var total = night.offsetHeight - view.offsetHeight;
      return total > 0 ? Math.max(0, Math.min(1, (top - r.top) / total)) : 0;
    }
    placeLine();
    var spring = M.follow(progress(), render, { eps: 0.0002 });
    render(spring.value);
    onView(view, function () { started = true; render(spring.value); }, 0.5);
    addEventListener('scroll', function () { spring.set(progress()); }, { passive: true });
    var lastW = innerWidth, lastH = innerHeight;
    addEventListener('resize', function () {
      spring.jump(progress()); if (dawnRaf) toward(dawnTo, true); placeLine();
      if (innerWidth !== lastW || innerHeight !== lastH) { lastW = innerWidth; lastH = innerHeight; kick(); }
    });
    
    function contrastCheck() {
      var out = [];
      chs.forEach(function (c, k) {
        var a = +c.dataset.a, b = Math.min(1, +c.dataset.b), worst = 99, cur = null;
        for (var i = 0; i <= 200; i++) {
          var p = a + (b - a) * i / 200, L = lum(bgAt(p));
          cur = pickDark(L, cur === null ? (L > 0.18) : cur);
          worst = Math.min(worst, contrast(L, cur ? LD : LL));
        }
        out.push({ chapter: k + 1, from: a, to: b, minContrast: +worst.toFixed(2), pass: worst >= 4.5 });
      });
      return out;
    }
    return { render: render, bgAt: bgAt, get dawn() { return { day: day, t: dawnT, moving: !!dawnRaf }; }, spring: spring, progress: progress, contrastCheck: contrastCheck, gap: [gapA, gapB], setChecks: setChecks, get chapter() { return active; } };
  })();

  
  (function () {
    if (!night) return;
    function ruleOf(ind) {
      var c = (ind.chips || []).filter(function (x) { return /^(Never|No) /.test(x[0]); })[0];
      return c ? c[0] : null;
    }
    function apply(ind, animate) {
      if (!ind) return;
      var rule = ruleOf(ind), agent = ind.agent || 'agent';
      night.querySelectorAll('[data-ind="agent"]').forEach(function (el) { el.textContent = agent; });
      night.querySelectorAll('[data-ind="Agent"]').forEach(function (el) { el.textContent = agent.charAt(0).toUpperCase() + agent.slice(1); });
      if (rule) night.querySelectorAll('[data-ind="rule"]').forEach(function (el) { el.textContent = rule; });
      if (nightApi) nightApi.setChecks(ind.id);
      if (animate) night.querySelectorAll('.st-ch p:not(.st-ch-t), .st-night-agent, .st-nc-checks li span:last-child').forEach(function (el) { M.play(el, [{ opacity: 0.35 }, { opacity: 1 }], { dur: 208, curve: 'fade' }); });
    }
    function init() { if (window.SyntheIndustry) apply(window.SyntheIndustry.get(), false); }
    addEventListener('synthe:industry', function (e) { apply(e.detail && e.detail.industry, true); });
    init();
    if (!window.SyntheIndustry) addEventListener('DOMContentLoaded', init, { once: true });
  })();

  
  var barApi = null;
  if (barChart) barApi = (function () {
    var colsHost = barChart.querySelector('.st-bar-cols'), line = barChart.querySelector('.st-bar-line'), hairs = [].slice.call(line.querySelectorAll('.st-hair'));
    var hit = barChart.querySelector('.st-bar-hit'), handle = barChart.querySelector('.st-bar-handle');
    var valEl = barChart.querySelector('[data-bar-val]'), countEl = document.querySelector('[data-bar-count]'), verbEl = document.querySelector('[data-bar-verb]');
    var LO = 60, HI = 95, START = 80, VALS = [['A', 71], ['B', 75], ['C', 86], ['D', 68], ['E', 70]];   
    var cols = VALS.map(function (v) {
      var el = document.createElement('div'); el.className = 'st-bc';
      el.innerHTML = '<span class="st-bc-fill"></span><span class="st-bc-win"></span><span class="st-bc-val"><span>' + v[1] + '%</span></span><span class="st-bc-lbl"><span class="w">Change </span>' + v[0] + '</span>';
      colsHost.appendChild(el);
      return { el: el, v: v[1], fill: el.children[0], win: el.children[1], val: el.children[2], txt: el.children[2].firstChild, dim: 1, clears: null };
    });
    var dragging = false, ready = false, you = false, touched = false;
    var side = countEl && countEl.parentNode;
    function geom() { var c = colsHost.getBoundingClientRect(), p = barChart.getBoundingClientRect(); return { top: c.top - p.top, h: c.height, chartTop: p.top }; }
    function ratio(v) { return (v - LO) / (HI - LO); }
    
    var narrowMQ = window.matchMedia('(max-width: 599px)');
    function vOff() { return narrowMQ.matches ? 6 : 12; }
    function render(b) {
      var g = geom(), y = g.top + (1 - ratio(b)) * g.h;
      line.style.transform = 'translateY(' + M.snap(y) + 'px)';
      var shown = Math.round(b); valEl.textContent = 'Bar ' + shown + '%';
      handle.setAttribute('aria-valuenow', shown); handle.setAttribute('aria-valuetext', shown + ' percent of checks');
      if (!ready) return;
      var n = 0;
      cols.forEach(function (c) {
        var clears = c.v >= b; if (clears) n++;
        if (clears !== c.clears) {
          c.clears = clears;
          var from = parseFloat(getComputedStyle(c.win).opacity) || 0, to = clears ? 1 : 0;
          M.to(c.win, { opacity: String(to) }, { dur: dragging || you || demoing ? 320 : T.settle, curve: 'settle', spec: from === to ? null : { prop: 'opacity', from: from, to: to }, label: 'bar · change ' + c.el.textContent.slice(-1) + ' crosses' });
          c.val.style.color = clears ? 'var(--moss)' : '';
        }
      });
      countEl.textContent = n + ' of 5';
      dimLabels(g.chartTop + y);
      if (verbEl) verbEl.textContent = n === 1 ? 'clears' : 'clear';   
    }
    
    var NEAR = 6, FAR = 12, DIMMEST = 0.25;
    function dimLabels(lineAt) {
      cols.forEach(function (c) {
        var r = c.txt.getBoundingClientRect(), d = Math.abs(lineAt - (r.top + r.bottom) / 2);
        var o = DIMMEST + (1 - DIMMEST) * Math.max(0, Math.min(1, (d - NEAR) / (FAR - NEAR)));
        o = Math.round(o * 100) / 100;
        if (o !== c.dim) { c.dim = o; c.txt.style.opacity = o === 1 ? '' : String(o); }
      });
    }
    var spring = M.follow(START, render, { eps: 0.002 }), aim = START;
    function setBar(v) { aim = Math.max(LO, Math.min(HI, v)); spring.set(aim); }
    function fromPointer(e) { var g = geom(); return LO + (1 - (e.clientY - g.chartTop - g.top) / g.h) * (HI - LO); }

    
    var DEMO = [START, 74, START], demoing = false, demoAnim = null, demoRaf = 0, demoTimer = 0, demoDone = false;
    function lineY(v) { var g = geom(); return g.top + (1 - ratio(v)) * g.h; }
    function valueAtLine() { var g = geom(); return LO + (1 - (readProp(line, 'translateY') - g.top) / g.h) * (HI - LO); }
    function demoTick() { render(valueAtLine()); demoRaf = demoing ? requestAnimationFrame(demoTick) : 0; }
    function demoLeg(i) {
      if (!demoing) return;
      if (i >= DEMO.length - 1) { endDemo(START); return; }
      if (demoAnim) { demoAnim.onfinish = null; demoAnim.cancel(); }   
      var y0 = M.snap(lineY(DEMO[i])), y1 = M.snap(lineY(DEMO[i + 1]));
      demoAnim = M.play(line, [{ transform: 'translateY(' + y0 + 'px)' }, { transform: 'translateY(' + y1 + 'px)' }], { dur: T.settle, curve: 'settle', spec: { prop: 'translateY', from: y0, to: y1 }, label: 'bar · handle shows itself (' + DEMO[i] + ' to ' + DEMO[i + 1] + ')' });
      demoAnim.onfinish = function () { demoTimer = later(function () { demoLeg(i + 1); }, i === 0 ? 480 : 0); };
    }
    function startDemo() {
      if (demoDone || touched || M.reduced || dragging) return;
      demoDone = true; demoing = true;
      if (side) side.setAttribute('aria-live', 'off');   
      demoTick(); demoLeg(0);
    }
    function endDemo(v) {
      if (!demoing) return;
      demoing = false; clearTimeout(demoTimer); cancelAnimationFrame(demoRaf); demoRaf = 0;
      var at = v === undefined ? valueAtLine() : v;
      if (demoAnim) { demoAnim.onfinish = null; demoAnim.cancel(); demoAnim = null; }
      aim = at; spring.jump(at);
      if (side) side.setAttribute('aria-live', 'polite');
    }
    
    function takeOver() { touched = true; if (demoing) endDemo(); }

    
    var grab = 0;
    function down(e, onHandle) {
      if (e.button) return;
      takeOver();
      grab = onHandle ? fromPointer(e) - aim : 0;
      dragging = true; try { barChart.setPointerCapture(e.pointerId); } catch (err) {} setBar(fromPointer(e) - grab);
      handle.focus({ preventScroll: true }); e.preventDefault();
    }
    hit.addEventListener('pointerdown', function (e) { e.stopPropagation(); down(e); });
    handle.addEventListener('pointerdown', function (e) { e.stopPropagation(); down(e, true); });
    barChart.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') down(e); });
    
    var fineMQ = window.matchMedia('(pointer: fine)');
    var lastPt = null, lastClient = null;
    function follow(pt) {
      var r = barChart.getBoundingClientRect(), rel = [pt.clientX - r.left, pt.clientY - r.top];
      var moved = !lastPt || Math.abs(rel[0] - lastPt[0]) + Math.abs(rel[1] - lastPt[1]) >= 1; lastPt = rel; lastClient = [pt.clientX, pt.clientY];
      if (!you || !moved || dragging) return;
      takeOver();
      setBar(fromPointer(pt));
    }
    barChart.addEventListener('pointermove', function (e) {
      if (dragging) { setBar(fromPointer(e) - grab); return; }
      follow(e);
    });
    addEventListener('scroll', function () { if (you && lastClient) follow({ clientX: lastClient[0], clientY: lastClient[1] }); }, { passive: true });
    barChart.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'touch' || !fineMQ.matches) return;
      you = true; var r0 = barChart.getBoundingClientRect(); lastPt = [e.clientX - r0.left, e.clientY - r0.top]; lastClient = [e.clientX, e.clientY];
    });
    barChart.addEventListener('pointerleave', function () { you = false; });
    
    var tap = null;
    barChart.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') tap = { x: e.clientX, y: e.clientY, t: Date.now() }; });
    barChart.addEventListener('pointerup', function (e) {
      if (e.pointerType !== 'touch' || !tap) return;
      var still = Math.abs(e.clientX - tap.x) < 8 && Math.abs(e.clientY - tap.y) < 8 && Date.now() - tap.t < 600; tap = null;
      if (still && !dragging) { takeOver(); setBar(fromPointer(e)); }
    });
    barChart.addEventListener('pointercancel', function () { tap = null; });
    handle.addEventListener('focus', takeOver);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { barChart.addEventListener(t, function () { dragging = false; }); });
    handle.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 5 : 1, cur = Math.round(aim), k = e.key;
      if (k === 'ArrowUp' || k === 'ArrowRight') setBar(cur + step);
      else if (k === 'ArrowDown' || k === 'ArrowLeft') setBar(cur - step);
      else if (k === 'PageUp') setBar(cur + 5);
      else if (k === 'PageDown') setBar(cur - 5);
      else if (k === 'Home') setBar(LO);
      else if (k === 'End') setBar(HI);
      else return;
      e.preventDefault();
    });
    function intro() {
      ready = false; prune();
      var g = geom();
      cols.forEach(function (c) { cancelAll(c.fill); cancelAll(c.win); cancelAll(c.val); c.clears = null; c.val.style.color = ''; c.win.style.opacity = '0'; });
      hairs.forEach(function (h) { cancelAll(h); M.play(h, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { dur: T.draw, curve: 'draw', spec: h.classList.contains('glow') ? null : { prop: 'scaleX', from: 0, to: 1 }, label: 'bar · line draws' }); });
      cols.forEach(function (c, i) {
        var r = ratio(c.v), d = 220 + stagger(i);
        var fr = [{ transform: 'scaleY(0)' }, { transform: 'scaleY(' + r.toFixed(4) + ')' }];
        M.play(c.fill, fr, { dur: T.draw, delay: d, curve: 'draw', spec: { prop: 'scaleY', from: 0, to: r }, label: 'bar · change ' + VALS[i][0] + ' rises' });
        M.play(c.win, fr, { dur: T.draw, delay: d, curve: 'draw' });
        M.play(c.val, [{ transform: 'translate(-50%, 0px)', opacity: 0 }, { transform: 'translate(-50%, ' + (-(r * g.h) - vOff()).toFixed(1) + 'px)', opacity: 1 }], { dur: T.draw, delay: d, curve: 'draw' });
      });
      later(function () { ready = true; render(spring.value); demoTimer = later(startDemo, 400); }, 220 + stagger(4) + T.draw);
      aim = START; spring.jump(START);
    }
    
    function relayout() {
      var g = geom();
      cols.forEach(function (c) {
        var r = ratio(c.v);
        [c.fill, c.win].forEach(function (el) { var op = getComputedStyle(el).opacity; cancelAll(el); el.style.opacity = op; el.style.transform = 'scaleY(' + r.toFixed(4) + ')'; });
        if (c.val.getAnimations().length) { cancelAll(c.val); c.val.style.opacity = '1'; }
        if (c.val.style.opacity === '1') c.val.style.transform = 'translate(-50%, ' + (-(r * g.h) - vOff()).toFixed(1) + 'px)';
      });
      if (demoing) endDemo(); else spring.jump(spring.value);
    }
    var lastW = innerWidth;
    addEventListener('resize', function () { if (innerWidth !== lastW) { lastW = innerWidth; if (ready) relayout(); else spring.jump(spring.value); } });
    render(START);
    onView(barChart, intro, 0.45);
    return { replay: intro, set: setBar, get value() { return spring.value; }, get demo() { return { playing: demoing, done: demoDone, touched: touched }; } };
  })();

  
  function readProp(el, prop) {
    var cs = getComputedStyle(el);
    if (prop === 'opacity') return parseFloat(cs.opacity);
    var m = cs.transform; if (!m || m === 'none') return prop.indexOf('scale') === 0 ? 1 : 0;
    var v = m.match(/matrix(3d)?\(([^)]+)\)/)[2].split(',').map(parseFloat), is3d = v.length === 16;
    if (prop === 'translateY') return is3d ? v[13] : v[5];
    if (prop === 'translateX') return is3d ? v[12] : v[4];
    if (prop === 'scaleX') return v[0];
    if (prop === 'scaleY') return is3d ? v[5] : v[3];
    return NaN;
  }
  
  function verify() {
    prune();
    var results = M.registry.map(function (r) {
      var a = r.anim, was = a.playState, keep = a.currentTime, errs = [];
      a.pause();
      for (var i = 0; i <= 20; i++) {
        var f = i / 20; a.currentTime = r.delay + f * r.dur;
        var got = readProp(r.el, r.spec.prop), want = r.spec.from + (r.spec.to - r.spec.from) * C[r.curve].fn(f);
        errs.push(Math.pow((got - want) / (Math.abs(r.spec.to - r.spec.from) || 1), 2));
      }
      a.currentTime = keep; if (was === 'running') a.play();
      return { label: r.label, curve: r.curve, prop: r.spec.prop, rmse: +Math.sqrt(errs.reduce(function (s, e) { return s + e; }, 0) / errs.length).toFixed(5) };
    });
    return { results: results, fails: results.filter(function (r) { return !(r.rmse <= 0.01); }).length, layout: audit(), linear: linearOK };
  }
  function audit() {
    var bad = [], layout = /^(width|height|top|left|right|bottom|margin|padding|inset)/;
    document.getAnimations().forEach(function (a) {
      if (!a.effect || !a.effect.getKeyframes || !a.effect.target || !a.effect.target.closest || !a.effect.target.closest('.st-sec')) return;
      a.effect.getKeyframes().forEach(function (k) { Object.keys(k).forEach(function (p) { if (layout.test(p)) bad.push(p); }); });
    });
    return bad;
  }
  window.SyntheStory = { verify: verify, audit: audit, contrast: nightApi && nightApi.contrastCheck, M: M, night: nightApi, bar: barApi };
})();
