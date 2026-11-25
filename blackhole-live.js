/* Black hole, live (Nov 23): still J1 in motion. The hole is the bar; there is no Mark inside it.
   - The disc turns (Keplerian: faster inside). Two copies of its pattern, each reset on a period and cross-faded,
     so the shear never winds the streaks to mush.
   - The light-bending pass renders into a smaller target (adaptive scale) and is scaled up with a light sharpen.
   - Agents ride the disc as small planets, on the same Keplerian law, with their labels.
   - A case spirals in from an agent to the inner edge. A miss crosses into the shadow and is gone.
     A win turns green, slingshots round the hole (over the top, behind it) and goes home; its agent lights green.
   - Agents and beads are drawn on top of the black hole pass, so they are lensed in JS (thin lens) and all stay
     above the disc plane (y > 0): a point above the disc is never behind the near disc, so no depth is needed.
   Lab only. ?t=<s> starts the clock there, ?still shows one frame, ?phone=1 forces the light path.
   window.__bh: seek(t), force(agent, win), scale, fps. */
import * as THREE from 'three';
/* the studio environment is rebuilt here with the disc in it (discEnv), so material.js is not needed */

/* in the homepage dive (Nov 24): the dive hands over its stage, the canvas and the headline, and drives the camera each frame.
   No URL options there, no own loop, no Space key, the warm disc. */
const EMB = window.__BH_EMBED || null;
const Q = new URLSearchParams(EMB ? '' : location.search);
/* a tab or frame opened in the background can start at 0 x 0: wait for a real size before choosing the phone or desktop path */
if (!innerWidth || !innerHeight) await new Promise((res) => { const f = () => { if (innerWidth && innerHeight) { removeEventListener('resize', f); res(); } }; addEventListener('resize', f); });
const root = document.documentElement, stage = EMB ? EMB.stage : document.querySelector('.st'), canvas = EMB ? EMB.canvas : stage.querySelector('canvas'), head = EMB ? EMB.head : stage.querySelector('h2');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || Q.has('still');
const phone = Q.get('phone') === '1' || (Q.get('phone') !== '0' && (Math.min(innerWidth, innerHeight) < 600 || matchMedia('(pointer: coarse)').matches));

const RS = 60, RIN = 2.7, ROUT = 14.0;                       /* Schwarzschild radius in world units; the disc runs 2.7 to 14 of it */
const SPIN = 0.25 * Math.pow(RIN, 1.5);                        /* angular speed = SPIN * r^-1.5 (r in RS): a turn in 25 s at the inner edge */
const TAU = Math.PI * 2;

let W = EMB ? stage.clientWidth : innerWidth, H = EMB ? stage.clientHeight : innerHeight;
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: !!EMB, powerPreference: 'high-performance' }); if (EMB) renderer.setClearColor(0x000000, 0); }
catch (e) { root.classList.add('no-gl'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NeutralToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
/* what metal here reflects: the low-key studio (one soft light overhead, thin rims), plus the disc itself as a glowing floor
   all round, hot inside and dimmer out. So orbs carry a bright band of disc, and standing letters catch it on their lower edges. */
let envTex = null; const DISC_IN_ENV = false;   /* the disc in the reflections suited the metal names (dropped); orbs read better dark */
function discEnv(d) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.BackSide })));
  const soft = (w, h, k, pos) => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
    const rg = g.createRadialGradient(64, 64, 2, 64, 64, 66); rg.addColorStop(0, '#fff'); rg.addColorStop(0.3, '#bdbdbd'); rg.addColorStop(1, '#000'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), color: new THREE.Color(0xfff8f0).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m); };
  const strip = (w, h, k, pos) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf6f8ff).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); env.add(m); };
  soft(76, 50, 5.0, [0, 46, 6]); soft(64, 44, 1.2, [-10, 8, 46]); strip(70, 1.8, 12.0, [0, 22, -40]); strip(1.8, 50, 8.0, [44, 4, -16]); strip(1.4, 40, 3.0, [-44, 0, -20]);
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 128; const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
  const hot = new THREE.Color(...d.hot), warm = new THREE.Color(...d.warm);
  gr.addColorStop(0, '#000'); gr.addColorStop(0.08, '#' + hot.getHexString()); gr.addColorStop(0.35, '#' + warm.clone().lerp(hot, 0.5).getHexString()); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(cv); t.flipY = false;
  const disc = new THREE.Mesh(ringGeometry(10, 58, 96), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1, 1, 1).multiplyScalar(1.7), side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = -7; if (DISC_IN_ENV) env.add(disc);
  const pm = new THREE.PMREMGenerator(renderer), tex = pm.fromScene(env, 0.02).texture; pm.dispose();
  env.traverse((o) => { if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } if (o.geometry) o.geometry.dispose(); });
  return tex;
}
const camera = new THREE.PerspectiveCamera(30, W / H, 1, 40000);
const toHole = new THREE.Vector3(); let Dl = 1500, thSh = 0.1, pxPerRad = 1000;

