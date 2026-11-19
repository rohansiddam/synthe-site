
(function () {
  "use strict";

  
  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  var state = { flowPaused: false, flowPauseReason: "" };
  try {
    window.__syntheBehavior = state;
  } catch (e) {}

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  
  function initFlow() {
    var section = document.querySelector(".section_home-flow");
    if (!section) return;

    var wired = false;
    var lastActive = null;

    function allButtons() {
      return toArray(section.querySelectorAll('[data-uses="button"]'));
    }
    function allCards() {
      return toArray(section.querySelectorAll('[data-uses="card"]'));
    }
    
    function originalList() {
      var lists = toArray(
        section.querySelectorAll('[data-uses="button-list"]')
      );
      for (var i = 0; i < lists.length; i++) {
        if (lists[i].getAttribute("aria-hidden") !== "true") return lists[i];
      }
      return lists[0] || null;
    }
    function originalButtons() {
      var list = originalList();
      if (!list) return [];
      return toArray(list.querySelectorAll('[data-uses="button"]'));
    }
    
    function currentStep() {
      var active = section.querySelector('[data-uses="button"].cc-active');
      if (!active) return null;
      var n = parseInt(active.getAttribute("data-unique"), 10);
      return isNaN(n) ? null : n;
    }

    function tabId(unique) {
      return "synthe-flow-tab-" + unique;
    }
    function panelId(unique) {
      return "synthe-flow-panel-" + unique;
    }

    
    function enhance() {
      var list = originalList();
      if (!list) return;
      list.setAttribute("role", "tablist");
      list.setAttribute("aria-label", "Loop steps");

      var tabs = originalButtons();
      var cards = allCards();
      var active = currentStep();
      if (active === null) active = 1;

      tabs.forEach(function (btn) {
        var u = btn.getAttribute("data-unique");
        if (!u) return;
        if (!btn.getAttribute("id")) btn.setAttribute("id", tabId(u));
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-controls", panelId(u));
        var isActive = parseInt(u, 10) === active;
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
        btn.tabIndex = isActive ? 0 : -1;
      });

      
      allButtons().forEach(function (btn) {
        var holder = btn.closest('[data-uses="button-list"]');
        if (holder && holder.getAttribute("aria-hidden") === "true") {
          btn.removeAttribute("role");
          btn.removeAttribute("aria-selected");
          btn.removeAttribute("aria-controls");
          if ((btn.getAttribute("id") || "").indexOf("synthe-flow-") === 0) {
            btn.removeAttribute("id");
          }
          btn.tabIndex = -1;
        }
      });

      cards.forEach(function (card) {
        var u = card.getAttribute("data-unique");
        if (!u) return;
        if (!card.getAttribute("id")) card.setAttribute("id", panelId(u));
        card.setAttribute("role", "tabpanel");
        card.setAttribute("aria-labelledby", tabId(u));
        if (parseInt(u, 10) === active) {
          card.removeAttribute("aria-hidden");
        } else {
          card.setAttribute("aria-hidden", "true");
        }
      });
    }

    function sync() {
      var active = currentStep();
      if (active === null || active === lastActive) return;
      lastActive = active;
      enhance();
    }

    
    function onKeydown(e) {
      var btn = e.target && e.target.closest
        ? e.target.closest('[data-uses="button"]')
        : null;
      if (!btn) return;
      var tabs = originalButtons();
      var idx = tabs.indexOf(btn);
      if (idx === -1) return;
      var target = null;
      if (e.key === "ArrowRight") target = (idx + 1) % tabs.length;
      else if (e.key === "ArrowLeft")
        target = (idx - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") target = 0;
      else if (e.key === "End") target = tabs.length - 1;
      else return;
      e.preventDefault();
      var dest = tabs[target];
      if (!dest) return;
      
      dest.click();
      dest.focus();
      
      window.setTimeout(sync, 120);
    }

    
    var sectionVisible = false;
    var focusInside = false;

    function recomputePause() {
      var reason = "";
      if (document.hidden) reason = "document-hidden";
      else if (!sectionVisible) reason = "off-screen";
      else if (focusInside) reason = "focus-inside";
      else if (reduceMQ.matches) reason = "reduced-motion";
      state.flowPaused = !!reason;
      state.flowPauseReason = reason;
      if (reason) section.setAttribute("data-flow-paused", reason);
      else section.removeAttribute("data-flow-paused");
    }

    function armObservers() {
      if ("IntersectionObserver" in window) {
        try {
          new IntersectionObserver(
            function (entries) {
              sectionVisible = entries[0].isIntersecting;
              recomputePause();
            },
            { threshold: 0 }
          ).observe(section);
        } catch (e) {
          sectionVisible = true;
        }
      } else {
        sectionVisible = true;
      }
      document.addEventListener("visibilitychange", recomputePause);
      section.addEventListener("focusin", function () {
        focusInside = true;
        recomputePause();
      });
      section.addEventListener("focusout", function () {
        window.requestAnimationFrame(function () {
          focusInside = section.contains(document.activeElement);
          recomputePause();
        });
      });
      if (reduceMQ.addEventListener) {
        reduceMQ.addEventListener("change", recomputePause);
      }
      recomputePause();
    }

    function wire() {
      if (wired) return;
      wired = true;
      enhance();
      lastActive = currentStep();
      var list = originalList();
      if (list) list.addEventListener("keydown", onKeydown);
      
      if ("MutationObserver" in window) {
        try {
          new MutationObserver(function () {
            sync();
          }).observe(section, {
            subtree: true,
            attributes: true,
            attributeFilter: ["class"],
          });
        } catch (e) {}
      }
      armObservers();
    }

    
    var tries = 0;
    var iv = window.setInterval(function () {
      tries++;
      var ready =
        section.querySelector('[data-uses="button"].cc-active') ||
        section.querySelector(
          '[data-uses="button-list"][aria-hidden="true"]'
        );
      if (ready || tries > 66) {
        window.clearInterval(iv);
        wire();
      }
    }, 150);
  }

  
  function initWallGate() {
    var held = false;

    function tracks() {
      return toArray(document.querySelectorAll("[data-logo-track]"));
    }
    function dispatch(el, type) {
      try {
        el.dispatchEvent(
          new MouseEvent(type, { bubbles: false, cancelable: true })
        );
      } catch (e) {}
    }
    function engage() {
      
      if (!tracks().length) {
        var tries = 0;
        var iv = window.setInterval(function () {
          tries++;
          if (!reduceMQ.matches || tracks().length || tries > 20) {
            window.clearInterval(iv);
            if (reduceMQ.matches && tracks().length) engage();
          }
        }, 300);
        return;
      }
      tracks().forEach(function (t) {
        dispatch(t, "mouseenter");
        
        if (!t.__syntheGateGuard) {
          t.__syntheGateGuard = true;
          t.addEventListener("mouseleave", function () {
            if (held && reduceMQ.matches) {
              window.setTimeout(function () {
                if (held && reduceMQ.matches) dispatch(t, "mouseenter");
              }, 50);
            }
          });
        }
      });
      held = tracks().length > 0;
    }
    function release() {
      held = false;
      tracks().forEach(function (t) {
        var hovered = false;
        try {
          hovered = t.matches(":hover");
        } catch (e) {}
        
        if (!hovered) dispatch(t, "mouseleave");
      });
    }
    if (reduceMQ.addEventListener) {
      reduceMQ.addEventListener("change", function () {
        if (reduceMQ.matches) engage();
        else release();
      });
    }
    
    if (reduceMQ.matches) engage();
  }

  
  function initCopy() {
    var form = document.querySelector(
      ".section_input-action form.home-action_form"
    );
    if (!form) return;
    var btn = form.querySelector('[data-role="copy"]');
    var out = form.querySelector('[data-role="result-prompt"]');
    var panel = form.querySelector('[data-role="result"]');
    if (!btn || !out) return;

    btn.setAttribute("aria-live", "polite");

    var checkTimer = null;
    var revertTimer = null;

    btn.addEventListener("click", function () {
      if (checkTimer) window.clearTimeout(checkTimer);
      if (revertTimer) window.clearTimeout(revertTimer);
      checkTimer = window.setTimeout(function () {
        var label = (btn.textContent || "").trim();
        var text = (out.textContent || "").trim();
        if (!text) return;
        if (panel && panel.hidden) return;
        
        if (label !== "Copy" && label !== "Select and copy") return;
        try {
          var sel = window.getSelection();
          var range = document.createRange();
          range.selectNodeContents(out);
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (e) {}
        btn.textContent = "Select and copy";
        revertTimer = window.setTimeout(function () {
          if ((btn.textContent || "").trim() === "Select and copy") {
            btn.textContent = "Copy";
          }
        }, 2000);
      }, 900);
    });
  }

  onReady(function () {
    try {
      initFlow();
    } catch (e) {}
    try {
      initWallGate();
    } catch (e) {}
    try {
      initCopy();
    } catch (e) {}
  });
})();
