import * as THREE from "three";
import { HALF_A, HALF_B } from "../../app/components/Mark";
import { LETTERS, RAMP } from "./shaders";

/* ------------------------------------------------------------------ */
/* Logo texture                                                        */
/*                                                                     */
/* The shader wants the mark as data, not as a picture: the R channel  */
/* holds half A's coverage and the G channel holds half B's, so the    */
/* fragment shader can take luminance from max(R, G) while still       */
/* knowing which half of the mark each cell belongs to (the halves     */
/* keep their ink / brick identity through the text mapping).          */
/*                                                                     */
/* ONE-LINE SWAP: to feed the scene a real .png instead, set           */
/* LOGO_PNG_URL to its path (e.g. "/mark.png"). It loads through the   */
/* standard THREE.TextureLoader below. Note a photographic PNG has     */
/* no channel split, so both halves would read as half A; the          */
/* rasterized path is the one that preserves the two halves.           */
/* ------------------------------------------------------------------ */

export const LOGO_PNG_URL: string | null = null;

const TEX_SIZE = 880; // raster canvas, px (square, with transparent padding)
const MARK_HEIGHT = 800; // the mark's height inside it; the rest is padding

/* The rasterized mark, drawn once and shared between the texture and
   the tendril anchor scan. Half A fills the R channel, half B the G
   channel, over transparency. */
let rasterCache: HTMLCanvasElement | null = null;

export function getMarkRaster(): HTMLCanvasElement {
  if (rasterCache) return rasterCache;
  const canvas = document.createElement("canvas");
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const scale = MARK_HEIGHT / 290; // the mark's viewBox is 275 x 290
    const markWidth = 275 * scale;
    ctx.translate((TEX_SIZE - markWidth) / 2, (TEX_SIZE - MARK_HEIGHT) / 2);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ff0000";
    ctx.fill(new Path2D(HALF_A));
    ctx.fillStyle = "#00ff00";
    ctx.fill(new Path2D(HALF_B));
  }
  rasterCache = canvas;
  return canvas;
}

export function createLogoTexture(): THREE.Texture {
  if (LOGO_PNG_URL) {
    const tex = new THREE.TextureLoader().load(LOGO_PNG_URL);
    tex.colorSpace = THREE.NoColorSpace;
    return tex;
  }

  /* Rasterize the exact brand SVG: the same path data Mark.tsx renders,
     drawn with Path2D at load time. Nothing is redrawn or approximated;
     half A fills the R channel, half B the G channel, over transparency
     so the clamped texture edges sample as empty. */
  const tex = new THREE.CanvasTexture(getMarkRaster());
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

/* ------------------------------------------------------------------ */
/* Tendril anchors                                                     */
/*                                                                     */
/* The hero shader extrudes glyph tendrils from the mark's lower       */
/* contour. It cannot afford to search the texture per fragment, so    */
/* the search happens here, once: for each of 16 candidate columns     */
/* across the mark, scan the raster bottom-up for the lowest covered   */
/* texel and record it as an anchor in texture space: (u, bottomV,     */
/* half, active). bottomV is in texture UV (v = 0 at the canvas        */
/* bottom, because the CanvasTexture flipY puts canvas row 0 at v=1).  */
/* Columns whose strip never meets the mark stay inactive.             */
/* ------------------------------------------------------------------ */

export interface TendrilAnchors {
  anchors: THREE.Vector4[];
  maxBottomV: number;
}

export function computeTendrilAnchors(): TendrilAnchors {
  const COUNT = 16;
  const fallback: TendrilAnchors = {
    anchors: Array.from({ length: COUNT }, () => new THREE.Vector4(0, 0, 0, 0)),
    maxBottomV: 0,
  };
  const canvas = getMarkRaster();
  const ctx = canvas.getContext("2d");
  if (!ctx) return fallback;
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
  } catch {
    return fallback;
  }
  const px = data.data;
  const anchors: THREE.Vector4[] = [];
  let maxBottomV = 0;
  for (let i = 0; i < COUNT; i++) {
    const u = 0.1 + (0.8 * i) / (COUNT - 1);
    const cx = Math.round(u * (TEX_SIZE - 1));
    let found = -1;
    let half = 0;
    for (let y = TEX_SIZE - 1; y >= 0 && found < 0; y--) {
      for (let dx = -1; dx <= 1 && found < 0; dx++) {
        const x = Math.min(TEX_SIZE - 1, Math.max(0, cx + dx));
        const o = (y * TEX_SIZE + x) * 4;
        if (px[o + 3] > 110) {
          found = y;
          half = px[o + 1] > px[o] ? 1 : 0;
        }
      }
    }
    if (found < 0) {
      anchors.push(new THREE.Vector4(u, 0, 0, 0));
    } else {
      const bottomV = 1 - (found + 0.5) / TEX_SIZE;
      maxBottomV = Math.max(maxBottomV, bottomV);
      anchors.push(new THREE.Vector4(u, bottomV, half, 1));
    }
  }
  return { anchors, maxBottomV };
}

/* The mark's height as a fraction of the raster texture (the shader's
   logo rect is computed against the whole texture; this converts a
   desired on-screen mark height into rect units). */
export const MARK_FRACTION = MARK_HEIGHT / TEX_SIZE;

/* ------------------------------------------------------------------ */
/* Glyph atlas                                                         */
/*                                                                     */
/* Two rows of glyphs drawn on a canvas in IBM Plex Mono (the site's   */
/* mono face) once the webfont is ready, and uploaded as a texture.    */
/* The TOP row is the density ramp (RAMP); the BOTTOM row is letters   */
/* and digits (LETTERS) for the logo field's interior. Because the     */
/* CanvasTexture flipY puts canvas row 0 at v = 1, the shader finds    */
/* the ramp at v 0.5..1 and the letters at v 0..0.5.                   */
/*                                                                     */
/* LAYOUT CONTRACT: the shader maps each row across the FULL texture  */
/* width with that row's own count (uv.x = (index + x) / rowCount),    */
/* so each row's glyphs must be spread across the full canvas width   */
/* at its own spacing: ramp glyphs sit every canvas.width/10 px,       */
/* letters every canvas.width/16 px, each drawn at a font size that    */
/* keeps the ink-to-cell ratio (~1.15) the v1 tuning established: a    */
/* glyph drawn much smaller than its cell reads as stipple, not type.  */
/* Rows are 176px tall so a tall glyph cannot bleed ink into the       */
/* neighbouring row's sampling band.                                  */
/* ------------------------------------------------------------------ */

export const ATLAS_CELL = 128;
export const ATLAS_ROW_H = 176;

export async function createGlyphAtlas(): Promise<THREE.Texture> {
  try {
    await document.fonts.load('500 100px "IBM Plex Mono"');
    await document.fonts.ready;
  } catch {
    /* Fall back to whatever mono face is available. */
  }

  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_CELL * LETTERS.length;
  canvas.height = ATLAS_ROW_H * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const rampStep = canvas.width / RAMP.length;
  ctx.font = '500 232px "IBM Plex Mono", ui-monospace, monospace';
  RAMP.forEach((ch, i) => {
    if (ch !== " ") {
      ctx.fillText(ch, rampStep * (i + 0.5), ATLAS_ROW_H * 0.5 + 6);
    }
  });
  const letterStep = canvas.width / LETTERS.length;
  ctx.font = '500 152px "IBM Plex Mono", ui-monospace, monospace';
  LETTERS.forEach((ch, i) => {
    ctx.fillText(ch, letterStep * (i + 0.5), ATLAS_ROW_H * 1.5 + 4);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  return tex;
}
