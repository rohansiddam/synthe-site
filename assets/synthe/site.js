/* Synthe site shell (all pages): the nav menu (desktop dropdown and
   phone menu), the bar's notch layers, the nav link hover roll and
   the in-page anchor glide. Needs motion.js. */
(function () {
  "use strict";
  var M = window.SyntheMotion;
  if (!M) return;
  var E = M.ease, d = M.d;
  var html = document.documentElement;
  var AT = "data-nav-menu", LINK = "data-nav-menu-link";
  var RESERVED = ["wrapper", "inside", "corner", "base", "show", "mobile", "mobile-menu", "back", "back-wrapper", "icon-open", "icon-close", "menu-link", "menu-link-icon"];
  var DESKTOP = window.matchMedia("(min-width: 992px)");
  var NO_HOVER = window.matchMedia("(hover: none)").matches;
  var px = function (v) { return v + "px"; };
  var q = function (s, r) { return (r || document).querySelector(s); };
  var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var rem = function () { return parseFloat(getComputedStyle(html).fontSize) || 16; };
  function css(el, o) { for (var k in o) el.style.setProperty(k, o[k]); }

  /* ------------------------------------------------------------
     1. Notch layers. The bar ([data-nav-menu-notch]) hands its
     paint (background, border, radius, shadow) to two absolutely
     placed layers, a hairline and a fill, so a notch can be masked
     out of its bottom edge (nav-base.css draws it, nav-fx.js drives
     its position). The notch outline is a V with a rounded tip and
     rounded shoulders, built here for both layers.
     ------------------------------------------------------------ */
  var OVERHANG = 1.5;
  function r3(v) { return +v.toFixed(3); }
  function notchShape(w, h, tip, shoulder, inset) {
    var half = Math.atan2(w / 2, h);                 // side angle from vertical
    var sn = Math.sin(half), cs = Math.cos(half);
    var tipR = Math.min(tip, h * Math.tan(half) * 0.8);
    var tipC = -h + tipR / sn;                       // tip circle centre (y)
    var tipX = -(tipR + inset) * cs, tipY = tipC - (tipR + inset) * sn;
    var shR = Math.max(shoulder, inset + 0.01);
    var run = shR / Math.tan((Math.PI / 2 + half) / 2);
    var shX = -w / 2 - run, shY = -shR;              // shoulder circle centre
    var sideX = shX + (shR - inset) * cs, sideY = shY + (shR - inset) * sn;
    var halfW = w / 2 + run;
    var top = tipC - tipR - inset;
    var X = function (v) { return r3(v + halfW); }, Y = function (v) { return r3(v - top); };
    var a1 = r3(shR - inset), a2 = r3(tipR + inset);
    var path = "M" + X(-halfW) + " " + Y(-inset) +
      "A" + a1 + " " + a1 + " 0 0 0 " + X(sideX) + " " + Y(sideY) +
      "L" + X(tipX) + " " + Y(tipY) +
      "A" + a2 + " " + a2 + " 0 0 1 " + X(-tipX) + " " + Y(tipY) +
      "L" + X(-sideX) + " " + Y(sideY) +
      "A" + a1 + " " + a1 + " 0 0 0 " + X(halfW) + " " + Y(-inset) +
      "L" + X(halfW) + " " + Y(OVERHANG) + "L" + X(-halfW) + " " + Y(OVERHANG) + "Z";
    var W = r3(halfW * 2), H = r3(OVERHANG - top);
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + W + "' height='" + H + "' viewBox='0 0 " + W + " " + H + "' preserveAspectRatio='none'><path d='" + path + "'/></svg>";
    return { url: 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")', w: W + "px", h: H + "px" };
  }
  function cssNum(cs, name, fb) { var v = parseFloat(cs.getPropertyValue(name)); return isFinite(v) ? v : fb; }
  function notchVars(el) {
    var cs = getComputedStyle(el);
    var w = cssNum(cs, "--nav-notch-w", 25), h = cssNum(cs, "--nav-notch-h", 9);
    var bw = cssNum(cs, "--nav-border-w", 0.5), tip = cssNum(cs, "--nav-notch-tip", 6);
    var sh = cssNum(cs, "--nav-notch-shoulder", 10);
    el.style.setProperty("--nav-notch-ratio", String(w / h));
    el.style.setProperty("--nav-notch-k", String(Math.hypot(w / 2, h) / (w / 2)));
    var hair = notchShape(w, h, tip, sh, 0), fill = notchShape(w, h, tip, sh, bw);
    css(el, {
      "--nav-cut-hair": hair.url, "--nav-cut-hair-w": hair.w, "--nav-cut-hair-h": hair.h,
      "--nav-cut-fill": fill.url, "--nav-cut-fill-w": fill.w, "--nav-cut-fill-h": fill.h,
      "--nav-cut-overhang": px(OVERHANG),
    });
  }
  function mountNotch(el) {
    var cs = getComputedStyle(el), set = function (k, v) { el.style.setProperty(k, v); };
    if (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)") set("--nav-bg", cs.backgroundColor);
    if (cs.backgroundImage && cs.backgroundImage !== "none") set("--nav-bg-image", cs.backgroundImage);
    var sides = ["top", "right", "bottom", "left"].filter(function (s) {
      return parseFloat(cs.getPropertyValue("border-" + s + "-width")) > 0 && cs.getPropertyValue("border-" + s + "-style") !== "none";
    });
    ["top", "right", "bottom", "left"].forEach(function (s) { set("--nav-bw-" + s[0], sides.indexOf(s) >= 0 ? "var(--nav-border-w)" : "0px"); });
    if (sides.length) set("--nav-border", cs.getPropertyValue("border-" + (sides.indexOf("bottom") >= 0 ? "bottom" : sides[0]) + "-color"));
    else set("--nav-border-w", "0px");
    var maxR = 0;
    [["tl", "top-left"], ["tr", "top-right"], ["br", "bottom-right"], ["bl", "bottom-left"]].forEach(function (c) {
      var v = cs.getPropertyValue("border-" + c[1] + "-radius").split(" ")[0] || "0px";
      set("--nav-r-" + c[0], v);
      if (/px$/.test(v)) maxR = Math.max(maxR, parseFloat(v));
    });
    if (maxR > 0) set("--nav-radius", px(maxR));
    var sh = cs.boxShadow.split(/,(?![^(]*\))/).map(function (s) { return s.trim(); })
      .filter(function (s) { return s && s !== "none" && !/\binset\b/.test(s); })[0];
    var m = sh && sh.match(/^(.*?)\s+(-?[\d.]+px)\s+(-?[\d.]+px)\s+(-?[\d.]+px)(?:\s+-?[\d.]+px)?$/);
    if (m) set("--nav-shadow-filter", "drop-shadow(" + m[2] + " " + m[3] + " " + m[4] + " " + m[1] + ")");
    if (cs.position === "static") el.style.position = "relative";
    var prevT = el.style.getPropertyValue("transition"), prevP = el.style.getPropertyPriority("transition");
    el.style.setProperty("transition", "none", "important");
    el.style.background = "none"; el.style.border = "0"; el.style.borderRadius = "0"; el.style.boxShadow = "none";
    notchVars(el);
    ["hair", "fill"].forEach(function (k) {
      var layer = document.createElement("div");
      layer.setAttribute("data-nav-menu-notch-layer", k);
      layer.setAttribute("aria-hidden", "true");
      layer.style.setProperty("--nav-corner-on", "0");
      el.appendChild(layer);
    });
    if (prevT) el.style.setProperty("transition", prevT, prevP); else el.style.removeProperty("transition");
  }
  var notches = qa("[data-nav-menu-notch]");
  function whenReady(el, n) {
    if (getComputedStyle(el).getPropertyValue("--nav-notch-layers").trim() === "2") return mountNotch(el);
    if ((n || 0) < 600) requestAnimationFrame(function () { whenReady(el, (n || 0) + 1); });
  }
  notches.forEach(function (el) { whenReady(el); });

  /* ------------------------------------------------------------
     2. Menu: one wrapper holds the desktop panels and the phone menu.
     ------------------------------------------------------------ */
  var W = q("[" + AT + '="wrapper"]');
  if (W) mountMenu(W);

  function mountMenu(W) {
    var panels = {};
    qa("[" + AT + "]", W).forEach(function (el) {
      var n = el.getAttribute(AT) || "";
      if (n && RESERVED.indexOf(n) < 0) panels[n] = el;
    });
    var mobileLayer = q("[" + AT + '="mobile-menu"]', W);
    var links = qa("[" + LINK + "]").filter(function (l) { return !(mobileLayer && mobileLayer.contains(l)); });
    if (!Object.keys(panels).length || !links.length) return;
    var nameOf = function (l) { return l.getAttribute(LINK) || ""; };
    var linkFor = function (n) { return links.filter(function (l) { return nameOf(l) === n; })[0] || null; };
    var reveals = function (p) { return qa("[data-nav-menu-reveal]", p); };

    qa('img[loading="lazy"]', W).forEach(function (i) { i.loading = "eager"; });

    /* remember the authored inline style of everything we animate */
    var saved = new Map();
    var keep = function (el) { if (!saved.has(el)) saved.set(el, el.getAttribute("style") || ""); };
    var restore = function (el) {
      var s = saved.has(el) ? saved.get(el) : "";
      if (s) el.setAttribute("style", s); else el.removeAttribute("style");
      M.clear(el);
    };
    var family = function (p) {
      var out = [p].concat(Array.prototype.slice.call(p.children), reveals(p));
      return out;
    };
    keep(W);
    Object.keys(panels).forEach(function (n) { family(panels[n]).forEach(keep); });
    if (mobileLayer) keep(mobileLayer);
    var authoredDisplay = function (el) { var m = /(?:^|;)\s*display\s*:\s*([^;]+)/i.exec(saved.get(el) || ""); return m ? m[1].trim() : ""; };
    var show = function (el) { el.style.display = el.dataset.navMenuDisplay || authoredDisplay(el); if (getComputedStyle(el).display === "none") el.style.display = "block"; };
    var hide = function (el) { el.style.display = "none"; };
    var resetPanel = function (p) { var f = family(p); M.kill(f); f.forEach(restore); };
    var closePanel = function (p) { resetPanel(p); p.setAttribute("aria-hidden", "true"); hide(p); };
    var clearSize = function () { W.style.width = ""; W.style.height = ""; };

    if (getComputedStyle(W).position === "static") W.style.position = "relative";
    W.style.overflow = "hidden"; W.style.boxSizing = "border-box";
    W.style.setProperty("transition", "none", "important");
    W.style.transformOrigin = "0% 0%";

    var base = W.closest("[" + AT + '="base"]') || q("[" + AT + '="base"]');
    var baseStyle = base ? base.getAttribute("style") : null;
    var shows = qa("[" + AT + '="show"]');
    var setShows = function (on) { shows.forEach(function (s) { s.style.display = on ? s.dataset.navMenuDisplay || "flex" : "none"; }); };
    var openBase = function () { if (base) base.style.display = base.dataset.navMenuDisplay || "flex"; setShows(true); };
    var closeBase = function () { setShows(false); if (!base) return; if (baseStyle) base.setAttribute("style", baseStyle); else base.removeAttribute("style"); };
    setShows(false);

    Object.keys(panels).forEach(function (n) { closePanel(panels[n]); });
    if (mobileLayer) { mobileLayer.setAttribute("aria-hidden", "true"); hide(mobileLayer); }
    hide(W);
    M.set(W, { autoAlpha: 0 });
    links.forEach(function (l) { if (panels[nameOf(l)]) l.setAttribute("aria-expanded", "false"); });

    var current = null;      // open desktop panel name
    var resume = null;       // panel name while its close is running
    var phoneOpen = false, layer = null;
    var closeTimer = null, switchTimer = null;
    var emit = function (t, detail) { W.dispatchEvent(new CustomEvent(t, { bubbles: true, detail: detail })); };
    var markLinks = function (n) {
      links.forEach(function (l) {
        var on = nameOf(l) === n;
        l.classList.toggle("is--active", on);
        if (l.hasAttribute("aria-expanded")) l.setAttribute("aria-expanded", String(on));
      });
    };
    var scaleOf = function () { return M.get(W, "scale") || 1; };
    var sizeOf = function (el) { var r = el.getBoundingClientRect(), s = scaleOf(); return { w: r.width / s, h: r.height / s }; };
    var natural = function () { clearSize(); return sizeOf(W); };

    /* fix the size of a panel's ancestors (inside W) during the height tween */
    var pinned = new Set();
    var ancestors = function (el) { var a = []; for (var p = el.parentElement; p && p !== W; p = p.parentElement) a.unshift(p); return a; };
    var pin = function (el) {
      ancestors(el).map(function (a) { return { a: a, s: sizeOf(a) }; }).forEach(function (o) {
        keep(o.a); pinned.add(o.a);
        o.a.style.setProperty("transition", "none", "important");
        css(o.a, { width: px(o.s.w), "min-width": px(o.s.w), "max-width": px(o.s.w), height: px(o.s.h), "min-height": px(o.s.h), "max-height": px(o.s.h), "flex-shrink": "0", "flex-grow": "0" });
      });
    };
    var unpin = function () { pinned.forEach(function (a) { M.kill(a); restore(a); }); pinned.clear(); };
    var shownAncestors = new Map();
    var showAncestors = function (el) {
      ancestors(el).forEach(function (a) {
        if (!shownAncestors.has(a) && getComputedStyle(a).display !== "none") return;
        if (!shownAncestors.has(a)) shownAncestors.set(a, a.style.display);
        a.style.display = a.dataset.navMenuDisplay || "";
        if (getComputedStyle(a).display === "none") a.style.display = "block";
      });
    };
    var unshowAncestors = function () { shownAncestors.forEach(function (v, a) { a.style.display = v; }); shownAncestors.clear(); };

    /* --- desktop: open, reopen while closing --- */
    function openPanel(n) {
      var p = panels[n];
      M.kill(W);
      Object.keys(panels).forEach(function (k) { if (k !== n) closePanel(panels[k]); });
      openBase(); show(W); resetPanel(p); showAncestors(p); show(p);
      p.setAttribute("aria-hidden", "false");
      var h = natural().h;
      current = n; markLinks(n); W.classList.add("is--open");
      M.fromTo(W, { y: -8, scale: 0.96 }, { y: 0, scale: 1 }, { duration: d(0.28), ease: E.snap });
      M.fromTo(W, { autoAlpha: 0 }, { autoAlpha: 1 }, { duration: d(0.05) });
      var pw = sizeOf(p).w;
      pin(p);
      css(p, { width: px(pw), "min-width": px(pw), "max-width": px(pw), flex: "0 0 auto" });
      M.fromTo(W, { height: h * 0.85 }, { height: h }, {
        duration: d(0.36), ease: E.snap,
        onComplete: function () { clearSize(); unpin(); ["width", "min-width", "max-width", "flex"].forEach(function (k) { p.style.removeProperty(k); }); },
      });
      var rv = reveals(p);
      if (rv.length) {
        M.set(rv, { transformOrigin: "50% 0%" });
        M.fromTo(rv, { y: 20, scale: 0.95 }, { y: 0, scale: 1 }, { duration: d(0.5), delay: d(0.04), ease: E.snap });
      }
      emit("nav-menu:open", { name: n });
    }
    function reopen() {
      var n = resume; resume = null;
      M.kill(W, "opacity,autoAlpha,y,scale");
      current = n; markLinks(n); W.classList.add("is--open");
      var op = M.get(W, "opacity") || 0;
      M.to(W, { y: 0, scale: 1 }, { duration: d(0.28), ease: E.quint });
      M.to(W, { autoAlpha: 1 }, { duration: d(0.05) * (1 - op) });
    }
    function request(n) {
      if (!panels[n] || !linkFor(n)) return;
      stopTracking(); cancelClose();
      if (current === null && resume !== null && !phoneOpen && getComputedStyle(W).display !== "none") reopen();
      if (current === n) return;
      if (current === null) openPanel(n);
      else { closePanel(panels[current]); openPanel(n); }
    }

    /* --- close (desktop and phone) --- */
    var cancelClose = function () { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; } };
    var scheduleClose = function (ms) { cancelClose(); closeTimer = setTimeout(close, ms === undefined ? 180 : ms); };
    var cancelSwitch = function () { if (switchTimer) { clearTimeout(switchTimer); switchTimer = null; } };
    var stagger = mobileLayer ? qa("[" + LINK + "], [data-nav-menu-stagger]", mobileLayer) : [];
    stagger.forEach(keep);
    var resetStagger = function () { stagger.forEach(function (s) { M.kill(s); restore(s); }); };
    var backWraps = qa("[" + AT + '="back-wrapper"]', W);
    backWraps.forEach(keep);
    var resetBack = function () { backWraps.forEach(function (b) { M.kill(b); restore(b); }); };

    function close() {
      stopTracking(); cancelClose(); cancelSwitch();
      if (current === null && !phoneOpen) return;
      var name = current || "mobile-menu";
      resume = phoneOpen ? null : current;
      var wait = 0, wasPhone = phoneOpen;
      if (phoneOpen && layer === mobileLayer && !M.reduced.matches) {
        var vis = stagger.filter(function (s) { return s.getClientRects().length > 0; });
        if (vis.length) {
          vis.forEach(function (s) { M.kill(s); s.style.setProperty("transition", "none", "important"); });
          M.to(vis, { y: -rem() }, { duration: 0.24, ease: E.quint, stagger: 0.025 });
          M.to(vis, { opacity: 0 }, { duration: 0.24, stagger: 0.025 });
          wait = (0.24 + 0.025 * (vis.length - 1)) * 0.7;
        }
      }
      current = null; phoneOpen = false; layer = null;
      toggleIcons(false); markLinks(null); W.classList.remove("is--open"); M.kill(W);
      var h = sizeOf(W).h;
      var done = function () {
        resume = null;
        Object.keys(panels).forEach(function (k) { closePanel(panels[k]); });
        unpin(); unshowAncestors(); resetBack(); resetStagger();
        if (mobileLayer) { resetLayer(mobileLayer); mobileLayer.setAttribute("aria-hidden", "true"); hide(mobileLayer); }
        clearSize(); hide(W); closeBase(); lock(false);
      };
      if (wasPhone) {
        M.to(W, { autoAlpha: 0 }, { delay: wait * 0.5 + d(0.12), duration: d(0.12) });
        M.fromTo(W, { height: h }, { height: h * 0.2, y: -16 }, { duration: d(0.36), delay: wait * 0.5, ease: E.quint, onComplete: done });
      } else {
        M.to(W, { y: -8, scale: 0.98 }, { duration: d(0.2), delay: wait, ease: E.quint, onComplete: done });
        M.to(W, { autoAlpha: 0 }, { delay: wait, duration: d(0.1) });
      }
      emit("nav-menu:close", { name: name });
    }

    /* --- hover intent: keep the panel while the pointer heads for it --- */
    var tracking = false, wedge = null, linkBox = null;
    function linksBox() {
      var b = null;
      links.forEach(function (l) {
        if (!panels[nameOf(l)]) return;
        var r = l.getBoundingClientRect();
        if (!r.width && !r.height) return;
        b = b ? { left: Math.min(b.left, r.left), top: Math.min(b.top, r.top), right: Math.max(b.right, r.right), bottom: Math.max(b.bottom, r.bottom) } : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      });
      return b;
    }
    function inCorridor(pt) {
      var b = linkBox, r = W.getBoundingClientRect();
      if (!b || !r.width) return false;
      if (pt.y >= b.top && pt.y <= b.bottom) return pt.x >= b.left && pt.x <= b.right;
      var below = r.top >= b.bottom - 1, y0 = below ? b.bottom : r.bottom - 1, y1 = below ? r.top + 1 : b.top;
      return pt.y >= y0 && pt.y <= y1 && pt.x >= Math.min(r.left, b.left) - 24 && pt.x <= Math.max(r.right, b.right) + 24;
    }
    function inTriangle(p, a, b, c) {
      var s = function (p1, p2, p3) { return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y); };
      var d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a);
      return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
    }
    function judge(pt) {
      if (inCorridor(pt)) cancelClose();
      else if (wedge && inTriangle(pt, wedge[0], wedge[1], wedge[2])) scheduleClose(400);
      else { stopTracking(); scheduleClose(); }
    }
    function onMove(e) { if (tracking) judge({ x: e.clientX, y: e.clientY }); }
    function onLeaveDoc() { if (!tracking) return; stopTracking(); scheduleClose(); }
    function stopTracking() {
      if (!tracking) return;
      tracking = false; wedge = null;
      document.removeEventListener("pointermove", onMove);
      html.removeEventListener("mouseleave", onLeaveDoc);
    }
    function startTracking(e, withWedge, link) {
      stopTracking(); linkBox = linksBox(); tracking = true;
      document.addEventListener("pointermove", onMove);
      html.addEventListener("mouseleave", onLeaveDoc);
      var pt = e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : null;
      if (withWedge) {
        var r = W.getBoundingClientRect(), lr = link.getBoundingClientRect();
        if (!pt) pt = { x: (lr.left + lr.right) / 2, y: lr.bottom };
        var above = r.top >= pt.y, y = above ? r.top : r.bottom;
        wedge = [{ x: pt.x, y: pt.y + (above ? -2 : 2) }, { x: r.left - 40, y: y }, { x: r.right + 40, y: y }];
        if (inCorridor(pt)) cancelClose(); else scheduleClose(400);
        return;
      }
      if (pt) judge(pt); else scheduleClose(400);
    }

    /* --- phone menu --- */
    var toggles = qa("[" + AT + '="mobile"]');
    var lockState = false;
    function space() {
      if (!lockState) return;
      var vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
      html.style.setProperty("--nav-menu-space", px(Math.max(0, vh - (W.getBoundingClientRect().top - (M.get(W, "y") || 0)))));
    }
    function lock(on) {
      if (on === lockState) return;
      lockState = on; html.classList.toggle("is--nav-locked", on);
      if (on) { space(); if (window.visualViewport) window.visualViewport.addEventListener("resize", space); }
      else { if (window.visualViewport) window.visualViewport.removeEventListener("resize", space); html.style.removeProperty("--nav-menu-space"); }
    }
    var resetLayer = function (el) { if (panels[el.getAttribute(AT) || ""] === el) resetPanel(el); else { M.kill(el); restore(el); } };

    /* toggle icon: the open icon's lines travel into the close icon's strokes */
    var icons = toggles.map(function (t) {
      var o = q("[" + AT + '="icon-open"]', t), c = q("[" + AT + '="icon-close"]', t);
      if (!o || !c) return null;
      var segs = function (svg) {
        var out = [];
        qa("path", svg).forEach(function (pth) {
          var nums = (pth.getAttribute("d") || "").match(/-?[\d.]+/g) || [];
          for (var i = 0; i + 3 < nums.length; i += 4) out.push({ el: pth, d: pth.getAttribute("d"), a: [+nums[i], +nums[i + 1]], b: [+nums[i + 2], +nums[i + 3]] });
        });
        return out;
      };
      var from = segs(o).filter(function (s, i, arr) { return arr.findIndex(function (x) { return x.el === s.el; }) === i; });
      var to = segs(c);
      var mid = function (s) { return [(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2]; };
      var axis = Math.abs(mid(from[0])[1] - mid(from[from.length - 1])[1]) >= Math.abs(mid(from[0])[0] - mid(from[from.length - 1])[0]) ? 1 : 0;
      var sorted = from.slice().sort(function (a, b) { return mid(a)[axis] - mid(b)[axis]; });
      var n = Math.min(to.length, sorted.length);
      var ends = sorted.slice(0, Math.ceil(n / 2)).concat(sorted.slice(sorted.length - Math.floor(n / 2)));
      var dist = function (p, q2) { return Math.hypot(p[0] - q2[0], p[1] - q2[1]); };
      var cost = function (s, t2) { return Math.min(dist(s.a, t2.a) + dist(s.b, t2.b), dist(s.a, t2.b) + dist(s.b, t2.a)); };
      var perms = function (arr) { return arr.length <= 1 ? [arr] : arr.reduce(function (acc, x, i) { return acc.concat(perms(arr.slice(0, i).concat(arr.slice(i + 1))).map(function (r) { return [x].concat(r); })); }, []); };
      var best = ends, bestC = Infinity;
      perms(ends).forEach(function (pm) { var cc = pm.reduce(function (s, x, i) { return s + cost(x, to[i]); }, 0); if (cc < bestC) { bestC = cc; best = pm; } });
      var pairs = best.map(function (s, i) {
        var t2 = to[i], flip = dist(s.a, t2.b) + dist(s.b, t2.a) < dist(s.a, t2.a) + dist(s.b, t2.b);
        return { el: s.el, d: s.d, a0: s.a, b0: s.b, a1: flip ? t2.b : t2.a, b1: flip ? t2.a : t2.b };
      });
      var extras = sorted.filter(function (s) { return best.indexOf(s) < 0; }).map(function (s) { return s.el; });
      return { open: o, close: c, pairs: pairs, extras: extras, closeDisplay: c.style.display, shown: "open", tw: null };
    }).filter(Boolean);
    function morph(ic, toClose, dur, done) {
      if (ic.tw) ic.tw.kill();
      var t0 = performance.now(), ms = dur * 1000, stop = false;
      var draw = function (k) {
        ic.pairs.forEach(function (p) {
          var e = toClose ? k : 1 - k;
          var A = [p.a0[0] + (p.a1[0] - p.a0[0]) * e, p.a0[1] + (p.a1[1] - p.a0[1]) * e];
          var B = [p.b0[0] + (p.b1[0] - p.b0[0]) * e, p.b0[1] + (p.b1[1] - p.b0[1]) * e];
          p.el.setAttribute("d", "M" + r3(A[0]) + "," + r3(A[1]) + " L" + r3(B[0]) + "," + r3(B[1]));
        });
        ic.extras.forEach(function (x) {
          var v = toClose ? 1 - k : k;
          x.style.transformOrigin = "50% 50%"; x.style.transformBox = "fill-box";
          x.style.transform = "scaleX(" + r3(v) + ")"; x.style.opacity = r3(v);
        });
      };
      var frame = function (now) {
        if (stop) return;
        var p = ms > 0 ? Math.min(1, (now - t0) / ms) : 1;
        draw(E.quint(p));
        if (p < 1) requestAnimationFrame(frame); else if (done) done();
      };
      ic.tw = { kill: function () { stop = true; } };
      if (ms <= 0) { draw(1); if (done) done(); } else requestAnimationFrame(frame);
    }
    function toggleIcons(on) {
      toggles.forEach(function (t) { t.classList.toggle("is--open", on); t.setAttribute("aria-expanded", String(on)); });
      icons.forEach(function (ic) {
        var dur = d(0.38);
        if (on) {
          if (ic.shown === "close") return;
          morph(ic, true, dur, function () {
            if (!phoneOpen) return;
            ic.shown = "close";
            ic.close.style.display = ic.close.dataset.navMenuDisplay || ic.closeDisplay;
            if (getComputedStyle(ic.close).display === "none") ic.close.style.display = "flex";
            ic.open.style.display = "none";
            ic.pairs.forEach(function (p) { p.el.setAttribute("d", p.d); });
            ic.extras.forEach(function (x) { x.style.removeProperty("transform"); x.style.removeProperty("opacity"); x.style.removeProperty("transform-origin"); x.style.removeProperty("transform-box"); });
          });
        } else {
          if (ic.shown === "close") {
            ic.shown = "open";
            ic.open.style.display = "";
            ic.close.style.display = ic.closeDisplay || "none";
            if (getComputedStyle(ic.close).display !== "none") ic.close.style.display = "none";
            morph(ic, true, 0);
          }
          morph(ic, false, dur, function () {
            ic.pairs.forEach(function (p) { p.el.setAttribute("d", p.d); });
            ic.extras.forEach(function (x) { x.style.removeProperty("transform"); x.style.removeProperty("opacity"); x.style.removeProperty("transform-origin"); x.style.removeProperty("transform-box"); });
          });
        }
      });
    }
    toggles.forEach(function (t) { t.setAttribute("aria-expanded", "false"); });

    function openPhone() {
      resume = null;
      if (!mobileLayer) return;
      stopTracking(); cancelClose();
      var prevH = getComputedStyle(W).display !== "none" ? sizeOf(W).h : 0;
      var fromY = prevH > 0 ? M.get(W, "y") || 0 : -3.5 * rem();
      M.kill(W);
      Object.keys(panels).forEach(function (k) { closePanel(panels[k]); });
      openBase(); show(W); clearSize();
      M.set(W, { x: 0, y: 0, scale: 1 });
      lock(true);
      resetLayer(mobileLayer); show(mobileLayer); mobileLayer.setAttribute("aria-hidden", "false");
      phoneOpen = true; layer = mobileLayer; W.classList.add("is--open"); toggleIcons(true);
      var h = natural().h, startH = Math.max(prevH, h * 0.2);
      var op = prevH > 0 ? M.get(W, "opacity") || 0 : 0;
      M.set(W, { y: 0, scale: 1 });
      M.fromTo(W, { autoAlpha: op }, { autoAlpha: 1 }, { duration: d(0.05) * (1 - op) });
      M.fromTo(W, { height: startH, y: fromY }, { height: h, y: 0 }, { duration: d(0.5), ease: E.quint, onComplete: function () { W.style.height = ""; } });
      resetStagger();
      var vis = stagger.filter(function (s) { return s.getClientRects().length > 0; });
      if (!M.reduced.matches && vis.length) {
        vis.forEach(function (s) { s.style.setProperty("transition", "none", "important"); });
        M.fromTo(vis, { opacity: 0 }, { opacity: 1 }, { duration: 0.5, stagger: 0.035 });
        M.fromTo(vis, { y: 2 * rem() }, { y: 0 }, { duration: 0.5, ease: E.quint, stagger: 0.035, overwrite: false, onComplete: resetStagger });
      }
      emit("nav-menu:open", { name: "mobile-menu" });
    }
    function frameIn(el, ref) {
      var r = el.getBoundingClientRect(), rr = ref.getBoundingClientRect(), s = scaleOf();
      return { top: (r.top - rr.top) / s - ref.clientTop, left: (r.left - rr.left) / s - ref.clientLeft, w: r.width / s, h: r.height / s };
    }
    function positioned(el) { for (var p = el.parentElement; p && p !== W; p = p.parentElement) if (getComputedStyle(p).position !== "static") return p; return W; }
    function place(el, f, inert) {
      css(el, { position: "absolute", top: px(f.top), left: px(f.left), width: px(f.w), height: px(f.h), "min-width": px(f.w), "max-width": px(f.w), "min-height": px(f.h), "max-height": px(f.h), "box-sizing": "border-box", margin: "0px", "pointer-events": inert ? "none" : "auto" });
    }
    function slideTo(next, dir) {
      var prev = layer;
      if (!phoneOpen || !prev || prev === next) return;
      M.kill(W, "height");
      Object.keys(panels).forEach(function (k) { if (panels[k] !== prev && panels[k] !== next) closePanel(panels[k]); });
      var h0 = sizeOf(W).h;
      unpin();
      M.kill(prev); prev.style.setProperty("transition", "none", "important");
      ancestors(prev).forEach(function (a) { keep(a); pinned.add(a); a.style.setProperty("transition", "none", "important"); place(a, frameIn(a, positioned(a)), false); });
      place(prev, frameIn(prev, positioned(prev)), true);
      prev.setAttribute("aria-hidden", "true");
      resetLayer(next); next.style.setProperty("transition", "none", "important");
      showAncestors(next); show(next); next.setAttribute("aria-hidden", "false");
      var h1 = natural().h;
      pin(next);
      place(next, frameIn(next, positioned(next)), false);
      M.set(W, { height: h0 });
      layer = next;
      var t = d(0.5);
      M.fromTo(next, { xPercent: dir * 60 }, { xPercent: 0 }, { duration: t, ease: E.quint });
      M.fromTo(next, { opacity: 0 }, { opacity: 1 }, { delay: d(0.03), duration: d(0.24) });
      M.fromTo(prev, { opacity: 1 }, { opacity: 0 }, { duration: d(0.12) });
      M.fromTo(prev, { xPercent: 0 }, { xPercent: -dir * 60 }, { duration: t, ease: E.quint, onComplete: function () { resetLayer(prev); hide(prev); } });
      var toSub = next !== mobileLayer;
      backWraps.forEach(function (b) {
        M.kill(b); b.style.setProperty("transition", "none", "important");
        if (toSub) {
          M.fromTo(b, { yPercent: -100 }, { yPercent: 0 }, { duration: t, ease: E.quint });
          M.fromTo(b, { opacity: 0 }, { opacity: 1 }, { delay: d(0.03), duration: d(0.24) });
        } else {
          M.to(b, { yPercent: -100 }, { duration: t, ease: E.quint });
          M.to(b, { opacity: 0 }, { duration: d(0.12) });
        }
      });
      M.to(W, { height: h1 }, {
        duration: t, ease: E.quint,
        onComplete: function () {
          M.finish(next);
          W.style.height = "";
          resetLayer(next); unpin();
          if (next === mobileLayer) unshowAncestors();
          resetBack(); show(next);
        },
      });
      emit("nav-menu:change", { name: next === mobileLayer ? "mobile-menu" : next.getAttribute(AT), from: prev === mobileLayer ? "mobile-menu" : prev.getAttribute(AT) });
    }

    /* --- wiring --- */
    var phoneVisible = function () { return toggles.some(function (t) { return t.getClientRects().length > 0 && getComputedStyle(t).visibility !== "hidden"; }); };
    var wasPhone = phoneVisible();
    var isPart = function (t) { return W.contains(t) || links.some(function (l) { return l.contains(t); }) || toggles.some(function (x) { return x.contains(t); }); };
    links.forEach(function (l) {
      if (NO_HOVER) {
        l.addEventListener("click", function (e) {
          var n = nameOf(l);
          if (!panels[n]) return;
          e.preventDefault();
          if (current === n) close(); else request(n);
        });
        return;
      }
      l.addEventListener("pointerenter", function () {
        if (phoneOpen) return;
        var n = nameOf(l);
        cancelSwitch(); stopTracking();
        if (!panels[n]) return scheduleClose();
        if (current === null || current === n) return request(n);
        cancelClose();
        switchTimer = setTimeout(function () { switchTimer = null; request(n); }, 80);
      });
      l.addEventListener("pointerleave", function (e) {
        if (phoneOpen) return;
        if (current === null) return scheduleClose();
        if (nameOf(l) !== current) { cancelSwitch(); return startTracking(e, false); }
        startTracking(e, true, l);
      });
    });
    if (!NO_HOVER) {
      W.addEventListener("pointerenter", function () { stopTracking(); cancelClose(); });
      W.addEventListener("pointerleave", function (e) { if (phoneOpen) return; if (current !== null) startTracking(e, false); else scheduleClose(); });
    }
    toggles.forEach(function (t) { t.addEventListener("click", function (e) { e.preventDefault(); if (phoneOpen || current !== null) close(); else openPhone(); }); });
    (mobileLayer ? qa("[" + LINK + "]", mobileLayer) : []).forEach(function (l) {
      l.addEventListener("click", function (e) {
        var p = panels[nameOf(l)];
        if (!p) return;
        e.preventDefault(); slideTo(p, 1);
      });
    });
    qa("[" + AT + '="back"]', W).forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); if (mobileLayer) slideTo(mobileLayer, -1); }); });
    document.addEventListener("focusin", function (e) {
      if (phoneOpen) return;
      var t = e.target, l = t && t.closest && t.closest("[" + LINK + "]");
      if (l) { if (panels[nameOf(l)]) request(nameOf(l)); else close(); }
      else if (t && !W.contains(t)) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    document.addEventListener("pointerdown", function (e) { if ((current !== null || phoneOpen) && e.target && !isPart(e.target)) close(); });
    var rz = 0;
    window.addEventListener("resize", function () {
      cancelAnimationFrame(rz);
      rz = requestAnimationFrame(function () {
        notches.forEach(function (n) { if (n.querySelector("[data-nav-menu-notch-layer]")) notchVars(n); });
        space();
        var now = phoneVisible();
        if (now !== wasPhone) { wasPhone = now; if (phoneOpen || current !== null) return close(); }
        if (current !== null) clearSize();
      });
    });
    emit("nav-menu:mounted");
  }

  /* ------------------------------------------------------------
     3. Nav link hover (pages that opt in with data-nav-roll on <html>):
     the label rolls up and a second copy rolls in; the shared pill
     moves into the hovered link.
     ------------------------------------------------------------ */
  if (html.hasAttribute("data-nav-roll")) (function () {
    var group = q("[nav-link='main']");
    var items = qa("[data-c='nav-link']");
    var pill = q("[nav-link='bg']");
    if (!group || !pill) return;
    M.set(pill, { scale: 0.5, opacity: 0 });
    var hovered = null, last = null, pillOn = false, leaveTimer = null, outTimer = null;
    var rollOut = new Map();
    items.forEach(function (it) {
      var a = q("[nav-link='p-rel']", it), b = q("[nav-link='p-abs']", it);
      var out = function () { M.fromTo(a, { y: "-100%" }, { y: "0%" }, { duration: 0.7, ease: E.expoOut }); M.fromTo(b, { y: "0%" }, { y: "100%" }, { duration: 0.7, ease: E.expoOut }); };
      rollOut.set(it, out);
      it.addEventListener("mouseenter", function () {
        hovered = it;
        clearTimeout(outTimer);
        if (last && last !== it) rollOut.get(last)();
        last = it;
        M.fromTo(a, { y: "0%" }, { y: "-100%" }, { duration: 0.8, ease: E.expoOut });
        M.fromTo(b, { y: "100%" }, { y: "0%" }, { duration: 0.8, ease: E.expoOut });
        var r0 = pill.getBoundingClientRect();
        it.appendChild(pill);
        var r1 = pill.getBoundingClientRect();
        if (pillOn && r1.width) {
          var s = M.get(pill, "scale");
          M.set(pill, { x: (r0.left - r1.left) / 1, y: (r0.top - r1.top) / 1 });
          M.to(pill, { x: 0, y: 0 }, { duration: 0.5, ease: E.expoOut });
          M.set(pill, { scale: s });
        }
        M.to(pill, { scale: 1, opacity: 1 }, { duration: 0.5, ease: E.expoOut });
        pillOn = true;
      });
      it.addEventListener("mouseleave", function () {
        if (hovered === it) hovered = null;
        leaveTimer = setTimeout(function () { out(); last = null; }, 50);
      });
    });
    group.addEventListener("mouseleave", function () {
      outTimer = setTimeout(function () {
        if (hovered) return;
        pillOn = false;
        M.to(pill, { scale: 0.5, opacity: 0 }, { duration: 0.5, ease: E.expoOut });
      }, 50);
    });
    qa("[data-c='nav-c-link']").forEach(function (l) {
      var icon = q("[nav-c-link='icon']", l);
      l.addEventListener("mouseenter", function () { if (icon) M.to(icon, { scale: 0.8 }, { duration: 0.8, ease: E.expoOut }); M.to(l, { opacity: 0.7 }, { duration: 0.8, ease: E.expoOut }); });
      l.addEventListener("mouseleave", function () { if (icon) M.to(icon, { scale: 1 }, { duration: 0.8, ease: E.expoOut }); M.to(l, { opacity: 1 }, { duration: 0.8, ease: E.expoOut }); });
    });
  })();

  /* ------------------------------------------------------------
     4. In-page anchors glide to their target (pages that opt in with
     data-anchor-glide on <html>). Longer distances take longer.
     ------------------------------------------------------------ */
  if (html.hasAttribute("data-anchor-glide")) {
    document.addEventListener("click", function (e) {
      /* runs even when another handler took the click (the phone menu
         opens its submenu and the page still glides underneath) */
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href").slice(1);
      if (!id) return;
      var t = document.getElementById(id);
      if (!t) return;
      e.preventDefault();
      var from = window.scrollY;
      var to = Math.min(t.getBoundingClientRect().top + from, document.documentElement.scrollHeight - window.innerHeight);
      if (history.pushState) history.pushState(null, "", "#" + id);
      if (M.reduced.matches) { window.scrollTo(0, to); return; }
      var dist = Math.abs(to - from);
      var ms = Math.max(0, 472.143 * Math.log(dist + 125) - 2000);
      var t0 = performance.now();
      var ease = function (k) { return k < 0.5 ? 4 * k * k * k : (k - 1) * (2 * k - 2) * (2 * k - 2) + 1; };
      var step = function (now) {
        var k = ms ? Math.min(1, (now - t0) / ms) : 1;
        window.scrollTo(0, from + (to - from) * ease(k));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
})();
