import * as THREE from "three";

/* Shared helpers for the /ascii lane's WebGL scenes: reading the site's
   theme tokens as raw sRGB uniform values (so the canvas matches the
   CSS palette exactly, with no colour-management conversion in between)
   and following the site's data-theme attribute when the toggle flips. */

export function hexToVec3(hex: string, fallback: [number, number, number]): THREE.Vector3 {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return new THREE.Vector3(...fallback);
  const n = parseInt(m[1], 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export function readToken(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export interface SitePalette {
  bg: THREE.Vector3;
  ink: THREE.Vector3;
  accent: THREE.Vector3;
  faint: THREE.Vector3;
}

/** The site's tokens, resolved for the currently active theme. */
export function readPalette(): SitePalette {
  return {
    bg: hexToVec3(readToken("--bg", "#0b0c0a"), [0.043, 0.047, 0.039]),
    ink: hexToVec3(readToken("--ink", "#f4f2ea"), [0.957, 0.949, 0.918]),
    accent: hexToVec3(readToken("--accent", "#e08c79"), [0.878, 0.549, 0.475]),
    faint: hexToVec3(readToken("--muted", "#a39c8b"), [0.639, 0.612, 0.545]),
  };
}

/** Call back (on the next frame) whenever data-theme changes. Returns
 *  the disconnect function. */
export function observeTheme(onChange: () => void): () => void {
  const root = document.documentElement;
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      onChange();
    });
  });
  observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A fullscreen clip-space quad + ShaderMaterial, the boilerplate every
 *  scene in this lane shares. */
export function fullscreenMesh(vertex: string, fragment: string, uniforms: Record<string, unknown>) {
  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  return { mesh, material };
}

export function makeRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  return renderer;
}
