/* DOM measurement for the tendril engine. Boxes come from
   getBoundingClientRect plus scroll offsets: the offset chain cannot
   be used, because offsetLeft/offsetParent/offsetWidth are undefined
   on SVG elements, which silently collapsed the hero mark's box to
   (0,0) with NaN size. Rects reflect in-flight Reveal transforms,
   but re-measures converge to final geometry and obstacle inflation
   absorbs the drift. The genuinely fixed/sticky pieces (header,
   back-to-top) are measured as dynamic viewport-space obstacles.
   Ports are generic: an element with [data-port] wins, otherwise a
   registry of stable selectors (verified against this site's markup)
   supplies the element, and if a page has no ports at all, section
   boundaries become the ports. */

import { CELL, type DynRect, type PortGeom, type World } from "./engine";

export type Rect = { x: number; y: number; w: number; h: number };

export type MeasureResult = {
  world: World;
  portEls: HTMLElement[]; // index-aligned with world.ports
  auditRects: Rect[]; // raw content rects, for the obstacle audit
  dynRects: DynRect[]; // viewport-space blockers (header, to-top)
};

const PORT_FALLBACKS: { name: string; sel: string }[] = [
  { name: "score", sel: ".cell-score" },
  { name: "diff", sel: ".wx-diff" },
  { name: "checks", sel: ".scene-file" },
  { name: "install", sel: "#start-tonight .step .copy" },
  { name: "docs-hero", sel: ".doc-hero" },
  { name: "docs-checks", sel: "#setup" },
  { name: "docs-install", sel: "#setup .cmd" },
  { name: "report", sel: ".report-band" },
  { name: "footer", sel: ".site-foot" },
];

const OBSTACLE_SEL = [
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "dt", "dd", "td", "th",
  "a", "button", "input", "textarea", "select", "label", "img", "table",
  "pre", "form", "code",
  ".card", ".cmd", ".term", ".warn", ".copy", ".seg", ".wx-diff",
  ".scene-file", ".report-band-lines", ".partner-box", ".hero-emblem",
  ".ascii-mark",
  "[class*='cell']", "[data-port]",
].join(",");

/* Page-space box from the client rect plus the current scroll offset.
   Returns null for zero-size (hidden or collapsed) elements. Note the
   steps strip is deliberately NOT an obstacle: it is a container whose
   interactive children (headings, copy buttons, the seg control) are
   covered by the tag/class selectors above, and stamping the whole
   strip would seal the install port inside it. */
export function pageBox(el: HTMLElement): Rect | null {
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
}

function isFixed(el: HTMLElement) {
  return window.getComputedStyle(el).position === "fixed";
}

function resolvePorts(doc: Document): { ports: PortGeom[]; els: HTMLElement[] } {
  const ports: PortGeom[] = [];
  const els: HTMLElement[] = [];
  const byName = new Map<string, HTMLElement>();

  doc.querySelectorAll<HTMLElement>("[data-port]").forEach((el) => {
    const name = el.getAttribute("data-port");
    if (name && !byName.has(name)) byName.set(name, el);
  });
  for (const fb of PORT_FALLBACKS) {
    if (byName.has(fb.name)) continue;
    const el = doc.querySelector<HTMLElement>(fb.sel);
    if (el) byName.set(fb.name, el);
  }

  if (byName.size === 0) {
    /* Graceful degradation: no ports anywhere, so section boundaries
       become the dock targets. */
    const sections = doc.querySelectorAll<HTMLElement>("main > section, main > div, main > article");
    let i = 0;
    sections.forEach((el) => {
      if (el.offsetHeight >= 60) byName.set(`section-${i++}`, el);
    });
  }

  for (const [name, el] of byName) {
    const box = pageBox(el);
    if (!box || box.w < 4 || box.h < 4) continue;
    ports.push({ name, ...box });
    els.push(el);
  }
  /* Page order, so cascades read top to bottom. */
  const order = ports.map((p, i) => ({ p, i })).sort((a, b) => a.p.y - b.p.y);
  return {
    ports: order.map((o) => o.p),
    els: order.map((o) => els[o.i]),
  };
}

function collectObstacleRects(doc: Document, pageW: number): Rect[] {
  const rects: Rect[] = [];
  const seen = new Set<HTMLElement>();
  doc.querySelectorAll<HTMLElement>(OBSTACLE_SEL).forEach((el) => {
    if (seen.has(el)) return;
    seen.add(el);
    if (el.closest(".tendril-field, .thread-home-layer, .site-head")) return;
    if (isFixed(el)) return;
    const box = pageBox(el);
    if (!box) return;
    if (box.w < 6 || box.h < 6) return;
    /* A full-bleed section (the report band at phone widths, where
       its rect spans the whole page with the gutters as its own
       padding) is ground, not a wall: stamping it seals the grid
       across the full width and nothing below it can ever be
       reached. Its content children are collected on their own and
       stay walls, exactly like every other section's. */
    if (box.w >= pageW - 2) return;
    if (box.y > -50 && box.w * box.h > 900_000) return; // containers, not content
    rects.push(box);
  });
  return rects;
}

