/* The Mark as a real object: two extruded halves with rounded edges, lit only by a studio
   environment built here in code (no downloaded HDRI), in six materials. Light comes from defined
   sources and reaches the eye by reflection or refraction; nothing glows. It tilts toward the pointer
   and can be dragged; both settle on a spring. No idle spin. Reduced motion: a still three-quarter pose. */
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const VB = { w: 275, h: 290 };
const DEG = Math.PI / 180;
const SAGE = 0x7bb76e, VIOLET = 0x9c7ae8;

/* ---------- shape ---------- */
function flipWinding(g) {
  for (const name of ['position', 'normal', 'uv']) {
    const a = g.getAttribute(name); if (!a) continue;
    const n = a.itemSize, arr = a.array;
    for (let i = 0; i < arr.length; i += 3 * n) for (let k = 0; k < n; k++) { const t = arr[i + n + k]; arr[i + n + k] = arr[i + 2 * n + k]; arr[i + 2 * n + k] = t; }
    a.needsUpdate = true;
  }
}
/* the window: the half's outline taken in by the frame's width. Drawn at 8x, eaten away from the
   edge by a round stroke (an exact inward offset), traced back into a smooth outline */
function windowPath(d, frameW) {
  const K = 8, w = VB.w * K, h = VB.h * K, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); g.scale(K, K);
  const p = new Path2D(d); g.fillStyle = '#fff'; g.fill(p);
  g.strokeStyle = '#000'; g.lineWidth = 2 * frameW; g.lineJoin = 'round'; g.stroke(p);
  const data = g.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = data[i * 4] > 127 ? 1 : 0;
  let start = -1; for (let i = 0; i < w * h; i++) if (m[i]) { start = i; break; }
  if (start < 0) return null;
  /* follow the edge pixel by pixel (Moore neighbourhood) */
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const fg = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
  const sx = start % w, sy = (start / w) | 0; let cx = sx, cy = sy, back = 4; const pts = [];
  do {
    pts.push([cx, cy]); let moved = false;
    for (let k = 1; k <= 8; k++) {
      const di = (back + k) % 8, nx = cx + dirs[di][0], ny = cy + dirs[di][1];
      if (fg(nx, ny)) { const pd = (di + 7) % 8, bx = cx + dirs[pd][0], by = cy + dirs[pd][1]; cx = nx; cy = ny; back = dirs.findIndex((v) => v[0] === bx - cx && v[1] === by - cy); moved = true; break; }
    }
    if (!moved) break;
  } while (!(cx === sx && cy === sy) && pts.length < 400000);
  /* smooth the pixel steps, then keep only the points that matter */
  const n = pts.length, sm = [], R = 6;
  for (let i = 0; i < n; i++) { let ax = 0, ay = 0; for (let j = -R; j <= R; j++) { const q = pts[(i + j + n) % n]; ax += q[0]; ay += q[1]; } sm.push([ax / (2 * R + 1), ay / (2 * R + 1)]); }
  const keep = rdp(sm, 0.9).map((q) => new THREE.Vector2((q[0] + 0.5) / K, (q[1] + 0.5) / K));
  return keep;
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let idx = 0, dmax = 0; const a = pts[0], b = pts[pts.length - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  for (let i = 1; i < pts.length - 1; i++) { const p = pts[i], dd = Math.abs((b[1] - a[1]) * p[0] - (b[0] - a[0]) * p[1] + b[0] * a[1] - b[1] * a[0]) / L; if (dd > dmax) { dmax = dd; idx = i; } }
  if (dmax <= eps) return [a, b];
  const l = rdp(pts.slice(0, idx + 1), eps), r = rdp(pts.slice(idx), eps); return l.slice(0, -1).concat(r);
}
function finish(g, crease) {
  g.computeBoundingBox();
  g.translate(-VB.w / 2, -VB.h / 2, -(g.boundingBox.max.z + g.boundingBox.min.z) / 2);
  g.scale(1, -1, 1);            /* SVG's y runs down; ours runs up */
  flipWinding(g);               /* the mirror above turned every face inside out; turn them back */
  return toCreasedNormals(g, crease);
}
/* edge profiles: 'round' rounds a solid half nearly all the way; for a frame, 'pill' rounds the rail,
   'chamfer' is machined: a flat face, a small flat cut at 45 degrees, straight walls */
