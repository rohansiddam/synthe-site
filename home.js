/* home.js - the homepage sections below the dive. One interaction per section,
   each showing a real part of Synthe: the goal box shows what Synthe drafts
   from a goal; the night's chart follows your scroll; you set the bar; the sharing
   level shows what leaves your repo; the Mark locks once at the end.
   Own code, no dependencies, no network requests. */
(function () {
  'use strict';
  var held = false; try { held = localStorage.getItem('synthe-motion') === 'reduced'; } catch (e) {}
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || held || window.innerHeight < 480;   /* as dive.js */
  var html = document.documentElement;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* Copy to Copied: a blur-crossfade, the width held so nothing around it moves (Nov 24) */
  function still() { return matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('rm') || document.documentElement.classList.contains('paused'); }
  function hold(b) { if (b.style.minWidth || !b.offsetWidth) return; var t = b.textContent, w0 = b.offsetWidth; b.textContent = 'Copied'; var w1 = b.offsetWidth; b.textContent = t; b.style.minWidth = Math.max(w0, w1) + 'px'; }
  function swap(b, label) { var st = document.querySelector('[data-copy-status]'); if (st && label !== 'Copy') st.textContent = label === 'Copied' ? 'Copied to the clipboard' : label; hold(b); if (still()) { b.textContent = label; return; } b.classList.add('swap'); setTimeout(function () { b.textContent = label; b.classList.remove('swap'); }, 130); }
  /* copy buttons: each names the element it copies */
  $$('[data-copy-target]').forEach(function (b) {
    hold(b); var tid = (b.getAttribute('data-copy-target') || '').replace(/^#/, ''); if (tid) b.setAttribute('aria-describedby', tid);
    b.addEventListener('click', function () {
      var t = $(b.getAttribute('data-copy-target')); if (!t) return;
      var text = t.textContent.replace(/\s+/g, ' ').trim();
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { swap(b, 'Copied'); }, function () { swap(b, 'Select and copy'); });
      setTimeout(function () { swap(b, 'Copy'); }, 1800);
    });
  });

  /* a row of radio buttons with arrow keys */
  function radios(group, onPick) {
    var opts = $$('[role="radio"]', group);
    function pick(o, focus) {
      opts.forEach(function (x) { var on = x === o; x.setAttribute('aria-checked', String(on)); x.tabIndex = on ? 0 : -1; });
      if (focus) o.focus();
      onPick(o);
    }
    opts.forEach(function (o, i) {
      o.addEventListener('click', function () { pick(o, false); });
      o.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return; e.preventDefault(); pick(opts[(i + d + opts.length) % opts.length], true);
      });
    });
    return pick;
  }

  /* ---------- the goal: what Synthe drafts from one goal, for each kind of agent.
     Worked examples, written by hand, in the shape setup really prints:
     drafted checks, then an example reply marked pass or fail. ---------- */
  var IND = {
    ecommerce: { agent: 'returns agent', rule: 'Never invent dates',
      checks: ['Explain the return policy that applies', 'Offer an exchange when it fits', 'Never invent dates', 'Send hard cases to a person', 'Never promise what the policy does not allow'],
      goal: 'When a case needs a person, send the customer to the right place.',
      drafted: ['Hands the case to a person when it can\u2019t fix the problem itself', 'Names the team the customer should contact', 'Never promises a refund or a date'],
      msg: 'My parcel says delivered but it never arrived.',
      before: 'Sorry to hear that! Please check with your neighbours and look around your building.', fails: 'fails checks 1 and 2',
      after: 'A missing parcel needs our delivery team. Reply with your order number and they will open a trace for you.' },
    finance: { agent: 'bank support agent', rule: 'No investment advice',
      checks: ['Verify identity first', 'No investment advice', 'Explain fees plainly', 'Freeze a lost card first', 'Never share a balance before verifying'],
      goal: 'When a card is lost, freeze it first, then explain the next steps.',
      drafted: ['Freezes the card before anything else', 'Lists the next steps in order', 'Never asks for the full card number'],
      msg: 'I think I left my debit card at a restaurant last night.',
      before: 'No problem! What\u2019s the card number, so I can look it up?', fails: 'fails checks 1 and 3',
      after: 'I\u2019ve frozen your card, so nobody can use it. Next, check your recent payments in the app, then order a new card under Cards. If you find the old one, you can unfreeze it there.' },
    travel: { agent: 'booking agent', rule: 'Never promise upgrades',
      checks: ['Confirm before booking', 'Rebook a cancelled flight first', 'Never promise upgrades', 'Ask for the booking reference', 'Explain the change fee first'],
      goal: 'Explain the change fee before you change a booking.',
      drafted: ['States the change fee before any change', 'Asks the customer to confirm', 'Never changes a booking without a yes'],
      msg: 'Can you move my flight from Friday to Sunday?',
      before: 'Done! Your flight is now on Sunday.', fails: 'fails all three checks',
      after: 'Sunday\u2019s flight has seats. Moving to it costs the $45 change fee on your fare. Shall I go ahead?' },
    insurance: { agent: 'claims agent', rule: 'Never decide a claim',
      checks: ['Ask for the claim number first', 'Never decide a claim', 'Quote the coverage that applies', 'List the documents a claim needs', 'Never guess a payout'],
      goal: 'Tell the customer which documents a claim needs, in one list.',
      drafted: ['Lists every document the claim needs', 'Puts them in one list', 'Never says the claim is approved'],
      msg: 'A tree fell on my car. What do I need to send you?',
      before: 'So sorry! Send us some photos and we\u2019ll get it approved quickly.', fails: 'fails checks 1 and 3',
      after: 'For this claim we need: photos of the damage, your policy number, and a repair estimate. Once we have all three, an adjuster reviews the claim.' },
    software: { agent: 'product support agent', rule: 'Never invent features',
      checks: ['Link the right docs page', 'Hand billing to a person', 'Never invent features', 'Ask for steps to reproduce a bug', "Never share another customer's data"],
      goal: 'When a customer reports a bug, ask for the steps to reproduce it.',
      drafted: ['Asks for the steps that lead to the bug', 'Asks which version and device', 'Never blames the customer'],
      msg: 'Export to PDF is broken again.',
      before: 'Have you tried clearing your cache? That usually fixes it.', fails: 'fails checks 1 and 2',
      after: 'Sorry about that. Which steps lead to it, and which app version and browser are you on? With those we can reproduce it and fix it.' }
  };
  var checksEl = $('[data-checks]');
  function g(k) { return $('[data-g="' + k + '"]'); }
  function setIndustry(id) {
    var ind = IND[id];
    $$('[data-ind="agent"]').forEach(function (el) { el.textContent = ind.agent; });
    $$('[data-ind="Agent"]').forEach(function (el) { el.textContent = ind.agent.charAt(0).toUpperCase() + ind.agent.slice(1); });
    $$('[data-ind="rule"]').forEach(function (el) { el.textContent = ind.rule; });
    if (checksEl) checksEl.innerHTML = ind.checks.map(function (t) { return '<li>' + t + '</li>'; }).join('');
    if (g('goal')) {
      g('goal').textContent = ind.goal;
      g('checks').innerHTML = ind.drafted.map(function (t) { return '<li>' + t + '</li>'; }).join('');
      g('msg').textContent = ind.msg; g('before').textContent = ind.before; g('after').textContent = ind.after;
      g('fails').textContent = '\u2717 ' + ind.fails;
    }
  }
  if ($('[data-seg]')) radios($('[data-seg]'), function (o) { setIndustry(o.getAttribute('data-industry')); });
  setIndustry('ecommerce');

  /* the charts' strokes lean 6.5 degrees, like the Mark's legs: labels follow the
     top of each stroke, so each column needs its own height in pixels */
  function colHeights() { $$('.col').forEach(function (c) { c.style.setProperty('--h', c.getBoundingClientRect().height + 'px'); }); }
  colHeights(); window.addEventListener('resize', colHeights);

  /* ---------- the night: the step at the reading line sets the chart ---------- */
  var chart = $('[data-chart]'), steps = $$('.step'), at = -1, ticking = false;
  function readNight() {
    ticking = false;
    var line = window.innerHeight * (window.innerWidth < 900 ? 0.72 : 0.55), n = 0;
    steps.forEach(function (s, i) { if (s.getBoundingClientRect().top < line) n = i; });
    if (n === at) return;
    at = n; chart.setAttribute('data-at', String(n));
    steps.forEach(function (s, i) { s.classList.toggle('is-on', i === n); });
  }
  if (chart) {
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(readNight); } }, { passive: true });
    window.addEventListener('resize', readNight);
    readNight();
  }

  /* ---------- the phone menu: Escape or a tap outside closes it and gives focus back to the button ---------- */
  var navEl = $('[data-nav]'), menuBtn = $('[data-menu]');
  if (navEl && menuBtn) {
    var setMenu = function (on, refocus) {
      navEl.classList.toggle('open', on); menuBtn.setAttribute('aria-expanded', String(on));
      if (!on && refocus) menuBtn.focus();
    };
    menuBtn.addEventListener('click', function () { setMenu(!navEl.classList.contains('open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && navEl.classList.contains('open')) setMenu(false, true); });
    document.addEventListener('click', function (e) { if (navEl.classList.contains('open') && !navEl.contains(e.target)) setMenu(false); });
    $$('.nav-links a', navEl).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    window.addEventListener('resize', function () { if (window.innerWidth > 640 && navEl.classList.contains('open')) setMenu(false); });
  }

  /* ---------- both modes, one bar: load the 3D graphic as it comes near, then step it with the scroll ---------- */
  var mdSec = $('[data-md]');
  if (mdSec) {
    var mdSteps = $$('[data-steps] li', mdSec), mdApi = null, mdCur = -2;
    var mdStatic = function () { mdSec.classList.add('md-static'); $('[data-num="prompt"]', mdSec).textContent = '89%'; $('[data-num="code"]', mdSec).textContent = '12'; mdSteps.forEach(function (li) { li.classList.add('on'); }); };
    var mdStep = function () {
      if (!mdApi || reduce) return;
      var r = mdSec.getBoundingClientRect(), span = r.height - window.innerHeight, p = Math.min(1, Math.max(0, -r.top / Math.max(1, span)));
      var s = r.top > window.innerHeight * 0.35 ? -1 : Math.min(2, Math.floor(p * 3));
      if (s === mdCur) return; mdCur = s;
      mdSteps.forEach(function (li, i) { li.classList.toggle('on', i === Math.max(0, s)); });
      if (s >= 0) mdApi.beat(s);
    };
    var mdLoad = function () {
      import('./modes.js?v=17').then(function (m) { return m.start(mdSec); })
        .then(function (api) { mdApi = api; mdStep(); })
        .catch(function () { mdStatic(); });
    };
    if ('IntersectionObserver' in window) {
      var mdIo = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { mdIo.disconnect(); mdLoad(); } }, { rootMargin: '150% 0px' });
      mdIo.observe(mdSec);
    } else mdLoad();
    window.addEventListener('scroll', mdStep, { passive: true });
  }

  /* ---------- your data: the sharing level ---------- */
  var SHARE = {
    none: 'Nothing. Synthe sends the team no run data.',
    numbers: 'Numbers only: each round’s result and cost, how often your checks passed, a score for each test message, why the run stopped and the Synthe version. No text.',
    detail: 'Run numbers, plus your goal, your checks, Synthe’s prompt edits and one example message with its replies.'
  };
  var shareBox = $('[data-share]');
  if (shareBox) radios(shareBox, function (o) {
    var lv = o.getAttribute('data-level');
    $('[data-share-val]').textContent = lv;
    $('[data-share-text]').textContent = SHARE[lv];
    $('[data-share-default]').hidden = lv !== 'detail';
  });

  /* ---------- the end: the Mark's halves lock once ---------- */
  var mark = $('[data-lock]');
  if (mark) {
    if (reduce || !('IntersectionObserver' in window)) mark.classList.add('is-locked');
    else {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { mark.classList.add('is-locked'); io.disconnect(); } });
      }, { threshold: 0.9 });
      io.observe(mark);
    }
  }

  /* what lands: the email from GitHub arrives once, as the section comes into view.
     With reduced motion it is simply there; with motion paused it appears without moving. */
  var desk = $('[data-desk]');
  if (desk && !reduce && 'IntersectionObserver' in window) {
    var unread = desk.querySelector('[data-unread]'), arrive = desk.querySelector('[data-arrive]');
    desk.classList.add('is-waiting'); unread.textContent = '';
    var seen = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      seen.disconnect(); desk.classList.remove('is-waiting'); unread.textContent = '1';
      arrive.classList.add('is-fresh'); setTimeout(function () { arrive.classList.remove('is-fresh'); }, 1400);
    }, { rootMargin: '0px 0px -35% 0px' });
    seen.observe(desk);
  }

  /* for the founders' comparison only: ?win=coral shows the earlier coral */
  try { if (new URLSearchParams(location.search).get('win') === 'coral') { html.setAttribute('data-win', 'coral'); window.dispatchEvent(new CustomEvent('synthe:win')); } } catch (e) {}
  /* for the founders' comparison only: ?type=report (the research report's heading weight) */
  try {
    var ty = new URLSearchParams(location.search).get('type');
    if (ty === 'report') {
      html.setAttribute('data-type', ty);
    }
  } catch (e) {}
})();
