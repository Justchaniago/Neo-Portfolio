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
  timeline.addLabel("shift", 0);
  timeline.to(line, { "--shift": 1, duration: 0.58, ease: "expo.inOut" }, "shift");
  timeline.set(prefix, { visibility: "hidden" }, "shift+=0.58");

  timeline.addLabel("dotRise", "shift+=0.42");
  timeline.to(dot, { yPercent: 0, duration: 0.18, ease: "back.out(1.4)" }, "dotRise");

  timeline.addLabel("arrival", "dotRise+=0.08");
  timeline.to(ending, { xPercent: 0, duration: 0.28, ease: "power2.out" }, "arrival");

  timeline.addLabel("impact", "arrival+=0.28");
  timeline.to(ending, { x: "-0.014em", duration: 0.06, ease: "sine.out" }, "impact");
  timeline.to(dot, { x: "-0.028em", duration: 0.06, ease: "sine.out" }, "impact");
  timeline.to([ending, dot], { x: 0, duration: 0.2, ease: "power2.out" }, "impact+=0.06");
  timeline.addLabel("revealed");
  return timeline;
}
