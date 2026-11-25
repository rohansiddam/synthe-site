/* dive.js - dive into the Mark. Scroll moves a camera: in front of the Mark
   (an infinity mirror sign), then through the agent half's window, down its
   tunnel of reflections with stars going past, and out into a galaxy of
   agent names turning round a small Mark at the far end. Scrolling back flies
   back out. Own code, Canvas 2D, no dependencies, no network requests. */
(function () {
  'use strict';

  var PATH_TOP = 'M 137.089 36.089 L 121.248 56.837 65.850 129.267 74.001 201.107 C 75.025 210.118 69.339 218.084 60.498 219.675 51.929 221.178 43.437 215.697 41.616 206.835 L 32.573 126.506 C 32.187 123.074 32.649 118.958 34.819 116.127 L 84.936 50.749 115.553 10.674 C 118.873 6.328 123.405 3.381 129.084 3.381 L 199.032 3.381 C 205.962 3.382 211.797 8.026 213.985 14.448 215.933 20.150 214.783 26.111 211.010 30.731 L 94.495 182.341 89.217 135.584 146.096 61.503 165.499 36.165 Z';
  var PATH_BOT = 'M 137.911 253.913 L 153.752 233.165 209.151 160.735 200.999 88.895 C 199.976 79.884 205.661 71.918 214.503 70.327 223.072 68.824 231.564 74.305 233.384 83.167 L 242.427 163.496 C 242.814 166.928 242.352 171.044 240.182 173.875 L 190.065 239.253 159.448 279.328 C 156.127 283.674 151.595 286.621 145.916 286.621 L 75.968 286.621 C 69.039 286.620 63.204 281.976 61.016 275.554 59.067 269.852 60.218 263.891 63.991 259.271 L 180.506 107.661 185.784 154.418 128.905 228.499 109.501 253.837 Z';
  var pTop = new Path2D(PATH_TOP), pBot = new Path2D(PATH_BOT), PATHS = [pTop, pBot];
  var VCX = 137.5, VCY = 145, TAU = Math.PI * 2;
  var NAMES = ['Returns', 'Bank support', 'Booking', 'Claims', 'Product support', 'Onboarding', 'Billing questions', 'Order tracking',
    'Scheduling', 'IT helpdesk', 'HR policy', 'Sales qualification', 'Lead routing', 'Code review', 'Bug triage', 'Docs search',
    'Invoice matching', 'Shipping updates', 'Refund requests', 'Warranty claims', 'Tenant requests', 'Tutoring', 'Recruiting screens',
    'Expense review', 'Incident triage', 'Translation', 'Meeting notes', 'Research summaries', 'Email drafts', 'Survey analysis',
    'Inventory questions', 'Dispatch', 'Policy renewals', 'Subscription changes', 'Store hours', 'Menu orders', 'Event booking',
    'Ticket routing', 'Data cleanup', 'SQL questions', 'Test writing', 'Release notes', 'Contract questions', 'Course enrollment'];

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function easeOutBack(t) { var c1 = 1.45, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  /* held still: the system setting, the footer setting (remembered), or a screen too short to pin the dive (200% zoom) */
  var heldByChoice = false; try { heldByChoice = localStorage.getItem('synthe-motion') === 'reduced'; } catch (e) {}
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || heldByChoice || window.innerHeight < 480;
  /* two bases (near-black, cream) and one accent, green. It means only two things:
     your team (the Mark's green half) and a clear win. Everything else is neutral.
     The colours come from the page's tokens (dive.css); these are fallbacks. */
  var ACC = '#9c7ae8', WIN = { c: '#8ddb85', text: '#8ddb85', hi: '#d3f2cd', deep: '#2c6330', pill: '#122413' };
  function readWin() {
    var cs = getComputedStyle(document.documentElement), g = function (n, d) { return cs.getPropertyValue(n).trim() || d; };
    WIN = { c: g('--win', WIN.c), text: g('--win-text', WIN.text), hi: g('--win-hi', WIN.hi), deep: g('--win-deep', WIN.deep), pill: g('--win-pill', WIN.pill) };
    /* the Mark's second half follows the page's accent */
    ACC = g('--accent', ACC); pal.rim[1] = ACC; pal.led[1] = g('--accent-led', '#c5b6f3'); pal.deep[1] = g('--accent-deep', '#29213c');
  }
  window.addEventListener('synthe:win', readWin);
  var pal = { bg: '#151311', rim: ['#f4efe6', ACC], deep: ['#0a0a0b', '#29213c'], led: ['#f7f2e9', '#c5b6f3'] };


  /* ---------------- world ---------------- */
  var probe = document.createElement('canvas').getContext('2d');
  /* the dive axis: a point inside the agent half's long stroke */
  var AX = 110, AY = 90;
  if (!probe.isPointInPath(pTop, AX, AY)) {
    for (var r = 1; r < 40 && !probe.isPointInPath(pTop, AX, AY); r++) for (var a = 0; a < 12; a++) {
      var x = 110 + Math.cos(a / 12 * TAU) * r, y = 90 + Math.sin(a / 12 * TAU) * r;
      if (probe.isPointInPath(pTop, x, y)) { AX = x; AY = y; break; }
    }
  }
  /* with the 3D sign the window is a slot inside a metal frame: aim at the middle of that slot (found by
     distance from every edge of the agent half's opening), so the camera passes through it, not into the frame */
  /* the sign is 3D satin aluminum by default (hero3d.js); ?mark=<kind> picks another material (lab),
     ?mark=2d keeps the flat 2D sign. If WebGL fails, the 2D sign returns. */
  var MARKQ = (location.search.match(/[?&]mark=(\w+)/) || [])[1];
  var MARK = MARKQ === '2d' ? null : (MARKQ || 'satin');
  if (MARK) { AX = 164; AY = 64.8; }
  var AXW = AX - VCX, AYW = AY - VCY;
  /* each half of the Mark has a groove: the channel between its two strokes,
     a diagonal slot under its top bar that bends down and opens near its leg.
     Traced from the path; the two are point-symmetric about the centre. */
  var GROOVES = [
    { x: 111, y: 88, pts: [[141, 42], [80, 132], [84, 190]] },          /* the agent's groove (ink half) */
    { x: 164, y: 202, pts: [[134, 248], [195, 158], [191, 100]] }       /* your team's groove (green half) */
  ];
  var isPhone = window.innerWidth < 640;
  /* M3 is null while the 3D sign loads, the 3D layer once ready, false if it failed (then the 2D sign returns). */
  var M3 = MARK ? null : false, lastOpen = 0;
  if (MARK) window.__diveCam = function () { return { x: cam.x, y: cam.y, z: cam.z, F: F, W: W, H: H, DPR: DPR, VCX: VCX, VCY: VCY }; };   /* lab checks */
  function neon() { return M3 === false; }
  /* reflections every D units: deep compared with the viewing distance, as in a real infinity mirror */
  var D = 130, ZG = 3000, NEAR = 5;
  var STARS = [[], []];
  [isPhone ? 260 : 480, isPhone ? 90 : 160].forEach(function (count, h) {
    var guard = 0;
    while (STARS[h].length < count && guard++ < 40000) {
      var x = Math.random() * 275, y = Math.random() * 290;
      if (probe.isPointInPath(PATHS[h], x, y)) STARS[h].push({ x: x - VCX, y: y - VCY, z: Math.random() * (h ? 1600 : ZG - 200) });
    }
  });

  /* ---------------- stage ---------------- */
  var dive = document.querySelector('[data-dive]'), canvas = document.querySelector('[data-dive-canvas]'), ctx = canvas.getContext('2d');
  var W = 0, H = 0, DPR = 1, F = 1000, F0 = 700, czEnd = 500, X0 = 0, Y0 = 0;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    var wide = W >= 900;
    var s0 = wide ? Math.min(0.62 * H / 290, 0.42 * W / 275) : Math.min((isPhone ? 0.3 : 0.4) * H / 290, 0.62 * W / 275);
    /* on the first screen the Mark sits beside the copy (wide) or above it (narrow) */
    X0 = wide ? -(0.24 * W) / s0 : 0;
    Y0 = wide ? 0 : (0.5 - (isPhone ? 0.29 : 0.3)) * H / s0;
    F = s0 * F0;
    var distEnd = 300 * F / ((W < 640 ? 0.85 : 0.46) * Math.min(W, H * 1.5));   /* a phone shows the inner rings large; the outer ones run off the edges */   /* the galaxy fills the view at the end */
    czEnd = ZG - distEnd;
  }
  var cam = { x: 0, y: 0, z: -F0 }, ps = 0, lastDay = null;
  var time = 0, last = performance.now(), paused = false;
  var ptr = { x: 0, y: 0, sx: 0, sy: 0, on: false };
  window.addEventListener('pointermove', function (e) { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; }, { passive: true });

  /* the dive's last screen is where the page rises over the galaxy: the camera's
     timeline ends one screen before the stage lets go */
  var stage = dive.querySelector('.dive-stage'), day = document.querySelector('.day'), navEl = document.querySelector('[data-nav]');
  function progress() { var r = dive.getBoundingClientRect(), S = stage.clientHeight; return clamp(-r.top / Math.max(1, r.height - 2 * S), 0, 1); }

  function proj(X, Y, Z, out) {
    var dz = Z - cam.z; if (dz < NEAR) return false;
    var s = F / dz; out[0] = W / 2 + (X - cam.x) * s; out[1] = H / 2 + (Y - cam.y) * s; out[2] = s; return true;
  }
  function pathAt(Z) {           /* draw raw viewBox paths at depth Z */
    var s = F / (Z - cam.z);
    ctx.setTransform(s * DPR, 0, 0, s * DPR, (W / 2 + (-VCX - cam.x) * s) * DPR, (H / 2 + (-VCY - cam.y) * s) * DPR);
    return s;
  }
  function screen() { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  function rgba(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }

  /* ---------------- pieces ---------------- */
  var P = [0, 0, 0], Q = [0, 0, 0];
  function reflections(h, zFrom, fadeEnd) {
    /* the outline again and again, deeper each time, deepest first */
    var path = PATHS[h], led = pal.led[h], kMax = Math.floor((ZG - 160) / D);
    ctx.lineJoin = 'round'; ctx.strokeStyle = led; ctx.shadowColor = led;
    for (var k = kMax; k >= 1; k--) {
      var Z = k * D, dz = Z - cam.z; if (dz < NEAR * 2 || Z < zFrom) continue;
      /* like a real mirror: each bounce loses the same share of light,
         wherever you stand, so the lines never fade out and pop back */
      var a = 0.95 * Math.pow(0.87, k - 1) * sstep(NEAR * 2, 70, dz) * fadeEnd;
      if (a < 0.015) continue;
      var s = pathAt(Z), px = clamp(1.7 * s, 0.5, 3.4);
      ctx.globalAlpha = a; ctx.lineWidth = px / s; ctx.shadowBlur = k < 6 ? 6 * DPR * Math.min(1, s / 2) : 0;
      ctx.stroke(path);
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  /* the lights inside each window: small points at fixed depths, so the windows read as depth rather than
     dust. They move only with the camera (no drift toward you, no halo: both read as lights flying at the
     viewer, audit M5). Far ones are faint and small; each fades in at the back and out before it reaches
     the glass, so none pops. Green window, green light. */
  var DRIFT = 0;
  function stars(h, fade) {
    screen(); fade = fade === undefined ? 1 : fade; if (fade < 0.01) return;
    var list = STARS[h], range = h ? 1600 : ZG - 200, drift = time * DRIFT, col = h ? '#d6f0cf' : '#f7f2e9';
    ctx.fillStyle = col;
    for (var i = 0; i < list.length; i++) {
      var s = list[i], z = 6 + (((s.z - drift) % range) + range) % range;
      if (!proj(s.x, s.y, z, P)) continue;
      var dz = z - cam.z, t = clamp(1 - dz / 2600, 0, 1);
      var a = fade * (0.08 + 0.8 * t * t) * sstep(NEAR, 40, dz) * sstep(6, 160, z) * (1 - sstep(range - 260, range, z - 6));
      if (a < 0.02) continue;
      var r = clamp(P[2] * 0.9, 0.45, 2.6);
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(P[0], P[1], r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  /* the galaxy at the end of the tunnel: a bright core, spiral arms with
     clusters and soft glows, and the agents as bodies with their own small
     loops. Wins travel out from the Mark at the centre and light an agent. */
  var GN = isPhone ? 900 : 1900;
  var GAL = [];
  var RINGS = [150, 215, 285];
  var WIND0 = +((location.search.match(/[?&]wind=([\d.]+)/) || [])[1] || 24);   /* ?wind= is for lab checks only */
  function inLane(r) { for (var q = 0; q < RINGS.length; q++) if (Math.abs(r - RINGS[q]) < 13) return true; return false; }
  for (var gi = 0; gi < GN; gi++) {
    var gu = Math.pow(hash(gi, 1), 1.5), arm = gi % 3 === 0 ? 2 : gi & 1, gr = lerp(70, 330, gu);
    if (inLane(gr)) gr += (gr % 2 ? 14 : -14);       /* the agents' own lanes stay clear */
    GAL.push({ r: gr, arm: arm, sp: (hash(gi, 2) - 0.5) * lerp(0.9, 0.35, gu) * (arm === 2 ? 2.6 : 1),
      size: 0.5 + 1.4 * Math.pow(hash(gi, 3), 3), col: hash(gi, 4) < 0.07 ? 2 : hash(gi, 4) < 0.16 ? 1 : 0 });
  }
  var CLUSTERS = [], GLOWS = [];
  for (var ci = 0; ci < 26; ci++) { var cr = lerp(50, 260, hash(ci, 7)); if (inLane(cr)) cr += 20; CLUSTERS.push({ r: cr, arm: ci & 1, off: (hash(ci, 8) - 0.5) * 0.3, n: 5 + (ci % 5) }); }
  for (var gl = 0; gl < 16; gl++) GLOWS.push({ r: lerp(40, 240, hash(gl, 9)), arm: gl & 1, size: lerp(30, 70, hash(gl, 10)) });
  var AGENTS = [], PER = isPhone ? [6, 9, 12] : [8, 13, 18];
  (function () { var idx = 0; for (var k = 0; k < 3; k++) for (var j = 0; j < PER[k]; j++, idx++) AGENTS.push({ k: k, j: j, name: NAMES[idx % NAMES.length], lit: -99, pend: false, sx: 0, sy: 0, s: 0, front: 0 }); })();
  var STARCOL = ['#efe8dc', '#d8d1c6', '#f6efe4'];
  var GALW = { x: 0, y: 0, z: 0, open: 0, drawn: false }, PW = [0, 0, 0];   /* for the 3D layer: where the galaxy is, in world units */
  var fctx = null, fcanvas = null;                                        /* with the 3D layer: front stars and labels go on a canvas above it */
  function galaxy(alphaAll, open) {
    var gx = AXW, gy = AYW + 30, gz = ZG, tilt = 1.12 + (ptr.on ? (ptr.sy / H - 0.5) * 0.25 : 0), yaw = ptr.on ? (ptr.sx / W - 0.5) * 0.3 : 0;
    var spin = reduce ? 0.4 : time * 0.1, ct = Math.cos(tilt), st2 = Math.sin(tilt), cy2 = Math.cos(yaw), sy2 = Math.sin(yaw);
    function place(r, ang, out) {
      var lx = Math.cos(ang) * r, ly = Math.sin(ang) * r;
      var X = lx * cy2 - ly * ct * sy2, Y = ly * ct, Z = -ly * st2 + lx * sy2 * 0.3;
      PW[0] = gx + X; PW[1] = gy + Y; PW[2] = gz + Z;
      return proj(gx + X, gy + Y, gz + Z, out) ? Math.sin(ang) : null;
    }
    /* the arms turn together (spin) and are wound by the inner disc turning faster than the outer one (wind).
       The winding starts well along, as thin rings the agents' names read between, and then breathes
       slowly around that, so the bands keep changing without ever going back to two thick arms. */
    var wind = WIND0 + (reduce ? 0 : 5 * Math.sin(time * 0.045));
    function armAngle(r, arm, off) { return arm * Math.PI + 2.3 * Math.log(r / 14) + off + spin * 0.632 + wind * (Math.sqrt(60 / r) - 0.632); }
    if (!proj(gx, gy, gz, P)) return;
    var cx = P[0], cy = P[1], cs = P[2];
    screen();
    /* the core: a soft bulge, squashed to the galaxy's tilt */
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, Math.max(0.3, ct + 0.12));
    var core = ctx.createRadialGradient(0, 0, 0, 0, 0, 120 * cs);
    core.addColorStop(0, rgba('#fbf6ee', 0.5 * alphaAll)); core.addColorStop(0.25, rgba('#e9dfd0', 0.14 * alphaAll)); core.addColorStop(1, 'rgba(233,223,208,0)');
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, 120 * cs, 0, TAU); ctx.fill(); ctx.restore();
    function layer(front) {
      var i, f;
      /* soft glows along the arms */
      for (i = 0; i < GLOWS.length; i++) {
        var g = GLOWS[i]; f = place(g.r, armAngle(g.r, g.arm, 0.15), P); if (f === null || (f > 0) !== front) continue;
        var rad = g.size * P[2], gg = ctx.createRadialGradient(P[0], P[1], 0, P[0], P[1], rad);
        gg.addColorStop(0, rgba('#efe3d2', 0.06 * alphaAll)); gg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(P[0], P[1], rad, 0, TAU); ctx.fill();
      }
      /* the stars of the arms */
      for (i = 0; i < GN; i++) {
        var d = GAL[i]; f = place(d.r, armAngle(d.r, d.arm, d.sp), P); if (f === null || (f > 0) !== front) continue;
        var fade = 1 - sstep(200, 300, d.r);
        ctx.globalAlpha = (front ? 0.9 : 0.4) * (0.45 + 0.55 * fade) * alphaAll * (1 - 0.3 * open) * 0.9;
        ctx.fillStyle = STARCOL[d.col];
        ctx.beginPath(); ctx.arc(P[0], P[1], clamp(P[2] * d.size, 0.4, 3.2), 0, TAU); ctx.fill();
      }
      /* clusters: small knots of bright stars along the arms */
      for (i = 0; i < CLUSTERS.length; i++) {
        var c = CLUSTERS[i];
        for (var m = 0; m < c.n; m++) {
          var rr = c.r + (hash(i, m) - 0.5) * 8;
          f = place(rr, armAngle(c.r, c.arm, c.off) + (hash(m, i) - 0.5) * 0.05, P); if (f === null || (f > 0) !== front) continue;
          ctx.globalAlpha = (front ? 0.75 : 0.35) * alphaAll; ctx.fillStyle = '#fff6ea';
          ctx.beginPath(); ctx.arc(P[0], P[1], clamp(P[2] * 0.9, 0.5, 2), 0, TAU); ctx.fill();
        }
      }
    }
    GALW.x = gx; GALW.y = gy; GALW.z = gz; GALW.open = open; GALW.drawn = true;
    layer(false);
    if (open > 0.02) agents(false, place, spin, open * alphaAll);     /* the far side, behind the Mark */
    centreMark(cx, cy, cs, alphaAll);
    /* with the 3D Mark, everything in front of it goes on the canvas above the 3D layer, but only once the
       tunnel has faded: while its metal is still around you, the galaxy is behind it and must not cut through it */
    var keep = ctx; if (M3 && fctx && cam.z >= -1 && open > 0.9) { ctx = fctx; screen(); }
    layer(true);
    if (open > 0.02) agents(true, place, spin, open * alphaAll);
    ctx = keep; screen();
    if (open > 0.5) { loopStep(); if (!M3) loopDraw(open * alphaAll); }
    ctx.globalAlpha = 1;
  }
  /* the Mark at the centre. Its halves part while a case is tested in the
     seam between them, and lock again. */
  var MARK_U = 112, markG = 0, MK = { cx: 0, cy: 0, sc: 1, tx: 0, ty: 0 };
  var NOMARK = /[?&]nomark\b/.test(location.search);   /* lab only: the galaxy without its centre Mark, for the 3D Mark study */
  function centreMark(cx, cy, cs, alpha) {
    if (NOMARK || M3) return;
    var hpx = cs * MARK_U;
    var sc = hpx / 290, off = markG * 290;            /* the agent's half moves up and left, your team's half down and right */
    var tx = -0.7932 * off, ty = -0.6088 * off;
    MK.cx = cx; MK.cy = cy; MK.sc = sc; MK.tx = tx; MK.ty = ty;
    ctx.globalAlpha = alpha; ctx.shadowBlur = 26 * DPR;
    ctx.setTransform(sc * DPR, 0, 0, sc * DPR, (cx - VCX * sc) * DPR, (cy - VCY * sc) * DPR);
    ctx.translate(tx, ty); ctx.shadowColor = pal.led[0]; ctx.fillStyle = '#f4efe6'; ctx.fill(pTop);
    ctx.translate(-2 * tx, -2 * ty);
    ctx.shadowColor = pal.led[1]; ctx.fillStyle = ACC; ctx.fill(pBot);
    ctx.shadowBlur = 0;
    screen();
    if (cs * MARK_U < 18) {        /* far away: the light at the end of the tunnel */
      var lg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
      lg.addColorStop(0, 'rgba(255,248,236,0.85)'); lg.addColorStop(1, 'rgba(244,239,230,0)');
      ctx.globalAlpha = alpha; ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cx, cy, 40, 0, TAU); ctx.fill();
    }
  }

  /* each agent: a smooth sphere with its name on a solid label.
     A win arriving lights it green. */
  function agents(front, place, spin, alpha) {
    ctx.textBaseline = 'middle';
    for (var i = 0; i < AGENTS.length; i++) {
      var a = AGENTS[i], ang = a.j / PER[a.k] * TAU + a.k * 0.4 + spin * (0.8 - a.k * 0.2);
      var f = place(RINGS[a.k], ang, P); if (f === null) continue;
      a.sx = P[0]; a.sy = P[1]; a.s = P[2]; a.front = f; a.wx = PW[0]; a.wy = PW[1]; a.wz = PW[2];
      if ((f > 0) !== front) continue;
      var R = clamp(P[2] * (a.k === 0 ? 8 : 6.4), 2.5, 19), wf = time - a.lit, lit = wf < 6.5;
      var al = (front ? 1 : 0.45) * alpha * [1, 0.9, 0.75][a.k];
      a.wr = R / P[2]; a.isLit = lit; a.al = al;
      if (lit && !M3) {                                  /* a soft green glow round a lit agent */
        var gl2 = ctx.createRadialGradient(a.sx, a.sy, R * 0.8, a.sx, a.sy, R * 2.4);
        gl2.addColorStop(0, rgba(WIN.c, 0.4)); gl2.addColorStop(1, rgba(WIN.c, 0));
        ctx.globalAlpha = al; ctx.fillStyle = gl2; ctx.beginPath(); ctx.arc(a.sx, a.sy, R * 2.4, 0, TAU); ctx.fill();
      }
      if (!M3) {
        var gb = ctx.createRadialGradient(a.sx - R * 0.35, a.sy - R * 0.4, R * 0.1, a.sx, a.sy, R);
        if (lit) { gb.addColorStop(0, WIN.hi); gb.addColorStop(0.5, WIN.c); gb.addColorStop(1, WIN.deep); }
        else { gb.addColorStop(0, '#fbf6ee'); gb.addColorStop(0.55, '#a59d90'); gb.addColorStop(1, '#2a2622'); }
        ctx.globalAlpha = al; ctx.fillStyle = gb; ctx.beginPath(); ctx.arc(a.sx, a.sy, R, 0, TAU); ctx.fill();
      }

      if (a.pend) {              /* its miss is out being fixed: a slow pulse */
        var pp = (time * 1.6 + i) % 1;
        ctx.globalAlpha = al * 0.6 * (1 - pp); ctx.strokeStyle = '#d9d2c6'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(a.sx, a.sy, R * (1.3 + pp * 1.4), 0, TAU); ctx.stroke();
      }
      if (lit && wf < 1.2) {     /* the moment a win lands: a ring goes out */
        ctx.globalAlpha = al * (1 - wf / 1.2); ctx.strokeStyle = WIN.text; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(a.sx, a.sy, R * (1.4 + wf * 3), 0, TAU); ctx.stroke();
      }
      /* the name on a soft label */
      /* names only on the near side (the far side is just the bodies), in a narrow range of sizes, and never
         cut by the screen edge: near the right edge the name sits on the sphere's left */
      var raw = P[2] * (isPhone ? 7.5 : 6);
      if (front && raw >= 9 && al > 0.2) {
        var fs2 = raw >= 12.5 ? (isPhone ? 14 : 15) : (isPhone ? 12 : 13);
        ctx.font = '500 ' + fs2 + 'px Figtree, Helvetica Neue, Arial, sans-serif';
        var tw = ctx.measureText(a.name).width, lx = a.sx + R + 9, ly = a.sy, ph = fs2 * 0.55;
        if (lx + tw + 7 > W - 12) lx = a.sx - R - 9 - tw;
        if (lx - 7 < 12 || lx + tw + 7 > W - 12 || ly + ph + 4 > H - 4) continue;   /* its sphere is at or past the edge: no name */
        LBL.push({ name: a.name, lx: lx, ly: ly, tw: tw, ph: ph, fs: fs2, lit: lit, al: al, s: P[2] });
      }
    }
    if (front) drawLabels();
  }
  /* the names, nearest (and any just lit) first; a name that would touch one already drawn waits its turn */
  var LBL = [];
  function drawLabels() {
    LBL.sort(function (a, b) { return (b.lit - a.lit) || (b.s - a.s); });
    var placed = [];
    for (var i = 0; i < LBL.length; i++) {
      var L = LBL[i], x0 = L.lx - 7, y0 = L.ly - L.ph - 4, x1 = L.lx + L.tw + 7, y1 = L.ly + L.ph + 4, hit = false;
      for (var j = 0; j < placed.length && !hit; j++) { var q = placed[j]; hit = x0 < q[2] + 8 && q[0] < x1 + 8 && y0 < q[3] + 4 && q[1] < y1 + 4; }
      if (hit) continue; placed.push([x0, y0, x1, y1]);
      ctx.font = '500 ' + L.fs + 'px Figtree, Helvetica Neue, Arial, sans-serif'; ctx.textBaseline = 'middle';
      roundRect(x0, y0, L.tw + 14, L.ph * 2 + 8, L.ph + 4);
      ctx.globalAlpha = Math.min(1, L.al * 1.15); ctx.fillStyle = L.lit ? WIN.pill : '#121110'; ctx.fill();
      ctx.globalAlpha = L.al * 0.7; ctx.strokeStyle = L.lit ? rgba(WIN.text, 0.7) : 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.globalAlpha = L.al; ctx.fillStyle = L.lit ? WIN.text : '#f4efe6'; ctx.fillText(L.name, L.lx, L.ly + 0.5);
    }
    LBL.length = 0; ctx.globalAlpha = 1;
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  }
  /* The loop, in Synthe's order. A miss leaves an agent (grey), flies into
     the agent groove's opening and slides up the channel, where the halves part
     and test it. A clear win slides out of your team's groove (green) and flies
     back to light that agent; anything unclear backs out and falls away.
     One case at a time. */
  var FORCE = null;   /* lab only, with ?mark=: window.__loop.force(agent, win) stages one case */
  var cases = [], nextCase = 0.3, bench = null, lockT0 = -9, oseq = 0, OUTC = 'WLWWLWLWWL';
  /* Two routes through the Mark, traced from its path (viewBox units).
     In: from just outside the agent groove's opening (lower left of the ink
     half), up its channel, round the bend, to the closed end under the top bar.
     Out: your team's groove, the same shape turned half round, from its closed
     end to just outside its opening (upper right of the green half). */
  var ROUTE_IN = [[97, 207], [84, 192], [81, 160], [80, 132], [110, 87], [145, 43]];
  var ROUTE_OUT = ROUTE_IN.slice().reverse().map(function (p) { return [275 - p[0], 290 - p[1]]; });
  var DOOR_N = [0.655, 0.756];               /* outward from the agent groove's opening */
  function lengths(rt) { var L = [0]; for (var i = 1; i < rt.length; i++) L.push(L[i - 1] + Math.hypot(rt[i][0] - rt[i - 1][0], rt[i][1] - rt[i - 1][1])); return L; }
  var LEN_IN = lengths(ROUTE_IN), LEN_OUT = lengths(ROUTE_OUT);
  function toScreen(px, py, half, out) {     /* a point of the Mark, following its half as the halves part */
    var sg = half ? -1 : 1;
    out[0] = MK.cx + (px - VCX + sg * MK.tx) * MK.sc; out[1] = MK.cy + (py - VCY + sg * MK.ty) * MK.sc;
  }
  function along(rt, L, u, half, out) {
    var d = clamp(u, 0, 1) * L[L.length - 1], i = 1;
    while (i < L.length - 1 && L[i] < d) i++;
    var f = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    toScreen(lerp(rt[i - 1][0], rt[i][0], f), lerp(rt[i - 1][1], rt[i][1], f), half, out);
  }
  var T_IN = 0, T_SLIDE = 0.6, T_TEST = MARK ? 1.1 : 0.55, T_OUT = 0.6, T_FLY = 1.0;   /* with the 3D Mark the test holds longer: it is the moment to see */
  function loopStep() {
    if (reduce) return;
    var busy = cases.some(function (k) { return k.phase === 0 || k.phase === 2; });
    if (time > nextCase && !busy) {
      var pick = -1;
      for (var t = 0; t < 14; t++) {
        var c = (Math.random() * AGENTS.length) | 0, ag = AGENTS[c];
        if (FORCE && FORCE.a !== undefined) { c = FORCE.a; ag = AGENTS[c]; FORCE.a = undefined; pick = c; break; }
        if (ag.front > 0.15 && !ag.pend && time - ag.lit > 8 && ag.s > 0) { pick = c; break; }
      }
      if (pick >= 0) { AGENTS[pick].pend = true; cases.push({ a: pick, t0: time, phase: 0, qx: 0, qy: 0, placed: false }); }
      nextCase = time + 0.4;
    }
    for (var i = cases.length - 1; i >= 0; i--) {
      var k = cases[i], age = time - k.t0, agt = AGENTS[k.a];
      if (k.phase === 0 && age > 1.15) { k.phase = 2; k.t0 = time; bench = k; }
      else if (k.phase === 2 && age > T_IN + T_SLIDE + T_TEST) {
        var forced = FORCE && FORCE.win !== undefined && FORCE.forA === k.a;
        k.win = forced ? FORCE.win : OUTC[oseq++ % OUTC.length] === 'W';
        if (forced) FORCE.win = undefined;
        bench = null; lockT0 = time;
        k.phase = k.win ? 3 : 4; k.t0 = time;
        if (!k.win) agt.pend = false;
      } else if (k.phase === 3 && age > T_OUT + T_FLY) { agt.lit = time; agt.pend = false; cases.splice(i, 1); }
      else if (k.phase === 4 && age > 1.4) cases.splice(i, 1);
    }
    /* the halves part only while the fix is under test, then lock */
    var PART = M3 ? 0.1 : 0.05;
    if (bench) markG = PART * sstep(T_IN + T_SLIDE, T_IN + T_SLIDE + 0.2, time - bench.t0);
    else { var la = time - lockT0; markG = la < 0.45 ? PART * (1 - easeOutBack(clamp(la / 0.4, 0, 1))) : 0; }
  }
  var S0 = [0, 0], S1 = [0, 0];
  function loopDraw(alpha) {
    function at(k, age, out) {
      var agt = AGENTS[k.a];
      if (k.phase === 0) {                        /* from the agent straight to the groove's opening */
        along(ROUTE_IN, LEN_IN, 0, 0, S1); var e = easeInOut(clamp(age / 1.15, 0, 1));
        out[0] = lerp(agt.sx, S1[0], e); out[1] = lerp(agt.sy, S1[1], e) - Math.sin(Math.PI * e) * 34; return 1;
      }
      if (k.phase === 2) {                        /* in through the opening and along the agent's groove */
        along(ROUTE_IN, LEN_IN, easeInOut(clamp(age / T_SLIDE, 0, 1)), 0, out); return 1;
      }
      if (k.phase === 3) {                        /* along your team's groove and out of its opening, then home */
        if (age < T_OUT) { along(ROUTE_OUT, LEN_OUT, easeInOut(age / T_OUT), 1, out); return 1; }
        along(ROUTE_OUT, LEN_OUT, 1, 1, S0); var e2 = easeInOut(clamp((age - T_OUT) / T_FLY, 0, 1));
        out[0] = lerp(S0[0], agt.sx, e2); out[1] = lerp(S0[1], agt.sy, e2) - Math.sin(Math.PI * e2) * 30; return 1;
      }
      if (age < 0.6) { along(ROUTE_IN, LEN_IN, 1 - easeInOut(age / 0.6), 0, out); return 1; }   /* a miss backs out the way it came */
      along(ROUTE_IN, LEN_IN, 0, 0, S0); var a2 = age - 0.6;
      out[0] = S0[0] + DOOR_N[0] * 40 * a2; out[1] = S0[1] + DOOR_N[1] * 40 * a2 + 260 * a2 * a2; return 1 - a2 / 0.8;
    }
    var i;
    for (i = 0; i < cases.length; i++) {
      var c = cases[i], ag2 = time - c.t0;
      if (c.phase === 2 && ag2 > T_IN + T_SLIDE) continue;     /* at the closed end, being tested */
      var win = c.phase === 3, fade = at(c, ag2, Q);
      ctx.globalAlpha = alpha * clamp(fade, 0, 1) * (c.phase === 4 ? 0.8 : 1);
      ctx.fillStyle = win ? WIN.text : '#f1ebe1';
      ctx.shadowColor = win ? WIN.c : 'rgba(241,235,225,0.8)'; ctx.shadowBlur = (win ? 12 : 8) * DPR;
      ctx.beginPath(); ctx.arc(Q[0], Q[1], win ? 4.2 : 3.8, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  /* behind the sign: a few still, dim stars that drift with the camera for depth.
     No haze: the Mark's own light is the only light. */
  var BG_STARS = [];
  for (var bi = 0; bi < (isPhone ? 90 : 170); bi++) BG_STARS.push({ x: hash(bi, 21), y: hash(bi, 22), d: 0.2 + hash(bi, 23) * 0.8 });
  function backdrop(alpha) {
    screen();
    var px = (cam.x - AXW * 0.5) * 0.6, py = (cam.y - AYW * 0.5) * 0.6;
    ctx.fillStyle = '#efe8dc';
    for (var i = 0; i < BG_STARS.length; i++) {
      var s = BG_STARS[i], x = ((s.x * W - px * s.d * 3) % W + W) % W, y = ((s.y * H - py * s.d * 3) % H + H) % H;
      ctx.globalAlpha = alpha * (0.08 + 0.3 * s.d);
      ctx.beginPath(); ctx.arc(x, y, 0.4 + s.d * 0.8, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* the sign's light on the wall: each half's silhouette, blurred once into a
     sprite in its own LED colour, drawn at the sign's scale behind it */
  var SPILL = {}, SP_PAD = 110, SP_K = 2;
  function spillSprite(h) {
    var key = h + pal.led[h]; if (SPILL[key]) return SPILL[key];
    var cv = document.createElement('canvas'), w = (275 + 2 * SP_PAD) * SP_K, ht = (290 + 2 * SP_PAD) * SP_K, g = cv.getContext('2d'), far = 4000;
    cv.width = w; cv.height = ht;
    g.setTransform(SP_K, 0, 0, SP_K, (SP_PAD - far) * SP_K, SP_PAD * SP_K);   /* the shape sits off the canvas; only its shadow lands */
    g.shadowColor = pal.led[h]; g.shadowBlur = 58 * SP_K; g.shadowOffsetX = far * SP_K; g.fillStyle = pal.led[h];
    g.fill(PATHS[h]);
    return (SPILL[key] = cv);
  }
  function spill(alpha) {
    for (var h = 0; h < 2; h++) {
      pathAt(0); ctx.globalAlpha = alpha * (h ? 0.34 : 0.26);
      ctx.drawImage(spillSprite(h), -SP_PAD, -SP_PAD, 275 + 2 * SP_PAD, 290 + 2 * SP_PAD);
    }
    ctx.globalAlpha = 1;
  }
  function vignette() {
    screen();
    var r = Math.max(W, H) * 0.8, v = ctx.createRadialGradient(W / 2, H / 2, r * 0.45, W / 2, H / 2, r);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  function front() {
    /* in front of the sign: its light on the wall, then two windows, each with its own tunnel */
    vignette();
    if (neon()) spill(1); else wallLight();
    for (var h = 0; h < 2; h++) {
      var path = PATHS[h], s0 = pathAt(0);
      ctx.save(); ctx.clip(path);
      ctx.fillStyle = pal.deep[h]; ctx.fill(path);
      if (h === 0 && !BH) galaxy(1, 0);
      stars(h);
      if (neon()) {
        reflections(h, 0, 1);
        pathAt(0); ctx.strokeStyle = pal.led[h]; ctx.lineWidth = 7 / s0; ctx.lineJoin = 'round';
        ctx.stroke(path);   /* no glow: if the 3D sign can't load, the fallback is a flat sign, not neon (audit M6) */
      }
      ctx.restore();
      if (neon()) { pathAt(0); ctx.strokeStyle = pal.rim[h]; ctx.lineWidth = 4.6 / s0; ctx.lineJoin = 'round'; ctx.stroke(path); }
    }
  }
  /* with the 3D sign: the room's light on the wall behind it, from above, not light from the sign */
  function wallLight() {
    var c = [0, 0, 0]; if (!proj(0, -40, 0, c)) return;
    screen(); var r = c[2] * 260, g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], r);
    g.addColorStop(0, 'rgba(90,80,66,0.32)'); g.addColorStop(0.5, 'rgba(50,44,37,0.16)'); g.addColorStop(1, 'rgba(21,19,17,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function inside() {
    /* through the window: the tunnel is all around, and opens into the galaxy */
    screen(); ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
    var open = sstep(czEnd - 560, czEnd - 120, cam.z);
    backdrop(0.6);
    if (!BH) galaxy(1, open);   /* with the black hole (dive-next), the galaxy is its own layer, driven from frame() */
    stars(0, 1 - open);
    if (neon()) reflections(0, 0, 1 - open);
    lastOpen = open;
  }

  /* ---------------- copy ---------------- */
  var copy = {};
  ['intro', 'end'].forEach(function (k) { copy[k] = document.querySelector('[data-copy="' + k + '"]'); });
  var worksEl = document.querySelector('.works-k');
  function setCopy(p) {
    var hi = sstep(0.03, 0.11, p);
    copy.intro.style.opacity = String(1 - hi);
    copy.intro.style.transform = 'translateY(' + (-hi * 24).toFixed(1) + 'px)';
    copy.intro.style.visibility = hi > 0.99 ? 'hidden' : 'visible';
    var ce = sstep(0.84, 0.9, p) * sstep(0.85, 1, lastOpen);   /* not before the galaxy has opened */
    /* ...and it leaves as the page rises over the galaxy, so it never floats over an empty band (audit m3) */
    if (worksEl) ce *= sstep(0.4 * innerHeight, 0.8 * innerHeight, worksEl.getBoundingClientRect().top);
    copy.end.style.opacity = String(ce);
    copy.end.style.transform = 'translateY(' + ((1 - ce) * 12).toFixed(1) + 'px)';
  }

  /* ---------------- frame ---------------- */
  var lastSig = null;
  function colourKey() { return document.documentElement.getAttribute('data-colour') || document.documentElement.getAttribute('data-win') || ''; }
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!paused && !reduce) time += dt;
    var p = reduce ? 0 : progress();
    ps = reduce || paused ? p : lerp(ps, p, 1 - Math.exp(-dt * 7));
    ptr.sx = lerp(ptr.sx, ptr.x, 1 - Math.exp(-dt * 6)); ptr.sy = lerp(ptr.sy, ptr.y, 1 - Math.exp(-dt * 6));

    /* the camera: approach the sign, aim at the agent half, go through, fly the tunnel */
    /* paced evenly (Nov 23): the approach takes 0.07-0.36 of the scroll and the flight 0.36-0.86, so the tunnel no longer
       rushes past in a few hundred pixels and the last stretch is no longer only a headline fade */
    var A0 = 0.07, A1 = 0.36, B1 = 0.86;
    var u1 = clamp((ps - A0) / (A1 - A0), 0, 1), u2 = clamp((ps - A1) / (B1 - A1), 0, 1), aim = easeInOut(sstep(0.06, 0.34, ps));
    /* once the page's solid part reaches the nav, the nav gets its backing */
    /* ...and as soon as the pinned stage starts to scroll away, so the galaxy's heading never passes under the links */
    var dayOn = day.getBoundingClientRect().top + 0.4 * stage.clientHeight < 64 || stage.getBoundingClientRect().top < -2;
    if (dayOn !== lastDay) { lastDay = dayOn; navEl.classList.toggle('solid', dayOn); }
    /* through the tunnel the camera has a speed limit: the copies repeat every D units, so moving more than about
       a third of D per frame makes the tunnel strobe (stand still or seem to run backwards). A fast scroll just
       means the camera catches up over a moment, the way the both-modes graphic catches up. */
    /* one continuous glide: the approach starts from rest and reaches the window at speed VC, and the flight leaves
       the window at that same speed and comes to rest at the galaxy, so the camera never stalls in the window */
    var VC = Math.min(4000, 2.5 * F0 / (A1 - A0), 2.5 * czEnd / (B1 - A1)), s1 = VC * (A1 - A0) / F0, s2 = VC * (B1 - A1) / czEnd;
    var zT = ps < A1 ? -F0 + F0 * ((3 - s1) * u1 * u1 + (s1 - 2) * u1 * u1 * u1)
                       : czEnd * (s2 * u2 + (3 - 2 * s2) * u2 * u2 + (s2 - 2) * u2 * u2 * u2);
    /* the limit holds until the camera has caught up, in both directions, so a fast scroll back up flies you back
       out through the window instead of snapping to the first screen; outside the tunnel it is looser */
    /* a fast flick (phones) can reach the end of the dive while the camera is still in the tunnel: once the scroll is
       nearly out of the dive, the camera catches up at once, so the galaxy is always seen before the page covers it */
    if (reduce || (progress() > 0.93 && zT > cam.z)) cam.z = zT;
    else { var vmax = cam.z > 0 || zT > 0 ? Math.min(52, 2400 * Math.max(dt, 1 / 120)) : 3600 * Math.max(dt, 1 / 120); cam.z += clamp(zT - cam.z, -vmax, vmax); }   /* a slow frame never jumps more than 52 units in the tunnel */
    var sway = ptr.on && !reduce ? 1 : 0;
    cam.x = lerp(X0, AXW, aim) + sway * (ptr.sx / W - 0.5) * lerp(24, 4, aim);
    cam.y = lerp(Y0, AYW, aim) + sway * (ptr.sy / H - 0.5) * lerp(16, 3, aim);

    setCopy(ps);
    /* held still (reduced motion or paused): draw only when something on screen changed (audit m10) */
    var sig = paused || reduce ? [Math.round(ps * 1e4), Math.round(cam.x), Math.round(cam.y), Math.round(cam.z), W, H, DPR, M3 ? 1 : 0, colourKey()].join() : null;
    var same = sig !== null && sig === lastSig; lastSig = sig;
    if (same) { requestAnimationFrame(frame); return; }
    if (dive.getBoundingClientRect().bottom > 0) {      /* nothing to draw once the page has covered the stage */
      screen(); ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
      GALW.drawn = false;
      if (fctx) { if (fcanvas.width !== canvas.width || fcanvas.height !== canvas.height) { fcanvas.width = canvas.width; fcanvas.height = canvas.height; }
        fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, fcanvas.width, fcanvas.height); }
      backdrop(0.6 * sstep(0.1, 0.32, ps));      /* faint stars come in as you fly */
      if (cam.z < -1) front(); else inside();
      if (M3) {
        M3.render({ x: cam.x, y: cam.y, z: cam.z, F: F, W: W, H: H, DPR: DPR, aim: aim, ps: ps, fade: 1 - lastOpen,
          paused: paused || reduce, time: time, gal: GALW, markG: markG, cases: cases, agents: AGENTS,
          loop: { routeIn: ROUTE_IN, routeOut: ROUTE_OUT, door: DOOR_N, tSlide: T_SLIDE, tTest: T_TEST, tOut: T_OUT, tFly: T_FLY, mark: MARK_U } });
        if (m3el.hidden) m3el.hidden = false;
      }
      if (bhApi) bhApi.frame({ visible: true, camZ: cam.z, open: lastOpen, ZG: ZG, distEnd: ZG - czEnd, paused: paused || reduce, dt: dt });
    } else {
      if (M3 && !m3el.hidden) { m3el.hidden = true; if (fctx) { fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, fcanvas.width, fcanvas.height); } }
      if (bhApi) bhApi.frame({ visible: false });
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- the black hole (Nov 24; both founders approved it: dive.html and dive-next set window.__DIVE_BH) ----------------
     It is its own WebGL layer between this canvas and the 3D sign, so the tunnel's metal passes in front of it.
     Its sky is transparent: these stars show round it. It loads after the sign, and if it fails the old galaxy returns. */
  var BH = !!window.__DIVE_BH && !reduce, bhApi = null, bhEl = null;
  function loadBH() {
    if (!BH || bhEl) return;
    bhEl = document.createElement('canvas'); bhEl.setAttribute('data-bh', ''); bhEl.setAttribute('aria-hidden', 'true'); bhEl.style.visibility = 'hidden';
    canvas.parentNode.insertBefore(bhEl, canvas.nextSibling);
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'blackhole.css?v=3'; document.head.appendChild(css);
    window.__BH_EMBED = { stage: stage, canvas: bhEl, head: document.querySelector('.copy-end h2'), nav: navEl };
    import('./blackhole-live.js?v=37').then(function () { bhApi = window.__BH_EMBED.api || null; if (!bhApi) throw new Error('no api'); })
      .catch(function (e) { console.warn('black hole unavailable, galaxy kept:', e && e.message); BH = false; bhApi = null; if (bhEl) bhEl.remove(); });
  }

  /* ---------------- controls ---------------- */
  var mt = document.querySelector('[data-motion]');
  /* a quiet setting in the footer, for anyone who needs the page to hold still (the system setting does the same).
     It is remembered: the next visit starts still. The label says what a press will do; no aria-pressed (audit, Nov 24). */
  if (reduce && !heldByChoice) mt.hidden = true;
  if (heldByChoice) mt.textContent = 'Resume motion';
  mt.addEventListener('click', function () {
    if (heldByChoice) { try { localStorage.removeItem('synthe-motion'); } catch (e) {} location.reload(); return; }
    paused = !paused; mt.textContent = paused ? 'Resume motion' : 'Reduce motion'; document.documentElement.classList.toggle('paused', paused);
    try { if (paused) localStorage.setItem('synthe-motion', 'reduced'); else localStorage.removeItem('synthe-motion'); } catch (e) {}
  });

  readWin();
  var m3el = document.querySelector('[data-mark3d]');
  if (MARK && m3el) {
    import('./hero3d.js?v=19').then(function (mod) { return mod.start({ kind: MARK, canvas: m3el, source: canvas, D: D, ZG: ZG }); })
      .then(function (api) {
        /* the 3D sign fades in over the flat one instead of cutting in (audit m1) */
        M3 = api; m3el.style.opacity = '0'; m3el.hidden = false; document.documentElement.setAttribute('data-mark3d', api.kind);
        requestAnimationFrame(function () { requestAnimationFrame(function () { m3el.style.opacity = ''; }); });
        fcanvas = document.querySelector('[data-dive-front]'); if (fcanvas) { fcanvas.hidden = false; fctx = fcanvas.getContext('2d'); }
        loadBH();
        window.__loop = { force: function (a, win) { FORCE = { a: a, win: win, forA: a }; nextCase = 0; }, hold: function (on) { paused = !!on; }, get cases() { return cases; }, get time() { return time; }, get markG() { return markG; },
          agents: function () { return AGENTS.map(function (g, i) { return { i: i, name: g.name, front: g.front, s: g.s, sx: g.sx, sy: g.sy, wx: g.wx, wy: g.wy, wz: g.wz, wr: g.wr }; }); } };
      })
      .catch(function (e) { M3 = false; m3el.remove(); console.warn('3D sign unavailable, 2D sign kept:', e && e.message); loadBH(); });
  } else { if (MARK) M3 = false; loadBH(); }
  if (reduce) document.documentElement.classList.add('rm');
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
  window.__dive = { cam: cam, grooves: GROOVES, get p() { return ps; } };
})();
