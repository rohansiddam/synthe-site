
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
  form.setAttribute("data-setup-prefix", SETUP_PREFIX); 
  var currentPrompt = "";
  var copyTimer = null;

  
  function generate(rawGoal, quiet) {
    var goal = (rawGoal || "").replace(/\s+/g, " ").trim();
    if (!goal) {
      if (!quiet) textarea.focus();
      return;
    }
    currentPrompt = SETUP_PREFIX + goal;
    promptOut.textContent = currentPrompt;
    panel.hidden = false;
    if (copyBtn) copyBtn.textContent = "Copy";
    if (quiet) return;
    
    panel.classList.remove("is-fresh");
    void panel.offsetWidth;
    panel.classList.add("is-fresh");
    panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  form.addEventListener("synthe:goal", function () {
    generate(textarea.value, true);
  });
  generate(textarea.value, true);

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
    }, 1600);
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
