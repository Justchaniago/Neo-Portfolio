"use client";

import { useEffect, useRef } from "react";
import styles from "./TaglineSection.module.css";
import footerStyles from "./FooterReveal.module.css";
import { createFooterWordmark } from "./footerWordmark";
import { AntigravityHalo } from "../animations/AntigravityHalo";
import { FooterContent } from "./FooterContent";

const tagline = "Have an idea? Let’s make it real.";

export function TaglineSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const footerShadowRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const title = titleRef.current;
    const footer = footerRef.current;
    const footerShadow = footerShadowRef.current;
    const wordmark = wordmarkRef.current;
    const scroller = section?.closest<HTMLElement>("main");
    if (!section || !stage || !title || !footer || !footerShadow || !wordmark || !scroller) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const wordmarkEffect = createFooterWordmark(wordmark, reduced);
    const glyphs = Array.from(title.querySelectorAll<HTMLElement>("[data-glyph]"));
    const wordmarkGlyphs = Array.from(wordmark.querySelectorAll<HTMLElement>("[data-footer-glyph]"));
    const fontMeasure = document.createElement("canvas").getContext("2d");
    let metrics: {
      element: HTMLElement;
      x: number;
      w: number;
      ox: number;
      oy: number;
      vx: number;
      vy: number;
      rot: number;
      vrot: number;
    }[] = [];
    let width = 1, height = 1, textWidth = 1, top = 0, travel = 1, disposed = false;
    let currentProgress = 0, targetProgress = 0, raf = 0, lastTime = 0;
    let titleHeight = 1, totalTravel = 1, footerStart = 1;
    let footerProgress = 0;
    let pointerX = -9999, pointerY = -9999, pointerVX = 0, pointerVY = 0, pointerActive = false;

    const syncFooterAccess = () => {
      const root = document.documentElement;
      const overlayOpen = Number(root.dataset.projectsProgress ?? 0) > 0.001
        || Number(root.dataset.staticProgress ?? 0) > 0.001;
      const active = !overlayOpen && (reduced.matches
        ? scroller.scrollTop >= top + height * 0.75
        : footerProgress > 0.015);
      if ((root.dataset.footerActive === "true") !== active) {
        if (active) root.dataset.footerActive = "true";
        else delete root.dataset.footerActive;
      }
      const interactive = !overlayOpen && (reduced.matches || footerProgress >= 0.85);
      if (footer.inert !== !interactive) footer.inert = !interactive;
      const hidden = String(!interactive);
      if (footer.getAttribute("aria-hidden") !== hidden) footer.setAttribute("aria-hidden", hidden);
    };

    const measure = () => {
      width = stage.clientWidth;
      height = stage.clientHeight;
      wordmark.style.removeProperty("font-size");
      const baseFontSize = Number.parseFloat(getComputedStyle(wordmark).fontSize);
      if (fontMeasure) {
        fontMeasure.font = `400 ${baseFontSize}px "DRUNKFONTS"`;
        // Include the actual ink overhang in each character's fitted width.
        // em padding scales with the final font size after the fit below.
        for (const glyph of wordmarkGlyphs) {
          const ink = fontMeasure.measureText(glyph.textContent ?? "");
          glyph.style.paddingInlineStart = `${Math.max(0, ink.actualBoundingBoxLeft) / baseFontSize}em`;
          glyph.style.paddingInlineEnd = `${Math.max(0, ink.actualBoundingBoxRight - ink.width) / baseFontSize}em`;
        }
      }
      const glyphWidth = wordmarkGlyphs.reduce((sum, glyph) => sum + glyph.getBoundingClientRect().width, 0);
      if (glyphWidth > 0) wordmark.style.fontSize = `${baseFontSize * Math.min(1, width * 0.94 * 0.985 / glyphWidth)}px`;
      footer.style.setProperty("--footer-wordmark-height", `${wordmark.offsetHeight}px`);
      const trackBounds = title.getBoundingClientRect();
      textWidth = Math.max(1, title.scrollWidth);
      titleHeight = title.offsetHeight;
      metrics = glyphs.map((element, index) => {
        const bounds = element.getBoundingClientRect();
        const prev = metrics[index];
        return {
          element,
          x: bounds.left - trackBounds.left,
          w: Math.max(12, bounds.width),
          ox: prev?.ox ?? 0,
          oy: prev?.oy ?? 0,
          vx: prev?.vx ?? 0,
          vy: prev?.vy ?? 0,
          rot: prev?.rot ?? 0,
          vrot: prev?.vrot ?? 0,
        };
      });
      top = section.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      // Preserve the original 500dvh section's 400dvh tagline journey.
      travel = Math.max(1, height * 4);
      totalTravel = Math.max(1, section.offsetHeight - height);
      // Start when only the final 22% of a viewport of text remains on-screen.
      footerStart = (width * 0.78 + textWidth - width * 0.22) / (width * 0.78 + textWidth + 32) * travel;
      targetProgress = reduced.matches ? 0.5 : readProgress();
      currentProgress = targetProgress;
      render(currentProgress);
    };

    const readProgress = () => Math.max(0, Math.min(totalTravel, scroller.scrollTop - top)) / travel;

    const render = (scrollProgress: number) => {
      footerProgress = Math.max(0, Math.min(1, (scrollProgress * travel - footerStart) / (height * 1.1)));
      const reveal = footerProgress * footerProgress * (3 - 2 * footerProgress);
      const remaining = 1 - reveal;
      const verticalInset = height * 0.035 * remaining;
      const horizontalInset = width * 0.03 * remaining;
      const radius = Math.min(48, Math.max(20, width * 0.035)) * remaining;
      const translation = `translate3d(0, ${(height + 2) * remaining}px, 0)`;
      footer.style.transform = translation;
      footer.style.clipPath = `inset(${verticalInset}px ${horizontalInset}px round ${radius}px)`;
      footer.style.willChange = footerProgress > 0 && footerProgress < 1 ? "transform, clip-path" : "auto";
      // Match the visible card contour outside its clip-path. Fade the shadow
      // at both endpoints so it never precedes the card or leaves a dark seam.
      const shadowIn = Math.min(1, footerProgress / 0.16);
      const shadowOut = Math.min(1, (1 - footerProgress) / 0.14);
      footerShadow.style.inset = `${verticalInset}px ${horizontalInset}px`;
      footerShadow.style.borderRadius = `${radius}px`;
      footerShadow.style.transform = translation;
      footerShadow.style.opacity = String(shadowIn * shadowIn * (3 - 2 * shadowIn)
        * shadowOut * shadowOut * (3 - 2 * shadowOut));
      footerShadow.style.willChange = footerProgress > 0 && footerProgress < 1 ? "transform, opacity" : "auto";
      footer.style.setProperty("--footer-content-progress", String(Math.max(0, Math.min(1, (footerProgress - 0.48) / 0.44))));
      syncFooterAccess();
      wordmarkEffect.update(footerProgress);
      scrollProgress = Math.min(1, scrollProgress);
      const start = width * 0.78;
      const exit = -textWidth - 32;
      const x = start + (exit - start) * scrollProgress;
      const amplitude = Math.min(108, Math.max(36, height * 0.11));
      const startY = height + 4;
      const endY = height * 0.2 - titleHeight / 2;
      const y = startY + (endY - startY) * scrollProgress;
      title.style.transform = `translate3d(${x}px, ${y}px, 0)`;

      const wave = scrollProgress * Math.PI * 2;
      const waveStrength = scrollProgress < 0 ? 0 : Math.min(1, scrollProgress / 0.08);
      const magnetRadius = Math.min(260, Math.max(150, width * 0.16));
      const canInteract = !reduced.matches && footerProgress < 0.72;
      for (const metric of metrics) {
        const along = metric.x / textWidth;
        const phaseAngle = along * Math.PI * 2 * 1.15 - wave;
        const bend = reduced.matches ? 0 : Math.sin(phaseAngle) * amplitude * waveStrength;
        const tilt = reduced.matches ? 0 : Math.cos(phaseAngle) * 3.2 * waveStrength;

        if (canInteract && pointerActive) {
          const gx = x + metric.x + metric.w * 0.5 + metric.ox;
          const gy = y + titleHeight * 0.52 + bend + metric.oy;
          const dx = gx - pointerX;
          const dy = gy - pointerY;
          const dist = Math.hypot(dx, dy);
          if (dist < magnetRadius && dist > 0.01) {
            const proximity = 1 - dist / magnetRadius;
            const force = proximity * proximity;
            metric.vx += ((dx / dist) * force * 3.4 + pointerVX * force * 0.22);
            metric.vy += ((dy / dist) * force * 4.2 + pointerVY * force * 0.28);
            metric.vrot += ((dx / magnetRadius) * force * 1.35 + (pointerVX * 0.04) * force);
          }
        }

        // Elastic harmonic spring back to rest
        metric.vx = (metric.vx - metric.ox * 0.14) * 0.84;
        metric.vy = (metric.vy - metric.oy * 0.14) * 0.84;
        metric.vrot = (metric.vrot - metric.rot * 0.16) * 0.82;
        metric.ox = Math.max(-72, Math.min(72, metric.ox + metric.vx));
        metric.oy = Math.max(-96, Math.min(96, metric.oy + metric.vy));
        metric.rot = Math.max(-18, Math.min(18, metric.rot + metric.vrot));

        if (reduced.matches) {
          metric.ox = metric.oy = metric.vx = metric.vy = metric.rot = metric.vrot = 0;
        }

        const totalX = metric.ox;
        const totalY = bend + metric.oy;
        const totalRot = tilt + metric.rot;
        const stretch = 1 + Math.min(0.14, Math.hypot(metric.ox, metric.oy) / 420);
        metric.element.style.transform = `translate3d(${totalX.toFixed(2)}px, ${totalY.toFixed(2)}px, 0) rotate(${totalRot.toFixed(2)}deg) scaleY(${stretch.toFixed(3)})`;
      }
      pointerVX *= 0.82;
      pointerVY *= 0.82;
    };

    const hasGlyphMotion = () =>
      metrics.some(
        (m) =>
          Math.abs(m.ox) > 0.08 ||
          Math.abs(m.oy) > 0.08 ||
          Math.abs(m.vx) > 0.04 ||
          Math.abs(m.vy) > 0.04 ||
          Math.abs(m.rot) > 0.05
      );

    const tick = (time: number) => {
      raf = 0;
      if (disposed) return;
      const dt = Math.min(50, time - (lastTime || time - 16));
      lastTime = time;
      currentProgress += (targetProgress - currentProgress) * (1 - Math.exp(-dt / 90));
      if (Math.abs(targetProgress - currentProgress) < 0.0001) currentProgress = targetProgress;
      render(currentProgress);
      if ((currentProgress !== targetProgress || hasGlyphMotion()) && !reduced.matches) {
        raf = requestAnimationFrame(tick);
      }
    };

    const wake = () => {
      if (!raf && !disposed && !reduced.matches) {
        lastTime = 0;
        raf = requestAnimationFrame(tick);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (reduced.matches || footerProgress >= 0.72) return;
      const rect = stage.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      if (pointerActive) {
        pointerVX = Math.max(-36, Math.min(36, nx - pointerX));
        pointerVY = Math.max(-36, Math.min(36, ny - pointerY));
      }
      pointerX = nx;
      pointerY = ny;
      pointerActive = true;
      wake();
    };

    const onPointerLeave = () => {
      pointerActive = false;
      pointerVX = 0;
      pointerVY = 0;
      wake();
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
    const overlays = new MutationObserver(syncFooterAccess);
    overlays.observe(document.documentElement, {
      attributes: true, attributeFilter: ["data-projects-progress", "data-static-progress"],
    });
    scroller.addEventListener("scroll", update, { passive: true });
    stage.addEventListener("pointermove", onPointerMove, { passive: true });
    stage.addEventListener("pointerdown", onPointerMove, { passive: true });
    stage.addEventListener("pointerleave", onPointerLeave, { passive: true });
    reduced.addEventListener("change", measure);
    document.fonts.ready.then(() => { if (!disposed) measure(); });
    measure();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      overlays.disconnect();
      scroller.removeEventListener("scroll", update);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerdown", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
      reduced.removeEventListener("change", measure);
      wordmarkEffect.dispose();
      delete document.documentElement.dataset.footerActive;
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
        <div ref={footerShadowRef} className={footerStyles.cardShadow} aria-hidden="true" />
        <div ref={footerRef} className={footerStyles.panel} role="contentinfo" aria-label="Footer" aria-hidden="true" inert>
          <AntigravityHalo pointerScope="local" />
          <FooterContent />
          <span ref={wordmarkRef} className={footerStyles.wordmark} aria-hidden="true">
            {Array.from("CHANIAGO", (character, index) => (
              <span key={`${character}-${index}`} className={footerStyles.glyphMask}>
                <span data-footer-glyph className={footerStyles.glyph}>{character}</span>
              </span>
            ))}
          </span>
        </div>
      </div>
    </section>
  );
}
