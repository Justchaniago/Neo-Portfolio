import { getPerformanceProfile } from "@/lib/performanceTier";

const hash = (n: number) => {
  const v = Math.sin(n * 127.1 + 28.3) * 43758.5453;
  return v - Math.floor(v);
};
const grain = (x: number, seed: number) => {
  const i = Math.floor(x), f = x - i, a = hash(i + seed);
  return a + (hash(i + seed + 1) - a) * f * f * (3 - 2 * f) - 0.5;
};
const smooth = (n: number) => {
  const t = Math.max(0, Math.min(1, n));
  return t * t * (3 - 2 * t);
};
// A slightly underdamped surface: it trails the scroll, then swings back once.
const STIFF = 46, DAMP = 6.4, SPREAD = 1300, LAG = 0.2;
const RING = 32;

type Pore = {
  lane: number; seed: number; period: number; size: number; shape: Float32Array;
  x: number; y: number; radius: number; stretch: number;
};

/** Only the band across the leading edge needs ink. Native scroll moves the rest. */
export function createBurnEdge(canvas: HTMLCanvasElement, section: HTMLElement) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, view = 1, dpr = 1, rise = 0, tall = 0, pad = 1, swell = 0, nodes = 1;
  let p = -1, lastY = NaN, raf = 0, lastTime = 0, clock = 0, parked = -1;
  let xs = new Float32Array(0), rest = xs, rim = xs, at = xs;
  let d = xs, v = xs, pull = xs, surface = xs;
  let pores: Pore[] = [];

  const calm = () => {
    cancelAnimationFrame(raf);
    raf = lastTime = 0;
    d.fill(0); v.fill(0);
  };

  function resize(width: number, viewHeight: number, enabled: boolean) {
    if (!ctx || !enabled || !width || !viewHeight) {
      calm();
      delete section.dataset.burnReady;
      delete section.dataset.burning;
      delete section.dataset.burnSealed;
      p = parked = -1; lastY = NaN;
      return;
    }
    const perf = getPerformanceProfile();
    const depth = Math.round(Math.min(viewHeight * 0.22, Math.max(78, width * 0.14), 174));
    const ratio = Math.min(window.devicePixelRatio || 1, perf.maxCanvasDpr, 1.5);
    section.dataset.burnReady = "";
    view = viewHeight;
    if (width === w && h === depth && dpr === ratio) return;
    calm();
    w = width; h = depth; dpr = ratio; p = parked = -1; lastY = NaN;
    pad = Math.max(20, Math.min(46, Math.round(h * 0.28)));
    swell = h * 0.18;
    const shore = (x: number) => {
      const u = x / w;
      return h * (0.51 + 0.31 * grain(u * 4, 76) + 0.17 * grain(u * 11, 13)
        + 0.085 * grain(x / 19, 24) + 0.036 * grain(x / 5, 115)) + grain(x / 1.7, 75) * 2.3;
    };
    const count = Math.ceil(w / 1.6);
    nodes = Math.max(24, Math.min(128, Math.round(w / 13)));
    xs = new Float32Array(count + 1); rest = new Float32Array(count + 1);
    rim = new Float32Array(count + 1); at = new Float32Array(count + 1);
    for (let i = 0; i <= count; i++) {
      const x = w * i / count;
      xs[i] = x; rest[i] = shore(x); at[i] = i / count * nodes;
    }
    d = new Float32Array(nodes + 1); v = new Float32Array(nodes + 1); surface = new Float32Array(nodes + 1);
    // Uneven drag is what turns one pull into ripples along the edge.
    pull = Float32Array.from({ length: nodes + 1 }, (_, i) => 1 + 0.9 * grain(i / 5, 51));
    const ring = (i: number) => Float32Array.from({ length: RING }, (_, j) =>
      0.85 + 0.32 * hash(j + 43 * i) + 0.1 * Math.cos(3 * j * 2 * Math.PI / RING));
    const lanes = w < 600 ? 4 : 6;
    pores = Array.from({ length: lanes }, (_, i) => {
      return { lane: (i + 0.5) / lanes, seed: i / lanes + hash(i + 5) * 0.12,
        period: 3.2 + hash(i + 17) * 1.8, size: h * (0.062 + 0.052 * hash(i + 11)),
        shape: ring(i), x: 0, y: 0, radius: 0, stretch: 1 };
    });
    rise = Math.ceil(h * 1.55 + pad + swell);
    const depthBelow = Math.ceil(h + pad + swell);
    tall = rise + depthBelow + 2;
    section.style.setProperty("--burn-rise", `${rise}px`);
    section.style.setProperty("--burn-depth", `${depthBelow}px`);
    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(tall * dpr);
  }

  function step(dt: number) {
    const steps = Math.max(1, Math.ceil(dt * 120)), s = dt / steps;
    for (let k = 0; k < steps; k++) {
      let left = d[0];
      for (let i = 0; i <= nodes; i++) {
        const here = d[i], right = i < nodes ? d[i + 1] : here;
        v[i] += (SPREAD * (left + right - 2 * here) - STIFF * here - DAMP * v[i]) * s;
        left = here;
      }
      for (let i = 0; i <= nodes; i++) d[i] += v[i] * s;
    }
    clock += dt;
    const k1 = 2 * Math.PI / Math.max(200, Math.min(860, w * 0.69));
    for (let i = 0; i <= nodes; i++) {
      const x = i / nodes * w;
      surface[i] = pad * Math.tanh(d[i] / pad) + swell * (0.61 * Math.sin(x * k1 - clock * 1.13)
        + 0.32 * Math.sin(x * k1 * 2.1 + clock * 0.83 + 1.3) + 0.12 * Math.sin(x * k1 * 4.8 - clock * 1.54 + 4));
    }
  }

  // Each drop draws the shore towards itself. It finishes beneath the same
  // contour that swallows it; a short outward ripple releases the displaced ink.
  function absorb(live: number) {
    const density = (rim.length - 1) / w;
    for (const pore of pores) {
      const age = clock / pore.period + pore.seed;
      const cycle = Math.floor(age), life = age - cycle;
      const turn = hash(cycle + pore.seed * 73) - 0.5;
      const size = pore.size * (1 + turn * 0.35) * live;
      const fall = smooth((life - 0.19) / 0.58);
      const x = pore.x = w * (pore.lane + turn * 0.12) + size * (1 - fall) * turn * 2.7;
      const i = x * density, j = Math.floor(i);
      const shore = rim[j] + (rim[j + 1] - rim[j]) * (i - j);
      pore.radius = size * smooth(life / 0.21) * (1 - smooth((life - 0.78) / 0.18));
      pore.stretch = 1 + 0.22 * Math.sin(Math.PI * fall);
      pore.y = shore + size * (-3.8 + fall * 6);
      if (size < 0.1) continue;
      const catchUp = smooth((life - 0.12) / 0.40) * (1 - smooth((life - 0.58) / 0.22));
      const release = smooth((life - 0.55) / 0.41);
      const wake = Math.sin(Math.PI * release);
      const extent = size * 7, lo = Math.max(0, Math.floor((x - extent) * density));
      const hi = Math.min(rim.length - 1, Math.ceil((x + extent) * density));
      for (let k = lo; k <= hi; k++) {
        const dist = Math.abs(xs[k] - x) / size, front = dist - release * 4.6;
        rim[k] -= size * (1.4 * catchUp * Math.exp(-dist * dist * 0.56)
          + wake * 0.49 * Math.cos(front * 2.5) * Math.exp(-front * front));
      }
    }
  }

  function paint() {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, tall);
    ctx.fillStyle = "#050507";
    const origin = rise - h * p;
    // The surface is still where the edge enters and where it seals the screen.
    const live = smooth(p / 0.12) * (1 - smooth((p - 0.82) / 0.18));
    for (let i = 0; i < xs.length; i++) {
      const a = at[i], j = Math.min(nodes - 1, a | 0);
      const wave = surface[j] + (surface[j + 1] - surface[j]) * (a - j);
      rim[i] = origin + rest[i] + live * wave;
    }
    absorb(live);
    ctx.beginPath();
    ctx.moveTo(0, tall);
    for (let i = 0; i < xs.length; i++) ctx.lineTo(xs[i], rim[i]);
    ctx.lineTo(w, tall);
    ctx.fill();
    for (const pore of pores) {
      if (pore.radius < 0.45) continue;
      ctx.setTransform(dpr / Math.sqrt(pore.stretch), 0, 0, dpr * pore.stretch, pore.x * dpr, pore.y * dpr);
      ctx.beginPath();
      for (let j = 0; j < RING; j++) {
        const a = j * 2 * Math.PI / RING;
        const r = pore.radius * (pore.shape[j] + 0.08 * Math.sin(2 * a + clock * 0.9 + pore.seed * 7)
          + 0.05 * Math.sin(3 * a - clock * 1.4 + pore.seed * 3));
        ctx.lineTo(r * Math.cos(a), r * Math.sin(a) * 1.14);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  const tick = (time: number) => {
    raf = 0;
    if (p <= 0 || p >= 1) return;
    step(lastTime ? Math.min(0.05, Math.max(0.001, (time - lastTime) / 1000)) : 1 / 60);
    lastTime = time;
    paint();
    raf = requestAnimationFrame(tick);
  };

  /** `y` is the scroll position in px; its change is what drags the surface. */
  function scroll(progress: number, y: number) {
    if (!ctx || !section.hasAttribute("data-burn-ready")) return;
    const entering = p <= 0 || p >= 1;
    const delta = Number.isNaN(lastY) ? 0 : y - lastY;
    const jump = Math.abs(delta) > view * 0.22;
    lastY = y;
    p = progress;
    if (p <= 0 || p >= 1) {
      if (section.hasAttribute("data-burning")) { delete section.dataset.burning; calm(); }
      // Scroll events can arrive a frame after the page has moved (Safari). Leave the band
      // painted for this end and keep it on screen, so that frame never shows a bare seam.
      if (parked !== p) { paint(); parked = p; }
      section.toggleAttribute("data-burn-sealed", p >= 1);
      return;
    }
    parked = -1;
    delete section.dataset.burnSealed;
    if (jump) calm();
    else if (!entering && delta) {
      for (let i = 0; i <= nodes; i++) d[i] = Math.max(-pad * 2, Math.min(pad * 2, d[i] + delta * LAG * pull[i]));
    }
    if (entering || jump) {
      // Never expose an empty (or previous-position) band when a flick skips
      // the lead-in. Install its pixels before clipping the opaque stage.
      step(0); paint();
      section.dataset.burning = "";
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  return { resize, scroll };
}
