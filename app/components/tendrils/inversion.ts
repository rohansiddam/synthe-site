/* The morph seam's far-ground rect, in page coordinates.
   MorphSeam (the world-flip boundary around the morning report)
   registers the one region of the page whose ground is the opposite
   theme's; the tendril renderer consults this on every frame and
   draws settled cells and heads inside the rect with the inverted
   ink, so tendrils stay visible as they cross the flip and dock at
   the report port. Positions never change — the audit is untouched;
   only the sprite kind differs. One seam exists today, so the
   registry holds a single rect, replaced wholesale on re-measure. */

export type InvRect = { x: number; y: number; w: number; h: number };

let rect: InvRect | null = null;
const subs = new Set<() => void>();

export function setInversionRect(r: InvRect | null) {
  rect = r;
  subs.forEach((f) => f());
}

export function inversionRects(): InvRect[] {
  return rect ? [rect] : [];
}

/* Fires when the rect is (re)registered: the inverted ink colour is
   only knowable once the seam exists in the DOM, so the field
   re-reads its palette and re-bakes the atlas when this changes. */
export function onInversionChange(f: () => void): () => void {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
}