function extrudeOpts(profile, f) {
  if (profile === 'chamfer') { const c = Math.max(0.6, f * 0.16); return { depth: f * 0.9, curveSegments: 48, bevelEnabled: true, bevelThickness: c, bevelSize: c, bevelOffset: -c, bevelSegments: 1 }; }
  if (profile === 'pill') { const r = f * 0.42; return { depth: f * 0.35, curveSegments: 48, bevelEnabled: true, bevelThickness: r * 1.05, bevelSize: r, bevelOffset: -r, bevelSegments: 10 }; }
  return { depth: 8, curveSegments: 48, bevelEnabled: true, bevelThickness: 12, bevelSize: 11, bevelOffset: -11, bevelSegments: 14 };
}
/* opts.frame: 0 for solid halves, or the frame's width in Mark units (the window is what is left).
   Returns, per half [agent (upper, cream), team (lower, sage)], { body, pane } where pane is the window's
   own shape (for glass that fills it) or null. */
export async function markGeometry(opts = {}) {
  const svg = (await (await fetch('logo.svg')).text()).replace(/currentColor/g, '#000');
  const ds = [...svg.matchAll(/ d="([^"]+)"/g)].map((x) => x[1]);
  const data = new SVGLoader().parse(svg);
  const f = opts.frame || 0, profile = opts.profile || (f ? 'pill' : 'round');
  /* logo.svg holds your team's half (sage, lower) first, then the agent's half (cream, upper) */
  const out = data.paths.map((p, i) => {
    const shapes = SVGLoader.createShapes(p);
    let pane = null;
    if (f) {
      const win = windowPath(ds[i], f);
      if (win) {
        shapes[0].holes.push(new THREE.Path(win));
        const ps = new THREE.Shape(win);
        pane = finish(new THREE.ExtrudeGeometry(ps, { depth: 1.2, bevelEnabled: false, curveSegments: 8 }), 30 * DEG);
      }
    }
    const body = finish(new THREE.ExtrudeGeometry(shapes, extrudeOpts(profile, f)), (profile === 'chamfer' ? 40 : 58) * DEG);
    return { body, pane };
  });
  return out.reverse();
}

/* ---------- light: a small studio, built in code (also used by hero3d.js) ---------- */
export function studio(renderer, look) {
  if (look === 'lowkey') return lowkey(renderer);
  /* a photographer's sweep the viewer never sees: warm grey above, falling to near black below,
     with softboxes for the broad highlights and strips for the long ones */
  const env = new THREE.Scene();
  const sweep = document.createElement('canvas'); sweep.width = 512; sweep.height = 256; const sg = sweep.getContext('2d');
  const gr = sg.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#9a9288'); gr.addColorStop(0.35, '#6a6359'); gr.addColorStop(0.5, '#4a443c'); gr.addColorStop(0.62, '#221e1a'); gr.addColorStop(1, '#080707');
  sg.fillStyle = gr; sg.fillRect(0, 0, 512, 256);
  /* darker behind the Mark (u near 0.75 on this sphere), full brightness all round the front (u near 0.25) */
  const im = sg.getImageData(0, 0, 512, 256);
  for (let x = 0; x < 512; x++) {
    const u = x / 512, d = Math.min(Math.abs(u - 0.25), 1 - Math.abs(u - 0.25)), f = 0.28 + 0.72 * Math.exp(-Math.pow(d / 0.2, 2));
    for (let y = 0; y < 256; y++) { const o = (y * 512 + x) * 4; im.data[o] *= f; im.data[o + 1] *= f; im.data[o + 2] *= f; }
  }
  sg.putImageData(im, 0, 0);
  const st = new THREE.CanvasTexture(sweep); st.colorSpace = THREE.SRGBColorSpace;
  env.add(new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), new THREE.MeshBasicMaterial({ map: st, side: THREE.BackSide })));
  const softbox = (w, h, color, k, pos) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), c = new THREE.Color(color);
    const rg = g.createRadialGradient(64, 52, 4, 64, 64, 72); rg.addColorStop(0, '#fff'); rg.addColorStop(0.55, '#9a9a9a'); rg.addColorStop(1, '#000');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(cv);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, color: c.multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);
  };
  const panel = (w, h, color, k, pos, spin = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); m.rotateZ(spin); env.add(m);
  };
  panel(40, 28, 0xfff0da, 9.0, [-24, 18, 28]);            /* warm key softbox, high on the left, in front */
  softbox(96, 60, 0xfff4e6, 5.0, [4, 10, 44]);           /* a big graded softbox behind the camera: flat faces show a smooth fall of light */
  panel(56, 56, 0xfff6ea, 2.6, [0, 44, 0]);               /* a broad overhead softbox: tops and upper edges */
  panel(3.2, 52, 0xeef3ff, 8.0, [36, 2, 10]);             /* a tall strip on the right: the long edge highlight */
  panel(3.2, 40, 0xfff2e2, 4.0, [-38, -4, -6]);           /* a fainter strip on the left, behind: the far edges */
  panel(56, 2.2, 0xffffff, 6.0, [0, 30, -20], 52.5 * DEG); /* a thin strip behind and above, at the Mark's own angle */
  panel(40, 14, 0x3a3127, 1.8, [0, -34, 16]);             /* warm floor bounce */
  panel(14, 14, VIOLET, 1.8, [28, -18, 22]);              /* a little of the brand colour from below right */
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.015).texture; pm.dispose();
  return tex;
}

