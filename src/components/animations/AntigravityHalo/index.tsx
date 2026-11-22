"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { getPerformanceProfile, onPerformanceTierChange } from "@/lib/performanceTier";
import type { AntigravityHaloProps } from "./AntigravityHalo";

const WebGLHalo = dynamic(
  () => import("./AntigravityHalo").then(({ AntigravityHalo }) => AntigravityHalo),
  { ssr: false },
);

export function AntigravityHalo(props: AntigravityHaloProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [splashComplete, setSplashComplete] = useState(false);
  const placeholder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let profile = getPerformanceProfile();
    let splashObserver: MutationObserver | null = null;
    let near = props.pointerScope !== "local";

    const sync = () => {
      const allowed = near && profile.tier !== "low" && !reducedMotion.matches;
      setIsEnabled(allowed);
      setSplashComplete(allowed && document.documentElement.dataset.splashComplete === "true");
      if (document.documentElement.dataset.splashComplete === "true") {
        splashObserver?.disconnect();
        splashObserver = null;
      }
    };

    const footer = placeholder.current?.closest("[data-home-chapter]");
    const proximity = !near && footer ? new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      near = true;
      proximity?.disconnect();
      sync();
    }, { root: footer.closest("main"), rootMargin: "100% 0px" }) : null;
    if (proximity && footer) proximity.observe(footer);
    else near = true;

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
      proximity?.disconnect();
      unsubscribe();
      reducedMotion.removeEventListener("change", sync);
    };
  }, [props.pointerScope]);

  if (!isEnabled || !splashComplete) {
    return (
      <div
        ref={placeholder}
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
