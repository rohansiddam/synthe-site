/* Synthe prompt box (lane 3).
   Local only: no backend, no form post, no network.

   Wiring vs the build's form neutralizer: build.py injects a
   document-level CAPTURE submit listener that calls preventDefault()
   and stopPropagation() (NOT stopImmediatePropagation()). A submit
   listener on the form itself would never fire, because the capture
   phase hits document first and stopPropagation keeps the event from
   travelling on to the form. So this handler is ALSO registered on
   document with capture=true: listeners on the SAME node still all run
   despite stopPropagation, so ours fires, checks the target is the
   prompt form, and generates the panel. Chip clicks are plain click
   handlers (chips are type="button", so they never submit anyway). */
(function () {
  var form = document.querySelector(
    ".section_input-action form.home-action_form"
  );
  if (!form) return;
  var textarea = form.querySelector("#sculptor-prompt");
  var panel = form.querySelector('[data-role="result"]');
  var promptOut = form.querySelector('[data-role="result-prompt"]');
  var copyBtn = form.querySelector('[data-role="copy"]');
  if (!textarea || !panel || !promptOut) return;

  var SETUP_PREFIX =
    "Set up Synthe in this repo. Run npx synthe@latest guide and follow " +
    "it. My agent should get better at: ";
  var currentPrompt = "";
  var copyTimer = null;

  function generate(rawGoal) {
    var goal = (rawGoal || "").replace(/\s+/g, " ").trim();
    if (!goal) {
      textarea.focus();
      return;
    }
    currentPrompt = SETUP_PREFIX + goal;
    promptOut.textContent = currentPrompt;
    panel.hidden = false;
    if (copyBtn) copyBtn.textContent = "Copy";
    panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  document.addEventListener(
    "submit",
    function (e) {
      if (e.target !== form) return;
      e.preventDefault();
      generate(textarea.value);
    },
    true
  );

  var chips = form.querySelectorAll("button[data-chip][data-prompt]");
  Array.prototype.forEach.call(chips, function (chip) {
    chip.addEventListener("click", function () {
      textarea.value = chip.getAttribute("data-prompt") || "";
      generate(textarea.value);
    });
  });

  function markCopied() {
    if (!copyBtn) return;
    copyBtn.textContent = "Copied";
    if (copyTimer) window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(function () {
      copyBtn.textContent = "Copy";
    }, 2000);
  }

  function fallbackCopy(text) {
    var tmp = document.createElement("textarea");
    tmp.value = text;
    tmp.setAttribute("readonly", "");
    tmp.style.position = "fixed";
    tmp.style.opacity = "0";
    document.body.appendChild(tmp);
    tmp.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (err) {
      ok = false;
    }
    document.body.removeChild(tmp);
    return ok;
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      if (!currentPrompt) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(currentPrompt).then(
          markCopied,
          function () {
            if (fallbackCopy(currentPrompt)) markCopied();
          }
        );
      } else if (fallbackCopy(currentPrompt)) {
        markCopied();
      }
    });
  }
})();
