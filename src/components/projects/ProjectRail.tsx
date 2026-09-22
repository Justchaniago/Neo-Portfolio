"use client";

import { useEffect, useId, useRef } from "react";
import gsap from "gsap";
import styles from "./ProjectRail.module.css";

const PROJECTS = ["project 01", "project 02", "project 03", "project 04"];
const SLOTS = [-3, -2, -1, 0, 1, 2, 3];
const wrap = (value: number) => ((value % PROJECTS.length) + PROJECTS.length) % PROJECTS.length;
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function ProjectRail({ onChange }: { onChange?: (index: number) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const element = root.current!;
    const rows = Array.from(element.querySelectorAll<HTMLElement>("[data-rail-row]"));
    const labels = rows.map((row) => row.firstElementChild as HTMLElement);
    const marker = element.querySelector<HTMLElement>("[data-rail-marker]")!;
    const underline = element.querySelector<HTMLElement>("[data-rail-underline]")!;
    const mobile = matchMedia("(max-width: 767px)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let index = 0;
    let progress = 0;
    let ready = false;
    let moving = false;
    let amount = 0;
    let lastWheel = 0;
    let consumed = false;
    let touch: number | null = null;
    let animation: gsap.core.Timeline | undefined;

    const labelX = (offset: number, markerProgress: number) => {
      if (mobile.matches || offset !== 0) return "0em";
      return `${-1.12 * markerProgress}em`;
    };
    const setProgress = (nextProgress: number) => {
      progress = clamp(nextProgress);
      if (progress <= 0.001) {
        element.style.visibility = "hidden";
      } else {
        element.style.visibility = "visible";
      }

      const reveal = clamp((progress - 0.56) / 0.36);
      const markerProgress = clamp((progress - 0.92) / 0.08);
      rows.forEach((row, position) => {
        const offset = SLOTS[position];
        const rowReveal = clamp((reveal - position * 0.105) / 0.24);
        labels[position].style.clipPath = `inset(0 0 0 ${(1 - rowReveal) * 100}%)`;
        row.setAttribute("aria-hidden", String(rowReveal < 0.1));
        row.classList.toggle(styles.active, offset === 0);
        gsap.set(row, {
          xPercent: mobile.matches ? offset * 100 : 0,
          yPercent: mobile.matches ? 0 : offset * 100,
          opacity: rowReveal * Math.max(0.08, 1 - Math.abs(offset) * 0.42),
        });
        gsap.set(labels[position], {
          x: labelX(offset, markerProgress),
          scale: mobile.matches ? offset === 0 ? 1.12 : 0.72 : 1,
        });
      });
      gsap.set(marker, { autoAlpha: markerProgress, x: (1 - markerProgress) * 24 });
      gsap.set(underline, { scaleX: mobile.matches ? markerProgress : 0 });

      const railReady = progress >= 0.999;
      if (railReady !== ready) {
        ready = railReady;
        document.documentElement.dataset.projectRailReady = String(railReady);
      }
    };
    const renderLabels = () => {
      rows.forEach((row, position) => {
        const offset = SLOTS[position];
        labels[position].textContent = PROJECTS[wrap(index + offset)];
        row.setAttribute("aria-selected", String(offset === 0));
      });
      setProgress(progress);
    };
    const move = (direction: number) => {
      if (!ready || moving || !direction) return;
      const step = Math.sign(direction);
      moving = true;
      animation?.kill();
      animation = gsap.timeline({ onComplete: () => {
        index = wrap(index + step);
        renderLabels();
        onChange?.(index);
        moving = false;
        consumed = false;
        amount = 0;
      } });
      rows.forEach((row, position) => {
        const destination = SLOTS[position] - step;
        animation!.to(row, {
          xPercent: mobile.matches ? destination * 100 : 0,
          yPercent: mobile.matches ? 0 : destination * 100,
          opacity: Math.max(0.08, 1 - Math.abs(destination) * 0.42),
          duration: reduced.matches ? 0 : 0.64,
          ease: "power2.inOut",
        }, 0).to(labels[position], {
          x: labelX(destination, progress >= 0.999 ? 1 : 0),
          scale: mobile.matches ? destination === 0 ? 1.12 : 0.72 : 1,
          duration: reduced.matches ? 0 : 0.64,
          ease: "power2.inOut",
        }, 0);
      });
    };
    const wheel = (event: WheelEvent) => {
      if (!ready || moving || event.ctrlKey) return;
      if (!mobile.matches && Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      event.stopPropagation();
      const now = performance.now();
      if (now - lastWheel > 180) { amount = 0; consumed = false; }
      lastWheel = now;
      if (consumed) return;
      const axis = mobile.matches && Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const delta = axis * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      if (Math.sign(delta) !== Math.sign(amount)) amount = 0;
      amount += delta;
      if (Math.abs(amount) >= 40) { consumed = true; move(amount); }
    };
    const start = (event: TouchEvent) => {
      if (!ready) return;
      event.stopPropagation();
      touch = event.touches.length === 1 ? (mobile.matches ? event.touches[0].clientX : event.touches[0].clientY) : null;
    };
    const drag = (event: TouchEvent) => {
      if (!ready || touch === null || event.touches.length !== 1) return;
      event.preventDefault();
      event.stopPropagation();
      const position = mobile.matches ? event.touches[0].clientX : event.touches[0].clientY;
      const delta = touch - position;
      if (Math.abs(delta) > 36) { move(delta); touch = null; }
    };
    const end = () => { touch = null; };
    const key = (event: KeyboardEvent) => {
      const keys = mobile.matches ? ["ArrowRight", "ArrowLeft"] : ["ArrowDown", "ArrowUp"];
      if (!ready || !keys.includes(event.key)) return;
      event.preventDefault();
      move(event.key === keys[0] ? 1 : -1);
    };
    const click = (event: MouseEvent) => {
      if (!ready) return;
      const row = (event.target as HTMLElement).closest<HTMLElement>("[data-rail-row]");
      if (row) move(Number(row.dataset.railRow));
      element.focus({ preventScroll: true });
    };
    const syncProgress = () => setProgress(Number(document.documentElement.dataset.projectsProgress ?? 0));
    const layout = () => { animation?.kill(); moving = false; renderLabels(); };
    const observer = new MutationObserver(syncProgress);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-projects-progress"] });
    renderLabels();
    document.documentElement.dataset.projectRailReady = "false";
    syncProgress();
    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("touchstart", start, { passive: true });
    element.addEventListener("touchmove", drag, { passive: false });
    element.addEventListener("touchend", end);
    element.addEventListener("touchcancel", end);
    element.addEventListener("keydown", key);
    element.addEventListener("click", click);
    mobile.addEventListener("change", layout);
    return () => {
      animation?.kill();
      observer.disconnect();
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("touchstart", start);
      element.removeEventListener("touchmove", drag);
      element.removeEventListener("touchend", end);
      element.removeEventListener("touchcancel", end);
      element.removeEventListener("keydown", key);
      element.removeEventListener("click", click);
      mobile.removeEventListener("change", layout);
      delete document.documentElement.dataset.projectRailReady;
    };
  }, [onChange]);

  return (
    <div ref={root} className={styles.rail} aria-label="Choose project" role="listbox" tabIndex={0} data-project-rail>
      <span className={styles.marker} data-rail-marker aria-hidden="true">‹</span>
      <span className={styles.underline} data-rail-underline aria-hidden="true" />
      <div className={styles.viewport}>
        {SLOTS.map((offset) => (
          <div key={offset} id={id + "-" + offset} role="option" aria-selected={offset === 0} data-rail-row={offset} className={styles.row}>
            <span>{PROJECTS[wrap(offset)]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
