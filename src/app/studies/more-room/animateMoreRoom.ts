import { getPerformanceProfile } from "@/lib/performanceTier";
import { SURABAYA } from "@/components/narrative/globeData";
import { ramp } from "@/components/narrative/globeArrival";
import { BASE, createRuled, LINES, type Sheet } from "./ruled";

const NARROW = 76;
const TIGHT = -0.058;
const OPEN = -0.035;
// Outer rules leave first; the baseline stays until it becomes the full stop.
const ORDER = [0, 5, 1, 4, 2];
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function animateMoreRoom(root: HTMLElement) {
  const find = <T extends HTMLElement>(name: string) => root.querySelector<T>(`[data-${name}]`)!;
  const stage = find("stage"), track = find("track"), field = find("field"), copy = find("copy");
  const title = find("title"), period = find("period"), mark = find("baseline");
  const work = find<HTMLAnchorElement>("work");
  const quiet = matchMedia("(prefers-reduced-motion: reduce), (forced-colors: active)");
  const probe = document.createElement("canvas").getContext("2d");
  const abort = new AbortController();
  const retreat = new Array<number>(LINES).fill(0);
  let points: Int16Array | undefined, canvas: HTMLCanvasElement | undefined;
  let ruled: ReturnType<typeof createRuled> | undefined, sheet: Sheet | undefined;
  let home = { x: 0, y: 0 }, dot = { x: 0, y: 0, size: 6 };
  let travel = 1, raf = 0, clock = 0, current = 0, painted = -1, inked = "", measured = "";
  let loading = false, disposed = false, visible = true;

  function draw(p: number) {
    if (!sheet || !ruled || p === painted) return;
    painted = p;
    const gather = ramp(p, 0.04, 0.24), open = ramp(p, 0.24, 0.62);
    const collapse = ramp(p, 0.63, 0.79), absorb = ramp(p, 0.77, 0.84), lift = ramp(p, 0.74, 0.84);
    ORDER.forEach((line, turn) => { retreat[line] = ramp(p, 0.24 + turn * 0.064, 0.364 + turn * 0.064); });
    const pinX = mix(home.x, dot.x, gather);
    const pinY = mix(mix(home.y, sheet.y[BASE], gather), dot.y, lift);
    const style = stage.style;
    style.setProperty("--pin-x", `${pinX}px`);
    style.setProperty("--pin-y", `${pinY}px`);
    style.setProperty("--pin-size", `${mix(6, dot.size, lift)}px`);
    style.setProperty("--origin", String(1 - ramp(p, 0.02, 0.1)));
    style.setProperty("--title", String(ramp(p, 0.1, 0.24)));
    style.setProperty("--wdth", mix(NARROW, 100, open).toFixed(2));
    style.setProperty("--track", mix(TIGHT, OPEN, open).toFixed(4));
    style.setProperty("--body", String(ramp(p, 0.8, 0.92)));
    root.toggleAttribute("data-ready", p >= 0.86);
    // Hold still once the rules are gone: the last stretch moves type only.
    const pose = [gather, collapse, absorb, lift, ...retreat].join();
    if (pose !== inked) {
      inked = pose;
      ruled.draw({ gather, retreat, collapse, absorb, pinX, pinY });
    }
  }
  const target = () => Math.min(1, Math.max(0, root.scrollTop / travel));
  function tick(now: number) {
    raf = 0;
    if (disposed || document.hidden || !visible || !root.hasAttribute("data-motion")) return;
    const next = target(), dt = Math.min(60, now - (clock || now - 16));
    clock = now;
    current += (next - current) * -Math.expm1(-dt / 53);
    if (Math.abs(next - current) < 0.00007) current = next;
    draw(current);
    if (current !== next) raf = requestAnimationFrame(tick);
  }
  function wake() {
    if (!raf && !disposed && visible && !document.hidden && root.hasAttribute("data-motion")) {
      clock = 0;
      raf = requestAnimationFrame(tick);
    }
  }
  function release() {
    canvas?.removeEventListener("webglcontextlost", lost);
    ruled?.dispose(); canvas?.remove();
    canvas = undefined; ruled = undefined; measured = "";
  }
  function staticView() {
    const animated = root.hasAttribute("data-motion"), closing = root.scrollTop >= track.offsetHeight - 2;
    root.removeAttribute("data-motion"); root.removeAttribute("data-ready");
    cancelAnimationFrame(raf); raf = 0;
    release();
    if (animated) root.scrollTop = closing ? track.offsetHeight : 0;
  }
  function measure() {
    if (!ruled || !root.hasAttribute("data-motion")) return;
    // Geometry belongs to the settled headline, whatever the scroll position.
    stage.style.setProperty("--wdth", "100");
    stage.style.setProperty("--track", String(OPEN));
    const w = stage.clientWidth, h = stage.clientHeight, box = stage.getBoundingClientRect();
    const text = copy.getBoundingClientRect(), head = title.getBoundingClientRect();
    // Enlarged text has priority over the pinned composition.
    if (text.height > h - 96 || title.scrollWidth > title.clientWidth + 1) { staticView(); return; }
    const type = getComputedStyle(title), size = parseFloat(type.fontSize);
    let ink = { left: 0, right: size * 0.14, up: size * 0.14, down: 0 };
    if (probe) {
      probe.font = `${type.fontWeight} ${size}px ${type.fontFamily}`;
      const m = probe.measureText(".");
      ink = { left: m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight, up: m.actualBoundingBoxAscent, down: m.actualBoundingBoxDescent };
    }
    const base = mark.getBoundingClientRect().top - box.top;
    dot = {
      x: period.getBoundingClientRect().left - box.left + (ink.right - ink.left) / 2,
      y: base - (ink.up - ink.down) / 2,
      size: Math.max(ink.left + ink.right, ink.up + ink.down),
    };
    const near = head.top - box.top - 0.07 * size, under = base + 0.15 * size;
    // Rules stay clear of the fixed header.
    const gap = Math.max(5, Math.min(0.36 * size, (near - 72) / 2));
    const mapScale = Math.min((w - 32) / 50, Math.max(4, h - 190) / 22);
    const next: Sheet = {
      w, h, dpr: Math.min(devicePixelRatio || 1, getPerformanceProfile().maxWebglDpr),
      mapX: w / 2, mapY: h * 0.52, mapScale,
      y: [near - 2 * gap, near - gap, near, under, under + gap, under + 2 * gap],
      x0: text.left - box.left, x1: text.right - box.left, baseX1: dot.x,
    };
    home = { x: next.mapX + (SURABAYA.lon - 118) * mapScale, y: next.mapY - (SURABAYA.lat + 2.5) * mapScale };
    const key = JSON.stringify([next, dot]);
    if (key !== measured) {
      measured = key; sheet = next;
      ruled.resize(next);
      painted = -1; inked = "";
    }
    travel = Math.max(1, track.offsetHeight - h);
    current = target(); painted = -1;
    draw(current);
  }
  function install(cpu = false) {
    if (!points || disposed || quiet.matches) return;
    release();
    canvas = document.createElement("canvas");
    try { ruled = createRuled(canvas, points, cpu); }
    catch { if (!cpu) install(true); else staticView(); return; }
    canvas.dataset.renderer = cpu ? "2d" : "gpu";
    if (!cpu) canvas.addEventListener("webglcontextlost", lost);
    field.append(canvas);
    root.setAttribute("data-motion", "");
    measure();
  }
  function lost(event: Event) { event.preventDefault(); install(true); }
  async function mode() {
    if (quiet.matches) { staticView(); return; }
    if (root.scrollTop > 4 && !ruled) return; // Don't repin underneath someone already reading.
    if (points) { install(); return; }
    if (loading) return;
    loading = true;
    try {
      const type = getComputedStyle(title);
      const [bytes] = await Promise.all([
        fetch("/maps/earth-points.v1.bin", { signal: abort.signal }).then(response => {
          if (!response.ok) throw Error("Missing point data");
          return response.arrayBuffer();
        }),
        document.fonts.load(`${type.fontWeight} 96px ${type.fontFamily}`, "More room.").catch(() => []),
      ]);
      if (disposed || !bytes.byteLength || bytes.byteLength % 12) return;
      points = new Int16Array(bytes);
      if (root.scrollTop <= 4) install();
    } catch { if (!disposed) staticView(); }
    finally { loading = false; }
  }
  const reveal = () => {
    if (root.hasAttribute("data-motion") && !root.hasAttribute("data-ready")) {
      root.scrollTop = Math.round(travel * 0.94);
      current = target();
      draw(current);
    }
  };
  const resize = new ResizeObserver(measure);
  resize.observe(stage); resize.observe(copy);
  const watch = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake(); else { cancelAnimationFrame(raf); raf = 0; }
  }, { root });
  watch.observe(stage);
  root.addEventListener("scroll", wake, { passive: true });
  work.addEventListener("focus", reveal);
  quiet.addEventListener("change", mode);
  document.addEventListener("visibilitychange", wake);
  void document.fonts.ready.then(() => { if (!disposed) measure(); });
  void mode();
  return () => {
    disposed = true; abort.abort(); cancelAnimationFrame(raf); release();
    resize.disconnect(); watch.disconnect();
    root.removeEventListener("scroll", wake); work.removeEventListener("focus", reveal);
    quiet.removeEventListener("change", mode); document.removeEventListener("visibilitychange", wake);
    root.removeAttribute("data-motion"); root.removeAttribute("data-ready");
  };
}
