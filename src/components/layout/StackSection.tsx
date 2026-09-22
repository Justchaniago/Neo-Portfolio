import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
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
  return (
    <section ref={sectionRef} className={`${styles.section} ${className ?? ""}`} {...props}>
      <svg className={styles.surface} viewBox="0 0 1440 1000" preserveAspectRatio="none" aria-hidden="true">
        <path ref={surfacePathRef} className={styles.surfacePath} d="M0 72 Q720 0 1440 72 V1000 H0Z" />
      </svg>
      <div className={`${styles.content} ${contentClassName ?? ""}`}>{children}</div>
    </section>
  );
}

export function setStackSurfaceProgress(path: SVGPathElement | null, progress: number) {
  if (!path) return;
  const clamped = Math.max(0, Math.min(1, progress));
  const curveDepth = 72 * (1 - clamped);
  path.setAttribute("d", `M0 ${curveDepth} Q720 0 1440 ${curveDepth} V1000 H0Z`);
}
