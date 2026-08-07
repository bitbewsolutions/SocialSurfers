/**
 * The hero current — an ink-in-water field that flows forever.
 *
 * Raw WebGL, one full-screen triangle, one fragment shader. No Three.js: this is a
 * 2D effect, so there is no scene, camera, light or material to manage — the parts
 * of Three.js that justify its ~150 KB are all unused here. This file is ~4 KB.
 *
 * It never loops. The field is domain-warped fractal noise evaluated from a clock,
 * so there is no cycle to seam — unlike a video, which is the usual way to get this
 * look and costs 1–3 MB plus a visible repeat.
 *
 * Defensive by default: no WebGL, a lost context, a weak device or
 * prefers-reduced-motion all fall back to the static CSS gradient underneath, and
 * the canvas simply never paints.
 */

const VERT = `#version 100
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 100
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uPointer;   // 0..1, eased
uniform float uOct;       // octave count, lowered on small screens
uniform float uNarrow;    // 1.0 when the hero has stacked to one column

// --- 2D simplex noise (Ashima/IQ, the standard compact form) ---
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    if (float(i) >= uOct) break;
    s += a * snoise(p);
    p *= 1.92;
    a *= 0.42;   // low persistence: high octaves add veining, not body
  }
  return s;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  // keep the field's proportions stable regardless of viewport aspect
  vec2 p = vec2(uv.x * (uRes.x / uRes.y), uv.y);

  // Low spatial frequency on purpose. At the density you'd use for a texture this
  // reads as marbled paper; a current needs features about as big as the element.
  p *= 0.78;

  float t = uTime * 0.028;
  vec2 pt = uPointer * 0.06;

  // Domain warping (the IQ construction): noise whose input is itself noise, twice.
  // The warp amplitude is large relative to the feature size, which is what turns
  // smooth blobs into something that folds and shears like liquid.
  vec2 q = vec2(fbm(p + vec2(0.0, t)),
                fbm(p + vec2(5.2, 1.3) + t * 0.8));
  vec2 r = vec2(fbm(p + 1.5 * q + vec2(1.7, 9.2) - t * 0.6 + pt),
                fbm(p + 1.5 * q + vec2(8.3, 2.8) + t * 0.5 + pt));
  float f = fbm(p + 1.3 * r);

  float v = clamp(f * 0.9 + 0.5, 0.0, 1.0);

  // brand ramp, weighted deep — the pale end of the pink is what made it look washed
  vec3 c1 = vec3(0.184, 0.071, 0.322);  // near-ink violet
  vec3 c2 = vec3(0.290, 0.106, 0.447);  // --violet
  vec3 c3 = vec3(0.557, 0.110, 0.455);  // --magenta
  vec3 c4 = vec3(0.769, 0.106, 0.431);  // --rose
  vec3 c5 = vec3(1.000, 0.416, 0.302);  // --coral, crests only
  vec3 col = mix(c1, c2, smoothstep(0.05, 0.46, v));
  col = mix(col, c3, smoothstep(0.48, 0.74, v));
  col = mix(col, c4, smoothstep(0.76, 0.92, v));
  col = mix(col, c5, smoothstep(0.93, 1.00, v) * 0.5);

  // --- composition ---
  // A tilted ribbon whose centreline is displaced by the same warp that shapes the
  // colour, so the edge wanders instead of reading as a straight-sided band. This
  // is the difference between a current and a wallpaper.
  float axis   = uv.y - (uv.x - 0.5) * mix(0.5, 0.16, uNarrow);
  float centre = mix(0.52, 0.30, uNarrow) + r.y * 0.22 + q.x * 0.10;
  float ribbon = 1.0 - smoothstep(0.02, 0.52, abs(axis - centre));

  // Where the copy is depends on the layout, so the mask has to follow it.
  // Two columns: copy left, current right. One column: copy on top, current below —
  // masking by x on a phone put the field directly behind the headline.
  // (gl_FragCoord.y is 0 at the BOTTOM, so low uv.y is the bottom of the hero.)
  float wideX  = smoothstep(0.42, 0.88, uv.x + pt.x);
  float wideY  = smoothstep(-0.02, 0.30, uv.y) * smoothstep(1.02, 0.66, uv.y);
  float narrowY = (1.0 - smoothstep(0.14, 0.70, uv.y)) * smoothstep(-0.10, 0.16, uv.y);
  float across = mix(wideX, 1.0, uNarrow);
  float updown = mix(wideY, narrowY, uNarrow);

  float body   = smoothstep(0.04, 0.60, v);
  float alpha  = across * updown * ribbon * body;

  // thin the leading edge so it dissolves into the paper instead of stopping
  alpha *= smoothstep(0.0, 0.30, alpha);

  gl_FragColor = vec4(col, alpha);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function initFluid(canvas: HTMLCanvasElement) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // very low-core devices get the static gradient rather than a stuttering field
  if ((navigator.hardwareConcurrency || 8) <= 2) return;

  const gl =
    (canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, powerPreference: 'low-power' }) as WebGLRenderingContext | null) ??
    (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
  if (!gl) return; // no WebGL — CSS fallback stands

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  // one oversized triangle beats two quad triangles: no diagonal seam, 1 fewer vertex
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uPointer = gl.getUniformLocation(prog, 'uPointer');
  const uOct = gl.getUniformLocation(prog, 'uOct');
  const uNarrow = gl.getUniformLocation(prog, 'uNarrow');

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let W = 0;
  let H = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    // Deliberately NOT devicePixelRatio. This is a soft organic field with no edges
    // to alias, so rendering at ~0.55x and letting the browser upscale costs nothing
    // visually and roughly a third of the fragment work on a retina phone.
    const scale = r.width < 760 ? 0.5 : 0.55;
    W = Math.max(1, Math.round(r.width * scale));
    H = Math.max(1, Math.round(r.height * scale));
    canvas.width = W;
    canvas.height = H;
    gl!.viewport(0, 0, W, H);
    gl!.uniform2f(uRes, W, H);
    gl!.uniform1f(uOct, r.width < 760 ? 3 : 4);
    // must match the hero stylesheet breakpoint that stacks .inner to one column
    gl!.uniform1f(uNarrow, r.width < 900 ? 1 : 0);
  }

  // pointer parallax, eased — the field leans toward the cursor
  let px = 0, py = 0, tx = 0, ty = 0;
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  let visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { visible = es[0]!.isIntersecting; }, { threshold: 0 })
      .observe(canvas);
  }

  let lost = false;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; resize(); });

  const t0 = performance.now();
  function frame(now: number) {
    requestAnimationFrame(frame);
    if (lost || !visible || document.hidden) return; // offscreen = zero GPU work
    px += (tx - px) * 0.05;
    py += (ty - py) * 0.05;
    gl!.uniform1f(uTime, (now - t0) / 1000);
    gl!.uniform2f(uPointer, px, py);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  addEventListener('resize', resize, { passive: true });
  resize();
  canvas.dataset.live = 'true'; // lets CSS drop the static fallback underneath
  requestAnimationFrame(frame);
}
