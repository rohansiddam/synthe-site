
(function () {
  var form = document.querySelector(".section_input-action form.home-action_form");
  if (!form) return;
  var field = form.querySelector("#sculptor-prompt");
  var out = form.querySelector("[data-try-objective]");
  var pathOut = form.querySelector("[data-try-path]");
  var agentOut = form.querySelector("[data-try-agent]");
  var chipsBox = form.querySelector(".home-action_button-group");
  if (!field || !out) return;
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EMPTY = "Name a check your agent should pass.";

  
  function esc(t) { return JSON.stringify(t).slice(1, -1); }
  function render() {
    var typed = field.value.replace(/\s+/g, " ").trim();
    out.textContent = esc(typed || EMPTY);
    out.classList.toggle("is-example", !typed);
  }
  field.addEventListener("input", render);
  
  form.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-chip]")) setTimeout(render, 0);
  });

  var S = window.SyntheIndustry;
  if (!S) { render(); return; }

  
  var known = {};
  S.list.forEach(function (ind) {
    ind.examples.forEach(function (t) { known[t] = 1; });
    ind.chips.forEach(function (c) { known[c[1]] = 1; });
  });
  function untouched() { var v = field.value.trim(); return !v || known[v] === 1; }

  
  var root = getComputedStyle(document.documentElement);
  function curve(name, fb) { var v = root.getPropertyValue(name).trim(); return v || fb; }
  var EXIT = curve("--e-exit", "cubic-bezier(0.4, 0, 1, 1)");
  var SETTLE = curve("--e-settle", "cubic-bezier(0.2, 0.8, 0.2, 1)");
  var FADE = curve("--e-fade", "linear");
  var STAG = [0, 60, 105, 139, 164, 183];
  var parts = [
    form.querySelector(".try-compose .try-pane-label"),
    form.querySelector(".home-action_wrap"),
    chipsBox,
    form.querySelector(".try-code"),
    form.querySelector('[data-role="result-prompt"]')
  ].filter(Boolean);
  var running = [], swapTimer = null;
  function anim(el, frames, opts) {
    try { return el.animate(frames, opts); }
    catch (e) { opts.easing = "ease"; return el.animate(frames, opts); }
  }
  function stopAll() { running.forEach(function (a) { a.cancel(); }); running = []; }
  function swap(change) {
    if (!parts[0] || !parts[0].animate) { change(); return; }
    if (RM) {
      stopAll(); change();
      parts.forEach(function (el) { running.push(anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: "linear" })); });
      return;
    }
    
    var now = parts.map(function (el) {
      var cs = getComputedStyle(el), m = cs.transform && cs.transform !== "none" ? new DOMMatrix(cs.transform) : null;
      return { o: parseFloat(cs.opacity), y: m ? m.m42 : 0 };
    });
    stopAll(); clearTimeout(swapTimer);
    var longest = 0;
    parts.forEach(function (el, i) {
      var d = Math.round(180 * now[i].o); longest = Math.max(longest, d);
      running.push(anim(el, [
        { opacity: now[i].o, transform: "translateY(" + now[i].y + "px)" },
        { opacity: 0, transform: "translateY(" + now[i].y + "px)" }
      ], { duration: Math.max(d, 1), easing: EXIT, fill: "forwards" }));
    });
    swapTimer = setTimeout(function () {
      stopAll(); change();
      parts.forEach(function (el, i) {
        var o = { delay: STAG[i] || 183, fill: "backwards" };
        running.push(anim(el, [{ transform: "translateY(8px)" }, { transform: "none" }], { duration: 520, easing: SETTLE, delay: o.delay, fill: o.fill }));
        running.push(anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 208, easing: FADE, delay: o.delay, fill: o.fill }));
      });
    }, longest);
  }

  
  function fill(ind) {
    var chips = chipsBox ? chipsBox.querySelectorAll("[data-chip]") : [];
    Array.prototype.forEach.call(chips, function (c, i) {
      var d = ind.chips[i]; if (!d) return;
      c.setAttribute("data-prompt", d[1]);
      var t = c.querySelector(".text-size-small"); if (t) t.textContent = d[0];
    });
    if (agentOut) agentOut.textContent = ind.agent;
    if (pathOut) pathOut.textContent = "prompts/" + ind.agent.replace(/ agent$/, "").replace(/\s+/g, "-") + ".md";
    form.dispatchEvent(new CustomEvent("synthe:examples"));
    if (untouched() && ind.examples[0]) field.value = ind.examples[0];
    form.dispatchEvent(new CustomEvent("synthe:goal"));
    render();
  }
  
  var codeEl = form.querySelector(".try-code");
  var promptEl = form.querySelector('[data-role="result-prompt"]');
  var labelEl = parts[0];
  var held = [labelEl, chipsBox, codeEl, promptEl].filter(Boolean);
  function reserve() {
    var prefix = form.getAttribute("data-setup-prefix") || "";
    var chipEls = chipsBox ? Array.prototype.slice.call(chipsBox.querySelectorAll("[data-chip] .text-size-small")) : [];
    var save = {
      agent: agentOut && agentOut.textContent, path: pathOut && pathOut.textContent,
      obj: out.textContent, prompt: promptEl && promptEl.textContent,
      chips: chipEls.map(function (c) { return c.textContent; })
    };
    held.forEach(function (el) { el.style.minHeight = ""; });
    var max = held.map(function () { return 0; });
    S.list.forEach(function (ind) {
      var goal = untouched() ? ind.examples[0] : field.value.replace(/\s+/g, " ").trim();
      if (agentOut) agentOut.textContent = ind.agent;
      if (pathOut) pathOut.textContent = "prompts/" + ind.agent.replace(/ agent$/, "").replace(/\s+/g, "-") + ".md";
      out.textContent = esc(goal);
      if (promptEl) promptEl.textContent = prefix + goal;
      chipEls.forEach(function (c, i) { if (ind.chips[i]) c.textContent = ind.chips[i][0]; });
      held.forEach(function (el, i) { max[i] = Math.max(max[i], el.getBoundingClientRect().height); });
    });
    if (agentOut) agentOut.textContent = save.agent;
    if (pathOut) pathOut.textContent = save.path;
    out.textContent = save.obj;
    if (promptEl) promptEl.textContent = save.prompt;
    chipEls.forEach(function (c, i) { c.textContent = save.chips[i]; });
    held.forEach(function (el, i) { el.style.minHeight = Math.ceil(max[i]) + "px"; });
  }
  var rT = null, lastW = window.innerWidth;
  window.addEventListener("resize", function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth; clearTimeout(rT); rT = setTimeout(reserve, 150);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reserve);

  window.addEventListener("synthe:industry", function (e) {
    var ind = e.detail.industry;
    swap(function () { fill(ind); });
  });
  fill(S.get());
  reserve();
})();
