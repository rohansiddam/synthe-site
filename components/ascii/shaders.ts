/* GLSL sources for the /ascii exploration lane.
 *
 * Two scenes share this module:
 *   1. The logo field (LOGO_VERTEX / LOGO_FRAGMENT): the Synthe mark drawn
 *      out of IBM Plex Mono glyphs. A dense monospace grid samples the logo
 *      texture's luminance per cell and maps it to a character ramp; every
 *      covered cell then re-rolls its glyph on its own staggered clock
 *      (a 1 to 2 second per-cell cadence, the reference band's measured
 *      mutation pace), so the whole body crawls while the silhouette
 *      holds. The mark is flat (interior luminance 1.0), so the interior's
 *      effective luminance is modulated by layered simplex noise: the
 *      body resolves into mixed glyphs, with real letters and digits
 *      woven into its mid-density zones, while edge and crest cells stay
 *      at the top of the ramp so the silhouette stays crisp. Scrolling
 *      first strains the mark (a small residual warp, tension), a
 *      gesture that begins almost immediately and runs across the whole
 *      hero exit; glyph tendrils extrude from its lower contour, reach
 *      down-screen ahead of the terrain, then follow the glyph
 *      terrain's crest line (dockBus) and dock into its columns. Past
 *      the dock, a dissolve front converts the mark cell by cell into
 *      the dark glyph field itself, so it disappears by becoming the
 *      field rather than by being covered.
 *   2. The glyph contour (CONTOUR_VERTEX / CONTOUR_FRAGMENT): topographic
 *      contour lines, in the hero field's fbm language, drawn entirely from
 *      mono glyphs at low contrast as a background presence behind copy.
 *
 * Both shaders are written for three.js ShaderMaterial (WebGL2): three
 * prepends the attribute/uniform declarations and maps texture2D() onto
 * texture(). Colours arrive as uniforms in raw sRGB so the canvas matches
 * the site's CSS tokens exactly.
 */

/* Ashima / Ian McEwan 2D simplex noise, the standard compact form.
   Shared by both fragment shaders. */
export const NOISE_GLSL = /* glsl */ `
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
`;

/* ------------------------------------------------------------------ */
/* Scene 1: the logo, drawn out of text                                */
/* ------------------------------------------------------------------ */

export const LOGO_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  /* Fullscreen plane: positions are already clip space. */
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const LOGO_FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D u_texture;   /* logo: R = half A coverage, G = half B coverage */
uniform sampler2D u_atlas;     /* glyph atlas: top row = ramp, bottom row = letters */
uniform vec2  u_resolution;    /* drawing buffer size, px */
uniform float u_cell;          /* monospace cell size, buffer px */
uniform vec2  u_grid;          /* grid dimensions in cells */
uniform float u_time;          /* seconds, frozen under reduced motion */
uniform float u_scroll;        /* smoothed scroll energy, 0..1 */
uniform float u_progress;      /* smoothed scroll progress, 0..1 */
uniform vec2  u_logoOffset;    /* logo rect origin in plane UV (base, unraised) */
uniform vec2  u_logoSize;      /* logo rect size in plane UV (base, unraised) */
uniform float u_rampCount;     /* glyphs in the ramp (10) */
uniform float u_letterCount;   /* glyphs in the letter row (16) */
uniform vec3  u_bg;            /* site --bg */
uniform vec3  u_ink;           /* site --ink: half A tint */
uniform vec3  u_accent;        /* site --accent: half B tint + luminance peaks */
uniform vec3  u_faint;         /* site --muted: ambient speckle */
uniform float u_ambient;       /* ambient speckle strength, 0..1 */
uniform float u_debug;         /* 0 off; 1 raw texture; 2 luminance; 3 ramp index */
uniform vec4  u_tendrils[16];  /* anchors in texture space: u, bottomV, half (0 A / 1 B), active */
uniform float u_tendrilLen[16];/* per-anchor length in plane UV, eased on the CPU toward the terrain crest (dockBus) */
uniform float u_dockT[16];     /* per-anchor docked-ness, 0..1, CPU-eased: tip cells brighten as the join completes */
uniform float u_extend;        /* eased reach of the mark, 0..1: set from the longest live tendril target */
uniform float u_raise;         /* eased raise of the mark, 0..1, follows u_extend */
uniform float u_tendrilCeil;   /* centre.y above which no tendril can reach */
uniform float u_dissolve;      /* 0..1: the mark converting into the dark glyph field, lerped in JS */

