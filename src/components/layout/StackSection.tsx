"use client";

import { useId, useRef, type ComponentPropsWithoutRef, type PointerEvent, type ReactNode, type Ref } from "react";
import styles from "./StackSection.module.css";

type StackSectionProps = Omit<ComponentPropsWithoutRef<"section">, "children"> & {
  children: ReactNode;
  sectionRef?: Ref<HTMLElement>;
  surfacePathRef?: Ref<SVGPathElement>;
  contentClassName?: string;
  onDragRatio?: (nextRatio: number) => void;
  onDragRelease?: (shouldClose: boolean) => void;
  onRequestClose?: () => void;
};

export function StackSection({
  children,
  sectionRef,
  surfacePathRef,
  contentClassName,
  className,
  onDragRatio,
  onDragRelease,
  onRequestClose,
  ...props
}: StackSectionProps) {
  const gradientId = `stack-rim-${useId()}`;
  const dragState = useRef<{
    pointerId: number;
    startY: number;
    lastY: number;
    lastTime: number;
    velocityY: number;
    moved: boolean;
  } | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: performance.now(),
      velocityY: 0,
      moved: false,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const now = performance.now();
    const dt = Math.max(1, now - state.lastTime);
    const dy = Math.max(0, event.clientY - state.startY);
    if (dy > 6) state.moved = true;
    state.velocityY = (event.clientY - state.lastY) / dt;
    state.lastY = event.clientY;
    state.lastTime = now;

    if (state.moved && onDragRatio) {
      const vh = Math.max(320, window.innerHeight || 800);
      const nextRatio = Math.max(0.05, Math.min(1, 1 - dy / (vh * 0.85)));
      onDragRatio(nextRatio);
    }
  };

  const finishDrag = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const state = dragState.current;
    if (!state || state.pointerId !== event.pointerId) return;
    dragState.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (cancelled) {
      onDragRelease?.(false);
      return;
    }
    const dy = Math.max(0, event.clientY - state.startY);
    const vh = Math.max(320, window.innerHeight || 800);
    if (!state.moved) {
      onRequestClose?.();
      return;
    }
    const shouldClose = dy > vh * 0.16 || (dy > 32 && state.velocityY > 0.55);
    onDragRelease?.(shouldClose);
  };

  return (
    <section ref={sectionRef} className={`${styles.section} ${className ?? ""}`} {...props}>
      <svg className={styles.surface} viewBox="0 0 1440 1000" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="22%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="50%" stopColor="rgba(223,161,61,0.48)" />
            <stop offset="78%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <path
          ref={surfacePathRef}
          className={styles.surfacePath}
          stroke={`url(#${gradientId})`}
          d="M0 0 Q720 0 1440 0 V1000 H0Z"
        />
      </svg>
      <div className={styles.handleZone}>
        <button
          type="button"
          className={styles.handleButton}
          data-stack-handle="true"
          aria-label="Drag down or click to return to home"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(e) => finishDrag(e, false)}
          onPointerCancel={(e) => finishDrag(e, true)}
        >
          <span className={styles.handlePill} aria-hidden="true" />
        </button>
      </div>
      <div className={`${styles.content} ${contentClassName ?? ""}`}>{children}</div>
    </section>
  );
}

export function setStackSurfaceProgress(path: SVGPathElement | null, progress: number) {
  if (!path) return;
  const clamped = Math.max(0, Math.min(1, progress));
  // Dynamic velocity-like arch: flat at 0 and 1, bows upward at mid-flight
  const arch = Math.sin(clamped * Math.PI);
  const edgeY = (118 * arch * Math.pow(1 - clamped, 0.55)).toFixed(2);
  path.setAttribute("d", `M0 ${edgeY} Q720 0 1440 ${edgeY} V1000 H0Z`);
}
