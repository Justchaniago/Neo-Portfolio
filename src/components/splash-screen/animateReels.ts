import gsap from "gsap";
import { appendIdentityReveal } from "./appendIdentityReveal";
import { appendPortalReveal } from "./appendPortalReveal";

export const REEL = {
  cells: 17,
  startCell: 8,
  fastCycles: 4,
  slowCycles: 3,
  fastDuration: 0.8,
  slowDuration: 1.8,
} as const;

/** One shared clock keeps every column's speed and landing synchronized. */
export function animateReels(root: HTMLElement, onComplete: () => void) {
  const tracks = Array.from(root.querySelectorAll<HTMLElement>("[data-reel]"));
  const media = gsap.matchMedia();
  let disposed = false;

  void document.fonts.ready.then(() => {
    if (disposed) return;
    media.add({ reduce: "(prefers-reduced-motion: reduce)", motion: "(prefers-reduced-motion: no-preference)" }, (context) => {
      if (context.conditions?.reduce) {
        onComplete();
        return;
      }
      const position = { cycles: 0 };
      const render = () => {
        tracks.forEach((track) => {
          const index = Number(track.dataset.index);
          const direction = index % 2 === 0 ? 1 : -1;
          const cell = REEL.startCell - direction * position.cycles;
          gsap.set(track, { y: 0, yPercent: (-cell / REEL.cells) * 100 });
        });
      };

      gsap.set(tracks, { willChange: "transform" });
      render();
      const timeline = gsap.timeline({
        onComplete: () => {
          gsap.set(tracks, { clearProps: "willChange" });
          onComplete();
        },
      });
      timeline.to(position, {
        cycles: REEL.fastCycles,
        duration: REEL.fastDuration,
        ease: "none",
        onUpdate: render,
      });
      // Cubic ease-out starts at 3 * 3 / 1.8 = 5 cells/s,
      // matching the fast phase (4 / 0.8), and ends at zero velocity.
      timeline.to(position, {
        cycles: REEL.fastCycles + REEL.slowCycles,
        duration: REEL.slowDuration,
        ease: "power2.out",
        onUpdate: render,
      });
      appendIdentityReveal(timeline, root);
      return appendPortalReveal(timeline, root);
    });
  });

  return () => {
    disposed = true;
    media.revert();
  };
}
