/* Math helpers for the AsciiMark emblem: a scalar JS port of the same
   Ashima / Ian McEwan 2D simplex noise the /ascii lane's GLSL uses, the
   same hash21 cell hash, and the small interpolation helpers the logo
   shader's breakup math is written in. Ported function-for-function so
   the emblem's interior zones land where the shader's did. */

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** GLSL smoothstep: 0 at edge0, 1 at edge1, smooth in between. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function fract(x: number): number {
  return x - Math.floor(x);
}

function mod289(x: number): number {
  return x - Math.floor(x * (1 / 289)) * 289;
}

/* The GLSL permute: mod(((x*34)+1)*x, 289). */
function permute289(x: number): number {
  return mod289((x * 34 + 1) * x);
}

function taylorInvSqrt(r: number): number {
  return 1.79284291400159 - 0.85373472095314 * r;
}

/** Ashima 2D simplex noise, scalar port of the NOISE_GLSL snoise. */
export function snoise(vx: number, vy: number): number {
  const Cx = 0.211324865405187; // C.x
  const Cy = 0.366025403784439; // C.y
  const Cz = -0.577350269189626; // C.z
  const Cw = 0.024390243902439; // C.w

  const s = (vx + vy) * Cy;
  const ix = Math.floor(vx + s);
  const iy = Math.floor(vy + s);
  const t = (ix + iy) * Cx;
  const x0x = vx - ix + t;
  const x0y = vy - iy + t;

  const i1x = x0x > x0y ? 1 : 0;
  const i1y = x0x > x0y ? 0 : 1;

  // x12 = x0.xyxy + C.xxzz, then x12.xy -= i1
  const x12x = x0x + Cx - i1x;
  const x12y = x0y + Cx - i1y;
  const x12z = x0x + Cz;
  const x12w = x0y + Cz;

  const mx = mod289(ix);
  const my = mod289(iy);

  const p0 = permute289(permute289(my + 0) + mx + 0);
  const p1 = permute289(permute289(my + i1y) + mx + i1x);
  const p2 = permute289(permute289(my + 1) + mx + 1);

  let m0 = Math.max(0.5 - (x0x * x0x + x0y * x0y), 0);
  let m1 = Math.max(0.5 - (x12x * x12x + x12y * x12y), 0);
  let m2 = Math.max(0.5 - (x12z * x12z + x12w * x12w), 0);
  m0 *= m0 * m0 * m0;
  m1 *= m1 * m1 * m1;
  m2 *= m2 * m2 * m2;

  // gx = 2 * fract(p * C.www) - 1; h = abs(gx) - 0.5; ox = floor(gx + 0.5); a0 = gx - ox
  const gx0 = 2 * fract(p0 * Cw) - 1;
  const gx1 = 2 * fract(p1 * Cw) - 1;
  const gx2 = 2 * fract(p2 * Cw) - 1;
  const h0 = Math.abs(gx0) - 0.5;
  const h1 = Math.abs(gx1) - 0.5;
  const h2 = Math.abs(gx2) - 0.5;
  const ox0 = Math.floor(gx0 + 0.5);
  const ox1 = Math.floor(gx1 + 0.5);
  const ox2 = Math.floor(gx2 + 0.5);
  const a00 = gx0 - ox0;
  const a01 = gx1 - ox1;
  const a02 = gx2 - ox2;

  m0 *= taylorInvSqrt(a00 * a00 + h0 * h0);
  m1 *= taylorInvSqrt(a01 * a01 + h1 * h1);
  m2 *= taylorInvSqrt(a02 * a02 + h2 * h2);

  const g0 = a00 * x0x + h0 * x0y;
  const g1 = a01 * x12x + h1 * x12y;
  const g2 = a02 * x12z + h2 * x12w;

  return 130 * (m0 * g0 + m1 * g1 + m2 * g2);
}

/** GLSL hash21 from the logo shader: deterministic per-cell hash. */
export function hash21(px: number, py: number): number {
  let x = fract(px * 234.34);
  let y = fract(py * 435.345);
  const d = x * (x + 34.23) + y * (y + 34.23);
  x += d;
  y += d;
  return fract(x * y);
}
