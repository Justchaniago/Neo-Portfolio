import { getPerformanceProfile } from "@/lib/performanceTier";
import { ramp } from "@/components/narrative/globeArrival";
import { createPointCloud, createPointFallback } from "@/components/narrative/pointCloud";
import { makeLetterpress } from "./letterpress";

type Press = ReturnType<typeof makeLetterpress>;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function animateFieldwork(root: HTMLElement) {
  const stage = root.querySelector<HTMLElement>("[data-stage]")!;
  const track = root.querySelector<HTMLElement>("[data-track]")!;
  const field = root.querySelector<HTMLElement>("[data-field]")!;
  const opening = stage.querySelector<HTMLElement>("section")!;
  const question = root.querySelector<HTMLElement>("[data-question]")!;
  const answer = question.parentElement!;
  const work = root.querySelector<HTMLAnchorElement>("[data-work]")!;
  const quiet = matchMedia("(prefers-reduced-motion: reduce), (forced-colors: active)");
  const abort = new AbortController();
  let bytes: ArrayBuffer | undefined, press: Press | undefined, layout: ReturnType<Press> | undefined;
  let cloud: ReturnType<typeof createPointCloud> | ReturnType<typeof createPointFallback> | undefined;
  let canvas: HTMLCanvasElement | undefined, fetching = false, disposed = false, visible = true;
  let travel = 1, raf = 0, clock = 0, current = 0, lastFrame = -1, lastShape = -1, sizeKey = "";

  function draw(p: number) {
    if (!layout || !cloud || p === lastFrame) return;
    lastFrame = p;
    const shape = ramp(p, .19, .79), bow = 4 * shape * (1 - shape);
    const lift = Math.min(24, Math.abs(layout.shiftX + layout.shiftY) * .08) * bow;
    const style = stage.style;
    style.setProperty("--field-x", `${layout.shiftX * (1 - shape)}px`);
    style.setProperty("--field-y", `${layout.shiftY * (1 - shape) - lift}px`);
    style.setProperty("--pin-x", `${mix(layout.homeX, layout.endX, shape)}px`);
    style.setProperty("--pin-y", `${mix(layout.homeY, layout.endY, shape) - lift}px`);
    style.setProperty("--pin-size", `${mix(6, layout.diameter, shape)}px`);
    style.setProperty("--opening", String(1 - ramp(p, .13, .42)));
    style.setProperty("--origin", String(1 - ramp(p, .10, .21)));
    style.setProperty("--guide", String(1 - ramp(p, .01, .14)));
    style.setProperty("--answer", String(ramp(p, .65, .84)));
    root.toggleAttribute("data-answer", p >= .78);
    if (lastShape !== shape) {
      cloud.draw({ progress: 1, flight: 1, scale: layout.mapScale, next: shape });
      lastShape = shape;
    }
  }
  const target = () => Math.min(1, Math.max(0, root.scrollTop / travel));
  function tick(now: number) {
    raf = 0;
    if (disposed || document.hidden || !visible || !root.hasAttribute("data-motion")) return;
    const next = target(), dt = Math.min(60, now - (clock || now - 16));
    clock = now;
    current += (next - current) * -Math.expm1(-dt / 53);
    if (Math.abs(next - current) < .00007) current = next;
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
    cloud?.dispose(); canvas?.remove();
    canvas = undefined; cloud = undefined; sizeKey = "";
  }
  function staticView() {
    const animated = root.hasAttribute("data-motion");
    const closing = root.scrollTop >= track.offsetHeight - 2;
    root.removeAttribute("data-motion"); root.removeAttribute("data-answer");
    cancelAnimationFrame(raf); raf = 0;
    release();
    if (animated) root.scrollTop = closing ? track.offsetHeight : current >= .52 ? answer.offsetTop : 0;
  }
  function measure() {
    if (!press || !cloud || !root.hasAttribute("data-motion")) return;
    const w = stage.clientWidth, h = stage.clientHeight, portrait = w <= 850 && h > w;
    const introBottom = opening.offsetTop + opening.offsetHeight * (portrait ? 1 : .5);
    const answerBottom = answer.offsetTop + answer.offsetHeight * (portrait ? 1 : .5);
    // Enlarged text has priority over the sticky composition.
    if (introBottom > h - (portrait ? 135 : 10) || answerBottom > h - 8 ||
        opening.scrollWidth > opening.clientWidth + 2 || answer.scrollWidth > answer.clientWidth + 2) {
      staticView(); return;
    }
    const edge = opening.offsetLeft, profile = getPerformanceProfile();
    const ratio = Math.min(devicePixelRatio || 1, profile.maxWebglDpr);
    const key = [w, h, edge, introBottom, answer.offsetTop, ratio, profile.tier].join(",");
    if (sizeKey !== key) {
      sizeKey = key;
      layout = press(w, h, edge, introBottom, answer.offsetTop);
      cloud.resize(w, h, ratio, profile.tier === "low"); cloud.setNextShape(layout.xy);
      travel = Math.max(1, track.offsetHeight - h);
      lastShape = lastFrame = -1;
    }
    current = target(); draw(current);
  }
  function install(cpu = false) {
    if (!bytes || !press || disposed || quiet.matches) return;
    release();
    canvas = document.createElement("canvas");
    try { cloud = cpu ? createPointFallback(canvas, bytes) : createPointCloud(canvas, bytes); }
    catch { if (!cpu) install(true); else staticView(); return; }
    canvas.dataset.renderer = cpu ? "2d" : "gpu";
    if (!cpu) canvas.addEventListener("webglcontextlost", lost);
    field.append(canvas); root.setAttribute("data-motion", ""); measure();
  }
  function lost(event: Event) { event.preventDefault(); install(true); }
  async function mode() {
    if (quiet.matches) { staticView(); return; }
    if (root.scrollTop > 4 && !cloud) return; // Don't repin underneath someone already reading.
    if (press) { install(); return; }
    if (fetching) return;
    fetching = true;
    try {
      const family = getComputedStyle(question).fontFamily;
      const data = await Promise.all([
        fetch("/maps/earth-points.v1.bin", { signal: abort.signal }).then(r => {
          if (!r.ok) throw Error("Missing point data");
          return r.arrayBuffer();
        }),
        document.fonts.load(`500 128px ${family}`, "What got easier?").catch(() => []),
      ]);
      if (disposed || !data[0].byteLength || data[0].byteLength % 12) return;
      bytes = data[0]; press = makeLetterpress(new Int16Array(bytes), family);
      if (root.scrollTop <= 4) install();
    } catch { if (!disposed) staticView(); }
    finally { fetching = false; }
  }
  const showWork = () => {
    if (root.hasAttribute("data-motion") && !root.hasAttribute("data-answer")) {
      root.scrollTop = Math.round(travel * .90); current = target(); draw(current);
    }
  };
  const resize = new ResizeObserver(measure);
  resize.observe(stage); resize.observe(opening); resize.observe(answer);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake(); else { cancelAnimationFrame(raf); raf = 0; }
  }, { root });
  io.observe(stage);
  root.addEventListener("scroll", wake, { passive: true });
  work.addEventListener("focus", showWork);
  quiet.addEventListener("change", mode);
  document.addEventListener("visibilitychange", wake);
  void mode();
  return () => {
    disposed = true; abort.abort(); cancelAnimationFrame(raf); release();
    resize.disconnect(); io.disconnect();
    root.removeEventListener("scroll", wake); work.removeEventListener("focus", showWork);
    quiet.removeEventListener("change", mode); document.removeEventListener("visibilitychange", wake);
    root.removeAttribute("data-motion"); root.removeAttribute("data-answer");
  };
}
