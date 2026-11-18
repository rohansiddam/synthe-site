/* Synthe homepage modules: logo-menu popover, install tooltip, copy
   buttons, the drifting tool wall, the goal box typewriter and chips,
   the goal box pulse, and the cycling text-selection colour.
   Needs motion.js. Each module mounts on its data-module element. */
(function () {
  "use strict";
  var M = window.SyntheMotion;
  if (!M) return;
  var E = M.ease;
  var RM = M.reduced.matches; // snapshot at load, like the rest of the page
  var q = function (s, r) { return (r || document).querySelector(s); };
  var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var mods = function (name) { return qa('[data-module="' + name + '"]'); };

  /* ---------- logo menu: right-click (or long-press) the logo ---------- */
  mods("brand-menu").forEach(function (root) {
    var bm = function (n) { return '[data-brand-menu="' + n + '"], [brand-menu="' + n + '"]'; };
    var trigger = q(bm("trigger"), root) || q("a", root);
    var menu = q(bm("menu"), root);
    if (!trigger || !menu) return;
    var actions = qa(bm("copy"), menu).concat(qa(bm("download"), menu));
    var items = qa("button, a[href]", menu);
    if (!menu.id) menu.id = "brand-menu-" + Math.random().toString(36).slice(2, 8);
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-controls", menu.id);
    trigger.setAttribute("aria-expanded", "false");
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-hidden", "true");
    items.forEach(function (i) { i.setAttribute("role", "menuitem"); i.setAttribute("tabindex", "-1"); });
    actions.forEach(function (a) { if (a.tagName === "BUTTON" && !a.hasAttribute("type")) a.setAttribute("type", "button"); });
    var open = false;
    var bar = root.closest("nav") || root;
    M.set(menu, { transformOrigin: "top left", autoAlpha: 0, scale: 0.94, y: -6 });
    function place() {
      var host = menu.offsetParent || root;
      menu.style.top = bar.getBoundingClientRect().bottom - host.getBoundingClientRect().top + 8 + "px";
    }
    function show() {
      if (open) return;
      open = true; place();
      menu.classList.add("is--open");
      menu.setAttribute("aria-hidden", "false"); trigger.setAttribute("aria-expanded", "true");
      items.forEach(function (i) { i.setAttribute("tabindex", "0"); });
      M.fromTo(menu, { autoAlpha: 0, scale: 0.94, y: -6 }, { autoAlpha: 1, scale: 1, y: 0 }, { duration: RM ? 0 : 0.35, ease: E.back16 });
    }
    function hide(refocus) {
      if (!open) return;
      open = false;
      menu.classList.remove("is--open", "is--active");
      menu.setAttribute("aria-hidden", "true"); trigger.setAttribute("aria-expanded", "false");
      items.forEach(function (i) { i.setAttribute("tabindex", "-1"); });
      M.to(menu, { autoAlpha: 0, scale: 0.94, y: -6 }, { duration: RM ? 0 : 0.2, ease: E.p2in });
      if (refocus) trigger.focus();
    }
    trigger.addEventListener("contextmenu", function (e) { e.preventDefault(); if (open) hide(); else show(); });
    var press = null;
    var cancelPress = function () { if (press) { clearTimeout(press); press = null; } };
    trigger.addEventListener("touchstart", function () { cancelPress(); press = setTimeout(function () { press = null; show(); }, 500); }, { passive: true });
    ["touchend", "touchmove", "touchcancel"].forEach(function (t) { trigger.addEventListener(t, cancelPress, { passive: true }); });
    trigger.addEventListener("click", function (e) { if (!open || e.detail === 0) return; e.preventDefault(); hide(); });
    trigger.addEventListener("keydown", function (e) {
      if (!(e.key === "ContextMenu" || ((e.key === "Enter" || e.key === " ") && e.shiftKey) || (e.key === "ArrowDown" && e.altKey))) return;
      e.preventDefault(); show(); if (items[0]) items[0].focus();
    });
    menu.addEventListener("keydown", function (e) {
      if (!open || !items.length) return;
      var i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === "Home") { e.preventDefault(); items[0].focus(); }
      else if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
      else if (e.key === "Tab") hide();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) { e.preventDefault(); hide(true); } });
    var inside = function (t) { return t && (trigger.contains(t) || menu.contains(t)); };
    document.addEventListener("pointerdown", function (e) { if (open && !inside(e.target)) hide(); });
    document.addEventListener("contextmenu", function (e) { if (open && !inside(e.target)) hide(); });
    window.addEventListener("scroll", function () { hide(); }, { passive: true });

    var parts = function (b) { return { label: q(bm("label"), b), done: q(bm("done"), b) }; };
    var flip = function (b, doneOn, animate) {
      var p = parts(b);
      if (!p.label || !p.done) return;
      var t = animate && !RM ? 0.35 : 0;
      M.to(p.label, { yPercent: doneOn ? -100 : 0, autoAlpha: doneOn ? 0 : 1 }, { duration: t, ease: E.expoOut });
      M.to(p.done, { yPercent: doneOn ? 0 : 100, autoAlpha: doneOn ? 1 : 0 }, { duration: t, ease: E.expoOut });
    };
    actions.forEach(function (b) { flip(b, false, false); });
    var timers = new Map();
    var confirm = function (b) {
      clearTimeout(timers.get(b));
      b.classList.add("is--active"); flip(b, true, true);
      timers.set(b, setTimeout(function () { b.classList.remove("is--active"); flip(b, false, true); timers.delete(b); }, 1200));
    };
    var asPng = function (src) {
      return fetch(src).then(function (r) {
        if (!r.ok) throw new Error("fetch " + r.status);
        return r.blob();
      }).then(function (blob) {
        if (blob.type === "image/png") return blob;
        return createImageBitmap(blob).then(function (bmp) {
          var c = document.createElement("canvas");
          c.width = bmp.width; c.height = bmp.height;
          c.getContext("2d").drawImage(bmp, 0, 0);
          return new Promise(function (res, rej) { c.toBlob(function (b2) { if (b2) res(b2); else rej(new Error("toBlob")); }, "image/png"); });
        });
      });
    };
    qa(bm("copy"), menu).forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        var src = b.dataset.src;
        if (!src) return;
        if (!navigator.clipboard || typeof ClipboardItem === "undefined") { window.open(src, "_blank", "noopener"); return; }
        navigator.clipboard.write([new ClipboardItem({ "image/png": asPng(src) })]).then(function () { confirm(b); }, function () { window.open(src, "_blank", "noopener"); });
      });
    });
    qa(bm("download"), menu).forEach(function (b) {
      b.addEventListener("click", function (e) {
        var src = b.dataset.src;
        if (b.tagName !== "A" && src) { e.preventDefault(); window.open(src, "_blank", "noopener"); }
        confirm(b);
      });
    });
  });

  /* ---------- copy: click a trigger, copy its target's text ---------- */
  var successShown = new Map();
  mods("copy").forEach(function (root) {
    var triggers = [root].concat(qa("[data-copy-trigger]", root)).filter(function (t) { return t.hasAttribute("data-copy-trigger"); });
    if (!triggers.length) return;
    var target = function (k) { return q('[data-copy-target="' + k + '"]', root) || q('[data-copy-target="' + k + '"]'); };
    var success = function (k) { return q('[data-copy-success="' + k + '"]', root) || q('[data-copy-success="' + k + '"]'); };
    triggers.forEach(function (t) {
      var s = success(t.getAttribute("data-copy-trigger"));
      if (s && !successShown.has(s)) {
        var dsp = getComputedStyle(s).display;
        successShown.set(s, s.getAttribute("data-copy-display") || (dsp !== "none" ? dsp : "flex"));
        s.style.display = "none";
      }
    });
    var timers = new Map();
    var copied = function (t, s) {
      t.setAttribute("data-copied", "true"); t.classList.add("cc-copied");
      if (s) { s.style.display = successShown.get(s) || "flex"; M.fromTo(s, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1 }, { duration: RM ? 0 : 0.35, ease: E.back2 }); }
      clearTimeout(timers.get(t));
      timers.set(t, setTimeout(function () {
        t.removeAttribute("data-copied"); t.classList.remove("cc-copied");
        if (s) M.to(s, { autoAlpha: 0, scale: 0.9 }, { duration: RM ? 0 : 0.15, ease: E.p2in, onComplete: function () { s.style.display = "none"; } });
        timers.delete(t);
      }, 1500));
    };
    var run = function (t) {
      var k = t.getAttribute("data-copy-trigger");
      var src = target(k);
      if (!src) return;
      var s = success(k);
      if (s) { M.kill(s); s.style.display = "none"; }
      var text = (src.innerText || src.textContent || "").trim();
      if (!text || !navigator.clipboard) return;
      navigator.clipboard.writeText(text).then(function () { copied(t, s); }, function () {});
    };
    triggers.forEach(function (t) {
      t.addEventListener("click", function () { run(t); });
      t.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); run(t); } });
    });
  });

  /* ---------- tooltip: hover or focus a trigger to show its target ---------- */
  mods("tooltip-hover").forEach(function (root) {
    var triggers = qa('[data-tooltip-hover="trigger"]', root);
    var tip = q('[data-tooltip-hover="target"]', root);
    if (!triggers.length || !tip) return;
    var corner = q('[data-tooltip-hover="corner"]', tip);
    var GAP = 6, EDGE = 8, Z = 9999, SIDES = ["top", "bottom", "left", "right"];
    var OPP = { top: "bottom", bottom: "top", left: "right", right: "left" };
    if (getComputedStyle(tip).display === "none") tip.style.display = root.dataset.tooltipHoverDisplay || "block";
    var madeRel = false;
    if (getComputedStyle(tip).position === "static") { tip.style.position = "relative"; madeRel = true; }
    var interactive = root.dataset.tooltipHoverInteractive !== undefined && root.dataset.tooltipHoverInteractive !== "false";
    var allowed = (root.dataset.tooltipHoverSides || "").toLowerCase().split(/[\s,]+/).filter(function (s) { return SIDES.indexOf(s) >= 0; });
    if (!allowed.length) allowed = SIDES;
    var leaveT = null;
    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    M.set(tip, { autoAlpha: 0, y: GAP });
    tip.style.zIndex = Z;
    var left = 0, top = 0, width = 0, cur = triggers[0], floating = false, home = null, next = null;
    function measure() {
      var r = tip.getBoundingClientRect();
      var b = { left: r.left, right: r.right, top: r.top - GAP, bottom: r.bottom - GAP, width: r.width, height: r.height };
      var a = cur.getBoundingClientRect(), maxX = innerWidth - EDGE, maxY = innerHeight - EDGE;
      width = b.width;
      var side = null, gap = EDGE;
      if (b.top >= a.bottom) { side = "bottom"; gap = b.top - a.bottom; }
      else if (b.bottom <= a.top) { side = "top"; gap = a.top - b.bottom; }
      else if (b.left >= a.right) { side = "right"; gap = b.left - a.right; }
      else if (b.right <= a.left) { side = "left"; gap = a.left - b.right; }
      if (!side) { left = clamp(b.left, EDGE, maxX - b.width); top = clamp(b.top, EDGE, maxY - b.height); if (corner) M.set(corner, { autoAlpha: 0 }); return; }
      var vert = side === "top" || side === "bottom";
      var at = function (s) {
        var x, y;
        if (s === "top" || s === "bottom") { y = s === "bottom" ? a.bottom + gap : a.top - gap - b.height; x = clamp(vert ? b.left : a.left + (a.width - b.width) / 2, EDGE, maxX - b.width); }
        else { x = s === "right" ? a.right + gap : a.left - gap - b.width; y = clamp(vert ? a.top + (a.height - b.height) / 2 : b.top, EDGE, maxY - b.height); }
        return { left: x, top: y };
      };
      var fits = function (s, p) { return s === "bottom" ? p.top + b.height <= maxY : s === "top" ? p.top >= EDGE : s === "right" ? p.left + b.width <= maxX : p.left >= EDGE; };
      var order = [side, OPP[side]].concat(SIDES).filter(function (s, i, arr) { return arr.indexOf(s) === i && allowed.indexOf(s) >= 0; });
      var pick = order[0], pos = at(pick);
      for (var i = 0; i < order.length; i++) { var p = at(order[i]); if (fits(order[i], p)) { pick = order[i]; pos = p; break; } }
      left = pos.left; top = pos.top;
      if (corner) {
        var cw = corner.offsetWidth / 2, ch = corner.offsetHeight / 2, cx, cy;
        if (pick === "top" || pick === "bottom") { cy = pick === "bottom" ? 0 : b.height; cx = clamp(a.left + a.width / 2 - pos.left, cw + EDGE, b.width - cw - EDGE); }
        else { cx = pick === "right" ? 0 : b.width; cy = clamp(a.top + a.height / 2 - pos.top, ch + EDGE, b.height - ch - EDGE); }
        corner.style.position = "absolute"; corner.style.zIndex = 2; corner.style.left = "0px"; corner.style.top = "0px"; corner.style.right = "auto"; corner.style.bottom = "auto";
        M.set(corner, { autoAlpha: 1, x: cx, y: cy, xPercent: -50, yPercent: -50 });
      }
    }
    var mark = function (el, on) { el.classList.toggle("cc-hover", on); if (on) el.setAttribute("data-hover", "true"); else el.removeAttribute("data-hover"); };
    function lift() {
      home = tip.parentElement; next = tip.nextSibling;
      document.body.appendChild(tip);
      Object.assign(tip.style, { position: "absolute", left: left + scrollX + "px", top: top + scrollY + "px", right: "auto", bottom: "auto", margin: "0px", width: width + "px", zIndex: Z });
      M.set(tip, { x: 0, y: GAP, autoAlpha: 0 });
      floating = true;
    }
    function land() {
      if (!floating) return;
      floating = false;
      if (home) { if (next && next.parentNode === home) home.insertBefore(tip, next); else home.appendChild(tip); }
      ["position", "left", "top", "right", "bottom", "margin", "width"].forEach(function (k) { tip.style.removeProperty(k); });
      if (madeRel) tip.style.position = "relative";
      M.set(tip, { autoAlpha: 0, y: GAP });
      tip.style.zIndex = Z;
    }
    var cancel = function () { if (leaveT) { clearTimeout(leaveT); leaveT = null; } };
    function enter() {
      cancel(); mark(cur, true); mark(root, true);
      if (!floating) { measure(); lift(); }
      M.to(tip, { autoAlpha: 1, y: 0 }, { duration: RM ? 0 : 0.3, ease: E.p2out });
    }
    function exit() {
      cancel();
      M.to(tip, { autoAlpha: 0, y: GAP }, { duration: RM ? 0 : 0.2, ease: E.p2in, onComplete: function () { mark(cur, false); mark(root, false); land(); } });
    }
    var leave = function () { if (!interactive) return exit(); cancel(); leaveT = setTimeout(exit, 150); };
    var bind = function (el, isTrigger) {
      var on = isTrigger ? function () { if (cur !== el) mark(cur, false); cur = el; enter(); } : enter;
      el.addEventListener("mouseenter", on); el.addEventListener("mouseleave", leave);
      el.addEventListener("focusin", on); el.addEventListener("focusout", leave);
    };
    triggers.forEach(function (t) { bind(t, true); });
    if (interactive) bind(tip, false);
  });

  /* ---------- tool wall: an endless drift, paused on hover, draggable ---------- */
  mods("logos").forEach(function (row) {
    if (RM) return;
    var host = row.parentElement;
    if (!host) return;
    var speed = parseFloat(row.dataset.logoSpeed || "") || 24;
    var dir = row.dataset.logoDirection === "right" ? 1 : -1;
    var copies = [], track = null, offset = 0, unit = 0, span = 0, factor = { v: 1 }, last = 0, dragging = false, raf = 0, built = false;
    function paint() {
      for (var i = 0; i < copies.length; i++) {
        var x = ((i * unit + offset + unit) % span) - unit;
        copies[i].style.transform = "translate3d(" + x + "px, 0, 0)";
      }
    }
    function shift(dx) { offset += dx; if (offset < 0 || offset >= span) offset = ((offset % span) + span) % span; }
    function tick(now) {
      raf = requestAnimationFrame(tick);
      if (dragging) { last = 0; return; }
      var dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
      last = now;
      if (dt === 0 || factor.v === 0) return;
      shift(dir * speed * factor.v * dt); paint();
    }
    var easeTo = null;
    function setFactor(v) {
      if (easeTo) easeTo.stop = true;
      var from = factor.v, t0 = performance.now(), job = { stop: false };
      easeTo = job;
      (function step(now) {
        if (job.stop) return;
        var p = Math.min(1, (now - t0) / 600);
        factor.v = from + (v - from) * E.p2out(p);
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }
    function teardown() {
      cancelAnimationFrame(raf); raf = 0;
      if (track && track.isConnected) { track.parentElement.insertBefore(row, track); track.remove(); }
      copies.forEach(function (c) { if (c !== row) c.remove(); });
      copies = []; track = null; offset = 0; row.removeAttribute("style"); built = false;
    }
    function build() {
      var r = row.getBoundingClientRect();
      unit = r.width;
      if (!unit) { var ro = new ResizeObserver(function (en) { if ((en[0] && en[0].contentRect.width) > 0) { ro.disconnect(); build(); } }); ro.observe(row); return; }
      var h = r.height, n = Math.max(1, Math.ceil(host.getBoundingClientRect().width / unit) + 1);
      track = document.createElement("div");
      track.setAttribute("data-logo-track", "");
      Object.assign(track.style, { position: "relative", overflow: "hidden", width: "100%", height: h + "px", touchAction: "pan-y" });
      host.insertBefore(track, row); track.appendChild(row);
      copies = [row];
      for (var i = 0; i < n; i++) {
        var c = row.cloneNode(true);
        c.setAttribute("aria-hidden", "true"); c.removeAttribute("data-module");
        qa("[data-module]", c).forEach(function (x) { x.removeAttribute("data-module"); });
        track.appendChild(c); copies.push(c);
      }
      copies.forEach(function (c) { Object.assign(c.style, { position: "absolute", top: "0px", left: "0px", width: unit + "px", height: h + "px", willChange: "transform" }); });
      span = unit * copies.length; offset = 0; paint();
      track.addEventListener("mouseenter", function () { setFactor(0); });
      track.addEventListener("mouseleave", function () { setFactor(1); });
      /* drag with a little throw */
      var px0 = 0, lastX = 0, lastT = 0, vel = 0, id = null, coast = 0;
      track.style.cursor = "grab";
      track.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        cancelAnimationFrame(coast);
        dragging = true; id = e.pointerId; px0 = lastX = e.clientX; lastT = performance.now(); vel = 0;
        track.style.cursor = "grabbing";
      });
      window.addEventListener("pointermove", function (e) {
        if (!dragging || e.pointerId !== id) return;
        var now = performance.now(), dx = e.clientX - lastX;
        if (dx) { shift(dx); paint(); }
        vel = dx / Math.max(1, now - lastT) * 1000; lastX = e.clientX; lastT = now;
      });
      var release = function (e) {
        if (!dragging || (e && e.pointerId !== id)) return;
        dragging = false; track.style.cursor = "grab";
        if (Math.abs(lastX - px0) < 3) return;
        var v = vel, t = performance.now();
        (function glide(now) {
          var dt = (now - t) / 1000; t = now;
          v *= Math.pow(0.04, dt);
          if (Math.abs(v) < 5) return;
          shift(v * dt); paint();
          coast = requestAnimationFrame(glide);
        })(t);
      };
      window.addEventListener("pointerup", release);
      window.addEventListener("pointercancel", release);
      built = true;
      last = 0; raf = requestAnimationFrame(tick);
    }
    function start() {
      teardown();
      var imgs = qa("img", row);
      if (!imgs.length) return;
      var wait = imgs.map(function (i) {
        if (i.loading === "lazy") i.loading = "eager";
        return i.complete ? Promise.resolve() : new Promise(function (res) { i.addEventListener("load", res, { once: true }); i.addEventListener("error", res, { once: true }); setTimeout(res, 300); });
      });
      Promise.resolve(document.fonts && document.fonts.ready).catch(function () {}).then(function () { return Promise.all(wait); }).then(build);
    }
    start();
    var w = innerWidth;
    window.addEventListener("resize", function () { if (innerWidth === w) return; w = innerWidth; start(); });
  });

  /* ---------- goal box: typed example goals, chips, Enter to generate ---------- */
  mods("sculptor").forEach(function (form) {
    var field = q('[data-role="prompt"]', form);
    var chips = qa("[data-chip]", form);
    var examples = qa("[data-placeholder]", form).map(function (el) { return (el.getAttribute("data-placeholder") || el.textContent || "").trim(); }).filter(Boolean);
    var T = { type: 45, erase: 22, hold: 1900, gap: 400, start: 400, blink: 500 };
    var tick = null, blinkT = null, caret = true, running = false, idx = 0, len = 0, erasing = false, shown = "";
    var draw = function (s) { if (field) field.placeholder = caret ? s + "|" : s; };
    function stop(clear) {
      clearTimeout(tick); tick = null; clearInterval(blinkT); blinkT = null;
      len = 0; erasing = false; shown = ""; running = false; caret = true;
      if (clear !== false && field) field.placeholder = "";
    }
    function blink() { if (blinkT) return; blinkT = setInterval(function () { if (!running || !field) return; caret = !caret; draw(shown); }, T.blink); }
    function step() {
      if (!running || !field) return;
      var s = examples[idx];
      len = erasing ? Math.max(len - 1, 0) : Math.min(len + 1, s.length);
      shown = s.slice(0, len); draw(shown);
      var wait = erasing ? T.erase : T.type;
      if (!erasing && len === s.length) { wait = T.hold; erasing = true; }
      else if (erasing && len === 0) { erasing = false; idx = (idx + 1) % examples.length; wait = T.gap; }
      tick = setTimeout(step, wait);
    }
    var empty = function () { return !field.value || !field.value.trim(); };
    function begin() { if (!field || running || !empty() || !examples.length) return; running = true; shown = ""; caret = true; draw(""); blink(); tick = setTimeout(step, T.start); }
    function pause() { clearTimeout(tick); tick = null; clearInterval(blinkT); blinkT = null; running = false; caret = false; draw(shown); }
    function resume() { if (!field || running || !empty() || !examples.length) return; running = true; caret = true; draw(shown); blink(); tick = setTimeout(step, T.type); }
    var picked = null, pickedText = "";
    function generate() {
      if (!field || !field.value.trim()) { if (field) field.focus(); return; }
      if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
    if (field) {
      field.value = "";
      begin();
      field.addEventListener("input", function () {
        if (!empty()) stop(); else { stop(); begin(); }
        if (picked && field.value !== pickedText) { picked.removeAttribute("data-active"); picked.classList.remove("cc-active"); picked = null; pickedText = ""; }
      });
      field.addEventListener("keydown", function (e) { if (e.key !== "Enter" || e.shiftKey) return; e.preventDefault(); generate(); });
      field.addEventListener("focus", pause);
      field.addEventListener("pointerdown", pause);
      field.addEventListener("blur", function () { if (empty()) resume(); });
    }
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        var text = c.getAttribute("data-prompt");
        chips.forEach(function (o) { o.removeAttribute("data-active"); o.classList.remove("cc-active"); });
        if (text === null) { picked = null; pickedText = ""; return; }
        c.setAttribute("data-active", "true"); c.classList.add("cc-active");
        picked = c; pickedText = text;
        if (!field) return;
        stop(); field.focus(); field.value = text;
        if (field.setSelectionRange) field.setSelectionRange(text.length, text.length);
      });
      c.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); c.click(); } });
    });
  });

  /* ---------- goal box pulse until the visitor engages ---------- */
  mods("action-pulse").forEach(function (box) {
    if (RM) return;
    var field = box.parentElement && q("input, textarea", box.parentElement);
    var on = true, t0 = performance.now();
    box.style.transformOrigin = "50% 50%";
    (function beat(now) {
      if (!on) return;
      var k = ((now - t0) / 900) % 2, p = k <= 1 ? k : 2 - k;
      M.set(box, { scale: 1 + 0.01 * E.sineInOut(p) });
      requestAnimationFrame(beat);
    })(t0);
    var settle = function () {
      if (!on) return;
      on = false;
      M.to(box, { scale: 1 }, { duration: 0.3, ease: E.sineOut });
      if (field) { field.removeEventListener("focus", settle); field.removeEventListener("input", settle); }
    };
    if (field) { field.addEventListener("focus", settle); field.addEventListener("input", settle); }
  });

  /* ---------- the selection highlight cycles through the palette ---------- */
  (function () {
    var palette = ["ube", "dragonfruit", "pomegranate", "blueberry", "lemon", "lime", "slushie"].map(function (n) { return "var(--swatch-" + n + "-400)"; });
    var i = 0;
    document.addEventListener("selectstart", function () {
      i = (i + 1) % palette.length;
      document.documentElement.style.setProperty("--selection-bg", palette[i]);
    });
  })();
})();
