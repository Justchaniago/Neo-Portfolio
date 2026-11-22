"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { pageMotion } from "@/lib/pageMotion";
import styles from "./ProjectTransition.module.css";

export type RouteTransitionDetail = {
  href: string;
  label?: string;
  accent?: string;
  replaceBefore?: string;
  projectRuleFrom?: DOMRect;
  navigate: () => void;
};

const EVENT_NAME = "portfolio:route-transition";

export function triggerRouteTransition(detail: RouteTransitionDetail) {
  if (typeof window === "undefined") {
    detail.navigate();
    return;
  }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    if (detail.replaceBefore) {
      window.history.replaceState(null, "", detail.replaceBefore);
    }
    detail.navigate();
    return;
  }
  if (detail.href === "/projects" && detail.projectRuleFrom && window.location.pathname === "/") {
    const rect = detail.projectRuleFrom;
    window.dispatchEvent(new CustomEvent("portfolio:project-rule", { detail: rect }));
    detail.navigate();
    return;
  }
  window.dispatchEvent(new CustomEvent<RouteTransitionDetail>(EVENT_NAME, { detail }));
}

export function ProjectTransition() {
  const pathname = usePathname();
  const origin = useRef<DOMRect | null>(null);
  useEffect(() => {
    const remember = (event: Event) => { origin.current = (event as CustomEvent<DOMRect>).detail; };
    window.addEventListener("portfolio:project-rule", remember);
    return () => window.removeEventListener("portfolio:project-rule", remember);
  }, []);
  useEffect(() => {
    const from = origin.current;
    origin.current = null;
    if (!from || pathname !== "/projects") return;
    const rule = document.querySelector<HTMLElement>('[data-sheet]:not([hidden]) [data-entry-rule]');
    if (!rule || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const to = rule.getBoundingClientRect();
    const animation = rule.animate([
      { transform: `translate(${from.left-to.left}px, ${from.bottom-to.top-4}px) scaleX(${from.width/to.width})` },
      { transform: "none" },
    ], { duration: 650, easing: "cubic-bezier(.22,.74,.18,1)" });
    const stop = () => animation.cancel();
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    motion.addEventListener("change", stop);
    window.addEventListener("resize", stop);
    return () => { stop(); window.removeEventListener("resize", stop); motion.removeEventListener("change", stop); };
  }, [pathname]);
  const veilRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const labelTextRef = useRef<HTMLSpanElement>(null);
  const phaseRef = useRef<"idle" | "covering" | "waiting" | "revealing">("idle");
  const targetPathRef = useRef<string | null>(null);
  const targetSectionRef = useRef<string | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reveal = useRef(() => {});

  useEffect(() => {
    let slide: Animation | undefined;
    let caption: Animation | undefined;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finishMotion = () => {
      if (!motion.matches) return;
      caption?.finish();
      slide?.finish();
    };
    const clearWatchdog = () => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };

    const runReveal = () => {
      clearWatchdog();
      const veil = veilRef.current;
      const badge = badgeRef.current;
      if (!veil || phaseRef.current !== "waiting") return;
      phaseRef.current = "revealing";
      document.documentElement.dataset.routeTransitioning = "revealing";
      targetPathRef.current = null;
      targetSectionRef.current = null;

      slide?.cancel();
      caption?.cancel();
      // Let the compositor move the curtain independently of React's route commit.
      caption = badge?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: "forwards" });
      slide = veil.animate(
        [{ transform: "translateY(0)" }, { transform: "translateY(-101%)" }],
        { duration: pageMotion.reveal * 1000, easing: pageMotion.cssEase, fill: "both" },
      );
      slide.onfinish = () => {
        phaseRef.current = "idle";
        delete document.documentElement.dataset.routeTransitioning;
        veil.style.visibility = "hidden";
        veil.style.pointerEvents = "none";
        slide?.cancel();
        caption?.cancel();
      };
      finishMotion();
      window.dispatchEvent(new CustomEvent("portfolio:route-enter"));
    };

    reveal.current = runReveal;

    const onRequest = (event: Event) => {
      const detail = (event as CustomEvent<RouteTransitionDetail>).detail;
      const veil = veilRef.current;
      const badge = badgeRef.current;
      if (!detail || !veil) {
        detail?.navigate();
        return;
      }
      if (phaseRef.current === "covering" || phaseRef.current === "waiting") return;

      const url = new URL(detail.href, window.location.origin);
      const parsedTarget = url.pathname;
      const nextLabel = detail.label ?? "";
      const nextAccent = detail.accent ?? "#dfa13d";
      veil.style.setProperty("--transition-accent", nextAccent);
      if (labelTextRef.current) labelTextRef.current.textContent = nextLabel;
      phaseRef.current = "covering";
      targetPathRef.current = parsedTarget;
      targetSectionRef.current = parsedTarget === "/" ? url.searchParams.get("section") : null;
      document.documentElement.dataset.routeTransitioning = "covering";
      window.dispatchEvent(new CustomEvent("portfolio:route-exit", { detail: { href: detail.href } }));

      clearWatchdog();
      slide?.cancel();
      caption?.cancel();
      veil.style.visibility = "visible";
      veil.style.pointerEvents = "auto";
      caption = badge?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: 120, fill: "both" });
      slide = veil.animate(
        [{ transform: "translateY(101%)" }, { transform: "translateY(0)" }],
        { duration: pageMotion.cover * 1000, easing: "cubic-bezier(.55,0,.22,1)", fill: "both" },
      );
      slide.onfinish = () => {
        phaseRef.current = "waiting";
        document.documentElement.dataset.routeTransitioning = "waiting";
        if (detail.replaceBefore) {
          window.history.replaceState(null, "", detail.replaceBefore);
        }
        const beforePath = window.location.pathname;
        detail.navigate();
        // Normal reveal follows the pathname commit, not a guessed load duration.
        watchdogRef.current = setTimeout(runReveal, parsedTarget === beforePath ? 32 : 5000);
      };
    };

    window.addEventListener(EVENT_NAME, onRequest);
    motion.addEventListener("change", finishMotion);
    return () => {
      slide?.cancel();
      caption?.cancel();
      clearWatchdog();
      window.removeEventListener(EVENT_NAME, onRequest);
      motion.removeEventListener("change", finishMotion);
      delete document.documentElement.dataset.routeTransitioning;
    };
  }, []);

  useEffect(() => {
    if (phaseRef.current !== "waiting") return;
    if (!targetPathRef.current || pathname === targetPathRef.current) {
      let frame = 0;
      const check = () => {
        const section = targetSectionRef.current;
        const { staticSection, staticProgress } = document.documentElement.dataset;
        if ((section === "about" || section === "contact") &&
          (staticSection !== section || Number(staticProgress) < 1)) return;
        window.removeEventListener("portfolio:stack-top-settled", check);
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => reveal.current());
      };
      window.addEventListener("portfolio:stack-top-settled", check);
      check();
      return () => {
        window.removeEventListener("portfolio:stack-top-settled", check);
        cancelAnimationFrame(frame);
      };
    }
  }, [pathname]);

  return (
    <div
      ref={veilRef}
      className={styles.veil}
      aria-hidden="true"
    >
      <span className={styles.edgeTop} />
      <div ref={badgeRef} className={styles.badge}>
        <span className={styles.dot} />
        <span ref={labelTextRef} />
      </div>
      <span className={styles.edgeBottom} />
    </div>
  );
}
