/* =============================================================
   RIDGE FIELD
   Ambient background for the admin sign-in.

   Adapted from ThreeUI's PortalFieldCollection — "Cloud Field"
   (raw-WebGL cloud migration). What is carried over from the
   reference: a single fullscreen quad, an fbm-driven ridge
   profile, five parallax layers whose scale, drift speed and
   pointer response all increase toward the foreground, a rim
   light along each silhouette, vignette and horizon haze, and
   the pointer smoothed with a lerp rather than tracked directly.

   What is deliberately changed for this project:
   • Palette remapped from the reference's indigo night sky to
     the storefront's own ink / sage / bone / paper tokens, so it
     reads as a printed landscape plate rather than a space scene.
   • Stars and the meteor streak are dropped — decorative, and
     against the house rule about ornament.
   • Raw WebGL is kept and Three.js is not introduced: this is one
     fullscreen quad, and the library would add ~600KB for nothing.
   • prefers-reduced-motion renders a single static frame, and the
     loop parks itself when the tab is hidden.
   ============================================================= */
import { useEffect, useRef } from 'react';

const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_pointer;

float hash(float n){ return fract(sin(n) * 43758.5453123); }

float noise(float x){
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3.0 - 2.0 * f);          // smoothstep interpolation
  return mix(hash(i), hash(i + 1.0), f);
}

/* fractal brownian motion — the ridge profile generator */
float fbm(float x, float octaves){
  float val = 0.0, amp = 0.5, freq = 1.0;
  for (int i = 0; i < 6; i++){
    if (float(i) >= octaves) break;
    val += amp * noise(x * freq);
    freq *= 2.0;
    amp  *= 0.5;
  }
  return val;
}

