import gsap from "gsap";

export function createLogoTimeline(root: HTMLElement) {
  const line = root.querySelector<HTMLElement>("[data-logo-line]")!;
  const prefix = root.querySelector<HTMLElement>("[data-logo-prefix]")!;
  const dot = root.querySelector<HTMLElement>("[data-logo-dot]")!;
  const ending = root.querySelector<HTMLElement>("[data-logo-ending]")!;
  gsap.set(line, { "--shift": 0 });
  gsap.set(prefix, { visibility: "visible" });
  gsap.set(dot, { y: 0, yPercent: 110 });
  gsap.set(ending, { x: 0, xPercent: 115 });
  const timeline = gsap.timeline({ paused: true });
  timeline.to(line, { "--shift": 1, duration: 0.55, ease: "power2.inOut" });
  timeline.set(prefix, { visibility: "hidden" });
  timeline.to(dot, { yPercent: 0, duration: 0.12, ease: "power2.out" });
  timeline.to(ending, { xPercent: 0, duration: 0.3, ease: "power2.out" });
  timeline.to(dot, { x: "-0.035em", duration: 0.07, ease: "sine.out" });
  timeline.to(dot, { x: 0, duration: 0.16, ease: "power2.out" });
  timeline.addLabel("revealed");
  return timeline;
}
