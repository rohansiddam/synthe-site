/* Both modes, one bar. Two lanes under one polished bar: your agent's prompt (prompt mode) and your code
   (improve mode). Each change Synthe tries rises from below. A change that is not clearly better meets the bar,
   turns rose and falls away; a clear win passes through, lands in the file above, the changed lines are
   replaced, and the lane's number moves. Real runs, real order and real ratio:
   prompt: synthelabs/support-bot rounds 1-4 (Nov 3, 2026): 1 kept of 6 tried, checks 72% -> 89%;
   code: a small signup app, release build (Nov 7, 2026): round 1 broke a test, round 2 kept, 3 -> 12.
   Plays once when it comes into view; reduced motion shows the last frame; Reduce motion stops it. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { studio, KINDS, satin } from './material.js?v=18';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const ease = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const out = (t) => { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
const inq = (t) => { t = clamp(t, 0, 1); return t * t; };

/* each lane: the file's lines (as lengths, 0..1), which lines change, and the changes tried in order */
const LANES = [
  { id: 'prompt', from: 72, to: 89, fmt: (v) => Math.round(v) + '%',
    lines: [0.92, 0.78, 0.86, 0.6, 0.9, 0.7, 0.82, 0.5], changed: [1, 2], next: [0.96, 0.74],
    tries: [
      { at: 0.0, win: true },
      { at: 3.5, why: 'not clearly better, 6 better and 14 worse' },
      { at: 4.4, why: 'broke one of your rules' },
      { at: 5.3, why: 'could be luck, 9 better and 7 worse' },
      { at: 6.2, why: 'not clearly better, 8 better and 8 worse' },
      { at: 7.1, why: 'not clearly better, 7 better and 8 worse' },
    ] },
  { id: 'code', from: 3, to: 12, fmt: (v) => String(Math.round(v)),
    lines: [0.7, 0.98, 0, 0.55, 0.42, 0.18], changed: [1], next: [1], indent: [0, 0, 0, 0, 0.08, 0],
    tries: [
      { at: 0.05, why: 'broke a test that passed' },
      { at: 1.3, win: true },
    ] },
];
const RISE = 1.05, END = 9.6;   /* the last miss has fallen and its reason faded */
/* where each beat stops and waits for the reader: both first changes at the bar; both wins landed; the rest fallen away */
export const BEATS = [0.86, 3.45, END];

