// Seconds for GSAP; convert to milliseconds only at the Web Animations boundary.
export const pageMotion = {
  cover: 0.32,
  reveal: 0.44,
  travel: 0.76,
  content: 0.48,
  stagger: 0.035,
  lift: 16,
  ease: "power2.out",
  // Same cubic ease-out as GSAP power2.out: 1 - (1 - t)^3.
  cssEase: "cubic-bezier(.333333,1,.666667,1)",
} as const;

export function sheetDuration(distance: number, immediate: boolean) {
  return immediate || distance === 0 ? 0 : pageMotion.travel * Math.sqrt(Math.min(1, Math.abs(distance)));
}
