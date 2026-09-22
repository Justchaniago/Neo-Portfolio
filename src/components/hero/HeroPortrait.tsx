"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import gsap from "gsap";
import styles from "./HeroPortrait.module.css";

export function HeroPortrait() {
  const [revealed, setRevealed] = useState(false);
  const [mobileImage, setMobileImage] = useState<0 | 1>(0);
  const [mobileTransitioning, setMobileTransitioning] = useState(false);
  const inputType = useRef("keyboard");
  const root = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const mobileReplay = useRef<() => void>(() => {});
  const mobileImageRef = useRef<0 | 1>(0);
  const mobileTransitioningRef = useRef(false);
  const bounds = useRef<DOMRect | null>(null);
  const pendingPoint = useRef<{ x: number; y: number } | null>(null);
  const moveFrame = useRef<number | null>(null);
  const syncFrame = useRef<number | null>(null);
  const lastMouse = useRef<{ x: number; y: number } | null>(null);
  const revealedRef = useRef(false);

  useEffect(() => { mobileImageRef.current = mobileImage; }, [mobileImage]);

  useEffect(() => {
    const portrait = root.current;
    const surface = canvas.current;
    if (!portrait || !surface) return;

    const mobile = window.matchMedia("(max-width: 767px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timeout: number | undefined;
    let frame: number | undefined;
    let run = 0;
    let disposed = false;

    const stop = () => {
      run += 1;
      if (timeout !== undefined) window.clearTimeout(timeout);
      if (frame !== undefined) cancelAnimationFrame(frame);
      timeout = undefined;
      frame = undefined;
      const context = surface.getContext("2d");
      context?.clearRect(0, 0, surface.width, surface.height);
    };

    const loadImage = async (source: string) => {
      const image = new window.Image();
      image.src = source;
      await image.decode();
      return image;
    };

    const play = async (from: 0 | 1, to: 0 | 1) => {
      if (disposed || !mobile.matches || mobileTransitioningRef.current) return;
      if (reduced.matches) {
        mobileImageRef.current = to;
        setMobileImage(to);
        return;
      }
      const currentRun = run + 1;
      run = currentRun;
      try {
        const [fromImage, toImage] = await Promise.all([
          loadImage(from === 0 ? "/hero-justchaniago.png" : "/hero-justchaniago-left.png"),
          loadImage(to === 0 ? "/hero-justchaniago.png" : "/hero-justchaniago-left.png"),
        ]);
        if (disposed || currentRun !== run || !mobile.matches) return;

        const rect = portrait.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        surface.width = Math.round(width * pixelRatio);
        surface.height = Math.round(height * pixelRatio);
        const context = surface.getContext("2d");
        if (!context) return;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.drawImage(fromImage, 0, 0, width, height);
        mobileTransitioningRef.current = true;
        setMobileTransitioning(true);

        const columns = 14;
        const rows = 10;
        const tiles = columns * rows;
        const stagger = 460;
        const tileDuration = 340;
        const duration = stagger + tileDuration;
        const start = performance.now();

        const draw = (now: number) => {
          if (currentRun !== run) return;
          const elapsed = now - start;
          context.clearRect(0, 0, width, height);
          for (let index = 0; index < tiles; index += 1) {
            const column = index % columns;
            const row = Math.floor(index / columns);
            const centerDistance = Math.hypot(column - (columns - 1) / 2, row - (rows - 1) / 2) / Math.hypot((columns - 1) / 2, (rows - 1) / 2);
            const delay = centerDistance * stagger + ((index * 17) % 31) / 31 * 80;
            const rawProgress = Math.min(1, Math.max(0, (elapsed - delay) / tileDuration));
            const progress = 1 - (1 - rawProgress) ** 3;
            const x = column * width / columns;
            const y = row * height / rows;
            const tileWidth = width / columns;
            const tileHeight = height / rows;

            if (rawProgress < 1) {
              context.globalAlpha = 1 - rawProgress;
              context.drawImage(
                fromImage,
                column * fromImage.naturalWidth / columns,
                row * fromImage.naturalHeight / rows,
                fromImage.naturalWidth / columns,
                fromImage.naturalHeight / rows,
                x,
                y,
                tileWidth,
                tileHeight,
              );
            }
            if (rawProgress === 0) continue;
            const inset = (1 - progress) * Math.min(tileWidth, tileHeight) * 0.13;
            context.globalAlpha = rawProgress;
            context.drawImage(
              toImage,
              column * toImage.naturalWidth / columns,
              row * toImage.naturalHeight / rows,
              toImage.naturalWidth / columns,
              toImage.naturalHeight / rows,
              x + inset,
              y + inset,
              tileWidth - inset * 2,
              tileHeight - inset * 2,
            );
          }
          context.globalAlpha = 1;
          if (elapsed < duration) {
            frame = requestAnimationFrame(draw);
            return;
          }
          context.drawImage(toImage, 0, 0, width, height);
          mobileImageRef.current = to;
          mobileTransitioningRef.current = false;
          setMobileImage(to);
          setMobileTransitioning(false);
        };
        frame = requestAnimationFrame(draw);
      } catch {
        return;
      }
    };

    const schedule = () => {
      stop();
      mobileTransitioningRef.current = false;
      setMobileTransitioning(false);
      if (!mobile.matches) return;
      if (reduced.matches) {
        mobileImageRef.current = 1;
        setMobileImage(1);
        return;
      }
      if (document.documentElement.dataset.splashComplete !== "true") return;
      if (mobileImageRef.current === 0) timeout = window.setTimeout(() => { void play(0, 1); }, 2000);
    };
    mobileReplay.current = () => {
      if (!mobile.matches || reduced.matches) return;
      const from = mobileImageRef.current;
      void play(from, from === 0 ? 1 : 0);
    };
    const splashObserver = new MutationObserver(schedule);
    splashObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-splash-complete"] });
    mobile.addEventListener("change", schedule);
    reduced.addEventListener("change", schedule);
    schedule();
    return () => {
      disposed = true;
      stop();
      splashObserver.disconnect();
      mobile.removeEventListener("change", schedule);
      reduced.removeEventListener("change", schedule);
      mobileReplay.current = () => {};
    };
  }, []);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const measure = () => { bounds.current = element.getBoundingClientRect(); };
    const animate = () => {
      measure();
      const currentBounds = bounds.current;
      if (!currentBounds) return;
      const size = Math.min(currentBounds.width, currentBounds.height);
      const radius = Math.min(Math.max(size * 0.36, 184), 328);
      gsap.to(element, {
        "--radius": revealed ? `${radius}px` : "0px",
        duration: reduced.matches ? 0 : revealed ? 1.45 : 0.62,
        ease: revealed ? "power2.out" : "power2.inOut",
        overwrite: true,
      });
    };
    animate();
    reduced.addEventListener("change", animate);
    window.addEventListener("resize", animate);
    return () => {
      gsap.killTweensOf(element);
      reduced.removeEventListener("change", animate);
      window.removeEventListener("resize", animate);
    };
  }, [revealed]);

  useEffect(() => () => {
    if (moveFrame.current !== null) cancelAnimationFrame(moveFrame.current);
    if (syncFrame.current !== null) cancelAnimationFrame(syncFrame.current);
  }, []);

  useEffect(() => { revealedRef.current = revealed; }, [revealed]);

  const setOrigin = useCallback((x: number, y: number) => {
    const element = root.current;
    if (!element) return;
    pendingPoint.current = { x, y };
    if (moveFrame.current !== null) return;
    moveFrame.current = requestAnimationFrame(() => {
      const point = pendingPoint.current;
      const frameBounds = bounds.current ?? element.getBoundingClientRect();
      moveFrame.current = null;
      if (!point || frameBounds.width === 0 || frameBounds.height === 0) return;
      const localX = Math.min(100, Math.max(0, (point.x - frameBounds.left) / frameBounds.width * 100));
      const localY = Math.min(100, Math.max(0, (point.y - frameBounds.top) / frameBounds.height * 100));
      element.style.setProperty("--origin-x", `${localX}%`);
      element.style.setProperty("--origin-y", `${localY}%`);
    });
  }, []);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const isProjectsVisible = () => Number(document.documentElement.dataset.projectsProgress ?? "0") > 0.001;
    const syncHover = () => {
      const point = lastMouse.current;
      if (!point || isProjectsVisible()) {
        bounds.current = null;
        if (revealedRef.current) {
          revealedRef.current = false;
          setRevealed(false);
        }
        return;
      }
      const hitTarget = document.elementFromPoint(point.x, point.y);
      const isOverPortrait = hitTarget !== null && element.contains(hitTarget);
      if (!isOverPortrait) {
        bounds.current = null;
        if (revealedRef.current) {
          revealedRef.current = false;
          setRevealed(false);
        }
        return;
      }
      bounds.current = element.getBoundingClientRect();
      setOrigin(point.x, point.y);
      if (!revealedRef.current) {
        revealedRef.current = true;
        setRevealed(true);
      }
    };
    const queueSync = () => {
      if (syncFrame.current !== null) return;
      syncFrame.current = requestAnimationFrame(() => {
        syncFrame.current = null;
        syncHover();
      });
    };
    const onPointerMove = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      lastMouse.current = { x: event.clientX, y: event.clientY };
      queueSync();
    };
    const observer = new MutationObserver(() => {
      if (isProjectsVisible()) {
        if (revealedRef.current) {
          revealedRef.current = false;
          setRevealed(false);
        }
        return;
      }
      queueSync();
    });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-projects-progress"] });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      observer.disconnect();
      if (syncFrame.current !== null) cancelAnimationFrame(syncFrame.current);
    };
  }, [setOrigin]);

  const handlePointerEnter = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse") {
      bounds.current = event.currentTarget.getBoundingClientRect();
      setOrigin(event.clientX, event.clientY);
      setRevealed(true);
    }
  };

  const handlePointerLeave = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse") {
      bounds.current = null;
      setRevealed(false);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    inputType.current = event.pointerType;
    bounds.current = event.currentTarget.getBoundingClientRect();
    if (!revealed) setOrigin(event.clientX, event.clientY);
  };

  return (
    <button
      ref={root}
      type="button"
      className={`${styles.portrait} ${revealed ? styles.isRevealed : ""} ${mobileImage === 1 ? styles.mobileAlternate : ""} ${mobileTransitioning ? styles.mobileTransitioning : ""}`}
      aria-label="Preview alternate portrait"
      aria-pressed={revealed}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerMove={(event) => {
        if (event.pointerType === "mouse" && Number(document.documentElement.dataset.projectsProgress ?? "0") <= 0.001) {
          setOrigin(event.clientX, event.clientY);
          revealedRef.current = true;
          setRevealed(true);
        }
      }}
      onPointerDown={handlePointerDown}
      onClick={(event) => {
        if (window.matchMedia("(max-width: 767px)").matches) {
          mobileReplay.current();
          return;
        }
        if (event.detail === 0 || inputType.current !== "mouse") {
          setRevealed((current) => !current);
        }
      }}
    >
      <Image
        src="/hero-justchaniago.png"
        alt="Just Chaniago wearing sunglasses"
        width={1448}
        height={1086}
        priority
        sizes="(max-width: 640px) 345vw, (max-width: 1024px) 100vw, 85vw"
        className={`${styles.image} ${styles.baseImage}`}
      />
      <Image
        src="/hero-justchaniago-left.png"
        alt=""
        width={1448}
        height={1086}
        loading="eager"
        sizes="(max-width: 640px) 345vw, (max-width: 1024px) 100vw, 85vw"
        className={`${styles.image} ${styles.revealImage}`}
      />
      <canvas ref={canvas} className={styles.pixelCanvas} aria-hidden="true" />
    </button>
  );
}
