"use client";

import { useEffect, useRef } from "react";
import styles from "./CurvedMobileTagline.module.css";

const PHRASE = "SOFTWARE ENGINEER ✦ CREATIVE DEVELOPER ✦ ";
// 2 full phrases form exactly one closed circumference loop
const FULL_TEXT = `${PHRASE}${PHRASE}`;

// Exact circumference of the ellipse ring
const RING_CIRCUMFERENCE = 820.7;

// Continuous 2-revolution path (length = 2 * RING_CIRCUMFERENCE = 1641.4px)
// Seamlessly eliminates any seam/gap or stacking when text wraps around the closed orbit
const SATURN_RING_PATH =
  "M 379.5,639.8 C 371.5,671.9 284.6,677.9 185.5,653.2 C 86.3,628.5 12.5,582.4 20.5,550.2 C 28.5,518.1 115.4,512.1 214.5,536.8 C 313.7,561.5 387.5,607.6 379.5,639.8 C 371.5,671.9 284.6,677.9 185.5,653.2 C 86.3,628.5 12.5,582.4 20.5,550.2 C 28.5,518.1 115.4,512.1 214.5,536.8 C 313.7,561.5 387.5,607.6 379.5,639.8";

export function CurvedMobileTagline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const backTextPathRef = useRef<SVGTextPathElement>(null);
  const frontTextPathRef = useRef<SVGTextPathElement>(null);

  useEffect(() => {
    const mobileMedia = window.matchMedia("(max-width: 767px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const container = containerRef.current;
    const backTextPath = backTextPathRef.current;
    const frontTextPath = frontTextPathRef.current;
    if (!container || !backTextPath || !frontTextPath) return;

    let currentOffset = 0;
    const baseSpeed = 58; // px/sec cruising speed magnitude
    const entranceBurstSpeed = 360; // px/sec initial orbital spin-in impulse
    let direction = 1; // 1 = forward (default), -1 = backward
    let currentVelocity =
      document.documentElement.dataset.splashComplete === "true" && !reducedMotion.matches
        ? entranceBurstSpeed * direction
        : baseSpeed * direction;
    let lastTime = performance.now();
    let frameId = 0;
    let isVisible = true;
    let burstTimer: number | undefined;

    const shouldAnimate = () =>
      mobileMedia.matches &&
      !reducedMotion.matches &&
      isVisible &&
      !document.hidden &&
      document.documentElement.dataset.splashComplete === "true" &&
      document.documentElement.dataset.overlaySettled !== "true";

    const syncLoop = () => {
      if (reducedMotion.matches) {
        cancelAnimationFrame(frameId);
        frameId = 0;
        backTextPath.setAttribute("startOffset", "0px");
        frontTextPath.setAttribute("startOffset", "0px");
        return;
      }
      if (shouldAnimate()) {
        if (!frameId) {
          lastTime = performance.now();
          frameId = requestAnimationFrame(animate);
        }
      } else if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };

    const triggerSpinIn = () => {
      if (document.documentElement.dataset.splashComplete === "true" && !reducedMotion.matches) {
        window.clearTimeout(burstTimer);
        burstTimer = window.setTimeout(() => {
          currentVelocity = entranceBurstSpeed * direction;
          lastTime = performance.now();
          syncLoop();
        }, 260);
      }
      syncLoop();
    };
    const splashObserver = new MutationObserver(triggerSpinIn);
    splashObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-splash-complete", "data-overlay-settled"],
    });

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        syncLoop();
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(container);

    const scroller = document.querySelector("main") || window;
    let lastScrollY = scroller instanceof HTMLElement ? scroller.scrollTop : window.scrollY;

    const onScroll = () => {
      if (reducedMotion.matches || !isVisible || !mobileMedia.matches) return;
      const nowY = scroller instanceof HTMLElement ? scroller.scrollTop : window.scrollY;
      const delta = nowY - lastScrollY;
      lastScrollY = nowY;

      // Scroll direction sets persistent movement direction:
      // Scrolling down -> latches forward (+1) and accelerates forward
      // Scrolling up   -> latches backward (-1) and accelerates backward
      if (delta > 0.5) {
        direction = 1;
        currentVelocity = Math.min(Math.max(currentVelocity, 0) + delta * 3.5, 400);
      } else if (delta < -0.5) {
        direction = -1;
        currentVelocity = Math.max(Math.min(currentVelocity, 0) + delta * 3.5, -400);
      }
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", syncLoop);
    mobileMedia.addEventListener("change", syncLoop);
    reducedMotion.addEventListener("change", syncLoop);

    function animate(now: number) {
      frameId = 0;
      if (!shouldAnimate()) return;

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Target cruising velocity is determined by the active persistent direction
      const targetVelocity = direction * baseSpeed;

      // Smooth exponential damping toward target cruising velocity
      currentVelocity += (targetVelocity - currentVelocity) * (1 - Math.exp(-2.8 * dt));
      currentOffset += currentVelocity * dt;

      // 100% mathematically seamless continuous loop wrap
      const offset = ((currentOffset % RING_CIRCUMFERENCE) + RING_CIRCUMFERENCE) % RING_CIRCUMFERENCE;

      const formattedOffset = `${offset.toFixed(2)}px`;
      backTextPath!.setAttribute("startOffset", formattedOffset);
      frontTextPath!.setAttribute("startOffset", formattedOffset);

      frameId = requestAnimationFrame(animate);
    }

    syncLoop();

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(burstTimer);
      splashObserver.disconnect();
      intersectionObserver.disconnect();
      scroller.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", syncLoop);
      mobileMedia.removeEventListener("change", syncLoop);
      reducedMotion.removeEventListener("change", syncLoop);
    };
  }, []);

  return (
    <>
      {/* Layer 1: Behind Head & Neck (z-5) */}
      <div ref={containerRef} className={styles.layerBack} aria-hidden="true">
        <svg
          className={styles.curvedSvg}
          viewBox="0 0 400 850"
          preserveAspectRatio="xMidYMid slice"
          xmlSpace="preserve"
        >
          <defs>
            <path id="saturnRingBack" d={SATURN_RING_PATH} fill="none" />
          </defs>
          <g className={styles.ribbonGroup}>
            <text className={styles.ribbonTextBack} xmlSpace="preserve">
              <textPath
                ref={backTextPathRef}
                href="#saturnRingBack"
                startOffset="0px"
                textLength={RING_CIRCUMFERENCE}
                lengthAdjust="spacing"
                xmlSpace="preserve"
              >
                {FULL_TEXT}
              </textPath>
            </text>
          </g>
        </svg>
      </div>

      {/* Layer 2: In Front of Neck & Collar (z-15, clipped to lower half) */}
      <div className={styles.layerFront} aria-hidden="true">
        <svg
          className={styles.curvedSvg}
          viewBox="0 0 400 850"
          preserveAspectRatio="xMidYMid slice"
          xmlSpace="preserve"
        >
          <defs>
            <path id="saturnRingFront" d={SATURN_RING_PATH} fill="none" />
          </defs>
          <g className={styles.ribbonGroup}>
            <text className={styles.ribbonTextFront} xmlSpace="preserve">
              <textPath
                ref={frontTextPathRef}
                href="#saturnRingFront"
                startOffset="0px"
                textLength={RING_CIRCUMFERENCE}
                lengthAdjust="spacing"
                xmlSpace="preserve"
              >
                {FULL_TEXT}
              </textPath>
            </text>
          </g>
        </svg>
      </div>
    </>
  );
}
