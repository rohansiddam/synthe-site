/* hero4.js — the Synthe hero atmosphere ("weather") layer.
   The mechanism is Ori's ShaderBg (OpenRouter), extracted in
   REF-ORI.md: a hand-written WebGL1 fragment shader — domain-warped
   value-noise fBm fog on one fullscreen triangle — whose palette is
   read from the canvas's own computed styles at runtime, so the fog
   is made of the page's own colours and cannot clash with them.

   What is Synthe's here (REF-ORI.md sections 2-4):
   - The canvas sits ABOVE the opaque whorl canvas and BELOW the
     hero content (z-index 1, DOM order after the whorl canvas) and
     paints ONLY fog coverage: transparent where there is no
     weather, so the whorl's ground and glyphs show through
     untouched except where fog actually drifts.
   - Poles are brand tokens only: base #8c2f36, bright pole the
     signal red #ec5358 pulled 78% toward the base (-> #a1373d,
     the Ori pull), deep pole #5f1d23. The cream pole exists as a
     uniform (uTint2, Ori's slot) wired to amount 0: measured, it
     exhausts the hero's WCAG headroom at alpha 0.037.
   - WCAG ceiling is structural: bright-pole alpha is capped at
     0.35 globally (deep 0.50), with an in-shader min() backstop,
     so the composited ground's luminance can rise from 0.0787 to
     at most ~0.0891 and the headline's weakest pairing
     (#cf9d94 connective words) stays >= ~3.2:1.
   - In-shader masks: the fog is held at exactly zero over the
     Mark's core, attenuated x0.7 in the text zone, faded out over
     the section's last 8% so hero3's hard bottom edge stands, and
     ramped in over the first 1.4 s under the whorl's entrance.
   - NO pointer listeners of any kind. Ori's click puffs are a
     named exclusion: this hero's pointer discipline is settled
     (the whorl takes no pointer events; no cursor effects).
   - Motion discipline mirrors hero-whorl.js: rAF only while the
     hero is intersecting and the tab is visible; reduced-motion
     draws ONE static settled frame; no-JS or WebGL failure leaves
     the shipped hero exactly as it was.

   Vanilla JS + WebGL1, zero dependencies, zero external requests.
   Auto-inits every <canvas data-hero-atmo>; also exposes
   window.initHeroAtmo(canvas) returning
   { get frames(), get simTime(), setPhase(t) } — the rig handle,
   mirroring initHeroWhorl's return; setPhase is the verification
   hook REF-ORI.md 5.4 item 2 requires (force a drift sweep, draw
   one frame at that phase). */
'use strict';

/* ---------------- shaders ---------------- */

var ATMO_VS = [
  'attribute vec2 position;',
  'varying vec2 vUv;',
  'void main() {',
  '  vUv = position * 0.5 + 0.5;', // fullscreen triangle covers [0,1]^2
  '  gl_Position = vec4(position, 0.0, 1.0);',
  '}'
].join('\n');

/* Fragment structure is Ori's (REF-ORI.md 3.3): p scaled 1.6,
   diagonal scroll drift, warp field q = fbm(p), warped sample
   f = fbm(p + 2.4*q + drift). Terms the teardown does not settle
   (the noise source, glow2's source term, the glow upper edge)
   are builder-set per REF-ORI.md section 6 and judged by eye.
   Output is coverage, not an opaque mix (REF-ORI.md section 2):
   premultiplied vec4(colour * alpha, alpha). */