export async function start(root) {
  const stage = root.querySelector('[data-stage]'), canvas = stage.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.toneMapping = THREE.NeutralToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(); scene.environment = studio(renderer, 'lowkey');
  const camera = new THREE.PerspectiveCamera(20, 1, 1, 50000);

  const M = {
    bar: KINDS.satin.make(0, false).body[0],
    plate: (() => { const m = KINDS.graphite.make(0, false).body[0]; m.color.set(0x2a2b2e); return m; })(),   /* neutral graphite: the warm one read brown face-on */
    line: KINDS.satin.make(0, false).body[0],
    win: satin(0x7aa36e, 0xcfe8c4),   /* the lines a win puts in are green, whatever the brand colour */
  };
  const ROSE = new THREE.Color(0xc4668f), CREAM = new THREE.Color(0xe9e3d8), SAGE = new THREE.Color(0x9fd090);

  const bar = new THREE.Mesh(new THREE.BufferGeometry(), M.bar); scene.add(bar);
  const lanes = LANES.map((L, li) => {
    const g = { L, plate: new THREE.Mesh(new THREE.BufferGeometry(), M.plate), lines: [], fresh: [], tries: [], el: {} };
    scene.add(g.plate);
    L.lines.forEach(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), M.line); scene.add(m); g.lines.push(m); });
    L.changed.forEach(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), M.win); scene.add(m); g.fresh.push(m); });
    L.tries.forEach((tr) => {
      const mat = new THREE.MeshPhysicalMaterial({ color: CREAM.clone(), metalness: 1, roughness: 0.3, transparent: true });
      const m = new THREE.Mesh(new THREE.BufferGeometry(), mat); scene.add(m);
      const light = tr.win ? new THREE.PointLight(0xa6dd96, 0, 0, 2) : null; if (light) scene.add(light);
      const tag = tr.why ? Object.assign(document.createElement('span'), { className: 'md-why' }) : null;
      if (tag) { const b = document.createElement('b'); b.textContent = 'Not kept: '; tag.append(b, tr.why); }
      if (tag) stage.appendChild(tag);
      g.tries.push({ tr, m, light, tag, x: 0 });
    });
    g.el.num = root.querySelector(`[data-num="${L.id}"]`); g.el.chg = root.querySelector(`[data-chg="${L.id}"]`);
    return g;
  });

  let W = 0, H = 0, D = {};
  function layout() {
    W = stage.clientWidth; H = stage.clientHeight; renderer.setSize(W, H, false); camera.aspect = W / H;
    const dist = H / (2 * Math.tan((camera.fov * Math.PI) / 360)); camera.position.set(0, 0, dist); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    const narrow = matchMedia('(max-width: 900px)').matches, lane = W / 2;   /* the same switch as the page's CSS, so the stage and its captions agree */
    /* one css pixel is one unit at z = 0; y up from the stage's middle */
    const top = (px) => H / 2 - px;
    D = { narrow, lane, barY: top(narrow ? 290 : 348), plateY: top(narrow ? 158 : 206), plateW: Math.min(lane - (narrow ? 18 : 56), 420), plateH: narrow ? 88 : 136, floor: -H / 2 - 40 };
    bar.geometry.dispose(); bar.geometry = new RoundedBoxGeometry(W - (narrow ? 20 : 48), narrow ? 9 : 12, 26, 4, narrow ? 4.4 : 6); bar.position.set(0, D.barY, 0);
    lanes.forEach((g, li) => {
      const cx = (li ? 1 : -1) * lane / 2, L = g.L; g.cx = cx;
      g.plate.geometry.dispose(); g.plate.geometry = new RoundedBoxGeometry(D.plateW, D.plateH, 14, 4, 8); g.plate.position.set(cx, D.plateY, -6);
      const n = L.lines.length, pad = narrow ? 14 : 20, gap = (D.plateH - pad * 2) / n, lw = D.plateW - pad * 2, lh = Math.max(4, gap * 0.36);
      g.lineGeo = (len) => new RoundedBoxGeometry(Math.max(lh, lw * len), lh, 4, 2, lh / 2);
      g.lineAt = (i, len) => [cx - D.plateW / 2 + pad + (L.indent ? L.indent[i] * lw : 0) + (lw * len) / 2, D.plateY + D.plateH / 2 - pad - gap * (i + 0.5), 2];
      L.lines.forEach((len, i) => { const m = g.lines[i]; m.visible = len > 0; if (!len) return; m.geometry.dispose(); m.geometry = g.lineGeo(len); m.position.set(...g.lineAt(i, len)); });
      L.changed.forEach((row, k) => { const m = g.fresh[k]; m.geometry.dispose(); m.geometry = g.lineGeo(L.next[k]); m.position.set(...g.lineAt(row, L.next[k])); });
      const r = narrow ? 10 : 16;
      g.tries.forEach((t, k) => {
        t.m.geometry.dispose(); t.m.geometry = new THREE.CapsuleGeometry(r, r * 1.6, 8, 20);
        t.x = cx + (t.tr.win ? 0 : ((k % 3) - 1) * (narrow ? 22 : 40));
        if (t.tag) { t.tag.style.left = (W / 2 + cx) + 'px'; t.tag.style.top = (H / 2 - D.barY - (narrow ? 42 : 34)) + 'px';   /* above the bar: nothing rising passes there while it shows */ t.tag.style.maxWidth = (lane - 24) + 'px'; }
      });
    });
    draw();
  }

  let t = reduce ? END : 0;
  function draw() {
    lanes.forEach((g) => {
      const L = g.L, cap = D.narrow ? 10 : 16, barUnder = D.barY - (D.narrow ? 4.5 : 6) - cap * 1.8;
      let won = -1;
      g.tries.forEach((tt) => {
        const { tr, m } = tt, u = t - tr.at;
        if (u < 0) { m.visible = false; if (tt.tag) tt.tag.classList.remove('on'); if (tt.light) tt.light.intensity = 0; return; }
        m.visible = true; let y, s = 1, col = CREAM, op = 1;
        const rise = out(u / RISE);
        if (tr.win) {
          /* through the bar and up into the file, where it is taken in */
          const pass = ease((u - RISE * 0.82) / 0.55);
          y = D.floor + (barUnder - D.floor) * rise + (D.plateY - barUnder) * pass;
          const land = ease((u - RISE * 0.82 - 0.5) / 0.3); s = 1 - land; col = CREAM.clone().lerp(SAGE, clamp((u - RISE * 0.84) / 0.12, 0, 1));
          tt.light.position.set(tt.x, y, 30); tt.light.intensity = 26000 * clamp((u - RISE * 0.84) / 0.15, 0, 1) * (1 - land);   /* it lights only as it clears the bar */
          if (u > RISE * 0.82 + 0.5) won = u - (RISE * 0.82 + 0.5);
        } else {
          /* meets the bar, turns rose, and falls back out of view */
          const fall = inq((u - RISE) / 0.85);
          y = D.floor + (barUnder - D.floor) * rise - (barUnder - D.floor + 60) * fall;
          const hit = clamp((u - RISE * 0.86) / 0.2, 0, 1); col = CREAM.clone().lerp(ROSE, hit); op = 1 - clamp((u - RISE - 0.45) / 0.4, 0, 1);
          if (tt.tag) { const hitNow = u > RISE * 0.9, newer = g.tries.some((o) => o !== tt && !o.tr.win && o.tr.at > tr.at && t - o.tr.at > RISE * 0.9);
            const wt = g.tries.find((o) => o.tr.win), passing = wt && wt.tr.at > tr.at && t - wt.tr.at > RISE * 0.8;   /* audit M3: never label the win "not kept" as it passes */
            tt.tag.classList.toggle('on', hitNow && !newer && !passing && u < RISE + 1.4); }
        }
        m.position.set(tt.x, y, 8); m.scale.setScalar(Math.max(0.001, s)); m.material.color.copy(col); m.material.opacity = op; m.visible = op > 0.01 && s > 0.01;
      });
      /* the landing has weight: the file dips and turns a little, catching the light, then settles */
      const kick = won < 0 ? 0 : Math.sin(clamp(won / 0.9, 0, 1) * Math.PI) * (1 - clamp(won / 0.9, 0, 1) * 0.4);
      g.plate.rotation.x = -0.16 * kick; g.plate.position.z = -6 - 10 * kick;
      [...g.lines, ...g.fresh].forEach((m) => { m.rotation.x = g.plate.rotation.x; });
      /* the file changes the moment the win lands: old lines sink away, new ones rise in its colour */
      const k = won < 0 ? 0 : ease(won / 0.45);
      L.changed.forEach((row, j) => {
        const old = g.lines[row]; old.scale.set(1, Math.max(0.001, 1 - k), 1); old.position.z = 2 - k * 6;
        const nw = g.fresh[j]; nw.scale.set(Math.max(0.001, ease((won - 0.15) / 0.45)), 1, 1); nw.visible = won > 0.15;
        const [x0] = g.lineAt(row, L.next[j]); const len = (D.plateW - (D.narrow ? 28 : 40)) * L.next[j]; nw.position.x = x0 - len / 2 + (len / 2) * nw.scale.x;
      });
      const v = L.from + (L.to - L.from) * (won < 0 ? 0 : ease(won / 0.7));
      g.el.num.textContent = L.fmt(v); g.el.num.classList.toggle('up', won >= 0);
      g.el.chg.classList.toggle('on', won > 0.2);
    });
    renderer.render(scene, camera);
  }
  /* the reader's scroll picks the beat; each beat then plays in real time and waits at its end.
     Time never runs backwards, and catches up a little faster if someone scrolls ahead. */
  let target = reduce ? END : 0, running = false, last = 0;
  function step(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (!document.documentElement.classList.contains('paused') && t < target) t = Math.min(target, t + dt * (target - t > 2.5 ? 1.8 : 1));
    draw();
    if (t < target) requestAnimationFrame(step); else { running = false; last = 0; }
  }
  function play(to) { target = Math.max(target, to); if (!running && t < target) { running = true; last = 0; requestAnimationFrame(step); } }
  addEventListener('resize', layout); layout();
  /* Reduce motion shows the answer, the last frame, not the opening one (audit M2) */
  const held = () => document.documentElement.classList.contains('paused');
  new MutationObserver(() => { if (held()) { t = END; target = END; draw(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  if (held()) { t = END; target = END; }
  return { seek(s) { t = s; target = Math.max(target, s); draw(); }, beat(i) { play(BEATS[Math.max(0, Math.min(BEATS.length - 1, i))]); }, END };
}
