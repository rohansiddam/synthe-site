
(function () {
  "use strict";
  var root = document.querySelector("[data-synav]");
  if (!root) return;

  var q = function (s, r) { return (r || document).querySelector(s); };
  var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  
  var PATHS = {
    settle: "M0,0 C0.08,0.38 0.18,0.80 0.38,0.92 C0.55,0.985 0.78,1 1,1",
    commit: "M0.0000,0.0000 C0.0214,0.0412 0.0873,0.0301 0.1282,0.0375 C0.1692,0.0447 0.2080,0.0590 0.2457,0.0856 C0.2834,0.1123 0.3170,0.1238 0.3545,0.1971 C0.3921,0.2704 0.4321,0.4122 0.4709,0.5254 C0.5097,0.6385 0.5499,0.8044 0.5873,0.8760 C0.6246,0.9476 0.6575,0.9360 0.6950,0.9550 C0.7326,0.9739 0.7617,0.9819 0.8125,0.9894 C0.8633,0.9970 0.9688,0.9982 1.0000,1.0000",
    draw: "M0.0000,0.0000 C0.0222,0.1660 0.0889,0.1762 0.1333,0.1941 C0.1778,0.2121 0.2222,0.2201 0.2667,0.2680 C0.3111,0.3158 0.3500,0.3857 0.4000,0.4810 C0.4500,0.5763 0.5167,0.7651 0.5667,0.8397 C0.6167,0.9143 0.6556,0.9051 0.7000,0.9283 C0.7444,0.9515 0.7833,0.9670 0.8333,0.9789 C0.8833,0.9909 0.9722,0.9965 1.0000,1.0000",
    exit: "M0,0 C0.45,0 0.8,0.35 1,1",
    fade: "M0,0 C0.25,0.4 0.4,1 1,1"
  };
  function bez(a, b, c, d, t) { var u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; }
  function curve(d) {
    var n = d.replace(/[MC]/g, " ").trim().split(/[\s,]+/).map(Number), segs = [], x0 = n[0], y0 = n[1];
    for (var i = 2; i + 5 < n.length; i += 6) { segs.push([x0, y0, n[i], n[i + 1], n[i + 2], n[i + 3], n[i + 4], n[i + 5]]); x0 = n[i + 4]; y0 = n[i + 5]; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      for (var s = 0; s < segs.length; s++) {
        var g = segs[s];
        if (x <= g[6] || s === segs.length - 1) {
          var lo = 0, hi = 1, t = 0.5;
          for (var k = 0; k < 32; k++) { t = (lo + hi) / 2; if (bez(g[0], g[2], g[4], g[6], t) < x) lo = t; else hi = t; }
          return bez(g[1], g[3], g[5], g[7], t);
        }
      }
      return 1;
    };
  }
  var linearOK = window.CSS && CSS.supports && CSS.supports("transition-timing-function", "linear(0, 1)");
  var EASE = {};
  Object.keys(PATHS).forEach(function (k) {
    var fn = curve(PATHS[k]), stops = [];
    for (var i = 0; i <= 40; i++) stops.push(+fn(i / 40).toFixed(4) + " " + +(i * 2.5).toFixed(1) + "%");
    EASE[k] = linearOK ? "linear(" + stops.join(", ") + ")" : { settle: "cubic-bezier(.12,.8,.3,1)", commit: "cubic-bezier(.7,0,.3,1)", draw: "cubic-bezier(.25,.6,.3,1)", exit: "cubic-bezier(.45,0,.8,.35)", fade: "cubic-bezier(.25,.4,.4,1)" }[k];
  });
  
  if (linearOK) {
    var st = document.createElement("style");
    st.textContent = ":root{" + ["settle", "commit", "draw", "exit"].map(function (k) { return "--ease-" + k + ":" + EASE[k]; }).join(";") + "}";
    document.head.appendChild(st);
  }

  var T = { exit: 180, settle: 520, commit: 640, draw: 280, intent: 90, grace: 140 };
  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = function () { return reduceMQ.matches; };
  var DESKTOP = window.matchMedia("(min-width: 992px)");
  function stagger(i, first) { var g = first, t = 0; for (var k = 0; k < i; k++) { t += g; g *= 0.75; } return Math.round(t); }

  
  function play(el, frames, o) {
    var dur = o.dur, delay = o.delay || 0;
    if (reduced()) {
      var fadeOnly = frames.every(function (f) { return Object.keys(f).every(function (k) { return k === "opacity" || k === "offset" || k === "backgroundColor"; }); });
      dur = fadeOnly ? 120 : 0; delay = 0;
    }
    return el.animate(frames, { duration: dur, delay: delay, easing: EASE[o.curve || "settle"], fill: "both" });
  }
  
  function handoff(el, keys) {
    var cs = getComputedStyle(el), snap = {}, kill = [];
    el.getAnimations().forEach(function (a) {
      var props = {};
      a.effect.getKeyframes().forEach(function (k) { Object.keys(k).forEach(function (p) { if (["offset", "easing", "composite", "computedOffset"].indexOf(p) < 0) props[p] = 1; }); });
      if (keys.some(function (k) { return props[k]; })) { Object.keys(props).forEach(function (p) { snap[p] = cs[p]; }); kill.push(a); }
    });
    Object.keys(snap).forEach(function (p) { el.style[p] = snap[p]; });
    kill.forEach(function (a) { a.cancel(); });
  }
  function to(el, target, o) {
    var cs = getComputedStyle(el), from = {}, keys = Object.keys(target);
    keys.forEach(function (k) { from[k] = cs[k] === "none" && k === "transform" ? "none" : cs[k]; });
    handoff(el, keys);
    return play(el, [from, target], o);
  }
  function ty(el) { var m = getComputedStyle(el).transform; if (!m || m === "none") return 0; var v = m.match(/\(([^)]+)\)/)[1].split(",").map(parseFloat); return v.length === 16 ? v[13] : v[5]; }
  function sx(el) { var m = getComputedStyle(el).transform; if (!m || m === "none") return 1; return parseFloat(m.match(/\(([^)]+)\)/)[1].split(",")[0]); }
  function op(el) { return parseFloat(getComputedStyle(el).opacity); }
  function done(a, fn) { a.finished.then(fn, function () {}); }
  
  function shut(el, on) { el.inert = on; if (on) el.setAttribute("inert", ""); else el.removeAttribute("inert"); }
  
  function clipB(el) {
    var cp = getComputedStyle(el).clipPath || "";
    if (!cp || cp === "none") return 0;
    if (cp.indexOf("%") >= 0) return el.offsetHeight; 
    var m = cp.match(/inset\(([^)]*?)(?:round|\))/);
    if (!m) return 0;
    var n = m[1].trim().split(/\s+/).map(parseFloat);
    return n.length >= 3 ? n[2] : n[0] || 0;
  }
  
  function hang(el, open, fresh) {
    var R = " round " + getComputedStyle(el).borderTopLeftRadius + ")";
    var h = el.offsetHeight || 1, b0 = fresh ? h : clipB(el), y0 = fresh ? -8 : ty(el);
    handoff(el, ["transform", "clipPath", "opacity"]);
    if (reduced()) {
      var o0 = fresh ? 0 : op(el);
      el.style.transform = ""; el.style.clipPath = "inset(0px 0px 0px 0px" + R;
      return play(el, [{ opacity: o0 }, { opacity: open ? 1 : 0 }], { dur: 120, curve: "fade" });
    }
    el.style.opacity = "";
    var b1 = open ? 0 : h, y1 = open ? 0 : -8;
    return play(el, [
      { transform: "translateY(" + y0.toFixed(2) + "px)", clipPath: "inset(0px 0px " + b0.toFixed(1) + "px 0px" + R },
      { transform: "translateY(" + y1 + "px)", clipPath: "inset(0px 0px " + b1.toFixed(1) + "px 0px" + R }
    ], open ? { dur: T.settle, curve: "settle" } : { dur: T.exit, curve: "exit" });
  }

  
  function follow(x0, onUpdate) {
    var k = 170, c = 26, w = 9, x = x0, v = 0, target = x0, aim = x0, av = 0, raf = 0, last = 0, eps = 0.01;
    function step(now) {
      var dt = Math.min(0.05, (now - (last || now - 16.67)) / 1000); last = now;
      
      for (var h; dt > 1e-6; dt -= h) {
        h = Math.min(0.004, dt);
        av += (-w * w * (aim - target) - 2 * w * av) * h; aim += av * h;
        v += (-k * (x - aim) - c * v) * h; x += v * h;
      }
      if (Math.abs(x - target) < eps && Math.abs(v) < eps * 10 && Math.abs(aim - target) < eps && Math.abs(av) < eps * 10) { x = aim = target; v = av = 0; onUpdate(); raf = 0; last = 0; return; }
      onUpdate(); raf = requestAnimationFrame(step);
    }
    return {
      set: function (t) { target = t; if (reduced()) { x = aim = t; v = av = 0; onUpdate(); return; } if (!raf) { last = 0; raf = requestAnimationFrame(step); } },
      jump: function (t) { if (raf) { cancelAnimationFrame(raf); raf = 0; } target = aim = x = t; v = av = 0; last = 0; onUpdate(); },
      get value() { return x; }
    };
  }

  var bar = q(".synav-bar", root);
  var items = qa("[data-synav-item]", root);
  var list = q(".synav-items", root);
  var marker = q(".synav-marker", root), markerIn = q(".synav-marker-in", root);
  var productBtn = q('[aria-controls="synav-product"]', root);
  var drop = q("[data-synav-drop]", root), panel = drop && q(".synav-panel", drop);
  var current = items.filter(function (it) { return it.getAttribute("aria-current") === "page"; })[0] || null;
  var mouseLike = function (e) { return e.pointerType === "mouse" || e.pointerType === "pen"; };

  
  var held = null, hot = false, hotT = 0, restT = 0;
  function paint() { marker.style.transform = "translate3d(" + xs.value.toFixed(2) + "px,0,0) scaleX(" + Math.max(0, ws.value / 100).toFixed(4) + ")"; }
  var xs = follow(0, paint), ws = follow(0, paint);
  function boxOf(it) {
    var l = q(".synav-label", it).getBoundingClientRect(), b = bar.getBoundingClientRect();
    return { x: l.left - b.left - bar.clientLeft, w: l.width };
  }
  function shown() { return visible(marker) && sx(markerIn) > 0.02; }
  function visible(el) { return el.getClientRects().length > 0 && getComputedStyle(el).display !== "none"; }
  function lift(it, up) {
    if (!it) return;
    it.classList.toggle("is-held", up);
    var lab = q(".synav-label", it), to2 = up && !reduced() ? -2 : 0;
    if (Math.abs(ty(lab) - to2) < 0.01) return;
    to(lab, { transform: "translateY(" + to2 + "px)" }, { dur: T.settle, curve: "settle" });
  }
  function drawIn() {
    var from = sx(markerIn);
    handoff(markerIn, ["transform", "opacity"]);
    if (reduced()) { markerIn.style.transform = "scaleX(1)"; play(markerIn, [{ opacity: op(markerIn) < 1 ? 0 : 1 }, { opacity: 1 }], { dur: 120, curve: "fade" }); return; }
    markerIn.style.opacity = "1";
    play(markerIn, [{ transform: "scaleX(" + from + ")" }, { transform: "scaleX(1)" }], { dur: T.draw, curve: "draw" });
  }
  function hold(it) {
    clearTimeout(restT);
    if (!it || held === it) return;
    var was = shown();
    lift(held, false); held = it; lift(it, true);
    var b = boxOf(it);
    if (was) { xs.set(b.x); ws.set(b.w); if (sx(markerIn) < 0.999) drawIn(); }
    else { xs.jump(b.x); ws.jump(b.w); drawIn(); }
  }
  function retract() {
    lift(held, false); held = null;
    if (reduced()) { handoff(markerIn, ["opacity"]); play(markerIn, [{ opacity: op(markerIn) }, { opacity: 0 }], { dur: 120, curve: "fade" }); return; }
    to(markerIn, { transform: "scaleX(0)" }, { dur: T.exit, curve: "exit" });
  }
  function rest() {
    clearTimeout(restT);
    if (dropOpen()) return hold(productBtn);
    if (current && visible(current)) hold(current); else if (held) retract();
  }
  function restSoon() { clearTimeout(restT); restT = setTimeout(rest, 60); }
  function remeasure() {
    if (!held) return;
    if (!visible(held)) { held.classList.remove("is-held"); held = null; markerIn.getAnimations().forEach(function (a) { a.cancel(); }); markerIn.style.transform = "scaleX(0)"; return; }
    var b = boxOf(held); xs.jump(b.x); ws.jump(b.w);
  }

  items.forEach(function (it) {
    it.addEventListener("pointerenter", function (e) {
      if (!mouseLike(e)) return;
      clearTimeout(closeT); clearTimeout(restT);
      if (hot) return enter(it);
      clearTimeout(hotT);
      hotT = setTimeout(function () { hot = true; enter(it); }, T.intent);
    });
    it.addEventListener("focus", function () { hold(it); });
  });
  list.addEventListener("pointerleave", function (e) {
    if (!mouseLike(e)) return;
    clearTimeout(hotT); hot = false;
    if (dropOpen()) closeSoon(); else restSoon();
  });
  list.addEventListener("focusout", function (e) {
    if (!list.contains(e.relatedTarget) && !(drop && drop.contains(e.relatedTarget))) restSoon();
  });
  function enter(it) {
    hold(it);
    if (it === productBtn) openDrop("hover");
    else if (dropOpen()) closeSoon();
  }

  
  var openBy = null, closeT = 0;
  function dropOpen() { return !!drop && drop.classList.contains("is-open"); }
  function placeDrop() {
    var b = boxOf(productBtn), br = bar.getBoundingClientRect();
    var x = br.left + bar.clientLeft + b.x - 18;
    var w = panel.getBoundingClientRect().width || 660;
    x = Math.max(16, Math.min(x, window.innerWidth - w - 16));
    drop.style.setProperty("--synav-drop-x", x.toFixed(1) + "px");
  }
  function openDrop(by) {
    if (!drop || !DESKTOP.matches) return;
    clearTimeout(closeT);
    if (dropOpen()) { if (by !== "hover") openBy = by; return; }
    var wasHidden = !drop.classList.contains("is-shown");
    openBy = by;
    drop.classList.add("is-shown", "is-open"); shut(drop, false);
    productBtn.setAttribute("aria-expanded", "true");
    hold(productBtn);
    placeDrop();
    hang(panel, true, wasHidden);
    if (wasHidden) requestAnimationFrame(function () { if (dropOpen()) chartIn(q(".synav-night", panel)); });
  }
  function closeDrop(focusBack) {
    clearTimeout(closeT);
    if (!dropOpen()) return;
    drop.classList.remove("is-open");
    productBtn.setAttribute("aria-expanded", "false");
    openBy = null;
    var a = hang(panel, false);
    done(a, function () { if (!dropOpen()) { drop.classList.remove("is-shown"); shut(drop, true); } });
    if (focusBack) productBtn.focus();
    if (held === productBtn && !productBtn.matches(":focus") && !productBtn.matches(":hover")) rest();
  }
  function closeSoon() { clearTimeout(closeT); closeT = setTimeout(function () { closeDrop(false); rest(); }, T.grace); }

  
  function chartIn(card) {
    if (!card || reduced()) return;
    var line = q(".synav-barline", card), cols = qa(".synav-col", card);
    play(line, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { dur: 420, delay: 60, curve: "draw" });
    cols.forEach(function (c, i) {
      play(c, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { dur: T.settle, delay: 100 + stagger(i, 60), curve: "settle" });
      var fill = q("i", c);
      if (fill) play(fill, [{ opacity: 0 }, { opacity: 1 }], { dur: 420, delay: 100 + stagger(i, 60) + 260, curve: "commit" });
    });
  }

  if (drop && productBtn) {
    productBtn.addEventListener("click", function (e) {
      if (!dropOpen()) return openDrop(e.detail === 0 ? "key" : "click");
      if (openBy === "hover" && e.detail !== 0) { openBy = "click"; return; } 
      closeDrop(false);
    });
    drop.addEventListener("pointerenter", function (e) { if (mouseLike(e)) { clearTimeout(closeT); clearTimeout(restT); } });
    drop.addEventListener("pointerleave", function (e) { if (mouseLike(e) && openBy === "hover") closeSoon(); else if (mouseLike(e)) restSoon(); });
    productBtn.addEventListener("keydown", function (e) {
      if (!dropOpen()) return;
      if ((e.key === "Tab" && !e.shiftKey) || e.key === "ArrowDown") {
        var first = q("a", panel); if (first) { e.preventDefault(); first.focus(); }
      }
    });
    drop.addEventListener("keydown", function (e) {
      var links = qa("a", panel), i = links.indexOf(document.activeElement);
      if (e.key === "Escape") { e.preventDefault(); closeDrop(true); return; }
      if (e.key === "Tab" && e.shiftKey && i === 0) { e.preventDefault(); productBtn.focus(); return; }
      if (e.key === "Tab" && !e.shiftKey && i === links.length - 1) {
        var next = items[items.indexOf(productBtn) + 1];
        if (next) { e.preventDefault(); closeDrop(false); next.focus(); }
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); links[(i + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length].focus(); }
    });
    drop.addEventListener("focusout", function (e) { if (!drop.contains(e.relatedTarget) && e.relatedTarget !== productBtn) { closeDrop(false); restSoon(); } });
    productBtn.addEventListener("focusout", function (e) { if (dropOpen() && !drop.contains(e.relatedTarget)) closeDrop(false); });
    drop.addEventListener("click", function (e) { if (e.target.closest("a")) closeDrop(false); });
  }

  
  var toggle = q(".synav-toggle", root), sheet = q("[data-synav-sheet]", root);
  var layers = sheet ? qa("[data-synav-layer]", sheet) : [];
  var sheetIn = sheet && q(".synav-sheet-in", sheet);
  
  function unclip() { sheetIn.getAnimations().forEach(function (a) { a.finish(); a.cancel(); }); sheetIn.style.minHeight = ""; sheetIn.style.clipPath = ""; sheetIn.style.transform = ""; }
  var layerOf = function (n) { return layers.filter(function (l) { return l.getAttribute("data-synav-layer") === n; })[0]; };
  function sheetOpen() { return !!sheet && sheet.classList.contains("is-open"); }
  function setLayer(n) {
    layers.forEach(function (l) {
      var on = l.getAttribute("data-synav-layer") === n;
      l.inert = !on; if (!on) l.setAttribute("inert", ""); else l.removeAttribute("inert");
      l.classList.remove("is-leaving");
      l.getAnimations().forEach(function (a) { a.cancel(); });
    });
    if (sheetIn) unclip();
  }
  function openSheet() {
    if (!sheet) return;
    var wasHidden = !sheet.classList.contains("is-shown");
    sheet.classList.add("is-shown", "is-open"); shut(sheet, false);
    toggle.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("synav-locked");
    if (wasHidden) setLayer("main");
    hang(sheetIn, true, wasHidden);
    if (wasHidden && !reduced()) {
      qa(".synav-rows > li, .synav-sheet-cta", layerOf("main")).forEach(function (el, i) {
        play(el, [{ transform: "translateY(8px)", opacity: 0 }, { transform: "translateY(0px)", opacity: 1 }], { dur: T.settle, delay: 40 + stagger(i, 50), curve: "settle" });
      });
    }
  }
  function closeSheet(focusBack) {
    if (!sheetOpen()) return;
    sheet.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("synav-locked");
    var a = hang(sheetIn, false);
    done(a, function () { if (!sheetOpen()) { sheet.classList.remove("is-shown"); shut(sheet, true); setLayer("main"); } });
    if (focusBack) toggle.focus();
  }
  function slideTo(n) {
    var next = layerOf(n), prev = layers.filter(function (l) { return !l.hasAttribute("inert"); })[0];
    if (!next || next === prev) return;
    var dir = n === "main" ? -1 : 1;
    var h0 = sheetIn.offsetHeight - clipB(sheetIn);
    unclip();
    prev.setAttribute("inert", ""); prev.inert = true; prev.classList.add("is-leaving");
    next.removeAttribute("inert"); next.inert = false; next.classList.remove("is-leaving");
    
    var h1 = sheetIn.offsetHeight;
    if (Math.abs(h1 - h0) > 0.5 && !reduced()) {
      var H = Math.max(h0, h1), r = " round " + getComputedStyle(sheetIn).borderTopLeftRadius + ")";
      sheetIn.style.minHeight = H + "px";
      var grow = play(sheetIn, [{ clipPath: "inset(0px 0px " + (H - h0).toFixed(1) + "px 0px" + r }, { clipPath: "inset(0px 0px " + (H - h1).toFixed(1) + "px 0px" + r }], { dur: T.settle, curve: "settle" });
      done(grow, unclip);
    }
    handoff(prev, ["transform", "opacity"]); handoff(next, ["transform", "opacity"]);
    var out = play(prev, [{ transform: "translateX(0px)", opacity: op(prev) }, { transform: "translateX(" + (-24 * dir) + "px)", opacity: 0 }], { dur: T.exit, curve: "exit" });
    done(out, function () { prev.classList.remove("is-leaving"); });
    play(next, [{ transform: "translateX(" + (24 * dir) + "px)" }, { transform: "translateX(0px)" }], { dur: T.settle, curve: "settle" });
    play(next, [{ opacity: 0 }, { opacity: 1 }], { dur: Math.round(T.settle * 0.4), delay: 120, curve: "fade" });
    var focusEl = n === "main" ? q('[data-synav-to="product"]', next) : q(".synav-back", next);
    if (focusEl) focusEl.focus({ preventScroll: true });
    sheet.scrollTop = 0;
    if (n !== "main") chartIn(q(".synav-night", next));
  }
  if (toggle && sheet) {
    toggle.addEventListener("click", function () { if (sheetOpen()) closeSheet(false); else openSheet(); });
    qa("[data-synav-to]", sheet).forEach(function (b) { b.addEventListener("click", function () { slideTo(b.getAttribute("data-synav-to")); }); });
    sheet.addEventListener("click", function (e) { if (e.target.closest("a")) closeSheet(false); });
    root.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheetOpen()) { e.preventDefault(); closeSheet(true); } });
  }

  
  var logo = q("[data-synav-logo]", root), bmenu = q(".synav-brandmenu", root);
  var markA = q(".synav-mark-a", root), markB = q(".synav-mark-b", root);
  
  var U = (function () { var dx = 153.752 - 209.151, dy = 233.165 - 160.735, l = Math.hypot(dx, dy); return [dx / l, dy / l]; })();
  var PART = 16; 
  var WORDMARK = "M6.92 21.16Q5.69 21.16 4.70 20.88Q3.70 20.60 2.96 20.10Q2.21 19.60 1.73 18.99Q1.25 18.37 1.05 17.69L3.15 17.00Q3.47 17.90 4.40 18.57Q5.32 19.23 6.67 19.25Q8.29 19.25 9.23 18.59Q10.16 17.94 10.16 16.86Q10.16 15.88 9.35 15.25Q8.53 14.63 7.18 14.29L5.41 13.83Q4.34 13.56 3.48 13.02Q2.62 12.49 2.11 11.67Q1.61 10.86 1.61 9.73Q1.61 7.60 2.98 6.42Q4.35 5.23 6.94 5.23Q8.44 5.23 9.54 5.71Q10.65 6.18 11.35 6.95Q12.06 7.73 12.37 8.65L10.29 9.34Q9.91 8.35 9.01 7.75Q8.10 7.14 6.78 7.14Q5.41 7.14 4.61 7.80Q3.81 8.46 3.81 9.60Q3.81 10.58 4.44 11.10Q5.07 11.61 6.11 11.88L7.89 12.31Q10.06 12.83 11.23 14.06Q12.40 15.28 12.40 16.73Q12.40 17.99 11.77 19.00Q11.15 20.00 9.93 20.58Q8.71 21.16 6.92 21.16Z M15.81 25.56Q15.34 25.56 14.75 25.38Q14.15 25.20 13.55 24.92L14.32 23.20Q14.80 23.42 15.16 23.53Q15.52 23.64 15.75 23.64Q16.30 23.64 16.69 23.34Q17.07 23.04 17.31 22.48L18.58 19.46L22.49 9.89H24.74L19.54 22.26Q19.11 23.28 18.65 24.02Q18.19 24.76 17.52 25.16Q16.85 25.56 15.81 25.56ZM18.02 20.9 13.19 9.89H15.43L19.39 19.45L20.05 20.9Z M25.92 20.9V9.89H27.87L28.00 11.92V20.9ZM33.53 20.9V15.26H35.60V20.9ZM33.53 15.26Q33.53 13.78 33.18 12.99Q32.83 12.19 32.23 11.89Q31.62 11.58 30.85 11.58Q29.49 11.56 28.74 12.51Q28.00 13.45 28.00 15.18H27.11Q27.11 13.43 27.62 12.19Q28.13 10.95 29.09 10.29Q30.05 9.63 31.38 9.63Q32.67 9.63 33.62 10.15Q34.57 10.68 35.10 11.79Q35.62 12.91 35.60 14.71V15.26Z M42.07 21.16Q40.40 21.16 39.50 20.31Q38.61 19.46 38.61 17.89V6.46H40.68V17.58Q40.68 18.39 41.10 18.81Q41.51 19.24 42.27 19.24Q42.51 19.24 42.77 19.16Q43.02 19.07 43.41 18.80L44.19 20.44Q43.62 20.82 43.10 20.99Q42.59 21.16 42.07 21.16ZM36.74 11.70V9.89H43.83V11.70Z M45.84 20.9V5.5H47.92V20.9ZM53.45 20.9V15.26H55.53V20.9ZM53.45 15.26Q53.45 13.78 53.10 12.99Q52.76 12.19 52.15 11.89Q51.55 11.58 50.77 11.58Q49.41 11.56 48.67 12.51Q47.92 13.45 47.92 15.18H47.03Q47.03 13.43 47.54 12.19Q48.05 10.95 49.01 10.29Q49.97 9.63 51.30 9.63Q52.60 9.63 53.55 10.15Q54.50 10.68 55.02 11.79Q55.54 12.91 55.53 14.71V15.26Z M62.59 21.16Q60.98 21.16 59.75 20.42Q58.51 19.68 57.81 18.39Q57.10 17.09 57.10 15.39Q57.10 13.70 57.81 12.40Q58.52 11.11 59.76 10.37Q61.00 9.63 62.61 9.63Q64.11 9.63 65.27 10.39Q66.42 11.15 67.07 12.54Q67.72 13.94 67.72 15.84H58.83L59.22 15.50Q59.22 16.68 59.68 17.53Q60.14 18.38 60.94 18.84Q61.74 19.29 62.74 19.29Q63.83 19.29 64.57 18.78Q65.31 18.26 65.72 17.45L67.54 18.29Q67.10 19.16 66.40 19.81Q65.69 20.45 64.74 20.81Q63.78 21.16 62.59 21.16ZM59.35 14.51 58.94 14.18H65.90L65.49 14.53Q65.49 13.54 65.09 12.85Q64.69 12.17 64.03 11.80Q63.37 11.44 62.56 11.44Q61.77 11.44 61.03 11.80Q60.29 12.17 59.82 12.85Q59.35 13.53 59.35 14.51Z"; 
  function markSVG(withWord) {
    var a = markA.getAttribute("d"), b = markB.getAttribute("d");
    var paths = '<path fill="#171410" d="' + a + '"/><path fill="#b5412f" d="' + b + '"/>';
    if (!withWord) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 275 290" width="275" height="290"><title>Synthe mark</title>' + paths + "</svg>\n";
    
    var s = 28 / 290;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 103 28" width="412" height="112"><title>Synthe</title>' +
      '<g transform="scale(' + s.toFixed(6) + ')">' + paths + "</g>" +
      '<path fill="#171410" transform="translate(34.55 0.8)" d="' + WORDMARK + '"/></svg>\n';
  }
  function coloursText() {
    var cs = getComputedStyle(document.documentElement);
    var rows = [["Canvas", "--canvas"], ["Stone", "--stone"], ["Blush", "--blush"], ["Sage", "--sage"], ["Morning", "--morning"], ["Raised", "--raised"], ["Ink", "--ink"], ["Ink 2", "--ink-2"], ["Ink 3", "--ink-3"], ["Red", "--red"], ["Signal", "--signal"], ["Moss", "--moss"]];
    var out = ["Synthe brand colours", ""];
    rows.forEach(function (r) { var v = cs.getPropertyValue(r[1]).trim(); if (v) out.push((r[0] + "        ").slice(0, 9) + v + "   " + r[1]); });
    out.push("Mark ink #171410", "Mark red #b5412f");
    return out.join("\n") + "\n";
  }
  function copy(text) {
    function fallback() {
      try {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch (err) { return false; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }

  var bmOpen = false, bmTimer = 0;
  function part(apart) {
    if (!markA || !markB) return;
    var d = apart ? PART : 0;
    var ax = (-U[0] * d).toFixed(2), ay = (-U[1] * d).toFixed(2), bx = (U[0] * d).toFixed(2), by = (U[1] * d).toFixed(2);
    var o = apart ? { dur: T.settle, curve: "settle" } : { dur: T.commit, curve: "commit" };
    to(markA, { transform: "translate(" + ax + "px, " + ay + "px)" }, o);
    to(markB, { transform: "translate(" + bx + "px, " + by + "px)" }, o);
  }
  function openBM(byKey) {
    if (!bmenu) return;
    clearTimeout(bmTimer);
    closeDrop(false); closeSheet(false);
    var wasHidden = !bmenu.classList.contains("is-shown");
    bmenu.classList.add("is-shown"); shut(bmenu, false); bmOpen = true;
    var brand = logo.parentNode.getBoundingClientRect(), br = bar.getBoundingClientRect();
    bmenu.style.top = (br.bottom - brand.top + 8).toFixed(1) + "px";
    var y0 = wasHidden ? -8 : ty(bmenu), o0 = wasHidden ? 0 : op(bmenu);
    handoff(bmenu, ["transform", "opacity"]);
    play(bmenu, [{ transform: "translateY(" + y0 + "px)" }, { transform: "translateY(0px)" }], { dur: T.settle, curve: "settle" });
    play(bmenu, [{ opacity: o0 }, { opacity: 1 }], { dur: Math.round(T.settle * 0.4 * (1 - o0)) || 1, curve: "fade" });
    part(true);
    
    var first = q(".synav-bm", bmenu);
    if (byKey) { if (first) first.focus({ preventScroll: true }); }
    else bmenu.focus({ preventScroll: true });
  }
  function closeBM(focusBack) {
    if (!bmOpen) return;
    bmOpen = false; clearTimeout(bmTimer);
    var a = reduced() ? to(bmenu, { opacity: 0 }, { dur: 120, curve: "fade" }) : to(bmenu, { transform: "translateY(-8px)", opacity: 0 }, { dur: T.exit, curve: "exit" });
    done(a, function () { if (!bmOpen) { bmenu.classList.remove("is-shown"); shut(bmenu, true); qa(".synav-bm.is-done", bmenu).forEach(function (b) { b.classList.remove("is-done"); }); } });
    part(false);
    if (focusBack) logo.focus({ preventScroll: true });
  }
  if (logo && bmenu) {
    var lastPress = 0;
    bmenu.setAttribute("tabindex", "-1");
    logo.addEventListener("pointerdown", function () { lastPress = performance.now(); });
    logo.addEventListener("contextmenu", function (e) { e.preventDefault(); if (bmOpen) closeBM(true); else openBM(performance.now() - lastPress > 800); });
    bmenu.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    var status = q(".synav-bm-status", bmenu);
    qa("[data-copy]", bmenu).forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-copy");
        var text = k === "colours" ? coloursText() : markSVG(k === "wordmark");
        copy(text).then(function (ok) {
          if (!ok) { status.textContent = "Copy is blocked in this browser."; return; }
          qa(".synav-bm.is-done", bmenu).forEach(function (o) { o.classList.remove("is-done"); });
          b.classList.add("is-done");
          status.textContent = "Copied " + q(".synav-bm-label", b).textContent.replace(/^Copy /, "").toLowerCase();
          clearTimeout(bmTimer);
          bmTimer = setTimeout(function () { closeBM(true); }, 1600);
        });
      });
    });
    bmenu.addEventListener("click", function (e) { if (e.target.closest("a")) closeBM(false); });
    bmenu.addEventListener("keydown", function (e) {
      var its = qa(".synav-bm", bmenu), i = its.indexOf(document.activeElement);
      if (e.key === "Escape") { e.preventDefault(); closeBM(true); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); its[(i + (e.key === "ArrowDown" ? 1 : -1) + its.length) % its.length].focus(); }
      else if (e.key === "Home" || e.key === "End") { e.preventDefault(); its[e.key === "Home" ? 0 : its.length - 1].focus(); }
      else if (e.key === "Tab") closeBM(false);
    });
  }

  
  
  [drop, sheet, bmenu].forEach(function (el) { if (el) { shut(el, true); el.hidden = false; } });
  document.addEventListener("pointerdown", function (e) {
    var t = e.target;
    if (dropOpen() && !drop.contains(t) && !productBtn.contains(t)) { closeDrop(false); rest(); }
    if (sheetOpen() && !sheet.contains(t) && !toggle.contains(t)) closeSheet(false);
    if (bmOpen && !bmenu.contains(t) && !logo.contains(t)) closeBM(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (dropOpen()) closeDrop(productBtn === document.activeElement || drop.contains(document.activeElement));
  });
  var rz = 0;
  window.addEventListener("resize", function () {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(function () {
      if (!DESKTOP.matches) closeDrop(false); else { closeSheet(false); if (dropOpen()) placeDrop(); }
      remeasure();
      if (!held) rest();
    });
  });
  var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () { remeasure(); rest(); });
})();
