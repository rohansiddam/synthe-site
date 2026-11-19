
(function () {
  "use strict";
  var S = (window.SyntheMotion = {});

  
  function bezier(x1, y1, x2, y2) {
    function a(p1, p2) { return 1 - 3 * p2 + 3 * p1; }
    function b(p1, p2) { return 3 * p2 - 6 * p1; }
    function c(p1) { return 3 * p1; }
    function at(t, p1, p2) { return ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t; }
    function slope(t, p1, p2) { return 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1); }
    function solve(x) {
      var t = x;
      for (var i = 0; i < 8; i++) {
        var s = slope(t, x1, x2);
        if (Math.abs(s) < 1e-6) break;
        var d = at(t, x1, x2) - x;
        if (Math.abs(d) < 1e-7) return t;
        t -= d / s;
      }
      var lo = 0, hi = 1; t = x;
      for (var j = 0; j < 30; j++) {
        var v = at(t, x1, x2);
        if (Math.abs(v - x) < 1e-7) break;
        if (v < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return t;
    }
    return function (x) { return x <= 0 ? 0 : x >= 1 ? 1 : at(solve(x), y1, y2); };
  }
  function backOut(k) { return function (t) { t -= 1; return t * t * ((k + 1) * t + k) + 1; }; }
  var E = (S.ease = {
    linear: function (t) { return t; },
    sineOut: function (t) { return Math.sin((t * Math.PI) / 2); },
    sineInOut: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
    p2out: function (t) { return 1 - Math.pow(1 - t, 3); },
    p2in: function (t) { return t * t * t; },
    p3out: function (t) { return 1 - Math.pow(1 - t, 4); },
    expoOut: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    back16: backOut(1.6),
    back17: backOut(1.7),
    back2: backOut(2),
    
    quint: bezier(0.22, 1, 0.36, 1),
    snap: bezier(0.16, 1, 0.3, 1),
    glide: bezier(0.38, 0.005, 0.215, 1),
    swing: bezier(0.87, 0, 0.13, 1),
    soft: bezier(0.625, 0.05, 0, 1),
    bezier: bezier,
  });

  
  var states = new WeakMap();
  function st(el) {
    var s = states.get(el);
    if (!s) {
      s = { x: 0, y: 0, xu: "px", yu: "px", xPercent: 0, yPercent: 0, scaleX: 1, scaleY: 1, tf: false };
      
      var m = (getComputedStyle(el).transform || "").match(/^matrix(3d)?\((.+)\)$/);
      if (m) {
        var v = m[2].split(",").map(parseFloat);
        if (m[1]) { s.x = v[12]; s.y = v[13]; s.scaleX = Math.hypot(v[0], v[1]); s.scaleY = Math.hypot(v[4], v[5]); }
        else { s.x = v[4]; s.y = v[5]; s.scaleX = Math.hypot(v[0], v[1]); s.scaleY = Math.hypot(v[2], v[3]); }
      }
      states.set(el, s);
    }
    return s;
  }
  var TF = { x: 1, y: 1, xPercent: 1, yPercent: 1, scale: 1, scaleX: 1, scaleY: 1 };
  function num(v) { return Math.round(v * 1000) / 1000; }
  function renderTf(el, s) {
    var t = "";
    if (s.xPercent || s.yPercent) t += "translate(" + num(s.xPercent) + "%, " + num(s.yPercent) + "%) ";
    t += "translate(" + num(s.x) + s.xu + ", " + num(s.y) + s.yu + ")";
    if (s.scaleX !== 1 || s.scaleY !== 1) t += s.scaleX === s.scaleY ? " scale(" + num(s.scaleX) + ")" : " scale(" + num(s.scaleX) + ", " + num(s.scaleY) + ")";
    el.style.translate = "none"; el.style.rotate = "none"; el.style.scale = "none";
    el.style.transform = t;
  }
  function read(el, k) {
    var s = st(el);
    if (k === "scale") return s.scaleX;
    if (k in TF) return s[k];
    if (k === "opacity" || k === "autoAlpha") { var o = el.style.opacity; return o === "" ? parseFloat(getComputedStyle(el).opacity) : parseFloat(o); }
    if (k === "width" || k === "height") { var r = el.getBoundingClientRect(); return k === "width" ? r.width : r.height; }
    if (k.charAt(0) === "-") return parseFloat(el.style.getPropertyValue(k)) || 0;
    return parseFloat(el.style[k]) || 0;
  }
  function unitOf(v) { return typeof v === "string" && /%$/.test(v) ? "%" : "px"; }
  function write(el, k, v, unit) {
    var s = st(el);
    if (k in TF) {
      if (k === "scale") { s.scaleX = s.scaleY = v; }
      else { s[k] = v; if (k === "x") s.xu = unit || s.xu; if (k === "y") s.yu = unit || s.yu; }
      s.tf = true;
      return;
    }
    if (k === "autoAlpha") { el.style.opacity = num(v); el.style.visibility = v === 0 ? "hidden" : "inherit"; return; }
    if (k === "opacity") { el.style.opacity = num(v); return; }
    if (k === "width" || k === "height") { el.style[k] = num(v) + "px"; return; }
    if (k.charAt(0) === "-") { el.style.setProperty(k, String(num(v))); return; }
    el.style[k] = num(v) + "px";
  }
  function setProps(el, props) {
    var tf = false;
    for (var k in props) {
      var v = props[k];
      if (k === "transformOrigin") { el.style.transformOrigin = v; continue; }
      if (k in TF) tf = true;
      write(el, k, typeof v === "string" ? parseFloat(v) : v, unitOf(v));
    }
    if (tf) renderTf(el, st(el));
  }
  S.set = function (els, props) { list(els).forEach(function (el) { setProps(el, props); }); };
  S.clear = function (el) { states.delete(el); };
  S.get = function (el, k) { return read(el, k); };

  function list(els) {
    if (!els) return [];
    if (els.nodeType || els === window) return [els];
    return Array.prototype.slice.call(els).filter(Boolean);
  }

  
  var active = [];
  var raf = 0;
  function loop(now) {
    raf = 0;
    var snap = active.slice();
    for (var i = 0; i < snap.length; i++) {
      var tw = snap[i];
      if (tw.dead) continue;
      if (now < tw.start) continue;
      if (!tw.begun) {
        tw.begun = true;
        for (var k in tw.to) {
          if (!(k in tw.from)) tw.from[k] = read(tw.el, k);
        }
      }
      var p = tw.dur > 0 ? Math.min(1, (now - tw.start) / tw.dur) : 1;
      var e = tw.ease(p);
      var tf = false;
      for (var k2 in tw.to) {
        var a = tw.from[k2], b = tw.to[k2];
        write(tw.el, k2, a + (b - a) * e, tw.units[k2]);
        if (k2 in TF) tf = true;
      }
      if (tf) renderTf(tw.el, st(tw.el));
      if (tw.onUpdate) tw.onUpdate(p);
      if (p >= 1) {
        tw.dead = true;
        if (tw.onComplete) tw.onComplete();
      }
    }
    active = active.filter(function (t) { return !t.dead; });
    if (active.length) raf = requestAnimationFrame(loop);
  }
  S.kill = function (els, keys) {
    var arr = list(els);
    var ks = keys ? keys.split(",") : null;
    active.forEach(function (tw) {
      if (arr.indexOf(tw.el) < 0) return;
      if (!ks) { tw.dead = true; return; }
      ks.forEach(function (k) { delete tw.to[k.trim()]; });
      if (!Object.keys(tw.to).length) tw.dead = true;
    });
  };
  S.isActive = function (el, key) {
    return active.some(function (tw) { return !tw.dead && tw.el === el && (!key || key in tw.to); });
  };
  
  S.finish = function (els) {
    var arr = list(els);
    active.forEach(function (tw) {
      if (tw.dead || arr.indexOf(tw.el) < 0) return;
      var tf = false;
      for (var k in tw.to) { write(tw.el, k, tw.to[k], tw.units[k]); if (k in TF) tf = true; }
      if (tf) renderTf(tw.el, st(tw.el));
      tw.dead = true;
      if (tw.onComplete) tw.onComplete();
    });
  };
  S.to = function (els, to, opt) {
    opt = opt || {};
    var arr = list(els);
    var stagger = opt.stagger || 0;
    var made = [];
    arr.forEach(function (el, i) {
      if (opt.overwrite !== false) S.kill(el, Object.keys(to).join(","));
      var t = {}, units = {}, from = {};
      for (var k in to) { t[k] = typeof to[k] === "string" ? parseFloat(to[k]) : to[k]; units[k] = unitOf(to[k]); }
      if (opt.from) for (var f in opt.from) {
        from[f] = typeof opt.from[f] === "string" ? parseFloat(opt.from[f]) : opt.from[f];
        if (!(f in units)) units[f] = unitOf(opt.from[f]);
      }
      if (opt.from) setProps(el, opt.from);
      var isLast = i === arr.length - 1;
      var tw = {
        el: el, to: t, from: from, units: units,
        dur: (opt.duration || 0) * 1000,
        start: performance.now() + ((opt.delay || 0) + stagger * i) * 1000,
        ease: opt.ease || E.linear,
        onUpdate: opt.onUpdate && i === 0 ? opt.onUpdate : null,
        onComplete: isLast ? opt.onComplete : null,
      };
      if (tw.dur === 0 && !opt.delay && !(stagger * i)) {
        setProps(el, to);
        if (tw.onComplete) tw.onComplete();
        return;
      }
      active.push(tw);
      made.push(tw);
    });
    if (!arr.length && opt.onComplete) opt.onComplete();
    if (made.length && !raf) raf = requestAnimationFrame(loop);
    return made;
  };
  S.fromTo = function (els, from, to, opt) {
    opt = opt || {};
    opt.from = from;
    return S.to(els, to, opt);
  };
  S.delay = function (sec, fn) {
    var id = setTimeout(fn, sec * 1000);
    return { kill: function () { clearTimeout(id); } };
  };
  S.reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  S.d = function (sec) { return S.reduced.matches ? 0 : sec; };
})();
