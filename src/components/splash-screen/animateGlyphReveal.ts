import gsap from "gsap";
import { appendIdentityReveal } from "./appendIdentityReveal";
import { appendPortalReveal } from "./appendPortalReveal";
import font from "./glyphPaths.json";

let revealInstance = 0;
const NS = "http://www.w3.org/2000/svg";
const OUTLINE_DURATION = 1.08;
const FILL_DURATION = 0.88;
const CHARACTER_STAGGER = 0.04;
const FILL_OVERLAP_RATIO = 0.62;

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
      letters.forEach((letter, index) => {
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

        // Liquid meniscus clipPath rising smoothly from descender (-650) to ascender (+1650)
        const clip = document.createElementNS(NS, "clipPath");
        clip.id = "splash-glyph-clip-" + instance + "-" + index;
        clip.setAttribute("clipPathUnits", "userSpaceOnUse");
        const w = glyph.advance;
        const x0 = -padding * 1.5;
        const x1 = w + padding * 1.5;
        const xm = w * 0.5;
        const yBot = -680;
        const yTop = 1660;
        const wave = makePath(`M ${x0} ${yBot} L ${x1} ${yBot} L ${x1} ${yBot} Q ${xm} ${yBot} ${x0} ${yBot} Z`);
        clip.append(wave);

        const defs = document.createElementNS(NS, "defs");
        defs.append(clip);
        const ink = makePath(glyph.path);
        ink.setAttribute("fill", "#fff");
        ink.setAttribute("clip-path", "url(#" + clip.id + ")");
        ink.dataset.ink = "";

        const outline = document.createElementNS(NS, "g");
        outline.dataset.outline = "";
        const contours = glyph.path.match(/M[^M]+/g) || [];
        const paths = contours.map((d) => {
          const edge = makePath(d);
          edge.setAttribute("fill", "none");
          edge.setAttribute("stroke", "#fff");
          edge.setAttribute("stroke-width", String(units * 0.0085));
          edge.setAttribute("stroke-linejoin", "round");
          edge.setAttribute("stroke-linecap", "round");
          outline.append(edge);
          return { edge, length: 0 };
        });

        group.append(defs, outline, ink);
        svg.append(group);
        letter.parentElement!.append(svg);
        overlays.push(svg);

        for (const path of paths) {
          path.length = path.edge.getTotalLength();
          path.edge.setAttribute("stroke-dasharray", path.length + " " + path.length);
          path.edge.setAttribute("stroke-dashoffset", String(path.length));
        }

        // All geometry reads happen once, before playback.
        const total = paths.reduce((sum, path) => sum + path.length, 0);
        const distance = Math.abs(index - (letters.length - 1) / 2);
        const start = 0.14 + distance * CHARACTER_STAGGER;
        timeline.set(svg, { visibility: "visible" }, start);

        let elapsed = 0;
        for (const path of paths) {
          const duration = OUTLINE_DURATION * (path.length / total);
          timeline.to(
            path.edge,
            { attr: { "stroke-dashoffset": 0 }, duration, ease: "sine.inOut" },
            start + elapsed,
          );
          elapsed += duration;
        }

        // Overlap the liquid meniscus fill while the outline is still finishing (~62%)
        const fillStart = start + OUTLINE_DURATION * FILL_OVERLAP_RATIO;
        const fillState = { p: 0 };
        const tiltSign = index % 2 === 0 ? 1 : -1;
        const renderWave = () => {
          const p = fillState.p;
          const level = yBot + (yTop - yBot) * p;
          const swell = Math.sin(p * Math.PI);
          const tilt = swell * 115 * tiltSign;
          const crest = swell * 240;
          const yL = level - tilt;
          const yR = level + tilt;
          const yC = level + crest;
          wave.setAttribute(
            "d",
            `M ${x0} ${yBot} L ${x1} ${yBot} L ${x1} ${yR.toFixed(1)} Q ${xm} ${yC.toFixed(1)} ${x0} ${yL.toFixed(1)} Z`,
          );
        };

        timeline.to(
          fillState,
          {
            p: 1,
            duration: FILL_DURATION,
            ease: "expo.out",
            onUpdate: renderWave,
          },
          fillStart,
        );

        // Smoothly dissolve the hairline outline into the solid glyph fill
        timeline.to(
          outline,
          { opacity: 0, duration: 0.24, ease: "power2.out" },
          fillStart + FILL_DURATION * 0.65,
        );
        timeline.set(outline, { visibility: "hidden" }, fillStart + FILL_DURATION);
        timeline.call(() => ink.removeAttribute("clip-path"), [], fillStart + FILL_DURATION);
      });

      appendIdentityReveal(timeline, root);
      const stopPortal = appendPortalReveal(timeline, root);
      return () => { stopPortal(); overlays.forEach(svg => svg.remove()); };
    });
  });

  return () => { disposed = true; media.revert(); };
}