/* ---------- the black hole pass ---------- */
const MAXSTEP = phone ? 260 : 320, STEP = phone ? 0.042 : 0.035;
const bhMat = new THREE.ShaderMaterial({
  depthWrite: false, depthTest: false, toneMapped: false,
  uniforms: { uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() },
    uRs: { value: RS }, uRin: { value: RIN }, uRout: { value: ROUT }, uTime: { value: 0 }, uSpin: { value: SPIN }, uStep: { value: STEP }, uGrain: { value: 0 },
    uWarm: { value: new THREE.Vector3() }, uHot: { value: new THREE.Vector3() }, uEmbed: { value: EMB ? 1 : 0 } },
  vertexShader: `varying vec2 vP; void main() { vP = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    precision highp float;
    #define MAXSTEP ${MAXSTEP}
    varying vec2 vP;
    uniform mat4 uInvProj, uCamWorld; uniform vec3 uCam, uWarm, uHot; uniform float uRs, uRin, uRout, uTime, uSpin, uStep, uGrain, uEmbed;
    const float BC = 2.5980762;                                  /* critical impact parameter: rays closer than this fall in */
    /* hash without sine (stable on phone GPUs at large inputs) */
    float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    /* noise that wraps round the disc: the angle axis repeats every per cells, so there is no seam */
    float hash3(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
    float hashP(vec2 i, float per) { i.y = mod(i.y, per); return hash(i); }
    float noiseP(vec2 p, float per) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hashP(i, per), hashP(i + vec2(1.0, 0.0), per), f.x), mix(hashP(i + vec2(0.0, 1.0), per), hashP(i + vec2(1.0, 1.0), per), f.x), f.y); }
    float fbm4(vec2 p, float per) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * noiseP(p, per); p = vec2(p.x * 2.03 + 17.0, p.y * 2.0); per *= 2.0; a *= 0.5; } return s / 0.9375; }
    float fbm3(vec2 p, float per) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * noiseP(p, per); p = vec2(p.x * 2.03 + 17.0, p.y * 2.0); per *= 2.0; a *= 0.5; } return s / 0.875; }
    /* one copy of the gas pattern: coarse clumps, finer streaks along the orbit, a fine grain (only when the pass is sharp enough) */
    vec2 gas(float r, float turns, float seed) {
      float clump = fbm4(vec2(r * 3.2 + seed, turns * 19.0), 19.0);
      float streak = fbm3(vec2(r * 14.0 + seed * 1.7, turns * 56.0), 56.0);
      float grain = mix(0.5, noiseP(vec2(r * 70.0 + seed, turns * 880.0), 880.0), uGrain);
      return vec2(0.55 * clump + 0.35 * streak + 0.25 * grain - 0.05, clump);
    }
    vec4 disc(vec3 p, vec3 dir) {
      float r = length(p.xz); if (r < uRin || r > uRout) return vec4(0.0);
      float ph = atan(p.z, p.x);
      /* the gas moves with the orbit, whose angle decreases with time: the pattern is sampled at ph + w t.
         Two copies, each restarting every T seconds, half a period apart, cross-faded (contrast kept). */
      float w = uSpin * pow(r, -1.5), T = 14.0;
      float f1 = fract(uTime / T), f2 = fract(uTime / T + 0.5);
      float w1 = 1.0 - abs(2.0 * f1 - 1.0), w2 = 1.0 - w1;
      float base = ph + 0.9 * log(r);
      /* each copy takes a new pattern each time it restarts (while it is faded out), so the gas never repeats */
      float s1 = 13.1 * mod(floor(uTime / T), 97.0), s2 = 31.7 + 13.1 * mod(floor(uTime / T + 0.5), 97.0);
      vec2 g1 = gas(r, (base + w * f1 * T) / 6.2831853, s1);
      vec2 g2 = gas(r, (base + w * f2 * T) / 6.2831853, s2);
      float k = 1.0 / sqrt(w1 * w1 + w2 * w2);
      vec2 g = vec2(0.55, 0.5) + (g1 * w1 + g2 * w2 - vec2(0.55, 0.5)) * k;
      float band = clamp(g.x, 0.0, 1.2), clump = g.y;
      float lanes = 0.9 + 0.1 * sin(r * 5.0 + clump * 6.0);
      float fade = smoothstep(uRin, uRin * 1.12, r) * (1.0 - smoothstep(uRout * 0.55, uRout, r));
      float temp = pow(uRin / r, 1.25);
      vec3 vel = normalize(vec3(p.z, 0.0, -p.x));             /* orbit direction */
      float v = sqrt(0.5 / r), gm = 1.0 / sqrt(1.0 - v * v);
      float cosT = dot(vel, -normalize(dir));
      float D = 1.0 / (gm * (1.0 - v * cosT));                 /* Doppler: the side coming toward you is brighter and whiter */
      float I = temp * pow(D, 3.0) * (0.25 + 1.25 * band) * lanes * 2.1;
      vec3 c = mix(uWarm, uHot, clamp(temp * 1.2 * D - 0.15, 0.0, 1.0)) * I;
      float a = clamp(fade * (0.35 + 0.9 * band) * (0.7 + 0.5 * temp), 0.0, 0.97);
      return vec4(c, a);
    }
    void main() {
      vec4 q = uInvProj * vec4(vP, 1.0, 1.0); q /= q.w;
      vec3 rd = normalize((uCamWorld * vec4(q.xyz, 0.0)).xyz);
      vec3 pos = uCam / uRs, vel = rd;
      vec3 col = vec3(0.0); float al = 0.0; bool fell = false, out_ = false;
      /* the shadow is decided by the impact parameter, not by running out of steps, and its edge is smoothed over one pixel */
      float h2 = dot(cross(pos, vel), cross(pos, vel)), bimp = sqrt(h2);
      float fw = max(fwidth(bimp), 1e-4), cov = smoothstep(BC - fw, BC + fw, bimp);
      /* straight to a sphere just outside the disc: the bending before it is small */
      float R0 = uRout + 6.0, b = dot(pos, vel), c = dot(pos, pos) - R0 * R0, dd = b * b - c;
      if (c > 0.0) { if (dd < 0.0 || b > 0.0) out_ = true; else pos += vel * (-b - sqrt(dd)); }
      int hits = 0; bool done = false;
      if (!out_) {
        for (int i = 0; i < MAXSTEP; i++) {
          float r = length(pos);
          float dt = clamp(uStep * r * r / (r + 2.0), 0.012, 1.6);
          float r2 = r * r;
          vec3 acc = -1.5 * h2 * pos / (r2 * r2 * r);
          vec3 nv = vel + acc * dt, np = pos + nv * dt;
          if (pos.y * np.y < 0.0) {
            float t = pos.y / (pos.y - np.y); vec3 hp = mix(pos, np, t);
            vec4 d = disc(hp, nv);
            if (hits > 0) d *= smoothstep(2.0 * fw, 8.0 * fw, bimp - BC);   /* the second image thins to under a pixel at the edge: leave that to the smooth ring */
            if (d.a > 0.0) { col += (1.0 - al) * d.rgb * d.a; al += (1.0 - al) * d.a; }
            hits++;
            if (hits >= 2) { done = true; break; }              /* later images are the photon ring, drawn smoothly below */
          }
          pos = np; vel = nv;
          if (dot(pos, pos) < 1.0) { fell = true; break; }
          if (r > uRout + 0.5 && dot(pos, vel) > 0.0) { out_ = true; break; }   /* moving out past the disc: it cannot come back */
          if (al > 0.985) break;
        }
        fell = bimp < BC;                                     /* the impact parameter decides, not the stepper (coarse steps on phones misjudge rays at the edge) */
      }
      vec3 bg = vec3(0.082, 0.074, 0.067); float bgA = 1.0, shadowA = 0.0;
      if (uEmbed > 0.5) { bg = vec3(0.0); bgA = 0.0; shadowA = 1.0 - cov; }   /* in the dive: its own sky shows round the hole */
      else if (!fell) { vec3 d = normalize(vel) * 260.0, id = floor(d), f = fract(d) - 0.5;
        float s = step(0.9975, hash3(id)) * smoothstep(0.32, 0.0, length(f)); bg += vec3(0.55, 0.53, 0.5) * s * (0.35 + 0.65 * hash3(id.zxy + 7.0)); }
      bg *= cov;
      /* the photon ring: a thin smooth line just outside the shadow, brighter on the side coming toward you */
      vec3 toH = -normalize(uCam), pp = rd - dot(rd, toH) * toH;
      float left = -pp.x / (length(pp) + 1e-5);
      float ring = cov * exp(-max(bimp - BC, 0.0) / max(fw * 0.7, 0.003)) * (0.6 + 0.35 * left);   /* about one pixel wide: a line, not a haze */
      bg += uHot * ring * 0.95;
      vec3 outc = col + (1.0 - al) * bg;
      outc = outc / (1.0 + 0.35 * outc);                       /* a gentle shoulder: the hottest part stays tight, no bloom */
      float outA = al + (1.0 - al) * clamp(bgA + shadowA + ring * 0.95, 0.0, 1.0);
      gl_FragColor = vec4(pow(outc, vec3(1.0 / 1.05)), outA);
    }`,
});
const bhScene = new THREE.Scene(), quadGeo = new THREE.PlaneGeometry(2, 2);
const bhQuad = new THREE.Mesh(quadGeo, bhMat); bhQuad.frustumCulled = false; bhScene.add(bhQuad);
const rt = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, generateMipmaps: false });
/* the pass, scaled up to the screen with a light sharpen, behind everything else */
const compMat = new THREE.ShaderMaterial({
  depthWrite: false, depthTest: false, toneMapped: false, transparent: true, premultipliedAlpha: true,
  uniforms: { tBH: { value: rt.texture }, uTexel: { value: new THREE.Vector2() }, uSharp: { value: 0.18 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D tBH; uniform vec2 uTexel; uniform float uSharp;
    void main() { vec4 c4 = texture2D(tBH, vUv); vec3 c = c4.rgb;
      vec3 n = texture2D(tBH, vUv + vec2(uTexel.x, 0.0)).rgb + texture2D(tBH, vUv - vec2(uTexel.x, 0.0)).rgb + texture2D(tBH, vUv + vec2(0.0, uTexel.y)).rgb + texture2D(tBH, vUv - vec2(0.0, uTexel.y)).rgb;
      gl_FragColor = vec4(max(c + uSharp * (4.0 * c - n), 0.0), c4.a); }`,
});
const comp = new THREE.Mesh(quadGeo, compMat); comp.frustumCulled = false;
const compScene = new THREE.Scene(); compScene.add(comp);   /* its own pass, drawn before the orbs: a transparent quad in the main scene would be drawn after them, over them (Nov 24 bug) */

const SCALE_MAX = phone ? 0.9 : 1.0, SCALE_MIN = phone ? 0.4 : 0.45;
let bhScale = +(Q.get('scale') || SCALE_MAX);
function sizeRT() {
  const w = Math.max(64, Math.round(W * bhScale)), h = Math.max(64, Math.round(H * bhScale));
  rt.setSize(w, h); compMat.uniforms.uTexel.value.set(1 / w, 1 / h); compMat.uniforms.uSharp.value = bhScale >= 0.95 ? 0.08 : 0.18;
  bhMat.uniforms.uGrain.value = THREE.MathUtils.clamp((bhScale - 0.7) / 0.3, 0, 1) * 0.6;   /* fine grain only when the pass is sharp enough not to crawl */
}

/* ---------- framing: the desktop still's camera; portrait gets its own, the hole centred and the disc across the width ---------- */
const dolly = { r: 1, open: 1 };                      /* r: how many times farther than the final framing; open: 0 down the tunnel, 1 settled */
function frame() {
  const asp = W / H, o = THREE.MathUtils.smoothstep(dolly.open, 0, 1);
  if (asp >= 1.2) {
    const EL = 7.5 * Math.PI / 180, DIST = 1500 * dolly.r;
    camera.fov = 30; camera.position.set(0, Math.sin(EL) * DIST, Math.cos(EL) * DIST); camera.up.set(0, 1, 0); camera.lookAt(-330 * Math.min(1, (asp - 1) / 0.6) * o, 30 * o, 0);
  } else {
    const EL = 15 * Math.PI / 180, fov = 34, hf = 2 * Math.atan(Math.tan(fov * Math.PI / 360) * asp);
    const DIST = 380 / Math.tan(hf / 2) * dolly.r;          /* about 760 world units across at the hole: the disc runs off both sides */
    camera.fov = fov; camera.position.set(0, Math.sin(EL) * DIST, Math.cos(EL) * DIST); camera.up.set(0, 1, 0); camera.lookAt(-20 * o, 150 * o, 0);
  }
  camera.aspect = asp; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  bhMat.uniforms.uInvProj.value.copy(camera.projectionMatrixInverse); bhMat.uniforms.uCamWorld.value.copy(camera.matrixWorld); bhMat.uniforms.uCam.value.copy(camera.position);
  Dl = camera.position.length(); toHole.copy(camera.position).multiplyScalar(-1 / Dl);
  thSh = 2.598 * RS / Dl; pxPerRad = (H / 2) / Math.tan(camera.fov * Math.PI / 360);
}

/* ---------- thin lens for what we draw on top: a point behind the hole is seen pushed out from it ---------- */
const _d = new THREE.Vector3(), _p = new THREE.Vector3(), _u = new THREE.Vector3();
function lens(P, out) {                                         /* returns the magnification; out = where it is seen, at its true distance */
  _d.subVectors(P, camera.position); const dist = _d.length(), Ds = _d.dot(toHole), Dls = Ds - Dl;
  out.copy(P); if (Dls <= 0 || Ds <= 0) return 1;
  _p.copy(_d).addScaledVector(toHole, -Ds); let pl = _p.length();
  if (pl < 1e-4) { _p.set(0, 1, 0).addScaledVector(toHole, -toHole.y); pl = 1e-4; }
  _p.multiplyScalar(1 / pl);
  const beta = pl / Ds, tE2 = 2 * RS * Dls / (Dl * Ds);
  let th = 0.5 * (beta + Math.sqrt(beta * beta + 4 * tE2));
  th = THREE.MathUtils.lerp(th, Math.max(th, thSh * 1.06), THREE.MathUtils.smoothstep(Dls, 0, 60));   /* never inside the shadow from behind */
  _u.copy(toHole).addScaledVector(_p, th).normalize();
  out.copy(camera.position).addScaledVector(_u, dist);
  const u = beta / Math.sqrt(tE2);
  return Math.min(1.7, (u * u + 2) / (2 * u * Math.sqrt(u * u + 4)) + 0.5);
}
const _s = new THREE.Vector3();
function toScreen(P, o) { _s.copy(P).project(camera); o.x = (_s.x * 0.5 + 0.5) * W; o.y = (-_s.y * 0.5 + 0.5) * H; o.z = _s.z; return o; }

/* ---------- light from the disc onto our objects: warm points round it, brighter on the side coming toward you ---------- */
const NL = phone ? 6 : 10, discLights = [], LIGHT_K = 6;   /* the disc lights the orbs and the case beads */   /* diffuse planets need more of the disc's light than mirrors did */
for (let k = 0; k < NL; k++) {
  const a = (k / NL) * TAU, r = RS * 4.2, toward = 0.5 + 0.5 * Math.cos(a - Math.PI);
  const l = new THREE.PointLight(0xffd9b0, 26000 * LIGHT_K * (0.35 + toward) * (10 / NL), 0, 2); l.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); scene.add(l); discLights.push(l);
}
/* the outer disc glows too, more faintly: it lights the far side of the orbs and the edges of names out on the disc */
const NO = 0;   /* the outer-disc lights were for the metal names; without them the orbs keep their contrast */
for (let k = 0; k < NO; k++) {
  const a = ((k + 0.5) / NO) * TAU, r = phone ? 420 : 560, toward = 0.5 + 0.5 * Math.cos(a - Math.PI);
  const l = new THREE.PointLight(0xffd9b0, 30000 * (0.3 + toward) * (6 / NO), 0, 2); l.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); scene.add(l); discLights.push(l);
}
/* the win light: a green point that travels with each win bead (a fixed pool, so no shader recompiles) */
const winLights = [0, 1].map(() => { const l = new THREE.PointLight(0x8ddb85, 0, 0, 2); scene.add(l); return { l, busy: false }; });

/* ---------- agents: small planets on the disc, inner ones faster, as the gas.
   Three groups, each evenly spread round the ring and turning together at 1, 2 or 3 times a base rate (close to Kepler at their radii),
   so the left side never empties and the whole picture repeats every 6 minutes. ---------- */
const W0 = TAU / 360;
/* how the names are shown (Nov 24 stills): pill = today's text boxes; type = satin letters standing by each orb;
   ring = each orb's name as a ring of letters round it; line = type on a 52.5 degree hairline, no box */
const NAMES = ['pill', 'type', 'ring', 'line', 'combo', 'sym', 'act', 'symact'].find((k) => k === (window.__BH_NAMES || Q.get('names'))) || 'symact';   /* default: Rohan's pick, Nov 24 */
/* Nov 24, later: sym = a symbol cut into each orb, name and one line on hover; act = a name shows only while its agent acts; symact = both */
const SYMS = NAMES === 'sym' || NAMES === 'symact', ACTS = NAMES === 'act' || NAMES === 'symact';   /* type = A, line = C (Nov 24, shown as separate pages); combo = both, lab only */
const TYPED = NAMES === 'type' || NAMES === 'combo', LEADS = NAMES === 'line' || NAMES === 'combo';   /* the preview drops query strings: variant pages set window.__BH_NAMES */
const GROUPS = phone ? [   /* [turns per period, first angle, [radius, height, name, size]...] */
  [3, 1.75, [[300, 5, 'Customer support', 11], [280, 5, 'Code review', 9]]],
  [2, 1.95, [[360, 7, 'Refunds', 10], [345, 7, 'Returns', 9.5], [375, 8, 'Claims', 10]]],
  [1, 2.45, [[440, 10, 'Sales qualification', 10], [420, 9, 'Billing questions', 9.5], [455, 11, 'Booking', 10.5]]],
] : [   /* all inside the visible gas (the disc fades out past about 700), low over it, so none looks detached */
  [3, 1.75, [[430, 6, 'Customer support', 12.5], [400, 5, 'Refunds', 10.5], [450, 6, 'Code review', 10], [415, 5, 'Billing questions', 11]]],
  [2, 1.95, [[540, 8, 'Returns', 12], [520, 8, 'Claims', 10.5], [565, 9, 'Sales qualification', 11.5], [530, 8, 'Incident triage', 11]]],
  [1, 2.4, [[660, 12, 'Booking', 11], [640, 10, 'Onboarding', 12], [690, 14, 'Order tracking', 12.5], [650, 11, 'IT helpdesk', 11.5]]],
];
const JIT = [0.12, -0.15, 0.08, -0.1, 0.17];
const AG = GROUPS.flatMap(([k, a0, list]) => list.map(([r, y, name, size], j) => [r, a0 + j * TAU / list.length + JIT[j], y, name, size * (SYMS ? (phone ? 1.9 : 1.3) : 1), k]));
const agentGeo = new THREE.SphereGeometry(1, phone ? 32 : 48, phone ? 20 : 32);
/* ---------- symbols cut into the orbs: one per kind of agent, drawn in strokes, round caps, the Mark's 52.5 degree lean where it fits ---------- */
const SYMBOL = {
  'Customer support': (d) => { d.rrect(-32, -8, 64, 42, 14); d.line([[-16, -8], [-26, -30], [4, -8]]); },
  'Refunds': (d) => { d.arc(0, 0, 30, 0.9, 6.0); const e = 6.0, tx = 30 * Math.cos(e), ty = 30 * Math.sin(e), dx = -Math.sin(e), dy = Math.cos(e);
    d.line([[tx - dx * 13 + dy * 10, ty - dy * 13 - dx * 10], [tx, ty], [tx - dx * 13 - dy * 10, ty - dy * 13 + dx * 10]]); },
  'Returns': (d) => { d.rrect(-28, -34, 56, 44, 6); d.line([[14, 26], [-16, 26]]); d.line([[-6, 35], [-16, 26], [-6, 17]]); },
  'Claims': (d) => { d.line([[0, 36], [-30, 26], [-28, -4], [0, -36], [28, -4], [30, 26], [0, 36]]); d.line([[-12, 0], [-3, -10], [14, 12]]); },
  'Code review': (d) => { d.line([[-18, 22], [-38, 0], [-18, -22]]); d.line([[18, 22], [38, 0], [18, -22]]); d.line([[-12, -16], [12, 16]]); },
  'Billing questions': (d) => { d.line([[-22, 36], [22, 36], [22, -30], [14, -36], [7, -30], [0, -36], [-7, -30], [-14, -36], [-22, -30], [-22, 36]]); d.line([[-11, 18], [11, 18]]); d.line([[-11, 4], [11, 4]]); d.line([[-11, -10], [3, -10]]); },
  'Sales qualification': (d) => { d.line([[-34, 30], [34, 30], [8, -2], [8, -32], [-8, -24], [-8, -2], [-34, 30]]); },
  'Incident triage': (d) => { d.line([[8, 38], [-16, 2], [2, 2], [-8, -38], [18, 0], [0, 0], [8, 38]]); },
  'Booking': (d) => { d.rrect(-30, -32, 60, 58, 8); d.line([[-30, 10], [30, 10]]); d.line([[-14, 36], [-14, 20]]); d.line([[14, 36], [14, 20]]); d.line([[-12, -10], [-2, -19], [14, -2]]); },
  'Onboarding': (d) => { d.line([[8, 32], [30, 32], [30, -32], [8, -32]]); d.line([[-36, 0], [14, 0]]); d.line([[2, 12], [14, 0], [2, -12]]); },
  'Order tracking': (d) => { d.arc(0, 12, 22, -0.55, Math.PI + 0.55); d.line([[-18.8, 0.6], [0, -36], [18.8, 0.6]]); d.arc(0, 12, 6, 0, TAU); },
  'IT helpdesk': (d) => { d.rrect(-34, -10, 68, 46, 6); d.line([[0, -10], [0, -26]]); d.line([[-16, -28], [16, -28]]); },
};
function symbolTexture(name) {
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, N, N); g.strokeStyle = '#fff'; g.lineWidth = 17; g.lineCap = 'round'; g.lineJoin = 'round';
  const X = (x) => N / 2 + x * 1.45, Y = (y) => N / 2 - y * 1.45;
  const d = {
    line: (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); },
    arc: (cx, cy, rr, a0, a1) => { g.beginPath(); g.arc(X(cx), Y(cy), rr * 1.45, -a1, -a0); g.stroke(); },
    rrect: (x, y, w, h, rr) => { g.beginPath(); g.roundRect(X(x), Y(y + h), w * 1.45, h * 1.45, rr * 1.45); g.stroke(); },
  };
  (SYMBOL[name] || ((q) => q.arc(0, 0, 24, 0, TAU)))(d);
  const im = g.getImageData(0, 0, N, N), a = new Float32Array(N * N);   /* soften the walls of the cut */
  for (let i = 0; i < N * N; i++) a[i] = im.data[i * 4] / 255;
  blurBox(a, N, N, 2); blurBox(a, N, N, 2);
  for (let i = 0; i < N * N; i++) { const v = Math.min(255, a[i] * 255); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; return t;
}
/* the cut faces you whichever way the orb turns: projected from the view onto the sphere; darker and rougher in the groove, its walls catch the light */
function engrave(mat, tex, U) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSym = { value: tex }; sh.uniforms.uSymC = U.uC; sh.uniforms.uSymR = U.uR;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uSym; uniform vec3 uSymC; uniform float uSymR;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 symUv = (-vViewPosition.xy - uSymC.xy) / uSymR * 0.5 + 0.5;
        float symFace = smoothstep(0.35, 0.75, normalize(vNormal).z);
        float symM = texture2D(uSym, symUv).r * symFace;
        diffuseColor.rgb *= 1.0 - 0.62 * symM;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.62, symM);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float e = 2.0 / 256.0;
          float gx = texture2D(uSym, symUv + vec2(e, 0.0)).r - texture2D(uSym, symUv - vec2(e, 0.0)).r;
          float gy = texture2D(uSym, symUv + vec2(0.0, e)).r - texture2D(uSym, symUv - vec2(0.0, e)).r;
          normal = normalize(normal + vec3(gx, gy, 0.0) * 1.7 * symFace); }`);
  };
  mat.customProgramCacheKey = () => 'engrave-1';
}
const BASE = new THREE.Color(0xe6ded1), LIT = new THREE.Color(0x86b878);
const agents = AG.map(([r, a0, y, name, size, k], i) => {
  /* polished metal (Nov 25, Rohan: keep the metallic orbs we liked): metalness 0.8 and roughness 0.3 as before Nov 24,
     lit by the same disc lights, so the side toward the hole catches the disc and the far side falls dark */
  const mat = phone ? new THREE.MeshStandardMaterial({ color: BASE, metalness: 0.8, roughness: 0.3 })
    : new THREE.MeshPhysicalMaterial({ color: BASE, metalness: 0.8, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.12 });
  const m = new THREE.Mesh(agentGeo, mat); scene.add(m);
  let symU = null; if (SYMS) { symU = { uC: { value: new THREE.Vector3() }, uR: { value: 1 } }; engrave(mat, symbolTexture(name), symU); }
  let ro = null; if (ACTS) { ro = document.createElement('span'); ro.className = 'ro'; ro.setAttribute('aria-hidden', 'true'); ro.innerHTML = '<b></b><i></i>'; ro.firstChild.textContent = name; stage.appendChild(ro); }
  const el = document.createElement(SYMS || ACTS ? 'button' : 'span'); el.className = NAMES === 'pill' ? 'lb' : NAMES === 'line' ? 'lb line' : 'lb sr'; el.textContent = name; stage.appendChild(el);
  if (el.tagName === 'BUTTON') el.type = 'button';   /* focusable: Tab walks the agents; the label is set with the hover line below */
  return { i, r, a0, y, name, size, k, m, el, symU, ro, roState: '', roW: 0, roA: 0, w: 0, pos: new THREE.Vector3(), seen: new THREE.Vector3(), sx: 0, sy: 0, sz: 0, pr: 0, mu: 1,
    litT: -99, pend: false, lab: 0, labOn: false, litCls: false };
});
const agAngle = (a, t) => a.a0 - a.k * W0 * t;
function measureLabels() { agents.forEach((a) => { a.w = a.el.offsetWidth; }); }

/* ---------- the mechanism ---------- */
const haloCv = document.createElement('canvas'); haloCv.width = haloCv.height = 64;
{ const g = haloCv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
const haloTex = new THREE.CanvasTexture(haloCv), beadGeo = new THREE.SphereGeometry(5.2, 20, 12);
const C_CASE = new THREE.Color(0xfff0dc), C_WIN = new THREE.Color(0x8ddb85), C_MISS = new THREE.Color(0xde6d9d), WHITE = new THREE.Color(1, 1, 1);
/* a case: a small glassy sphere lit by the disc (lit side toward the hole, a sharp highlight), its own colour glowing
   from inside, and a tight halo. It was a flat unlit dot before (Nov 24). */
function makeBead() {
  const core = new THREE.Mesh(beadGeo, new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0xffffff, metalness: 0, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  scene.add(core); scene.add(halo); return { core, halo };
}
function paintBead(b, col, k, alpha, scale, white = 0.45) {
  b.core.material.color.copy(col).lerp(WHITE, 0.12 + 0.3 * white); b.core.material.emissive.copy(col).lerp(WHITE, white * 0.4).multiplyScalar(0.62 * k);
  b.core.material.opacity = alpha; b.core.scale.setScalar(scale * 1.3);
  b.halo.material.color.copy(col); b.halo.material.opacity = 0.42 * k * alpha; b.halo.scale.setScalar(26 * scale);
}
function dropBead(b) { scene.remove(b.core); scene.remove(b.halo); b.core.material.dispose(); b.halo.material.dispose(); }

const R_BAR = 172;                                   /* the inner edge, where a case meets the bar */
const SL_OUT = phone ? 300 : 380;                    /* a win leaves the hole this far out, above the disc */
const OUTC = 'LWLLLWLLLL';                           /* about one win in five, as in a real run; the first cycle shows a miss, then a win */
const T_GAP = phone ? 2.2 : 1.8, MAX_IN_FLIGHT = phone ? 3 : 4;
const ease = { in: (s) => Math.pow(s, 1.7), out: (s) => 1 - Math.pow(1 - s, 2.2), io: (s) => s * s * (3 - 2 * s) };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
function polar(phi, r, y, out) { return out.set(Math.cos(phi) * r, y, Math.sin(phi) * r); }
/* each agent rides a little above the disc and bobs slowly (always above it, so nothing passes behind the near disc) */
const BOB = phone ? 5 : 8;
function agY(a, t) { return a.y + BOB * (0.5 + 0.5 * Math.sin(t * (0.55 + 0.07 * (a.i % 5)) + a.i * 1.7)); }

/* ---------- the disc colour: warm, as the still, or violet, the brand colour ---------- */
const DISC = {
  warm: { warm: [0.62, 0.30, 0.12], hot: [1.0, 0.88, 0.72], light: 0xffd9b0, kase: 0xfff0dc },
  violet: { warm: [0.36, 0.22, 0.70], hot: [0.92, 0.88, 1.0], light: 0xd6ccff, kase: 0xf1ecff },
};
const discBtns = [...document.querySelectorAll('.disc [data-disc]')];
/* violet is the disc colour (Nov 24, both founders); warm stays on the lab page's toggle for comparison */
let discKey = EMB ? (EMB.disc || 'violet') : Q.get('disc');
if (!EMB && !DISC[discKey]) { try { discKey = localStorage.getItem('synthe-bh-disc2'); } catch (e) { discKey = null; } }
if (!DISC[discKey]) discKey = 'violet';
function setDisc(k, keep) {
  if (!DISC[k]) k = 'violet'; discKey = k; const d = DISC[k];
  bhMat.uniforms.uWarm.value.fromArray(d.warm); bhMat.uniforms.uHot.value.fromArray(d.hot);
  discLights.forEach((l) => l.color.setHex(d.light)); C_CASE.setHex(d.kase);
  if (typeof dustMat !== 'undefined') dustMat.uniforms.uColor.value.fromArray(d.hot).multiplyScalar(0.95);
  const old = envTex; envTex = discEnv(d); scene.environment = envTex; if (old) old.dispose();
  discBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.disc === k)));
  root.setAttribute('data-bh-disc', k);
  if (keep) { try { localStorage.setItem('synthe-bh-disc2', k); } catch (e) {} }
}
discBtns.forEach((b) => b.addEventListener('click', () => { setDisc(b.dataset.disc, true); if (reduce || paused) draw(1); }));

