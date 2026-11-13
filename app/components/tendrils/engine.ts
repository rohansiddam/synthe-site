/* The tendril engine: a page-space glyph simulation with no DOM in it.
   The page is a grid of CELL px squares. Tips wander it on their own
   clocks, steered by a cost field (gutters and section edges are cheap,
   obstacle halos are dear, obstacles are walls), lay a persistent glyph
   trail, fork into thinner children, dock at ports, and retire. Settled
   cells thin very slowly; a per-region density budget keeps the page
   from ever looking hairy. Everything the component needs to draw is
   exposed as plain data: the trail arrays, the live tips, the pulses. */

export const CELL = 11;

/* Glyph atlas. A trail cell stores one byte: family * 32 + seed.
   Family 0 renders from the density ramp (so a thinning cell visibly
   steps down the ramp as it fades), 1 is a letter of SYNTHE, 2 a digit. */
/* Trail ramp: six visible glyphs, kept short on purpose (the dense
   ramp lives in the emblem, not in the trails). */
export const RAMP = " .:-=+*";
export const LETTERS = "SYNTHE";
export const DIGITS = "0123456789";
export const FAMILY_RAMP = 0;
export const FAMILY_LETTER = 1;
export const FAMILY_DIGIT = 2;

export type PortGeom = {
  name: string;
  x: number; // page px
  y: number;
  w: number;
  h: number;
  /* Dock anchor: the free cell nearest the port's rect, in cell
     units. Interior ports (a card inside a card) are sealed off by
     other obstacles, so a tip can never get within docking distance
     of the rect itself; reaching the anchor is reaching the port. */
  dockX?: number;
  dockY?: number;
  /* Anchored approach path: the concrete cell route (staging cell to
     anchor) a seeker follows on final approach, extracted from this
     port's distance field at measure time. Free wander governs the
     page; the last stretch to a dock is path-following, because
     docking precision is where pure simulation wanders off. */
  approach?: number[];
};

export type DynRect = { x: number; y: number; w: number; h: number }; // viewport px

export type World = {
  pageW: number;
  pageH: number;
  cols: number;
  rows: number;
  blocked: Uint8Array;
  cost: Float32Array;
  ports: PortGeom[];
  heroSources: { x: number; y: number }[]; // page px
  regionRows: number; // grid rows per density region (~one viewport)
  /* Per-port BFS distance fields (cell units, -1 = unreachable),
     aligned with ports. Seekers descend the gradient, which routes
     around obstacles with no local minima. */
  distFields: Int32Array[];
};

export type TipState = "grow" | "docked";

export type Tip = {
  x: number; // float, cell units
  y: number;
  heading: number; // radians, 0 = +x, PI/2 = down
  speed: number; // cells per second
  width: number; // 0..1 girth: glyph heaviness + fork eligibility
  seed: number;
  age: number; // seconds
  maxAge: number;
  traveled: number; // cells
  maxLen: number;
  stuck: number; // seconds without progress
  state: TipState;
  dockPort: number; // port index while docked, else -1
  dockLeft: number; // seconds of dock remaining
  path: number[]; // cell indices, in growth order
  fromPort: number; // port index this tip sprouted from, -1 = hero
  target: number; // port index this tip is seeking, -1 = pure wanderer
  wp: number; // cursor into the target's approach path, -1 = not on it
};

export type Pulse = {
  path: number[];
  pos: number; // float index into path
  speed: number; // cells per second
};

export type DockEvent = { port: number; name: string; at: number };

const TAU = Math.PI * 2;

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* Smooth per-tip wander: summed sines with irrational ratios, so a
   heading drifts organically and never repeats on a human timescale. */
function wander(seed: number, t: number) {
  return (
    Math.sin(t * 0.37 + seed * 12.9) * 0.52 +
    Math.sin(t * 0.91 + seed * 27.3) * 0.31 +
    Math.sin(t * 2.13 + seed * 41.7) * 0.17
  );
}

