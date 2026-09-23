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
  const pageContent = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const scroller = page.current;
    const layer = portraitLayer.current;
    if (!scroller || !layer) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
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
    const update = () => {
      const distance = Math.max(0, Math.min(scroller.scrollTop, scroller.clientHeight));
      layer.style.setProperty("--portrait-offset", `${reduced.matches ? 0 : distance * 0.25}px`);
      document.documentElement.style.setProperty("--hero-scroll-progress", `${reduced.matches ? 0 : distance / Math.max(1, scroller.clientHeight)}`);
      const scrolling = String(scroller.scrollTop > 1);
      if (document.documentElement.dataset.heroScrolling !== scrolling) {
        document.documentElement.dataset.heroScrolling = scrolling;
      }
    };

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    reduced.addEventListener("change", update);
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(scroller);

    if (reduced.matches || !pageContent.current) {
      return () => {
        window.removeEventListener("portfolio:go-home", goHome);
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
    const onLenisScroll = (instance: Lenis) => {
      const distance = Math.max(0, Math.min(instance.scroll, scroller.clientHeight));
      layer.style.setProperty("--portrait-offset", `${distance * 0.25}px`);
      document.documentElement.style.setProperty("--hero-scroll-progress", `${distance / Math.max(1, scroller.clientHeight)}`);
      const scrolling = String(instance.scroll > 1);
      if (document.documentElement.dataset.heroScrolling !== scrolling) {
        document.documentElement.dataset.heroScrolling = scrolling;
      }
    };
    lenis.on("scroll", onLenisScroll);
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      window.removeEventListener("portfolio:go-home", goHome);
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