let state;
function resetState() {
  let seed = 7;
  state = { t: 0, cases: [], next: 0.3, seq: 0, force: null, rnd: () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; } };
  agents.forEach((a) => { a.litT = -99; a.pend = false; });
}

function pickAgent(t, win) {
  if (state.force && state.force.a !== undefined) { const a = agents[state.force.a]; state.force.a = undefined; return a; }
  const ok = agents.filter((a) => {
    if (a.pend || t - a.litT < 8) return false;
    const pm = ((agAngle(a, t) % TAU) + TAU) % TAU;
    if (pm < 1.0 || pm > 5.15) return false;                          /* not from the front right: its case would start behind the hole */
    polar(agAngle(a, t), a.r, agY(a, t), _v); lens(_v, _v2); toScreen(_v2, _o);
    return _o.x > 0 && _o.x < W && _o.y > 40 && _o.y < H - 40;        /* only from agents you can see */
  });
  return ok.length ? ok[Math.floor(state.rnd() * ok.length)] : null;
}
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _o = { x: 0, y: 0, z: 0 };

function launch(t) {
  const forced = state.force && state.force.win !== undefined, win = forced ? state.force.win : OUTC[state.seq % OUTC.length] === 'W';
  const a = pickAgent(t, win); if (!a) return false;
  if (forced) state.force.win = undefined; else state.seq++;
  const phi0 = agAngle(a, t), pm = ((phi0 % TAU) + TAU) % TAU;
  let dIn = 1.0 + 0.4 * state.rnd();
  if (pm - dIn < 0.35) dIn = pm - 0.35;                              /* meet the bar on the near side of the hole */
  if (pm - dIn > 2.75) dIn = pm - 2.75;
  a.pend = true;
  state.cases.push({ a, win, ph: 'in', t0: t, phi0, r0: a.r, y0: agY(a, t), dIn, TIN: 3.0 + 0.7 * dIn, phiB: phi0 - dIn, bead: makeBead(), col: C_CASE.clone(), light: null, pos: new THREE.Vector3(), alpha: 0, scale: 1, k: 1 });
  return true;
}