/* the low-key studio product photographers use for dyed metal: almost all black, one broad soft light
   overhead, thin bright rims from behind, a faint fill. Faces fall into the metal's own colour; only edges catch. */
function lowkey(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.BackSide })));
  const soft = (w, h, k, pos, hot = 0.35) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
    const rg = g.createRadialGradient(64, 64, 2, 64, 64, 66); rg.addColorStop(0, '#fff'); rg.addColorStop(hot, '#bdbdbd'); rg.addColorStop(1, '#000');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), color: new THREE.Color(0xfff8f0).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m);
  };
  const strip = (w, h, k, pos, spin = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf6f8ff).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); m.rotateZ(spin); env.add(m);
  };
  soft(76, 50, 6.5, [0, 46, 6]);                   /* the broad soft light overhead */
  soft(64, 44, 1.8, [-10, 8, 46], 0.25);            /* a faint fill from the front */
  strip(70, 1.8, 16.0, [0, 22, -40]);              /* a thin rim from behind and above: the top edges */
  strip(1.8, 50, 11.0, [44, 4, -16]);              /* a rim from behind on the right */
  strip(1.8, 44, 5.0, [30, 6, 34]);                 /* a strip in front on the right: the long face highlight */
  strip(1.4, 40, 3.5, [-44, 0, -20]);              /* a fainter rim behind on the left */
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.02).texture; pm.dispose();
  return tex;
}
/* bead-blasted grain: a fine, even micro-texture as a normal map */
let GRAIN = null;
function grain() {
  if (GRAIN) return GRAIN;
  const N = 256, h = new Float32Array(N * N), r = rand(29);
  for (let i = 0; i < N * N; i++) h[i] = r();
  const b = new Float32Array(N * N);   /* a light blur, so the grain reads as blasted, not as noise */
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += h[((y + dy + N) % N) * N + (x + dx + N) % N]; b[y * N + x] = s / 9; }
  const cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d'), im = c.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = b[y * N + (x + 1) % N] - b[y * N + (x - 1 + N) % N], dy = b[((y + 1) % N) * N + x] - b[((y - 1 + N) % N) * N + x];
    const nx = -dx * 2.2, ny = -dy * 2.2, l = Math.hypot(nx, ny, 1), o = (y * N + x) * 4;
    im.data[o] = (nx / l * 0.5 + 0.5) * 255; im.data[o + 1] = (ny / l * 0.5 + 0.5) * 255; im.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[o + 3] = 255;
  }
  c.putImageData(im, 0, 0);
  GRAIN = new THREE.CanvasTexture(cv); GRAIN.wrapS = GRAIN.wrapT = THREE.RepeatWrapping; GRAIN.repeat.set(1 / 36, 1 / 36);
  return GRAIN;
}
/* satin anodized aluminium: the dye is in the metal, the surface is bead-blasted, and the machined
   chamfers are polished, so they catch thin bright lines in a lighter tint of the same colour */
