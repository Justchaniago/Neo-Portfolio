"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getPerformanceProfile, onPerformanceTierChange } from "@/lib/performanceTier";
import type { AntigravityHaloProps } from "./AntigravityHalo";

const WebGLHalo = dynamic(
  () => import("./AntigravityHalo").then(({ AntigravityHalo }) => AntigravityHalo),
  { ssr: false },
);

export function AntigravityHalo(props: AntigravityHaloProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [splashComplete, setSplashComplete] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let profile = getPerformanceProfile();
    let splashObserver: MutationObserver | null = null;

    const sync = () => {
      const allowed = profile.tier !== "low" && !reducedMotion.matches;
      setIsEnabled(allowed);
      setSplashComplete(allowed && document.documentElement.dataset.splashComplete === "true");
      if (document.documentElement.dataset.splashComplete === "true") {
        splashObserver?.disconnect();
        splashObserver = null;
      }
    };

    if (document.documentElement.dataset.splashComplete === "true") {
      sync();
    } else {
      splashObserver = new MutationObserver(sync);
      splashObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-splash-complete"],
      });
      sync();
    }

    const unsubscribe = onPerformanceTierChange((nextProfile) => {
      profile = nextProfile;
      sync();
    });
    reducedMotion.addEventListener("change", sync);

    return () => {
      splashObserver?.disconnect();
      unsubscribe();
      reducedMotion.removeEventListener("change", sync);
    };
  }, []);

  if (!isEnabled || !splashComplete) {
    return (
      <div
        className={`relative h-full w-full overflow-hidden ${props.className ?? ""}`}
        aria-hidden="true"
      >
        <span className="antigravity-halo-fallback" />
      </div>
    );
  }

  return <WebGLHalo {...props} />;
}

export type { AntigravityHaloProps };