function caseAt(c, t) {                              /* where a case is now (physical position) and how it looks */
  const age = t - c.t0;
  if (c.ph === 'in') {
    const s = clamp01(age / c.TIN), u = ease.in(s);
    polar(c.phi0 - c.dIn * u, c.r0 + (R_BAR - c.r0) * u, c.y0 + (3 - c.y0) * u, c.pos);
    c.alpha = clamp01(age / 0.35); c.scale = 0.5 + 0.5 * clamp01(age / 0.35); c.col.copy(C_CASE); c.k = 1;
  } else if (c.ph === 'miss') {                      /* across the inner edge into the shadow, on the near side, and gone */
    const s = clamp01(age / 1.4), e = Math.pow(s, 1.4);
    polar(c.phiB - 0.6 * e, R_BAR + (40 - R_BAR) * e, 3 * (1 - e) + 0.5, c.pos);
    c.col.copy(C_CASE).lerp(C_MISS, clamp01(age / 0.3)); c.k = 1 - 0.4 * clamp01(age / 0.3);
    c.alpha = 1 - THREE.MathUtils.smoothstep(s, 0.35, 0.95); c.scale = 1 - 0.45 * e;
  } else if (c.ph === 'sling') {                     /* round the hole with the gas: past the right edge, over the top (behind it), and out wider on the far left */
    const s = clamp01(age / c.TSL), e = 0.7 * s + 0.3 * ease.io(s), phi = c.phiB - c.dSl * e;
    const r = R_BAR + (205 - R_BAR) * THREE.MathUtils.smoothstep(s, 0, 0.2) + (SL_OUT - 205) * THREE.MathUtils.smoothstep(s, 0.5, 1);
    polar(phi, r, 3 + 34 * Math.max(0, -Math.sin(phi)) * (1 - THREE.MathUtils.smoothstep(s, 0.75, 1)) + 22 * THREE.MathUtils.smoothstep(s, 0.6, 1), c.pos);
    c.col.copy(C_CASE).lerp(C_WIN, clamp01(age / 0.3)); c.k = 0.95; c.alpha = 1; c.scale = 1 + 0.25 * clamp01(age / 0.3);
  } else if (c.ph === 'home') {                      /* out to its agent, slowing as it arrives */
    const s = clamp01(age / c.THOME), e = ease.out(s), a = c.a, pa = agAngle(a, t);
    const pT = pa + TAU * Math.round((c.phiS - pa) / TAU);
    polar(c.phiS + (pT - c.phiS) * e, c.rS + (a.r - c.rS) * e, c.yS + (agY(a, t) - c.yS) * e, c.pos);
    c.col.copy(C_WIN); c.k = 0.95; c.alpha = 1; c.scale = 1.25 - 0.55 * THREE.MathUtils.smoothstep(s, 0.85, 1);
  }
}