function atmoFS(precision) {
  return [
    'precision ' + precision + ' float;',
    'varying vec2 vUv;',
    'uniform vec2 uRes;',
    'uniform vec3 uBase;',       // read at runtime; the fog is
    'uniform vec3 uTintPulled;', // composited over this ground,
    'uniform vec3 uDeep;',       // so uBase is not mixed in here;
    'uniform vec3 uTint2;',      // it anchors the 78% pull in JS
    'uniform float uTime;',
    'uniform float uScroll;',
    'uniform float uLo;',
    'uniform float uAmtBright;',
    'uniform float uAmtDeep;',
    'uniform float uAmtTint2;',
    'uniform vec4 uMarkRect;',   // x0,y0,x1,y1 — section UV, y-up
    'uniform vec4 uTextZone;',   // edge, feather, mode, unused
    'uniform float uEnter;',
    '',
    'float hash(vec2 p) {',
    '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);',
    '}',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),',
    '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
    '}',
    'float fbm(vec2 p) {', // value-noise fBm, 4 octaves (Ori)
    '  float v = 0.0;',
    '  float a = 0.5;',
    '  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);',
    '  for (int i = 0; i < 4; i++) {',
    '    v += a * noise(p);',
    '    p = r * p * 2.0;',
    '    a *= 0.5;',
    '  }',
    '  return v;',
    '}',
    'float rectCover(vec2 uv, vec4 r, float f) {',
    '  float x = smoothstep(r.x - f, r.x + f, uv.x)',
    '          * (1.0 - smoothstep(r.z - f, r.z + f, uv.x));',
    '  float y = smoothstep(r.y - f, r.y + f, uv.y)',
    '          * (1.0 - smoothstep(r.w - f, r.w + f, uv.y));',
    '  return x * y;',
    '}',
    '',
    'void main() {',
    '  vec2 uv = vUv;',
    '  float aspect = uRes.x / uRes.y;',
    '  vec2 p = vec2(uv.x * aspect, uv.y) * 1.6;',
    '  p += vec2(uScroll * 0.45, uScroll);', // diagonal scroll drift (Ori)
    '  vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));',
    '  float f = fbm(p + 2.4 * q + vec2(uTime * 0.065));', // warp 2.4, drift 0.065 (Ori)
    '',
    '  float glow  = smoothstep(uLo, 1.0, f);',        // bright layer
    '  float deep  = 1.0 - smoothstep(0.0, 0.55, f);', // shadow layer
    '  float glow2 = smoothstep(0.35, 0.95, length(q));', // second layer
    '',
    '  float aBright = glow * (0.75 + 0.25 * glow2) * uAmtBright;',
    '  float aDeep   = deep * uAmtDeep;',
    '  float aCream  = glow2 * uAmtTint2 * 0.75;', // wired to 0 (REF-ORI 4.1)
    '',
    '  // masks (REF-ORI 3.4), all in-shader',
    '  float m = 1.0 - rectCover(uv, uMarkRect, 0.12);', // Mark core -> 0
    '  float tz;',
    '  if (uTextZone.z < 0.5) {', // desktop: left text column x < edge
    '    tz = mix(0.7, 1.0, smoothstep(uTextZone.x - uTextZone.y,',
    '                                  uTextZone.x + uTextZone.y, uv.x));',
    '  } else {',                 // phone: top text band y > edge
    '    tz = mix(1.0, 0.7, smoothstep(uTextZone.x - uTextZone.y,',
    '                                  uTextZone.x + uTextZone.y, uv.y));',
    '  }',
    '  m *= tz;',
    '  m *= smoothstep(0.0, 0.08, uv.y);', // bottom fade: hero3 edge stands
    '  m *= smoothstep(0.0, 1.0, uEnter);', // entrance ramp, 1.4 s (JS)
    '  aBright *= m;',
    '  aDeep *= m;',
    '  aCream *= m;',
    '  aBright = min(aBright, 0.35);', // hard backstop: the 4.1 cap
    '                                   // holds even if a mask is wrong',
    '',
    '  float a = aBright + aDeep + aCream;',
    '  vec3 col = vec3(0.0);',
    '  if (a > 0.0001) {',
    '    col = (uTintPulled * aBright + uDeep * aDeep + uTint2 * aCream) / a;',
    '  }',
    '  gl_FragColor = vec4(col * a, a);', // premultiplied coverage
    '}'
  ].join('\n');
}

/* ---------------- colour plumbing (REF-ORI 3.5) ---------------- */

function parseColour(str) {
  if (!str) return null;
  str = String(str).trim();
  var hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(str);
  if (hex) {
    var h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16),
            parseInt(h.slice(4, 6), 16)];
  }
  var nums = str.match(/[\d.]+/g);
  if (nums && nums.length >= 3) {
    return [parseFloat(nums[0]), parseFloat(nums[1]), parseFloat(nums[2])];
  }
  return null;
}

/* ---------------- renderer ---------------- */

