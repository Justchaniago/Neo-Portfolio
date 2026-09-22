"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import styles from "./ProjectsExperience.module.css";
import { ProjectDetails } from "./ProjectDetails";
import { ProjectRail } from "./ProjectRail";

const sheetDistance = () => Math.max(window.innerHeight, 1);

export function ProjectsExperience({ children }: { children: ReactNode }) {
  const hero = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLElement>(null);
  const surfacePath = useRef<SVGPathElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const ratio = useRef(0);
  const targetRatio = useRef(0);
  const followFrame = useRef<number | undefined>(undefined);
  const followTime = useRef<number | undefined>(undefined);
  const touchStart = useRef<{ x: number; y: number; ratio: number; fromTop: boolean; lastY: number; lastTime: number; velocity: number } | null>(null);
  const projectLabelVisible = useRef(false);
  const [active, setActive] = useState(false);
  const [projectIndex, setProjectIndex] = useState(0);
  const handleProjectChange = useCallback((index: number) => setProjectIndex(index), []);

  const apply = useCallback((nextRatio: number) => {
    const next = gsap.utils.clamp(0, 1, nextRatio);
    const sheet = layer.current;
    if (!sheet) return;
    ratio.current = next;
    const shouldShowProjectLabel = next >= 0.985;
    if (shouldShowProjectLabel !== projectLabelVisible.current) {
      projectLabelVisible.current = shouldShowProjectLabel;
      document.documentElement.dataset.projectsActive = String(shouldShowProjectLabel);
    }
    const curveDepth = 72 * (1 - next);
    surfacePath.current?.setAttribute("d", `M0 ${curveDepth} Q720 0 1440 ${curveDepth} V1000 H0Z`);
    sheet.style.setProperty("--sheet-shadow-alpha", (0.04 + (1 - next) * 0.14).toFixed(3));
    gsap.set(sheet, { autoAlpha: next > 0 ? 1 : 0, yPercent: (1 - next) * 100 });
    if (scroller.current) scroller.current.style.pointerEvents = next >= 0.999 ? "auto" : "none";
  }, []);

  const beginFollow = useCallback(() => {
    followTime.current = undefined;
    const tick = (time: number) => {
      const difference = targetRatio.current - ratio.current;
      if (Math.abs(difference) < 0.0005) {
        apply(targetRatio.current);
        followFrame.current = undefined;
        followTime.current = undefined;
        if (targetRatio.current === 0) setActive(false);
        return;
      }
      const elapsed = followTime.current === undefined ? 16.67 : Math.min(50, time - followTime.current);
      const damping = 1 - Math.exp(-11 * (elapsed / 1000));
      followTime.current = time;
      apply(ratio.current + difference * damping);
      followFrame.current = requestAnimationFrame(tick);
    };
    followFrame.current = requestAnimationFrame(tick);
  }, [apply]);

  const moveTo = useCallback((nextRatio: number) => {
    gsap.killTweensOf(ratio);
    targetRatio.current = gsap.utils.clamp(0, 1, nextRatio);
    if (targetRatio.current > 0) setActive(true);
    if (followFrame.current === undefined) beginFollow();
  }, [beginFollow]);

  const settle = useCallback((target?: number) => {
    const destination = target ?? (ratio.current >= 0.5 ? 1 : 0);
    const sheet = layer.current;
    if (!sheet) return;
    if (destination > 0) setActive(true);
    targetRatio.current = destination;
    if (followFrame.current !== undefined) cancelAnimationFrame(followFrame.current);
    followFrame.current = undefined;
    followTime.current = undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(ratio, {
      current: destination,
      duration: reduced ? 0 : 0.48,
      ease: "power3.out",
      overwrite: true,
      onUpdate: () => apply(ratio.current),
      onComplete: () => {
        apply(destination);
        if (destination === 0) {
          setActive(false);
          trigger.current?.focus({ preventScroll: true });
        } else {
          scroller.current?.focus({ preventScroll: true });
        }
      },
    });
  }, [apply]);

  const revealBy = useCallback((delta: number) => {
    moveTo(targetRatio.current + delta / sheetDistance());
  }, [moveTo]);

  useEffect(() => {
    const heroElement = hero.current;
    const scrollElement = scroller.current;
    if (!heroElement || !scrollElement) return;

    const wheelOnHero = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || (ratio.current === 0 && event.deltaY <= 0)) return;
      event.preventDefault();
      revealBy(event.deltaY);
    };
    const wheelOnProjects = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (scrollElement.scrollTop > 0 || event.deltaY >= 0) return;
      event.preventDefault();
      revealBy(event.deltaY);
    };
    const startTouch = (event: TouchEvent, fromTop: boolean) => {
      if (event.touches.length !== 1) return;
      const point = event.touches[0];
      touchStart.current = { x: point.clientX, y: point.clientY, ratio: targetRatio.current, fromTop, lastY: point.clientY, lastTime: performance.now(), velocity: 0 };
    };
    const moveHero = (event: TouchEvent) => {
      const start = touchStart.current;
      if (!start || event.touches.length !== 1) return;
      const point = event.touches[0];
      const vertical = start.y - point.clientY;
      if (Math.abs(vertical) < Math.abs(point.clientX - start.x)) return;
      event.preventDefault();
      const now = performance.now();
      const elapsed = Math.max(8, now - start.lastTime);
      start.velocity = (start.lastY - point.clientY) / elapsed;
      start.lastY = point.clientY;
      start.lastTime = now;
      const next = start.ratio + vertical / sheetDistance();
      moveTo(next);
    };
    const moveProjects = (event: TouchEvent) => {
      const start = touchStart.current;
      if (!start || !start.fromTop || event.touches.length !== 1) return;
      const point = event.touches[0];
      const vertical = start.y - point.clientY;
      if (vertical >= 0 || Math.abs(vertical) < Math.abs(point.clientX - start.x)) return;
      event.preventDefault();
      const now = performance.now();
      const elapsed = Math.max(8, now - start.lastTime);
      start.velocity = (start.lastY - point.clientY) / elapsed;
      start.lastY = point.clientY;
      start.lastTime = now;
      moveTo(start.ratio + vertical / sheetDistance());
    };
    const endTouch = () => {
      const start = touchStart.current;
      touchStart.current = null;
      if (!start || Math.abs(start.velocity) < 0.08) return;
      const momentum = Math.max(-0.34, Math.min(0.34, (start.velocity * 220) / sheetDistance()));
      moveTo(targetRatio.current + momentum);
    };
    const layerElement = layer.current;
    const wheelOnLayer = (event: WheelEvent) => {
      if (!layerElement || ratio.current >= 0.999 || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      revealBy(event.deltaY);
    };
    const startLayerTouch = (event: TouchEvent) => startTouch(event, true);
    const moveLayerTouch = (event: TouchEvent) => {
      const start = touchStart.current;
      if (!start || event.touches.length !== 1) return;
      const point = event.touches[0];
      const vertical = start.y - point.clientY;
      if (Math.abs(vertical) < Math.abs(point.clientX - start.x)) return;
      event.preventDefault();
      const now = performance.now();
      const elapsed = Math.max(8, now - start.lastTime);
      start.velocity = (start.lastY - point.clientY) / elapsed;
      start.lastY = point.clientY;
      start.lastTime = now;
      moveTo(start.ratio + vertical / sheetDistance());
    };
    const startHeroTouch = (event: TouchEvent) => startTouch(event, false);
    const startProjectsTouch = (event: TouchEvent) => startTouch(event, scrollElement.scrollTop <= 0);

    heroElement.addEventListener("wheel", wheelOnHero, { passive: false });
    heroElement.addEventListener("touchstart", startHeroTouch, { passive: true });
    heroElement.addEventListener("touchmove", moveHero, { passive: false });
    heroElement.addEventListener("touchend", endTouch, { passive: true });
    scrollElement.addEventListener("wheel", wheelOnProjects, { passive: false });
    scrollElement.addEventListener("touchstart", startProjectsTouch, { passive: true });
    scrollElement.addEventListener("touchmove", moveProjects, { passive: false });
    scrollElement.addEventListener("touchend", endTouch, { passive: true });
    layerElement?.addEventListener("wheel", wheelOnLayer, { passive: false });
    layerElement?.addEventListener("touchstart", startLayerTouch, { passive: true });
    layerElement?.addEventListener("touchmove", moveLayerTouch, { passive: false });
    layerElement?.addEventListener("touchend", endTouch, { passive: true });
    return () => {
      heroElement.removeEventListener("wheel", wheelOnHero);
      heroElement.removeEventListener("touchstart", startHeroTouch);
      heroElement.removeEventListener("touchmove", moveHero);
      heroElement.removeEventListener("touchend", endTouch);
      scrollElement.removeEventListener("wheel", wheelOnProjects);
      scrollElement.removeEventListener("touchstart", startProjectsTouch);
      scrollElement.removeEventListener("touchmove", moveProjects);
      scrollElement.removeEventListener("touchend", endTouch);
      layerElement?.removeEventListener("wheel", wheelOnLayer);
      layerElement?.removeEventListener("touchstart", startLayerTouch);
      layerElement?.removeEventListener("touchmove", moveLayerTouch);
      layerElement?.removeEventListener("touchend", endTouch);
    };
  }, [moveTo, revealBy]);

  useEffect(() => () => {
    if (followFrame.current !== undefined) cancelAnimationFrame(followFrame.current);
    followTime.current = undefined;
    delete document.documentElement.dataset.projectsActive;
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && ratio.current > 0) settle(0); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [settle]);

  return <>
    <div ref={hero} className={styles.hero}>
      {children}
      <button ref={trigger} type="button" className={styles.trigger} onClick={() => settle(1)} aria-controls="projects-layer" aria-expanded={active}>Explore Projects ↑</button>
    </div>
    <section ref={layer} id="projects-layer" className={styles.layer} inert={!active} aria-hidden={!active} aria-label="Projects">
      <svg className={styles.surface} viewBox="0 0 1440 1000" preserveAspectRatio="none" aria-hidden="true">
        <path ref={surfacePath} d="M0 72 Q720 0 1440 72 V1000 H0Z" />
      </svg>
      <div ref={scroller} className={styles.scroll} tabIndex={-1}>
        <ProjectDetails activeIndex={projectIndex} />
        <ProjectRail onChange={handleProjectChange} />
      </div>
    </section>
  </>;
}
