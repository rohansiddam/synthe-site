"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { LETTERS, LOGO_FRAGMENT, LOGO_VERTEX, RAMP } from "./shaders";
import { MARK_FRACTION, computeTendrilAnchors, createGlyphAtlas, createLogoTexture } from "./logoTexture";
import { dockBus } from "./dockBus";
import { fullscreenMesh, makeRenderer, observeTheme, prefersReducedMotion, readPalette } from "./glBase";

/* The hero of the /ascii lane: a fixed, full-viewport WebGL canvas that
   draws the Synthe mark out of IBM Plex Mono glyphs (see shaders.ts).
 *
 * Behaviour contract (founder motion rules):
 *  - window scroll drives the shader from anywhere on the page, lerp-
 *    smoothed in JS before upload (u_progress, u_scroll energy), so
 *    nothing ever jumps with the raw wheel;
 *  - the tendrils are geometric, not decorative: the glyph terrain
 *    below publishes its crest line to dockBus every frame, and each
 *    anchor's length eases toward the distance from its source (the
 *    mark's real lower contour) to the crest beneath it. A tendril
 *    exists only while a crest is in the frame under it, grows as
 *    the crest rises to meet it, ends at the crest, and reports the
 *    dock back so the receiving column flashes. Scrolling up sinks
 *    the crest and the tendrils retract through the same easing;
 *  - u_extend (the mark's reach, which also raises it) follows the
 *    longest live tendril target, so the strain, the raise and the
 *    reach are one gesture;
 *  - rendering pauses when the tab is hidden or the terrain and band
 *    have covered the viewport (later sections are opaque);
 *  - prefers-reduced-motion renders exactly one static frame: frozen
 *    time, no strain, no tendrils (re-rendered only on resize / flip);
 *  - pixel ratio is capped at 1.75 and the grid cell at 11 CSS px.
 */
