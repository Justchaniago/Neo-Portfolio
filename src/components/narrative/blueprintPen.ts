import contours from "./penContours.json";

const NS = "http://www.w3.org/2000/svg";
const unit = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => n * n * (3 - 2 * n);
type Shape = { advance: number; rings: { d: string; length: number }[] };
const faces: Record<string, Record<string, Shape>> = contours.faces;
const widths = [25, 62, 100, 127.25, 151];
type Ring = { path: SVGPathElement; at: number; duration: number; last: number };

type Glyph = {
  ink: SVGTextElement; edge: SVGGElement; rings: Ring[]; length: number; at: number; duration: number;
  outgoing: boolean; displayType: boolean; last: number;
};

export function blueprintPen(section: HTMLElement) {
  const layers: SVGSVGElement[] = [];
  const glyphs: Glyph[] = [];
  let cancelWarm: (() => void) | undefined;

  function run(host: HTMLElement, from: number, to: number, outgoing: boolean, displayType = false) {
    if (!host.getClientRects().length) return;
    const style = getComputedStyle(host);
    const size = parseFloat(style.fontSize);
    const spacing = parseFloat(style.letterSpacing) || 0;
    const axis = Number(style.fontVariationSettings.match(/"wdth"\s+([\d.]+)/)?.[1] || 100);
    const width = widths.reduce((best, w) => Math.abs(w - axis) < Math.abs(best - axis) ? w : best);
    const face = faces[displayType ? (outgoing ? String(width) : "send") : Number(style.fontWeight) >= 500 ? "heading" : "copy"];
    const family = style.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    const usePaths = family.includes("Google Sans Flex") && Array.from(document.fonts).some(f =>
      f.family.replace(/["']/g, "") === family && f.status === "loaded");
    const svg = document.createElementNS(NS, "svg");
    svg.dataset.penLayer = "";
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    if (displayType) svg.dataset.penDisplay = "";
    const sample = document.createElementNS(NS, "text");
    sample.textContent = "H";
    svg.append(sample);
    if (style.position === "static") host.dataset.penAnchor = "";
    host.dataset.penHost = "";
    host.append(svg);
    layers.push(svg);
    const origin = svg.getBoundingClientRect();
    const ascent = -sample.getExtentOfChar(0).y;
    sample.remove();
    const sy = size / contours.units;
    const stroke = displayType ? Math.max(0.9, Math.min(2, innerWidth * 0.0013)) : Math.max(0.7, size * 0.033);

    // Read the original layout, including kerning and wrapped lines. No letter
    // wrappers, duplicated accessible names, or geometry reads during playback.
    const range = document.createRange();
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    const fragment = document.createDocumentFragment();
    const start = glyphs.length;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.nodeValue || "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (/\s/.test(ch)) continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const box = range.getBoundingClientRect();
        if (!box.width) continue;
        const ink = document.createElementNS(NS, "text");
        ink.textContent = ch;
        const x = (box.left - origin.left).toFixed(2), y = (box.top - origin.top + ascent).toFixed(2);
        ink.setAttribute("x", x);
        ink.setAttribute("y", y);
        const edge = document.createElementNS(NS, "g");
        const shape = usePaths ? face[ch] : undefined;
        const length = shape?.rings.reduce((sum, ring) => sum + ring.length, 0) || contours.units;
        let distance = 0;
        const rings: Ring[] = [];
        if (shape) {
          edge.setAttribute("transform", `translate(${x} ${y}) scale(${(box.width - spacing) / shape.advance} ${-sy})`);
          edge.setAttribute("stroke-width", (stroke / sy).toFixed(3));
          for (const ring of shape.rings) {
            const path = document.createElementNS(NS, "path");
            path.setAttribute("d", ring.d);
            path.setAttribute("pathLength", "1");
            path.setAttribute("stroke-dasharray", "1 2");
            edge.append(path);
            // Perimeter order keeps counters and dots from racing the outer edge.
            rings.push({ path, at: 0.91 * distance / length, duration: 0.09 + 0.91 * ring.length / length, last: -1 });
            distance += ring.length;
          }
        } else ink.dataset.penFallback = "";
        fragment.append(edge, ink);
        glyphs.push({ ink, edge, rings, length, at: 0, duration: 0, outgoing, displayType, last: -1 });
      }
    }
    const n = glyphs.length - start;
    const mean = glyphs.slice(start).reduce((total, glyph) => total + glyph.length, 0) / Math.max(1, n);
    let cursor = 0, end = 0;
    for (let i = 0; i < n; i++) {
      const glyph = glyphs[start + i];
      const weight = Math.min(1.24, Math.max(0.52, Math.sqrt(glyph.length / mean)));
      const prev = glyphs[start + i - 1];
      if (i && /^[.,!?]$/.test(glyph.ink.textContent || "")) {
        // Finish punctuation with its letter rather than leaving a lone dot.
        glyph.at = prev.at + prev.duration * 0.4;
        glyph.duration = prev.duration * 0.6;
      } else {
        glyph.at = cursor;
        glyph.duration = weight * (displayType ? 3 : Math.max(3, n * 0.27));
        cursor += weight;
      }
      end = Math.max(end, glyph.at + glyph.duration);
    }
    for (let i = start; i < glyphs.length; i++) {
      glyphs[i].at = from + (to - from) * glyphs[i].at / end;
      glyphs[i].duration *= (to - from) / end;
    }
    svg.append(fragment);
  }

  function prepare() {
    if (layers.length) return;
    const add = (selector: string, from: number, to: number, out: boolean, big = false) => {
      const host = section.querySelector<HTMLElement>(selector);
      if (host) run(host, from, to, out, big);
    };
    add("[data-cut-lead]", 0, 0.28, true);
    add("[data-cut-work]", 0.02, 0.5, true, true);
    add("[data-cut-foot] p", 0.01, 0.35, true);
    add("[data-cut-contact]", 0.06, 0.36, true);
    add("[data-type-press] h3", 0.29, 0.66, false);
    section.querySelectorAll<HTMLElement>("[data-type-belt] > :first-child").forEach((letter, i) => {
      run(letter, 0.32 + i * 0.055, 0.59 + i * 0.055, false, true);
    });
    add("[data-type-beat] > span", 0.32, 0.76, false, true);
    add("[data-type-beat] h4", 0.43, 0.77, false);
    add("[data-type-beat] p", 0.48, 0.95, false);
  }

  return {
    warm(ready: () => boolean) {
      if (layers.length || cancelWarm) return;
      const warm = () => { cancelWarm = undefined; if (ready()) prepare(); };
      if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(warm, { timeout: 220 });
        cancelWarm = () => window.cancelIdleCallback(id);
      } else {
        const id = window.setTimeout(warm, 0);
        cancelWarm = () => window.clearTimeout(id);
      }
    },
    draw(write: number) {
      prepare();
      if (!section.hasAttribute("data-pen")) section.dataset.pen = "";
      for (const glyph of glyphs) {
        const t = unit((write - glyph.at) / glyph.duration);
        const ink = glyph.outgoing ? 1 - t : t;
        if (ink === glyph.last) continue;
        glyph.last = ink;
        const fill = glyph.rings.length ? ease(unit((ink - 0.48) / 0.52)) : ease(ink);
        glyph.ink.style.opacity = String(fill);
        glyph.edge.style.opacity = String(glyph.displayType ? 1 : 1 - fill);
        const travel = 0.3 * ink + 0.7 * ease(ink);
        for (const ring of glyph.rings) {
          const q = unit((travel - ring.at) / ring.duration);
          if (q === ring.last) continue;
          ring.last = q;
          ring.path.style.strokeDashoffset = (1 - q).toFixed(5);
          ring.path.style.opacity = String(ease(unit(q / 0.025)));
        }
      }
    },
    hide() { delete section.dataset.pen; },
    reset() {
      cancelWarm?.();
      cancelWarm = undefined;
      delete section.dataset.pen;
      for (const svg of layers) {
        const host = svg.parentElement!;
        delete host.dataset.penHost;
        delete host.dataset.penAnchor;
        svg.remove();
      }
      layers.length = glyphs.length = 0;
    },
  };
}
