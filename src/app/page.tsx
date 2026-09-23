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

  useEffect(() => {
    const scroller = page.current;
    const layer = portraitLayer.current;
    if (!scroller || !layer) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const distance = Math.max(0, Math.min(scroller.scrollTop, scroller.clientHeight));
      layer.style.setProperty("--portrait-offset", `${reduced.matches ? 0 : distance * 0.25}px`);
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
        scroller.removeEventListener("scroll", update);
        reduced.removeEventListener("change", update);
        resizeObserver.disconnect();
        delete document.documentElement.dataset.heroScrolling;
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
    const onLenisScroll = (instance: Lenis) => {
      const distance = Math.max(0, Math.min(instance.scroll, scroller.clientHeight));
      layer.style.setProperty("--portrait-offset", `${distance * 0.25}px`);
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
      scroller.removeEventListener("scroll", update);
      reduced.removeEventListener("change", update);
      resizeObserver.disconnect();
      lenis.off("scroll", onLenisScroll);
      lenis.destroy();
      cancelAnimationFrame(frame);
      delete document.documentElement.dataset.heroScrolling;
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
      </div>
      </ProjectsExperience>
      </div>
    </main>
  );
}