export function satin(color, edge) {
  const m = new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: 0.36, normalMap: grain(), normalScale: new THREE.Vector2(0.08, 0.08) });
  const e = new THREE.Color(edge);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uEdge = { value: e };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uEdge;')
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      float cut = smoothstep(0.38, 0.5, abs(vNormal.z)) * (1.0 - smoothstep(0.74, 0.86, abs(vNormal.z)));
      roughnessFactor = mix(roughnessFactor, 0.1, cut);
      diffuseColor.rgb = mix(diffuseColor.rgb, uEdge, cut);`)
      /* the chamfer is polished, so the blasted grain stops there: a clean bright line, not a ragged one */
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      normal = normalize(mix(normal, nonPerturbedNormal, smoothstep(0.0, 0.5, cut)));
      /* real bead-blast grain is far finer than a pixel: up close it would show as blotches, so it smooths out */
      normal = normalize(mix(nonPerturbedNormal, normal, smoothstep(45.0, 220.0, length(vViewPosition))));`);
  };
  m.customProgramCacheKey = () => 'satin-cut3';
  return m;
}

/* ---------- stained glass: panes along the Mark's diagonal, held in lead ---------- */
function rand(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function leadedGlass(half) {
  const K = 4, W = VB.w * K, H = VB.h * K;
  const paneCv = document.createElement('canvas'), leadCv = document.createElement('canvas');
  paneCv.width = leadCv.width = W; paneCv.height = leadCv.height = H;
  const pc = paneCv.getContext('2d'), lc = leadCv.getContext('2d');
  const tints = half === 0 ? ['#fbeccc', '#f3d9a4', '#fff6e6', '#efcf8e', '#f8e3b8'] : ['#9fd48d', '#74b867', '#b6e0a8', '#63a65a', '#8cc57c'];
  const r = rand(half ? 7 : 3);
  /* bands along the Mark's 52.5 degree diagonal, cut across at uneven steps: each pane its own tint */
  const ang = -52.5 * DEG, ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
  const p = (s, t) => [(VB.w / 2 + ux * s + vx * t) * K, (VB.h / 2 + uy * s + vy * t) * K];
  const span = Math.hypot(VB.w, VB.h) * 0.75, band = 30, leads = [];
  pc.fillStyle = tints[0]; pc.fillRect(0, 0, W, H);
  for (let b = -span; b < span; b += band) {
    for (let a = -span; a < span;) {
      const len = 26 + r() * 46;
      pc.fillStyle = tints[Math.floor(r() * tints.length)]; pc.beginPath();
      [p(a, b), p(a + len, b), p(a + len, b + band), p(a, b + band)].forEach((q, i) => (i ? pc.lineTo(...q) : pc.moveTo(...q)));
      pc.closePath(); pc.fill();
      leads.push([p(a, b), p(a, b + band)]);          /* lead across the band */
      a += len;
    }
    leads.push([p(-span, b), p(span, b)]);              /* lead along it */
  }
  /* the same lead lines: dark in the colour map, white in the lead mask, black in the glass mask */
  const inv = document.createElement('canvas'); inv.width = W; inv.height = H; const ic = inv.getContext('2d');
  lc.fillStyle = '#000'; lc.fillRect(0, 0, W, H); ic.fillStyle = '#fff'; ic.fillRect(0, 0, W, H);
  [[pc, '#2b2927'], [lc, '#fff'], [ic, '#000']].forEach(([g, col]) => {
    g.strokeStyle = col; g.lineWidth = 2.0 * K; g.lineCap = 'round';
    leads.forEach(([a, b]) => { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); });
  });
  const make = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.flipY = false; t.repeat.set(1 / VB.w, 1 / VB.h); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { color: make(paneCv, true), glassMask: make(inv, false), leadMask: make(leadCv, false) };
}
/* hammered glass: a gentle uneven surface, as a normal map */
let HAMMER = null;
export function hammered() {
  if (HAMMER) return HAMMER;
  const N = 256, h = new Float32Array(N * N), r = rand(11);
  for (let i = 0; i < 90; i++) {
    const cx = r() * N, cy = r() * N, rad = 6 + r() * 18, amp = 0.5 + r();
    for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
      const d = Math.hypot(x, y) / rad; if (d > 1) continue;
      const px = (Math.floor(cx + x) + N) % N, py = (Math.floor(cy + y) + N) % N; h[py * N + px] += amp * (1 - d * d) * (1 - d * d);
    }
  }
  const cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d'), im = c.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = h[y * N + (x + 1) % N] - h[y * N + (x - 1 + N) % N], dy = h[((y + 1) % N) * N + x] - h[((y - 1 + N) % N) * N + x];
    const nx = -dx * 0.9, ny = -dy * 0.9, nz = 1, l = Math.hypot(nx, ny, nz), o = (y * N + x) * 4;
    im.data[o] = (nx / l * 0.5 + 0.5) * 255; im.data[o + 1] = (ny / l * 0.5 + 0.5) * 255; im.data[o + 2] = (nz / l * 0.5 + 0.5) * 255; im.data[o + 3] = 255;
  }
  c.putImageData(im, 0, 0);
  HAMMER = new THREE.CanvasTexture(cv); HAMMER.wrapS = HAMMER.wrapT = THREE.RepeatWrapping; HAMMER.repeat.set(1 / 120, 1 / 120);
  return HAMMER;
}