void main(){
  vec2  uv     = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2  ptr    = u_pointer * 2.0 - 1.0;

  /* paper sky, warming very slightly toward the horizon */
  vec3 skyTop    = vec3(1.000, 1.000, 1.000);
  vec3 skyMid    = vec3(0.960, 0.962, 0.958);
  vec3 skyBottom = vec3(0.906, 0.914, 0.902);

  float grad = uv.y;
  vec3  col  = mix(skyBottom, skyMid, smoothstep(0.25, 0.62, grad));
  col = mix(col, skyTop, smoothstep(0.62, 1.0, grad));

  vec3  lC;
  float xC, yS, prof, mTop, ridge, rDist, rGlow;
  vec3  rim = vec3(1.0, 1.0, 1.0);

  /* ---- five layers, far to near ----
     scale, drift and pointer response all rise toward the
     foreground, which is what produces the parallax. */

  // 0 — furthest, sage
  lC   = vec3(0.663, 0.682, 0.663);
  xC   = uv.x * aspect * 1.6 + u_time * 0.008 + ptr.x * 0.016;
  yS   = ptr.y * 0.005;
  prof = fbm(xC, 5.0) * 0.075 + fbm(xC * 0.3 + 17.0, 3.0) * 0.05;
  mTop = 0.42 + prof + yS;
  ridge = smoothstep(mTop + 0.004, mTop - 0.001, uv.y);
  rDist = abs(uv.y - mTop);
  rGlow = smoothstep(0.010, 0.0, rDist) * 0.30;
  col = mix(col, lC, ridge);
  col += rim * rGlow;

  // 1
  lC   = vec3(0.557, 0.569, 0.553);
  xC   = uv.x * aspect * 2.1 + u_time * 0.014 + ptr.x * 0.026;
  yS   = ptr.y * 0.008;
  prof = fbm(xC, 5.0) * 0.10 + fbm(xC * 0.3 + 34.0, 3.0) * 0.07;
  mTop = 0.34 + prof + yS;
  ridge = smoothstep(mTop + 0.004, mTop - 0.001, uv.y);
  rDist = abs(uv.y - mTop);
  rGlow = smoothstep(0.010, 0.0, rDist) * 0.26;
  col = mix(col, lC, ridge);
  col += rim * rGlow;

  // 2
  lC   = vec3(0.427, 0.439, 0.424);
  xC   = uv.x * aspect * 2.6 + u_time * 0.021 + ptr.x * 0.038;
  yS   = ptr.y * 0.011;
  prof = fbm(xC, 5.0) * 0.125 + fbm(xC * 0.3 + 51.0, 3.0) * 0.088;
  mTop = 0.26 + prof + yS;
  ridge = smoothstep(mTop + 0.004, mTop - 0.001, uv.y);
  rDist = abs(uv.y - mTop);
  rGlow = smoothstep(0.010, 0.0, rDist) * 0.22;
  col = mix(col, lC, ridge);
  col += rim * rGlow;

  // 3
  lC   = vec3(0.271, 0.267, 0.247);
  xC   = uv.x * aspect * 3.2 + u_time * 0.030 + ptr.x * 0.052;
  yS   = ptr.y * 0.015;
  prof = fbm(xC, 5.0) * 0.115 + fbm(xC * 0.3 + 68.0, 3.0) * 0.08;
  mTop = 0.17 + prof + yS;
  ridge = smoothstep(mTop + 0.004, mTop - 0.001, uv.y);
  rDist = abs(uv.y - mTop);
  rGlow = smoothstep(0.010, 0.0, rDist) * 0.17;
  col = mix(col, lC, ridge);
  col += rim * rGlow;

  // 4 — nearest, ink
  lC   = vec3(0.110, 0.090, 0.090);
  xC   = uv.x * aspect * 4.0 + u_time * 0.042 + ptr.x * 0.070;
  yS   = ptr.y * 0.020;
  prof = fbm(xC, 5.0) * 0.09 + fbm(xC * 0.3 + 85.0, 3.0) * 0.063;
  mTop = 0.085 + prof + yS;
  ridge = smoothstep(mTop + 0.004, mTop - 0.001, uv.y);
  rDist = abs(uv.y - mTop);
  rGlow = smoothstep(0.010, 0.0, rDist) * 0.13;
  col = mix(col, lC, ridge);
  col += rim * rGlow;

  /* horizon haze and a soft vignette, as in the reference */
  float haze = exp(-pow((uv.y - 0.40) * 5.0, 2.0)) * 0.05;
  col += vec3(1.0, 1.0, 1.0) * haze;

  float vig = 1.0 - 0.10 * pow(length((uv - 0.5) * vec2(1.1, 1.4)), 2.0);
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, src, type) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('[ridge-field] shader failed:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export default function RidgeField({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false })
      || canvas.getContext('experimental-webgl');
    /* No WebGL: the CSS gradient underneath is the fallback. */
    if (!gl) { canvas.style.display = 'none'; return undefined; }

    const vs = compile(gl, VERT, gl.VERTEX_SHADER);
    const fs = compile(gl, FRAG, gl.FRAGMENT_SHADER);
    if (!vs || !fs) { canvas.style.display = 'none'; return undefined; }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.style.display = 'none'; return undefined; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uPtr = gl.getUniformLocation(prog, 'u_pointer');

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let still = !!reduced?.matches;

    /* target and smoothed pointer — the lerp is what keeps the
       parallax from feeling twitchy */
    let px = 0.5, py = 0.5, sx = 0.5, sy = 0.5;
    const onPointer = (e) => {
      px = e.clientX / window.innerWidth;
      py = 1 - e.clientY / window.innerHeight;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    let raf = 0;
    let running = true;

    const draw = (tMs) => {
      const t = still ? 0 : tMs * 0.001;
      sx += (px - sx) * 0.04;
      sy += (py - sy) * 0.04;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uPtr, still ? 0.5 : sx, still ? 0.5 : sy);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const frame = (tMs) => {
      draw(tMs);
      if (running && !still) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf) cancelAnimationFrame(raf);
      running = true;
      raf = requestAnimationFrame(frame);
    };

    /* Don't burn a GPU loop on a tab nobody is looking at. */
    const onVisibility = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!still) start();
    };

    const onMotionChange = () => {
      still = !!reduced?.matches;
      if (still) { cancelAnimationFrame(raf); draw(0); } else start();
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    reduced?.addEventListener?.('change', onMotionChange);
    if (!still) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      start();
    } else {
      draw(0);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      reduced?.removeEventListener?.('change', onMotionChange);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return <canvas ref={canvasRef} className={`ridge-field ${className}`} aria-hidden="true" />;
}