function initHeroAtmo(canvas) {
  var gl = null;
  try {
    gl = canvas.getContext('webgl', { alpha: true, antialias: false,
      depth: false, powerPreference: 'low-power' }) ||
      canvas.getContext('experimental-webgl', { alpha: true,
        antialias: false, depth: false, powerPreference: 'low-power' });
  } catch (e) { gl = null; }
  if (!gl) { // WebGL1 unavailable: remove the layer, the shipped
              // hero stands untouched (REF-ORI 4.2)
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    return null;
  }

  var prog = null, buf = null, U = {};
  var frames = 0;
  var simTime = 0, lastNow = null;
  var visible = false;
  var rafId = 0;
  var lost = false;

  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = reduceQuery.matches;

  // layout uniforms, picked by the renderer's own 768px breakpoint
  var markRect = [0.52, 0.08, 1.00, 0.92]; // desktop, section UV y-up
  var textZone = [0.52, 0.10, 0, 0];       // desktop: column x < 0.52

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  function buildProgram() {
    var prec = 'mediump';
    try {
      var fmt = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      if (fmt && fmt.precision > 0) prec = 'highp';
    } catch (e) { /* keep mediump */ }
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, ATMO_VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, atmoFS(prec)));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
    }
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    // Ori's fullscreen triangle
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    U = {};
    ['uRes', 'uBase', 'uTintPulled', 'uDeep', 'uTint2', 'uTime',
     'uScroll', 'uLo', 'uAmtBright', 'uAmtDeep', 'uAmtTint2',
     'uMarkRect', 'uTextZone', 'uEnter'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });
  }

  /* Read the palette from the canvas's own computed styles — the
     mechanism that makes the fog out of the page's own colours —
     pull the tint 78% toward the base (Ori), upload. Called at
     init and re-called every 60 frames (Ori's cadence). */
  function readColours() {
    var cs = window.getComputedStyle(canvas);
    var base = parseColour(cs.backgroundColor) || [140, 47, 54];
    var tint = parseColour(cs.color) || [236, 83, 88];
    var deep = parseColour(cs.getPropertyValue('--h4-deep')) || [95, 29, 35];
    var pulled = [0, 1, 2].map(function (i) {
      return (tint[i] + (base[i] - tint[i]) * 0.78) / 255;
    });
    gl.useProgram(prog);
    gl.uniform3f(U.uBase, base[0] / 255, base[1] / 255, base[2] / 255);
    gl.uniform3f(U.uTintPulled, pulled[0], pulled[1], pulled[2]);
    gl.uniform3f(U.uDeep, deep[0] / 255, deep[1] / 255, deep[2] / 255);
    gl.uniform3f(U.uTint2, 244 / 255, 243 / 255, 240 / 255); // cream pole,
                                            // amount 0 below (REF-ORI 4.1)
    gl.uniform1f(U.uLo, 0.42);        // Ori's dark-mode threshold
    gl.uniform1f(U.uAmtBright, 0.35); // the WCAG ceiling (REF-ORI 4.1)
    gl.uniform1f(U.uAmtDeep, 0.50);
    gl.uniform1f(U.uAmtTint2, 0.0);
  }

  function layout() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    // backing store at 0.5x CSS size (Ori's ratio): the softness
    // is the aesthetic, and the perf budget (REF-ORI 4.4)
    canvas.width = Math.max(1, Math.round(w * 0.5));
    canvas.height = Math.max(1, Math.round(h * 0.5));
    if (w >= 768) {
      markRect = [0.52, 0.08, 1.00, 0.92];
      textZone = [0.52, 0.10, 0, 0];
    } else {
      markRect = [0.08, 0.00, 0.92, 0.45];
      textZone = [0.45, 0.10, 1, 0];
    }
    gl.useProgram(prog);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform4f(U.uMarkRect, markRect[0], markRect[1], markRect[2], markRect[3]);
    gl.uniform4f(U.uTextZone, textZone[0], textZone[1], textZone[2], textZone[3]);
  }

  function drawFrame() {
    if (lost) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    var loc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(U.uTime, reduced ? 26.0 : simTime); // reduced: the
                                    // frozen settled phase (REF-ORI 3.6)
    gl.uniform1f(U.uScroll, (window.pageYOffset || 0) * 0.00022);
    gl.uniform1f(U.uEnter, reduced ? 1 : Math.min(1, simTime / 1.4));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    frames++;
    if (frames % 60 === 0) readColours(); // Ori's re-read cadence
  }

  function tick(now) {
    rafId = requestAnimationFrame(tick);
    if (lastNow === null) lastNow = now;
    var dt = Math.min(.05, Math.max(0, (now - lastNow) * .001));
    lastNow = now;
    if (!visible || document.hidden) return; // paused: clock holds
    simTime += dt;
    drawFrame();
  }

  function startLoop() {
    if (rafId || reduced || lost) return;
    lastNow = null;
    rafId = requestAnimationFrame(tick);
  }
  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  buildProgram();
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied coverage
  readColours();
  layout();

  window.addEventListener('resize', function () {
    if (lost) return;
    layout();
    if (reduced) drawFrame(); // static mode redraws only on resize
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0.02 }).observe(canvas); // the whorl's value
  } else {
    visible = true;
  }
  if (typeof reduceQuery.addEventListener === 'function') {
    reduceQuery.addEventListener('change', function () {
      reduced = reduceQuery.matches;
      if (reduced) { stopLoop(); drawFrame(); }
      else startLoop();
    });
  }
  canvas.addEventListener('webglcontextlost', function (ev) {
    ev.preventDefault(); // the canvas composites transparent and
                         // its CSS ground paints: flat, no hole
    lost = true;
    stopLoop();
  });
  canvas.addEventListener('webglcontextrestored', function () {
    lost = false;
    buildProgram();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    readColours();
    layout();
    if (reduced) drawFrame(); else startLoop();
  });

  if (reduced) drawFrame(); else startLoop();

  return {
    get frames() { return frames; },
    get simTime() { return simTime; },
    /* Rig hook (REF-ORI 5.4 item 2): set the drift phase and draw
       exactly one frame at it, so verification can sweep the field
       deterministically instead of waiting on the 0.065 drift. */
    setPhase: function (t) {
      simTime = t;
      drawFrame();
    }
  };
}

window.initHeroAtmo = initHeroAtmo;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('canvas[data-hero-atmo]').forEach(initHeroAtmo);
  });
} else {
  document.querySelectorAll('canvas[data-hero-atmo]').forEach(initHeroAtmo);
}