/* ---------- the materials. Each gives, per half, the body's [front and back, sides and edges] and the
   window pane's material when glass fills the window ---------- */
/* anodized aluminium: a dyed satin finish on the faces; the machined chamfer cut back to bright bare metal */
function anodized(color) {
  const m = new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: 0.42 });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      float cut = smoothstep(0.3, 0.45, abs(vNormal.z)) * (1.0 - smoothstep(0.82, 0.92, abs(vNormal.z)));
      roughnessFactor = mix(roughnessFactor, 0.07, cut);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.92, 0.90), cut * 0.85);`);
  };
  m.customProgramCacheKey = () => 'anodized-cut';
  return m;
}
function stainedPane(h) {
  const t = leadedGlass(h), n = hammered();
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: t.color, metalness: 1, metalnessMap: t.leadMask, roughness: 0.14,
    transmission: 1, transmissionMap: t.glassMask, thickness: 6, ior: 1.52, attenuationColor: h ? 0x6fae63 : 0xf0dcb0, attenuationDistance: h ? 120 : 260,
    normalMap: n, normalScale: new THREE.Vector2(0.22, 0.22), specularIntensity: 1 });
  glass.emissive = new THREE.Color(0xffffff); glass.emissiveMap = t.color; glass.emissiveIntensity = h ? 0.42 : 0.5;   /* daylight through the panes */
  return glass;
}
/* opal: a polished stone body under a clear surface, with play-of-colour inside it. Real opal is packed
   silica spheres; each patch diffracts one colour, and which colour depends on the angle you see it at.
   So the colour here is reflected light: a patch only flashes when its mirror angle finds one of the studio
   lights, and it shifts hue as the sign turns. The band of colours is held to green and blue (common in
   real opal, and our palette), with no full rainbow. */
function opal(o) {
  const m = new THREE.MeshPhysicalMaterial({ color: o.body, metalness: 0, roughness: o.rough, clearcoat: 1, clearcoatRoughness: 0.035,
    sheen: o.sheen || 0, sheenColor: new THREE.Color(o.sheenColor || 0x000000), sheenRoughness: 0.55, specularIntensity: 1 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFire = { value: o.fire }; sh.uniforms.uBand = { value: new THREE.Vector2(o.lo, o.hi) }; sh.uniforms.uCell = { value: o.cell || 6.5 };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOp; varying vec3 vN0; varying vec3 vN1; varying vec3 vN2;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOp = position; vN0 = normalMatrix[0]; vN1 = normalMatrix[1]; vN2 = normalMatrix[2];');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vOp; varying vec3 vN0; varying vec3 vN1; varying vec3 vN2;
      uniform float uFire; uniform vec2 uBand; uniform float uCell;
      vec3 opH(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
      vec3 opB(vec3 x, vec3 y) { return clamp(vec3(1.0) - x * x - y, 0.0, 1.0); }
      /* wavelength in nm to colour (a six-bump fit of the visible spectrum) */
      vec3 opSpec(float w) { float x = clamp((w - 400.0) / 300.0, 0.0, 1.0);
        return opB(vec3(3.54585104, 2.93225262, 2.41593945) * (x - vec3(0.69549072, 0.49228336, 0.27699880)), vec3(0.02312639, 0.15225084, 0.52607955))
             + opB(vec3(3.90307140, 3.21182957, 3.96587128) * (x - vec3(0.11748627, 0.86755042, 0.66077860)), vec3(0.84897130, 0.88445281, 0.73949448)); }`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      #ifdef USE_ENVMAP
      {
        /* which patch of ordered spheres this point sits in (a cellular pattern in the object's own space) */
        vec3 wp = vOp + 3.2 * sin(vOp.yzx * 0.13 + vec3(1.7, 4.1, 2.3)) + 1.6 * sin(vOp.zxy * 0.31);
        vec3 q = wp / uCell, iq = floor(q), fq = fract(q); float d1 = 9.0, d2 = 9.0; vec3 id = iq;
        for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
          vec3 g = vec3(float(x), float(y), float(z)), r = g + opH(iq + g) - fq; float d = dot(r, r);
          if (d < d1) { d2 = d1; d1 = d; id = iq + g; } else if (d < d2) d2 = d; }
        vec3 rnd = opH(id * 1.7 + 3.1), rn2 = opH(id * 2.9 + 11.0);
        /* each patch's lattice leans its own way; it turns with the object */
        vec3 tilt = (rnd - 0.5) * 1.25;
        vec3 lat = normalize(geometryNormal + vN0 * tilt.x + vN1 * tilt.y + vN2 * tilt.z);
        float c = clamp(dot(lat, geometryViewDir), 0.0, 1.0);
        /* Bragg: the colour moves toward blue as the angle opens; fine bands inside a patch roll with it */
        float lmax = mix(uBand.x, uBand.y, rn2.x);
        float w = lmax * (0.62 + 0.38 * c) + 18.0 * sin(dot(wp, normalize(rn2 - 0.5)) * 0.55 + rnd.z * 6.28);
        float inBand = smoothstep(415.0, 450.0, w) * (1.0 - smoothstep(600.0, 640.0, w));
        float seam = smoothstep(0.0, 0.3, sqrt(d2) - sqrt(d1));
        float live = smoothstep(0.35, 0.65, rnd.y);
        /* the flash: the studio light seen in that patch's mirror direction */
        vec3 lit = getIBLRadiance(geometryViewDir, lat, 0.12);
        reflectedLight.indirectSpecular += opSpec(w) * inBand * seam * min(lit, vec3(3.0)) * uFire * live * (0.5 + 0.5 * rn2.y);
      }
      #endif`);
  };
  m.customProgramCacheKey = () => 'opal';
  return m;
}
/* h: 0 is the agent's half (upper, cream), 1 your team's half (lower, sage) */
export const KINDS = {
  metal: { name: 'Polished metal', profile: 'pill', make: (h) => { const m = new THREE.MeshPhysicalMaterial(h ? { color: 0x86ad7c, metalness: 1, roughness: 0.2 } : { color: 0xe9e3d8, metalness: 1, roughness: 0.11 }); return { body: [m, m], pane: null }; } },
  anodized: { name: 'Anodized aluminum', profile: 'chamfer', make: (h) => { const m = anodized(h ? 0x6c9462 : 0xd9cdb6); return { body: [m, m], pane: null }; } },
  /* polished chrome with a thin-film coating, like a coated lens: the rainbow is light interfering in the
     coating, so it moves across the bevels as the object turns. Your team's half has a sage tint in the metal. */
  chrome: { name: 'Coated chrome', profile: 'pill', make: (h) => { const m = new THREE.MeshPhysicalMaterial({ color: h ? 0xb3d1a9 : 0xf4f1ec, metalness: 1, roughness: 0.06,
    iridescence: 0.42, iridescenceIOR: 1.3, iridescenceThicknessRange: [240, 700] });   /* mostly silver; the colour shows at the turns of the bevel */ return { body: [m, m], pane: null }; } },
  /* satin, in the low-key light: the agent's half a warm starlight, your team's half dyed merge violet (Nov 23) */
  satin: { name: 'Satin aluminum', profile: 'chamfer', look: 'lowkey', make: (h) => { const t = (typeof window !== 'undefined' && window.__ACC3D) || [0x7155ad, 0xd4c8fb]; const m = h ? satin(t[0], t[1]) : satin(0xd8cfbf, 0xfbf5ea); return { body: [m, m], pane: null }; } },
  /* the same, darker: graphite and a deep sage, the way dark phone finishes are shown */
  graphite: { name: 'Satin graphite', profile: 'chamfer', look: 'lowkey', make: (h) => { const m = h ? satin(0x3d5639, 0xa6c99a) : satin(0x56524c, 0xdcd6cc); return { body: [m, m], pane: null }; } },
  /* opal, cut smooth like a cabochon: the agent's half a white opal (milky, with a faint blue haze at the
     edges), your team's half a black opal (dark body, the brightest flashes) */
  opal: { name: 'Opal', profile: 'pill', make: (h) => { const m = h
    ? opal({ body: 0x0f1317, rough: 0.3, fire: 1.0, lo: 505, hi: 585, cell: 15 })
    : opal({ body: 0xe2dccf, rough: 0.36, sheen: 0.8, sheenColor: 0x9db6cf, fire: 0.42, lo: 480, hi: 600, cell: 15 }); return { body: [m, m], pane: null }; } },
  glass: { name: 'Glass', profile: 'pill', make: (h) => { const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 40, ior: 1.52, dispersion: 9,
    attenuationColor: h ? SAGE : 0xf2e9d8, attenuationDistance: h ? 46 : 260, specularIntensity: 1, envMapIntensity: 1.25 }); return { body: [m, m], pane: null }; } },
  stained: { name: 'Stained glass', profile: 'pill', make: (h, framed) => {
    const lead = new THREE.MeshPhysicalMaterial({ color: 0x3a3835, metalness: 1, roughness: 0.4 });
    /* as a window, the lead is the frame and the glass fills the opening; as a solid, the glass is the face */
    return framed ? { body: [lead, lead], pane: stainedPane(h) } : { body: [stainedPane(h), lead], pane: null };
  } }
};

