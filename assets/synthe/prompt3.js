/* Synthe prompt section reveal (prompt3).

   promptbox.js shows the result panel by flipping its `hidden`
   attribute off, and the panel used to hard-cut in. This layer
   watches that one attribute and turns the cut into a designed
   reveal: the region expands (height + margin-top on the site's
   .45s cubic-bezier(.22,1,.36,1) curve, declared in prompt3.css)
   while its blocks stagger in, Copy last.

   It adds no hooks of its own and changes no behaviour:
   promptbox.js and behavior.js are untouched, every selector
   they use resolves exactly as before, and the panel's `hidden`
   semantics are preserved (this file never sets it). If this
   file fails to load, the section behaves exactly as it did
   before: the panel appears in its settled state.

   Regeneration (a second chip click or Generate while the panel
   is already open) rewrites the prompt text in place; the text
   observer below gives that swap a short dip-and-rise, and if
   the new text wraps to a different height, the region glides
   to it instead of stepping.

   There is no dismiss path to animate: promptbox.js never
   re-hides the panel once shown.

   Reduced motion: nothing is armed. The panel appears in its
   settled state instantly, and prompt3.css's reduced-motion
   block keeps the stagger off as well. */
(function () {
  var form = document.querySelector(
    ".section_input-action form.home-action_form"
  );
  if (!form) return;
  var panel = form.querySelector('[data-role="result"]');
  var promptOut = form.querySelector('[data-role="result-prompt"]');
  if (!panel || !promptOut) return;
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  /* The height transition runs 450ms; the last staggered block
     (Copy, delay 400ms + 380ms) settles at 780ms. Inline styles
     come off after both, so the settled layout is pure CSS. */
  var SETTLE_MS = 860;
  var revealing = false;
  var revealed = false;

  var lastH = 0; /* the settled height, tracked for regeneration */

  function cleanup() {
    panel.classList.remove("p3-revealing");
    panel.style.height = "";
    panel.style.marginTop = "";
    revealing = false;
    revealed = true;
    lastH = panel.offsetHeight;
  }

  function reveal() {
    if (revealing || revealed) return;
    revealing = true;
    /* The observer fires in a microtask, before the browser has
       painted the un-hidden panel, so this measures its natural
       settled height with no visible flash. Collapse it, commit,
       then hand the endpoints to the CSS transition. */
    var h = panel.offsetHeight;
    var mt = parseFloat(window.getComputedStyle(panel).marginTop) || 0;
    panel.classList.add("p3-revealing");
    panel.style.height = "0px";
    panel.style.marginTop = "0px";
    void panel.offsetHeight; /* commit the collapsed state */
    panel.style.height = h + "px";
    panel.style.marginTop = mt + "px";
    window.setTimeout(cleanup, SETTLE_MS);
  }

  new MutationObserver(function () {
    if (!panel.hidden) reveal();
  }).observe(panel, { attributes: true, attributeFilter: ["hidden"] });

  var refreshTimer = null;
  var resizeTimer = null;
  new MutationObserver(function () {
    /* promptbox.js writes the prompt text BEFORE un-hiding the
       panel on first generate; `revealing`/`revealed` keep this
       path for genuine regenerations only. The mutation has
       landed but not painted, so a height change can still be
       animated from the tracked settled height. */
    if (panel.hidden || revealing || !revealed) return;
    var newH = panel.offsetHeight;
    if (lastH && Math.abs(newH - lastH) > 1) {
      var fromH = lastH;
      lastH = newH;
      panel.classList.add("p3-resizing");
      panel.style.height = fromH + "px";
      void panel.offsetHeight; /* commit */
      panel.style.height = newH + "px";
      window.setTimeout(function () {
        panel.classList.remove("p3-resizing");
        panel.style.height = "";
      }, 340);
    } else {
      lastH = newH;
    }
    promptOut.classList.remove("p3-refreshing");
    void promptOut.offsetHeight;
    promptOut.classList.add("p3-refreshing");
    if (refreshTimer) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(function () {
      promptOut.classList.remove("p3-refreshing");
    }, 280);
  }).observe(promptOut, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  /* Keep the tracked height honest across viewport changes so a
     later regeneration glides from the true settled height. */
  window.addEventListener("resize", function () {
    if (!revealed || revealing) return;
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (!panel.classList.contains("p3-resizing")) {
        lastH = panel.offsetHeight;
      }
    }, 200);
  });
})();
