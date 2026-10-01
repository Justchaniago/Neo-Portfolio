import gsap from "gsap";

/** One reversible timeline; scroll ownership stays with TaglineSection. */
export function createFooterWordmark(wordmark: HTMLElement, reduced: MediaQueryList) {
  const glyphs = Array.from(wordmark.querySelectorAll<HTMLElement>("[data-footer-glyph]"));
  let timeline: gsap.core.Timeline | null = null;
  let disposed = false, fontReady = false, open = false;
  let progress = 0;

  const settle = () => glyphs.forEach(glyph => glyph.style.removeProperty("will-change"));
  const update = (nextProgress: number) => {
    progress = nextProgress;
    if (disposed) return;
    if (reduced.matches) {
      timeline?.kill();
      timeline = null;
      open = false;
      gsap.set(glyphs, { clearProps: "transform,willChange" });
      return;
    }
    if (!fontReady) return;
    if (!timeline) {
      timeline = gsap.timeline({ paused: true, onComplete: settle, onReverseComplete: settle });
      timeline.fromTo(glyphs, { y: 0, yPercent: 135 }, {
        y: 0, yPercent: 0, duration: 0.92, stagger: 0.05, ease: "power3.out",
      }, 0.15);
    }
    const nextOpen = progress >= 1;
    if (document.hidden) {
      timeline.pause();
      return;
    }
    if (nextOpen !== open || timeline.paused()) {
      open = nextOpen;
      const moving = open ? timeline.progress() < 1 : timeline.progress() > 0;
      if (moving) glyphs.forEach(glyph => { glyph.style.willChange = "transform"; });
      // Reverse from the current playhead, including interrupted entrances.
      if (open) timeline.play();
      else timeline.reverse();
    }
  };
  const visibility = () => update(progress);
  document.addEventListener("visibilitychange", visibility);
  document.fonts.ready.then(() => {
    if (disposed) return;
    fontReady = true;
    update(progress);
  });
  return {
    update,
    dispose() {
      disposed = true;
      timeline?.kill();
      gsap.set(glyphs, { clearProps: "transform,willChange" });
      document.removeEventListener("visibilitychange", visibility);
    },
  };
}
