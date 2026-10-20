import gsap from "gsap";

/** Reveal a full-resolution white surface without scaling text or a tiny bitmap. */
export function appendPortalReveal(timeline: gsap.core.Timeline, root: HTMLElement) {
  const wordmark = root.querySelector<HTMLElement>("[data-wordmark]")!;
  const dot = root.querySelector<HTMLElement>("[data-dot-circle]")!;
  const portal = root.querySelector<HTMLElement>("[data-portal]")!;
  const zoom = { progress: 0 };
  let centerX = 0;
  let centerY = 0;
  let radius = 0;
  let targetRadius = 0;
  let active = false;

  const measure = () => {
    const bounds = dot.getBoundingClientRect();
    const screen = root.getBoundingClientRect();
    centerX = bounds.left + bounds.width / 2 - screen.left;
    centerY = bounds.top + bounds.height / 2 - screen.top;
    radius = bounds.width / 2;
    targetRadius = Math.hypot(
      Math.max(centerX, screen.width - centerX),
      Math.max(centerY, screen.height - centerY),
    ) + 4;
  };
  const render = () => {
    const currentRadius = radius + (targetRadius - radius) * zoom.progress;
    const innerEdge = Math.max(0, currentRadius - 1.5);
    const mask = `radial-gradient(circle at ${centerX}px ${centerY}px, transparent 0px, transparent ${innerEdge}px, #000 ${currentRadius}px)`;
    gsap.set(root, {
      webkitMaskImage: mask,
      maskImage: mask,
    });
  };
  const observer = new ResizeObserver(() => {
    if (!active) return;
    measure();
    render();
  });
  observer.observe(root);

  timeline.addLabel("portal", "+=0.55");
  timeline.call(() => {
    active = true;
    measure();
    document.documentElement.dataset.splashComplete = "true";
    const content = document.querySelector<HTMLElement>("[data-page-content]");
    if (content) content.inert = false;
    gsap.set(root, { pointerEvents: "none" });
    gsap.set(portal, { visibility: "hidden" });
    gsap.set(dot, { visibility: "hidden" });
    render();
  }, [], "portal");
  timeline.to(zoom, {
    progress: 1,
    duration: 1.45,
    ease: "power4.inOut",
    onUpdate: render,
    onComplete: () => {
      active = false;
      observer.disconnect();
    },
  }, "portal");
  timeline.set(wordmark, { visibility: "hidden" }, "portal+=1.45");
  return () => {
    observer.disconnect();
    gsap.set(root, { clearProps: "webkitMaskImage,maskImage,pointerEvents" });
  };
}
