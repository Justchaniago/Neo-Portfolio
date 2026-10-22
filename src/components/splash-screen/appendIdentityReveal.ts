import gsap from "gsap";

/** Append the identity change to the reel's clock; em units preserve resize behavior. */
export function appendIdentityReveal(timeline: gsap.core.Timeline, root: HTMLElement) {
  const wordmark = root.querySelector<HTMLElement>("[data-wordmark]")!;
  const prefix = root.querySelector<HTMLElement>("[data-prefix]")!;
  const core = root.querySelector<HTMLElement>("[data-core]");
  const suffix = root.querySelector<HTMLElement>("[data-suffix]")!;
  const dot = root.querySelector<HTMLElement>("[data-dot]")!;
  const dotCircle = root.querySelector<HTMLElement>("[data-dot-circle]");
  const ending = root.querySelector<HTMLElement>("[data-ending]")!;
  const fontSize = parseFloat(getComputedStyle(wordmark).fontSize);
  const offset = (prefix.getBoundingClientRect().width + suffix.getBoundingClientRect().width) / (2 * fontSize);

  gsap.set(wordmark, { "--intro-offset": `${offset}em` });
  gsap.set(dot, { y: 0, yPercent: 110, transformOrigin: "center bottom" });
  gsap.set(ending, { x: 0, xPercent: 120, transformOrigin: "left center" });
  if (core) {
    gsap.set(core, { transformOrigin: "right center" });
  }
  if (dotCircle) {
    gsap.set(dotCircle, { transformOrigin: "center bottom" });
  }

  timeline.addLabel("identity", "+=0.18");
  timeline.to(wordmark, { "--intro-offset": "0em", duration: 0.7, ease: "expo.inOut" }, "identity");
  timeline.to(prefix, { xPercent: -130, duration: 0.66, ease: "expo.inOut" }, "identity");
  timeline.set(prefix, { visibility: "hidden" }, "identity+=0.66");

  // 1. Dot rises into place right beside "chaniago"
  timeline.addLabel("dotRise", "identity+=0.44");
  timeline.to(dot, { yPercent: 0, duration: 0.22, ease: "back.out(1.6)" }, "dotRise");
  if (dotCircle) {
    timeline.fromTo(
      dotCircle,
      { scaleX: 0.85, scaleY: 1.2 },
      { scaleX: 1, scaleY: 1, duration: 0.24, ease: "back.out(2)" },
      "dotRise",
    );
  }

  // 2. "me" accelerates IN from the right (`power3.in` = speeds up until full-speed collision at xPercent: 0)
  timeline.addLabel("arrival", "dotRise+=0.08");
  timeline.fromTo(
    ending,
    { xPercent: 120, scaleX: 1.08, scaleY: 0.94 },
    { xPercent: 0, scaleX: 1.04, scaleY: 0.97, duration: 0.17, ease: "power3.in" },
    "arrival",
  );

  // 3. COLLISION IMPACT: "me" slams into "chaniago." at peak velocity!
  timeline.addLabel("impact", "arrival+=0.17");

  // 3a. "me" squashes at the point of collision, rebounds slightly right (+x), then settles with spring physics
  timeline.to(
    ending,
    {
      x: "-0.025em",
      scaleX: 0.84,
      scaleY: 1.15,
      duration: 0.045,
      ease: "power2.out",
    },
    "impact",
  );
  timeline.to(
    ending,
    {
      x: "0.055em",
      scaleX: 1.05,
      scaleY: 0.96,
      duration: 0.11,
      ease: "power2.out",
    },
    "impact+=0.045",
  );
  timeline.to(
    ending,
    {
      x: 0,
      scaleX: 1,
      scaleY: 1,
      duration: 0.52,
      ease: "elastic.out(1.15, 0.42)",
    },
    "impact+=0.155",
  );

  // 3b. "." & "chaniago" get knocked hard to the left by the momentum transfer, then spring back
  timeline.to(
    dot,
    {
      x: "-0.135em",
      scaleX: 0.88,
      scaleY: 1.12,
      duration: 0.08,
      ease: "power3.out",
    },
    "impact",
  );
  timeline.to(
    dot,
    {
      x: 0,
      scaleX: 1,
      scaleY: 1,
      duration: 0.62,
      ease: "elastic.out(1.1, 0.38)",
    },
    "impact+=0.08",
  );

  if (core) {
    // True Newton's Cradle / Accordion Wave per-letter (right-to-left from 'o' to 'c')
    // No rigid block shift on `core`; each letter compresses against its neighbor and transfers momentum left!
    const coreSlots = Array.from(core.children) as HTMLElement[];
    const count = coreSlots.length;
    if (count > 0) {
      coreSlots.slice().reverse().forEach((slot, revIdx) => {
        // Wave travels right-to-left: 'o' (revIdx = 0) -> 'c' (revIdx = 7)
        const progressLeft = count > 1 ? revIdx / (count - 1) : 1;
        const delay = 0.008 + revIdx * 0.015;
        // Inner letters compress & shift left; leftmost letters ('c', 'h') get flung furthest left like Newton's cradle!
        const kickLeft = -(0.095 + progressLeft * 0.135);
        // Rightmost letters ('o', 'g') absorb highest squash; leftmost letters launch out cleaner
        const squashX = 1 - (0.11 - progressLeft * 0.055);
        const stretchY = 1 + (0.09 - progressLeft * 0.045);
        const flightDuration = 0.07 + progressLeft * 0.035;
        const returnDuration = 0.56 + progressLeft * 0.12;

        gsap.set(slot, { transformOrigin: "center baseline" });
        timeline.to(
          slot,
          {
            x: `${kickLeft.toFixed(4)}em`,
            scaleX: Number(squashX.toFixed(4)),
            scaleY: Number(stretchY.toFixed(4)),
            duration: flightDuration,
            ease: "power3.out",
          },
          `impact+=${delay.toFixed(3)}`,
        );
        timeline.to(
          slot,
          {
            x: 0,
            scaleX: 1,
            scaleY: 1,
            duration: returnDuration,
            ease: "elastic.out(1.08, 0.38)",
          },
          `impact+=${(delay + flightDuration).toFixed(3)}`,
        );
      });
    }
  }
}
