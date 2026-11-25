/* book.js - the booking page: pick a day, pick a time, leave your details, get the invite.
   Where the open times come from, and where a booking goes, is an engine named by data-engine on [data-book]:
   - "sample": made-up open times for this draft. Nothing is sent anywhere.
   - "server": our own small server at data-endpoint. Its contract:
       GET  {endpoint}/slots?start=YYYY-MM-DD&end=YYYY-MM-DD
            -> 200 { "slots": ["2026-11-24T17:00:00Z", ...] }   (start times in UTC, LEN minutes each)
       POST {endpoint}/book   { start, name, email, company, note, timeZone }
            -> 200 { "ok": true } | 409 { "error": "taken" } | 400 { "error": "..." }
     The server reads the founders' free/busy, creates the event on their calendar and sends the invite.
   Own code, no dependencies. */
(function () {
  'use strict';
  var root = document.querySelector('[data-book]'); if (!root) return;
  var LEN = 30;                       /* minutes */
  var HOST_TZ = 'America/Denver';     /* the founders' working hours are set in this zone (sample engine only) */
  var ENGINE = root.getAttribute('data-engine') || 'sample', ENDPOINT = root.getAttribute('data-endpoint') || '';
  /* lab only: ?engine=server&endpoint=http://localhost:8824 runs the page against the local booking server */
  var qs = new URLSearchParams(location.search);
  var SITEKEY = root.getAttribute('data-turnstile-sitekey') || '';
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && qs.get('engine')) { ENGINE = qs.get('engine'); ENDPOINT = qs.get('endpoint') || ENDPOINT; SITEKEY = qs.get('turnstile') || SITEKEY; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------- time zones, with no library: Intl does the conversions ---------- */
  var fmts = {};
  function partsIn(t, tz) {
    var f = fmts[tz] || (fmts[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }));
    var o = {}; f.formatToParts(new Date(t)).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: (+o.hour) % 24, mi: +o.minute };
  }
  function offsetAt(t, tz) { var p = partsIn(t, tz); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - Math.floor(t / 60000) * 60000; }
  function zonedToUtc(y, m, d, h, mi, tz) { var guess = Date.UTC(y, m - 1, d, h, mi); return guess - offsetAt(guess - offsetAt(guess, tz), tz); }
  function dayKey(t, tz) { var p = partsIn(t, tz); return p.y * 10000 + p.m * 100 + p.d; }
  function keyParts(k) { return { y: Math.floor(k / 10000), m: Math.floor(k / 100) % 100, d: k % 100 }; }
  function isoDay(t) { return new Date(t).toISOString().slice(0, 10); }

  /* ---------- engines ---------- */
  function hash(n) { var x = Math.sin(n / 60000 * 12.9898) * 43758.5453; return x - Math.floor(x); }
  var engines = {
    /* weekdays 9:00 to 17:00 in the founders' zone, no lunch-hour calls, at least a day's notice, four weeks out;
       about a third of the times are taken, the same ones on every visit */
    sample: {
      slots: function (from, to) {
        var out = [], now = Date.now(), earliest = now + 24 * 3600e3, p = partsIn(now, HOST_TZ);
        for (var i = 0; i < 29; i++) {
          var day = new Date(Date.UTC(p.y, p.m - 1, p.d + i)), dow = day.getUTCDay();
          if (dow === 0 || dow === 6) continue;
          for (var mins = 9 * 60; mins + LEN <= 17 * 60; mins += LEN) {
            if (mins >= 12 * 60 && mins < 13 * 60) continue;
            var t = zonedToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), Math.floor(mins / 60), mins % 60, HOST_TZ);
            if (t < earliest || t < from || t >= to || hash(t) < 0.34) continue;
            out.push(t);
          }
        }
        return new Promise(function (ok) { setTimeout(function () { ok(out); }, 250); });
      },
      book: function () { return new Promise(function (ok) { setTimeout(function () { ok({ ok: true, sample: true }); }, 600); }); }
    },
    server: {
      slots: function (from, to) {
        return fetch(ENDPOINT + '/slots?start=' + isoDay(from) + '&end=' + isoDay(to), { headers: { Accept: 'application/json' } })
          .then(function (r) { if (!r.ok) throw new Error('slots ' + r.status); return r.json(); })
          .then(function (j) { if (j.length > 0) LEN = j.length; return (j.slots || []).map(Date.parse).filter(function (t) { return t >= from && t < to; }); });   /* the server says how long a call is */
      },
      book: function (data) {
        return fetch(ENDPOINT + '/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, error: j.error }; }); });
      }
    }
  };
  var engine = engines[ENGINE] || engines.sample;
  var sample = engine === engines.sample;
  $$('[data-sample-only]').forEach(function (el) { el.hidden = !sample; });

  /* ---------- state ---------- */
  var viewerTz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || HOST_TZ;
  var tz = viewerTz, slots = [], byDay = {}, keys = [], month = null, picked = null, slot = null;
  var els = {
    month: $('[data-month]'), prev: $('[data-prev]'), next: $('[data-next]'), days: $('[data-days]'), tz: $('[data-tz]'),
    dayH: $('[data-day-h]'), hint: $('[data-slots-hint]'), times: $('[data-times]'),
    pick: $('[data-view="pick"]'), form: $('[data-view="form"]'), done: $('[data-view="done"]'),
    when: $('[data-when]'), formH: $('[data-form-h]'), status: $('[data-status]'), submit: $('[data-submit]'),
    doneH: $('[data-done-h]'), doneWhen: $('[data-done-when]'), doneMail: $('[data-done-mail]')
  };

  var L = undefined;   /* the reader's own locale for dates and times */
  function fmt(opts, t, zone) { return new Intl.DateTimeFormat(L, Object.assign({ timeZone: zone || tz }, opts)).format(new Date(t)); }
  function dayLabel(k) { var p = keyParts(k); return fmt({ weekday: 'long', month: 'long', day: 'numeric' }, Date.UTC(p.y, p.m - 1, p.d, 12), 'UTC'); }
  function timeLabel(t) { return fmt({ hour: 'numeric', minute: '2-digit' }, t); }
  function zoneName() { try { return new Intl.DateTimeFormat(L, { timeZone: tz, timeZoneName: 'long' }).formatToParts(new Date(slot || Date.now())).filter(function (p) { return p.type === 'timeZoneName'; })[0].value; } catch (e) { return tz.replace(/_/g, ' '); } }
  function whenText(t) { return dayLabel(dayKey(t, tz)) + ', ' + timeLabel(t) + ' to ' + timeLabel(t + LEN * 60000) + ' (' + zoneName() + ')'; }

  /* ---------- time zone picker: the reader's zone first ---------- */
  (function () {
    var list = [];
    try { list = Intl.supportedValuesOf('timeZone'); } catch (e) { list = ['America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York', 'Europe/London', 'Europe/Berlin', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'UTC']; }
    if (list.indexOf(viewerTz) < 0) list.unshift(viewerTz);
    list.forEach(function (z) { var o = document.createElement('option'); o.value = z; o.textContent = z.replace(/_/g, ' ').replace(/\//g, ' / '); if (z === viewerTz) o.selected = true; els.tz.appendChild(o); });
    els.tz.addEventListener('change', function () { tz = els.tz.value; group(); if (picked && !byDay[picked]) picked = null; drawMonth(); drawSlots(); });
  })();

  function group() {
    byDay = {}; slots.forEach(function (t) { var k = dayKey(t, tz); (byDay[k] = byDay[k] || []).push(t); });
    keys = Object.keys(byDay).map(Number).sort(function (a, b) { return a - b; });
  }

  /* ---------- the month ---------- */
  var monthFirst = function (k) { return Math.floor(k / 100) * 100 + 1; };
  function drawMonth() {
    var todayK = dayKey(Date.now(), tz);
    if (month === null) month = monthFirst(keys.length ? keys[0] : todayK);
    var mp = keyParts(month), first = new Date(Date.UTC(mp.y, mp.m - 1, 1)), lead = (first.getUTCDay() + 6) % 7, n = new Date(Date.UTC(mp.y, mp.m, 0)).getUTCDate();
    els.month.textContent = fmt({ month: 'long', year: 'numeric' }, Date.UTC(mp.y, mp.m - 1, 15), 'UTC');
    els.prev.disabled = month <= monthFirst(todayK);
    els.next.disabled = !keys.length || month >= monthFirst(keys[keys.length - 1]);
    els.days.textContent = '';
    for (var i = 0; i < lead; i++) els.days.appendChild(document.createElement('span'));
    var focusK = picked && monthFirst(picked) === month ? picked : null;
    for (var d = 1; d <= n; d++) {
      var k = mp.y * 10000 + mp.m * 100 + d, open = !!byDay[k], b = document.createElement('button');
      b.type = 'button'; b.className = 'bk-dayb' + (open ? ' open' : '') + (k === todayK ? ' today' : '');
      b.textContent = d; b.setAttribute('data-k', k); b.disabled = !open;
      b.setAttribute('aria-label', dayLabel(k) + (open ? ', ' + byDay[k].length + ' open ' + (byDay[k].length === 1 ? 'time' : 'times') : ', no open times'));
      b.setAttribute('aria-pressed', String(k === picked));
      if (open && focusK === null) focusK = k;
      els.days.appendChild(b);
    }
    $$('.bk-dayb', els.days).forEach(function (b) { b.tabIndex = +b.getAttribute('data-k') === focusK ? 0 : -1; });
  }
  function openInMonth() { return $$('.bk-dayb.open', els.days); }
  els.days.addEventListener('click', function (e) {
    var b = e.target.closest('.bk-dayb'); if (!b || b.disabled) return;
    picked = +b.getAttribute('data-k'); drawMonth(); drawSlots();
    var nb = $('.bk-dayb[data-k="' + picked + '"]', els.days); if (nb) nb.focus();
  });
  /* arrows move between open days (left and right), a week (up and down), or to the month's ends (Home, End) */
  els.days.addEventListener('keydown', function (e) {
    var b = e.target.closest('.bk-dayb'); if (!b) return;
    var open = openInMonth(), i = open.indexOf(b), k = +b.getAttribute('data-k'), to = null;
    if (e.key === 'ArrowRight') to = open[i + 1]; else if (e.key === 'ArrowLeft') to = open[i - 1];
    else if (e.key === 'Home') to = open[0]; else if (e.key === 'End') to = open[open.length - 1];
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { var t = $('.bk-dayb.open[data-k="' + (k + (e.key === 'ArrowDown' ? 7 : -7)) + '"]', els.days); to = t; }
    else return;
    e.preventDefault(); if (!to) return;
    open.forEach(function (x) { x.tabIndex = -1; }); to.tabIndex = 0; to.focus();
  });
  els.prev.addEventListener('click', function () { var p = keyParts(month); month = p.m === 1 ? (p.y - 1) * 10000 + 1201 : month - 100; drawMonth(); });
  els.next.addEventListener('click', function () { var p = keyParts(month); month = p.m === 12 ? (p.y + 1) * 10000 + 101 : month + 100; drawMonth(); });

  /* ---------- the day's times ---------- */
  function drawSlots() {
    els.times.textContent = '';
    if (!picked) { els.dayH.textContent = 'Pick a day'; els.hint.textContent = keys.length ? 'Days with open times are highlighted.' : 'No open times in the next four weeks.'; return; }
    els.dayH.textContent = dayLabel(picked);
    els.hint.textContent = LEN + ' minutes each';
    byDay[picked].forEach(function (t) {
      var li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.className = 'bk-time'; b.textContent = timeLabel(t); b.setAttribute('data-t', t);
      b.setAttribute('aria-label', timeLabel(t) + ' to ' + timeLabel(t + LEN * 60000) + ', ' + dayLabel(picked));
      li.appendChild(b); els.times.appendChild(li);
    });
  }
  els.times.addEventListener('click', function (e) {
    var b = e.target.closest('.bk-time'); if (!b) return;
    slot = +b.getAttribute('data-t'); show('form'); loadCheck();
    els.when.innerHTML = ''; var s = document.createElement('b'); s.textContent = whenText(slot); els.when.appendChild(s);
    els.formH.focus();
  });

  /* ---------- views ---------- */
  function show(v) { ['pick', 'form', 'done'].forEach(function (n) { els[n].hidden = n !== v; }); }
  $('[data-back]').addEventListener('click', function () {
    show('pick'); var b = $('.bk-time[data-t="' + slot + '"]', els.times); if (b) b.focus();
  });
  $('[data-again]').addEventListener('click', function () { slot = null; show('pick'); load(); });

  /* ---------- the human check (Cloudflare Turnstile): its script loads only once someone picks a time ---------- */
  var ts = { id: null, token: '', loading: false };
  function loadCheck() {
    if (!SITEKEY || engine === engines.sample || ts.loading) return; ts.loading = true;
    window.__bkTurnstile = function () {
      ts.id = window.turnstile.render('[data-turnstile]', { sitekey: SITEKEY, theme: 'dark', appearance: 'interaction-only', action: 'book',
        callback: function (t) { ts.token = t; }, 'expired-callback': function () { ts.token = ''; }, 'error-callback': function () { ts.token = ''; } });
    };
    var sc = document.createElement('script'); sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__bkTurnstile'; sc.async = true; document.head.appendChild(sc);
  }
  function checkToken() {   /* the widget usually has a token before anyone finishes typing; wait a little if not */
    if (!SITEKEY || engine === engines.sample) return Promise.resolve('');
    return new Promise(function (ok, no) { var n = 0; (function wait() { if (ts.token) return ok(ts.token); if (++n > 50) return no(new Error('check')); setTimeout(wait, 100); })(); });
  }
  function resetCheck() { if (ts.id !== null && window.turnstile) { window.turnstile.reset(ts.id); ts.token = ''; } }

  /* ---------- details and booking ---------- */
  var form = els.form;
  function setErr(input, msg) {
    var err = document.getElementById(input.id + '-err');
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) { err.hidden = !msg; if (msg) err.textContent = msg; }
    if (msg) input.setAttribute('aria-describedby', input.id + '-err'); else input.removeAttribute('aria-describedby');
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name, email = form.elements.email, bad = null;
    if (!name.value.trim()) { setErr(name, 'Enter your name.'); bad = bad || name; } else setErr(name, '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { setErr(email, 'Enter an email address, like name@company.com.'); bad = bad || email; } else setErr(email, '');
    if (bad) { bad.focus(); return; }
    if (form.elements.bk_leave_empty.value) { done(email.value.trim()); return; }   /* a bot filled the hidden field: say yes, send nothing (the server checks again) */
    els.submit.disabled = true; els.status.textContent = 'Booking your call...';
    checkToken().then(function (token) {
      return engine.book({ start: new Date(slot).toISOString(), name: name.value.trim(), email: email.value.trim(), company: form.elements.company.value.trim(),
        note: form.elements.note.value.trim(), timeZone: tz, turnstile: token || undefined });
    }, function () { return { ok: false, status: 403, error: 'check' }; })
      .then(function (r) {
        els.submit.disabled = false; els.status.textContent = ''; resetCheck();
        if (!r.ok && r.error === 'check') { els.status.textContent = "We couldn't confirm you're a person. Try again in a moment, or send us a note instead."; return; }
        if (r.ok) return done(email.value.trim());
        if (r.status === 409) { els.status.textContent = ''; show('pick'); load('Someone just took that time. Pick another one.'); return; }
        els.status.textContent = "We couldn't book that time. Try again, or send us a note instead.";
      })
      .catch(function () { els.submit.disabled = false; resetCheck(); els.status.textContent = "We couldn't reach the calendar. Try again, or send us a note instead."; });
  });
  function done(mail) {
    show('done');
    els.doneWhen.textContent = whenText(slot) + '.';
    els.doneMail.textContent = 'The invite, with the video link, is on its way to ' + mail + '. To move or cancel the call, use the invite.';
    els.doneH.focus();
  }

  /* ---------- load the open times ---------- */
  function load(note) {
    var from = Date.now(), to = from + 31 * 864e5;
    els.hint.textContent = 'Loading open times...';
    engine.slots(from, to).then(function (s) {
      slots = s.sort(function (a, b) { return a - b; }); group();
      if (picked && !byDay[picked]) picked = null;
      if (!picked && keys.length) picked = keys[0];   /* open on the first day with times, so the times show at once */
      drawMonth(); drawSlots(); if (note) els.hint.textContent = note;
    }).catch(function () { els.hint.textContent = "We couldn't load open times. Try again in a moment, or send us a note."; });
  }
  load();

})();
