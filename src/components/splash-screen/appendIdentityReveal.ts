import gsap from "gsap";

/** Append the identity change to the reel's clock; em units preserve resize behavior. */
export function appendIdentityReveal(timeline: gsap.core.Timeline, root: HTMLElement) {
  const wordmark = root.querySelector<HTMLElement>("[data-wordmark]")!;
  const prefix = root.querySelector<HTMLElement>("[data-prefix]")!;
  const core = root.querySelector<HTMLElement>("[data-core]");
  const suffix = root.querySelector<HTMLElement>("[data-suffix]")!;
  const dot = root.querySelector<HTMLElement>("[data-dot]")!;
  const ending = root.querySelector<HTMLElement>("[data-ending]")!;
  const fontSize = parseFloat(getComputedStyle(wordmark).fontSize);
  const offset = (prefix.getBoundingClientRect().width + suffix.getBoundingClientRect().width) / (2 * fontSize);

  gsap.set(wordmark, { "--intro-offset": `${offset}em` });
  gsap.set(dot, { y: 0, yPercent: 110 });
  gsap.set(ending, { x: 0, xPercent: 115 });

  timeline.addLabel("identity", "+=0.22");
  timeline.to(wordmark, { "--intro-offset": "0em", duration: 0.66, ease: "expo.inOut" }, "identity");
  timeline.to(prefix, { xPercent: -130, duration: 0.64, ease: "expo.inOut" }, "identity");
  timeline.set(prefix, { visibility: "hidden" }, "identity+=0.64");

  timeline.addLabel("dotRise", "identity+=0.48");
  timeline.to(dot, { yPercent: 0, duration: 0.2, ease: "back.out(1.4)" }, "dotRise");

  timeline.addLabel("arrival", "dotRise+=0.1");
  timeline.to(ending, { xPercent: 0, duration: 0.3, ease: "power2.out" }, "arrival");

  timeline.addLabel("impact", "arrival+=0.3");
  timeline.to(ending, { x: "-0.012em", duration: 0.06, ease: "sine.out" }, "impact");
  timeline.to(dot, { x: "-0.018em", duration: 0.06, ease: "sine.out" }, "impact");
  if (core) {
    timeline.to(core, { x: "-0.006em", duration: 0.06, ease: "sine.out" }, "impact");
  }
  timeline.to(
    core ? [ending, dot, core] : [ending, dot],
    { x: 0, duration: 0.22, ease: "power2.out" },
    "impact+=0.06",
  );
}
