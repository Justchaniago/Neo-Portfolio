"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { AntigravityHalo } from "@/components/animations/AntigravityHalo";
import { HeroPortrait } from "@/components/hero/HeroPortrait";
import { CurvedMobileTagline } from "@/components/hero/CurvedMobileTagline";
import { ProjectsExperience } from "@/components/projects/ProjectsExperience";
import { PROJECTS } from "@/lib/projects";
import { getPerformanceProfile } from "@/lib/performanceTier";
import styles from "./Home.module.css";

export default function Home() {
  const pathname = usePathname();
  const page = useRef<HTMLElement>(null);
  const heroSurface = useRef<HTMLDivElement>(null);
  const portraitLayer = useRef<HTMLDivElement>(null);
  const pageContent = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (pathname !== "/") return;
    const params = new URLSearchParams(window.location.search);
    const section = params.get("section");
    if (section !== "project" && section !== "about" && section !== "contact") return;
    const projectIndex = PROJECTS.findIndex((project) => project.slug === params.get("project"));

    // Fast path for project return when splash is already complete is handled synchronously
    // before paint in ProjectsExperience useLayoutEffect to prevent any white hero flash.
    if (section === "project" && document.documentElement.dataset.splashComplete === "true") {
      return;
    }

    let observer: MutationObserver | null = null;
    let cancelled = false;
    const requestSection = () => {
      if (cancelled || document.documentElement.dataset.splashComplete !== "true") return;
      observer?.disconnect();
      if (section === "project" && projectIndex >= 0) {
        window.dispatchEvent(new CustomEvent("portfolio:select-project", {
          detail: { index: projectIndex },
        }));
      }
      if (!(section === "project" && document.documentElement.dataset.projectsActive === "true")) {
        window.dispatchEvent(new CustomEvent("portfolio:request-section", {
          detail: { section },
        }));
      }
      window.history.replaceState(null, "", "/");
    };

    if (document.documentElement.dataset.splashComplete === "true") {
      queueMicrotask(requestSection);
    } else {
      observer = new MutationObserver(requestSection);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-splash-complete"],
      });
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    getPerformanceProfile();
    const scroller = page.current;
    const heroBox = heroSurface.current;
    const layer = portraitLayer.current;
    if (!scroller || !heroBox || !layer) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scrollLocks = new Set<string>();
    let viewportHeight = Math.max(1, scroller.clientHeight);
    let lastProgress = -1;
    let lastOffset = -1;
    let frame = 0;

    const syncHeroScroll = (scrollTop: number) => {
      const clampedScroll = Math.max(0, scrollTop);
      const distance = Math.min(clampedScroll, viewportHeight);
      const progress = reduced.matches ? 0 : distance / viewportHeight;
      const offset = reduced.matches ? 0 : distance * 0.25;

      if (Math.abs(offset - lastOffset) > 0.05) {
        lastOffset = offset;
        layer.style.setProperty("--portrait-offset", `${offset.toFixed(2)}px`);
      }
      if (Math.abs(progress - lastProgress) > 0.0005) {
        lastProgress = progress;
        heroBox.style.setProperty("--hero-scroll-progress", progress.toFixed(4));
      }

      const scrolling = String(clampedScroll > 1);
      if (document.documentElement.dataset.heroScrolling !== scrolling) {
        document.documentElement.dataset.heroScrolling = scrolling;
      }
    };

    const startRaf = () => {
      if (frame || reduced.matches || document.hidden || scrollLocks.size > 0 || !lenisRef.current) return;
      const raf = (time: number) => {
        frame = 0;
        if (document.hidden || scrollLocks.size > 0 || !lenisRef.current) return;
        lenisRef.current.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    };

    const stopRaf = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const setScrollLock = (event: Event) => {
      const detail = (event as CustomEvent<{ source?: string; locked?: boolean }>).detail;
      const source = detail?.source;
      if (!source) return;

      if (detail.locked) {
        scrollLocks.add(source);
      } else {
        scrollLocks.delete(source);
      }

      const locked = scrollLocks.size > 0;
      if (locked) {
        scroller.style.overflowY = "hidden";
        lenisRef.current?.stop();
        stopRaf();
      } else {
        scroller.style.removeProperty("overflow-y");
        lenisRef.current?.start();
        startRaf();
      }
    };

    const goHome = () => {
      const isLayerActive = Number(document.documentElement.dataset.projectsProgress ?? "0") > 0.001
        || Number(document.documentElement.dataset.staticProgress ?? "0") > 0.001
        || document.documentElement.dataset.projectsActive === "true"
        || Boolean(document.documentElement.dataset.staticSection);

      if (isLayerActive) {
        scroller.scrollTop = 0;
        lenisRef.current?.scrollTo(0, { immediate: true, force: true });
      } else if (lenisRef.current) {
        lenisRef.current.scrollTo(0, {
          duration: reduced.matches ? 0 : 1.15,
          force: true,
        });
      } else {
        scroller.scrollTo({ top: 0, behavior: reduced.matches ? "auto" : "smooth" });
      }
    };

    window.addEventListener("portfolio:go-home", goHome);
    window.addEventListener("portfolio:scroll-lock", setScrollLock);
    const update = () => {
      syncHeroScroll(scroller.scrollTop);
    };

    update();
    reduced.addEventListener("change", update);
    const resizeObserver = new ResizeObserver(() => {
      viewportHeight = Math.max(1, scroller.clientHeight);
      lastProgress = -1;
      lastOffset = -1;
      update();
    });
    resizeObserver.observe(scroller);

    if (reduced.matches || !pageContent.current) {
      scroller.addEventListener("scroll", update, { passive: true });
      return () => {
        window.removeEventListener("portfolio:go-home", goHome);
        window.removeEventListener("portfolio:scroll-lock", setScrollLock);
        scrollLocks.clear();
        scroller.style.removeProperty("overflow-y");
        scroller.removeEventListener("scroll", update);
        reduced.removeEventListener("change", update);
        resizeObserver.disconnect();
        delete document.documentElement.dataset.heroScrolling;
        heroBox.style.removeProperty("--hero-scroll-progress");
      };
    }

    const lenis = new Lenis({
      wrapper: scroller,
      content: pageContent.current,
      autoRaf: false,
      smoothWheel: true,
      syncTouch: true,
      lerp: 0.085,
    });
    lenisRef.current = lenis;
    if (scrollLocks.size > 0) lenis.stop();
    const onLenisScroll = (instance: Lenis) => {
      syncHeroScroll(instance.scroll);
    };
    lenis.on("scroll", onLenisScroll);

    const onVisibilityChange = () => {
      if (document.hidden) stopRaf();
      else startRaf();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    startRaf();

    return () => {
      window.removeEventListener("portfolio:go-home", goHome);
      window.removeEventListener("portfolio:scroll-lock", setScrollLock);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      scrollLocks.clear();
      scroller.style.removeProperty("overflow-y");
      reduced.removeEventListener("change", update);
      resizeObserver.disconnect();
      lenis.off("scroll", onLenisScroll);
      lenis.destroy();
      lenisRef.current = null;
      stopRaf();
      delete document.documentElement.dataset.heroScrolling;
      heroBox.style.removeProperty("--hero-scroll-progress");
    };
  }, []);

  return (
    <main ref={page} className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-white">
      <div ref={pageContent} className="min-h-full">
      <ProjectsExperience>
      <div ref={heroSurface} className="relative flex min-h-0 flex-1 items-end justify-center overflow-hidden w-full">
        <div className={`${styles.haloLayer} absolute inset-0 z-0 pointer-events-auto`}>
          <AntigravityHalo />
        </div>

        <CurvedMobileTagline />

        <div ref={portraitLayer} className={`${styles.portraitParallax} relative z-10 h-full w-full`}>
          <div className={`${styles.heroImage} relative h-full w-full`}>
            <HeroPortrait />
          </div>
        </div>

        <span className="sr-only">Software Engineer. Creative Developer. Interaction Designer.</span>

        <div className={styles.heroCopy}>
          <span className={styles.heroArrow} aria-hidden="true">↘</span>
          <p className={styles.heroLineMask}>
            <span className={styles.heroLine} style={{ "--line-index": 0 } as CSSProperties}>Founder</span>
          </p>
          <p className={styles.heroLineMask}>
            <span className={styles.heroLine} style={{ "--line-index": 1 } as CSSProperties}>Chaniago Labs</span>
          </p>
        </div>

        <div className={styles.scrollCue} aria-hidden="true">
          <span className={styles.scrollCueTrack}>
            <span className={styles.scrollCuePulse} />
          </span>
          <span className={styles.scrollCueLabel}>Scroll to explore</span>
        </div>

        <div className={styles.heroTelemetry} aria-hidden="true">
          <span className={styles.telemetryStatus}>
            <span className={styles.telemetryDot} />
            <span>AVAILABLE FOR SELECT WORK</span>
          </span>
          <span className={styles.telemetryCoords}>SURABAYA, ID · 07°15&apos;S 112°45&apos;E</span>
        </div>
      </div>
      </ProjectsExperience>
      </div>
    </main>
  );
}
