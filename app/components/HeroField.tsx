"use client";

import { useEffect, useRef } from "react";

/* The hero field: a slow, warped paper-and-accent gradient with faint
   contour lines and grain, drawn with WebGL2 over a CSS still. It reads its
   colours from the theme, renders one still frame under reduced motion, and
   pauses when off screen, when the tab is hidden, or when WebGL is missing.
   Ported from site.js (the page is complete without it). */
export function HeroField() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vs = "#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    const fs =
      "#version 300 es\nprecision highp float;uniform vec2 r;uniform float t;uniform vec3 c0,c1,c2,cl;out vec4 o;" +
      "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}" +
      "float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}" +
      "float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}" +
      "void main(){vec2 uv=gl_FragCoord.xy/r;vec2 p=uv*vec2(r.x/r.y,1.)*1.4;" +
      "float w=fbm(p+vec2(t*.018,-t*.012));float f=fbm(p*1.2+w*1.9+vec2(-t*.01,t*.008));" +
      "float side=smoothstep(.2,1.,uv.x*.9+uv.y*.5);float g=smoothstep(.25,.8,f)*side;" +
      "vec3 c=mix(c0,c2,smoothstep(.35,.9,w)*.6);c=mix(c,c1,g);" +
      "float k=f*18.;float d=abs(fract(k)-.5)/fwidth(k);float line=(1.-clamp(d,0.,1.))*.32*side*smoothstep(.25,.7,f);" +
      "c=mix(c,cl,line);c+=(h(gl_FragCoord.xy)-.5)*.018;o=vec4(c,1.);}";

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const v = compile(gl.VERTEX_SHADER, vs);
    const f = compile(gl.FRAGMENT_SHADER, fs);
    const prog = v && f ? gl.createProgram() : null;
    if (!prog || !v || !f) return;
    gl.attachShader(prog, v);
    gl.attachShader(prog, f);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U: Record<string, WebGLUniformLocation | null> = {};
    ["r", "t", "c0", "c1", "c2", "cl"].forEach((k) => {
      U[k] = gl.getUniformLocation(prog, k);
    });

    const rgb = (name: string): [number, number, number] => {
      let hex = getComputedStyle(root).getPropertyValue(name).trim().replace("#", "");
      if (hex.length === 3)
        hex = hex.replace(/./g, "$&$&");
      const x = parseInt(hex.slice(0, 6), 16);
      return Number.isNaN(x)
        ? [0, 0, 0]
        : [((x >> 16) & 255) / 255, ((x >> 8) & 255) / 255, (x & 255) / 255];
    };
    const paintColours = () => {
      gl.uniform3fv(U.c0, rgb("--bg"));
      gl.uniform3fv(U.c1, rgb("--accent-bg"));
      gl.uniform3fv(U.c2, rgb("--bg2"));
      gl.uniform3fv(U.cl, rgb("--accent"));
    };
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(U.r, w, h);
      }
    };
    const start = performance.now();
    let visible = true;
    let frame = 0;
    const draw = (now: number) => {
      size();
      gl.uniform1f(U.t, reduceMotion ? 12 : 12 + (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const loop = (now: number) => {
      frame = 0;
      draw(now);
      if (visible && !document.hidden && !reduceMotion) frame = requestAnimationFrame(loop);
    };
    const run = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(loop);
    };

    paintColours();
    draw(performance.now());
    field.classList.add("is-live");

    let fieldObserver: IntersectionObserver | null = null;
    if (!reduceMotion) {
      if ("IntersectionObserver" in window) {
        fieldObserver = new IntersectionObserver(
          (es) => {
            visible = es[0].isIntersecting;
            if (visible) run();
          },
          { rootMargin: "20px 0px" },
        );
        fieldObserver.observe(field);
      }
      document.addEventListener("visibilitychange", run);
      run();
    }
    const themeObserver = new MutationObserver(() => {
      paintColours();
      draw(performance.now());
    });
    themeObserver.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    const onResize = () => draw(performance.now());
    window.addEventListener("resize", onResize);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      fieldObserver?.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="hero-field" aria-hidden="true" ref={fieldRef}>
      <canvas ref={canvasRef} />
    </div>
  );
}