function heroSources(doc: Document, vh: number, gutterL: number, gutterR: number): { x: number; y: number }[] {
  const marks: HTMLElement[] = [];
  doc.querySelectorAll<HTMLElement>("svg.mark, .wordmark-logo").forEach((el) => marks.push(el));
  let best: { box: Rect; area: number } | null = null;
  for (const el of marks) {
    /* The header wordmark sits in the sticky header: its rect is
       viewport-space, which equals its page position at scroll 0,
       where the sources belong. */
    let box: Rect | null;
    if (el.closest(".site-head")) {
      const r = el.getBoundingClientRect();
      box = r.width === 0 && r.height === 0 ? null : { x: r.left, y: r.top, w: r.width, h: r.height };
    } else {
      box = pageBox(el);
    }
    if (!box) continue;
    if (box.y > vh * 1.15) continue; // the hero zone only
    const area = box.w * box.h;
    if (!best || area > best.area) best = { box, area };
  }
  if (best) {
    const { box } = best;
    const pts: { x: number; y: number }[] = [];
    for (const f of [0.18, 0.38, 0.58, 0.78]) {
      pts.push({ x: box.x + box.w * f, y: box.y + box.h + 5 });
    }
    return pts;
  }
  return [
    { x: gutterL, y: vh * 0.72 },
    { x: gutterR, y: vh * 0.72 },
  ];
}

