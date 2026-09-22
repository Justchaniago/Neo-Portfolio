"use client";

import { useEffect, useId, useRef } from "react";
import gsap from "gsap";
import styles from "./ProjectRail.module.css";

const PROJECTS = ["project 01", "project 02", "project 03", "project 04"];
const SLOTS = [-3, -2, -1, 0, 1, 2, 3];
const wrap = (value: number) => ((value % PROJECTS.length) + PROJECTS.length) % PROJECTS.length;

export function ProjectRail({ onChange }: { onChange?: (index: number) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const element = root.current!;
    const rows = Array.from(element.querySelectorAll<HTMLElement>("[data-rail-row]"));
    const labels = rows.map(row => row.firstElementChild as HTMLElement);
    const marker = element.querySelector<HTMLElement>("[data-rail-marker]")!;
    const underline = element.querySelector<HTMLElement>("[data-rail-underline]")!;
    const mobile = matchMedia("(max-width: 767px)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let index = 0;
    let ready = false;
    let moving = false;
    let shown = false;
    let amount = 0;
    let lastWheel = 0;
    let consumed = false;
    let touch: number | null = null;
    let animation: gsap.core.Timeline | undefined;
    const labelX = (offset: number) => !mobile.matches && offset === 0 ? "-1.12em" : "0em";
    const pose = (offset: number) => ({
      xPercent: mobile.matches ? offset * 100 : 0,
      yPercent: mobile.matches ? 0 : offset * 100,
      opacity: Math.max(0.08, 1 - Math.abs(offset) * 0.42),
    });
    const revealUnderline = () => {
      if (mobile.matches && shown) gsap.fromTo(underline, { scaleX: 0 }, {
        scaleX: 1, duration: reduced.matches ? 0 : 0.38, ease: "power3.out", overwrite: true,
      });
    };

    const render = () => {
      rows.forEach((row, position) => {
        const offset = SLOTS[position];
        labels[position].textContent = PROJECTS[wrap(index + offset)];
        row.setAttribute("aria-selected", String(offset === 0));
        row.setAttribute("aria-hidden", String(Math.abs(offset) > 1));
        row.classList.toggle(styles.active, offset === 0);
        gsap.set(row, pose(offset));
        gsap.set(labels[position], { x: labelX(offset), scale: mobile.matches ? offset === 0 ? 1.12 : 0.72 : 1 });
      });
    };
    const move = (direction: number) => {
      if (!ready || moving || !direction) return;
      const step = Math.sign(direction);
      moving = true;
      gsap.killTweensOf(underline);
      gsap.set(underline, { scaleX: 0 });
      animation = gsap.timeline({ onComplete: () => {
        index = wrap(index + step);
        render();
        onChange?.(index);
        moving = false;
        consumed = false;
        amount = 0;
        revealUnderline();
      } });
      rows.forEach((row, position) => {
        const destination = SLOTS[position] - step;
        animation!.to(row, {
          ...pose(destination),
          duration: reduced.matches ? 0 : 0.64, ease: "power2.inOut",
        }, 0).to(labels[position], {
          x: labelX(destination),
          scale: mobile.matches ? destination === 0 ? 1.12 : 0.72 : 1,
          duration: reduced.matches ? 0 : 0.64, ease: "power2.inOut",
        }, 0);
      });
    };
    const sync = () => {
      const visible = document.documentElement.dataset.projectsActive === "true";
      if (visible === shown) return;
      shown = visible;
      ready = false;
      moving = false;
      animation?.kill();
      render();
      gsap.killTweensOf(underline);
      gsap.set(underline, { scaleX: 0 });
      animation = gsap.timeline({ onComplete: () => {
        ready = shown;
        document.documentElement.dataset.projectRailReady = String(shown);
        if (shown) revealUnderline();
      } });
      if (visible) {
        animation.set(element, { visibility: "visible" })
          .fromTo(labels, { x: (i: number) => !mobile.matches && SLOTS[i] === 0 ? "-0.69em" : "0.43em", scale: mobile.matches ? 0.72 : 1, autoAlpha: 0 }, {
            x: (i: number) => labelX(SLOTS[i]),
            scale: (i: number) => mobile.matches ? SLOTS[i] === 0 ? 1.12 : 0.72 : 1,
            autoAlpha: 1, duration: reduced.matches ? 0 : 0.65,
            stagger: reduced.matches ? 0 : 0.07, ease: "power3.out",
          })
          .to(marker, { autoAlpha: 1, duration: reduced.matches ? 0 : 0.25 }, reduced.matches ? 0 : 0.5);
      } else {
        animation.to([...labels, marker], { autoAlpha: 0, duration: reduced.matches ? 0 : 0.22 })
          .set(element, { visibility: "hidden" });
      }
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();
      const now = performance.now();
      if (now - lastWheel > 180) { amount = 0; consumed = false; }
      lastWheel = now;
      if (!ready || moving || consumed) return;
      if (!mobile.matches && Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const axis = mobile.matches && Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const delta = axis * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      if (Math.sign(delta) !== Math.sign(amount)) amount = 0;
      amount += delta;
      if (Math.abs(amount) >= 40) { consumed = true; move(amount); }
    };
    const start = (event: TouchEvent) => {
      event.stopPropagation();
      touch = event.touches.length === 1 ? (mobile.matches ? event.touches[0].clientX : event.touches[0].clientY) : null;
    };
    const drag = (event: TouchEvent) => {
      event.stopPropagation();
      if (touch === null || event.touches.length !== 1) return;
      event.preventDefault();
      const delta = touch - (mobile.matches ? event.touches[0].clientX : event.touches[0].clientY);
      if (Math.abs(delta) > 36) { move(delta); touch = null; }
    };
    const end = (event: TouchEvent) => { event.stopPropagation(); touch = null; };
    const key = (event: KeyboardEvent) => {
      const keys = mobile.matches ? ["ArrowRight", "ArrowLeft"] : ["ArrowDown", "ArrowUp"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      move(event.key === keys[0] ? 1 : -1);
    };
    const click = (event: MouseEvent) => {
      const row = (event.target as HTMLElement).closest<HTMLElement>("[data-rail-row]");
      if (row) move(Number(row.dataset.railRow));
      element.focus({ preventScroll: true });
    };
    const preference = () => { animation?.progress(1); };
    const layout = () => {
      animation?.kill();
      moving = false;
      ready = shown;
      touch = null;
      render();
      gsap.set(labels, { autoAlpha: shown ? 1 : 0 });
      gsap.set(marker, { autoAlpha: shown ? 1 : 0 });
      element.style.visibility = shown ? "visible" : "hidden";
      element.setAttribute("aria-orientation", mobile.matches ? "horizontal" : "vertical");
      revealUnderline();
    };
    element.setAttribute("aria-orientation", mobile.matches ? "horizontal" : "vertical");
    render();
    gsap.set(marker, { autoAlpha: 0 });
    document.documentElement.dataset.projectRailReady = "false";
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-projects-active"] });
    sync();
    onChange?.(index);
    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("touchstart", start, { passive: true });
    element.addEventListener("touchmove", drag, { passive: false });
    element.addEventListener("touchend", end);
    element.addEventListener("touchcancel", end);
    element.addEventListener("keydown", key);
    element.addEventListener("click", click);
    reduced.addEventListener("change", preference);
    mobile.addEventListener("change", layout);
    return () => {
      animation?.kill();
      gsap.killTweensOf(underline);
      observer.disconnect();
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("touchstart", start);
      element.removeEventListener("touchmove", drag);
      element.removeEventListener("touchend", end);
      element.removeEventListener("touchcancel", end);
      element.removeEventListener("keydown", key);
      element.removeEventListener("click", click);
      reduced.removeEventListener("change", preference);
      mobile.removeEventListener("change", layout);
      delete document.documentElement.dataset.projectRailReady;
    };
  }, [onChange]);

  return (
    <div ref={root} className={styles.rail} aria-label="Choose project" role="listbox"
      aria-activedescendant={id + "-0"} tabIndex={0} data-project-rail>
      <span className={styles.marker} data-rail-marker aria-hidden="true">‹</span>
      <span className={styles.underline} data-rail-underline aria-hidden="true" />
      <div className={styles.viewport}>
        {SLOTS.map(offset => (
          <div key={offset} id={id + "-" + offset} role="option" aria-selected={offset === 0}
            data-rail-row={offset} className={styles.row}>
            <span>{PROJECTS[wrap(offset)]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
