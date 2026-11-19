
(function () {
  "use strict";

  var hero = document.querySelector(".section_home-hero");
  if (!hero) return;
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var INTENT = 90;

  
  var DRAW = [0, 0.1179, 0.1604, 0.181, 0.1941, 0.2065, 0.2198, 0.2388, 0.268, 0.3091, 0.3601, 0.4185, 0.481, 0.5513, 0.6288, 0.7068, 0.7796, 0.8397, 0.8796, 0.9023, 0.9149, 0.9283, 0.9447, 0.9586, 0.97, 0.9789, 0.9853, 0.9898, 0.9935, 0.9967, 1];
  var EXIT = [0, 0.0006, 0.0026, 0.0059, 0.0107, 0.0169, 0.0246, 0.0338, 0.0447, 0.0573, 0.0717, 0.0879, 0.1061, 0.1263, 0.1487, 0.1734, 0.2004, 0.2301, 0.2626, 0.298, 0.3366, 0.3787, 0.4246, 0.4747, 0.5294, 0.5893, 0.6552, 0.7278, 0.8084, 0.8984, 1];
  function curve(stops, t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    var n = stops.length - 1, i = Math.floor(t * n), f = t * n - i;
    return stops[i] + (stops[i + 1] - stops[i]) * f;
  }

  
  function marker(host, el) {
    var BASE = 100;
    var x = 0, y = 0, w = 0, vx = 0, vw = 0, tx = 0, tw = 0;
    var draw = 1, drawT0 = 0, op = 0, opFrom = 0, opTo = 0, opT0 = 0, opDur = 0;
    var raf = 0, last = 0, shown = false;
    function render() {
      el.style.transform = "translate(" + x.toFixed(2) + "px," + y.toFixed(2) + "px) scaleX(" + (Math.max(0, w) * draw / BASE).toFixed(4) + ")";
      el.style.opacity = op.toFixed(3);
    }
    function tick(now) {
      raf = 0;
      var dt = last ? Math.min(0.032, (now - last) / 1000) : 0.016;
      last = now;
      var moving = false;
      
      var ax = -170 * (x - tx) - 26 * vx, aw = -170 * (w - tw) - 26 * vw;
      vx += ax * dt; vw += aw * dt; x += vx * dt; w += vw * dt;
      if (Math.abs(x - tx) < 0.05 && Math.abs(vx) < 0.05 && Math.abs(w - tw) < 0.05 && Math.abs(vw) < 0.05) { x = tx; w = tw; vx = vw = 0; }
      else moving = true;
      if (draw < 1) { draw = curve(DRAW, (now - drawT0) / 280); moving = moving || draw < 1; }
      if (opDur) {
        var p = Math.min(1, (now - opT0) / opDur);
        op = opFrom + (opTo - opFrom) * (opTo < opFrom ? curve(EXIT, p) : p);
        if (p < 1) moving = true; else opDur = 0;
      }
      render();
      if (moving) raf = requestAnimationFrame(tick); else last = 0;
    }
    function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }
    function fadeTo(v, ms) { opFrom = op; opTo = v; opT0 = performance.now(); opDur = ms; }
    function local(r) {
      var h = host.getBoundingClientRect();
      return { x: r.left - h.left, y: r.bottom - h.top, w: r.width };
    }
    return {
      show: function (rect, yOffset) {
        var t = local(rect); t.y += yOffset || 0;
        if (RM) { x = tx = t.x; y = t.y; w = tw = t.w; draw = 1; op = 1; opDur = 0; render(); shown = true; return; }
        var sameLine = shown && op > 0.5 && Math.abs(t.y - y) < 2;
        if (!sameLine) {
          
          x = tx = t.x; y = t.y; w = tw = t.w; vx = vw = 0;
          draw = 0; drawT0 = performance.now(); op = 1; opDur = 0;
        } else { tx = t.x; tw = t.w; if (opTo < 1) fadeTo(1, 120); }
        shown = true; kick();
      },
      hide: function () {
        if (!shown) return; shown = false;
        if (RM) { op = 0; render(); return; }
        fadeTo(0, 180); kick();
      }
    };
  }

  
  function clampX(left, width, maxRight) {
    var h = hero.getBoundingClientRect(), dx = 0, right = h.right - 16;
    if (maxRight != null && maxRight < right) right = maxRight;
    if (left + width > right) dx = right - (left + width);
    if (left + dx < h.left + 16) dx = h.left + 16 - left;
    return dx;
  }
  
  var FLOAT = window.matchMedia ? window.matchMedia("(min-width: 992px)") : { matches: true };
  var mark = hero.querySelector("[data-hero-mark]");
  function markLeft() {
    if (!FLOAT.matches || !mark) return null;
    var r = mark.getBoundingClientRect();
    return r.width ? r.left - 24 : null;
  }

  
  var h1 = hero.querySelector(".hfx-h1");
  var stack = hero.querySelector(".home-hero_intro .u-stack-md");
  var words = h1 ? Array.prototype.slice.call(h1.querySelectorAll(".hfx-who")) : [];
  var wordMark = h1 && h1.querySelector(".hfx-marker") ? marker(h1, h1.querySelector(".hfx-marker")) : null;
  var openWord = null, intentT = 0;

  function translateY(el) {
    var t = getComputedStyle(el).transform;
    return t && t !== "none" ? new DOMMatrix(t).m42 : 0;
  }
  function setPush(px) {
    hero.style.setProperty("--hfx-push", Math.round(px) + "px");
    if (px > 0) hero.setAttribute("data-pushed", ""); else hero.removeAttribute("data-pushed");
  }
  function place(word) {
    var card = word.querySelector(".hfx-card");
    if (!card) return;
    var wr = word.getBoundingClientRect();
    var left = wr.left + card.offsetLeft;
    card.style.setProperty("--dx", clampX(left, card.offsetWidth, markLeft()).toFixed(1) + "px");
    if (!stack || FLOAT.matches) { setPush(0); return; }
    
    var dx = parseFloat(card.style.getPropertyValue("--dx")) || 0;
    var cTop = wr.top + card.offsetTop, cBottom = cTop + card.offsetHeight;
    var cLeft = left + dx, cRight = cLeft + card.offsetWidth;
    var sr = stack.getBoundingClientRect(), sTop = sr.top - translateY(stack);
    var overlapsX = cLeft < sr.right && cRight > sr.left;
    setPush(overlapsX ? Math.max(0, cBottom + 16 - sTop) : 0);
  }
  function openCard(word) {
    clearTimeout(intentT);
    if (openWord === word) return;
    if (openWord) openWord.removeAttribute("data-open");
    openWord = word;
    word.setAttribute("data-open", "");
    place(word);
    if (wordMark) wordMark.show(word.getBoundingClientRect(), -2);
  }
  function closeCard(word) {
    clearTimeout(intentT);
    if (!openWord || (word && word !== openWord)) return;
    openWord.removeAttribute("data-open");
    openWord = null;
    setPush(0);
    if (wordMark) wordMark.hide();
  }
  words.forEach(function (word) {
    word.addEventListener("pointerenter", function (e) {
      if (e.pointerType !== "mouse") return;
      clearTimeout(intentT);
      intentT = setTimeout(function () { openCard(word); }, INTENT);
    });
    word.addEventListener("pointerleave", function (e) {
      if (e.pointerType !== "mouse") return;
      clearTimeout(intentT);
      if (document.activeElement !== word) closeCard(word);
    });
    word.addEventListener("focus", function () { openCard(word); });
    word.addEventListener("blur", function () { closeCard(word); });
    
    word.addEventListener("click", function (e) {
      if (e.pointerType === "mouse") return;
      if (openWord === word && document.activeElement !== word) closeCard(word); else openCard(word);
    });
  });
  document.addEventListener("pointerdown", function (e) {
    if (openWord && !openWord.contains(e.target)) { var w = openWord; closeCard(w); if (document.activeElement === w) w.blur(); }
  });

  
  var NIGHTS = { ecommerce: [74, 86], finance: [71, 83], travel: [76, 87], insurance: [70, 82], software: [75, 85] };
  var STORY = [74, 86];
  function setNights(id) {
    Array.prototype.forEach.call(hero.querySelectorAll(".hfx-kind[data-industry]"), function (row) {
      var k = row.getAttribute("data-industry"), n = k === id ? STORY : (NIGHTS[k] || STORY);
      row.classList.toggle("is-current", k === id);
      var b = row.querySelector("[data-before]"), a = row.querySelector("[data-after]");
      if (b) b.textContent = n[0];
      if (a) a.textContent = n[1];
    });
  }
  setNights(window.SyntheIndustry ? window.SyntheIndustry.get().id : "ecommerce");
  window.addEventListener("synthe:industry", function (e) { setNights(e.detail.id); });

  
  var row = hero.querySelector("[data-hero-install]");
  var chips = row ? Array.prototype.slice.call(row.querySelectorAll(".hero-install_chip")) : [];
  var receipt = row && row.querySelector(".hero-receipt");
  var bar = row && row.querySelector(".hero-install_bar");
  var barMark = bar && bar.querySelector(".hero-install_marker") ? marker(bar, bar.querySelector(".hero-install_marker")) : null;
  var toolOut = receipt && receipt.querySelector("[data-receipt-tool]");
  var lineOut = receipt && receipt.querySelector("[data-receipt-line]");
  var activeChip = null, rowT = 0, chipT = 0, holdOpen = false, wantClose = false;

  function placeReceipt() {
    if (!receipt) return;
    var rr = row.getBoundingClientRect();
    receipt.style.setProperty("--rx", clampX(rr.left, receipt.offsetWidth).toFixed(1) + "px");
    
    receipt.classList.remove("is-up");
    var h = hero.getBoundingClientRect();
    if (rr.top + receipt.offsetTop + receipt.offsetHeight > h.bottom - 16) receipt.classList.add("is-up");
  }
  function openReceipt(chip) {
    clearTimeout(rowT); clearTimeout(chipT); wantClose = false;
    if (!receipt) return;
    activeChip = chip;
    chips.forEach(function (c) {
      c.setAttribute("aria-expanded", c === chip ? "true" : "false");
      c.tabIndex = c === chip ? 0 : -1;
    });
    if (toolOut) toolOut.textContent = chip.getAttribute("data-tool");
    if (!receipt.hasAttribute("data-open")) { receipt.setAttribute("data-open", ""); placeReceipt(); }
    if (barMark) barMark.show(chip.getBoundingClientRect(), 4);
  }
  function closeReceipt() {
    clearTimeout(rowT); clearTimeout(chipT);
    if (holdOpen) { wantClose = true; return; }
    if (!receipt || !receipt.hasAttribute("data-open")) return;
    receipt.removeAttribute("data-open");
    chips.forEach(function (c) { c.setAttribute("aria-expanded", "false"); });
    if (barMark) barMark.hide();
  }
  chips.forEach(function (chip, i) {
    chip.addEventListener("pointerenter", function (e) {
      if (e.pointerType !== "mouse") return;
      clearTimeout(chipT);
      chipT = setTimeout(function () { openReceipt(chip); }, INTENT);
    });
    chip.addEventListener("focus", function () { openReceipt(chip); });
    chip.addEventListener("click", function () { openReceipt(chip); });
    chip.addEventListener("keydown", function (e) {
      var k = e.key, n = chips.length, j = -1;
      if (k === "ArrowRight" || k === "ArrowDown") j = (i + 1) % n;
      else if (k === "ArrowLeft" || k === "ArrowUp") j = (i - 1 + n) % n;
      else if (k === "Home") j = 0;
      else if (k === "End") j = n - 1;
      if (j < 0) return;
      e.preventDefault(); chips[j].focus();
    });
  });
  if (row) {
    row.addEventListener("pointerenter", function () { clearTimeout(rowT); });
    row.addEventListener("pointerleave", function (e) {
      if (e.pointerType !== "mouse") return;
      clearTimeout(chipT);
      if (row.contains(document.activeElement)) return;
      rowT = setTimeout(closeReceipt, 150);
    });
    row.addEventListener("focusout", function () {
      setTimeout(function () { if (!row.contains(document.activeElement) && !row.matches(":hover")) closeReceipt(); }, 0);
    });
    document.addEventListener("pointerdown", function (e) { if (!row.contains(e.target)) { holdOpen = false; closeReceipt(); } });
  }

  
  var copyBtn = receipt && receipt.querySelector("[data-receipt-copy]");
  var kp = copyBtn && copyBtn.closest(".kp");
  var live = receipt && receipt.querySelector("[data-kp-live]");
  var keptT = 0;
  function writeText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { return legacy(text) ? undefined : Promise.reject(); });
    }
    return legacy(text) ? Promise.resolve() : Promise.reject();
  }
  function legacy(text) {
    var t = document.createElement("textarea");
    t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
    document.body.removeChild(t);
    return ok;
  }
  
  function kept(ok) {
    if (window.SyntheKept && typeof window.SyntheKept.feedback === "function") {
      
      holdOpen = true; clearTimeout(keptT);
      var onKept = function (e) {
        var t = e.target;
        if (!e.detail || e.detail.state !== "end" || !(t === kp || kp.contains(t) || (t.contains && t.contains(kp)))) return;
        document.removeEventListener("synthe:kept", onKept);
        holdOpen = false; if (wantClose) closeReceipt();
      };
      document.addEventListener("synthe:kept", onKept);
      keptT = setTimeout(function () { document.removeEventListener("synthe:kept", onKept); holdOpen = false; if (wantClose) closeReceipt(); }, 2600);
      window.SyntheKept.feedback(kp, ok); return;
    }
    clearTimeout(keptT);
    holdOpen = true;
    kp.classList.remove("is-done", "is-fail");
    void kp.offsetWidth;
    kp.classList.add(ok ? "is-done" : "is-fail");
    if (live) live.textContent = ok ? "Copied the setup line" : "Could not copy. Try again.";
    keptT = setTimeout(function () {
      kp.classList.remove("is-done", "is-fail");
      holdOpen = false;
      if (wantClose) closeReceipt();
    }, 1600);
  }
  
  if (copyBtn && kp) {
    copyBtn.addEventListener("click", function () {
      writeText((lineOut && lineOut.textContent || "").trim()).then(function () { kept(true); }, function () { kept(false); });
    });
  }

  
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (openWord) { closeCard(openWord); }
    if (receipt && receipt.hasAttribute("data-open")) {
      var back = activeChip; holdOpen = false; closeReceipt();
      if (back && row.contains(document.activeElement)) back.focus({ preventScroll: true });
      if (back) closeReceipt();
    }
  });
  window.addEventListener("resize", function () {
    if (openWord) { place(openWord); if (wordMark) wordMark.show(openWord.getBoundingClientRect(), -2); }
    if (receipt && receipt.hasAttribute("data-open")) { placeReceipt(); if (barMark && activeChip) barMark.show(activeChip.getBoundingClientRect(), 4); }
  });

  
  if (mark) {
    var imgs = Array.prototype.slice.call(mark.querySelectorAll("img"));
    var go = function () { mark.classList.add("is-go"); };
    var ready = imgs.map(function (im) {
      if (im.decode) return im.decode().catch(function () {});
      return new Promise(function (res) { if (im.complete) res(); else im.addEventListener("load", res); });
    });
    Promise.race([Promise.all(ready), new Promise(function (res) { setTimeout(res, 1500); })]).then(go);

    
    var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var a = mark.querySelector(".hero-mark_a"), b = mark.querySelector(".hero-mark_b");
    if (!RM && fine && a && b) {
      var UX = -0.6075, UY = 0.7943, MAX = 3;
      var d = 0, v = 0, td = 0, praf = 0, plast = 0, locked = false;
      var step = function (now) {
        praf = 0;
        var dt = plast ? Math.min(0.032, (now - plast) / 1000) : 0.016; plast = now;
        v += (-170 * (d - td) - 26 * v) * dt; d += v * dt;
        if (Math.abs(d - td) < 0.01 && Math.abs(v) < 0.01) { d = td; v = 0; }
        var x = (d * UX).toFixed(2), y = (d * UY).toFixed(2);
        a.style.translate = x + "px " + y + "px";
        b.style.translate = (-x) + "px " + (-y) + "px";
        if (d !== td || v !== 0) praf = requestAnimationFrame(step); else plast = 0;
      };
      var aim = function (t) { td = t; if (!praf) { plast = 0; praf = requestAnimationFrame(step); } };
      b.addEventListener("animationend", function (e) { if (e.animationName === "hero-mark-b") locked = true; });
      hero.addEventListener("pointermove", function (e) {
        if (!locked || e.pointerType !== "mouse") return;
        var h = hero.getBoundingClientRect();
        var nx = (e.clientX - (h.left + h.width / 2)) / (h.width / 2);
        aim(MAX * Math.max(-1, Math.min(1, nx)));
      });
      hero.addEventListener("pointerleave", function () { if (locked) aim(0); });
    }
  }
})();
