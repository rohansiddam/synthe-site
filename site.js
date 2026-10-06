/* site.js: shared by every page of synthe.live. The theme toggle and the phone menu.
   The theme itself is set by a small inline script in each page's <head>, before first paint. */
(function () {
  "use strict";

  /* Theme toggle: flips data-theme, remembers the choice, keeps the label honest. */
  var themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    var paint = function () {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      themeBtn.textContent = dark ? "Light" : "Dark";
      themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    };
    themeBtn.addEventListener("click", function () {
      var dark = document.documentElement.getAttribute("data-theme") !== "dark";
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
      try { localStorage.setItem("synthe-theme", dark ? "dark" : "light"); } catch (e) {}
      paint();
    });
    paint();
  }

  /* Phone menu: one button opens the nav as a panel under the header. */
  var head = document.querySelector(".site-head");
  var menuBtn = document.getElementById("nav-toggle");
  var nav = document.getElementById("topnav");
  if (head && menuBtn && nav) {
    var setOpen = function (open) {
      head.classList.toggle("nav-open", open);
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.textContent = open ? "Close" : "Menu";
    };
    menuBtn.addEventListener("click", function () {
      setOpen(!head.classList.contains("nav-open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && head.classList.contains("nav-open")) {
        setOpen(false);
        menuBtn.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (head.classList.contains("nav-open") && !head.contains(e.target)) setOpen(false);
    });
  }
})();