function angDiff(a: number, b: number) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export class TendrilEngine {
  world: World;
  trail: Float32Array; // settled density 0..1
  glyph: Uint8Array; // family * 32 + seed
  tips: Tip[] = [];
  paths: number[][] = []; // retired paths, pulse pool
  pulses: Pulse[] = [];
  dockLog: DockEvent[] = [];
  portDockedAt: Float32Array; // engine-time of last dock per port
  portDockCount: Uint8Array;
  time = 0;
  version = 0; // bumped when anything renderable changes
  wholePageActive = false; // reduced-motion pregrow: no dormancy window
  onDock: ((port: number) => void) | null = null;
  /* Device-tier knobs, set by the component: concurrent-tip cap,
     density-budget scale, and the tier's named glyph budget (the
     governor steps these down under load). */
  maxTips = 12;
  budgetScale = 1;
  glyphBudget = Infinity; // max settled glyph cells, page-wide

  private stepCount = 0;
  decayEvery = 1; // pregrow raises this so decay is not paid per step

  private dynRects: DynRect[] = [];
  private explored = new Float32Array(0);
  private regionTrail = new Int32Array(0);
  private recountAt = 0;
  private heroTimer = 3; // first hero respawn check
  private pulseTimer = 6;
  private rngState = 1234567;

  constructor(world: World) {
    this.world = world;
    const n = world.cols * world.rows;
    this.trail = new Float32Array(n);
    this.glyph = new Uint8Array(n);
    this.portDockedAt = new Float32Array(world.ports.length).fill(-1000);
    this.portDockCount = new Uint8Array(world.ports.length);
    this.recount();
  }

  private rand() {
    this.rngState = (this.rngState * 1103515245 + 12345) & 0x7fffffff;
    return this.rngState / 0x7fffffff;
  }

  setWorld(world: World) {
    const old = this.world;
    const oldTrail = this.trail;
    const oldGlyph = this.glyph;
    this.world = world;
    const n = world.cols * world.rows;
    this.trail = new Float32Array(n);
    this.glyph = new Uint8Array(n);
    const cw = Math.min(old.cols, world.cols);
    const ch = Math.min(old.rows, world.rows);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const o = y * old.cols + x;
        const m = y * world.cols + x;
        /* Prune on copy: layout can shift between measures (font
           swaps, late images), and a settled glyph must never end up
           inside the new world's obstacles. */
        if (world.blocked[m]) continue;
        this.trail[m] = oldTrail[o];
        this.glyph[m] = oldGlyph[o];
      }
    }
    this.portDockedAt = new Float32Array(world.ports.length).fill(-1000);
    this.portDockCount = new Uint8Array(world.ports.length);
    for (const tip of this.tips) {
      tip.x = Math.min(Math.max(tip.x, 1), world.cols - 2);
      tip.y = Math.min(Math.max(tip.y, 1), world.rows - 2);
      tip.path = [];
      tip.wp = -1; // approach paths were re-anchored with the world
    }
    this.paths = [];
    this.pulses = [];
    this.recount();
    this.version++;
  }

  setDynRects(rects: DynRect[]) {
    this.dynRects = rects;
  }

  /* ---- grid helpers ------------------------------------------------ */

  idx(cx: number, cy: number) {
    return cy * this.world.cols + cx;
  }

  inBounds(cx: number, cy: number) {
    return cx >= 0 && cy >= 0 && cx < this.world.cols && cy < this.world.rows;
  }

  blockedAt(cx: number, cy: number, scrollY: number) {
    if (!this.inBounds(cx, cy)) return true;
    if (this.world.blocked[cy * this.world.cols + cx]) return true;
    if (this.dynRects.length) {
      const px = cx * CELL + CELL / 2;
      const py = cy * CELL + CELL / 2 - scrollY;
      for (const r of this.dynRects) {
        if (px >= r.x - 3 && px <= r.x + r.w + 3 && py >= r.y - 3 && py <= r.y + r.h + 3)
          return true;
      }
    }
    return false;
  }

  private costAt(cx: number, cy: number, scrollY: number) {
    if (this.blockedAt(cx, cy, scrollY)) return Infinity;
    let c = this.world.cost[cy * this.world.cols + cx];
    /* Novelty: under-explored regions pull gently. */
    const region = Math.min(
      this.explored.length - 1,
      Math.max(0, Math.floor(cy / this.world.regionRows)),
    );
    if (this.explored.length) c *= 0.9 + 0.2 * (this.explored[region] ?? 0);
    return c;
  }

  /* ---- spawning ---------------------------------------------------- */

  spawn(xPx: number, yPx: number, heading: number, width: number, fromPort: number) {
    const w = this.world;
    const x = xPx / CELL;
    const y = yPx / CELL;
    const cx = Math.round(x);
    const cy = Math.round(y);
    if (this.blockedAt(cx, cy, 0) && !this.wholePageActive) {
      /* Nudge down until a free cell appears (sources sit just above
         content edges; the first free cell below is the channel). */
      let ny = cy;
      while (ny < w.rows - 1 && this.blockedAt(cx, ny, 0)) ny++;
      if (ny >= w.rows - 1) return null;
      return this.makeTip(cx + 0.5, ny + 0.5, heading, width, fromPort);
    }
    return this.makeTip(x, y, heading, width, fromPort);
  }

  private makeTip(x: number, y: number, heading: number, width: number, fromPort: number) {
    if (this.tips.length >= this.maxTips) return null;
    const tip: Tip = {
      x,
      y,
      heading,
      speed: 2 + this.rand() * 4, // 2..6 cells per second
      width,
      seed: this.rand() * 100,
      age: 0,
      maxAge: 80 + this.rand() * 90,
      traveled: 0,
      maxLen: 700 + this.rand() * 700,
      stuck: 0,
      state: "grow",
      dockPort: -1,
      dockLeft: 0,
      path: [],
      fromPort,
      target: -1,
      wp: -1,
    };
    this.tips.push(tip);
    return tip;
  }

  /* The next port down the page that still wants docks. Seekers steer
     for its anchor; this is what makes the cascade reliable instead
     of leaving page-ward progress to diffusion. */
  private chooseTarget(afterPort: number): number {
    for (let i = afterPort + 1; i < this.world.ports.length; i++) {
      if (this.portDockCount[i] < 2 && this.world.ports[i].dockX !== undefined) return i;
    }
    return -1;
  }

  spawnFromHero() {
    const srcs = this.world.heroSources;
    if (!srcs.length) return;
    const s = srcs[Math.floor(this.rand() * srcs.length)];
    const spread = (this.rand() - 0.5) * 0.9;
    const tip = this.spawn(s.x, s.y + 4, Math.PI / 2 + spread, 0.85 + this.rand() * 0.15, -1);
    if (tip && this.rand() < 0.78) tip.target = this.chooseTarget(-1);
  }

  spawnFromPort(portIdx: number) {
    const p = this.world.ports[portIdx];
    if (!p) return;
    const spots = [0.3, 0.7].map((f) => ({
      x: p.x + p.w * f,
      y: p.y + p.h + CELL * 0.8,
    }));
    for (const s of spots) {
      const cx = Math.round(s.x / CELL);
      const cy = Math.round(s.y / CELL);
      if (!this.blockedAt(cx, cy, 0)) {
        const tip = this.spawn(s.x, s.y, Math.PI / 2 + (this.rand() - 0.5) * 0.5, 0.55 + this.rand() * 0.2, portIdx);
        if (tip && this.rand() < 0.8) tip.target = this.chooseTarget(portIdx);
      }
    }
  }

  /* ---- docking ----------------------------------------------------- */

  private portNear(cx: number, cy: number): number {
    const px = cx * CELL + CELL / 2;
    const py = cy * CELL + CELL / 2;
    let best = -1;
    let bestD = CELL * 1.7;
    this.world.ports.forEach((p, i) => {
      if (this.time - this.portDockedAt[i] < 50) return; // cooldown
      const dx = Math.max(p.x - px, 0, px - (p.x + p.w));
      const dy = Math.max(p.y - py, 0, py - (p.y + p.h));
      const d = Math.hypot(dx, dy);
      if (d < bestD) {
        bestD = d;
        best = i;
        return;
      }
      /* Anchor rule: the nearest reachable ground to a sealed port. */
      if (p.dockX !== undefined && p.dockY !== undefined) {
        const ad = Math.hypot(p.dockX - cx, p.dockY - cy);
        if (ad <= 1.35) {
          bestD = 0;
          best = i;
        }
      }
    });
    return best;
  }

  private beginDock(tip: Tip, portIdx: number) {
    tip.state = "docked";
    tip.dockPort = portIdx;
    tip.dockLeft = 1.2;
    this.portDockedAt[portIdx] = this.time;
    this.portDockCount[portIdx]++;
    const ev = { port: portIdx, name: this.world.ports[portIdx].name, at: this.time };
    this.dockLog.push(ev);
    if (this.dockLog.length > 60) this.dockLog.shift();
    this.onDock?.(portIdx);
    this.version++;
  }

  private endDock(tip: Tip) {
    const p = tip.dockPort;
    if (p >= 0 && this.portDockCount[p] <= 2) this.spawnFromPort(p);
    this.retire(tip);
  }

  private retire(tip: Tip) {
    if (tip.path.length >= 12) {
      this.paths.push(tip.path.slice());
      if (this.paths.length > 40) this.paths.shift();
    }
    const i = this.tips.indexOf(tip);
    if (i >= 0) this.tips.splice(i, 1);
    this.version++;
  }

  /* ---- trail laying -------------------------------------------------- */

  private lay(tip: Tip, cx: number, cy: number) {
    const w = this.world;
    const i = cy * w.cols + cx;
    const target = 0.42 + tip.width * 0.34; // settled mid density
    if (this.trail[i] < target) {
      if (this.trail[i] <= 0.02) {
        const h = hash(i * 3.7 + this.time * 0.013);
        if (h < 0.62) this.glyph[i] = FAMILY_RAMP * 32 + (Math.floor(h * 997) % 32);
        else if (h < 0.83) this.glyph[i] = FAMILY_LETTER * 32 + (Math.floor(h * 991) % LETTERS.length);
        else this.glyph[i] = FAMILY_DIGIT * 32 + (Math.floor(h * 983) % DIGITS.length);
        const region = Math.floor(cy / w.regionRows);
        if (this.regionTrail[region] !== undefined) this.regionTrail[region]++;
      }
      this.trail[i] = target;
    }
    const last = tip.path[tip.path.length - 1];
    if (last !== i) tip.path.push(i);
    if (tip.path.length > 4200) tip.path.splice(0, 600);
  }

  /* ---- bookkeeping --------------------------------------------------- */

  private recount() {
    const w = this.world;
    const regions = Math.max(1, Math.ceil(w.rows / w.regionRows));
    this.explored = new Float32Array(regions);
    this.regionTrail = new Int32Array(regions);
    const channel = new Int32Array(regions);
    for (let cy = 0; cy < w.rows; cy++) {
      const r = Math.floor(cy / w.regionRows);
      for (let cx = 0; cx < w.cols; cx++) {
        const i = cy * w.cols + cx;
        if (!w.blocked[i] && w.cost[i] < 0.8) channel[r]++;
        if (this.trail[i] > 0.05) this.regionTrail[r]++;
      }
    }
    for (let r = 0; r < regions; r++) {
      this.explored[r] = channel[r] > 0 ? Math.min(1, this.regionTrail[r] / channel[r]) : 1;
    }
  }

  regionBudget(region: number) {
    const w = this.world;
    const rowsHere = Math.min(w.regionRows, w.rows - region * w.regionRows);
    return Math.floor(w.cols * Math.max(rowsHere, 0) * 0.07 * this.budgetScale);
  }

  /* Audit: settled cells whose centre falls inside any given rect
     (the component passes content rects padded by 2px, tighter than
     the engine's own inflation, so a clean audit is meaningful). */
  auditRects(rects: { x: number; y: number; w: number; h: number }[]) {
    const w = this.world;
    let bad = 0;
    for (let cy = 0; cy < w.rows; cy++) {
      for (let cx = 0; cx < w.cols; cx++) {
        if (this.trail[cy * w.cols + cx] <= 0.05) continue;
        const px = cx * CELL + CELL / 2;
        const py = cy * CELL + CELL / 2;
        for (const r of rects) {
          if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
            bad++;
            break;
          }
        }
      }
    }
    return bad;
  }

  stats() {
    let cells = 0;
    for (let i = 0; i < this.trail.length; i++) if (this.trail[i] > 0.05) cells++;
    return {
      time: Math.round(this.time * 10) / 10,
      activeTips: this.tips.length,
      trailCells: cells,
      paths: this.paths.length,
      pulses: this.pulses.length,
      docks: this.dockLog.length,
      explored: Array.from(this.explored, (v) => Math.round(v * 100) / 100),
    };
  }

  tipsSnapshot() {
    return this.tips.map((t) => ({
      x: Math.round(t.x * CELL),
      y: Math.round(t.y * CELL),
      state: t.state,
      path: t.path.length,
      stuck: Math.round(t.stuck * 10) / 10,
    }));
  }

  /* ---- the step ------------------------------------------------------ */

  step(dt: number, viewTopPx: number, viewBottomPx: number, scrollVel: number) {
    if (dt <= 0) return;
    this.time += dt;
    const w = this.world;
    const winTop = (viewTopPx - (viewBottomPx - viewTopPx) * 1.5) / CELL;
    const winBot = (viewBottomPx + (viewBottomPx - viewTopPx) * 1.5) / CELL;

    const inWindow = (tip: Tip) =>
      this.wholePageActive || (tip.y >= winTop && tip.y <= winBot);

    /* Frontier bias: growth leans toward where the visitor is heading,
       and toward the first unexplored band below the fold when idle. */
    let frontierY: number;
    if (scrollVel > 24) frontierY = viewBottomPx + (viewBottomPx - viewTopPx) * 0.8;
    else if (scrollVel < -24) frontierY = viewTopPx - (viewBottomPx - viewTopPx) * 0.8;
    else frontierY = viewBottomPx + (viewBottomPx - viewTopPx) * 0.35;
    frontierY = Math.max(0, Math.min(w.pageH, frontierY));

    /* Decay / thinning. Base half-life ~5 minutes; regions over budget
       thin six times faster until they are back under it. During
       pregrow this runs every decayEvery-th step at scaled dt, so the
       fast-forward does not pay a full grid pass per step. */
    this.stepCount++;
    const decayNow = this.stepCount % this.decayEvery === 0;
    const ddt = dt * this.decayEvery;
    const baseDecay = Math.exp(-ddt / 300);
    const fastDecay = Math.exp(-ddt / 48);
    /* The tier's named glyph budget caps the whole page: past it,
       every region thins at the fast rate until the page is back
       under budget. */
    let totalTrail = 0;
    for (const n of this.regionTrail) totalTrail += n;
    const overGlobal = totalTrail > this.glyphBudget;
    let anyDecay = false;
    for (let cy = decayNow ? 0 : w.rows; cy < w.rows; cy++) {
      const region = Math.floor(cy / w.regionRows);
      const over = overGlobal || this.regionTrail[region] > this.regionBudget(region);
      const f = over ? fastDecay : baseDecay;
      if (f >= 0.9999) continue;
      const rowOff = cy * w.cols;
      for (let cx = 0; cx < w.cols; cx++) {
        const i = rowOff + cx;
        if (this.trail[i] > 0) {
          this.trail[i] *= f;
          if (this.trail[i] < 0.05) {
            if (this.trail[i] !== 0) {
              this.trail[i] = 0;
              if (this.regionTrail[region] > 0) this.regionTrail[region]--;
            }
          }
          anyDecay = true;
        }
      }
    }
    if (anyDecay) this.version++;

    /* Tips. */
    const scrollY = viewTopPx;
    for (let ti = this.tips.length - 1; ti >= 0; ti--) {
      const tip = this.tips[ti];
      if (!inWindow(tip)) continue;
      tip.age += dt;

      if (tip.state === "docked") {
        tip.dockLeft -= dt;
        if (tip.dockLeft <= 0) this.endDock(tip);
        continue;
      }

      if (tip.age > tip.maxAge || tip.traveled > tip.maxLen || tip.stuck > 3) {
        this.retire(tip);
        continue;
      }

      /* Region tip cap: a tip that wanders into a crowded region slows
         and stops laying (it still draws its head), preventing hair. */
      const region = Math.floor(tip.y / w.regionRows);
      let regionTips = 0;
      for (const other of this.tips) {
        if (Math.floor(other.y / w.regionRows) === region && other.state === "grow") regionTips++;
      }
      const overBudget = this.regionTrail[region] > this.regionBudget(region);
      const canLay = regionTips <= 3 && !overBudget;

      /* Steering: wander + cost probes + frontier pull. A seeker
         scores its probes on the target port's BFS distance field
         first (gradient descent: guaranteed progress around walls),
         with the cost score kept as a tiebreak so the route still
         prefers the channels. */
      if (tip.target >= 0 && this.portDockCount[tip.target] >= 2) {
        tip.target = this.chooseTarget(tip.target);
      }
      const seekField =
        tip.target >= 0 ? this.world.distFields[tip.target] : undefined;
      const ahead = 2.1;
      let bestAngle = 0;
      let bestScore = Infinity;
      for (const rel of [0, -0.5, 0.5, -1.0, 1.0, -1.55, 1.55]) {
        const a = tip.heading + rel;
        const px = Math.round(tip.x + Math.cos(a) * ahead);
        const py = Math.round(tip.y + Math.sin(a) * ahead);
        let score = this.costAt(px, py, scrollY);
        if (!isFinite(score)) continue;
        score += Math.abs(rel) * 0.55;
        if (seekField) {
          const dProbe =
            px >= 0 && py >= 0 && px < w.cols && py < w.rows
              ? seekField[py * w.cols + px]
              : -1;
          if (dProbe < 0) continue; // cannot approach the target this way
          score = dProbe + score * 0.2;
        }
        /* Frontier pull: reward probes that close on the frontier.
           This is the cascade's engine at rest: without it, headings
           diffuse rotationally in open space and the network pools at
           the top of the page instead of snaking downward. */
        const probeYPx = py * CELL;
        const curDist = Math.abs(tip.y * CELL - frontierY);
        const newDist = Math.abs(probeYPx - frontierY);
        score += (newDist - curDist) / CELL * 0.05;
        if (score < bestScore) {
          bestScore = score;
          bestAngle = rel;
        }
      }
      /* A gentle capped bend toward the frontier on top of the probe
         choice: persistent enough to drift the walk page-ward, weak
         enough that wander and the cost field still shape the path. */
      const frontierHeading = frontierY >= tip.y * CELL ? Math.PI / 2 : -Math.PI / 2;
      const bend =
        Math.max(-0.5, Math.min(0.5, angDiff(frontierHeading, tip.heading + bestAngle))) * 0.12;
      let desired = tip.heading + bestAngle + wander(tip.seed, this.time) * 0.35 + bend;

      /* Hybrid docking: inside the approach zone (BFS distance <= 26
         cells), a seeker stops free-wandering and follows the port's
         precomputed anchored path by waypoint pursuit. The gradient
         probes above still run and mostly agree; the path is what
         makes the arrival precise instead of hopeful. */
      if (seekField && tip.target >= 0) {
        const route = this.world.ports[tip.target]?.approach;
        const hcx = Math.min(w.cols - 1, Math.max(0, Math.round(tip.x)));
        const hcy = Math.min(w.rows - 1, Math.max(0, Math.round(tip.y)));
        const dHere = seekField[hcy * w.cols + hcx];
        if (route && route.length > 1 && dHere >= 0 && dHere <= 26) {
          let best = -1;
          let bestD = Infinity;
          const from = tip.wp < 0 ? 0 : Math.max(0, tip.wp - 6);
          const to = tip.wp < 0 ? route.length - 1 : Math.min(route.length - 1, tip.wp + 30);
          for (let i = from; i <= to; i++) {
            const cx = (route[i] % w.cols) + 0.5;
            const cy = Math.floor(route[i] / w.cols) + 0.5;
            const dd = (cx - tip.x) * (cx - tip.x) + (cy - tip.y) * (cy - tip.y);
            if (dd < bestD) {
              bestD = dd;
              best = i;
            }
          }
          if (best >= 0) {
            tip.wp = best;
            const aheadIdx = Math.min(route.length - 1, best + 3);
            const wx = (route[aheadIdx] % w.cols) + 0.5;
            const wy = Math.floor(route[aheadIdx] / w.cols) + 0.5;
            const dirTo = Math.atan2(wy - tip.y, wx - tip.x);
            const diff = Math.max(-1.1, Math.min(1.1, angDiff(dirTo, tip.heading + bestAngle)));
            desired += diff * 0.55;
          }
        } else if (dHere > 26) {
          tip.wp = -1;
        }
      }
      const turn = angDiff(desired, tip.heading);
      const maxTurn = 2.7 * dt;
      tip.heading += Math.max(-maxTurn, Math.min(maxTurn, turn));

      /* Advance in substeps so walls are never tunneled. */
      let remaining = tip.speed * dt;
      let moved = 0;
      while (remaining > 0) {
        const sub = Math.min(remaining, 0.45);
        remaining -= sub;
        const nx = tip.x + Math.cos(tip.heading) * sub;
        const ny = tip.y + Math.sin(tip.heading) * sub;
        const cx = Math.round(nx);
        const cy = Math.round(ny);
        if (this.blockedAt(cx, cy, scrollY)) {
          tip.heading += (hash(tip.seed * 91 + this.time * 7) > 0.5 ? 1 : -1) * 0.9;
          break;
        }
        tip.x = nx;
        tip.y = ny;
        moved += sub;
        if (canLay) this.lay(tip, cx, cy);
        /* Dock check at the head cell. */
        const port = this.portNear(cx, cy);
        if (port >= 0) {
          this.beginDock(tip, port);
          break;
        }
      }
      tip.traveled += moved;
      if (moved < tip.speed * dt * 0.25) tip.stuck += dt;
      else tip.stuck = Math.max(0, tip.stuck - dt * 2);

      /* Forking: probability-gated, girth-gated, caps enforced. */
      if (
        tip.state === "grow" &&
        tip.width > 0.42 &&
        this.tips.length < this.maxTips &&
        regionTips < 3 &&
        this.rand() < dt * 0.05 * tip.width
      ) {
        const dir = this.rand() > 0.5 ? 1 : -1;
        const child = this.spawn(
          tip.x * CELL,
          tip.y * CELL,
          tip.heading + dir * (0.45 + this.rand() * 0.4),
          tip.width * 0.62,
          tip.fromPort,
        );
        if (child) {
          child.path = tip.path.slice(-24);
          child.target = tip.target;
          child.wp = tip.wp;
        }
      }
    }

    /* Pulses: accent packets travelling retired paths. */
    this.pulseTimer -= dt;
    if (this.pulseTimer <= 0) {
      this.pulseTimer = 5 + this.rand() * 6;
      if (this.pulses.length < 2 && this.paths.length) {
        const near = this.paths.filter((p) => {
          const mid = p[Math.floor(p.length / 2)];
          const my = Math.floor(mid / w.cols) * CELL;
          return my > winTop * CELL - 200 && my < winBot * CELL + 200;
        });
        const pool = near.length ? near : this.paths;
        const path = pool[Math.floor(this.rand() * pool.length)];
        if (path.length > 16) {
          this.pulses.push({ path, pos: 0, speed: 15 + this.rand() * 6 });
        }
      }
    }
    for (let pi = this.pulses.length - 1; pi >= 0; pi--) {
      const pulse = this.pulses[pi];
      pulse.pos += pulse.speed * dt;
      if (pulse.pos >= pulse.path.length + 3) this.pulses.splice(pi, 1);
      else this.version++;
    }

    /* Hero respawn + gardener: the page never goes permanently quiet. */
    this.heroTimer -= dt;
    if (this.heroTimer <= 0) {
      this.heroTimer = 5;
      let topTips = 0;
      for (const t of this.tips) if (t.y < w.regionRows) topTips++;
      const region0Over = this.regionTrail[0] > this.regionBudget(0);
      if ((topTips < 2 && !region0Over) || this.tips.length === 0) this.spawnFromHero();
    }

    /* Periodic recount keeps explored fractions honest. */
    if (this.time - this.recountAt > 2) {
      this.recountAt = this.time;
      this.recount();
    }
    this.version++;
  }

  /* Reduced-motion pregrow: run the whole simulation forward with the
     dormancy window disabled, seeding the cascade by hand (hero spawns
     plus children from whichever ports have docked) so the static
     network reaches the footer instead of pooling at the top. */
  fastForward(seconds: number) {
    this.wholePageActive = true;
    this.decayEvery = 8;
    /* Dynamic rects are viewport-space (the sticky header at scroll
       0); in page space the pregrow must not let them trap spawns. */
    const dyn = this.dynRects;
    this.dynRects = [];
    const stepDt = 0.1;
    const steps = Math.floor(seconds / stepDt);
    this.spawnFromHero();
    this.spawnFromHero();
    for (let s = 0; s < steps; s++) {
      this.step(stepDt, 0, this.world.pageH, 0);
      if (s % 150 === 0) {
        if (this.tips.length < 3) this.spawnFromHero();
        for (let p = 0; p < this.world.ports.length; p++) {
          if (this.portDockCount[p] > 0 && this.rand() < 0.6) this.spawnFromPort(p);
        }
      }
    }
    this.decayEvery = 1;
    this.wholePageActive = false;
    this.dynRects = dyn;
    this.version++;
  }
}
