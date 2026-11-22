"use client";

import { useEffect, useId, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { PROJECTS as PROJECT_DATA, PROJECT_COUNT } from "@/lib/projects";
import styles from "./ProjectRail.module.css";

const PROJECTS = PROJECT_DATA.map((project) => project.title.toLowerCase());
const SLOTS = [-3, -2, -1, 0, 1, 2, 3];
const wrap = (value: number) => ((value % PROJECTS.length) + PROJECTS.length) % PROJECTS.length;
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function ProjectRail({
  activeIndex = 0,
  onChange,
  onOpenProject,
}: {
  activeIndex?: number;
  onChange?: (index: number, direction: number) => void;
  onOpenProject?: (index: number) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const syncIndexRef = useRef<((nextIndex: number) => void) | null>(null);
  const stepRef = useRef<((step: number) => void) | null>(null);
  const onChangeRef = useRef(onChange);
  const onOpenRef = useRef(onOpenProject);

  useLayoutEffect(() => {
    onChangeRef.current = onChange;
    onOpenRef.current = onOpenProject;
  });

  useLayoutEffect(() => {
    const element = root.current!;
    const rows = Array.from(element.querySelectorAll<HTMLElement>("[data-rail-row]"));
    const labels = rows.map((row) => row.querySelector<HTMLElement>("[data-rail-label]")!);
    const nums = rows.map((row) => row.querySelector<HTMLElement>("[data-rail-num]")!);
    const titles = rows.map((row) => row.querySelector<HTMLElement>("[data-rail-title]")!);
    const marker = element.querySelector<HTMLElement>("[data-rail-marker]")!;
    const underline = element.querySelector<HTMLElement>("[data-rail-underline]")!;
    const mobile = matchMedia("(max-width: 767px)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let index = wrap(activeIndex);
    let progress = 0;
    let ready = false;
    let moving = false;
    let amount = 0;
    let lastWheel = 0;
    let consumed = false;
    let touch: number | null = null;
    let animation: gsap.core.Timeline | undefined;

    const slotStepPct = () => (mobile.matches ? 94 : 100);
    const rowScale = (offset: number) => (mobile.matches ? (offset === 0 ? 1.06 : 0.72) : 1);
    const rowOpacity = (offset: number) => Math.max(0.08, 1 - Math.abs(offset) * (mobile.matches ? 0.56 : 0.42));

    const setProgress = (nextProgress: number) => {
      progress = clamp(nextProgress);
      element.style.visibility = progress <= 0.001 ? "hidden" : "visible";

      const reveal = clamp((progress - 0.24) / 0.48);
      const markerProgress = clamp((progress - 0.66) / 0.26);
      const stepPct = slotStepPct();
      rows.forEach((row, position) => {
        const offset = SLOTS[position];
        const rowReveal = clamp((reveal - position * 0.095) / 0.24);
        labels[position].style.clipPath = `inset(0 0 0 ${(1 - rowReveal) * 100}%)`;
        row.setAttribute("aria-hidden", String(rowReveal < 0.1));
        row.classList.toggle(styles.active, offset === 0);
        gsap.set(row, {
          xPercent: mobile.matches ? offset * stepPct : 0,
          yPercent: mobile.matches ? 0 : offset * stepPct,
          opacity: rowReveal * rowOpacity(offset),
        });
        gsap.set(labels[position], {
          scale: rowScale(offset),
        });
      });
      gsap.set(marker, { autoAlpha: markerProgress, x: (1 - markerProgress) * 24 });
      gsap.set(underline, { scaleX: mobile.matches ? markerProgress : 0 });

      const railReady = progress >= 0.36;
      if (railReady !== ready) {
        ready = railReady;
        document.documentElement.dataset.projectRailReady = String(railReady);
      }
    };

    const writeText = () => {
      rows.forEach((row, position) => {
        const offset = SLOTS[position];
        const projIdx = wrap(index + offset);
        nums[position].textContent = PROJECT_DATA[projIdx].number;
        titles[position].textContent = PROJECTS[projIdx];
        row.setAttribute("aria-selected", String(offset === 0));
      });
    };

    const renderLabels = () => {
      writeText();
      setProgress(progress);
    };

    const move = (rawStep: number) => {
      if (!ready || !rawStep) return;
      const step = Math.max(-3, Math.min(3, Math.trunc(rawStep)));
      if (!step) return;

      // Reassign slots at their painted positions when a second input interrupts a step.
      const axis = mobile.matches ? "xPercent" : "yPercent";
      const carry = moving ? Number(gsap.getProperty(rows[SLOTS.indexOf(0)], axis)) : 0;
      moving = true;
      animation?.kill();

      index = wrap(index + step);
      writeText();
      window.dispatchEvent(new CustomEvent("portfolio:rail-tick", { detail: { direction: Math.sign(step) } }));
      onChangeRef.current?.(index, step);

      if (reduced.matches) {
        setProgress(progress);
        moving = false;
        return;
      }

      const stepPct = slotStepPct();

      animation = gsap.timeline({
        onComplete: () => {
          moving = false;
          setProgress(progress);
        },
      });

      rows.forEach((row, position) => {
        const dest = SLOTS[position];
        const from = dest + step;
        labels[position].style.clipPath = "inset(0 0 0 0%)";
        row.classList.toggle(styles.active, dest === 0);
        animation!.fromTo(
          row,
          {
            xPercent: mobile.matches ? from * stepPct + carry : 0,
            yPercent: mobile.matches ? 0 : from * stepPct + carry,
            opacity: rowOpacity(from),
          },
          {
            xPercent: mobile.matches ? dest * stepPct : 0,
            yPercent: mobile.matches ? 0 : dest * stepPct,
            opacity: rowOpacity(dest),
            duration: 0.56,
            ease: "expo.out",
          },
          0,
        ).fromTo(
          labels[position],
          {
            scale: rowScale(from),
          },
          {
            scale: rowScale(dest),
            duration: 0.56,
            ease: "expo.out",
          },
          0,
        );
      });
    };

    const setDirectIndex = (nextIndex: number) => {
      if (typeof nextIndex !== "number" || !Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= PROJECTS.length) return;
      if (nextIndex === index) return;
      animation?.kill();
      moving = false;
      index = nextIndex;
      renderLabels();
    };

    syncIndexRef.current = setDirectIndex;
    stepRef.current = move;

    const selectProject = (event: Event) => {
      const nextIndex = (event as CustomEvent<{ index?: number }>).detail?.index;
      if (typeof nextIndex === "number") {
        setDirectIndex(nextIndex);
        onChangeRef.current?.(index, 1);
      }
    };

    const wheel = (event: WheelEvent) => {
      if (!ready || event.ctrlKey) return;
      if (!mobile.matches && Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      event.stopPropagation();
      const now = performance.now();
      const axis = mobile.matches && Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (now - lastWheel > 170 || Math.sign(axis) !== Math.sign(amount)) {
        amount = 0;
        consumed = false;
      }
      lastWheel = now;
      if (consumed) return;
      const delta = axis * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      if (Math.sign(delta) !== Math.sign(amount)) amount = 0;
      amount += delta;
      if (Math.abs(amount) >= 36) {
        consumed = true;
        move(Math.sign(amount));
      }
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
      if (Math.abs(delta) > 34) {
        move(Math.sign(delta));
        touch = position;
      }
    };

    const end = () => {
      touch = null;
    };

    const key = (event: KeyboardEvent) => {
      if (!ready || (event.target as HTMLElement).closest("[data-step]")) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpenRef.current?.(index);
        return;
      }
      const nextKeys = mobile.matches ? ["ArrowRight", "ArrowDown"] : ["ArrowDown", "ArrowRight"];
      const prevKeys = mobile.matches ? ["ArrowLeft", "ArrowUp"] : ["ArrowUp", "ArrowLeft"];
      if (nextKeys.includes(event.key)) {
        event.preventDefault();
        move(1);
      } else if (prevKeys.includes(event.key)) {
        event.preventDefault();
        move(-1);
      }
    };

    const click = (event: MouseEvent) => {
      if (!ready) return;
      const target = event.target as HTMLElement;
      if (target.closest("[data-rail-marker-btn]")) {
        onOpenRef.current?.(index);
        return;
      }
      const row = target.closest<HTMLElement>("[data-rail-row]");
      if (row) {
        const slot = Number(row.dataset.railRow);
        if (slot === 0) {
          onOpenRef.current?.(index);
          return;
        }
        move(slot);
      }
    };

    const syncProgress = () => setProgress(Number(document.documentElement.dataset.projectsProgress ?? 0));
    const layout = () => {
      animation?.kill();
      moving = false;
      renderLabels();
    };
    const observer = new MutationObserver(syncProgress);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-projects-progress"] });
    document.documentElement.dataset.projectRailReady = "false";
    renderLabels();
    syncProgress();

    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("touchstart", start, { passive: true });
    element.addEventListener("touchmove", drag, { passive: false });
    element.addEventListener("touchend", end);
    element.addEventListener("touchcancel", end);
    element.addEventListener("keydown", key);
    element.addEventListener("click", click);
    window.addEventListener("portfolio:select-project", selectProject);
    mobile.addEventListener("change", layout);

    return () => {
      animation?.kill();
      observer.disconnect();
      syncIndexRef.current = null;
      stepRef.current = null;
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("touchstart", start);
      element.removeEventListener("touchmove", drag);
      element.removeEventListener("touchend", end);
      element.removeEventListener("touchcancel", end);
      element.removeEventListener("keydown", key);
      element.removeEventListener("click", click);
      window.removeEventListener("portfolio:select-project", selectProject);
      mobile.removeEventListener("change", layout);
      delete document.documentElement.dataset.projectRailReady;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    syncIndexRef.current?.(activeIndex);
  }, [activeIndex]);

  return (
    <div ref={root} className={styles.rail} data-project-rail>
      <div className={styles.railCaption} aria-hidden="true">
        <span>Project index</span><span>{PROJECT_DATA[activeIndex].number} / {PROJECT_COUNT}</span>
      </div>
      <button
        type="button"
        className={styles.marker}
        data-rail-marker
        data-rail-marker-btn="true"
        data-cursor="rail"
        data-cursor-label="OPEN ↗"
        tabIndex={-1}
        aria-label="Open selected project"
      >
        <span className={styles.markerGlyph} aria-hidden="true">↗</span>
      </button>
      <span className={styles.underline} data-rail-underline aria-hidden="true" />
      <div className={styles.viewport} aria-label="Choose project" role="listbox" tabIndex={0} aria-activedescendant={`${id}-0`}>
        {SLOTS.map((offset) => {
          const projIdx = wrap(offset);
          return (
            <div
              key={offset}
              id={id + "-" + offset}
              role="option"
              aria-selected={offset === 0}
              data-rail-row={offset}
              data-cursor={offset === 0 ? "rail" : undefined}
              data-cursor-label={offset === 0 ? "OPEN ↗" : undefined}
              className={styles.row}
            >
              <span className={styles.rowInner} data-rail-label>
                <sup className={styles.rowNum} data-rail-num>{PROJECT_DATA[projIdx].number}</sup>
                <span className={styles.rowTitle} data-rail-title>{PROJECTS[projIdx]}</span>
              </span>
            </div>
          );
        })}
      </div>
      {([-1, 1] as const).map((step) => (
        <button key={step} type="button" data-step={step} className={styles.step}
          aria-label={`${step < 0 ? "Previous" : "Next"} project in list`}
          onClick={() => stepRef.current?.(step)}>
          <span aria-hidden="true">{step < 0 ? "←" : "→"}</span>
        </button>
      ))}
    </div>
  );
}
