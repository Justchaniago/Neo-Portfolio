import { typePress } from "./typePress";
import { blueprintPen } from "./blueprintPen";

// The hero lines and project titles enter from this condensed width.
const FROM = 62;
// Google Sans Flex changes slope at its default width, so 100 must be a knot.
const AXIS = [25, 40, 55, 70, 85, 100, 117, 134, 151];
const SMALLEST = 48;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const phase = (value: number, from: number, to: number) => clamp((value - from) / (to - from));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const smooth = (t: number) => t * t * (3 - 2 * t);
const settings = (wdth: number) => `"wdth" ${wdth.toFixed(2)}, "opsz" 144`;

const read = (from: number[], to: number[], value: number) => {
  let i = 1;
  while (i < from.length - 1 && from[i] < value) i++;
  const span = from[i] - from[i - 1];
  return span > 0 ? to[i - 1] + (to[i] - to[i - 1]) * clamp((value - from[i - 1]) / span) : to[i];
};

export function animateCut(section: HTMLElement, scroller: HTMLElement) {
  const find = (name: string) => section.querySelector<HTMLElement>(`[data-cut-${name}]`)!;
  const stage = find("stage"), lead = find("lead"), word = find("word"), busy = find("busy");
  const work = find("work"), foot = find("foot"), contact = find("contact");
  const story = find("story");
  const proofRun = find("proof-run");
  const press = typePress(story);
  const pen = blueprintPen(section);
  const lanes = Array.from(section.querySelectorAll<HTMLElement>("[data-cut-lane]"));
  const tokens = Array.from(section.querySelectorAll<HTMLElement>("[data-cut-token]"));
  const still = matchMedia("(prefers-reduced-motion: reduce), (forced-colors: active)");
  const pinned = matchMedia("(prefers-reduced-motion: no-preference) and (min-height: 36rem)");
  const stacked = matchMedia("(max-aspect-ratio: 4/5)");
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:absolute;top:0;left:0;visibility:hidden;pointer-events:none;font-size:100px";
  word.append(probe);

  // Line length in em of each half at every width on AXIS.
  let busyEm: number[] = [], workEm: number[] = [];
  let stack = false, line = 1, size = 1, length = 1, exit = 0;
  let workFrom = 0, workTo = 0, narrow = 0, slack = 0, tall = 1;
  let start = 0, travel = 1, target = 0, current = 0, lit = -1;
  let seam = 0, viewHeight = 1, proofHold = 0, lastDraft = -1;
  let frame = 0, loop = 0, last = 0, live = false, visible = false, disposed = false;

  const em = (text: string, wdth: number) => {
    probe.textContent = text;
    probe.style.fontVariationSettings = settings(wdth);
    return probe.getBoundingClientRect().width / 100;
  };
  const rest = () => {
    for (const element of [stage, lead, busy, work, foot, ...lanes]) {
      element.style.removeProperty("transform");
      element.style.removeProperty("font-size");
      element.style.removeProperty("font-variation-settings");
    }
    contact.style.removeProperty("--cut-draw");
    story.style.removeProperty("--hold-top");
    stage.style.removeProperty("--stage-rest");
  };

  const render = (progress: number) => {
    const push = smooth(phase(progress, 0.04, 0.62));
    const middle = (lanes.length - 1) / 2;
    let type = size, gone = 0, cut = 0;
    let slide: (outer: number) => number;

    if (stack) {
      // One line each: "work." grows taller and narrower, "busy" shorter and wider, both still edge to edge.
      const grow = 1 + (tall - 1) * easeOut(clamp(push / 0.7));
      gone = phase(push, 0.32, 1);
      cut = smooth(clamp(gone / 0.35));
      type = size * (2 - grow);
      // Start closing the lines while the slices are leaving, not after they stop.
      const close = smooth(phase(gone, 0.26, 1)) * size * (2 - tall) / 2;
      work.style.fontSize = `${(size * grow).toFixed(2)}px`;
      work.style.fontVariationSettings = settings(read(workEm, AXIS, length / grow));
      busy.style.fontSize = `${type.toFixed(2)}px`;
      busy.style.fontVariationSettings = settings(read(busyEm, AXIS, length / (2 - grow)));
      lead.style.transform = close ? `translate3d(0,${close.toFixed(2)}px,0)` : "";
      work.style.transform = foot.style.transform = close ? `translate3d(0,${(-close).toFixed(2)}px,0)` : "";
      const release = smooth(gone);
      slide = outer => -exit * (release + outer * release * (1 - release));
    } else {
      // One line: "work." widens from the right edge and "busy" gives way until it cannot get narrower.
      const wide = workFrom + (workTo - workFrom) * push;
      const edge = line - wide - slack * push;
      const pushed = Math.max(0, narrow - edge);
      gone = pushed / Math.max(1, narrow);
      cut = smooth(clamp(pushed / (size * 0.3)));
      work.style.fontVariationSettings = settings(read(workEm, AXIS, wide / size));
      work.style.transform = slack > 0.5 ? `translate3d(${(-slack * push).toFixed(2)}px,0,0)` : "";
      busy.style.fontVariationSettings = settings(read(busyEm, AXIS, Math.max(narrow, edge) / size));
      slide = outer => -pushed - gone ** 2 * (exit + narrow * 0.85 * outer);
    }

    busy.dataset.cutSliced = String(gone > 0);
    lanes.forEach((lane, index) => {
      // Outer lanes run ahead; the full strips through the middle of the word leave last.
      const x = slide(Math.abs(index - middle) / middle);
      const y = (index - middle) * Math.max(1.5, type * 0.008) * cut;
      lane.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
    });

    const count = Math.round(tokens.length * phase(progress, 0.56, 0.9));
    if (count !== lit) {
      tokens.forEach((token, index) => { token.dataset.cutOn = String(index < count); });
      lit = count;
    }
    contact.style.setProperty("--cut-draw", easeOut(phase(progress, 0.88, 0.97)).toFixed(4));
    if (progress >= 0.8 && visible) pen.warm(() => live && visible && current >= 0.8 && !disposed);
  };

  const tick = (time: number) => {
    loop = 0;
    if (!live || !visible || document.hidden || disposed) { last = 0; return; }
    const elapsed = Math.min(0.05, Math.max(0.001, (time - (last || time - 16.67)) / 1000));
    last = time;
    current += (target - current) * (1 - Math.exp(-elapsed / 0.075));
    if (Math.abs(target - current) < 0.0004) current = target;
    render(current);
    if (current === target) last = 0;
    else loop = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!loop && live && visible && !document.hidden && current !== target) loop = requestAnimationFrame(tick);
  };
  const draft = (y: number) => {
    const from = seam - viewHeight;
    const cursor = live ? clamp(y - from, -proofHold, viewHeight) : -proofHold;
    if (cursor === lastDraft) return;
    lastDraft = cursor;
    stage.inert = live && cursor >= viewHeight * 0.45;
    if (!live || cursor <= -proofHold || cursor >= viewHeight) {
      pen.hide();
      delete section.dataset.proof;
      section.style.removeProperty("--proof");
      section.style.removeProperty("--write");
      return;
    }
    const write = clamp(cursor / viewHeight);
    const depth = smooth(clamp(1 + cursor / Math.max(1, proofHold))) * (1 - smooth(phase(write, 0.73, 1)));
    section.style.setProperty("--write", write.toFixed(5));
    const polarity = depth < 0.63 ? "positive" : "negative";
    if (section.dataset.proof !== polarity) section.dataset.proof = polarity;
    section.style.setProperty("--proof", depth.toFixed(4));
    if (target === 1 && current !== target) { current = target; render(current); }
    pen.draw(write);
  };
  const scroll = () => {
    target = clamp((scroller.scrollTop - start) / travel);
    draft(scroller.scrollTop);
    press.draw(scroller.scrollTop);
    wake();
  };

  const measure = () => {
    frame = 0;
    if (disposed) return;
    pen.reset();
    delete section.dataset.proof;
    rest();
    line = word.clientWidth;
    if (!line) return;
    if (!busyEm.length) {
      busyEm = AXIS.map(wdth => em("busy", wdth));
      workEm = AXIS.map(wdth => em("work.", wdth));
      probe.textContent = "";
    }
    live = !still.matches;
    stack = stacked.matches;
    const box = getComputedStyle(stage);
    const room = pinned.matches
      ? stage.clientHeight - parseFloat(box.paddingTop) - parseFloat(box.paddingBottom) - parseFloat(box.rowGap)
        - lead.offsetHeight - foot.offsetHeight
      : Infinity;
    // Stacked, each half is its own line; in a row the whole word is.
    const fitted = stack ? workEm : workEm.map((width, index) => width + busyEm[index]);
    size = Math.max(SMALLEST, Math.min(line / read(AXIS, fitted, FROM), room / (stack ? 2 : 1)));
    length = line / size;
    // A height-capped line starts wider, so it still runs edge to edge.
    const from = read(fitted, AXIS, length);
    if (stack) {
      tall = Math.max(1, Math.min(length / workEm[0], 2 - length / busyEm[busyEm.length - 1]));
    } else {
      workFrom = read(AXIS, workEm, from) * size;
      workTo = Math.min(line, workEm[workEm.length - 1] * size);
      narrow = busyEm[0] * size;
      slack = line - workTo;
    }
    word.style.setProperty("--cut-size", `${size.toFixed(2)}px`);
    word.style.setProperty("--cut-from", from.toFixed(2));
    word.style.setProperty("--cut-busy", (stack ? read(busyEm, AXIS, length) : from).toFixed(2));
    if (live) section.dataset.cutMotion = "live";
    else delete section.dataset.cutMotion;

    const bounds = scroller.getBoundingClientRect();
    const origin = scroller.scrollTop - bounds.top;
    const view = scroller.clientHeight;
    viewHeight = view;
    seam = story.getBoundingClientRect().top + origin;
    proofHold = proofRun.offsetHeight;
    press.measure(origin, view, live);
    // Pin the whole composition only once its last screen is visible.
    if (live) story.style.setProperty("--hold-top", `${view - story.getBoundingClientRect().height}px`);
    press.draw(scroller.scrollTop);
    const place = word.getBoundingClientRect();
    exit = place.left - bounds.left + size * 0.14 + (stack ? line : 0);
    if (pinned.matches) {
      start = section.getBoundingClientRect().top + origin;
      travel = Math.max(1, seam - start - stage.offsetHeight - proofHold);
    } else {
      start = place.top + origin - view * 0.6;
      travel = Math.max(view * 0.9, foot.getBoundingClientRect().bottom + origin - view * 0.92 - start);
      if (live) stage.style.setProperty("--stage-rest", `${Math.min(0, view - stage.offsetHeight)}px`);
    }
    target = current = clamp((scroller.scrollTop - start) / travel);
    lit = -1;
    if (live) render(current);
    lastDraft = NaN;
    draft(scroller.scrollTop);
  };
  const remeasure = () => {
    if (!disposed && !frame) frame = requestAnimationFrame(measure);
  };
  const refont = () => {
    busyEm = [];
    remeasure();
  };

  const watch = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    section.dataset.cutActive = String(visible);
    if (!visible || !live) return;
    target = current = clamp((scroller.scrollTop - start) / travel);
    render(current);
  }, { root: scroller, rootMargin: "20% 0px" });
  watch.observe(section);
  const resize = new ResizeObserver(remeasure);
  resize.observe(stage);
  resize.observe(story);
  resize.observe(scroller);
  scroller.addEventListener("scroll", scroll, { passive: true });
  still.addEventListener("change", remeasure);
  pinned.addEventListener("change", remeasure);
  stacked.addEventListener("change", remeasure);
  document.addEventListener("visibilitychange", wake);
  document.fonts.addEventListener("loadingdone", refont);
  void document.fonts.ready.then(refont);
  measure();

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    cancelAnimationFrame(loop);
    watch.disconnect();
    resize.disconnect();
    scroller.removeEventListener("scroll", scroll);
    still.removeEventListener("change", remeasure);
    pinned.removeEventListener("change", remeasure);
    stacked.removeEventListener("change", remeasure);
    document.removeEventListener("visibilitychange", wake);
    document.fonts.removeEventListener("loadingdone", refont);
    probe.remove();
    press.reset();
    pen.reset();
    stage.inert = false;
    delete section.dataset.proof;
    section.style.removeProperty("--proof");
    section.style.removeProperty("--write");
    rest();
    for (const token of tokens) delete token.dataset.cutOn;
    for (const name of ["--cut-size", "--cut-from", "--cut-busy"]) word.style.removeProperty(name);
    delete busy.dataset.cutSliced;
    delete section.dataset.cutMotion;
    delete section.dataset.cutActive;
  };
}
