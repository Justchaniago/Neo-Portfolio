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
    let maxScroll = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
    let lastChapter = 0;

    const measure = () => {
      maxScroll = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
    };

    const sync = () => {
      raf = 0;
      const progress = Math.max(0, Math.min(1, scroller.scrollTop / maxScroll));
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleY(${progress.toFixed(4)})`;
      }

      const nextChapter =
        progress < 0.14 ? 0 : progress < 0.48 ? 1 : progress < 0.78 ? 2 : 3;
      if (nextChapter !== lastChapter) {
        lastChapter = nextChapter;
        setChapterIndex(nextChapter);
      }
    };

    const scheduleSync = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };

    const resizeObserver = new ResizeObserver(() => {
      measure();
      scheduleSync();
    });
    resizeObserver.observe(scroller);
    if (scroller.firstElementChild) {
      resizeObserver.observe(scroller.firstElementChild);
    }

    measure();
    sync();
    scroller.addEventListener("scroll", scheduleSync, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      scroller.removeEventListener("scroll", scheduleSync);
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