function step(t) {                                   /* advance the mechanism to time t */
  if (t >= state.next && state.cases.filter((c) => c.ph === 'in').length < MAX_IN_FLIGHT && state.cases.length < MAX_IN_FLIGHT + 2) {
    const ok = launch(t); state.next = t + (ok ? T_GAP : 0.4);
    if (ok) { if (state.lastLaunch !== undefined) state.maxGap = Math.max(state.maxGap || 0, t - state.lastLaunch); state.lastLaunch = t; state.launches = (state.launches || 0) + 1; }
  }
  for (let i = state.cases.length - 1; i >= 0; i--) {
    const c = state.cases[i], age = t - c.t0;
    if (c.ph === 'in' && age >= c.TIN) {
      c.t0 += c.TIN;
      if (c.win) {
        const land = agAngle(c.a, t + 2.7 + 2.6) + 0.9;               /* a little upstream of the agent when it lands */
        let d = (((c.phiB - land) % TAU) + TAU) % TAU; if (d < Math.PI + 0.5) d += TAU;   /* always round the back of the hole */
        c.ph = 'sling'; c.dSl = Math.min(d, TAU + 0.8); c.TSL = 0.42 * c.dSl + 0.6;
      }
      else { c.ph = 'miss'; c.a.pend = false; c.a.missT = t; }
    } else if (c.ph === 'sling' && age >= c.TSL) {
      c.t0 += c.TSL; c.ph = 'home'; c.phiS = c.phiB - c.dSl; c.rS = SL_OUT; c.yS = 25; c.THOME = 2.6;
    } else if ((c.ph === 'home' && age >= c.THOME) || (c.ph === 'miss' && age >= 1.4)) {
      if (c.ph === 'home') { c.a.litT = c.t0 + c.THOME; c.a.pend = false; }
      dropBead(c.bead); if (c.light) c.light.busy = false; state.cases.splice(i, 1);
    }
  }
}
function seek(t) {                                   /* replay from zero: frames are the same for the same t */
  state.cases.forEach((c) => dropBead(c.bead)); winLights.forEach((w) => { w.busy = false; w.l.intensity = 0; });
  resetState(); bd = []; bdLast = -1;
  for (let x = 0; x <= t; x += 1 / 60) { state.t = x; step(x); if (x > t - BD_LIFE) { state.cases.forEach((c) => caseAt(c, x)); sampleBeadDust(x); } }
  state.t = t;
}

/* ---------- drawing ---------- */
/* ---------- stardust: a faint wake of disc-lit grains where each orb has just been. Each grain stays where it was
   left (it is the orb's position when it was shed, so it does not follow the orb), drifts a little outward and down,
   and fades over a few seconds. Worked out from the clock, so any frame (a seek, a still) has its wake. ---------- */
const DUST_LIFE = phone ? 6 : 8, DUST_DT = phone ? 0.09 : 0.07,   /* the orbs are slow: a long wake reads as a trail */ DUST_N = Math.ceil(DUST_LIFE / DUST_DT);
const dustN = agents.length * DUST_N, dustPos = new Float32Array(dustN * 3), dustA = new Float32Array(dustN), dustS = new Float32Array(dustN);
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3)); dustGeo.setAttribute('aAlpha', new THREE.BufferAttribute(dustA, 1)); dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dustS, 1));
const dustMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, toneMapped: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
  uniforms: { uColor: { value: new THREE.Color(1, 1, 1) }, uScale: { value: 1 } },
  vertexShader: `attribute float aAlpha, aSize; varying float vA; uniform float uScale;
    void main() { vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.0, aSize * uScale / -mv.z); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 uColor; varying float vA;
    void main() { float d = length(gl_PointCoord - 0.5), a = smoothstep(0.5, 0.05, d) * vA; gl_FragColor = vec4(uColor * a, a); }`,
});
const dust = new THREE.Points(dustGeo, dustMat); dust.frustumCulled = false; dust.renderOrder = 1; scene.add(dust);
const hh = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
const _dp = new THREE.Vector3(), _dq = new THREE.Vector3();
function placeDust(t) {
  dustMat.uniforms.uScale.value = renderer.getPixelRatio() * H / (2 * Math.tan(camera.fov * Math.PI / 360));
  const q0 = Math.floor(t / DUST_DT);
  agents.forEach((a, ai) => {
    for (let j = 0; j < DUST_N; j++) {
      const q = q0 - j, te = q * DUST_DT, age = t - te, i = ai * DUST_N + j;
      if (te < 0 || age > DUST_LIFE) { dustA[i] = 0; continue; }
      const h1 = hh(ai + 0.37, q), h2 = hh(ai + 5.11, q), h3 = hh(ai + 9.73, q), sz = a.size;
      polar(agAngle(a, te) + (h3 - 0.5) * 0.004, a.r + (h1 - 0.5) * sz * 1.4 + age * 2.2, agY(a, te) + (h2 - 0.5) * sz * 0.9 - age * 1.4, _dp);
      lens(_dp, _dq); dustPos[i * 3] = _dq.x; dustPos[i * 3 + 1] = _dq.y; dustPos[i * 3 + 2] = _dq.z;
      const life = age / DUST_LIFE;
      dustA[i] = (0.3 + 0.7 * hh(ai + 2.9, q)) * 0.8 * Math.pow(1 - life, 1.3) * Math.min(1, age / 0.25);
      dustS[i] = (1.4 + 2.2 * hh(ai + 7.3, q)) * (phone ? 1.3 : 1);
    }
  });
  dustGeo.attributes.position.needsUpdate = dustGeo.attributes.aAlpha.needsUpdate = dustGeo.attributes.aSize.needsUpdate = true;
}

