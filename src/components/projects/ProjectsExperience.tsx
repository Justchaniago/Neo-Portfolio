"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import styles from "./ProjectsExperience.module.css";
import { ProjectDetails } from "./ProjectDetails";
import { ProjectRail } from "./ProjectRail";
import { setStackSurfaceProgress, StackSection } from "@/components/layout/StackSection";

export function ProjectsExperience({ children }: { children: ReactNode }) {
  const hero = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLElement>(null);
  const surfacePath = useRef<SVGPathElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const ratio = useRef(0);
  const projectLabelVisible = useRef(false);
  const returning = useRef(false);
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
    document.documentElement.dataset.projectsProgress = next.toFixed(4);
    setStackSurfaceProgress(surfacePath.current, next);
    sheet.style.setProperty("--sheet-shadow-alpha", (0.04 + (1 - next) * 0.14).toFixed(3));
    gsap.set(sheet, { autoAlpha: next > 0 ? 1 : 0, yPercent: (1 - next) * 100 });
    if (scroller.current) scroller.current.style.pointerEvents = next >= 0.999 ? "auto" : "none";
  }, []);

  const settle = useCallback((target?: number) => {
    const destination = target ?? (ratio.current >= 0.5 ? 1 : 0);
    const sheet = layer.current;
    if (!sheet) return;
    if (destination > 0) setActive(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(ratio, {
      current: destination,
      duration: reduced ? 0 : 1.15,
      ease: "power3.out",
      overwrite: true,
      onUpdate: () => apply(ratio.current),
      onComplete: () => {
        apply(destination);
        if (destination === 0) {
          setActive(false);
          document.querySelector<HTMLAnchorElement>("[data-project-link='true']")?.focus({ preventScroll: true });
        } else {
          scroller.current?.focus({ preventScroll: true });
        }
      },
    });
  }, [apply]);

  const closeProjects = useCallback(() => {
    const heroElement = hero.current;
    if (!heroElement || returning.current) return;
    returning.current = true;
    setActive(true);
    heroElement.classList.add(styles.heroReturning);
    gsap.set(heroElement, { yPercent: 100 });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      gsap.to(heroElement, {
        yPercent: 0,
        duration: reduced ? 0 : 1.2,
        ease: "power3.out",
        overwrite: true,
        onComplete: () => {
          apply(0);
          setActive(false);
          returning.current = false;
          heroElement.classList.remove(styles.heroReturning);
          gsap.set(heroElement, { clearProps: "transform" });
          document.querySelector<HTMLAnchorElement>("[data-project-link='true']")?.focus({ preventScroll: true });
        },
      });
    });
  }, [apply]);

  useEffect(() => {
    const toggleProjects = () => {
      if (ratio.current > 0.001 || returning.current) closeProjects();
      else settle(1);
    };
    const closeFromLogo = () => closeProjects();
    window.addEventListener("portfolio:toggle-projects", toggleProjects);
    window.addEventListener("portfolio:close-projects", closeFromLogo);
    return () => {
      window.removeEventListener("portfolio:toggle-projects", toggleProjects);
      window.removeEventListener("portfolio:close-projects", closeFromLogo);
    };
  }, [closeProjects, settle]);

  useEffect(() => () => {
    delete document.documentElement.dataset.projectsActive;
    delete document.documentElement.dataset.projectsProgress;
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && ratio.current > 0) closeProjects(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeProjects]);

  return <>
    <div ref={hero} className={styles.hero}>
      {children}
    </div>
    <StackSection
      sectionRef={layer}
      surfacePathRef={surfacePath}
      id="projects-layer"
      className={styles.layer}
      contentClassName={styles.scroll}
      inert={!active}
      aria-hidden={!active}
      aria-label="Projects"
    >
      <div ref={scroller} tabIndex={-1}>
        <ProjectDetails activeIndex={projectIndex} />
        <ProjectRail onChange={handleProjectChange} />
      </div>
    </StackSection>
  </>;
}
