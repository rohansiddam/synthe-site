
(function () {
  "use strict";
  var M = window.SyntheMotion;
  if (!M) return;
  var html = document.documentElement;

  
  if (html.hasAttribute("data-anchor-glide")) {
    document.addEventListener("click", function (e) {
      
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      
      var a = e.target.closest && e.target.closest("a[href*='#']");
      var page = function (path) { return path.replace(/index\.html$/, ""); };
      if (!a || a.target === "_blank" || a.origin !== location.origin || page(a.pathname) !== page(location.pathname) || a.search !== location.search) return;
      var id = decodeURIComponent(a.hash.slice(1));
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
