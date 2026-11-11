"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./SpatialHud.module.css";

const CHAPTERS = [
  { code: "01", label: "INDEX" },
  { code: "02", label: "CRAFT" },
  { code: "03", label: "ORIGIN" },
  { code: "04", label: "CONNECT" },
] as const;

export function SpatialHud() {
  const fillRef = useRef<HTMLSpanElement>(null);
  const [chapterIndex, setChapterIndex] = useState(0);

  useEffect(() => {
    const scroller = document.querySelector("main");
    if (!scroller) return;

    let raf = 0;

    const sync = () => {
      raf = 0;
      const maxScroll = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      const progress = Math.max(0, Math.min(1, scroller.scrollTop / maxScroll));
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleY(${progress.toFixed(4)})`;
      }

      const nextChapter =
        progress < 0.14 ? 0 : progress < 0.48 ? 1 : progress < 0.78 ? 2 : 3;
      setChapterIndex(nextChapter);
    };

    const scheduleSync = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };

    sync();
    scroller.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
    };
  }, []);

  const current = CHAPTERS[chapterIndex] ?? CHAPTERS[0];

  return (
    <aside className={styles.hud} aria-hidden="true">
      <div className={styles.readout}>
        <span className={styles.code}>{current.code}</span>
        <span className={styles.divider}>/</span>
        <span className={styles.total}>04</span>
        <span className={styles.name}>{current.label}</span>
      </div>
      <span className={styles.track}>
        <span ref={fillRef} className={styles.fill} />
      </span>
    </aside>
  );
}
