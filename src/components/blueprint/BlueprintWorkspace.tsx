"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { getPerformanceProfile } from "@/lib/performanceTier";
import type { BlueprintSceneHandle } from "./blueprintScene";
import styles from "./BlueprintWorkspace.module.css";

const clamp = (p: number) => Math.min(1, Math.max(0, p));

export function BlueprintWorkspace({ posterSrc }: { posterSrc: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const dimensionRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = sectionRef.current, stage = stageRef.current, surface = surfaceRef.current;
    const notes = notesRef.current, dimension = dimensionRef.current;
    const main = section?.closest("main");
    if (!section || !stage || !surface || !notes || !dimension || !main) return;

    const labs = main.querySelector<HTMLElement>('[data-home-chapter="LABS"]');
    const still = matchMedia("(prefers-reduced-motion: reduce), (forced-colors: active)");
    let scene: BlueprintSceneHandle | null = null;
    let frame = 0, top = 0, length = 1, view = 1, maxPull = 0;
    let visible = false, loading = false, failed = false, disposed = false;

    const clearLift = () => labs?.style.removeProperty("--blueprint-lift");
    const release = () => {
      delete stage.dataset.live;
      scene?.dispose();
      scene = null;
      surface.replaceChildren();
    };
    const fallback = () => {
      failed = true;
      release();
    };
    const paint = () => {
      frame = 0;
      if (!visible || document.hidden || still.matches) return;
      const y = main.scrollTop - top;
      const entry = clamp(-y / view);
      const cover = clamp((y + view - length) / view);
      stage.style.transform = `translate3d(0,${((entry - cover) * view * 0.23).toFixed(2)}px,0)`;
      // The right tip leads into view; the left catches up before Labs fills the screen.
      const settle = clamp((cover - 0.56) / (0.92 - 0.56));
      const rise = maxPull * (1 - settle * settle * (3 - 2 * settle));
      if (rise > 0) labs?.style.setProperty("--blueprint-lift", `${rise.toFixed(2)}px`);
      else clearLift();

      // Start pulling back as Hero clears. The final dimensions arrive as Labs enters.
      const progress = Math.min(0.85, clamp((y + view * 0.2) / Math.max(1, length - view * 0.5)));
      if (!scene) {
        stage.style.setProperty("--poster-scale", String(1.4 - 0.4 * progress / 0.85));
        return;
      }
      scene.setProgress(progress);
      // Clear the drawing labels before their top edge passes behind the fixed nav.
      notes.style.opacity = String(clamp((progress - 0.55) / 0.3) * (1 - clamp(cover * 4)));
      const anchor = scene.getDimAnchor();
      dimension.style.transform = `translate(${anchor.x}px,${anchor.y}px) translate(-50%,-130%)`;
    };
    const schedule = () => {
      if (!frame && visible && !document.hidden && !still.matches) frame = requestAnimationFrame(paint);
    };
    const measure = () => {
      view = main.clientHeight;
      maxPull = Math.min(main.clientWidth * 0.22, view * 0.2);
      length = section.offsetHeight;
      top = section.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop;
      scene?.resize(stage.clientWidth, stage.clientHeight);
      schedule();
    };
    const activate = async () => {
      schedule();
      if (!visible || loading || scene || failed || still.matches || document.hidden ||
        document.documentElement.dataset.splashComplete !== "true") return;
      loading = true;
      try {
        const { createBlueprintScene } = await import("./blueprintScene");
        if (disposed || still.matches || !visible || document.hidden) return;
        const canvas = document.createElement("canvas");
        surface.append(canvas);
        scene = createBlueprintScene(canvas, {
          dpr: Math.min(window.devicePixelRatio, getPerformanceProfile().maxWebglDpr),
          onContextLost: fallback,
        });
        measure();
        stage.dataset.live = "";
      } catch {
        if (!disposed) fallback();
      } finally {
        loading = false;
      }
    };
    const motionChanged = () => {
      if (still.matches) {
        clearLift();
        release();
        stage.style.removeProperty("transform");
        stage.style.removeProperty("--poster-scale");
      }
      measure();
      void activate();
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) clearLift();
      void activate();
    }, { root: main });
    intersection.observe(section);
    const resize = new ResizeObserver(measure);
    resize.observe(stage);
    resize.observe(section);
    const splash = new MutationObserver(() => {
      if (document.documentElement.dataset.splashComplete === "true") {
        splash.disconnect();
        void activate();
      }
    });
    if (document.documentElement.dataset.splashComplete !== "true") {
      splash.observe(document.documentElement, { attributes: true, attributeFilter: ["data-splash-complete"] });
    }
    main.addEventListener("scroll", schedule, { passive: true });
    still.addEventListener("change", motionChanged);
    document.addEventListener("visibilitychange", activate);
    measure();
    return () => {
      disposed = true;
      intersection.disconnect();
      resize.disconnect();
      splash.disconnect();
      main.removeEventListener("scroll", schedule);
      still.removeEventListener("change", motionChanged);
      document.removeEventListener("visibilitychange", activate);
      cancelAnimationFrame(frame);
      clearLift();
      release();
    };
  }, []);

  return (
    <section id="workspace-blueprint" ref={sectionRef} className={styles.section}
      data-home-chapter="BLUEPRINT" aria-label="Blueprint of Chaniago's workspace">
      <div className={styles.track} aria-hidden="true">
        <div className={styles.stage} ref={stageRef}>
          <Image className={styles.poster} src={posterSrc} alt="" fill sizes="100vw" />
          <div className={styles.surface} ref={surfaceRef} />
          <div className={styles.vignette} />
          <div className={styles.notes} ref={notesRef}>
            <div className={styles.coords}><span>X 242.00</span><span>Y 536.00</span></div>
            <div className={styles.stamp}>
              <span>WORKSPACE &mdash; SHEET 01</span><span>SCALE 1:8</span><span>CHANIAGO, SURABAYA</span>
            </div>
            <span className={styles.dimension} ref={dimensionRef}>312.6</span>
          </div>
        </div>
      </div>
    </section>
  );
}
