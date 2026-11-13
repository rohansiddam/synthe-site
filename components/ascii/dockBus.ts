/* The docking bus: the one place where the fixed WebGL logo scene and
 * the in-flow glyph terrain agree about geometry.
 *
 * The terrain is the single source of truth for the boundary's shape.
 * Every frame it is on screen it publishes, in CSS pixels relative to
 * the viewport's top-left:
 *   - its own box (top / bottom),
 *   - its growth (0..1, the smoothed scroll coupling),
 *   - the crest line: one viewport-Y per terrain column.
 *
 * The logo scene reads the crest at each tendril tip's x, turns the
 * distance into a per-anchor target length, and eases its tendrils
 * toward it, so a tendril grows only when a crest exists below it in
 * the frame and stops exactly at the crest. When a tip arrives, the
 * scene publishes a dock for that terrain column; the terrain consumes
 * docks as crest flashes (the receiving column brightens and picks up
 * density), which is what makes the join read as one gesture.
 *
 * Plain mutable module state on purpose: both sides already run their
 * own rAF loops, and a frame-stale read is invisible at these speeds.
 */

export interface TerrainState {
  /** The terrain component has mounted and published at least once. */
  present: boolean;
  /** Smoothed growth, 0..1. */
  growth: number;
  /** Component box in viewport CSS px (top-based). */
  topViewportY: number;
  bottomViewportY: number;
  /** Grid geometry: column count and one column's CSS px width. */
  cols: number;
  colWidthPx: number;
  /** Crest line: viewport CSS px (top-based) of each column's top
   *  cell. Length === cols. Null until first publish. */
  crestViewportY: Float32Array | null;
}

export const dockBus: {
  terrain: TerrainState;
  /** Terrain column index -> performance.now() of the latest dock. */
  flashes: Map<number, number>;
  /** Logo scene -> terrain: a tendril tip has arrived at this column. */
  dock: (column: number) => void;
  /** Terrain column index for a viewport CSS x, or -1 when unknown. */
  columnAt: (cssX: number) => number;
  /** Crest viewport Y at a viewport CSS x (nearest column), or null
   *  when the terrain has not published a crest. */
  crestAt: (cssX: number) => number | null;
} = {
  terrain: {
    present: false,
    growth: 0,
    topViewportY: 0,
    bottomViewportY: 0,
    cols: 0,
    colWidthPx: 0,
    crestViewportY: null,
  },
  flashes: new Map(),
  dock(column: number) {
    this.flashes.set(column, performance.now());
  },
  columnAt(cssX: number) {
    const t = this.terrain;
    if (!t.present || t.colWidthPx <= 0) return -1;
    const c = Math.floor(cssX / t.colWidthPx);
    return c >= 0 && c < t.cols ? c : -1;
  },
  crestAt(cssX: number) {
    const t = this.terrain;
    if (!t.present || !t.crestViewportY) return null;
    const c = this.columnAt(cssX);
    return c < 0 ? null : t.crestViewportY[c];
  },
};
