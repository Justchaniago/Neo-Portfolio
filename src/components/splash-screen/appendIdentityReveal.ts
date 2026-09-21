import gsap from "gsap";

/** Append the identity change to the reel's clock; em units preserve resize behavior. */
export function appendIdentityReveal(timeline: gsap.core.Timeline, root: HTMLElement) {
  const wordmark = root.querySelector<HTMLElement>("[data-wordmark]")!;
  const prefix = root.querySelector<HTMLElement>("[data-prefix]")!;
  const suffix = root.querySelector<HTMLElement>("[data-suffix]")!;
  const dot = root.querySelector<HTMLElement>("[data-dot]")!;
  const ending = root.querySelector<HTMLElement>("[data-ending]")!;
  const fontSize = parseFloat(getComputedStyle(wordmark).fontSize);
  const offset = (prefix.getBoundingClientRect().width + suffix.getBoundingClientRect().width) / (2 * fontSize);

  gsap.set(wordmark, { "--intro-offset": `${offset}em` });
  gsap.set(dot, { y: 0, yPercent: 110 });
  gsap.set(ending, { x: 0, xPercent: 115 });

  timeline.addLabel("identity", "+=0.35");
  timeline.to(wordmark, { "--intro-offset": "0em", duration: 0.65, ease: "power2.inOut" }, "identity");
  timeline.to(prefix, { xPercent: -130, duration: 0.65, ease: "power2.inOut" }, "identity");
  timeline.set(prefix, { visibility: "hidden" });
  timeline.to(dot, { yPercent: 0, duration: 0.15, ease: "power2.out" });
  timeline.addLabel("arrival");
  timeline.to(ending, { xPercent: 0, duration: 0.45, ease: "back.out(1.05)" }, "arrival");
  timeline.to(dot, { x: "-0.04em", duration: 0.09, ease: "power2.out" }, "arrival+=0.24");
  timeline.to(dot, { x: 0, duration: 0.22, ease: "back.out(1.2)" });
}
