/* site.js: shared by every page of synthe.live.
   The theme switch, the mark (the header logo locks; copy buttons lock), the lattice glow,
   navigation (disclosure groups and the phone menu), the "On this page" index, Back to top,
   and the motion pause. The theme and motion preference are applied by a small inline script
   in each page's <head>, before first paint. See DESIGN_PLAYBOOK.md. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Theme switch: a sun and a moon, the current mode filled. It reports the theme the page is actually
     showing, as the stylesheet resolved it, so it is right even before a choice is saved. */
  var themeBtn = document.getElementById("theme-toggle");
  var systemTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
  var themeFrame = 0;
  function savedTheme() {
    try {
      var value = localStorage.getItem("synthe-theme");
      return value === "light" || value === "dark" ? value : null;
    } catch (e) { return null; }
  }
  var themePreference = savedTheme();
  var showing = function () {
    return getComputedStyle(root).getPropertyValue("--mode").trim() === "dark" ? "dark" : "light";
  };
  if (themeBtn) {
    var paint = function () {
      var dark = showing() === "dark";
      themeBtn.setAttribute("aria-checked", dark ? "true" : "false");
      themeBtn.title = dark ? "Dark mode is on. Switch to light." : "Light mode is on. Switch to dark.";
    };
    var setTheme = function (next) {
      /* Change the palette together. Only the selector moves: interpolating text and
         surfaces can lose contrast between two otherwise accessible themes. */
      cancelAnimationFrame(themeFrame);
      root.classList.add("theme-setting");
      root.setAttribute("data-theme", next);
      root.style.colorScheme = next;
      paint();
      void root.offsetHeight;
      themeFrame = requestAnimationFrame(function () {
        themeFrame = requestAnimationFrame(function () { root.classList.remove("theme-setting"); });
      });
    };
    themeBtn.addEventListener("click", function () {
      var next = showing() === "dark" ? "light" : "dark";
      themePreference = next;
      try { localStorage.setItem("synthe-theme", next); } catch (e) {}
      setTheme(next);
    });
    var followSystem = function () {
      if (!themePreference) setTheme(systemTheme && systemTheme.matches ? "dark" : "light");
    };
    if (systemTheme && systemTheme.addEventListener) systemTheme.addEventListener("change", followSystem);
    window.addEventListener("storage", function (e) {
      if (e.key === "synthe-theme" || e.key === null) {
        var saved = savedTheme();
        themePreference = saved;
        setTheme(saved === "dark" || saved === "light" ? saved : systemTheme && systemTheme.matches ? "dark" : "light");
      }
    });
    paint();
    window.addEventListener("load", paint);
  }

  /* The header mark starts apart and locks once the page is ready. */
  var logo = document.querySelector(".wordmark .mark");
  if (logo) setTimeout(function () { logo.classList.remove("open"); }, reduceMotion ? 0 : 120);

  /* Copy buttons: the command goes to the clipboard and the button's mark locks for a moment. */
  Array.prototype.forEach.call(document.querySelectorAll(".copy"), function (b) {
    var resetCopy = 0;
    b.addEventListener("click", function () {
      var code = b.querySelector("code") || b.parentElement.querySelector("code");
      var label = b.querySelector(".btn-label span") || b.querySelector("span");
      var m = b.querySelector(".mark");
      var result = function (copied) {
        clearTimeout(resetCopy);
        if (m) m.classList.toggle("open", !copied);
        b.classList.toggle("done", copied);
        if (label) label.textContent = copied ? "Copied" : "Failed";
        resetCopy = setTimeout(function () {
          if (m) m.classList.add("open");
          b.classList.remove("done");
          if (label) label.textContent = "Copy";
        }, 2200);
      };
      if (code && navigator.clipboard) navigator.clipboard.writeText(code.textContent).then(function () { result(true); }, function () { result(false); });
      else result(false);
    });
  });

  /* The lattice glows softly where the cursor is: pointers that hover only, never with reduced motion. */
  if (!reduceMotion && window.matchMedia && window.matchMedia("(hover: hover)").matches) {
    Array.prototype.forEach.call(document.querySelectorAll(".lattice-glow"), function (glow) {
      var host = glow.parentElement, raf = 0;
      host.addEventListener("pointermove", function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = host.getBoundingClientRect();
          host.style.setProperty("--mx", (e.clientX - r.left) + "px");
          host.style.setProperty("--my", (e.clientY - r.top) + "px");
          host.classList.add("lit");
        });
      });
      host.addEventListener("pointerleave", function () { host.classList.remove("lit"); });
    });
  }

  /* Header height, for sticky elements that sit under it. */
  var head = document.querySelector(".site-head");
  function setHeadHeight() {
    if (head) root.style.setProperty("--head-h", head.offsetHeight + "px");
  }
  /* Scrollbar width, so full-bleed bands (100vw, which includes a classic scrollbar) don't scroll sideways. */
  function setScrollbar() {
    root.style.setProperty("--sbw", Math.max(0, window.innerWidth - root.clientWidth) + "px");
  }
  setHeadHeight();
  setScrollbar();
  var headState = function () { if (head) head.classList.toggle("is-scrolled", window.scrollY > 8); };
  headState();
  window.addEventListener("scroll", headState, { passive: true });
  window.addEventListener("resize", function () { setHeadHeight(); setScrollbar(); });
  window.addEventListener("load", setScrollbar);

  /* The example changes its prompt once, then records the verdicts. On a phone
     the report waits until it is visible, instead of finishing below the fold. */
  var example = document.querySelector(".product-figure");
  if (example) {
    var flowMedia = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    var promptSheet = example.querySelector(".prompt-sheet");
    var reportSheet = example.querySelector(".report");
    var changes = Array.prototype.slice.call(example.querySelectorAll(".changed"));
    var verdicts = Array.prototype.slice.call(example.querySelectorAll(".report-results li"));
    var flowTimers = [], flowObserver = null;
    var promptStarted = false, promptDone = false, reportVisible = false, reportStarted = false, flowDone = false;
    var later = function (ms, fn) { flowTimers.push(setTimeout(function () { if (!flowDone) fn(); }, ms)); };
    var finishFlow = function () {
      flowDone = true;
      flowTimers.forEach(clearTimeout);
      if (flowObserver) flowObserver.disconnect();
      changes.forEach(function (line) { line.classList.add("is-kept"); });
      verdicts.forEach(function (row) { row.classList.add("is-reported"); });
      example.classList.remove("flow-ready");
      example.setAttribute("data-flow-state", "complete");
    };
    var showReport = function () {
      if (!promptDone || !reportVisible || reportStarted || flowDone) return;
      reportStarted = true;
      example.setAttribute("data-flow-state", "report");
      verdicts.forEach(function (row, i) { later(i * 160, function () { row.classList.add("is-reported"); }); });
      later(720, finishFlow);
    };
    var showPrompt = function () {
      if (promptStarted || flowDone) return;
      promptStarted = true;
      example.setAttribute("data-flow-state", "prompt");
      changes.forEach(function (line, i) {
        later(i * 800 + 80, function () { line.classList.add("is-checking"); });
        later(i * 800 + 520, function () { line.classList.add("is-kept"); });
      });
      later(1680, function () {
        promptDone = true;
        example.setAttribute("data-flow-state", "waiting-for-report");
        showReport();
      });
    };
    if (!promptSheet || !reportSheet || reduceMotion || root.classList.contains("motion-paused") || !("IntersectionObserver" in window)) finishFlow();
    else {
      flowObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || entry.intersectionRatio < .6) return;
          flowObserver.unobserve(entry.target);
          if (entry.target === reportSheet) { reportVisible = true; showPrompt(); showReport(); }
          else showPrompt();
        });
      }, { threshold: .6 });
      flowObserver.observe(promptSheet);
      flowObserver.observe(reportSheet);
      example.classList.add("flow-ready");
      example.setAttribute("data-flow-state", "ready");
      if (flowMedia && flowMedia.addEventListener) flowMedia.addEventListener("change", function (e) { if (e.matches) finishFlow(); });
      document.addEventListener("visibilitychange", function () { if (document.hidden) finishFlow(); });
    }
  }

  /* One arrival per chapter. Critical content and groups already in view stay still. */
  if (!reduceMotion && !root.classList.contains("motion-paused") && "IntersectionObserver" in window) {
    var arrivals = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove("reveal-pending");
        arrivals.unobserve(entry.target);
      });
    }, { threshold: .15, rootMargin: "0px 0px -10% 0px" });
    Array.prototype.forEach.call(document.querySelectorAll(".proof, .cards, .steps, .contact"), function (section) {
      if (section.getBoundingClientRect().top <= window.innerHeight) return;
      section.classList.add("scroll-reveal", "reveal-pending");
      arrivals.observe(section);
    });
  }

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
  var narrowNav = window.matchMedia && window.matchMedia("(max-width: 900px)");
  function menuOpen() { return head && head.classList.contains("nav-open"); }
  function syncMenuAccess() { if (nav) nav.inert = !!(narrowNav && narrowNav.matches && !menuOpen()); }
  function setMenu(open) {
    if (!head || !menuBtn) return;
    head.classList.toggle("nav-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.textContent = open ? "Close" : "Menu";
    syncMenuAccess();
  }
  if (head && menuBtn && nav) {
    syncMenuAccess();
    if (narrowNav && narrowNav.addEventListener) narrowNav.addEventListener("change", function () {
      if (!narrowNav.matches) setMenu(false);
      syncMenuAccess();
    });
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
  /* Cards: a soft accent light follows the pointer around the border. Fine pointers only. */
  if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduceMotion) {
    Array.prototype.forEach.call(document.querySelectorAll(".card"), function (card) {
      var raf = 0;
      card.addEventListener("pointermove", function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = card.getBoundingClientRect();
          card.style.setProperty("--mx", (e.clientX - r.left) + "px");
          card.style.setProperty("--my", (e.clientY - r.top) + "px");
        });
      });
    });
  }

  /* The hero field: a slow, warped paper-and-accent gradient with faint contour lines and grain,
     drawn with WebGL2 over a CSS still. It reads its colours from the theme, renders one still frame
     under reduced motion, and pauses when off screen, when the tab is hidden, or when WebGL is missing. */
  var field = document.querySelector(".hero-field");
  var canvas = field && field.querySelector("canvas");
  var gl = canvas && canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (gl) {
    var vs = "#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    var fs = "#version 300 es\nprecision highp float;uniform vec2 r;uniform float t;uniform vec3 c0,c1,c2,cl;out vec4 o;" +
      "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}" +
      "float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}" +
      "float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}" +
      "void main(){vec2 uv=gl_FragCoord.xy/r;vec2 p=uv*vec2(r.x/r.y,1.)*1.4;" +
      "float w=fbm(p+vec2(t*.018,-t*.012));float f=fbm(p*1.2+w*1.9+vec2(-t*.01,t*.008));" +
      "float side=smoothstep(.2,1.,uv.x*.9+uv.y*.5);float g=smoothstep(.25,.8,f)*side;" +
      "vec3 c=mix(c0,c2,smoothstep(.35,.9,w)*.6);c=mix(c,c1,g);" +
      "float k=f*18.;float d=abs(fract(k)-.5)/fwidth(k);float line=(1.-clamp(d,0.,1.))*.32*side*smoothstep(.25,.7,f);" +
      "c=mix(c,cl,line);c+=(h(gl_FragCoord.xy)-.5)*.018;o=vec4(c,1.);}";
    var compile = function (type, src) { var sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null; };
    var v = compile(gl.VERTEX_SHADER, vs), f = compile(gl.FRAGMENT_SHADER, fs);
    var prog = v && f && gl.createProgram();
    if (prog) { gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog); }
    if (prog && gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      var U = {}; ["r", "t", "c0", "c1", "c2", "cl"].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
      var rgb = function (name) {
        var hex = getComputedStyle(root).getPropertyValue(name).trim().replace("#", "");
        if (hex.length === 3) hex = hex.replace(/./g, "$&$&");
        var x = parseInt(hex.slice(0, 6), 16);
        return isNaN(x) ? [0, 0, 0] : [(x >> 16 & 255) / 255, (x >> 8 & 255) / 255, (x & 255) / 255];
      };
      var paintColours = function () {
        gl.uniform3fv(U.c0, rgb("--bg")); gl.uniform3fv(U.c1, rgb("--accent-bg"));
        gl.uniform3fv(U.c2, rgb("--bg2")); gl.uniform3fv(U.cl, rgb("--accent"));
      };
      var size = function () {
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        var w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(U.r, w, h); }
      };
      var start = performance.now(), visible = true, frame = 0;
      var draw = function (now) {
        size();
        gl.uniform1f(U.t, reduceMotion ? 12 : 12 + (now - start) / 1000);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      var loop = function (now) { frame = 0; draw(now); if (visible && !document.hidden && !reduceMotion) frame = requestAnimationFrame(loop); };
      var run = function () { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(loop); };
      paintColours();
      draw(performance.now());
      field.classList.add("is-live");
      if (!reduceMotion) {
        if ("IntersectionObserver" in window) {
          new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) run(); }, { rootMargin: "20px 0px" }).observe(field);
        }
        document.addEventListener("visibilitychange", run);
        run();
      }
      new MutationObserver(function () { paintColours(); draw(performance.now()); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
      window.addEventListener("resize", function () { draw(performance.now()); });
    }
  }
})();
