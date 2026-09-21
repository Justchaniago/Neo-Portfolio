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
    gsap.set(portal, {
      clipPath: `circle(${currentRadius}px at ${centerX}px ${centerY}px)`,
    });
  };
  const observer = new ResizeObserver(() => {
    if (!active) return;
    measure();
    render();
  });
  observer.observe(root);

  timeline.addLabel("portal", "+=0.65");
  timeline.call(() => {
    active = true;
    measure();
    render();
    gsap.set(portal, { visibility: "visible", willChange: "clip-path" });
    gsap.set(dot, { visibility: "hidden" });
  }, [], "portal");
  timeline.to(zoom, {
    progress: 1,
    duration: 1.45,
    ease: "power2.inOut",
    onUpdate: render,
    onComplete: () => {
      active = false;
      observer.disconnect();
    },
  });
  timeline.set(root, { backgroundColor: "#fff" });
  timeline.set([portal, wordmark], { visibility: "hidden" });
  timeline.set(portal, { clearProps: "willChange" });
  // Reveal the already mounted page through white, without an abrupt cut.
  timeline.to(root, { opacity: 0, duration: 0.45, ease: "sine.inOut" });
  return () => observer.disconnect();
}
