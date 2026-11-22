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

// One smoothing constant for wheel, keys and hand-offs, so they share a feel.
const SCROLL_LERP = 0.085;
// Slow in, slow out: a long jump starts and lands gently instead of at full speed.
const glide = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

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
    // The lifted Hero casts its shadow from inside the Blueprint section; both read one progress.
    const shade = scroller.querySelector<HTMLElement>("[data-hero-shade]");
    const sheets = shade ? [heroBox, shade] : [heroBox];

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
      const settled = progress === 0 || progress === 1;
      if (Math.abs(progress - lastProgress) > 0.0005 || (settled && progress !== lastProgress)) {
        lastProgress = progress;
        for (const sheet of sheets) {
          sheet.style.setProperty("--hero-scroll-progress", progress.toFixed(4));
          sheet.toggleAttribute("data-lifting", !settled);
        }
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
        // Lenis measures time between its own frames. After a pause, tell it the time now,
        // or a scroll started this frame would cover the whole pause in one step.
        lenisRef.current?.raf(performance.now());
        startRaf();
      }
    };

    // Sections that pace the scroll themselves stand aside while the page travels.
    let travelling = false;
    const announceTravel = (active: boolean) => {
      if (travelling === active) return;
      travelling = active;
      window.dispatchEvent(new CustomEvent("portfolio:scroll-travel", { detail: { active } }));
    };
    // Any scroll of the visitor's own ends the travel, whether or not it had landed.
    const endTravel = () => announceTravel(false);
    // Long jumps take a little longer, but never start or stop abruptly.
    const travelTo = (to: number) => {
      const lenis = lenisRef.current;
      if (!lenis || Math.abs(to - lenis.scroll) < 1) return;
      const screens = Math.abs(to - lenis.scroll) / viewportHeight;
      announceTravel(true);
      lenis.scrollTo(to, reduced.matches
        ? { immediate: true, force: true, onComplete: endTravel }
        : { duration: Math.min(1.8, 0.7 + screens * 0.06), easing: glide, force: true, onComplete: endTravel });
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
        travelTo(0);
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
        for (const sheet of sheets) {
          sheet.style.removeProperty("--hero-scroll-progress");
          sheet.removeAttribute("data-lifting");
        }
      };
    }

    const lenis = new Lenis({
      wrapper: scroller,
      content: pageContent.current,
      autoRaf: false,
      smoothWheel: true,
      syncTouch: true,
      lerp: SCROLL_LERP,
    });
    lenisRef.current = lenis;
    if (scrollLocks.size > 0) lenis.stop();
    const onLenisScroll = (instance: Lenis) => {
      syncHeroScroll(instance.scroll);
    };
    lenis.on("scroll", onLenisScroll);

    // A section that paced the scroll itself hands its speed back here.
    const carry = (event: Event) => {
      const velocity = (event as CustomEvent<{ velocity?: number }>).detail?.velocity;
      if (!velocity || scrollLocks.size > 0) return;
      const ahead = lenis.scroll + velocity / (60 * SCROLL_LERP);
      lenis.scrollTo(Math.max(0, Math.min(lenis.limit, ahead)));
    };
    window.addEventListener("portfolio:scroll-carry", carry);

    // Keys move the page through the same smoothing as the wheel, not in native jumps.
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || scrollLocks.size > 0) return;
      if (document.documentElement.dataset.overlayOpen === "true") return;
      const from = event.target instanceof HTMLElement ? event.target : null;
      if (from?.closest("input,textarea,select,[contenteditable],[data-lenis-prevent]")) return;
      const page = viewportHeight * 0.88;
      let step: number;
      if (event.key === " ") {
        if (from?.closest("button,a,summary,[role=button]")) return;
        step = event.shiftKey ? -page : page;
      } else if (event.shiftKey) return;
      else if (event.key === "PageDown") step = page;
      else if (event.key === "PageUp") step = -page;
      else if (event.key === "ArrowDown") step = 56;
      else if (event.key === "ArrowUp") step = -56;
      else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        travelTo(event.key === "Home" ? 0 : lenis.limit);
        return;
      } else return;
      event.preventDefault();
      endTravel();
      lenis.scrollTo(Math.max(0, Math.min(lenis.limit, lenis.targetScroll + step)));
    };
    window.addEventListener("keydown", onKey);
    scroller.addEventListener("wheel", endTravel, { passive: true });
    scroller.addEventListener("touchstart", endTravel, { passive: true });

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
      window.removeEventListener("portfolio:scroll-carry", carry);
      window.removeEventListener("keydown", onKey);
      scroller.removeEventListener("wheel", endTravel);
      scroller.removeEventListener("touchstart", endTravel);
      scrollLocks.clear();
      scroller.style.removeProperty("overflow-y");
      reduced.removeEventListener("change", update);
      resizeObserver.disconnect();
      lenis.off("scroll", onLenisScroll);
      lenis.destroy();
      lenisRef.current = null;
      stopRaf();
      delete document.documentElement.dataset.heroScrolling;
      for (const sheet of sheets) {
        sheet.style.removeProperty("--hero-scroll-progress");
        sheet.removeAttribute("data-lifting");
      }
    };
  }, []);

  return (
    <main ref={page} className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-white">
      <div ref={pageContent} className="min-h-full">
      <ProjectsExperience>
      <div ref={heroSurface} className={`${styles.heroSheet} relative flex min-h-0 flex-1 items-end justify-center overflow-hidden w-full`}>
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

      </div>
      </ProjectsExperience>
      </div>
    </main>
  );
}
