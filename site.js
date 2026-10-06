/* site.js: shared by every page of synthe.live.
   Theme toggle, navigation (disclosure groups and the phone menu), the "On this page" index,
   Back to top, and the motion pause. The theme and motion preference are applied by a small
   inline script in each page's <head>, before first paint. See DESIGN_PLAYBOOK.md. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Theme toggle: flips data-theme, remembers the choice, keeps the label honest. */
  var themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    var paint = function () {
      var dark = root.getAttribute("data-theme") === "dark";
      themeBtn.textContent = dark ? "Light" : "Dark";
      themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    };
    themeBtn.addEventListener("click", function () {
      var dark = root.getAttribute("data-theme") !== "dark";
      root.setAttribute("data-theme", dark ? "dark" : "light");
      try { localStorage.setItem("synthe-theme", dark ? "dark" : "light"); } catch (e) {}
      paint();
    });
    paint();
  }

  /* Header height, for sticky elements that sit under it. */
  var head = document.querySelector(".site-head");
  function setHeadHeight() {
    if (head) root.style.setProperty("--head-h", head.offsetHeight + "px");
  }
  setHeadHeight();
  window.addEventListener("resize", setHeadHeight);

  /* Navigation groups (native <details>): one open at a time, mark the group holding
     the current page, close on a click outside or when focus leaves the group. */
  var groups = Array.prototype.slice.call(document.querySelectorAll(".nav-group"));
  groups.forEach(function (g) {
    if (g.querySelector('[aria-current="page"]')) g.classList.add("has-current");
    g.addEventListener("toggle", function () {
      if (g.open) groups.forEach(function (o) { if (o !== g) o.open = false; });
    });
    g.addEventListener("focusout", function (e) {
      if (g.open && e.relatedTarget && !g.contains(e.relatedTarget)) g.open = false;
    });
  });
  document.addEventListener("click", function (e) {
    groups.forEach(function (g) { if (g.open && !g.contains(e.target)) g.open = false; });
  });

  /* Phone menu: one labeled button opens the nav as a panel under the header. */
  var menuBtn = document.getElementById("nav-toggle");
  var nav = document.getElementById("topnav");
  function menuOpen() { return head && head.classList.contains("nav-open"); }
  function setMenu(open) {
    if (!head || !menuBtn) return;
    head.classList.toggle("nav-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.textContent = open ? "Close" : "Menu";
  }
  if (head && menuBtn && nav) {
    menuBtn.addEventListener("click", function () { setMenu(!menuOpen()); });
    nav.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("click", function (e) {
      if (menuOpen() && !head.contains(e.target)) setMenu(false);
    });
  }

  /* Escape closes the innermost open thing: a nav group first, then the phone menu. */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var open = groups.filter(function (g) { return g.open; })[0];
    if (open) {
      open.open = false;
      open.querySelector("summary").focus();
    } else if (menuOpen()) {
      setMenu(false);
      menuBtn.focus();
    }
  });

  /* "On this page": mark the section in view. */
  var toc = document.querySelector(".page-toc");
  if (toc && "IntersectionObserver" in window) {
    var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
    var targets = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
    var visible = {};
    var mark = function () {
      var current = null;
      targets.forEach(function (t) { if (t && visible[t.id]) current = current || t.id; });
      if (!current) return;
      links.forEach(function (a) {
        if (a.getAttribute("href") === "#" + current) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
      mark();
    }, { rootMargin: "-20% 0px -65% 0px" });
    targets.forEach(function (t) { if (t) io.observe(t); });
  }

  /* Back to top: only on pages longer than four screens, once the reader is well down. */
  var page = document.querySelector(".page");
  if (page && document.documentElement.scrollHeight > window.innerHeight * 4) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "to-top";
    btn.textContent = "Back to top";
    btn.hidden = true;
    page.appendChild(btn);
    var onScroll = function () { btn.hidden = window.scrollY < window.innerHeight * 1.5; };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      var mark = document.querySelector(".wordmark");
      if (mark) mark.focus({ preventScroll: true });
    });
  }

  /* Motion: one control pauses every decorative animation on the site and remembers it. */
  var motionBtn = document.getElementById("motion-toggle");
  if (motionBtn) {
    var paintMotion = function () {
      var paused = root.classList.contains("motion-paused");
      motionBtn.textContent = paused ? "Play motion" : "Pause motion";
    };
    motionBtn.addEventListener("click", function () {
      var paused = !root.classList.contains("motion-paused");
      root.classList.toggle("motion-paused", paused);
      try { localStorage.setItem("synthe-motion", paused ? "paused" : "on"); } catch (e) {}
      paintMotion();
    });
    if (reduceMotion) motionBtn.hidden = true;
    paintMotion();
  }
})();
