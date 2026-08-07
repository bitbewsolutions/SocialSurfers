/**
 * The Swell Line — the hero's signature instrument.
 *
 * One STABLE crest (so the rider has a peak that stays put) plus travelling ripples
 * whose amplitude swells toward that crest. Reads as a live chart with one big set
 * rolling through, rather than a decorative sine wave.
 *
 * Deliberately dependency-free: this runs before anything else on the page, so it
 * must not wait on GSAP. GSAP loads later, for the sections that actually need it.
 */

interface WaveConf {
  crestX: number;
  crestH: number;
  sigma: number;
  baseY: number;
  amp: number;
}

interface Particle {
  x: number; y: number; r: number;
  vx: number; vy: number;
  p: number; s: number;
}

const SAMPLE_STEP = 8;

export function initSwell(root: HTMLElement) {
  const svg = root.querySelector<SVGSVGElement>('[data-swell-svg]');
  const pathDef = root.querySelector<SVGPathElement>('[data-swell-path]');
  const rider = root.querySelector<SVGGElement>('[data-swell-rider]');
  const canvas = root.querySelector<HTMLCanvasElement>('[data-swell-particles]');
  const subEl = root.querySelector<HTMLElement>('[data-swell-anchor]');
  if (!svg || !pathDef || !rider) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const weak = (navigator.hardwareConcurrency || 8) <= 4;

  let W = 0;
  let H = 0;
  let conf: WaveConf = { crestX: 0.72, crestH: 0.28, sigma: 0.115, baseY: 0.71, amp: 0.034 };

  function tune() {
    if (W < 760 && subEl) {
      // Mobile gets the line its OWN band, measured off live layout, so it never
      // crosses the copy or the buttons. CSS reserves the gap; this fills it.
      const hTop = root.getBoundingClientRect().top;
      const subB = subEl.getBoundingClientRect().bottom - hTop;
      conf = { crestX: 0.5, crestH: 88 / H, sigma: 0.19, baseY: (subB + 130) / H, amp: 0.014 };
    } else if (W < 1100) {
      conf = { crestX: 0.72, crestH: 0.26, sigma: 0.13, baseY: 0.7, amp: 0.03 };
    } else {
      conf = { crestX: 0.72, crestH: 0.28, sigma: 0.115, baseY: 0.71, amp: 0.034 };
    }
  }

  /**
   * Ripple wavelength is held in PIXELS, not in normalised u.
   *
   * The frequencies used to be constants against u (3.7 cycles across the width
   * whatever that width was), so a 390px phone got the same number of waves as a
   * 1440px desktop — one crest every ~105px instead of every ~389px — at nearly the
   * same amplitude. The line came out as spikes, and because the rider is rotated to
   * the local tangent it sat at ~54° on what should be the flat top of the crest.
   * Anchoring the wavelength to a reference width keeps the desktop shape identical
   * and makes narrow screens a gentle swell instead of a sawtooth.
   */
  const REF_W = 1440;
  const CYCLES = 3.7; // across REF_W — the original desktop look

  function waveY(u: number, t: number) {
    const d = u - conf.crestX;
    const env = Math.exp(-(d * d) / (2 * conf.sigma * conf.sigma));
    const breathe = 1 + 0.055 * Math.sin(t * 0.7);
    const crest = -conf.crestH * H * env * breathe;
    const a = conf.amp * H * (0.34 + 0.95 * env);
    const c = (W / REF_W) * CYCLES * 2 * Math.PI;
    const rip =
      a * Math.sin(u * c + t * 0.62) +
      a * 0.46 * Math.sin(u * c * 1.77 - t * 0.98 + 1.3) +
      a * 0.2 * Math.sin(u * c * 2.97 + t * 1.5 + 0.7);
    return conf.baseY * H + crest + rip;
  }

  function buildPath(t: number) {
    const n = Math.ceil(W / SAMPLE_STEP);
    let s = 'M0 ' + waveY(0, t).toFixed(2);
    for (let i = 1; i <= n; i++) {
      const x = Math.min(i * SAMPLE_STEP, W);
      s += 'L' + x.toFixed(1) + ' ' + waveY(x / W, t).toFixed(2);
    }
    pathDef!.setAttribute('d', s);
  }

  function placeRider(t: number) {
    const u = conf.crestX;
    const y = waveY(u, t);
    const dx = 0.004;
    const slope = (waveY(u + dx, t) - waveY(u - dx, t)) / (2 * dx * W);
    const ang = (Math.atan(slope) * 180) / Math.PI;
    const sc = W < 760 ? 0.72 : W < 1100 ? 0.82 : 1;
    rider!.setAttribute(
      'transform',
      `translate(${(u * W).toFixed(1)} ${y.toFixed(1)}) rotate(${ang.toFixed(2)}) scale(${sc})`,
    );
  }

  /* ——— ambient particles: hard-capped, offscreen-paused, off on weak devices ——— */
  let ctx: CanvasRenderingContext2D | null = null;
  let parts: Particle[] = [];
  let PN = 0;

  function initParticles() {
    if (!canvas) return;
    if (reduce || weak) {
      canvas.style.display = 'none';
      ctx = null;
      return;
    }
    ctx = canvas.getContext('2d', { alpha: true });
    PN = W < 760 ? 16 : 34;
    parts = [];
    for (let i = 0; i < PN; i++) {
      parts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.7 + Math.random() * 1.9,
        vx: (Math.random() - 0.5) * 0.16,
        vy: -(0.06 + Math.random() * 0.2),
        p: Math.random() * Math.PI * 2,
        s: 0.5 + Math.random() * 0.9,
      });
    }
  }

  function drawParticles(t: number) {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < PN; i++) {
      const p = parts[i]!;
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -12) { p.y = H + 12; p.x = Math.random() * W; }
      if (p.x < -12) p.x = W + 12;
      else if (p.x > W + 12) p.x = -12;
      const a = 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(t * p.s + p.p));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fillStyle = `rgba(234,28,130,${a.toFixed(3)})`;
      ctx.fill();
      if (p.r > 1.6) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.4, 0, 6.2832);
        ctx.fillStyle = `rgba(234,28,130,${(a * 0.09).toFixed(3)})`;
        ctx.fill();
      }
    }
  }

  function resize() {
    const r = root.getBoundingClientRect();
    W = Math.round(r.width);
    H = Math.round(r.height);
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // capped: retina phones don't need 3x
    svg!.setAttribute('viewBox', `0 0 ${W} ${H}`);
    if (canvas) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
    }
    initParticles();
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tune();
    buildPath(0);
    // measure the true arc length so the draw-in never jumps or stops short
    let len = 4000;
    try { len = Math.ceil(pathDef!.getTotalLength()) + 4; } catch { /* jsdom / no layout */ }
    svg!.style.setProperty('--len', String(len));
    placeRider(0);
  }

  let visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { visible = es[0]!.isIntersecting; }, { threshold: 0 }).observe(root);
  }

  const t0 = performance.now();
  function frame(now: number) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return; // offscreen = zero work
    const t = (now - t0) / 1000;
    buildPath(t);
    placeRider(t);
    drawParticles(t);
  }

  addEventListener('resize', resize, { passive: true });
  resize();
  if (document.fonts?.ready) document.fonts.ready.then(resize);

  if (reduce) {
    buildPath(0);
    placeRider(0); // still renders — it just stops living
  } else {
    requestAnimationFrame(frame);
  }
}

/** Pointer refraction glow. Desktop + hover-capable only — mobile has no cursor. */
export function initPointerGlow(root: HTMLElement) {
  const glow = root.querySelector<HTMLElement>('[data-swell-glow]');
  if (!glow) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(hover:hover) and (pointer:fine) and (min-width:1024px)').matches) return;

  let gx = 0, gy = 0, tx = 0, ty = 0, on = false, raf = 0;

  root.addEventListener('pointermove', (e) => {
    const r = root.getBoundingClientRect();
    tx = e.clientX - r.left;
    ty = e.clientY - r.top;
    if (!on) { on = true; gx = tx; gy = ty; glow.style.opacity = '1'; loop(); }
  }, { passive: true });

  root.addEventListener('pointerleave', () => {
    on = false;
    glow.style.opacity = '0';
    cancelAnimationFrame(raf);
  }, { passive: true });

  function loop() {
    if (!on) return;
    gx += (tx - gx) * 0.085; // the lag IS the refraction read
    gy += (ty - gy) * 0.085;
    glow.style.transform = `translate3d(${gx.toFixed(1)}px,${gy.toFixed(1)}px,0)`;
    raf = requestAnimationFrame(loop);
  }
}
