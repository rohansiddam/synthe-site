/* page.js - the subpages: the phone menu, copy buttons, and the docs' "On this page" that follows your reading.
   Own code, no dependencies, no network requests. */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* the phone menu, as on the homepage */
  var navEl = $('[data-nav]'), menuBtn = $('[data-menu]');
  if (navEl && menuBtn) {
    var setMenu = function (on, refocus) { navEl.classList.toggle('open', on); menuBtn.setAttribute('aria-expanded', String(on)); if (!on && refocus) menuBtn.focus(); };
    menuBtn.addEventListener('click', function () { setMenu(!navEl.classList.contains('open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && navEl.classList.contains('open')) setMenu(false, true); });
    document.addEventListener('click', function (e) { if (navEl.classList.contains('open') && !navEl.contains(e.target)) setMenu(false); });
  }

  /* Copy to Copied: a blur-crossfade, the width held so nothing around it moves (Nov 24) */
  function still() { return matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('rm') || document.documentElement.classList.contains('paused'); }
  function hold(b) { if (b.style.minWidth || !b.offsetWidth) return; var t = b.textContent, w0 = b.offsetWidth; b.textContent = 'Copied'; var w1 = b.offsetWidth; b.textContent = t; b.style.minWidth = Math.max(w0, w1) + 'px'; }
  function swap(b, label) { hold(b); if (still()) { b.textContent = label; return; } b.classList.add('swap'); setTimeout(function () { b.textContent = label; b.classList.remove('swap'); }, 130); }
  /* copy buttons: the text of the element they point at */
  $$('[data-copy-target]').forEach(function (b) {
    hold(b);
    b.addEventListener('click', function () {
      var el = $(b.getAttribute('data-copy-target')); if (!el) return;
      var text = el.innerText.replace(/^\$\s*/, '').trim();
      var done = function () { var t = b.textContent; swap(b, 'Copied'); setTimeout(function () { swap(b, t); }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    });
  });

  /* docs: open beside the text on wide screens, folded on a phone; the current section is marked as you read */
  var docNav = $('[data-doc-nav]');
  if (docNav) {
    var narrow = window.matchMedia('(max-width: 900px)');
    var fit = function () { docNav.open = !narrow.matches; };
    fit(); if (narrow.addEventListener) narrow.addEventListener('change', fit);
    $$('a', docNav).forEach(function (a) { a.addEventListener('click', function () { if (narrow.matches) docNav.open = false; }); });
    var links = $$('a[href^="#"]', docNav), byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var heads = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    var mark = function () {
      var cur = heads[0];
      for (var i = 0; i < heads.length; i++) if (heads[i].getBoundingClientRect().top < 140) cur = heads[i];
      links.forEach(function (a) { a.removeAttribute('aria-current'); });
      if (cur && byId[cur.id]) byId[cur.id].setAttribute('aria-current', 'true');
    };
    window.addEventListener('scroll', mark, { passive: true }); mark();
  }
})();
