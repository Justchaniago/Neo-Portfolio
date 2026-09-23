"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./NarrativeSection.module.css";

const lines = [
  "I build software, AI systems, automation,",
  "and all the invisible things that make them work.",
  "But the interesting part is how they work together.",
];

const drift = [
  [-110, -160, -18], [140, -90, 16], [-80, 150, -12], [180, 170, 22], [-160, 60, -15],
  [90, -170, 14], [-210, -60, -24], [150, 130, 12], [-120, 220, -19], [220, -130, 25],
  [-150, 90, -14], [130, -210, 18], [-190, 160, -22], [170, 50, 16], [-90, -150, -16],
  [140, 190, 13], [-180, -110, -25], [210, 120, 22], [-130, 180, -17], [90, -140, 15],
  [-200, 40, -20], [160, -190, 19], [-100, 130, -13], [200, -50, 24], [-160, 200, -18],
  [120, 70, 11], [-220, -150, -26], [150, 170, 17], [-80, -210, -14], [190, 90, 21],
];

function wordsForLine(line: string, lineIndex: number) {
  return line.split(" ").map((word, index) => {
    const driftIndex = lineIndex * 10 + index;
    const [x, y, rotation] = drift[driftIndex % drift.length];
    return { word, x, y, rotation };
  });
}

export function NarrativeSection() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const targetProgress = useRef(0);
  const renderedProgress = useRef(0);
  const mousePos = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const element = section.current;
    const visual = stage.current;
    const scroller = element?.closest<HTMLElement>("main");
    if (!element || !visual || !scroller) return;

    let frame = 0;
    let raf = 0;

    // Track dynamic mouse offset per word element with spring physics
    const wordElements = visual.querySelectorAll<HTMLElement>("[data-narrative-word]");
    const wordPhysics = Array.from(wordElements).map((el) => {
      const dx = parseFloat(el.dataset.driftX || "0");
      const dy = parseFloat(el.dataset.driftY || "0");
      const drot = parseFloat(el.dataset.driftRot || "0");
      return {
        el,
        driftX: dx,
        driftY: dy,
        driftRot: drot,
        hoverOffsetX: 0,
        hoverOffsetY: 0,
        vx: 0,
        vy: 0,
      };
    });

    const lastMousePos = { x: -9999, y: -9999 };
    const mouseVel = { x: 0, y: 0 };

    const onPointerMove = (e: MouseEvent) => {
      if (lastMousePos.x > -1000) {
        mouseVel.x = e.clientX - lastMousePos.x;
        mouseVel.y = e.clientY - lastMousePos.y;
      }
      lastMousePos.x = e.clientX;
      lastMousePos.y = e.clientY;
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerLeave = () => {
      mousePos.current = { x: -9999, y: -9999 };
      lastMousePos.x = -9999;
      lastMousePos.y = -9999;
      mouseVel.x = 0;
      mouseVel.y = 0;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });

    const render = () => {
      const delta = targetProgress.current - renderedProgress.current;
      renderedProgress.current += delta * 0.16;
      if (Math.abs(delta) < 0.0005) renderedProgress.current = targetProgress.current;

      const p = renderedProgress.current;
      visual.style.setProperty("--story-progress", p.toFixed(4));
      // Give more scroll travel for window so the small arch is clearly enjoyed before expanding
      visual.style.setProperty(
        "--window-progress",
        Math.max(0, Math.min(1, (p - 0.62) / 0.38)).toFixed(4),
      );

      // Scatter starts after reading (progress > 0.22)
      const rawScatter = Math.max(0, (p - 0.22) / 0.78);
      const scatterFactor = Math.pow(rawScatter, 1.35) * 3.5;

      const mx = mousePos.current.x;
      const my = mousePos.current.y;
      const isPointerActive = mx > -1000;
      const mSpeed = Math.hypot(mouseVel.x, mouseVel.y);

      // Update each word's free-floating displacement (no spring pulling them back!)
      for (let i = 0; i < wordPhysics.length; i++) {
        const item = wordPhysics[i];
        
        if (isPointerActive && rawScatter > 0.04) {
          const rect = item.el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const distDx = cx - mx;
          const distDy = cy - my;
          const dist = Math.hypot(distDx, distDy);
          const radius = 160;

          if (dist < radius && dist > 0.1) {
            const proximity = 1 - dist / radius;
            const nx = distDx / dist;
            const ny = distDy / dist;

            // Repel impulse pushing word away
            const repel = proximity * proximity * 9.0;
            item.vx += nx * repel;
            item.vy += ny * repel;

            // Transfer mouse movement momentum directly
            if (mSpeed > 0.5) {
              const pushFactor = proximity * 0.45;
              item.vx += mouseVel.x * pushFactor;
              item.vy += mouseVel.y * pushFactor;
            }
          }
        }

        // Apply natural momentum deceleration (friction), but NO spring pulling back
        item.vx *= 0.92;
        item.vy *= 0.92;

        // Position accumulates permanently as it floats
        item.hoverOffsetX += item.vx;
        item.hoverOffsetY += item.vy;

        // Bound max excursion gracefully so words don't fly off to infinity
        item.hoverOffsetX = Math.max(-500, Math.min(500, item.hoverOffsetX));
        item.hoverOffsetY = Math.max(-400, Math.min(400, item.hoverOffsetY));

        // When scrolling backwards (rawScatter -> 0), words are smoothly drawn back into alignment
        const recallFactor = Math.min(1, Math.pow(rawScatter, 1.2) * 1.6);
        const effectiveHoverX = item.hoverOffsetX * recallFactor;
        const effectiveHoverY = item.hoverOffsetY * recallFactor;

        // If user scrolls all the way back to unscrambled state, reset floating memory cleanly
        if (rawScatter <= 0.001) {
          item.hoverOffsetX = 0;
          item.hoverOffsetY = 0;
          item.vx = 0;
          item.vy = 0;
        }

        const totalX = item.driftX * scatterFactor + effectiveHoverX;
        const totalY = item.driftY * scatterFactor + effectiveHoverY;
        const totalRot = item.driftRot * scatterFactor + (effectiveHoverX * 0.04);

        item.el.style.transform = `translate3d(${totalX.toFixed(2)}px, ${totalY.toFixed(2)}px, 0) rotate(${totalRot.toFixed(2)}deg)`;
      }

      // Decay mouse velocity gradually between pointer events
      mouseVel.x *= 0.85;
      mouseVel.y *= 0.85;

      raf = requestAnimationFrame(render);
    };

    const measure = () => {
      const sectionTop = element.offsetTop;
      const sectionTravel = Math.max(1, element.offsetHeight - scroller.clientHeight);
      targetProgress.current = Math.max(0, Math.min(1, (scroller.scrollTop - sectionTop) / sectionTravel));
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    const resize = new ResizeObserver(measure);
    resize.observe(element);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    measure();
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(raf);
      resize.disconnect();
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <section ref={section} className={styles.section} aria-label="A little about the work">
      <div ref={stage} className={styles.stage}>
        <div ref={copyRef} className={styles.copy}>
          {lines.map((line, lineIndex) => (
            <p key={line} className={styles.line}>
              {wordsForLine(line, lineIndex).map(({ word, x, y, rotation }) => (
                <span
                  key={`${line}-${word}`}
                  data-narrative-word="true"
                  data-drift-x={x}
                  data-drift-y={y}
                  data-drift-rot={rotation}
                  className={styles.word}
                >
                  {word}
                </span>
              ))}
            </p>
          ))}
        </div>
        <div className={styles.window} aria-hidden="true" />
      </div>
    </section>
  );
}
