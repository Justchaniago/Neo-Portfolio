"use client";

import { useEffect, useRef } from "react";
import styles from "./TaglineSection.module.css";

const tagline = "Have an idea? Let’s make it real.";

export function TaglineSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const title = titleRef.current;
    const scroller = section?.closest<HTMLElement>("main");
    if (!section || !stage || !title || !scroller) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const glyphs = Array.from(title.querySelectorAll<HTMLElement>("[data-glyph]"));
    let metrics: { element: HTMLElement; x: number }[] = [];
    let width = 1, height = 1, textWidth = 1, top = 0, travel = 1, disposed = false;
    let currentProgress = 0, targetProgress = 0, raf = 0, lastTime = 0;

    const measure = () => {
      width = stage.clientWidth;
      height = stage.clientHeight;
      const trackBounds = title.getBoundingClientRect();
      textWidth = Math.max(1, title.scrollWidth);
      metrics = glyphs.map(element => {
        const bounds = element.getBoundingClientRect();
        return { element, x: bounds.left - trackBounds.left };
      });
      top = section.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      travel = Math.max(1, section.offsetHeight - stage.offsetHeight);
      targetProgress = reduced.matches ? 0.5 : readProgress();
      currentProgress = targetProgress;
      render(currentProgress);
    };

    const readProgress = () => Math.max(0, Math.min(1, (scroller.scrollTop - top) / travel));

    const render = (scrollProgress: number) => {
      const start = width * 0.78;
      const exit = -textWidth - 32;
      const x = start + (exit - start) * scrollProgress;
      const titleHeight = title.offsetHeight;
      const amplitude = Math.min(108, Math.max(36, height * 0.11));
      const startY = height + 4;
      const endY = height * 0.2 - titleHeight / 2;
      const y = startY + (endY - startY) * scrollProgress;
      title.style.transform = `translate3d(${x}px, ${y}px, 0)`;

      const wave = scrollProgress * Math.PI * 2;
      const waveStrength = scrollProgress < 0 ? 0 : Math.min(1, scrollProgress / 0.08);
      for (const metric of metrics) {
        const along = metric.x / textWidth;
        const bend = reduced.matches ? 0 : Math.sin(along * Math.PI * 2 * 1.15 - wave) * amplitude * waveStrength;
        metric.element.style.transform = `translate3d(0, ${bend.toFixed(2)}px, 0)`;
      }
    };

    const tick = (time: number) => {
      raf = 0;
      if (disposed) return;
      const dt = Math.min(50, time - (lastTime || time - 16));
      lastTime = time;
      currentProgress += (targetProgress - currentProgress) * (1 - Math.exp(-dt / 90));
      if (Math.abs(targetProgress - currentProgress) < 0.0001) currentProgress = targetProgress;
      render(currentProgress);
      if (currentProgress !== targetProgress && !reduced.matches) raf = requestAnimationFrame(tick);
    };

    const update = () => {
      targetProgress = reduced.matches ? 0.5 : readProgress();
      if (reduced.matches) {
        cancelAnimationFrame(raf);
        raf = 0;
        currentProgress = targetProgress;
        render(currentProgress);
      } else if (!raf) {
        lastTime = 0;
        raf = requestAnimationFrame(tick);
      }
    };

    const resize = new ResizeObserver(measure);
    resize.observe(section);
    resize.observe(stage);
    resize.observe(title);
    scroller.addEventListener("scroll", update, { passive: true });
    reduced.addEventListener("change", measure);
    document.fonts.ready.then(() => { if (!disposed) measure(); });
    measure();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      scroller.removeEventListener("scroll", update);
      reduced.removeEventListener("change", measure);
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.section} aria-label="Build something together">
      <div ref={stageRef} className={styles.stage}>
        <h2 ref={titleRef} className={styles.title} aria-label={tagline}>
          <span className={styles.line} aria-hidden="true">
            {Array.from(tagline, (character, index) => (
              <span key={index} data-glyph>{character === " " ? "\u00a0" : character}</span>
            ))}
          </span>
        </h2>
      </div>
    </section>
  );
}
