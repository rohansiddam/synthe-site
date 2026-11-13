/* GLSL sources for the /ascii exploration lane.
 *
 * Two scenes share this module:
 *   1. The logo field (LOGO_VERTEX / LOGO_FRAGMENT): the Synthe mark drawn
 *      out of IBM Plex Mono glyphs. A dense monospace grid samples the logo
 *      texture's luminance per cell and maps it to a character ramp; a
 *      u_time-driven hash flicker swaps glyphs inside their density band;
 *      a u_scroll-driven simplex flow field warps the logo's UVs so the
 *      light/dark boundaries move like liquid displacement while scrolling.
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
uniform sampler2D u_atlas;     /* glyph atlas, one row of u_rampCount glyphs */
uniform vec2  u_resolution;    /* drawing buffer size, px */
uniform float u_cell;          /* monospace cell size, buffer px */
uniform vec2  u_grid;          /* grid dimensions in cells */
uniform float u_time;          /* seconds, frozen under reduced motion */
uniform float u_scroll;        /* smoothed scroll energy, 0..1 */
uniform float u_progress;      /* smoothed scroll progress, 0..1 */
uniform vec2  u_logoOffset;    /* logo rect origin in plane UV */
uniform vec2  u_logoSize;      /* logo rect size in plane UV */
uniform float u_rampCount;     /* glyphs in the ramp (10) */
uniform vec3  u_bg;            /* site --bg */
uniform vec3  u_ink;           /* site --ink: half A tint */
uniform vec3  u_accent;        /* site --accent: half B tint + luminance peaks */
uniform vec3  u_faint;         /* site --muted: ambient speckle */
uniform float u_ambient;       /* ambient speckle strength, 0..1 */
uniform float u_debug;         /* 0 off; 1 raw texture; 2 luminance; 3 ramp index */

varying vec2 vUv;

${NOISE_GLSL}

void main() {
  vec2 cellId = floor(gl_FragCoord.xy / u_cell);
  vec2 cellUv = fract(gl_FragCoord.xy / u_cell);
  vec2 centre = (cellId + 0.5) / u_grid;

  /* --- Scroll flow: warp the logo's UVs with a simplex flow field. ---
     The warp is small at rest (a slow liquid breathing) and grows with
     smoothed scroll energy, so scrolling makes the light/dark boundary
     of the mark swell, drift and fold; the glyph field, being a pure
     function of the warped luminance, ripples with it. Progress also
     slides the noise domain, so scrolling down and up do not replay
     the same warp. */
  vec2 flowP = centre * 3.0;
  vec2 flow = vec2(
    snoise(flowP + vec2(u_time * 0.050 + u_progress * 6.0, u_progress * 2.0)),
    snoise(flowP + vec2(19.19, 7.31) + vec2(-u_time * 0.040, u_progress * 5.0)));
  float warpAmt = 0.010 + u_scroll * 0.13;
  vec2 warped = centre + flow * warpAmt;

  vec2 logoUv = (warped - u_logoOffset) / u_logoSize;
  vec3 tex = texture2D(u_texture, logoUv).rgb;
  float covA = tex.r;
  float covB = tex.g;
  float lum = max(covA, covB);
  bool isB = covB > covA;

  /* --- Luminance to character ramp, with in-band flicker. ---
     The continuous luminance picks the ramp level; a fast hash tick
     (about 11 steps/sec, each cell re-rolled with its own phase) then
     swaps the glyph one level up or down inside its own density band.
     The flicker is masked off in empty background and near-solid fill,
     so the silhouette stays legible while the interior boils. */
  float maxIdx = u_rampCount - 1.0;
  float base = lum * maxIdx;
  float tick = floor(u_time * 11.0);
  float gate = hash21(cellId + tick * 0.7317);
  float dir = hash21(cellId * 1.3713 + tick * 1.9131);
  float swap = step(0.60, gate) * sign(dir - 0.5);
  float flickMask = smoothstep(0.03, 0.18, lum) * (1.0 - smoothstep(0.92, 1.0, lum));
  float idx = clamp(floor(base + 0.5 + swap * flickMask), 0.0, maxIdx);

  /* --- Colour: the mark's halves keep their identity through the map.
     Half A renders in ink, half B in the brick accent. On half A the
     highest luminance band warms slightly toward the accent (a logo is
     flat, so a strong peak blend would flood the whole half; 0.22 keeps
     it a warmth at the crest, not a recolour). */
  vec3 tint = isB ? u_accent : u_ink;
  float peak = smoothstep(0.78, 1.0, lum);
  tint = mix(tint, u_accent, isB ? 0.0 : peak * 0.22);

  vec2 atlasUv = vec2((idx + cellUv.x) / u_rampCount, cellUv.y);
  float glyph = texture2D(u_atlas, atlasUv).a;

  if (u_debug > 0.5 && u_debug < 1.5) { gl_FragColor = vec4(tex, 1.0); return; }
  if (u_debug > 1.5 && u_debug < 2.5) { gl_FragColor = vec4(vec3(lum), 1.0); return; }
  if (u_debug > 2.5) { gl_FragColor = vec4(vec3(idx / maxIdx), 1.0); return; }

  vec3 col = mix(u_bg, tint, glyph);

  /* --- Ambient speckle: far outside the mark, rare noise peaks raise a
     single faint '.' so the empty field is not dead. Kept sparse and
     still (no flicker) on purpose. */
  if (lum < 0.001 && u_ambient > 0.0) {
    float sp = snoise(centre * 22.0 + vec2(u_time * 0.15, -u_time * 0.10));
    float on = step(0.93, sp) * u_ambient;
    if (on > 0.0) {
      vec2 dotUv = vec2((1.0 + cellUv.x) / u_rampCount, cellUv.y);
      float dotGlyph = texture2D(u_atlas, dotUv).a;
      col = mix(col, u_faint, dotGlyph * on * 0.45);
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

  vec2 atlasUv = vec2((idx + cellUv.x) / u_rampCount, cellUv.y);
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