export function AsciiScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    const reduced = prefersReducedMotion();

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let logoTex: THREE.Texture | null = null;
    let atlasTex: THREE.Texture | null = null;
    let raf = 0;
    let stopTheme: (() => void) | null = null;

    /* Smoothed scroll state. Targets update on scroll events; the
       render loop lerps the live values toward them every frame. */
    let progressTarget = 0;
    let progress = 0;
    let energy = 0;
    let extend = 0;
    let maxBottomV = 0;
    /* Tendril state: per-anchor eased lengths (plane UV) and
       docked-ness, driven by the terrain's crest via dockBus. */
    const lenCur = new Float32Array(16);
    const dockCur = new Float32Array(16);
    const lastDockAt = new Map<number, number>();
    let anchorVecs: THREE.Vector4[] = [];
    let logoSizeV = new THREE.Vector2(1, 1);
    let logoOffsetV = new THREE.Vector2(0, 0);
    let dockCount = 0;
    let lastScrollY = window.scrollY;
    let time = reduced ? 4.2 : 0;
    let frames = 0;
    let lastFrame = performance.now();
    let lastFpsStamp = performance.now();

    const updateScrollTarget = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      progressTarget = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };

    const applyPalette = () => {
      if (!material) return;
      const palette = readPalette();
      (material.uniforms.u_bg.value as THREE.Vector3).copy(palette.bg);
      (material.uniforms.u_ink.value as THREE.Vector3).copy(palette.ink);
      (material.uniforms.u_accent.value as THREE.Vector3).copy(palette.accent);
      (material.uniforms.u_faint.value as THREE.Vector3).copy(palette.faint);
      if (reduced) renderOnce();
    };

    const resize = () => {
      if (!renderer || !material) return;
      renderer.setSize(window.innerWidth, window.innerHeight);
      const size = new THREE.Vector2();
      renderer.getDrawingBufferSize(size);
      const dpr = renderer.getPixelRatio();
      const cell = 11 * dpr;
      const cols = Math.max(2, Math.ceil(size.x / cell));
      const rows = Math.max(2, Math.ceil(size.y / cell));
      material.uniforms.u_resolution.value = size;
      material.uniforms.u_cell.value = cell;
      material.uniforms.u_grid.value = new THREE.Vector2(cols, rows);

      /* Logo rect: the mark stands about 78% of the viewport tall,
         centred. The texture is square (mark centred in it), so the
         rect keeps the texture's aspect against the plane's aspect. */
      const markH = 0.78;
      let sizeY = markH / MARK_FRACTION;
      let sizeX = sizeY * (size.y / size.x);
      if (sizeX > 0.94) {
        sizeX = 0.94;
        sizeY = sizeX * (size.x / size.y);
      }
      logoOffsetV = new THREE.Vector2((1 - sizeX) / 2, (1 - sizeY) / 2);
      logoSizeV = new THREE.Vector2(sizeX, sizeY);
      material.uniforms.u_logoOffset.value = logoOffsetV;
      material.uniforms.u_logoSize.value = logoSizeV;

      /* The highest point any tendril source can sit at, with the mark
         fully raised; the shader skips its tendril loop above this. */
      const ceilY = (1 - sizeY) / 2 + sizeY * 0.15 + maxBottomV * sizeY * 0.82 + 0.03;
      material.uniforms.u_tendrilCeil.value = Math.min(1, ceilY);

      writeLegend(cols, rows, 0);
      if (reduced) renderOnce();
    };

    const writeLegend = (cols: number, rows: number, fps: number) => {
      const el = legendRef.current;
      if (!el) return;
      el.textContent =
        `grid ${cols} x ${rows} · cell 11px · ramp '${RAMP.join("")}' · ` +
        `${fps} fps · scroll ${progress.toFixed(2)} · extend ${extend.toFixed(2)} · dock ${dockCount}/16`;
    };

    /* One frame of tendril geometry: read the terrain's crest from
       dockBus, ease each anchor's length toward the distance from
       its source to the crest beneath it, ease docked-ness, and
       report completed docks back to the terrain. Mirrors the
       shader's raised-rect math exactly (rectS / rectO there). */
    const updateTendrils = (now: number) => {
      if (!material) return;
      const raiseE = extend * extend * (3 - 2 * extend);
      const rectSx = logoSizeV.x * (1 - 0.18 * raiseE);
      const rectSy = logoSizeV.y * (1 - 0.18 * raiseE);
      const rectOx = logoOffsetV.x + logoSizeV.x * 0.09 * raiseE;
      const rectOy = logoOffsetV.y + logoSizeV.y * 0.15 * raiseE;
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      let maxTarget = 0;
      let docks = 0;
      for (let i = 0; i < 16; i++) {
        const a = anchorVecs[i];
        let target = 0;
        let docked = false;
        if (a && a.w > 0.5) {
          const srcCssX = (rectOx + a.x * rectSx) * vw;
          const srcTopPx = (1 - (rectOy + a.y * rectSy)) * vh;
          const crest = dockBus.crestAt(srcCssX);
          if (crest !== null && crest <= vh + 30 && crest - srcTopPx >= 8) {
            target = (crest - srcTopPx) / vh;
            docked = Math.abs(lenCur[i] - target) < 0.022;
            if (docked) {
              docks += 1;
              const col = dockBus.columnAt(srcCssX);
              if (col >= 0 && now - (lastDockAt.get(col) ?? 0) > 850) {
                lastDockAt.set(col, now);
                dockBus.dock(col);
              }
            }
          }
        }
        maxTarget = Math.max(maxTarget, target);
        lenCur[i] += (target - lenCur[i]) * 0.075;
        if (Math.abs(target - lenCur[i]) < 0.0012) lenCur[i] = target;
        dockCur[i] += ((docked ? 1 : 0) - dockCur[i]) * 0.14;
      }
      dockCount = docks;
      /* Reach follows the longest live target, so the mark strains
         and lifts exactly while its tendrils are reaching. */
      const reachTarget = Math.min(1, maxTarget * 2.4);
      extend += (reachTarget - extend) * 0.05;
      if (Math.abs(reachTarget - extend) < 0.0015) extend = reachTarget;
      (material.uniforms.u_tendrilLen.value as Float32Array).set(lenCur);
      (material.uniforms.u_dockT.value as Float32Array).set(dockCur);
    };

    function renderOnce() {
      if (!renderer || !scene || !material) return;
      material.uniforms.u_time.value = time;
      material.uniforms.u_progress.value = reduced ? 0 : progress;
      material.uniforms.u_scroll.value = reduced ? 0 : energy;
      material.uniforms.u_extend.value = reduced ? 0 : extend;
      /* Raise is the smoothstep of extension, so the mark starts
         lifting only once the tendrils are underway, then settles. */
      const e = reduced ? 0 : extend;
      material.uniforms.u_raise.value = e * e * (3 - 2 * e);
      renderer.render(scene, new THREE.Camera());
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      /* The opaque sections below cover the fixed canvas; stop paying
         for it once the terrain has passed and the band has taken
         over the viewport. Until the terrain has published, fall
         back to the old scroll window. */
      const tState = dockBus.terrain;
      if (tState.present ? tState.bottomViewportY < -60 : window.scrollY > window.innerHeight * 2.7) return;

      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      time += dt;

      /* Smooth the scroll inputs: progress trails its target and
         energy charges fast on scroll deltas and discharges slowly.
         Tendril reach is geometric (updateTendrils), eased there. */
      progress += (progressTarget - progress) * 0.06;
      updateTendrils(now);
      const dy = Math.abs(window.scrollY - lastScrollY);
      lastScrollY = window.scrollY;
      const energyTarget = Math.min(1, dy / 55);
      energy += (energyTarget - energy) * (energyTarget > energy ? 0.30 : 0.045);

      renderOnce();

      frames += 1;
      if (now - lastFpsStamp >= 500) {
        const fps = Math.round(frames / ((now - lastFpsStamp) / 1000));
        frames = 0;
        lastFpsStamp = now;
        const grid = material?.uniforms.u_grid.value as THREE.Vector2 | undefined;
        if (grid) writeLegend(grid.x, grid.y, fps);
      }
    };

    (async () => {
      atlasTex = await createGlyphAtlas();
      if (disposed) return;
      logoTex = createLogoTexture();
      const tendrils = computeTendrilAnchors();
      maxBottomV = tendrils.maxBottomV;
      anchorVecs = tendrils.anchors;

      renderer = makeRenderer(canvas);
      scene = new THREE.Scene();
      const palette = readPalette();
      const built = fullscreenMesh(LOGO_VERTEX, LOGO_FRAGMENT, {
        u_texture: { value: logoTex },
        u_atlas: { value: atlasTex },
        u_resolution: { value: new THREE.Vector2(1, 1) },
        u_cell: { value: 11 },
        u_grid: { value: new THREE.Vector2(1, 1) },
        u_time: { value: time },
        u_scroll: { value: 0 },
        u_progress: { value: 0 },
        u_logoOffset: { value: new THREE.Vector2(0, 0) },
        u_logoSize: { value: new THREE.Vector2(1, 1) },
        u_rampCount: { value: RAMP.length },
        u_letterCount: { value: LETTERS.length },
        u_bg: { value: palette.bg },
        u_ink: { value: palette.ink },
        u_accent: { value: palette.accent },
        u_faint: { value: palette.faint },
        u_ambient: { value: 0.6 },
        u_debug: { value: Number(new URLSearchParams(window.location.search).get("debug") ?? 0) || 0 },
        u_tendrils: { value: tendrils.anchors },
        u_tendrilLen: { value: new Float32Array(16) },
        u_dockT: { value: new Float32Array(16) },
        u_extend: { value: 0 },
        u_raise: { value: 0 },
        u_tendrilCeil: { value: 0.5 },
      });
      material = built.material;
      scene.add(built.mesh);

      updateScrollTarget();
      progress = progressTarget;
      resize();
      stopTheme = observeTheme(applyPalette);
      window.addEventListener("resize", resize);
      window.addEventListener("scroll", updateScrollTarget, { passive: true });

      if (reduced) {
        renderOnce();
      } else {
        lastFrame = performance.now();
        lastFpsStamp = lastFrame;
        raf = requestAnimationFrame(loop);
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      stopTheme?.();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", updateScrollTarget);
      logoTex?.dispose();
      atlasTex?.dispose();
      material?.dispose();
      renderer?.dispose();
    };
  }, []);

  return (
    <>
      <div className="ascii-stage" aria-hidden="true">
        <canvas ref={canvasRef} className="ascii-canvas" />
      </div>
      <div ref={legendRef} className="ascii-legend" aria-hidden="true">
        ascii field · starting
      </div>
    </>
  );
}
