import gsap from "gsap";
import { appendIdentityReveal } from "./appendIdentityReveal";
import { appendPortalReveal } from "./appendPortalReveal";
import font from "./glyphPaths.json";

let revealInstance = 0;
const NS = "http://www.w3.org/2000/svg";
const OUTLINE_DURATION = 1.18;
const FILL_DURATION = 0.92;
const CHARACTER_STAGGER = 0.045;

/** Fixed font paths: no browser text stroking, estimated lengths or raster handoff. */
export function animateGlyphReveal(root: HTMLElement, onComplete: () => void) {
  const media = gsap.matchMedia();
  let disposed = false;

  void document.fonts.ready.then(() => {
    if (disposed) return;
    media.add({ reduce: "(prefers-reduced-motion: reduce)", motion: "(prefers-reduced-motion: no-preference)" }, context => {
      if (context.conditions?.reduce) { onComplete(); return; }
      const letters = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal-letter]"));
      const overlays: SVGSVGElement[] = [];
      const instance = ++revealInstance;
      const units = font.unitsPerEm;
      const baseline = (units * 1.2 - font.ascent + font.descent) / 2 + font.ascent;
      const timeline = gsap.timeline({ onComplete });
      const groups = letters.map((letter, index) => {
        const glyph = font.glyphs[letter.textContent as keyof typeof font.glyphs];
        const svg = document.createElementNS(NS, "svg");
        const padding = units * 0.2;
        svg.setAttribute("viewBox", [-padding, 0, glyph.advance + 2 * padding, units * 1.2].join(" "));
        svg.setAttribute("aria-hidden", "true");
        svg.dataset.glyph = letter.textContent || "";
        Object.assign(svg.style, {
          position: "absolute", left: "-0.2em", top: "0",
          width: (glyph.advance / units + 0.4) + "em", height: "1.2em",
          overflow: "visible", pointerEvents: "none", visibility: "hidden",
        });
        const group = document.createElementNS(NS, "g");
        group.setAttribute("transform", "translate(0 " + baseline + ") scale(1 -1)");
        const makePath = (d: string) => {
          const path = document.createElementNS(NS, "path");
          path.setAttribute("d", d);
          return path;
        };
        const mask = document.createElementNS(NS, "mask");
        mask.id = "splash-glyph-" + instance + "-" + index;
        mask.setAttribute("maskUnits", "userSpaceOnUse");
        mask.setAttribute("x", String(-units));
        mask.setAttribute("y", String(-units));
        mask.setAttribute("width", String(units * 3));
        mask.setAttribute("height", String(units * 3));
        const defs = document.createElementNS(NS, "defs");
        defs.append(mask);
        const ink = makePath(glyph.path);
        ink.setAttribute("fill", "#fff");
        ink.setAttribute("mask", "url(#" + mask.id + ")");
        ink.dataset.ink = "";
        const outline = document.createElementNS(NS, "g");
        outline.dataset.outline = "";
        const contours = glyph.path.match(/M[^M]+/g) || [];
        const paths = contours.map((d, contourIndex) => {
          const edge = makePath(d);
          edge.setAttribute("fill", "none");
          edge.setAttribute("stroke", "#fff");
          edge.setAttribute("stroke-width", String(units * 0.008));
          edge.setAttribute("stroke-linejoin", "round");
          edge.setAttribute("stroke-linecap", "butt");
          const fill = edge.cloneNode(true) as SVGPathElement;
          // A stroke wider than the tiny i/j dot can self-intersect in WebKit.
          const isDot = (letter.textContent === "i" || letter.textContent === "j") && contourIndex === contours.length - 1;
          fill.setAttribute("stroke-width", String(units * (isDot ? 0.15 : 0.32)));
          mask.append(fill);
          outline.append(edge);
          return { edge, fill, length: 0 };
        });
        group.append(defs, outline, ink);
        svg.append(group);
        letter.parentElement!.append(svg);
        overlays.push(svg);
        for (const path of paths) {
          path.length = path.edge.getTotalLength();
          for (const element of [path.edge, path.fill]) {
            element.setAttribute("stroke-dasharray", path.length + " " + path.length);
            element.setAttribute("stroke-dashoffset", String(path.length));
          }
        }
        // All geometry reads happen once, before playback.
        const total = paths.reduce((sum, path) => sum + path.length, 0);
        const distance = Math.abs(index - (letters.length - 1) / 2);
        const start = 0.16 + distance * CHARACTER_STAGGER;
        timeline.set(svg, { visibility: "visible" }, start);
        let elapsed = 0;
        for (const path of paths) {
          const duration = OUTLINE_DURATION * path.length / total;
          timeline.to(path.edge, { attr: { "stroke-dashoffset": 0 }, duration, ease: "power1.inOut" }, start + elapsed);
          elapsed += duration;
        }
        return { paths, total, distance, outline, ink };
      });
      timeline.addLabel("fill", "+=0.08");
      for (const { paths, total, distance, outline, ink } of groups) {
        let elapsed = distance * 0.028;
        for (const path of paths) {
          const duration = FILL_DURATION * path.length / total;
          timeline.to(path.fill, { attr: { "stroke-dashoffset": 0 }, duration, ease: "power1.inOut" }, "fill+=" + elapsed);
          elapsed += duration;
          timeline.set(path.fill, { attr: { "stroke-dasharray": "none" } }, "fill+=" + elapsed);
        }
        // Completed fill remains the same geometry, with no DOM/text swap.
        timeline.set(outline, { visibility: "hidden" }, "fill+=" + elapsed);
        timeline.call(() => ink.removeAttribute("mask"), [], "fill+=" + elapsed);
      }
      appendIdentityReveal(timeline, root);
      const stopPortal = appendPortalReveal(timeline, root);
      return () => { stopPortal(); overlays.forEach(svg => svg.remove()); };
    });
  });

  return () => { disposed = true; media.revert(); };
}
