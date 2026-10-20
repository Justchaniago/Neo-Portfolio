import { useId, type ComponentPropsWithoutRef, type ReactNode, type Ref } from "react";
import styles from "./StackSection.module.css";

type StackSectionProps = Omit<ComponentPropsWithoutRef<"section">, "children"> & {
  children: ReactNode;
  sectionRef?: Ref<HTMLElement>;
  surfacePathRef?: Ref<SVGPathElement>;
  contentClassName?: string;
};

export function StackSection({
  children,
  sectionRef,
  surfacePathRef,
  contentClassName,
  className,
  ...props
}: StackSectionProps) {
  const gradientId = `stack-rim-${useId()}`;
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