const BD_MAX = 900, BD_LIFE = phone ? 1.2 : 1.6, BD_DT = 1 / 40;
let bd = [], bdLast = -1;
const bdPos = new Float32Array(BD_MAX * 3), bdA = new Float32Array(BD_MAX), bdS = new Float32Array(BD_MAX), bdC = new Float32Array(BD_MAX * 3);
const bdGeo = new THREE.BufferGeometry();
bdGeo.setAttribute('position', new THREE.BufferAttribute(bdPos, 3)); bdGeo.setAttribute('aAlpha', new THREE.BufferAttribute(bdA, 1));
bdGeo.setAttribute('aSize', new THREE.BufferAttribute(bdS, 1)); bdGeo.setAttribute('aColor', new THREE.BufferAttribute(bdC, 3));
const bdMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, toneMapped: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
  uniforms: { uScale: dustMat.uniforms.uScale },
  vertexShader: `attribute float aAlpha, aSize; attribute vec3 aColor; varying float vA; varying vec3 vC; uniform float uScale;
    void main() { vA = aAlpha; vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.0, aSize * uScale / -mv.z); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `varying float vA; varying vec3 vC;
    void main() { float d = length(gl_PointCoord - 0.5), a = smoothstep(0.5, 0.05, d) * vA; gl_FragColor = vec4(vC * a, a); }`,
});
const bdPts = new THREE.Points(bdGeo, bdMat); bdPts.frustumCulled = false; bdPts.renderOrder = 1; scene.add(bdPts);
function sampleBeadDust(t) {                         /* a grain where each bead is now, every 1/40 s */
  if (t < bdLast) { bd = []; bdLast = -1; }
  if (bdLast >= 0 && t - bdLast < BD_DT) return; bdLast = t;
  state.cases.forEach((c, ci) => {
    if (c.alpha * c.k < 0.08) return;
    const q = Math.round(t * 40) + ci * 7919;
    bd.push({ t, x: c.pos.x + (hh(1.3, q) - 0.5) * 6, y: c.pos.y + (hh(2.7, q) - 0.5) * 4, z: c.pos.z + (hh(4.1, q) - 0.5) * 6,
      r: c.col.r, g: c.col.g, b: c.col.b, h: 0.4 + 0.6 * hh(6.3, q), s: 1.1 + 1.6 * hh(8.9, q), k: Math.min(1, c.k) * c.alpha });
  });
  while (bd.length && t - bd[0].t > BD_LIFE) bd.shift();
  if (bd.length > BD_MAX) bd.splice(0, bd.length - BD_MAX);
}
function placeBeadDust(t) {
  for (let i = 0; i < BD_MAX; i++) {
    const g = bd[i]; if (!g) { bdA[i] = 0; continue; }
    const age = t - g.t; _dp.set(g.x, g.y - age * 3, g.z); lens(_dp, _dq);
    bdPos[i * 3] = _dq.x; bdPos[i * 3 + 1] = _dq.y; bdPos[i * 3 + 2] = _dq.z;
    bdC[i * 3] = g.r; bdC[i * 3 + 1] = g.g; bdC[i * 3 + 2] = g.b;
    bdA[i] = 0.85 * g.h * g.k * Math.pow(Math.max(0, 1 - age / BD_LIFE), 1.4); bdS[i] = g.s * (phone ? 1.3 : 1);
  }
  ['position', 'aAlpha', 'aSize', 'aColor'].forEach((n) => { bdGeo.attributes[n].needsUpdate = true; });
}

const _seen = new THREE.Vector3();
function place(t) {
  placeDust(t);
  agents.forEach((a) => {
    polar(agAngle(a, t), a.r, agY(a, t), a.pos); a.mu = lens(a.pos, a.seen);
    a.m.position.copy(a.seen); a.m.scale.setScalar(a.size * Math.sqrt(a.mu));
    if (a.symU) { a.symU.uC.value.copy(a.seen).applyMatrix4(camera.matrixWorldInverse); a.symU.uR.value = a.size * Math.sqrt(a.mu); }
    const lit = t - a.litT, on = lit >= 0 && lit < 8 ? Math.min(1, lit / 0.4) * (1 - THREE.MathUtils.smoothstep(lit, 6.5, 8)) : 0;
    a.m.material.color.copy(BASE).lerp(LIT, on); a.on = on;
    toScreen(a.seen, _o); a.sx = _o.x; a.sy = _o.y; a.sz = _o.z;
    a.pr = a.size * Math.sqrt(a.mu) / a.seen.distanceTo(camera.position) * pxPerRad;
  });
  winLights.forEach((w) => { if (!w.busy) w.l.intensity = Math.max(0, w.l.intensity - 400); });
  state.cases.forEach((c) => { caseAt(c, t); });
  sampleBeadDust(t); placeBeadDust(t);
  state.cases.forEach((c) => {
    caseAt(c, t); lens(c.pos, _seen);
    c.bead.core.position.copy(_seen); c.bead.halo.position.copy(_seen); paintBead(c.bead, c.col, c.k, c.alpha, c.scale, c.ph === 'sling' || c.ph === 'home' ? 0.2 : 0.45);
    if ((c.ph === 'sling' || c.ph === 'home') && !c.light) { c.light = winLights.find((w) => !w.busy) || null; if (c.light) c.light.busy = true; }
    if (c.light) { c.light.l.position.copy(_seen); c.light.l.intensity = 9000 * clamp01((t - c.t0) / 0.3 + (c.ph === 'home' ? 1 : 0)); }
  });
}

/* ---------- names in 3D: letters cut from satin metal, bevelled, lit by the disc like the orbs ---------- */
function textCanvas(name, fpx, pad, w0, h0, cx) {        /* white text on black: the cut-out */
  const c = document.createElement('canvas'), g = c.getContext('2d'), font = `500 ${fpx}px Figtree, "Helvetica Neue", Arial, sans-serif`;
  g.font = font; const tw = g.measureText(name).width;
  c.width = w0 || Math.ceil(tw + pad * 2); c.height = h0 || Math.ceil(fpx * 1.22 + pad * 2);
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.font = font; g.fillStyle = '#fff'; g.textBaseline = 'middle';
  g.fillText(name, cx !== undefined ? cx - tw / 2 : pad, c.height / 2 + fpx * 0.05);
  return c;
}
function blurBox(a, w, h, r) {
  const t = new Float32Array(a.length);
  for (let y = 0; y < h; y++) { let acc = 0; for (let x = -r; x <= r; x++) acc += a[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) { t[y * w + x] = acc / (2 * r + 1); acc += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += t[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) { a[y * w + x] = acc / (2 * r + 1); acc += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
  return a;
}
function bevelNormals(c, r, strength) {                    /* chamfered letters: blur the cut-out into a height with flat tops, then take its slope */
  const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data, a = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 1] / 255;
  blurBox(a, w, h, r); blurBox(a, w, h, r);
  for (let i = 0; i < w * h; i++) a[i] = Math.min(1, Math.max(0, a[i] * 2.2 - 0.3));
  const o = document.createElement('canvas'); o.width = w; o.height = h; const og = o.getContext('2d'), img = og.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const hx = a[y * w + Math.min(w - 1, x + 1)] - a[y * w + Math.max(0, x - 1)], hy = a[Math.min(h - 1, y + 1) * w + x] - a[Math.max(0, y - 1) * w + x];
    let nx = -hx * strength, ny = hy * strength, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * w + x) * 4; img.data[i] = (nx * 0.5 + 0.5) * 255; img.data[i + 1] = (ny * 0.5 + 0.5) * 255; img.data[i + 2] = (nz * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  og.putImageData(img, 0, 0); return o;
}
const SATIN = 0x8f887e, TYPE_FACE = 0x3c3834, TYPE_LIGHT = new THREE.Color(0xd9d2c6), TYPE_DARK = new THREE.Color(0x3a3632);
/* standing type: its metal follows what is behind it, light satin over dark space, black chrome over the bright gas,
   with wide polished chamfers either way. What is behind is read from a tiny copy of the disc pass every few frames. */
function letterMaterial(mask, normal, flipY, face = SATIN, rough = 0.27) {
  const mt = new THREE.CanvasTexture(mask), nt = new THREE.CanvasTexture(normal);
  [mt, nt].forEach((t) => { t.flipY = flipY; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; });
  const opts = { color: face, metalness: 1, roughness: rough, envMapIntensity: 1.25, normalMap: nt, normalScale: new THREE.Vector2(1, flipY ? 1 : -1), alphaMap: mt, transparent: true, depthWrite: false, side: THREE.DoubleSide };
  return phone ? new THREE.MeshStandardMaterial(opts) : new THREE.MeshPhysicalMaterial({ ...opts, clearcoat: 0.5, clearcoatRoughness: 0.12 });
}
function ringGeometry(ri, ro, seg) {                      /* u runs once round (from the left, through the front, to the right, round the back), v from inside to outside */
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= seg; i++) { const th = -Math.PI + (i / seg) * TAU;
    pos.push(Math.cos(th) * ri, Math.sin(th) * ri, 0, Math.cos(th) * ro, Math.sin(th) * ro, 0); uv.push(i / seg, 0, i / seg, 1);
    if (i < seg) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
const TYPE_H = phone ? 13 : 15, RING_BAND = phone ? 9 : 10.5, TYPE_MIN_PX = phone ? 14 : 14, RING_MIN_PX = phone ? 34 : 40;
function buildNames() {
  agents.forEach((a) => {
    if (TYPED) {
      const c = textCanvas(a.name, 112, 14), n = bevelNormals(c, 5, 26);
      const wW = TYPE_H * c.width / c.height, geo = new THREE.PlaneGeometry(wW, TYPE_H); geo.translate(wW / 2, 0, 0);
      a.nm = new THREE.Mesh(geo, letterMaterial(c, n, true, TYPE_FACE, 0.24)); a.nm.renderOrder = 2; a.nmW = wW; a.nmFace = TYPE_FACE; scene.add(a.nm);
    } else if (NAMES === 'ring') {
      const ri = a.size * 1.45, ro = ri + RING_BAND, rm = (ri + ro) / 2, Hc = 112, Wc = Math.round(TAU * rm * Hc / RING_BAND);
      const probe = textCanvas(a.name, 84, 0).width, fpx = Math.min(84, 84 * (0.46 * Wc) / probe);   /* the name fits the front half */
      const c = textCanvas(a.name, fpx, 0, Wc, Hc, 0.25 * Wc);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 4, Wc, 6);   /* a fine ring at the inner edge, all the way round */
      const n = bevelNormals(c, 2, 8);
      a.nm = new THREE.Mesh(ringGeometry(ri, ro, 160), letterMaterial(c, n, false)); a.nm.renderOrder = 2; a.nmR = ro; scene.add(a.nm);
    }
  });
}
const _cr = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _tc = new THREE.Vector3(), _N = new THREE.Vector3(), _e1 = new THREE.Vector3(), _e2 = new THREE.Vector3(), _mb = new THREE.Matrix4();
const leads = LEADS ? stage.insertBefore(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), stage.querySelector('h2')) : null;
if (leads) { leads.setAttribute('class', 'leads'); agents.forEach((a) => { a.ln = document.createElementNS('http://www.w3.org/2000/svg', 'line'); leads.appendChild(a.ln); }); }
const D52 = 52.5 * Math.PI / 180, _np = new THREE.Vector3();

/* what is behind each name: the disc pass shrunk to 80 x 50 (16 taps a pixel), read back every 8 frames */
const LUM_W = 80, LUM_H = 50, lumRT = new THREE.WebGLRenderTarget(LUM_W, LUM_H, { depthBuffer: false }), lumBuf = new Uint8Array(LUM_W * LUM_H * 4);
const lumScene = new THREE.Scene(), lumQuad = new THREE.Mesh(quadGeo, new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, toneMapped: false,
  uniforms: { tBH: { value: rt.texture }, uStep: { value: new THREE.Vector2(1 / (LUM_W * 4), 1 / (LUM_H * 4)) } },
  vertexShader: `varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D tBH; uniform vec2 uStep;
    void main() { vec3 s = vec3(0.0); for (int i = 0; i < 4; i++) for (int j = 0; j < 4; j++) s += texture2D(tBH, vUv + (vec2(float(i), float(j)) - 1.5) * uStep).rgb; gl_FragColor = vec4(s / 16.0, 1.0); }` }));
lumQuad.frustumCulled = false; lumScene.add(lumQuad);
let lumAge = 99;
function sampleLum(force) {
  if (!force && ++lumAge < 8) return; lumAge = 0;
  renderer.setRenderTarget(lumRT); renderer.render(lumScene, camera); renderer.readRenderTargetPixels(lumRT, 0, 0, LUM_W, LUM_H, lumBuf); renderer.setRenderTarget(null);
}
function lumAt(x, y) {
  const u = Math.min(LUM_W - 1, Math.max(0, Math.floor((x / W) * LUM_W))), v = Math.min(LUM_H - 1, Math.max(0, Math.floor((1 - y / H) * LUM_H))), i = (v * LUM_W + u) * 4;
  return (0.2126 * lumBuf[i] + 0.7152 * lumBuf[i + 1] + 0.0722 * lumBuf[i + 2]) / 255;
}
function typeFaces(dt, force) {
  sampleLum(force);
  agents.forEach((a) => { if (!a.nm || a.rx === undefined) return;
    const yc = a.ry + a.rh / 2, l = Math.max(lumAt(a.rx + a.rw * 0.15, yc), lumAt(a.rx + a.rw * 0.5, yc), lumAt(a.rx + a.rw * 0.85, yc));
    const was = a.dark;
    a.dark = a.dark === undefined || force ? l > 0.42 : a.dark ? l > 0.37 : l > 0.47;   /* light or dark, never a mid grey on a mid grey; some hysteresis */
    if (!force && was !== undefined && was !== a.dark) { const f = window.__bhFlips = window.__bhFlips || {}; f[a.name] = (f[a.name] || 0) + 1; }   /* lab: flicker check */
    a.bg = a.bg === undefined || force ? +a.dark : a.bg + (+a.dark - a.bg) * Math.min(1, dt * 3);
    a.nm.material.color.copy(TYPE_LIGHT).lerp(TYPE_DARK, a.bg).lerp(LIT, a.on);
  });
}

/* ---------- 1: name and one line on hover (tap on touch). 2: a readout only while an agent acts ---------- */
const LINE = {
  'Customer support': 'Answers customer questions in chat and email.', 'Refunds': 'Decides refund requests against your policy.',
  'Returns': 'Sets up returns and exchanges.', 'Claims': 'Checks claims and asks for what is missing.', 'Code review': 'Reviews pull requests before they merge.',
  'Billing questions': 'Explains invoices and charges.', 'Sales qualification': 'Qualifies new leads and routes them.', 'Incident triage': 'Sorts alerts and pages the right team.',
  'Booking': 'Books, moves and cancels appointments.', 'Onboarding': 'Walks new users through setup.', 'Order tracking': 'Finds orders and explains delays.',
  'IT helpdesk': 'Resets access and fixes common issues.',
};
const hv = (SYMS || ACTS) ? stage.appendChild(document.createElement('div')) : null, ring = hv ? stage.appendChild(document.createElement('div')) : null;
if (hv) { hv.className = 'hv'; hv.setAttribute('aria-hidden', 'true'); hv.innerHTML = '<b></b><span></span><i>Sample agent. Every change to it is tested at the bar; only a clear win is kept.</i>'; ring.className = 'fr'; }
let focusA = null;
if (hv) agents.forEach((a) => {
  a.el.setAttribute('aria-label', `${a.name}: ${LINE[a.name] || ''} Sample agent.`);
  a.el.addEventListener('focus', () => { focusA = a; }); a.el.addEventListener('blur', () => { if (focusA === a) focusA = null; if (hoverA === a) hoverFixed = false; });
  a.el.addEventListener('click', () => { hoverA = a; hoverFixed = !hoverFixed; });   /* Enter or a click pins its card */
});
let hoverA = Q.get('hover') ? agents.find((a) => a.name === Q.get('hover')) || null : null, hoverFixed = !!hoverA, ptr = null, hvA = 0, hvShown = null;
function pick(x, y) { let best = null, bd = 1e9; agents.forEach((a) => { const d = Math.hypot(a.sx - x, a.sy - y); if (a.sz < 1 && d < a.pr + 8 && d < bd) { bd = d; best = a; } }); return best; }
if (hv) {
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') ptr = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerleave', () => { ptr = null; });
  canvas.addEventListener('click', (e) => { if (e.pointerType && e.pointerType !== 'mouse') { hoverA = pick(e.clientX, e.clientY); hoverFixed = !!hoverA; } });   /* a tap, not the start of a scroll */
}
function roState(a, t) {
  const c = state.cases.find((q) => q.a === a);
  if (c) return c.ph === 'in' ? ['testing', ''] : c.ph === 'miss' ? ['not kept', 'miss'] : ['passed', 'win'];
  if (t - a.litT >= 0 && t - a.litT < 6.5) return ['kept', 'win'];
  if (a.missT !== undefined && t - a.missT >= 0 && t - a.missT < 2.4) return ['not kept', 'miss'];
  return null;
}
let ovOn = null;
function setOverlays(on) {
  if (on === ovOn) return; ovOn = on; stage.classList.toggle('bh-off', !on);
  agents.forEach((a) => { if (a.el.tagName === 'BUTTON') a.el.tabIndex = on ? 0 : -1; });
  if (!on) { ptr = null; if (!hoverFixed) hoverA = null; }
}
function actLabels(dt) {
  if (hv) {
    if (!hoverFixed) hoverA = ovOn === false ? null : focusA || (ptr ? pick(ptr[0], ptr[1]) : null);
    if (hoverA && hoverA !== hvShown) { hvShown = hoverA; hv.querySelector('b').textContent = hoverA.name; hv.querySelector('span').textContent = LINE[hoverA.name] || ''; hv.classList.toggle('lit', hoverA.on > 0.5); }
    hvA += ((hoverA ? 1 : 0) - hvA) * Math.min(1, dt * 9);
    if (hvShown) { const a = hvShown, w = hv.offsetWidth, h = hv.offsetHeight; let x = a.sx + a.pr + 14, y = a.sy - h / 2;
      if (x + w > W - 12) x = a.sx - a.pr - 14 - w;
      if (x < 12) { x = Math.min(W - w - 12, Math.max(12, a.sx - w / 2)); y = a.sy + a.pr + 12; if (y + h > H - 12) y = a.sy - a.pr - 12 - h; }   /* no room beside it (phones): below or above */
      x = Math.min(W - w - 12, Math.max(12, x)); y = Math.min(H - h - 12, Math.max(12, y));   /* always on screen, even for an agent round the back */
      /* it grows out of its orb (Nov 24): the origin is the point of the card nearest the orb */
      const ox = Math.min(1, Math.max(0, (a.sx - x) / w)), oy = Math.min(1, Math.max(0, (a.sy - y) / h));
      hv.style.transformOrigin = `${(ox * 100).toFixed(0)}% ${(oy * 100).toFixed(0)}%`;
      hv.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${(0.96 + 0.04 * hvA).toFixed(3)})`;
      const d = 2 * a.pr + 10; ring.style.width = ring.style.height = d.toFixed(1) + 'px'; ring.style.transform = `translate3d(${(a.sx - d / 2).toFixed(1)}px, ${(a.sy - d / 2).toFixed(1)}px, 0)`; }
    hv.style.opacity = hvA.toFixed(3); ring.style.opacity = (focusA ? hvA : 0).toFixed(3);   /* a ring round the orb for keyboard focus */
  }
  if (!ACTS) return;
  const taken = (headRect ? headRect.slice() : []);
  if (hvShown && hvA > 0.05) { const r = hv.getBoundingClientRect(); taken.push({ l: r.left - 6, r: r.right + 6, t: r.top - 6, b: r.bottom + 6 }); }
  const order = agents.slice().sort((p, q) => (q.on > 0) - (p.on > 0) || q.pr - p.pr);
  order.forEach((a) => {
    const st = a === hoverA ? null : roState(a, state.t), key = st ? st.join('|') : '';
    if (key !== a.roState && st) { a.roState = key; a.ro.lastChild.textContent = st[0]; a.ro.classList.toggle('win', st[1] === 'win'); a.ro.classList.toggle('miss', st[1] === 'miss'); a.roW = a.ro.offsetWidth; }
    const w = a.roW, h = 24, y = a.sy - h / 2, R = a.sx + a.pr + 10, L = a.sx - a.pr - 10 - w;
    const hit = (x, list) => list.some((r) => x - 4 < r.r && x + w + 4 > r.l && y - 4 < r.b && y + h + 4 > r.t);
    const fits = (x) => x > 8 && x + w < W - 8;
    const orbs = agents.filter((o) => o !== a && o.sz < 1).map((o) => ({ l: o.sx - o.pr - 2, r: o.sx + o.pr + 2, t: o.sy - o.pr - 2, b: o.sy + o.pr + 2 }));
    /* right of the orb, else left; clear of other tags, the headline and other orbs if it can be, of tags at least */
    let x = [R, L].find((q) => fits(q) && !hit(q, taken) && !hit(q, orbs));
    if (x === undefined) x = [R, L].find((q) => fits(q) && !hit(q, taken));
    let want = ovOn !== false && !!st && a.sz < 1 && x !== undefined && y > 8 && y + h < H - 8;
    if (x === undefined) x = R;
    if (want) taken.push({ l: x, r: x + w, t: y, b: y + h });
    a.roA += ((want ? 1 : 0) - a.roA) * Math.min(1, dt * 6);
    a.ro.style.transformOrigin = x === R ? '0% 50%' : '100% 50%';   /* it grows out of the orb's side */
    a.ro.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${(0.94 + 0.06 * a.roA).toFixed(3)})`; a.ro.style.opacity = a.roA.toFixed(3);
  });
}

let headRect = null;
function labels(dt) {
  if (SYMS || ACTS) { actLabels(dt); return; }
  const order = agents.slice().sort((p, q) => (q.on > 0) - (p.on > 0) || q.pr - p.pr);
  const taken = headRect ? headRect.slice() : [];
  _cr.setFromMatrixColumn(camera.matrixWorld, 0); _cr.y = 0; _cr.normalize();
  order.forEach((a) => {
    const dist = a.seen.distanceTo(camera.position), k = pxPerRad / dist;
    let sc = Math.sqrt(a.mu);
    if (TYPED) sc = Math.max(sc, TYPE_MIN_PX / (TYPE_H * 0.62 * k));                   /* far names still read: at least this tall */
    if (NAMES === 'ring' && a.nmR) sc = Math.max(sc, RING_MIN_PX / (a.nmR * k));
    let x, y, w, h, left = false;
    if (NAMES === 'type') { w = a.nmW * sc * k; h = TYPE_H * sc * k * 0.8; x = a.sx + a.pr + 3; y = a.sy - h / 2; if (x + w > W - 12) { left = true; x = a.sx - a.pr - 3 - w; } }
    else if (NAMES === 'ring') { w = 2 * a.nmR * sc * k; h = 1.3 * a.nmR * sc * k; x = a.sx - w / 2; y = a.sy - h * 0.35; }
    else if (NAMES === 'combo') {                   /* the hairline leaves the orb at the Mark's 52.5 degrees; the type stands at its end */
      w = a.nmW * sc * k; h = TYPE_H * sc * k * 0.8; const Lp = 15 * Math.min(1.3, Math.max(0.85, Dl / dist)), cx = Math.cos(D52), cy = Math.sin(D52);
      a.ex = a.sx + (a.pr + 2) * cx; a.ey = a.sy - (a.pr + 2) * cy; a.ax = a.ex + Lp * cx; a.ay = a.ey - Lp * cy; x = a.ax + 3; y = a.ay - h / 2;
      if (x + w > W - 12) { left = true; a.ex = a.sx - (a.pr + 2) * cx; a.ax = a.ex - Lp * cx; x = a.ax - 3 - w; }   /* near the right edge it leans the other way */
    }
    else if (NAMES === 'line') { a.ls = Math.min(1.3, Math.max(0.92, Dl / dist)); w = a.w * a.ls; h = 18 * a.ls; const L = 16 * a.ls, cx = Math.cos(D52), cy = Math.sin(D52);
      a.ex = a.sx + (a.pr + 2) * cx; a.ey = a.sy - (a.pr + 2) * cy; a.ax = a.ex + L * cx; a.ay = a.ey - L * cy; x = a.ax + 3; y = a.ay - h / 2;
      if (x + w > W - 12) { left = true; a.ex = a.sx - (a.pr + 2) * cx; a.ax = a.ex - L * cx; x = a.ax - 3 - w; }   /* near the right edge it leans the other way */
    }
    else { w = a.w; h = 22; x = a.sx + a.pr + 8; y = a.sy - 11; if (x + w > W - 12) x = a.sx - a.pr - 8 - w; }   /* near the right edge the name sits on the left of its agent */
    const m = a.labOn ? 0 : 6;
    let want = a.sz < 1 && x > 8 && x + w < W - 8 && y > 8 && y + h < H - 8;
    if (want && taken.some((r) => x - m < r.r && x + w + m > r.l && y - m < r.b && y + h + m > r.t)) want = false;   /* a lower one waits: no hopping */
    if (want) taken.push({ l: x, r: x + w, t: y, b: y + h });
    a.labOn = want; a.lab += ((want ? 1 : 0) - a.lab) * Math.min(1, dt * 7);
    a.rx = x; a.ry = y; a.rw = w; a.rh = h;
    const lit = a.on > 0.5;
    if (a.nm) {                                     /* 3D names: placed in the scene, lit by the disc, green when the agent is lit */
      a.nm.visible = a.lab > 0.01; a.nm.material.opacity = a.lab; if (!TYPED) a.nm.material.color.setHex(SATIN).lerp(LIT, a.on);
      if (NAMES === 'combo') {                      /* stand the type exactly at the hairline's end, at the agent's depth */
        _np.set(((left ? a.ax - 3 : a.ax + 3) / W) * 2 - 1, -(a.ay / H) * 2 + 1, a.sz).unproject(camera);
        a.nm.position.copy(_np).addScaledVector(_cr, left ? -a.nmW * sc : 0);
        a.nm.rotation.set(0, Math.atan2(camera.position.x - a.nm.position.x, camera.position.z - a.nm.position.z), 0); a.nm.scale.setScalar(sc);
      } else if (NAMES === 'type') {
        const off = a.size * sc + 3 / k;
        a.nm.position.copy(a.seen).addScaledVector(_cr, left ? -(off + a.nmW * sc) : off);
        a.nm.rotation.set(0, Math.atan2(camera.position.x - a.nm.position.x, camera.position.z - a.nm.position.z), 0); a.nm.scale.setScalar(sc);
      } else {                                      /* the ring leans toward you so its front half, where the name is, reads */
        _tc.subVectors(camera.position, a.seen).normalize(); _N.copy(_up).lerp(_tc, 0.5).normalize();
        _e1.copy(_cr).addScaledVector(_N, -_cr.dot(_N)).normalize(); _e2.crossVectors(_N, _e1);
        a.nm.quaternion.setFromRotationMatrix(_mb.makeBasis(_e1, _e2, _N)); a.nm.position.copy(a.seen); a.nm.scale.setScalar(sc);
      }
    }
    if (NAMES === 'combo' && a.ln) { a.ln.setAttribute('x1', a.ex.toFixed(1)); a.ln.setAttribute('y1', a.ey.toFixed(1)); a.ln.setAttribute('x2', a.ax.toFixed(1)); a.ln.setAttribute('y2', a.ay.toFixed(1)); a.ln.style.opacity = (a.lab * 0.6).toFixed(3); a.ln.classList.toggle('lit', lit); }
    if (NAMES === 'pill' || NAMES === 'line') {
      a.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)${NAMES === 'line' ? ` scale(${a.ls.toFixed(3)})` : ''}`; a.el.style.opacity = a.lab.toFixed(3);
      if (a.ln) { a.ln.setAttribute('x1', a.ex.toFixed(1)); a.ln.setAttribute('y1', a.ey.toFixed(1)); a.ln.setAttribute('x2', a.ax.toFixed(1)); a.ln.setAttribute('y2', a.ay.toFixed(1)); a.ln.style.opacity = (a.lab * 0.7).toFixed(3); a.ln.classList.toggle('lit', lit); }
    }
    if (lit !== a.litCls) { a.litCls = lit; a.el.classList.toggle('lit', lit); }
  });
}