export function measure(doc: Document): MeasureResult {
  const de = doc.documentElement;
  const pageW = Math.max(de.scrollWidth, doc.body?.scrollWidth ?? 0);
  const pageH = Math.max(de.scrollHeight, doc.body?.scrollHeight ?? 0);
  const vh = window.innerHeight;
  const cols = Math.max(8, Math.ceil(pageW / CELL));
  const rows = Math.max(8, Math.ceil(pageH / CELL));
  const narrow = pageW <= 640;
  const inflation = narrow ? 5 : 10;
  const portInflation = narrow ? 4 : 6;

  const { ports, els: portEls } = resolvePorts(doc);
  const obstacles = collectObstacleRects(doc, pageW);

  const blocked = new Uint8Array(cols * rows);
  const stamp = (r: Rect, infl: number) => {
    const x0 = Math.max(0, Math.floor((r.x - infl) / CELL));
    const x1 = Math.min(cols - 1, Math.ceil((r.x + r.w + infl) / CELL));
    const y0 = Math.max(0, Math.floor((r.y - infl) / CELL));
    const y1 = Math.min(rows - 1, Math.ceil((r.y + r.h + infl) / CELL));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const px = cx * CELL + CELL / 2;
        const py = cy * CELL + CELL / 2;
        if (px >= r.x - infl && px <= r.x + r.w + infl && py >= r.y - infl && py <= r.y + r.h + infl) {
          blocked[cy * cols + cx] = 1;
        }
      }
    }
  };
  for (const r of obstacles) stamp(r, inflation);
  /* Ports are content too: their faces are walls, their edges dock.
     Full-bleed ports are the exception, for the same reason as in
     collectObstacleRects: the report band's face at phone widths is
     the page's own ground (its lines are stamped as content), and
     stamping the band would seal the grid above the footer. Its
     dock anchor is then found on its top edge, which is its shore
     by design. */
  for (const p of ports) {
    if (p.w >= pageW - 2) continue;
    stamp(p, portInflation);
  }

  /* Dock anchors: the free cell nearest each port rect (expanding
     Chebyshev rings, up to ~200px). Interior ports are sealed by
     neighbouring obstacles, so the nearest reachable ground is the
     only place a tip can ever arrive; docking there is docking at
     the port. Anchors are cell indices, matching the engine's head
     cell space. */
  for (const p of ports) {
    const cx0 = Math.floor(p.x / CELL);
    const cx1 = Math.ceil((p.x + p.w) / CELL);
    const cy0 = Math.floor(p.y / CELL);
    const cy1 = Math.ceil((p.y + p.h) / CELL);
    let found: { cx: number; cy: number; d: number } | null = null;
    for (let r = 0; r <= 18 && !found; r++) {
      for (let cy = cy0 - r; cy <= cy1 + r; cy++) {
        for (let cx = cx0 - r; cx <= cx1 + r; cx++) {
          if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
          if (cx > cx0 - r && cx < cx1 + r && cy > cy0 - r && cy < cy1 + r) continue; // ring only
          if (blocked[cy * cols + cx]) continue;
          const px = cx * CELL + CELL / 2;
          const py = cy * CELL + CELL / 2;
          const dx = Math.max(p.x - px, 0, px - (p.x + p.w));
          const dy = Math.max(p.y - py, 0, py - (p.y + p.h));
          const d = Math.hypot(dx, dy);
          if (!found || d < found.d) found = { cx, cy, d };
        }
      }
    }
    if (found) {
      p.dockX = found.cx;
      p.dockY = found.cy;
    }
  }

  /* Per-port BFS distance fields over free cells (8-neighbourhood,
     diagonals only when both orthogonal neighbours are free, so the
     field never leaks through a diagonal wall contact). Seekers
     descend these gradients: no local minima, and a port whose
     anchor cannot be reached simply has an empty field and is
     skipped by seekers. Cost: one grid pass per port at measure
     time, negligible next to the stamping above. */
  const distFields: Int32Array[] = ports.map((p) => {
    const dist = new Int32Array(cols * rows).fill(-1);
    if (p.dockX === undefined || p.dockY === undefined) return dist;
    const root = p.dockY * cols + p.dockX;
    if (blocked[root]) return dist;
    dist[root] = 0;
    const queue = [root];
    for (let qi = 0; qi < queue.length; qi++) {
      const cur = queue[qi];
      const cx = cur % cols;
      const cy = Math.floor(cur / cols);
      const d = dist[cur] + 1;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const ni = ny * cols + nx;
          if (dist[ni] !== -1 || blocked[ni]) continue;
          if (dx !== 0 && dy !== 0 && (blocked[cy * cols + nx] || blocked[ny * cols + cx])) continue;
          dist[ni] = d;
          queue.push(ni);
        }
      }
    }
    return dist;
  });

  /* Rail + gutters from the constrained sections, page-agnostic. */
  let railL = Infinity;
  let railR = -Infinity;
  doc.querySelectorAll<HTMLElement>("main section, main .doc, .report-band, .site-foot").forEach((el) => {
    const box = pageBox(el);
    if (!box) return;
    if (box.w < 200 || box.w > pageW - 16) return;
    railL = Math.min(railL, box.x);
    railR = Math.max(railR, box.x + box.w);
  });
  if (!isFinite(railL)) {
    railL = 0;
    railR = pageW;
  }
  const gutL0 = 4;
  const gutL1 = Math.max(gutL0 + 4, railL - 4);
  const gutR0 = Math.min(pageW - 4, railR + 4);
  const gutR1 = pageW - 4;
  const inGutter = (px: number) => (px >= gutL0 && px <= gutL1) || (px >= gutR0 && px <= gutR1);
  const gutterCenterL = (gutL0 + gutL1) / 2;
  const gutterCenterR = (gutR0 + gutR1) / 2;

  /* Cost field: channels cheap, open ground neutral, halos dear. */
  const cost = new Float32Array(cols * rows).fill(1.15);
  const sectionTops: number[] = [];
  doc.querySelectorAll<HTMLElement>("main > section, main > div, .report-band, .site-foot").forEach((el) => {
    const box = pageBox(el);
    if (box && box.h > 40) sectionTops.push(box.y);
  });
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const i = cy * cols + cx;
      if (blocked[i]) continue;
      const px = cx * CELL + CELL / 2;
      const py = cy * CELL + CELL / 2;
      if (inGutter(px)) cost[i] = 0.45;
      for (const top of sectionTops) {
        if (py < top - 3 && py > top - CELL * 2.4) cost[i] = Math.min(cost[i], 0.7);
      }
    }
  }
  /* Obstacle repulsion: a smooth gradient off every wall, not a
     single dear ring. A one-ring halo at flat cost lets a tip skate
     the perimeter at constant score and trace the outline of the
     block it is skirting; a gradient makes every step along the wall
     lose to the step away from it, so heads deflect into open
     channel well before they can slide. Multi-source BFS from the
     walls, four cells deep, gives each free cell its distance to the
     nearest wall; strength falls 1 / 0.55 / 0.3 / 0.15 across it.
     Gentler inside the gutters, where the channel is tight by
     nature, but the gradient still centres tendrils in the channel
     instead of hugging its edges. */
  const haloDist = new Uint8Array(cols * rows);
  {
    const queue: number[] = [];
    for (let i = 0; i < cols * rows; i++) if (blocked[i]) queue.push(i);
    for (let qi = 0; qi < queue.length; qi++) {
      const cur = queue[qi];
      const d = haloDist[cur] + 1;
      if (d > 4) continue;
      const cx = cur % cols;
      const cy = Math.floor(cur / cols);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const ni = ny * cols + nx;
          if (blocked[ni] || haloDist[ni] !== 0) continue;
          if (dx !== 0 && dy !== 0 && (blocked[cy * cols + nx] || blocked[ny * cols + cx])) continue;
          haloDist[ni] = d;
          queue.push(ni);
        }
      }
    }
  }
  const HALO_STRENGTH = [0, 1, 0.55, 0.3, 0.15];
  const halo = new Float32Array(cols * rows);
  for (let i = 0; i < cols * rows; i++) {
    if (blocked[i]) continue;
    const s = HALO_STRENGTH[haloDist[i]] ?? 0;
    halo[i] = s;
    if (s > 0) {
      const px = (i % cols) * CELL + CELL / 2;
      const repel = 1.15 + s * (inGutter(px) ? 1.8 : 3.4);
      if (repel > cost[i]) cost[i] = repel;
    }
  }

  /* Dynamic viewport obstacles: the sticky header and the fixed
     back-to-top button travel with the visitor; tendrils must never
     slide under them. */
  const dynRects: DynRect[] = [];
  const head = doc.querySelector<HTMLElement>(".site-head");
  if (head) {
    const r = head.getBoundingClientRect();
    if (r.height > 0) dynRects.push({ x: 0, y: 0, w: pageW, h: r.height + 6 });
    /* The opened phone menu panel can extend past the header's own
       box; block its real extent too. */
    const nav = doc.querySelector<HTMLElement>("#topnav");
    if (nav) {
      const nr = nav.getBoundingClientRect();
      if (nr.width > 0 && nr.height > 0 && nr.bottom > r.bottom) {
        dynRects.push({ x: nr.x, y: nr.y, w: nr.width, h: nr.height });
      }
    }
  }
  const toTop = doc.querySelector<HTMLElement>(".to-top");
  if (toTop) {
    const r = toTop.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) dynRects.push({ x: r.x, y: r.y, w: r.width, h: r.height });
  }

  /* Hero sources must start BELOW the header's dynamic obstacle
     strip: a tip spawned inside it can never cross the strip's edge
     in sub-cell steps and dies trapped under the header. Sources
     emerge just under the header at the mark's x positions. */
  const sources = heroSources(doc, vh, gutterCenterL, gutterCenterR);
  const headerStrip = dynRects.find((r) => r.y <= 1 && r.x <= 1);
  if (headerStrip) {
    const minY = headerStrip.h + 10;
    for (const s of sources) if (s.y < minY) s.y = minY;
  }

  const regionRows = Math.max(12, Math.round(vh / CELL));
  const world: World = {
    pageW,
    pageH,
    cols,
    rows,
    blocked,
    cost,
    halo,
    ports,
    heroSources: sources,
    regionRows,
    distFields,
  };

  /* Anchored approach paths: for each port, walk steepest descent on
     its own distance field from the cascade's staging cell (the
     previous port's anchor; the first hero source for the first
     port) down to the anchor. The result is the concrete route a
     seeker follows on final approach. Recomputed on every measure,
     so resize and font swaps re-anchor the paths to live geometry. */
  for (let i = 0; i < ports.length; i++) {
    const p = ports[i];
    const field = distFields[i];
    if (p.dockX === undefined || p.dockY === undefined) continue;
    let sx: number;
    let sy: number;
    if (i === 0) {
      const s = sources[0] ?? { x: gutterCenterL, y: vh * 0.3 };
      sx = Math.floor(s.x / CELL);
      sy = Math.floor(s.y / CELL);
    } else {
      const prev = ports[i - 1];
      if (prev.dockX === undefined || prev.dockY === undefined) continue;
      sx = prev.dockX;
      sy = prev.dockY;
    }
    sx = Math.min(cols - 1, Math.max(0, sx));
    sy = Math.min(rows - 1, Math.max(0, sy));
    const start = sy * cols + sx;
    if (field[start] < 0) continue; // staging ground cannot reach this port
    const route: number[] = [start];
    let cur = start;
    let guard = 0;
    while (field[cur] > 0 && guard++ < 6000) {
      const cx = cur % cols;
      const cy = Math.floor(cur / cols);
      let next = -1;
      let nextD = field[cur];
      let nextCost = Infinity;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const ni = ny * cols + nx;
          const d = field[ni];
          if (d < 0 || d > field[cur]) continue;
          /* Tie-break on cost plus repulsion: among equal-distance
             steps, the anchored route runs mid-channel instead of
             hugging the wall the shortest path would skim. */
          const key = cost[ni] + halo[ni] * 2.0;
          if (d < nextD || (d === nextD && key < nextCost)) {
            next = ni;
            nextD = d;
            nextCost = key;
          }
        }
      }
      if (next < 0) break;
      route.push(next);
      cur = next;
    }
    if (field[cur] === 0) p.approach = route;
  }

  return { world, portEls, auditRects: obstacles, dynRects };
}
