"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./SpatialHud.module.css";

export function SpatialHud() {
  const pathname = usePathname();
  const fillRef = useRef<HTMLSpanElement>(null);
  const [chapter, setChapter] = useState({ code: "01", label: "INDEX", total: "06" });

  useEffect(() => {
    if (pathname !== "/") return;

    const scroller = document.querySelector("main");
    if (!scroller) return;

    const chapters = Array.from(scroller.querySelectorAll<HTMLElement>("[data-home-chapter]"));
    if (!chapters.length) return;
    let starts: number[] = [];
    let raf = 0;
    let maxScroll = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
    let lastChapter = -1;

    const measure = () => {
      maxScroll = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      const origin = scroller.scrollTop - scroller.getBoundingClientRect().top;
      starts = chapters.map(el => el.getBoundingClientRect().top + origin - scroller.clientHeight * 0.4);
    };

    const sync = () => {
      raf = 0;
      const scrollTop = scroller.scrollTop;
      const progress = Math.max(0, Math.min(1, scrollTop / maxScroll));
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleY(${progress.toFixed(4)})`;
      }

      const nextChapter = starts.reduce((current, top, index) => scrollTop >= top ? index : current, 0);
      if (nextChapter !== lastChapter) {
        lastChapter = nextChapter;
        setChapter({
          code: String(nextChapter + 1).padStart(2, "0"),
          label: chapters[nextChapter].dataset.homeChapter!,
          total: String(chapters.length).padStart(2, "0"),
        });
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
  }, [pathname]);

  if (pathname !== "/") return null;

  return (
    <aside className={styles.hud} aria-hidden="true">
      <div className={styles.readout}>
        <span className={styles.code}>{chapter.code}</span>
        <span className={styles.divider}>/</span>
        <span className={styles.total}>{chapter.total}</span>
        <span className={styles.name}>{chapter.label}</span>
      </div>
      <span className={styles.track}>
        <span ref={fillRef} className={styles.fill} />
      </span>
    </aside>
  );
}
