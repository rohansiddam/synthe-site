import * as THREE from "three";
import { HALF_A, HALF_B } from "../../app/components/Mark";
import { RAMP } from "./shaders";

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
  const canvas = document.createElement("canvas");
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  const scale = MARK_HEIGHT / 290; // the mark's viewBox is 275 x 290
  const markWidth = 275 * scale;
  ctx.translate((TEX_SIZE - markWidth) / 2, (TEX_SIZE - MARK_HEIGHT) / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ff0000";
  ctx.fill(new Path2D(HALF_A));
  ctx.fillStyle = "#00ff00";
  ctx.fill(new Path2D(HALF_B));

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

/* The mark's height as a fraction of the raster texture (the shader's
   logo rect is computed against the whole texture; this converts a
   desired on-screen mark height into rect units). */
export const MARK_FRACTION = MARK_HEIGHT / TEX_SIZE;

/* ------------------------------------------------------------------ */
/* Glyph atlas                                                         */
/*                                                                     */
/* One row of glyphs from RAMP, drawn on a canvas in IBM Plex Mono     */
/* (the site's mono face) once the webfont is ready, and uploaded as   */
/* a texture. The fragment shader samples a cell's glyph by index:     */
/* uv.x = (index + in-cell x) / rampCount. Glyphs are white on         */
/* transparent; only the alpha channel is read. The font is drawn      */
/* LARGER than the atlas cell (152px in a 128px cell) so each glyph's  */
/* ink fills its cell the way a character fills a terminal cell; an    */
/* earlier tuning that padded the glyphs down to a third of the cell  */
/* read on screen as sparse dots instead of type.                      */
/* ------------------------------------------------------------------ */

export const ATLAS_CELL = 128;

export async function createGlyphAtlas(): Promise<THREE.Texture> {
  try {
    await document.fonts.load('500 100px "IBM Plex Mono"');
    await document.fonts.ready;
  } catch {
    /* Fall back to whatever mono face is available. */
  }

  const n = RAMP.length;
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_CELL * n;
  canvas.height = ATLAS_CELL;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = '500 152px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  RAMP.forEach((ch, i) => {
    if (ch !== " ") {
      ctx.fillText(ch, ATLAS_CELL * (i + 0.5), ATLAS_CELL * 0.52);
    }
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  return tex;
}
