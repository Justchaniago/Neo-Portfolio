"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { createLogoTimeline } from "./createLogoTimeline";

const INTERVAL = 15000;

export function useLogoReveal(ref: RefObject<HTMLAnchorElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const content = root.closest<HTMLElement>("[data-page-content]");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const hover = matchMedia("(hover: hover)");
    let visible = false;
    let disposed = false;
    let ready = false;
    let hovering = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let returnTimer: ReturnType<typeof setTimeout> | undefined;
    let timeline: gsap.core.Timeline | undefined;
    let context: gsap.Context | undefined;
    const eligible = () => ready && visible && !document.hidden && !content?.inert && !reduced.matches;
    const clearTimer = () => { clearTimeout(timer); timer = undefined; };
    const clearReturnTimer = () => { clearTimeout(returnTimer); returnTimer = undefined; };
    const schedule = () => {
      clearTimer();
      if (eligible() && !hovering) timer = setTimeout(playAutoplay, INTERVAL);
    };
    function playAutoplay() {
      if (!eligible() || !timeline) return;
      timeline.eventCallback("onComplete", () => {
        if (!hovering) returnTimer = setTimeout(returnToIdle, 2000);
      });
      timeline.restart();
    }
    function playHover() {
      if (!eligible() || !timeline) return;
      clearTimer();
      clearReturnTimer();
      timeline.eventCallback("onComplete", null);
      if (timeline.progress() === 1) return;
      timeline.play();
    }
    function returnToIdle() {
      clearReturnTimer();
      if (timeline && !hovering) timeline.reverse();
    }
    const sync = () => {
      clearTimer();
      clearReturnTimer();
      if (reduced.matches) {
        timeline?.pause(0);
      } else if (eligible()) {
        if (timeline && timeline.progress() > 0 && timeline.progress() < 1) timeline.resume();
        schedule();
      } else timeline?.pause();
    };
    const pointerEnter = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && hover.matches) {
        hovering = true;
        playHover();
      }
    };
    const pointerLeave = () => {
      if (!hovering) return;
      hovering = false;
      returnToIdle();
    };
    const focus = () => {
      if (root.matches(":focus-visible")) {
        hovering = true;
        playHover();
      }
    };
    const blur = () => {
      hovering = false;
      returnToIdle();
    };
    const prefix = root.querySelector<HTMLElement>("[data-logo-prefix]")!;
    const measure = () => {
      const em = parseFloat(getComputedStyle(root).fontSize);
      root.style.setProperty("--prefix-width", `${prefix.getBoundingClientRect().width / em}em`);
    };
    const resize = new ResizeObserver(measure);
    resize.observe(root);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    intersection.observe(root);
    const mutation = new MutationObserver(sync);
    if (content) mutation.observe(content, { attributes: true, attributeFilter: ["inert"] });
    root.addEventListener("pointerenter", pointerEnter);
    root.addEventListener("pointerleave", pointerLeave);
    root.addEventListener("focus", focus);
    root.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    void document.fonts.ready.then(() => {
      if (disposed) return;
      measure();
      context = gsap.context(() => {
        timeline = createLogoTimeline(root);
        timeline.eventCallback("onReverseComplete", schedule);
      }, root);
      ready = true;
      sync();
    });
    return () => {
      disposed = true;
      clearTimer();
      clearReturnTimer();
      context?.revert();
      resize.disconnect();
      intersection.disconnect();
      mutation.disconnect();
      root.removeEventListener("pointerenter", pointerEnter);
      root.removeEventListener("pointerleave", pointerLeave);
      root.removeEventListener("focus", focus);
      root.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      root.style.removeProperty("--prefix-width");
    };
  }, [ref]);
}
