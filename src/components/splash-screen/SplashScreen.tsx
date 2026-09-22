"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { animateReels, REEL } from "./animateReels";
import styles from "./SplashScreen.module.css";

function ReelLetters({ text, offset = 0 }: { text: string; offset?: number }) {
  return Array.from(text, (character, index) => (
    <span className={styles.slot} key={index}>
      <span className={styles.placeholder}>{character}</span>
      <span className={styles.track} data-reel data-index={offset + index}>
        {Array.from({ length: REEL.cells }, (_, cell) => (
          <span className={styles.cell} key={cell}>
            {cell === REEL.startCell ? "\u00a0" : character}
          </span>
        ))}
      </span>
    </span>
  ));
}

export function SplashScreen() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [complete, setComplete] = useState(false);

  useLayoutEffect(() => {
    if (complete) return;
    const root = rootRef.current;
    if (!root) return;
    const content = document.querySelector<HTMLElement>("[data-page-content]");
    const previousInert = content?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    if (content) content.inert = true;
    document.body.style.overflow = "hidden";
    // Font/network stalls must never block access indefinitely.
    const finish = () => {
      document.documentElement.dataset.splashComplete = "true";
      setComplete(true);
    };
    const timeout = window.setTimeout(finish, 12000);
    const stop = animateReels(root, finish);
    return () => {
      window.clearTimeout(timeout);
      stop();
      if (content) content.inert = previousInert;
      document.body.style.overflow = previousOverflow;
    };
  }, [complete]);

  if (complete) return null;

  return (
    <div
      ref={rootRef}
      className={styles.splash}
      style={{
        "--reel-start": `${(-REEL.startCell / REEL.cells) * 100}%`,
      } as CSSProperties}
    >
      <p className={styles.wordmark} aria-label="chaniago.me" data-wordmark>
        <span className={styles.prefixMask} aria-hidden="true">
          <span className={styles.prefix} data-prefix>
            <ReelLetters text="just" />
          </span>
        </span>
        <span className={styles.core} aria-hidden="true">
          <ReelLetters text="chaniago" offset={4} />
        </span>
        <span className={styles.suffix} data-suffix aria-hidden="true">
          <span className={styles.dotMask}>
            <span className={styles.dot} data-dot>
              <span className={styles.dotSpacing}>.</span>
              <span className={styles.dotCircle} data-dot-circle />
            </span>
          </span>
          <span className={styles.endingMask}>
            <span className={styles.ending} data-ending>me</span>
          </span>
        </span>
      </p>
      <span className={styles.portal} data-portal aria-hidden="true" />
    </div>
  );
}
