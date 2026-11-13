"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { CONTOUR_FRAGMENT, CONTOUR_VERTEX, RAMP } from "./shaders";
import { createGlyphAtlas } from "./logoTexture";
import { fullscreenMesh, hexToVec3, observeTheme, prefersReducedMotion, readPalette, readToken } from "./glBase";

/* Treatment 2: the glyph contour. A topographic whorl in the hero
 * field's fbm contour language, drawn entirely from IBM Plex Mono
 * glyphs at low contrast, sitting as a background presence behind the
 * section's copy. The band it lives in is inverted (ink ground, paper
 * text), so the glyphs render in the band's foreground token at about
 * a fifth of full strength.
 *
 * Same rules as the hero scene: rAF only while the section is on
 * screen, lerp-free but slow (the field itself drifts slowly), and a
 * single static frame under prefers-reduced-motion. */
export function ContourGlyphs() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    let disposed = false;
    const reduced = prefersReducedMotion();

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let atlasTex: THREE.Texture | null = null;
    let raf = 0;
    let visible = false;
    let time = reduced ? 7.5 : 0;
    let lastFrame = performance.now();
    let stopTheme: (() => void) | null = null;
    let resizeObs: ResizeObserver | null = null;

    const applyPalette = () => {
      if (!material) return;
      const palette = readPalette();
      /* Inverted band: ground is --ink, glyph colour is --bg. */
      (material.uniforms.u_bg.value as THREE.Vector3).copy(palette.ink);
      (material.uniforms.u_ink.value as THREE.Vector3).copy(
        hexToVec3(readToken("--bg", "#faf8f1"), [0.98, 0.973, 0.945])
      );
      if (reduced) renderOnce();
    };

    const resize = () => {
      if (!renderer || !material || !wrap) return;
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(2, Math.floor(rect.width));
      const h = Math.max(2, Math.floor(rect.height));
      renderer.setSize(w, h, false);
      const size = new THREE.Vector2();
      renderer.getDrawingBufferSize(size);
      const cell = 10 * renderer.getPixelRatio();
      material.uniforms.u_cell.value = cell;
      material.uniforms.u_grid.value = new THREE.Vector2(
        Math.max(2, Math.ceil(size.x / cell)),
        Math.max(2, Math.ceil(size.y / cell))
      );
      if (reduced) renderOnce();
    };

    function renderOnce() {
      if (!renderer || !scene || !material) return;
      material.uniforms.u_time.value = time;
      renderer.render(scene, new THREE.Camera());
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || !visible) {
        lastFrame = now;
        return;
      }
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      time += dt;
      renderOnce();
    };

    (async () => {
      atlasTex = await createGlyphAtlas();
      if (disposed) return;

      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: false,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      scene = new THREE.Scene();
      const palette = readPalette();
      const built = fullscreenMesh(CONTOUR_VERTEX, CONTOUR_FRAGMENT, {
        u_atlas: { value: atlasTex },
        u_cell: { value: 10 },
        u_grid: { value: new THREE.Vector2(1, 1) },
        u_time: { value: time },
        u_rampCount: { value: RAMP.length },
        u_bg: { value: palette.ink },
        u_ink: { value: palette.bg },
        u_strength: { value: 0.22 },
      });
      material = built.material;
      scene.add(built.mesh);

      resize();
      stopTheme = observeTheme(applyPalette);
      resizeObs = new ResizeObserver(resize);
      resizeObs.observe(wrap);

      if (reduced) {
        renderOnce();
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          visible = entries[0]?.isIntersecting ?? false;
        },
        { threshold: 0 }
      );
      io.observe(wrap);
      lastFrame = performance.now();
      raf = requestAnimationFrame(loop);
      // Cleanup for the observer rides along with the component cleanup
      // via the wrap element check below.
      (wrap as unknown as { __io?: IntersectionObserver }).__io = io;
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      stopTheme?.();
      resizeObs?.disconnect();
      (wrap as unknown as { __io?: IntersectionObserver }).__io?.disconnect();
      atlasTex?.dispose();
      material?.dispose();
      renderer?.dispose();
    };
  }, []);

  return (
    <div ref={wrapRef} className="ascii-contour" aria-hidden="true">
      <canvas ref={canvasRef} className="ascii-contour-canvas" />
    </div>
  );
}