varying vec2 vUv;

${NOISE_GLSL}

/* A tendril's centreline x at depth d below its source. Two summed
   sines give an organic sway that grows with depth; kept cheap (no
   noise calls) because it runs per anchor per fragment. */
float tendrilPathX(float srcX, float d, float phase) {
  float sway = sin(d * 24.0 + phase + u_time * 0.35) * 0.55
             + sin(d * 53.0 - phase * 1.7 - u_time * 0.21) * 0.30;
  return srcX + sway * 0.020 * min(1.0, 0.25 + d * 3.0);
}

void main() {
  vec2 cellId = floor(gl_FragCoord.xy / u_cell);
  vec2 cellUv = fract(gl_FragCoord.xy / u_cell);
  vec2 centre = (cellId + 0.5) / u_grid;

  /* --- The raised rect. As u_extend grows the mark lifts and shrinks
     slightly, freeing the lower viewport; warp, breakup and tendril
     anchors all read this same rect, so the mark and its tendrils can
     never disagree about where the mark is. --- */
  vec2 rectS = u_logoSize * (1.0 - 0.18 * u_raise);
  vec2 rectO = u_logoOffset + vec2(u_logoSize.x * 0.09, u_logoSize.y * 0.15) * u_raise;

  /* --- Residual warp: strain, not flow. A whisper of the v1 liquid
     warp (about a fifth of its amplitude) that reads as tension in the
     mark while it is being pulled; the scroll gesture's real output is
     the tendrils below. Progress still slides the noise domain so
     scrolling down and up do not replay the same strain. --- */
  vec2 flowP = centre * 3.0;
  vec2 flow = vec2(
    snoise(flowP + vec2(u_time * 0.050 + u_progress * 6.0, u_progress * 2.0)),
    snoise(flowP + vec2(19.19, 7.31) + vec2(-u_time * 0.040, u_progress * 5.0)));
  float warpAmt = 0.004 + u_scroll * 0.024;
  vec2 warped = centre + flow * warpAmt;

  vec2 logoUv = (warped - rectO) / rectS;
  vec3 tex = texture2D(u_texture, logoUv).rgb;
  float covA = tex.r;
  float covB = tex.g;
  float lum = max(covA, covB);
  bool isB = covB > covA;

  /* --- Interior vs edge. The mark is flat, so "interior" cannot come
     from luminance: it is solid coverage whose neighbourhood is also
     solid (gradient near zero). Edge and partial-coverage cells keep
     the raw luminance, so the silhouette's glyphs stay at the top of
     the ramp and the outline stays crisp at any distance. --- */
  vec2 duv = (1.0 / u_grid) / rectS;
  vec3 tL = texture2D(u_texture, logoUv - vec2(duv.x, 0.0)).rgb;
  vec3 tR = texture2D(u_texture, logoUv + vec2(duv.x, 0.0)).rgb;
  vec3 tD = texture2D(u_texture, logoUv - vec2(0.0, duv.y)).rgb;
  vec3 tU = texture2D(u_texture, logoUv + vec2(0.0, duv.y)).rgb;
  float gL = max(tL.r, tL.g);
  float gR = max(tR.r, tR.g);
  float gD = max(tD.r, tD.g);
  float gU = max(tU.r, tU.g);
  float grad = max(max(abs(gL - lum), abs(gR - lum)), max(abs(gD - lum), abs(gU - lum)));
  float interior = smoothstep(0.985, 1.0, lum) * (1.0 - clamp(grad * 2.2, 0.0, 1.0));

  /* --- Breakup: modulate the interior's effective luminance with
     layered simplex noise (coarse zones, mid variation, fine grain),
     partially quantized into patches so the body reads as distinct
     composition zones, the way the reference band has a hex field
     here and terrain there, not as uniform static. The result spans
     the middle and top of the ramp: =, +, *, #, %, @ mixed. --- */
  float zoneN = snoise(logoUv * 2.4 + vec2(3.7 + u_time * 0.008, 9.1));
  float midN = snoise(logoUv * 6.5 + vec2(-5.2, 1.3) + vec2(u_time * 0.05, u_time * 0.011));
  float fineN = (hash21(cellId * 13.73) - 0.5) * 0.16; /* per-cell grain, no third noise call */
  float modN = clamp(0.58 + zoneN * 0.30 + midN * 0.20 + fineN, 0.05, 1.0);
  modN = mix(modN, floor(modN * 5.0) / 5.0 + 0.10, 0.35);
  float lumEff = mix(lum, 0.36 + 0.64 * modN, interior);

  /* --- Luminance to character ramp, with the crawl. ---
     The effective luminance picks the ramp level; then every covered
     cell re-rolls its glyph on its own staggered clock: a per-cell
     rate (about 0.6 to 1.2 events per second, a 1 to 2 second
     cadence, the reference band's measured cell-mutation pace) and a
     per-cell phase, so the whole body churns continuously instead of
     blinking in lockstep. A re-roll swaps one or two levels inside
     the cell's own density neighbourhood: the breakup zones still
     decide where each cell lives, so the surface boils while the
     silhouette holds. Crest cells (top band) re-roll too, but their
     swaps clamp into the heaviest three levels: the outline sparkles
     without ever thinning. */
  float maxIdx = u_rampCount - 1.0;
  float cellRate = 0.62 + 0.55 * hash21(cellId * 1.917);
  float cellPhase = hash21(cellId * 2.613 + 7.7);
  float ctick = floor(u_time * cellRate + cellPhase * 16.0);
  float cr1 = hash21(cellId * 3.31 + ctick * 0.7317);
  float cr2 = hash21(cellId * 5.77 + ctick * 1.9131);
  float crawlMag = cr2 < 0.62 ? 1.0 : 2.0;
  float crawlSwap = (step(0.5, cr1) * 2.0 - 1.0) * crawlMag;
  float crawlMask = smoothstep(0.03, 0.15, lumEff);
  float idxBase = floor(lumEff * maxIdx + 0.5);
  float idx = clamp(idxBase + crawlSwap * crawlMask, 0.0, maxIdx);
  if (idxBase >= maxIdx - 1.0) idx = clamp(idx, maxIdx - 2.0, maxIdx);

  /* --- Letters in the body. Interior cells in the mid-density bands
     may draw from the atlas's letter row instead of the ramp: the
     letters of SYNTHE and the digits, the mark's own substance.
     Letters ride the same crawl: each cell's letter clock is its own
     (same rate family, own phase and seed), so letters surface and
     sink across the body every second or two instead of changing in
     one global blink, and the letter itself re-rolls with its clock.
     Crest and edge cells never do this: the outline stays pure ramp. */
  float ltick = floor(u_time * cellRate * 0.9 + cellPhase * 12.0);
  float lh = hash21(cellId * 3.171 + ltick * 0.9173);
  float letterP = interior * 0.50
    * smoothstep(0.36, 0.52, lumEff) * (1.0 - smoothstep(0.84, 0.97, lumEff));
  float useLetter = step(lh, letterP);
  float letterIdx = floor(hash21(cellId * 7.77 + ltick * 1.371) * u_letterCount);

  /* --- Colour: the mark's halves keep their identity through the map.
     Half A renders in ink, half B in the brick accent. On half A the
     highest effective-luminance band warms slightly toward the accent
     (a logo is flat, so a strong peak blend would flood the whole
     half; 0.22 keeps it a warmth at the crest, not a recolour). */
  vec3 tint = isB ? u_accent : u_ink;
  float peak = smoothstep(0.78, 1.0, lumEff);
  tint = mix(tint, u_accent, isB ? 0.0 : peak * 0.22);

  /* Atlas rows: ramp occupies the top half of the texture (v 0.5..1),
     letters the bottom half (v 0..0.5); see logoTexture.ts. */
  vec2 rampUv = vec2((idx + cellUv.x) / u_rampCount, 0.5 + cellUv.y * 0.5);
  vec2 letterUv = vec2((letterIdx + cellUv.x) / u_letterCount, cellUv.y * 0.5);
  float glyph = mix(texture2D(u_atlas, rampUv).a,
                    texture2D(u_atlas, letterUv).a, useLetter);

  if (u_debug > 0.5 && u_debug < 1.5) { gl_FragColor = vec4(tex, 1.0); return; }
  if (u_debug > 1.5 && u_debug < 2.5) { gl_FragColor = vec4(vec3(lumEff), 1.0); return; }
  if (u_debug > 2.5) { gl_FragColor = vec4(vec3(idx / maxIdx), 1.0); return; }

  vec3 col = mix(u_bg, tint, glyph);

  /* --- Ambient speckle: far outside the mark, rare noise peaks raise a
     single faint '.' so the empty field is not dead. Kept sparse and
     still (no flicker) on purpose. It dies away as the dissolve takes
     the field over (the field has its own glyphs by then). */
  if (lum < 0.001 && u_ambient > 0.0) {
    float sp = snoise(centre * 22.0 + vec2(u_time * 0.15, -u_time * 0.10));
    float on = step(0.93, sp) * u_ambient * (1.0 - u_dissolve);
    if (on > 0.0) {
      vec2 dotUv = vec2((1.0 + cellUv.x) / u_rampCount, 0.5 + cellUv.y * 0.5);
      float dotGlyph = texture2D(u_atlas, dotUv).a;
      col = mix(col, u_faint, dotGlyph * on * 0.45);
    }
  }

  /* --- Tendrils: glyph streams extruded from the mark's lower
     contour, and in v3 they land somewhere. Each anchor's length is
     computed on the CPU (AsciiScene, via dockBus) as the eased
     distance from its source to the crest of the glyph terrain
     rising into the frame below: a tendril exists only while a
     crest is in the frame beneath it, grows as the crest approaches,
     and ends AT the crest. As the join completes (u_dockT) the tip
     cells brighten toward the accent and the full ramp, and the
     receiving terrain column flashes back (dockBus.dock). Streams
     sway and fork as before, but the depth taper is gentle now:
     the tip is a join, not a dissolve. Gated to fragments below
     the mark so the loop is skipped for most of the frame at rest. */
  if (u_extend > 0.002 && centre.y < u_tendrilCeil && lum < 0.6) {
    float best = 0.0;
    vec3 bestTint = u_ink;
    float bestIdx = 1.0;
    float bestLetter = -1.0;
    float bestT01 = 0.0;
    float bestDock = 0.0;
    for (int i = 0; i < 16; i++) {
      vec4 a = u_tendrils[i];
      if (a.w < 0.5) continue;
      float len = u_tendrilLen[i];
      if (len < 0.004) continue;
      vec2 src = rectO + a.xy * rectS;
      if (centre.y > src.y + 0.005) continue;
      float d = src.y - centre.y;
      if (d > len) continue;
      float t01 = d / len;
      float fi = float(i);
      float phase = hash21(vec2(fi * 3.77, 1.3)) * 17.0;
      float cellW = 1.0 / u_grid.x;

      float px = tendrilPathX(src.x, d, phase);
      float wdt = mix(1.45, 0.85, t01) * cellW;
      float dens = (1.0 - smoothstep(wdt * 0.4, wdt, abs(centre.x - px)))
                 * (1.0 - 0.30 * t01);

      float forkH = hash21(vec2(fi * 5.13, 2.9));
      if (forkH < 0.5) {
        float fd = len * (0.30 + 0.30 * hash21(vec2(fi * 9.31, 4.7)));
        if (d > fd && len - fd > 0.004) {
          float dirF = hash21(vec2(fi * 7.77, 8.3)) > 0.5 ? 1.0 : -1.0;
          float bx = tendrilPathX(src.x, fd, phase) + dirF * (d - fd) * 0.85;
          bx += sin(d * 31.0 + phase * 2.3 + u_time * 0.3) * 0.006
              * min(1.0, (d - fd) * 8.0);
          float bw = mix(0.80, 0.45, (d - fd) / (len - fd)) * cellW;
          float bd = (1.0 - smoothstep(bw * 0.4, bw, abs(centre.x - bx)))
                   * (1.0 - 0.35 * t01) * 0.8;
          dens = max(dens, bd);
        }
      }

      if (dens > best) {
        best = dens;
        bestTint = a.z > 0.5 ? u_accent : u_ink;
        bestIdx = clamp(floor(dens * maxIdx + 0.5), 1.0, maxIdx);
        bestT01 = t01;
        bestDock = u_dockT[i];
        float lt = hash21(cellId * 5.37 + fi * 0.731);
        bestLetter = (d < len * 0.28 && lt < 0.20)
          ? floor(hash21(cellId * 9.13 + fi) * u_letterCount) : -1.0;
      }
    }
    if (best > 0.03) {
      float tipBoost = smoothstep(0.86, 1.0, bestT01) * bestDock;
      float tg;
      if (bestLetter >= 0.0 && tipBoost < 0.5) {
        tg = texture2D(u_atlas, vec2((bestLetter + cellUv.x) / u_letterCount,
                                     cellUv.y * 0.5)).a;
      } else {
        float ti = mix(bestIdx, maxIdx, tipBoost * 0.9);
        tg = texture2D(u_atlas, vec2((ti + cellUv.x) / u_rampCount,
                                     0.5 + cellUv.y * 0.5)).a;
      }
      vec3 tt = mix(bestTint, u_accent, tipBoost * 0.55);
      col = mix(col, tt, tg * clamp(best * 2.2 * (1.0 + tipBoost * 0.25), 0.0, 1.0));
    }
  }

  /* --- Dissolve: the mark becomes the field. Once the tendrils have
     docked and the terrain's filled world takes over the viewport,
     u_dissolve (scroll-driven, lerped in JS, reversible) sweeps a
     conversion front up through the frame, bottom cells first, with
     a per-cell hash scatter so no straight edge ever shows. Each
     cell, as the front passes it: (1) its glyphs bleach toward the
     paper, sinking away; (2) its ground flips to the dark world's
     ground (the --ink token, the same colour the terrain fills
     with, so the terrain's own fill can sweep over the converted
     cells without a seam); (3) a faint field glyph fades in at
     wallpaper strength, drawn from the letters row and re-rolled
     on a slow clock, the terrain field's alphabet family. At
     u_dissolve = 1 every cell has converted: the mark is not
     covered, it is gone, and only the dark glyph field remains.
     Scrolling back up runs the same lerped uniform backwards and
     the mark re-condenses out of the field. --- */
  if (u_dissolve > 0.001) {
    float dh = hash21(cellId * 4.39 + 11.1);
    float front = mix(-0.20, 1.30, u_dissolve);
    float dist = front - centre.y + (dh - 0.5) * 0.26;
    float a = clamp(dist / 0.12, 0.0, 1.0);
    if (a > 0.0) {
      /* (1) bleach: the mark's glyphs sink toward the paper. */
      col = mix(col, u_bg, smoothstep(0.04, 0.34, a) * 0.38);
      /* (3) the field glyph that will remain. */
      float ftick = floor(u_time * 0.45 + dh * 9.0);
      float fIdx = floor(hash21(cellId * 6.53 + ftick * 1.317) * u_letterCount);
      float fGlyph = texture2D(u_atlas, vec2((fIdx + cellUv.x) / u_letterCount,
                                             cellUv.y * 0.5)).a;
      float fGate = hash21(cellId * 3.97) < 0.34 ? 0.3 : 1.0;
      float fAlpha = (0.10 + 0.16 * hash21(cellId * 9.71)) * fGate
                   * smoothstep(0.45, 0.95, a);
      vec3 fieldCol = mix(u_ink, u_bg, fGlyph * fAlpha);
      /* (2) the ground flip, fast per cell once its bleach is done. */
      col = mix(col, fieldCol, smoothstep(0.30, 0.62, a));
    }
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

/* ------------------------------------------------------------------ */
/* Scene 2: contour lines drawn from glyphs                            */
/* ------------------------------------------------------------------ */

export const CONTOUR_VERTEX = LOGO_VERTEX;

export const CONTOUR_FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D u_atlas;     /* glyph atlas, one row of u_rampCount glyphs */
uniform float u_cell;          /* monospace cell size, buffer px */
uniform vec2  u_grid;          /* grid dimensions in cells */
uniform float u_time;          /* seconds, frozen under reduced motion */
uniform float u_rampCount;     /* glyphs in the ramp (10) */
uniform vec3  u_bg;            /* band background (the inverted section) */
uniform vec3  u_ink;           /* band foreground: glyph colour at full strength */
uniform float u_strength;      /* overall presence, kept low (about 0.2) */

varying vec2 vUv;

${NOISE_GLSL}

/* fbm over simplex noise: the hero field's contour language. */
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v; /* roughly -0.94..0.94 */
}

void main() {
  vec2 cellId = floor(gl_FragCoord.xy / u_cell);
  vec2 cellUv = fract(gl_FragCoord.xy / u_cell);
  vec2 centre = (cellId + 0.5) / u_grid;

  /* Aspect-corrected field coordinates; the field drifts very slowly. */
  vec2 p = centre * vec2(u_grid.x / u_grid.y, 1.0) * 2.2;
  p += vec2(u_time * 0.010, u_time * 0.006);
  float field = fbm(p + fbm(p) * 0.9) * 0.5 + 0.5; /* 0..1 */

  /* Contour lines: the lines live where fract(v) wraps (d near 0.5),
     not in the band interior. Width is expressed against fwidth so a
     line stays a cell or two wide at any scale. */
  float bands = 13.0;
  float v = field * bands;
  float d = abs(fract(v) - 0.5);
  float distToLine = 0.5 - d;
  float halfWidth = max(fwidth(v) * 1.5, 0.055);
  float lineI = 1.0 - clamp(distToLine / halfWidth, 0.0, 1.0);

  /* Glyph choice: line proximity picks the density; a slow hash tick
     (2.5 steps/sec) swaps within the neighbouring band so the whorl
     feels printed yet alive. Off-line cells stay empty. */
  float maxIdx = u_rampCount - 1.0;
  float base = lineI * maxIdx * 0.75;
  float tick = floor(u_time * 2.5);
  float gate = hash21(cellId + tick * 0.7317);
  float dir = hash21(cellId * 1.3713 + tick * 1.9131);
  float swap = step(0.80, gate) * sign(dir - 0.5);
  float idx = clamp(floor(base + 0.5 + swap * step(0.05, lineI)), 1.0, maxIdx);

  /* The atlas has two rows since lane v2; the ramp lives in the top
     half of the texture (v 0.5..1). */
  vec2 atlasUv = vec2((idx + cellUv.x) / u_rampCount, 0.5 + cellUv.y * 0.5);
  float glyph = texture2D(u_atlas, atlasUv).a;

  /* Fade the whorl out towards the section edges so it sits behind the
     copy as a presence, not a pattern fighting the text. */
  vec2 edge = smoothstep(0.0, 0.16, centre) * smoothstep(1.0, 0.84, centre);
  float mask = edge.x * edge.y;

  float a = glyph * lineI * u_strength * mask;
  vec3 col = mix(u_bg, u_ink, a);
  gl_FragColor = vec4(col, 1.0);
}
`;

/** The character ramp, index 0 (space) to 9 (densest). Shared by the
 *  atlas builder and the page legend so they can never drift apart. */
export const RAMP = [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"];

/** The letter row of the atlas: the letters of SYNTHE plus the digits.
 *  Interior cells of the logo field (and young tendrils) draw from this
 *  row so the mark's body is real characters, not one repeated glyph. */
export const LETTERS = [
  "S", "Y", "N", "T", "H", "E",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
];
