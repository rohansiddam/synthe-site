/* Synthe prompt section, focus placeholder restore (prompt4).

   One job. The base build's sculptor typewriter (homepage.js) cycles goal
   examples through the textarea's `placeholder` attribute. On
   focus the engine stops — but it leaves the placeholder frozen
   at whatever frame it had reached, sometimes cut mid-word.

   Spline's prompt box, the measured mechanic source for this
   section (REF-PROMPT.md §1.3), behaves better: on focus the
   cycle stops AND the placeholder reverts to the static string.
   This layer adds exactly that revert. On blur it does nothing
   at all: the engine resumes the cycle on its own if the field
   is empty, and that stays the engine's business.

   Why the guard observer — measured on the real page, see
   PROMPT4.md for the full evidence chain. The engine has the
   last word on focus: its own focus handling renders the
   frozen frame into the placeholder after this file's focus
   listener runs, and a restore scheduled on the next tick did
   not hold either (the engine writes again after the dispatch,
   on its own tick). So while the field is focused, this file
   also watches the one attribute: any write that is not the
   static string is corrected in the same microtask, before it
   can paint. The guard is scoped to focus — it connects on
   focus, disconnects on blur, and the correction writes only
   when the value differs, so it cannot loop and it never
   touches the engine's resumed cycle.

   The string below is the markup's verbatim placeholder
   attribute (prompt2-section.html, and the built index.html).
   Copy-drift guard: it must stay byte-identical to the
   attribute. Verify with:

     grep -F "Name a check your agent should pass" \
       prompt2-section.html assets/synthe/prompt4.js

   Both files must hit, with the full sentence identical. If
   the settled copy ever changes, it changes in the markup and
   here in the same commit.

   Self-guards and returns silently if the field is absent. If
   this file fails to load, the section behaves exactly as the
   prompt3 build did: the engine still stops on focus, the
   placeholder just stays frozen where it stopped. */
(function () {
  var input = document.querySelector(
    ".section_input-action .home-action_input"
  );
  if (!input) return;
  var STATIC_PLACEHOLDER =
    "Name a check your agent should pass. For example: never say a refund is already approved.";

  function restore() {
    if (
      document.activeElement === input &&
      input.placeholder !== STATIC_PLACEHOLDER
    ) {
      input.placeholder = STATIC_PLACEHOLDER;
    }
  }

  var guard = new MutationObserver(restore);

  input.addEventListener("focus", function () {
    restore();
    window.setTimeout(restore, 0);
    guard.observe(input, {
      attributes: true,
      attributeFilter: ["placeholder"],
    });
  });
  input.addEventListener("blur", function () {
    guard.disconnect();
  });
})();
