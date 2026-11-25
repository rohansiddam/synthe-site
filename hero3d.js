/* The hero's sign in 3D, for the lab's ?mark=<kind> switch (metal, anodized, glass, stained).
   dive.js still draws the wall, each window's interior and the galaxy on its 2D canvas. This draws,
   with the very same camera, the sign's two frames, the glass that fills them (stained glass only),
   and the tunnel: the frames' own reflections, deeper and dimmer, seen only through the windows.
   Glass kinds draw over a copy of the 2D picture, so glass bends what is really behind it. Every other kind
   (satin, the default) has nothing that sees through, so its canvas is transparent and the 2D canvas shows
   beneath it: no copy of the whole picture goes to the GPU each frame (it held Retina screens near 13 fps).
   Nothing here loads unless ?mark= is set; dive.js keeps its 2D sign if this fails. */
import * as THREE from 'three';
import { markGeometry, KINDS, studio } from './material.js?v=18';

const DEG = Math.PI / 180;
const FRAME = { metal: 9, anodized: 10, glass: 10, stained: 7, satin: 10, graphite: 10, chrome: 9, opal: 10 };   /* frame width in Mark units, per material */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = window.matchMedia('(hover: none)').matches;
function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function sstep(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

export async function start(opts) {
  const kind = KINDS[opts.kind] ? opts.kind : 'metal', K = KINDS[kind];
  const mats = [0, 1].map((h) => K.make(h, true));
  const seeThrough = mats.some((m) => [m.body, m.pane].flat().some((x) => x && x.transmission > 0));
  const renderer = new THREE.WebGLRenderer({ canvas: opts.canvas, antialias: true, stencil: true, alpha: !seeThrough, powerPreference: 'high-performance' });
  if (!seeThrough) renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const geos = await markGeometry({ frame: FRAME[kind], profile: K.profile });

  const scene = new THREE.Scene();
  scene.environment = studio(renderer, K.look);
  const bg = seeThrough ? new THREE.CanvasTexture(opts.source) : null;
  if (bg) { bg.colorSpace = THREE.SRGBColorSpace; bg.minFilter = THREE.LinearFilter; bg.generateMipmaps = false; scene.background = bg; }
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 40000);
  const sign = new THREE.Group(); scene.add(sign);

  const bodies = [0, 1].map((h) => { const m = new THREE.Mesh(geos[h].body, mats[h].body); m.renderOrder = 3; sign.add(m); return m; });
  const panes = [0, 1].map((h) => {
    if (!mats[h].pane || !geos[h].pane) return null;
    const m = new THREE.Mesh(geos[h].pane, mats[h].pane); m.renderOrder = 3; sign.add(m); return m;
  });
  /* each window's shape, written only into the stencil: the tunnel shows inside it and nowhere else */
  const masks = [0, 1].map((h) => {
    const mm = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: h + 1,
      stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
    const m = new THREE.Mesh(geos[h].pane, mm); m.renderOrder = 1; sign.add(m); return m;
  });
  /* the tunnel: copies of each frame every D units behind it, all the way to the galaxy, each bounce losing
     the same share of light. Each copy also has its own opacity (aFade): it fades out before it reaches you,
     so you fly down the tunnel instead of through a wall of metal bars, and the whole tunnel fades as the
     galaxy opens up at its end. */
  const ZG = opts.ZG || 3000, KC = Math.floor((ZG - 160) / (opts.D || 130)), D = opts.D || 130;
  const copyMats = [];
  const copies = [0, 1].map((h) => {
    const src = mats[h].body, cm = src.map((m) => {
      const c = m.clone(), base = m.onBeforeCompile, key = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
      c.onBeforeCompile = (sh, r) => {
        if (base) base(sh, r);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aFade;\nvarying float vFade;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFade;')
          .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a *= vFade;');
      };
      c.customProgramCacheKey = () => key + '|fade';
      c.transparent = true;
      c.stencilWrite = true; c.stencilRef = h + 1; c.stencilFunc = THREE.EqualStencilFunc;
      c.stencilFail = c.stencilZFail = c.stencilZPass = THREE.KeepStencilOp; copyMats.push(c); return c;
    });
    const g = geos[h].body.clone();
    g.setAttribute('aFade', new THREE.InstancedBufferAttribute(new Float32Array(KC).fill(1), 1));
    const im = new THREE.InstancedMesh(g, cm, KC), M = new THREE.Matrix4();
    for (let k = 0; k < KC; k++) { im.setMatrixAt(k, M.makeTranslation(0, 0, -(k + 1) * D)); im.setColorAt(k, new THREE.Color(0.62 * Math.pow(0.86, k), 0.62 * Math.pow(0.86, k), 0.62 * Math.pow(0.86, k))); }
    im.renderOrder = 2; im.frustumCulled = false; sign.add(im); return im;
  });
  let lastInside = null;
  function smooth(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  /* camZ: the camera's depth in the dive's units (the sign is at 0, the tunnel runs to positive z).
     Each copy is as bright as its distance says: from outside, the deeper reflections are dimmer, as in a real
     infinity mirror; once you are inside, the copies brighten as they come toward you and sweep out past the
     edges of the screen, dissolving only in the last few units. Brightness follows distance rather than which
     copy it is, so the tunnel never looks the same twice as you fly: that sameness is what read as a glitch. */
  const CC = new THREE.Color();
  const KEEP = 3;   /* copies you fly past once inside */
  function dim(camZ, fade) {
    const ref = Math.max(camZ, 0);
    copies.forEach((im) => {
      const a = im.geometry.getAttribute('aFade');
      for (let k = 0; k < KC; k++) {
        const z = (k + 1) * D, dz = z - camZ;
        /* through the window you pass the first few copies; the deeper ones dissolve as you go in, so you come
           out of the mirror into open space and fly on toward the galaxy, which grows ahead of you */
        const deep = k >= KEEP ? 1 - smooth(-220, 240, camZ) : 1;
        a.array[k] = fade * deep * smooth(22, 90, dz) * (1 - smooth(ZG - 700, ZG - 200, z));
        im.setColorAt(k, CC.setScalar(0.62 * Math.pow(0.86, Math.max(0, (z - ref) / D - 1))));
      }
      a.needsUpdate = true; im.instanceColor.needsUpdate = true;
    });
  }

  /* ---------- the galaxy's centre: the Mark as a solid object, at work ----------
     A case is a small real light. It leaves an agent, slides into the agent half's groove (lighting its
     walls), passes into the seam, where the halves part to test it, then a win leaves through your team's
     groove in green and lands on its agent; a case that is not kept backs out and falls away.
     Glass is held out of the centre: a glass logo in a field of names is another company's look. */
  const VCX = 137.5, VCY = 145;
  const solid = await markGeometry({ frame: 0, profile: 'round' });
  const CK = kind === 'glass' ? KINDS.metal : K;
  const cmats = [0, 1].map((h) => CK.make(h, false).body);
  /* a touch more satin than the sign, so a case's light spreads along the walls it passes */
  new Set(cmats.flat()).forEach((m) => { if (m.metalness > 0.5) m.roughness = Math.max(m.roughness, 0.24); });
  const centre = new THREE.Group(); scene.add(centre);
  const halves = [0, 1].map((h) => { const m = new THREE.Mesh(solid[h].body, cmats[h]); m.renderOrder = 2; centre.add(m); return m; });
  const cUnique = [...new Set(cmats.flat())];
  function centreStencil(on) { cUnique.forEach((m) => { m.stencilWrite = on; m.stencilRef = 1; m.stencilFunc = on ? THREE.EqualStencilFunc : THREE.AlwaysStencilFunc;
    m.stencilFail = m.stencilZFail = m.stencilZPass = THREE.KeepStencilOp; m.needsUpdate = true; }); }

  /* the case: a white-hot bead with a tight halo, and the light it gives */
  const haloCv = document.createElement('canvas'); haloCv.width = haloCv.height = 64;
  { const g = haloCv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  /* up to three cases at once (a win flying home while the next one starts); a fixed number of lights,
     so the materials never recompile mid-flight */
  const haloTex = new THREE.CanvasTexture(haloCv), NB = 3;
  const beads = [...Array(NB)].map(() => {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); scene.add(bead);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); scene.add(halo);
    const lamp = new THREE.PointLight(0xfff0dc, 0, 0, 2); scene.add(lamp);
    return { bead, halo, lamp };
  });
  const WARM = new THREE.Color(0xfff0dc), SAGE_L = new THREE.Color(0xa6dd96), GREY = new THREE.Color(0xb9b2a8);

  /* the agents: real spheres in the same light; a win turns its agent sage */
  const AG_MAX = 64;
  const agentMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 40, 24), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.85, roughness: 0.26, clearcoat: 0.6, clearcoatRoughness: 0.1 }), AG_MAX);
  agentMesh.frustumCulled = false; scene.add(agentMesh);
  for (let i = 0; i < AG_MAX; i++) agentMesh.setColorAt(i, new THREE.Color(0, 0, 0));
  const AG_CREAM = new THREE.Color(0xe6ded1), AG_SAGE = new THREE.Color(0x86b878);

  const cpose = { x: 0.06, y: -0.22, vx: 0, vy: 0 };
  const T = new THREE.Vector3(), U = new THREE.Vector3(), Wp = new THREE.Vector3(), M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), S3 = new THREE.Vector3(), C3 = new THREE.Color();
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  /* a point of the Mark (viewBox units) on half h, in the world */
  function onHalf(px, py, h, out) { out.set(px - VCX, -(py - VCY), 0); return halves[h].localToWorld(out); }
  function seam(out) { out.set(0, 0, 0); return centre.localToWorld(out); }
  /* along a list of world points by fraction u */
  function along(pts, u, out) {
    let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = pts[i].distanceTo(pts[i - 1]); seg.push(d); L += d; }
    let d = clamp(u, 0, 1) * L, i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
    return out.copy(pts[i]).lerp(pts[i + 1], seg[i] ? d / seg[i] : 0);
  }
  const ptsIn = [], ptsOut = []; for (let i = 0; i < 8; i++) { ptsIn.push(new THREE.Vector3()); ptsOut.push(new THREE.Vector3()); }
  function routes(L) {
    L.routeIn.forEach((p, i) => onHalf(p[0], p[1], 0, ptsIn[i])); ptsIn.length = L.routeIn.length;
    L.routeOut.forEach((p, i) => onHalf(p[0], p[1], 1, ptsOut[i])); ptsOut.length = L.routeOut.length;
  }
  const agentW = (a, out) => out.set(a.wx, -a.wy, -a.wz);
  /* where the case is, its colour and strength; null when none is out */
  function caseAt(s, k, out) {
    const L = s.loop;
    const age = s.time - k.t0, agt = s.agents[k.a], lift = (e) => Math.sin(Math.PI * e) * 32;
    if (k.phase === 0) {
      const e = ease(clamp(age / 1.15, 0, 1)); agentW(agt, T); out.copy(T).lerp(ptsIn[0], e); out.y += lift(e);
      return { col: WARM, k: 1 };
    }
    if (k.phase === 2) {
      if (age < L.tSlide) { along(ptsIn, ease(age / L.tSlide), out); return { col: WARM, k: 1 }; }
      const t = clamp((age - L.tSlide) / 0.25, 0, 1); seam(T); out.copy(ptsIn[ptsIn.length - 1]).lerp(T, ease(t));
      return { col: WARM, k: 1.25 };          /* in the seam, under test */
    }
    if (k.phase === 3) {
      if (age < L.tOut) {
        const u = age / L.tOut;
        if (u < 0.3) { seam(T); out.copy(T).lerp(ptsOut[0], ease(u / 0.3)); }
        else along(ptsOut, ease((u - 0.3) / 0.7), out);
        return { col: SAGE_L, k: 1.15 };
      }
      const e = ease(clamp((age - L.tOut) / L.tFly, 0, 1)); agentW(agt, T); out.copy(ptsOut[ptsOut.length - 1]).lerp(T, e); out.y += lift(e) * 0.9;
      return { col: SAGE_L, k: 1.15 * (1 - sstep(0.85, 1, e)) };
    }
    /* not kept: back the way it came, then out of the opening and down, fading */
    if (age < 0.6) {
      const u = age / 0.6;
      if (u < 0.3) { seam(T); out.copy(T).lerp(ptsIn[ptsIn.length - 1], ease(u / 0.3)); }
      else along(ptsIn, 1 - ease((u - 0.3) / 0.7), out);
      return { col: GREY, k: 0.8 };
    }
    const a2 = age - 0.6; U.set(L.door[0], -L.door[1], 0).applyQuaternion(centre.quaternion);
    out.copy(ptsIn[0]).addScaledVector(U, 36 * a2); out.y -= 230 * a2 * a2;
    return { col: GREY, k: 0.8 * clamp(1 - a2 / 0.8, 0, 1) };
  }
  let lastCentreStencil = null;
  function updateGalaxy(s, inside) {
    const g = s.gal, show = g && g.drawn;
    centre.visible = !!show;
    if (!show) { beads.forEach((b) => { b.bead.visible = b.halo.visible = false; b.lamp.intensity = 0; }); agentMesh.count = 0; return; }
    if (lastCentreStencil !== !inside) { lastCentreStencil = !inside; centreStencil(!inside); }
    const sc = s.loop.mark / 290;
    centre.position.set(g.x, -g.y, -g.z); centre.scale.setScalar(sc);
    /* a three-quarter turn so the metal shows its depth, easing toward the pointer */
    if (!s.paused) {
      const dt = 1 / 60, ty = -0.22 + (ptr.on && !touch ? clamp(ptr.x / W - 0.5, -0.5, 0.5) * 0.3 : 0), tx = 0.06 + (ptr.on && !touch ? clamp(ptr.y / H - 0.5, -0.5, 0.5) * 0.16 : 0);
      cpose.vx += (40 * (tx - cpose.x) - 10 * cpose.vx) * dt; cpose.vy += (40 * (ty - cpose.y) - 10 * cpose.vy) * dt; cpose.x += cpose.vx * dt; cpose.y += cpose.vy * dt;
    }
    centre.rotation.set(cpose.x, cpose.y, 0);
    const off = s.markG * 290;
    halves[0].position.set(-0.7932 * off, 0.6088 * off, 0); halves[1].position.set(0.7932 * off, -0.6088 * off, 0);
    centre.updateMatrixWorld(true);
    routes(s.loop);

    /* the cases */
    beads.forEach((b, i) => {
      const k = inside ? s.cases[i] : null, c = k ? caseAt(s, k, Wp) : null;
      if (c && c.k > 0.01) {
        const r = 3.4; b.bead.visible = b.halo.visible = true;
        b.bead.position.copy(Wp); b.bead.scale.setScalar(r); b.bead.material.color.copy(c.col).lerp(C3.setRGB(1, 1, 1), c.col === SAGE_L ? 0.12 : 0.5).multiplyScalar(1.3 * Math.min(1, c.k));
        b.halo.position.copy(Wp); b.halo.scale.setScalar(r * 5.5); b.halo.material.color.copy(c.col); b.halo.material.opacity = 0.55 * Math.min(1, c.k);
        b.lamp.position.copy(Wp); b.lamp.color.copy(c.col); b.lamp.intensity = 9000 * c.k;
      } else { b.bead.visible = b.halo.visible = false; b.lamp.intensity = 0; }
    });

    /* the agents */
    let n = 0;
    if (inside && g.open > 0.02) for (let i = 0; i < s.agents.length && n < AG_MAX; i++) {
      const a = s.agents[i]; if (!a.wr || !a.al) continue;
      M4.compose(agentW(a, T), Q4.identity(), S3.setScalar(a.wr)); agentMesh.setMatrixAt(n, M4);
      agentMesh.setColorAt(n, C3.copy(a.isLit ? AG_SAGE : AG_CREAM).multiplyScalar(clamp(a.al, 0, 1))); n++;
    }
    agentMesh.count = n; agentMesh.instanceMatrix.needsUpdate = true; if (agentMesh.instanceColor) agentMesh.instanceColor.needsUpdate = true;
  }

  /* tilt: toward the pointer on a spring, small enough that each window stays over its own interior;
     on a touch screen, one slow turn as you start to scroll. It fades out as the camera lines up the dive. */
  const ptr = { x: 0, y: 0, on: false }, tilt = { x: 0, y: 0, vx: 0, vy: 0 };
  window.addEventListener('pointermove', (e) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = e.pointerType === 'mouse' || ptr.on; }, { passive: true });
  const P = new THREE.Vector3();
  let W = 0, H = 0, DPR = 0, last = 0;

  function render(s) {
    if (s.W !== W || s.H !== H || s.DPR !== DPR) { W = s.W; H = s.H; DPR = s.DPR; renderer.setPixelRatio(DPR); renderer.setSize(W, H, false); }
    camera.fov = 2 * Math.atan(H / (2 * s.F)) / DEG; camera.aspect = W / H;
    camera.position.set(s.x, -s.y, -s.z); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    if (bg) bg.needsUpdate = true;   /* glass only */

    const now = performance.now(), dt = Math.min(0.05, (now - (last || now)) / 1000) || 0.016; last = now;
    let tx = 0, ty = 0;
    if (!reduce && !s.paused) {
      if (!touch && ptr.on) {
        P.set(0, 0, 0).project(camera); const cx = (P.x + 1) / 2 * W, cy = (1 - P.y) / 2 * H;
        ty = clamp((ptr.x - cx) / (W * 0.5), -1, 1) * 0.12; tx = clamp((ptr.y - cy) / (H * 0.5), -1, 1) * 0.08;
      } else if (touch) { const t = sstep(0, 0.12, s.ps); ty = -0.08 + 0.16 * t; tx = 0.05 * t; }
      const keep = 1 - s.aim; tx *= keep; ty *= keep;
      tilt.vx += (70 * (tx - tilt.x) - 12 * tilt.vx) * dt; tilt.vy += (70 * (ty - tilt.y) - 12 * tilt.vy) * dt;
      tilt.x += tilt.vx * dt; tilt.y += tilt.vy * dt;
    }
    sign.rotation.set(tilt.x, tilt.y, 0);

    const inside = s.z >= -1;
    if (inside !== lastInside) {
      lastInside = inside;
      bodies.forEach((m) => { m.visible = !inside; }); masks.forEach((m) => { m.visible = !inside; });
      copies[1].visible = !inside;   /* inside the agent's window, only its own tunnel: the other half is a separate mirror box */
      copyMats.forEach((c) => { c.stencilWrite = !inside; c.needsUpdate = true; });
    }
    /* stained glass: the panes give way as you start toward the window */
    panes.forEach((m) => { if (!m) return; const a = 1 - sstep(0.04, 0.16, s.ps); m.visible = !inside && a > 0.01; m.material.transparent = a < 0.999; m.material.opacity = a; });
    dim(s.z, inside ? s.fade : 1);
    copies[0].visible = !inside || s.fade > 0.01;   /* in the galaxy the tunnel is gone */
    if (s.gal) updateGalaxy(s, inside);
    renderer.render(scene, camera);
  }
  /* lab checks only: flat white frames on black, no tilt, to measure how the 3D sign lines up with the 2D one */
  window.__m3 = { flat() { const w = new THREE.MeshBasicMaterial({ color: 0xffffff }); bodies.forEach((m) => { m.material = [w, w]; }); panes.forEach((m) => { if (m) m.visible = false; });
    copies.forEach((c) => { c.visible = false; }); scene.background = new THREE.Color(0x000000); scene.environment = null; tilt.x = tilt.y = tilt.vx = tilt.vy = 0; ptr.on = false; } };
  return { render, kind, frame: FRAME[kind], renderer };
}
