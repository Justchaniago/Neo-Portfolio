"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { AntigravityHalo } from "@/components/animations/AntigravityHalo";
import { HeroPortrait } from "@/components/hero/HeroPortrait";
import { ProjectsExperience } from "@/components/projects/ProjectsExperience";
import styles from "./Home.module.css";

export default function Home() {
  const page = useRef<HTMLElement>(null);
  const portraitLayer = useRef<HTMLDivElement>(null);
  const engineerTrack = useRef<HTMLSpanElement>(null);
  const engineerLoop = useRef<HTMLSpanElement>(null);
  const developerTrack = useRef<HTMLSpanElement>(null);
  const developerLoop = useRef<HTMLSpanElement>(null);
  const pageContent = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const scroller = page.current;
    const layer = portraitLayer.current;
    const taglineTracks = [engineerTrack.current, developerTrack.current];
    const taglineLoops = [engineerLoop.current, developerLoop.current];
    const taglineWidths = taglineLoops.map(loop => loop?.getBoundingClientRect().width ?? 0);
    const mobileViewport = window.matchMedia("(max-width: 767px)");
    if (!scroller || !layer) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scrollLocks = new Set<string>();
    let previousOverflowY = scroller.style.overflowY;
    const setScrollLock = (event: Event) => {
      const detail = (event as CustomEvent<{ source?: string; locked?: boolean }>).detail;
      const source = detail?.source;
      if (!source) return;

      if (detail.locked) {
        if (scrollLocks.size === 0) previousOverflowY = scroller.style.overflowY;
        scrollLocks.add(source);
      } else {
        scrollLocks.delete(source);
      }

      const locked = scrollLocks.size > 0;
      scroller.style.overflowY = locked ? "hidden" : previousOverflowY;
      if (locked) lenisRef.current?.stop();
      else lenisRef.current?.start();
    };
    const goHome = () => {
      if (lenisRef.current) {
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
      const distance = Math.max(0, Math.min(scroller.scrollTop, scroller.clientHeight));
      const progress = distance / Math.max(1, scroller.clientHeight);
      layer.style.setProperty("--portrait-offset", `${reduced.matches ? 0 : distance * 0.25}px`);
      document.documentElement.style.setProperty("--hero-scroll-progress", `${reduced.matches ? 0 : progress}`);
      const scrolling = String(scroller.scrollTop > 1);
      if (document.documentElement.dataset.heroScrolling !== scrolling) {
        document.documentElement.dataset.heroScrolling = scrolling;
      }
    };

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    reduced.addEventListener("change", update);
    const resizeObserver = new ResizeObserver(() => {
      taglineLoops.forEach((loop, index) => {
        const nextWidth = loop?.getBoundingClientRect().width ?? 0;
        const previousWidth = taglineWidths[index];
        if (previousWidth > 0 && nextWidth > 0 && Math.abs(nextWidth - previousWidth) > 0.5) {
          marqueeOffsets[index] = marqueeOffsets[index] / previousWidth * nextWidth;
        }
        taglineWidths[index] = nextWidth;
      });
      update();
    });
    resizeObserver.observe(scroller);
    taglineLoops.forEach(loop => { if (loop) resizeObserver.observe(loop); });

    if (reduced.matches || !pageContent.current) {
      return () => {
        window.removeEventListener("portfolio:go-home", goHome);
        window.removeEventListener("portfolio:scroll-lock", setScrollLock);
        scrollLocks.clear();
        scroller.style.overflowY = previousOverflowY;
        scroller.removeEventListener("scroll", update);
        reduced.removeEventListener("change", update);
        resizeObserver.disconnect();
        delete document.documentElement.dataset.heroScrolling;
        document.documentElement.style.removeProperty("--hero-scroll-progress");
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
      const distance = Math.max(0, Math.min(instance.scroll, scroller.clientHeight));
      const progress = distance / Math.max(1, scroller.clientHeight);
      layer.style.setProperty("--portrait-offset", `${distance * 0.25}px`);
      document.documentElement.style.setProperty("--hero-scroll-progress", `${progress}`);
      const scrolling = String(instance.scroll > 1);
      if (document.documentElement.dataset.heroScrolling !== scrolling) {
        document.documentElement.dataset.heroScrolling = scrolling;
      }
    };
    lenis.on("scroll", onLenisScroll);
    let frame = 0;
    let previousTime = 0;
    let previousScroll = lenis.scroll;
    const marqueeOffsets = [0, 0];
    const raf = (time: number) => {
      lenis.raf(time);
      const currentScroll = lenis.scroll;
      const scrollDelta = currentScroll - previousScroll;
      previousScroll = currentScroll;
      if (!reduced.matches && mobileViewport.matches) {
        const elapsed = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
        const movement = Math.abs(scrollDelta) > 0.001 ? scrollDelta * 1.8 : elapsed * 13;
        taglineTracks.forEach((track, index) => {
          const width = taglineWidths[index];
          if (!track || width <= 0) return;
          marqueeOffsets[index] = ((marqueeOffsets[index] + movement) % width + width) % width;
          const direction = index === 0 ? -1 : 1;
          track.style.transform = `translate3d(${-width + direction * marqueeOffsets[index]}px, 0, 0)`;
        });
      }
      previousTime = time;
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      window.removeEventListener("portfolio:go-home", goHome);
      window.removeEventListener("portfolio:scroll-lock", setScrollLock);
      scrollLocks.clear();
      scroller.style.overflowY = previousOverflowY;
      scroller.removeEventListener("scroll", update);
      reduced.removeEventListener("change", update);
      resizeObserver.disconnect();
      lenis.off("scroll", onLenisScroll);
      lenis.destroy();
      lenisRef.current = null;
      cancelAnimationFrame(frame);
      delete document.documentElement.dataset.heroScrolling;
      document.documentElement.style.removeProperty("--hero-scroll-progress");
    };
  }, []);

  return (
    <main ref={page} className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-white">
      <div ref={pageContent} className="min-h-full">
      <ProjectsExperience>
      <div className="relative flex min-h-0 flex-1 items-end justify-center overflow-hidden w-full">
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <AntigravityHalo />
        </div>

        <div ref={portraitLayer} className={`${styles.portraitParallax} relative z-10 h-full w-full`}>
          <div className={`${styles.heroImage} relative h-full w-full`}>
            <HeroPortrait />
          </div>
        </div>

        <span className="sr-only">Software Engineer. Web Developer.</span>
        <div className={styles.mobileTaglines} aria-hidden="true">
          <div className={`${styles.marqueeRow} ${styles.engineerRow}`}>
            <span ref={engineerTrack} className={styles.marqueeTrack}>
              <span className={styles.marqueeGroup}>— SOFTWARE ENGINEER —</span>
              <span ref={engineerLoop} className={styles.marqueeGroup}>— SOFTWARE ENGINEER —</span>
              <span className={styles.marqueeGroup}>— SOFTWARE ENGINEER —</span>
              <span className={styles.marqueeGroup}>— SOFTWARE ENGINEER —</span>
            </span>
          </div>
          <div className={`${styles.marqueeRow} ${styles.developerRow}`}>
            <span ref={developerTrack} className={styles.marqueeTrack}>
              <span className={styles.marqueeGroup}>— WEB DEVELOPER —</span>
              <span ref={developerLoop} className={styles.marqueeGroup}>— WEB DEVELOPER —</span>
              <span className={styles.marqueeGroup}>— WEB DEVELOPER —</span>
              <span className={styles.marqueeGroup}>— WEB DEVELOPER —</span>
            </span>
          </div>
        </div>

        <div className={styles.heroCopy} aria-label="Freelance Software Engineer">
          <span className={styles.heroArrow} aria-hidden="true">↘</span>
          <p>Freelance</p>
          <p>Software Engineer</p>
        </div>
      </div>
      </ProjectsExperience>
      </div>
    </main>
  );
}
