"use client";

import { useLayoutEffect, useState } from "react";
import styles from "./SplashScreen.module.css";

export function SplashScreen() {
  const [complete, setComplete] = useState(false);

  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      setComplete(true);
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  if (complete) return null;

  return (
    <div className={styles.splash} aria-label="Loading" role="status">
      <p className={styles.wordmark}>
        justchaniago
      </p>
    </div>
  );
}
