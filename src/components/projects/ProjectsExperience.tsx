"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import styles from "./ProjectsExperience.module.css";
import { ProjectDetails } from "./ProjectDetails";
import { ProjectRail } from "./ProjectRail";
import { setStackSurfaceProgress, StackSection } from "@/components/layout/StackSection";
import { NarrativeSection } from "@/components/narrative/NarrativeSection";
import { AsciiGlobeSection } from "@/components/narrative/AsciiGlobeSection";
import { TaglineSection } from "@/components/narrative/TaglineSection";
import { StaticPagesExperience } from "@/components/pages/StaticPagesExperience";

const setProjectScrollLock = (locked: boolean) => {
  window.dispatchEvent(new CustomEvent("portfolio:scroll-lock", {
    detail: { source: "projects", locked },
  }));
};

export function ProjectsExperience({ children }: { children: ReactNode }) {
  const hero = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLElement>(null);
  const surfacePath = useRef<SVGPathElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const ratio = useRef(0);
  const targetOpen = useRef(false);
  const projectLabelVisible = useRef(false);
  const returning = useRef(false);
  const [active, setActive] = useState(false);
  const [projectIndex, setProjectIndex] = useState(0);
  const handleProjectChange = useCallback((index: number) => setProjectIndex(index), []);

  const syncBackgroundDepth = useCallback(() => {
    const heroEl = hero.current;
    if (!heroEl || returning.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pProj = Number(document.documentElement.dataset.projectsProgress ?? "0");
    const pStat = Number(document.documentElement.dataset.staticProgress ?? "0");
    const depth = Math.max(pProj, pStat);

    if (reduced || depth <= 0.001) {
      gsap.set(heroEl, { clearProps: "transform,filter,borderRadius" });
      return;
    }

    const scale = 1 - depth * 0.046;
    const y = -depth * 32;
    const brightness = 1 - depth * 0.38;
    const radius = depth * 22;
    gsap.set(heroEl, {
      scale,
      y,
      borderRadius: `${radius.toFixed(1)}px`,
      filter: `brightness(${brightness.toFixed(3)})`,
      transformOrigin: "50% 18%",
    });
  }, []);

  const apply = useCallback((nextRatio: number) => {
    const next = gsap.utils.clamp(0, 1, nextRatio);
    const sheet = layer.current;
    if (!sheet) return;
    ratio.current = next;
    const shouldShowProjectLabel = !returning.current && targetOpen.current;
    if (shouldShowProjectLabel !== projectLabelVisible.current) {
      projectLabelVisible.current = shouldShowProjectLabel;
      document.documentElement.dataset.projectsActive = String(shouldShowProjectLabel);
    }
    document.documentElement.dataset.projectsProgress = next.toFixed(4);
    setStackSurfaceProgress(surfacePath.current, next);
    sheet.style.setProperty("--sheet-shadow-alpha", (0.08 + (1 - next) * 0.24).toFixed(3));
    gsap.set(sheet, { autoAlpha: next > 0 ? 1 : 0, yPercent: (1 - next) * 100 });
    if (scroller.current) scroller.current.style.pointerEvents = next >= 0.96 ? "auto" : "none";
    syncBackgroundDepth();
  }, [syncBackgroundDepth]);

  const settle = useCallback((target?: number, handoff = false) => {
    const destination = target ?? (ratio.current >= 0.5 ? 1 : 0);
    const sheet = layer.current;
    if (!sheet) return;
    targetOpen.current = destination > 0;
    if (destination > 0) {
      setProjectScrollLock(true);
      setActive(true);
      projectLabelVisible.current = true;
      document.documentElement.dataset.projectsActive = "true";
      sheet.style.zIndex = "53";
      gsap.killTweensOf(sheet, "scale,filter");
      gsap.set(sheet, { clearProps: "scale,filter" });
    } else {
      projectLabelVisible.current = false;
      document.documentElement.dataset.projectsActive = "false";
      if (handoff) {
        sheet.style.zIndex = "52";
        gsap.to(sheet, {
          scale: 0.96,
          filter: "brightness(0.65)",
          duration: 0.85,
          ease: "expo.out",
          overwrite: "auto",
        });
      }
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(ratio, {
      current: destination,
      duration: reduced ? 0 : destination === 0 ? 0.96 : 1.08,
      ease: "expo.out",
      overwrite: true,
      onUpdate: () => apply(ratio.current),
      onComplete: () => {
        apply(destination);
        if (destination === 0) {
          gsap.set(sheet, { clearProps: "scale,filter,zIndex" });
          setProjectScrollLock(false);
          setActive(false);
          window.dispatchEvent(new CustomEvent("portfolio:project-closed"));
          document.querySelector<HTMLAnchorElement>("[data-project-link='true']")?.focus({ preventScroll: true });
        } else {
          scroller.current?.focus({ preventScroll: true });
        }
      },
    });
  }, [apply]);

  const closeProjects = useCallback((mode: "hero-curtain" | "slide-down" = "slide-down", handoff = false) => {
    const heroElement = hero.current;
    if (!heroElement || returning.current) return;
    targetOpen.current = false;
    if (ratio.current <= 0.001) {
      setProjectScrollLock(false);
      projectLabelVisible.current = false;
      document.documentElement.dataset.projectsActive = "false";
      return;
    }

    if (mode === "slide-down") {
      settle(0, handoff);
      return;
    }

    returning.current = true;
    projectLabelVisible.current = false;
    document.documentElement.dataset.projectsActive = "false";
    setActive(true);
    gsap.set(heroElement, { clearProps: "transform,filter,borderRadius" });
    heroElement.classList.add(styles.heroReturning);
    gsap.set(heroElement, { y: 0, yPercent: 100, scale: 0.96 });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      gsap.to(heroElement, {
        y: 0,
        yPercent: 0,
        scale: 1,
        duration: reduced ? 0 : 1.08,
        ease: "expo.out",
        overwrite: true,
        onComplete: () => {
          returning.current = false;
          apply(0);
          setProjectScrollLock(false);
          setActive(false);
          heroElement.classList.remove(styles.heroReturning);
          gsap.set(heroElement, { clearProps: "transform,filter,borderRadius" });
          window.dispatchEvent(new CustomEvent("portfolio:project-closed"));
          document.querySelector<HTMLAnchorElement>("[data-project-link='true']")?.focus({ preventScroll: true });
        },
      });
    });
  }, [apply, settle]);

  useEffect(() => {
    const requestProject = (event?: Event) => {
      if (event?.type === "portfolio:request-section") {
        const section = (event as CustomEvent<{ section?: string }>).detail?.section;
        if (section !== "project") return;
      }
      if (Number(document.documentElement.dataset.staticProgress ?? "0") > 0.001) {
        // Simultaneous single-step handoff: slide Static sheet down underneath while Projects rises on top!
        window.dispatchEvent(new CustomEvent("portfolio:close-static-pages", {
          detail: { handoff: true },
        }));
        settle(1);
      } else if (ratio.current > 0.001 || returning.current) {
        closeProjects("slide-down");
      } else {
        settle(1);
      }
    };
    const closeFromLogo = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: "hero-curtain" | "slide-down"; handoff?: boolean }>).detail;
      const mode = detail?.mode ?? "slide-down";
      const handoff = detail?.handoff ?? false;
      closeProjects(mode, handoff);
    };
    const staticObserver = new MutationObserver(syncBackgroundDepth);
    staticObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-static-progress"],
    });

    window.addEventListener("portfolio:request-section", requestProject);
    window.addEventListener("portfolio:toggle-projects", requestProject);
    window.addEventListener("portfolio:close-projects", closeFromLogo);
    return () => {
      staticObserver.disconnect();
      window.removeEventListener("portfolio:request-section", requestProject);
      window.removeEventListener("portfolio:toggle-projects", requestProject);
      window.removeEventListener("portfolio:close-projects", closeFromLogo);
    };
  }, [closeProjects, settle, syncBackgroundDepth]);

  useEffect(() => () => {
    setProjectScrollLock(false);
    delete document.documentElement.dataset.projectsActive;
    delete document.documentElement.dataset.projectsProgress;
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && ratio.current > 0) closeProjects("hero-curtain"); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeProjects]);

  return <>
    <div ref={hero} className={styles.hero}>
      {children}
    </div>
    <NarrativeSection />
    <AsciiGlobeSection />
    <TaglineSection />
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
    <StaticPagesExperience />
  </>;
}