/* for the shape check only: flat white, no light */
const FLAT = { profile: 'round', make: () => { const m = new THREE.MeshBasicMaterial({ color: 0xffffff }); return { body: [m, m], pane: null }; } };
export function kindOf(k) { return k === 'flat' ? FLAT : KINDS[k]; }

/* ---------- a stage: one canvas, the Mark at a spot on it, a backdrop the glass can see ---------- */
export async function stage(canvas, opts) {
  const frame = opts.frame || 0, GEO = {};
  async function geosFor(profile) { const key = frame ? profile : 'round'; return GEO[key] || (GEO[key] = await markGeometry({ frame, profile: frame ? profile : 'round' })); }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.environment = studio(renderer);
  const camera = new THREE.PerspectiveCamera(22, 1, 10, 40000);
  const group = new THREE.Group(), meshes = [0, 1].map(() => new THREE.Mesh()), panes = [0, 1].map(() => new THREE.Mesh());
  meshes.concat(panes).forEach((m) => group.add(m)); scene.add(group);

  /* the backdrop: an image the size of the view, far enough behind for refraction to shift it */
  const ZB = 700, back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }));
  back.position.z = -ZB; scene.add(back);
  if (opts.backdrop) { const tx = await new THREE.TextureLoader().loadAsync(opts.backdrop); tx.colorSpace = THREE.SRGBColorSpace; back.material.map = tx; back.material.needsUpdate = true; }
  else back.material.color = new THREE.Color(0x151311);
  if (opts.wall) { back.material.map = opts.wall(); back.material.color = new THREE.Color(0xffffff); back.material.needsUpdate = true; }

  let W = 0, H = 0, dist = 0, kind = null;
  function layout() {
    W = canvas.clientWidth; H = canvas.clientHeight; renderer.setSize(W, H, false);
    camera.aspect = W / H; dist = H / (2 * Math.tan(camera.fov * DEG / 2)); camera.position.set(0, 0, dist); camera.updateProjectionMatrix();
    const f = (dist + ZB) / dist; back.scale.set(W * f, H * f, 1);
    const at = opts.at(W, H); group.position.set(at.x - W / 2, H / 2 - at.y, 0); group.scale.setScalar(at.h / VB.h);
    kick();
  }
  async function setKind(k) {
    kind = k; const K = kindOf(k), geos = await geosFor(K.profile);
    meshes.forEach((m, h) => {
      const mats = K.make(h, !!frame); m.geometry = geos[h].body; m.material = mats.body;
      panes[h].visible = !!(mats.pane && geos[h].pane); if (panes[h].visible) { panes[h].geometry = geos[h].pane; panes[h].material = mats.pane; }
    });
    kick();
  }

  /* motion: tilt toward the pointer, drag to turn; both on a spring, settling with a little give */
  const rest = { x: 0.07, y: -0.24 }, s = { x: rest.x, y: rest.y, vx: 0, vy: 0 }, aim = { x: rest.x, y: rest.y }, drag = { on: false, x: 0, y: 0, ox: 0, oy: 0 };
  let raf = 0, last = 0;
  function centre() { const r = canvas.getBoundingClientRect(), at = opts.at(W, H); return { x: r.left + at.x, y: r.top + at.y }; }
  function onMove(e) {
    if (reduce) return;
    if (drag.on) { drag.oy = (e.clientX - drag.x) * 0.012; drag.ox = (e.clientY - drag.y) * 0.008; }
    else { const c = centre(); aim.y = rest.y + Math.max(-1, Math.min(1, (e.clientX - c.x) / (window.innerWidth * 0.5))) * 0.42; aim.x = rest.x + Math.max(-1, Math.min(1, (e.clientY - c.y) / (window.innerHeight * 0.5))) * 0.26; }
    kick();
  }
  canvas.addEventListener('pointerdown', (e) => { if (reduce) return; drag.on = true; drag.x = e.clientX; drag.y = e.clientY; drag.ox = drag.oy = 0; canvas.setPointerCapture(e.pointerId); });
  const release = () => { if (!drag.on) return; drag.on = false; drag.ox = drag.oy = 0; kick(); };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  window.addEventListener('pointermove', onMove, { passive: true });

  function step(now) {
    raf = 0; const dt = Math.min(0.034, (now - (last || now)) / 1000 || 0.016); last = now;
    const tx = aim.x + drag.ox, ty = aim.y + drag.oy, k = drag.on ? 260 : 70, c = drag.on ? 30 : 11;
    s.vx += (k * (tx - s.x) - c * s.vx) * dt; s.vy += (k * (ty - s.y) - c * s.vy) * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    group.rotation.set(s.x, s.y, 0);
    renderer.render(scene, camera);
    if (Math.abs(s.vx) + Math.abs(s.vy) > 1e-4 || Math.abs(tx - s.x) + Math.abs(ty - s.y) > 1e-4 || drag.on) raf = requestAnimationFrame(step); else last = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(step); }
  function pose(x, y) { aim.x = s.x = x; aim.y = s.y = y; s.vx = s.vy = 0; group.rotation.set(x, y, 0); renderer.render(scene, camera); }

  window.addEventListener('resize', layout);
  await setKind(opts.kind || 'metal'); layout(); group.rotation.set(s.x, s.y, 0); renderer.render(scene, camera);
  return { setKind, pose, render: () => renderer.render(scene, camera), get kind() { return kind; }, renderer };
}

/* the first screen's wall: dark, with the soft warm light a key light would leave on it */
export function wallTexture(xFrac) {
  return () => {
    const cv = document.createElement('canvas'); cv.width = 1440; cv.height = 900; const g = cv.getContext('2d');
    g.fillStyle = '#151311'; g.fillRect(0, 0, 1440, 900);
    const r = g.createRadialGradient(1440 * xFrac, 420, 0, 1440 * xFrac, 420, 620);
    r.addColorStop(0, 'rgba(118,104,86,0.7)'); r.addColorStop(0.45, 'rgba(56,49,41,0.45)'); r.addColorStop(1, 'rgba(21,19,17,0)');
    g.fillStyle = r; g.fillRect(0, 0, 1440, 900);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
}
