"use client";

import { useEffect, useRef } from "react";
import styles from "./CustomCursor.module.css";

type CursorMode = "default" | "interactive" | "portrait" | "rail" | "globe" | "drag";

export function CustomCursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!root || !dot || !ring || !label) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let active = false;
    let visible = false;
    let pressed = false;
    let mode: CursorMode = "default";
    let labelText = "";

    let mouseX = -100;
    let mouseY = -100;
    let dotX = -100;
    let dotY = -100;
    let ringX = -100;
    let ringY = -100;
    let raf = 0;

    const setMode = (nextMode: CursorMode, nextLabel = "") => {
      if (mode === nextMode && labelText === nextLabel) return;
      mode = nextMode;
      labelText = nextLabel;
      root.dataset.mode = nextMode;
      label.textContent = nextLabel;
    };

    const resolveTargetMode = (target: EventTarget | null): [CursorMode, string] => {
      if (!(target instanceof Element)) return ["default", ""];

      const customCursorEl = target.closest<HTMLElement>("[data-cursor]");
      if (customCursorEl) {
        const customType = (customCursorEl.dataset.cursor as CursorMode) || "interactive";
        const customLabel = customCursorEl.dataset.cursorLabel ?? "";
        return [customType, customLabel];
      }

      if (target.closest("[data-project-rail]")) {
        return ["rail", "↕ SCROLL"];
      }

      if (target.closest("[data-stack-handle]")) {
        return ["drag", "DRAG / CLOSE"];
      }

      const portraitBtn = target.closest<HTMLElement>("button[aria-label='Preview alternate portrait']");
      if (portraitBtn) {
        const heroScrolling = document.documentElement.dataset.heroScrolling === "true";
        const overlayOpen =
          Number(document.documentElement.dataset.projectsProgress ?? "0") > 0.001 ||
          Number(document.documentElement.dataset.staticProgress ?? "0") > 0.001;
        if (!heroScrolling && !overlayOpen) {
          return ["portrait", "IRIS"];
        }
      }

      if (target.closest("a, button, [role='button'], [role='option'], input, textarea, select")) {
        return ["interactive", ""];
      }

      return ["default", ""];
    };

    const tick = () => {
      raf = 0;
      if (!active || !visible) return;

      const dLerp = 0.52;
      const rLerp = mode === "rail" || mode === "portrait" || mode === "drag" ? 0.22 : 0.18;

      dotX += (mouseX - dotX) * dLerp;
      dotY += (mouseY - dotY) * dLerp;

      const prevRingX = ringX;
      const prevRingY = ringY;
      ringX += (mouseX - ringX) * rLerp;
      ringY += (mouseY - ringY) * rLerp;

      const vx = ringX - prevRingX;
      const vy = ringY - prevRingY;
      const speed = Math.hypot(vx, vy);

      dot.style.transform = `translate3d(${dotX.toFixed(2)}px, ${dotY.toFixed(2)}px, 0) translate(-50%, -50%)`;

      if (mode === "default" && speed > 0.4) {
        const angle = Math.atan2(vy, vx) * (180 / Math.PI);
        const stretch = Math.min(0.28, speed * 0.014);
        const scaleBase = pressed ? 0.84 : 1;
        ring.style.transform = `translate3d(${ringX.toFixed(2)}px, ${ringY.toFixed(2)}px, 0) translate(-50%, -50%) rotate(${angle.toFixed(1)}deg) scale(${(scaleBase + stretch).toFixed(3)}, ${(scaleBase - stretch * 0.45).toFixed(3)})`;
      } else {
        const scaleBase = pressed ? 0.88 : 1;
        ring.style.transform = `translate3d(${ringX.toFixed(2)}px, ${ringY.toFixed(2)}px, 0) translate(-50%, -50%) scale(${scaleBase})`;
      }

      if (
        Math.abs(mouseX - ringX) > 0.08 ||
        Math.abs(mouseY - ringY) > 0.08 ||
        Math.abs(mouseX - dotX) > 0.08 ||
        Math.abs(mouseY - dotY) > 0.08
      ) {
        raf = requestAnimationFrame(tick);
      }
    };

    const wake = () => {
      if (!raf && active && visible) {
        raf = requestAnimationFrame(tick);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!active || event.pointerType !== "mouse") return;
      mouseX = event.clientX;
      mouseY = event.clientY;
      if (!visible) {
        visible = true;
        dotX = ringX = mouseX;
        dotY = ringY = mouseY;
        root.dataset.visible = "true";
      }
      const [nextMode, nextLabel] = resolveTargetMode(event.target);
      setMode(nextMode, nextLabel);
      wake();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!active || event.pointerType !== "mouse") return;
      pressed = true;
      root.dataset.pressed = "true";
      wake();
    };

    const onPointerUp = () => {
      if (!pressed) return;
      pressed = false;
      root.dataset.pressed = "false";
      wake();
    };

    const onPointerLeaveWindow = () => {
      visible = false;
      pressed = false;
      root.dataset.visible = "false";
      root.dataset.pressed = "false";
    };

    const syncCapability = () => {
      const shouldEnable = finePointer.matches && !reducedMotion.matches;
      if (shouldEnable === active) return;
      active = shouldEnable;
      if (!active) {
        visible = false;
        root.dataset.visible = "false";
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      }
    };

    syncCapability();
    finePointer.addEventListener("change", syncCapability);
    reducedMotion.addEventListener("change", syncCapability);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    document.addEventListener("mouseleave", onPointerLeaveWindow);
    window.addEventListener("blur", onPointerLeaveWindow);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      finePointer.removeEventListener("change", syncCapability);
      reducedMotion.removeEventListener("change", syncCapability);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("mouseleave", onPointerLeaveWindow);
      window.removeEventListener("blur", onPointerLeaveWindow);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-visible="false"
      data-mode="default"
      data-pressed="false"
      aria-hidden="true"
    >
      <div ref={dotRef} className={styles.dot} />
      <div ref={ringRef} className={styles.ring}>
        <span ref={labelRef} className={styles.label} />
      </div>
    </div>
  );
}
