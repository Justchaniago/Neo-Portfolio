"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import styles from "./ProjectsExperience.module.css";
import { WorkIndex } from "@/app/studies/work-index/WorkIndex";
import impression from "@/app/studies/work-index/impression/Impression.module.css";
import { pageMotion, sheetDuration } from "@/lib/pageMotion";
import { setStackSurfaceProgress, StackSection } from "@/components/layout/StackSection";
import { BlueprintWorkspace } from "@/components/blueprint/BlueprintWorkspace";
import { TheCutSection } from "@/components/narrative/TheCutSection";
import { NarrativeSection } from "@/components/narrative/NarrativeSection";
import { AsciiGlobeSection } from "@/components/narrative/AsciiGlobeSection";
import { TaglineSection } from "@/components/narrative/TaglineSection";
import { StaticPagesExperience } from "@/components/pages/StaticPagesExperience";
import { PROJECTS } from "@/lib/projects";
import { getPerformanceProfile } from "@/lib/performanceTier";

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
  const initialQueryRef = useRef<{ section: string | null; matchedIdx: number } | null>(null);
  const [active, setActive] = useState(false);
  const [projectIndex, setProjectIndex] = useState(-1);

  const syncBackgroundDepth = useCallback(() => {
    const heroEl = hero.current;
    if (!heroEl || returning.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pProj = Number(document.documentElement.dataset.projectsProgress ?? "0");
    const pStat = Number(document.documentElement.dataset.staticProgress ?? "0");
    const depth = Math.max(pProj, pStat);

    const isOpen = String(depth > 0.001);
    if (document.documentElement.dataset.overlayOpen !== isOpen) {
      document.documentElement.dataset.overlayOpen = isOpen;
    }
    const isSettled = String(depth >= 0.999);
    if (document.documentElement.dataset.overlaySettled !== isSettled) {
      document.documentElement.dataset.overlaySettled = isSettled;
    }

    if (reduced || depth <= 0.001) {
      gsap.set(heroEl, { clearProps: "transform,filter,borderRadius,willChange" });
      return;
    }

    const perf = getPerformanceProfile();
    const useFilter = perf.tier === "high" && !perf.isSafari && !perf.isWindows;
    heroEl.style.willChange = depth >= 0.999 ? "auto" : useFilter ? "transform, filter" : "transform";

    const scale = 1 - depth * 0.046;
    const y = -depth * 32;
    const radius = depth * 22;
    if (useFilter) {
      const brightness = 1 - depth * 0.38;
      gsap.set(heroEl, {
        scale,
        y,
        borderRadius: `${radius.toFixed(1)}px`,
        filter: `brightness(${brightness.toFixed(3)})`,
        transformOrigin: "50% 18%",
      });
    } else {
      gsap.set(heroEl, {
        scale,
        y,
        borderRadius: `${radius.toFixed(1)}px`,
        clearProps: "filter",
        transformOrigin: "50% 18%",
      });
    }
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
    if (scroller.current) scroller.current.style.pointerEvents = next >= 0.96 && targetOpen.current ? "auto" : "none";
    syncBackgroundDepth();
  }, [syncBackgroundDepth]);

  // Synchronous pre-paint restore when returning from a case-study route (?section=project&project=slug)
  // Cached in initialQueryRef so React Strict Mode double-invocation in dev replays identically.
  useLayoutEffect(() => {
    if (!initialQueryRef.current) {
      const params = new URLSearchParams(window.location.search);
      const sec = params.get("section");
      const slug = params.get("project");
      initialQueryRef.current = {
        section: sec,
        matchedIdx: slug ? PROJECTS.findIndex((p) => p.slug === slug) : -1,
      };
    }
    const { section, matchedIdx } = initialQueryRef.current;

    if (matchedIdx >= 0) {
      window.dispatchEvent(new CustomEvent("portfolio:select-project", {
        detail: { index: matchedIdx },
      }));
    }

    if (section === "project" && document.documentElement.dataset.splashComplete === "true") {
      const sheet = layer.current;
      targetOpen.current = true;
      projectLabelVisible.current = true;
      document.documentElement.dataset.projectsActive = "true";
      if (sheet) {
        sheet.style.zIndex = "53";
        sheet.removeAttribute("inert");
        sheet.setAttribute("aria-hidden", "false");
        gsap.set(sheet, { clearProps: "scale,filter,y" });
      }
      apply(1);
      setProjectScrollLock(true);
      let cleanedUrl = false;
      const rafId = requestAnimationFrame(() => {
        if (!cleanedUrl && window.location.search) {
          cleanedUrl = true;
          window.history.replaceState(null, "", "/");
        }
        scroller.current?.focus({ preventScroll: true });
      });
      queueMicrotask(() => {
        setActive(true);
        if (matchedIdx >= 0) setProjectIndex(matchedIdx);
      });
      return () => cancelAnimationFrame(rafId);
    } else if (matchedIdx >= 0) {
      queueMicrotask(() => {
        setProjectIndex(matchedIdx);
      });
    }
  }, [apply]);

  const parkUnderneath = useCallback(() => {
    const sheet = layer.current;
    gsap.killTweensOf(ratio);
    if (sheet) {
      gsap.killTweensOf(sheet);
      gsap.set(sheet, { clearProps: "scale,filter,zIndex,y" });
    }
    targetOpen.current = false;
    projectLabelVisible.current = false;
    document.documentElement.dataset.projectsActive = "false";
    apply(0);
    setProjectScrollLock(false);
    setActive(false);
  }, [apply]);

  const recedeUnderneath = useCallback(() => {
    const sheet = layer.current;
    targetOpen.current = false;
    projectLabelVisible.current = false;
    document.documentElement.dataset.projectsActive = "false";
    if (!sheet || ratio.current <= 0.001) {
      parkUnderneath();
      return;
    }
    if (scroller.current) scroller.current.style.pointerEvents = "none";
    gsap.killTweensOf(ratio);
    gsap.killTweensOf(sheet, "scale,filter,y");
    sheet.style.zIndex = "52";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const perf = getPerformanceProfile();
    const useFilter = perf.tier === "high" && !perf.isSafari && !perf.isWindows;
    gsap.to(sheet, {
      scale: reduced ? 1 : 0.965,
      y: reduced ? 0 : -14,
      filter: reduced || !useFilter ? "none" : "brightness(0.55)",
      duration: reduced ? 0 : pageMotion.travel,
      ease: pageMotion.ease,
      overwrite: "auto",
    });
  }, [parkUnderneath]);

  const settle = useCallback((target?: number) => {
    const destination = target ?? (ratio.current >= 0.5 ? 1 : 0);
    const sheet = layer.current;
    if (!sheet) return;
    targetOpen.current = destination > 0;
    gsap.killTweensOf(ratio);
    gsap.killTweensOf(sheet, "scale,filter,y");
    if (scroller.current) {
      gsap.killTweensOf(scroller.current);
      gsap.set(scroller.current, { clearProps: "transform,opacity,visibility" });
    }

    if (destination > 0) {
      setProjectScrollLock(true);
      setActive(true);
      projectLabelVisible.current = true;
      document.documentElement.dataset.projectsActive = "true";
      sheet.style.zIndex = "53";
      gsap.set(sheet, { clearProps: "scale,filter,y" });
      const staticProgress = Number(document.documentElement.dataset.staticProgress ?? "0");
      if (staticProgress > 0.001 && ratio.current >= 0.98) {
        ratio.current = 0;
        apply(0);
      }
    } else {
      projectLabelVisible.current = false;
      document.documentElement.dataset.projectsActive = "false";
      gsap.set(sheet, { clearProps: "scale,filter,y" });
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(ratio, {
      current: destination,
      duration: sheetDuration(destination - ratio.current, reduced),
      ease: pageMotion.ease,
      overwrite: true,
      onUpdate: () => apply(ratio.current),
      onComplete: () => {
        apply(destination);
        if (destination === 0) {
          gsap.set(sheet, { clearProps: "scale,filter,zIndex,y" });
          setProjectScrollLock(false);
          setActive(false);
          window.dispatchEvent(new CustomEvent("portfolio:project-closed"));
          document.querySelector<HTMLAnchorElement>("[data-project-link='true']")?.focus({ preventScroll: true });
        } else {
          window.dispatchEvent(new CustomEvent("portfolio:stack-top-settled", {
            detail: { top: "project" },
          }));
          scroller.current?.focus({ preventScroll: true });
        }
      },
    });
  }, [apply]);

  const closeProjects = useCallback((mode: "hero-curtain" | "slide-down" = "slide-down", handoff = false) => {
    const heroElement = hero.current;
    if (!heroElement || returning.current) return;
    if (handoff) {
      recedeUnderneath();
      return;
    }
    targetOpen.current = false;
    if (ratio.current <= 0.001) {
      parkUnderneath();
      return;
    }

    if (mode === "slide-down") {
      settle(0);
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
        duration: reduced ? 0 : pageMotion.travel,
        ease: pageMotion.ease,
        overwrite: true,
        onComplete: () => {
          returning.current = false;
          parkUnderneath();
          heroElement.classList.remove(styles.heroReturning);
          gsap.set(heroElement, { clearProps: "transform,filter,borderRadius" });
          window.dispatchEvent(new CustomEvent("portfolio:project-closed"));
          document.querySelector<HTMLAnchorElement>("[data-project-link='true']")?.focus({ preventScroll: true });
        },
      });
    });
  }, [parkUnderneath, recedeUnderneath, settle]);

  useEffect(() => {
    const requestProject = (event?: Event) => {
      if (event?.type === "portfolio:request-section") {
        const section = (event as CustomEvent<{ section?: string }>).detail?.section;
        if (section !== "project") return;
      }
      const staticSectionActive = Boolean(document.documentElement.dataset.staticSection);
      const staticProgress = Number(document.documentElement.dataset.staticProgress ?? "0");
      if (staticSectionActive || staticProgress > 0.001) {
        window.dispatchEvent(new CustomEvent("portfolio:close-static-pages", {
          detail: { handoff: true },
        }));
        settle(1);
      } else if (targetOpen.current && ratio.current > 0.5) {
        closeProjects("slide-down");
      } else {
        settle(1);
      }
    };
    const closeFromLogo = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: "hero-curtain" | "slide-down"; handoff?: boolean }>).detail;
      const mode = detail?.mode ?? "slide-down";
      const handoff = detail?.handoff ?? false;
      if (!handoff && !targetOpen.current && Number(document.documentElement.dataset.staticProgress ?? "0") > 0.001) {
        parkUnderneath();
        return;
      }
      closeProjects(mode, handoff);
    };
    const onStackTopSettled = (event: Event) => {
      const top = (event as CustomEvent<{ top?: string }>).detail?.top;
      if (top && top !== "project") {
        parkUnderneath();
      }
    };
    const onSelectProject = (event: Event) => {
      const idx = (event as CustomEvent<{ index?: number }>).detail?.index;
      if (typeof idx === "number" && idx >= 0 && idx < PROJECTS.length) {
        setProjectIndex(idx);
      }
    };
    let exit: gsap.core.Tween | undefined;
    const resetExit = () => exit?.revert();
    const onRouteExit = () => {
      if (!targetOpen.current || !scroller.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      exit = gsap.to(scroller.current, {
        y: -20,
        opacity: 0.25,
        duration: pageMotion.cover,
        ease: "power2.in",
        overwrite: true,
      });
    };

    const staticObserver = new MutationObserver(syncBackgroundDepth);
    staticObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-static-progress"],
    });

    window.addEventListener("portfolio:request-section", requestProject);
    window.addEventListener("portfolio:toggle-projects", requestProject);
    window.addEventListener("portfolio:close-projects", closeFromLogo);
    window.addEventListener("portfolio:stack-top-settled", onStackTopSettled);
    window.addEventListener("portfolio:select-project", onSelectProject);
    window.addEventListener("portfolio:route-exit", onRouteExit);
    window.addEventListener("portfolio:route-enter", resetExit);
    return () => {
      resetExit();
      staticObserver.disconnect();
      window.removeEventListener("portfolio:request-section", requestProject);
      window.removeEventListener("portfolio:toggle-projects", requestProject);
      window.removeEventListener("portfolio:close-projects", closeFromLogo);
      window.removeEventListener("portfolio:stack-top-settled", onStackTopSettled);
      window.removeEventListener("portfolio:select-project", onSelectProject);
      window.removeEventListener("portfolio:route-exit", onRouteExit);
      window.removeEventListener("portfolio:route-enter", resetExit);
    };
  }, [closeProjects, parkUnderneath, settle, syncBackgroundDepth]);

  useEffect(() => () => {
    setProjectScrollLock(false);
    delete document.documentElement.dataset.projectsActive;
    delete document.documentElement.dataset.projectsProgress;
    delete document.documentElement.dataset.overlayOpen;
    delete document.documentElement.dataset.overlaySettled;
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || ratio.current <= 0 || event.defaultPrevented) return;
      if (!targetOpen.current && Number(document.documentElement.dataset.staticProgress ?? "0") > 0.001) {
        parkUnderneath();
        return;
      }
      closeProjects("hero-curtain");
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeProjects, parkUnderneath]);

  return <>
    <div ref={hero} className={styles.hero} data-home-chapter="INDEX">
      {children}
    </div>
    <BlueprintWorkspace posterSrc="/workspace-blueprint-4k.png" />
    <TheCutSection />
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
      onDragRatio={(nextRatio) => {
        gsap.killTweensOf(ratio);
        apply(nextRatio);
      }}
      onDragRelease={(shouldClose) => {
        if (shouldClose) {
          window.dispatchEvent(new CustomEvent("portfolio:go-home"));
          closeProjects("slide-down");
        } else {
          settle(1);
        }
      }}
      onRequestClose={() => {
        window.dispatchEvent(new CustomEvent("portfolio:go-home"));
        closeProjects("slide-down");
      }}
    >
      <div ref={scroller} className={`${styles.stage} ${impression.impression}`} tabIndex={-1}>
        {active && <WorkIndex impression embedded initialSlug={PROJECTS[projectIndex]?.slug} />}
      </div>
    </StackSection>
    <StaticPagesExperience />
  </>;
}