function draw(dt) {
  place(state.t);
  bhMat.uniforms.uTime.value = state.t;
  labels(dt);
  renderer.setRenderTarget(rt); renderer.render(bhScene, camera); renderer.setRenderTarget(null);
  if (TYPED) typeFaces(dt, dt >= 1);                /* dt 1 = a still frame: read now */
  renderer.autoClear = true; renderer.render(compScene, camera);
  renderer.autoClear = false; renderer.render(scene, camera); renderer.autoClear = true;
}

function resize() {
  W = EMB ? stage.clientWidth : innerWidth; H = EMB ? stage.clientHeight : innerHeight; renderer.setSize(W, H, false); frame(); sizeRT();
  obstacles();
  if (reduce || paused) draw(1);
}
function obstacles() {                               /* names never sit on the headline or the toggle */
  headRect = [head, document.querySelector('.disc'), EMB && EMB.nav].filter(Boolean).map((e) => { const r = e.getBoundingClientRect(); return { l: r.left - 8, r: r.right + 8, t: r.top - 8, b: r.bottom + 8 }; });
}

/* ---------- the loop: adaptive scale, paused when hidden, one frame under reduced motion ---------- */
let paused = false, last = 0, acc = [], fpsLog = [], t0Wall = 0, lastMean = 0, scaleLocked = !!Q.get('scale');
if (TYPED || NAMES === 'ring') { try { await document.fonts.load('500 112px Figtree'); } catch (e) {} buildNames(); }
resetState(); frame(); sizeRT(); measureLabels(); setDisc(discKey);
obstacles();
seek(Q.has('t') ? +Q.get('t') : reduce ? 7.6 : 3.2);
document.fonts && document.fonts.ready.then(() => { measureLabels(); if (reduce || paused) draw(1); });
addEventListener('resize', resize);
if (!EMB) addEventListener('keydown', (e) => { if (e.key === ' ' && !reduce) { paused = !paused; e.preventDefault(); } });   /* lab: space holds the motion */
function tick(now) {
  requestAnimationFrame(tick);
  const d = last ? (now - last) / 1000 : 1 / 60; last = now;
  if (!t0Wall) t0Wall = now;
  if (d < 0.25) fpsLog.push(d); if (fpsLog.length > 600) fpsLog.shift();
  if (d < 0.1 && now - t0Wall > 1000 && !scaleLocked) {   /* step the pass down only when most frames miss 60, never for one hitch */
    acc.push(d);
    if (acc.length >= 60) {
      const slow = acc.filter((x) => x > 0.0185).length / acc.length, mean = acc.reduce((p, q) => p + q, 0) / acc.length; acc = [];
      if (lastMean && mean > lastMean * 0.92) scaleLocked = true;            /* the last step did not help (a 30 Hz screen, low power): stop */
      else if (slow > 0.6 && bhScale > SCALE_MIN + 1e-3) { lastMean = mean; bhScale = Math.max(SCALE_MIN, bhScale * 0.85); sizeRT(); }
      else lastMean = 0;
    }
  }
  const dt = Math.min(0.05, d);
  if (!paused) { state.t += dt; step(state.t); }
  draw(dt);
}
/* in the dive: one hidden frame now (so the shaders compile here, not in the tunnel), then the dive calls frame() */
let embOn = null;
function embedFrame(s) {
  const on = !!s.visible && s.camZ >= -1;
  if (on !== embOn) { embOn = on; canvas.style.visibility = on ? '' : 'hidden'; }
  if (!on) { setOverlays(false); return; }
  dolly.r = Math.max(1, (s.ZG - s.camZ) / s.distEnd); dolly.open = s.open; frame();
  canvas.style.opacity = THREE.MathUtils.smoothstep(s.camZ, 0, 260).toFixed(3);   /* it comes in just past the window, while still small */
  setOverlays(s.open > 0.96);
  const dt = Math.min(0.05, s.dt || 1 / 60);
  if (s.open > 0.99 && !scaleLocked && dt < 0.1) {      /* the adaptive scale only learns from settled frames, not from the tunnel */
    acc.push(dt); if (acc.length >= 60) { const slow = acc.filter((x) => x > 0.0185).length / acc.length, mean = acc.reduce((p, q) => p + q, 0) / acc.length; acc = [];
      if (lastMean && mean > lastMean * 0.92) scaleLocked = true; else if (slow > 0.6 && bhScale > SCALE_MIN + 1e-3) { lastMean = mean; bhScale = Math.max(SCALE_MIN, bhScale * 0.85); sizeRT(); } else lastMean = 0; }
  }
  if (!s.paused) { state.t += dt; step(state.t); }
  draw(dt);
}
if (EMB) {
  canvas.style.visibility = 'hidden'; setOverlays(false); dolly.r = 4; dolly.open = 0; frame(); draw(1 / 60);
  EMB.api = { frame: embedFrame }; root.setAttribute('data-bh', 'ready');
} else if (reduce) { setOverlays(true); draw(1); root.setAttribute('data-ready', 'bh-live'); }
else { setOverlays(true); draw(1 / 60); root.setAttribute('data-ready', 'bh-live'); requestAnimationFrame(tick); }

window.__bh = {
  seek: (t) => { seek(t); draw(1); }, force: (a, win) => { state.force = { a, win }; state.next = state.t; },
  hold: (on) => { paused = !!on; }, get scale() { return bhScale; }, disc: (k) => { setDisc(k); draw(1); }, get gaps() { return { launches: state.launches, maxGap: +(state.maxGap || 0).toFixed(1) }; }, get t() { return state.t; }, get cases() { return state.cases.map((c) => ({ a: c.a.name, ph: c.ph, win: c.win })); },
  fps: () => { const s = fpsLog.slice().sort((p, q) => p - q); return s.length ? { n: s.length, p50: +(s[s.length >> 1] * 1000).toFixed(1), p95: +(s[Math.floor(s.length * 0.95)] * 1000).toFixed(1) } : null; },
};
