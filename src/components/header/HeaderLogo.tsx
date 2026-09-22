"use client";

import Link from "next/link";
import { useRef } from "react";
import { useLogoReveal } from "./useLogoReveal";
import styles from "./HeaderLogo.module.css";

export function HeaderLogo() {
  const ref = useRef<HTMLAnchorElement>(null);
  useLogoReveal(ref);

  return (
    <Link ref={ref} href="/" className={styles.logo} aria-label="justchaniago — Home">
        <span className={styles.frame} aria-hidden="true">
        <span className={styles.sizer}>justchaniago</span>
        <span className={styles.sizer}>chaniago.me</span>
        <span className={styles.mask}>
          <span className={styles.line} data-logo-line>
            <span data-logo-prefix>just</span><span>chaniago</span>
            <span className={styles.dotMask}><span className={styles.dot} data-logo-dot>.</span></span>
            <span className={styles.endingMask}><span className={styles.ending} data-logo-ending>me</span></span>
          </span>
        </span>
        <span className={styles.projectMask} aria-hidden="true"><span className={styles.projectLabel}>projects</span></span>
      </span>
    </Link>
  );
}
