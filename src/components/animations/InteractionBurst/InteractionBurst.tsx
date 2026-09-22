"use client";

import { useEffect, useRef } from "react";
import styles from "./InteractionBurst.module.css";

const RAY_COUNT = 10;
const RAY_LIFE_MS = 1480;
const PROJECTS_THRESHOLD = 0.7;

export function InteractionBurst() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pointerStart: { x: number; y: number; pointerId: number } | null = null;

    const emit = (x: number, y: number) => {
      if (reducedMotion.matches) return;

      const burst = document.createElement("span");
      burst.className = styles.burst;
      burst.style.left = `${x}px`;
      burst.style.top = `${y}px`;
      burst.setAttribute("aria-hidden", "true");

      for (let index = 0; index < RAY_COUNT; index += 1) {
        const ray = document.createElement("span");
        const angle = (360 / RAY_COUNT) * index + (index % 2 ? 2 : -2);
        const length = 48 + ((index * 19) % 34);
        ray.className = styles.ray;
        ray.style.setProperty("--angle", `${angle}deg`);
        ray.style.setProperty("--length", `${length}px`);
        ray.style.setProperty("--delay", `${index * 28}ms`);
        burst.append(ray);
      }

      container.append(burst);
      while (container.childElementCount > 8) container.firstElementChild?.remove();
      window.setTimeout(() => burst.remove(), RAY_LIFE_MS);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
      const projectProgress = Number(document.documentElement.dataset.projectsProgress ?? "0");
      if (projectProgress < PROJECTS_THRESHOLD) return;
      if (event.pointerType === "mouse") {
        emit(event.clientX, event.clientY);
        return;
      }
      pointerStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!pointerStart || event.pointerId !== pointerStart.pointerId) return;
      const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
      const point = pointerStart;
      pointerStart = null;
      if (distance <= 10) emit(point.x, point.y);
    };

    const handlePointerCancel = () => {
      pointerStart = null;
    };

    document.addEventListener("pointerdown", handlePointerDown, { capture: true, passive: true });
    document.addEventListener("pointerup", handlePointerUp, { capture: true, passive: true });
    document.addEventListener("pointercancel", handlePointerCancel, { capture: true, passive: true });
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointerup", handlePointerUp, true);
      document.removeEventListener("pointercancel", handlePointerCancel, true);
    };
  }, []);

  return <div ref={containerRef} className={styles.container} aria-hidden="true" />;
}
