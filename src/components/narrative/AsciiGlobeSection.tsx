"use client";

import { useEffect, useRef, useState } from "react";
import { getPerformanceProfile, onPerformanceTierChange } from "@/lib/performanceTier";
import { createLandSampler, SURABAYA, type LandPolygon } from "./globeData";
import styles from "./AsciiGlobeSection.module.css";
import { createAsciiSweep } from "./asciiSweep";

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const phase = (p: number, a: number, b: number) => {
  const t = clamp((p - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const RAD = Math.PI / 180;

export function AsciiGlobeSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const label = labelRef.current;
    const caption = captionRef.current;
    const clock = clockRef.current;
    const scroller = section?.closest<HTMLElement>("main");
    if (!section || !canvas || !scroller || !label || !caption) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const controller = new AbortController();
    let perf = getPerformanceProfile();
    let sampler: ReturnType<typeof createLandSampler> | undefined;
    let width = 0, height = 0, dpr = 1, top = 0, travel = 1;
    let canvasLeft = 0, canvasTop = 0;
    let target = 0, current = 0, raf = 0, last = 0;
    let visible = false, disposed = false;
    let touchPointer: number | null = null;
    let lastPointer: { x: number; y: number; time: number } | null = null;
    let tiltX = 0, tiltY = 0, targetTiltX = 0, targetTiltY = 0;
    let globeTravel = 1, cached = false, lastRenderedP = -1;
    let clockTimer: number | undefined;
    const sweep = createAsciiSweep();
    const settledMap = document.createElement("canvas");
    const settledCtx = settledMap.getContext("2d")!;

    let timeFormatter: Intl.DateTimeFormat | null = null;
    try {
      timeFormatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      timeFormatter = null;
    }

    const updateClock = () => {
      if (!clock) return;
      if (timeFormatter) {
        clock.textContent = `${timeFormatter.format(new Date())} WIB · UTC+7`;
      } else {
        clock.textContent = "UTC+7 · WIB";
      }
    };
    updateClock();

    const drawMap = (p: number) => {
      if (!sampler) return;
      const entrance = phase(p, 0, 0.26);
      const zoom = phase(p, 0.30, 0.82);
      const flatten = phase(p, 0.48, 0.82);
      const pin = phase(p, 0.80, 0.95);
      const focus = phase(p, 0.02, 0.36);
      const lon0 = mix(28, 118, focus) * RAD;
      const lat0 = mix(16, -2.5, focus) * RAD;
      const sinLat = Math.sin(lat0), cosLat = Math.cos(lat0);
      const cx = width / 2, cy = height * 0.52;
      const scale = Math.min((width - 32) / 50, Math.max(4, height - 190) / 22);
      // Camera dolly zoom: starts at 52% scale inside the distant portal archway and rushes forward to 100%
      const baseRadius = Math.min(width * 0.43, height * 0.35) * (0.52 + 0.48 * entrance);
      const radius = mix(baseRadius, scale / RAD, zoom);
      // Sample in screen space: no overlapping glyphs, projection singularities or back-face bleed.
      const cell = (width < 600 ? 4 : 6) + perf.asciiCellBoost;
      const row = cell * 1.25;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      ctx.font = `600 ${cell + 2}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const palette = ":+x#%@";
      let currentFill = "";
      for (let y = 100; y < height - 48; y += row) {
        for (let x = cell; x < width; x += cell) {
          const nx = (x - cx) / radius, ny = (cy - y) / radius;
          const distance = nx * nx + ny * ny;
          if (distance >= 1) continue;
          const z = Math.sqrt(1 - distance);
          const latSphere = Math.asin(z * sinLat + ny * cosLat) / RAD;
          const lonSphere = (lon0 + Math.atan2(nx, z * cosLat - ny * sinLat)) / RAD;
          const lon = mix(lonSphere, 118 + (x - cx) / scale, flatten);
          const lat = mix(latSphere, -2.5 + (cy - y) / scale, flatten);
          const land = sampler(lon, lat);
          const light = clamp(0.54 + z * 0.40 - nx * 0.22 + ny * 0.14);
          if (land) {
            const isIndonesia = land === 2;
            const alpha = isIndonesia ? 1 : mix(0.80 + light * 0.20, 0.16, flatten);
            const nextFill = isIndonesia && zoom > 0.45 ? "#8e1432" : "#101418";
            if (currentFill !== nextFill) {
              currentFill = nextFill;
              ctx.fillStyle = nextFill;
            }
            ctx.globalAlpha = alpha;
            const glyphIndex = isIndonesia && zoom > 0.45
              ? Math.min(5, Math.max(3, Math.floor(light * 6) + 1))
              : Math.min(5, Math.floor(light * 6));
            ctx.fillText(palette[glyphIndex], x, y);
          } else if (flatten < 0.99) {
            const rim = distance > 0.84 ? 1.35 : 1;
            const graticule = (Math.abs(latSphere % 15) < 1.1 || Math.abs(lonSphere % 15) < 1.1) ? 1.3 : 1;
            const oceanAlpha = clamp((0.18 + z * 0.15) * rim * graticule * (1 - flatten));
            if (currentFill !== "#3c4854") {
              currentFill = "#3c4854";
              ctx.fillStyle = "#3c4854";
            }
            ctx.globalAlpha = oceanAlpha;
            ctx.fillText(distance > 0.88 ? ":" : ".", x, y);
          }
        }
      }
      ctx.globalAlpha = 1;
      const px = cx + (SURABAYA.lon - 118) * scale;
      const py = cy - (SURABAYA.lat + 2.5) * scale;
      if (pin > 0) {
        ctx.globalAlpha = pin;
        // Outer subtle pulse ring
        ctx.strokeStyle = `rgba(160,24,56,${0.28 * pin})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, 20 + (1 - pin) * 18, 0, Math.PI * 2);
        ctx.stroke();

        // Primary reticle ring
        ctx.strokeStyle = "#a01838";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(px, py, 10 + (1 - pin) * 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#a01838";
        ctx.font = "bold 15px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText("+", px, py);
        const labelY = Math.min(height - 104, py + 62);
        ctx.beginPath();
        ctx.moveTo(px, py + 14);
        ctx.lineTo(px, labelY - 14);
        ctx.stroke();
        label.style.left = `${Math.max(104, Math.min(width - 104, px))}px`;
        label.style.top = `${labelY}px`;
        ctx.globalAlpha = 1;
      }
      label.style.opacity = String(pin);
      label.style.transform = `translate3d(-50%, ${(1 - pin) * 10}px, 0)`;
    };

    const draw = () => {
      if (!sampler) return;
      const distance = current * travel;
      const p = reduced.matches ? 1 : clamp(distance / Math.max(1, globeTravel));
      const extra = reduced.matches ? 0 : clamp((distance - globeTravel) / Math.max(1, height * 2.4));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (cached && Math.abs(p - lastRenderedP) < 0.0004) {
        ctx.drawImage(settledMap, 0, 0, width, height);
      } else {
        drawMap(p);
        settledCtx.setTransform(1, 0, 0, 1, 0, 0);
        settledCtx.drawImage(canvas, 0, 0);
        cached = true;
        lastRenderedP = p;
      }
      sweep.draw(ctx, extra);
      const scale = Math.min((width - 32) / 50, Math.max(4, height - 190) / 22);
      const px = width / 2 + (SURABAYA.lon - 118) * scale;
      const py = height * 0.52 - (SURABAYA.lat + 2.5) * scale;
      const pinProgress = phase(p, 0.80, 0.95) * (1 - sweep.covered(px, py, extra));
      label.style.opacity = String(pinProgress);
      label.style.transform = `translate3d(calc(-50% + ${(tiltX * 8).toFixed(1)}px), ${((1 - pinProgress) * 10 + tiltY * 6).toFixed(1)}px, 0)`;
      caption.style.opacity = String(phase(p, 0.16, 0.30) * (1 - phase(extra, 0.22, 0.34)));
    };

    const tick = (time: number) => {
      raf = 0;
      if (!visible || document.hidden || disposed) return;
      const dt = Math.min(50, time - (last || time - 16));
      last = time;
      current += (target - current) * (1 - Math.exp(-dt / 62));
      if (Math.abs(target - current) < 0.0001) current = target;
      tiltX += (targetTiltX - tiltX) * (1 - Math.exp(-dt / 90));
      tiltY += (targetTiltY - tiltY) * (1 - Math.exp(-dt / 90));
      const surfaceMoving = !reduced.matches && sweep.updateMotion(dt);
      const tiltMoving = Math.abs(targetTiltX - tiltX) > 0.001 || Math.abs(targetTiltY - tiltY) > 0.001;
      draw();
      if ((current !== target || surfaceMoving || tiltMoving) && !reduced.matches) {
        raf = requestAnimationFrame(tick);
      }
    };
    const wake = () => { if (!raf && !disposed && visible && !document.hidden) raf = requestAnimationFrame(tick); };
    const scroll = () => {
      const nextTarget = clamp((scroller.scrollTop - top) / travel);
      if (Math.abs(nextTarget - target) < 0.0001 && Math.abs(nextTarget - current) < 0.0001) return;
      target = nextTarget;
      wake();
    };
    const moveSurface = (event: PointerEvent) => {
      if (reduced.matches || !visible) return;
      const x = event.clientX - canvasLeft;
      const y = event.clientY - canvasTop;
      targetTiltX = clamp(x / Math.max(1, width)) * 2 - 1;
      targetTiltY = clamp(y / Math.max(1, height)) * 2 - 1;
      wake();
      const extra = clamp((current * travel - globeTravel) / Math.max(1, height * 2.4));
      if (extra <= 0.24 || extra >= 0.99) { lastPointer = null; return; }
      const now = performance.now();
      if (lastPointer && now - lastPointer.time < 160) {
        sweep.drag(x, y, x - lastPointer.x, y - lastPointer.y);
        wake();
      }
      lastPointer = { x, y, time: now };
    };
    const pointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || (touchPointer !== null && event.pointerId === touchPointer)) moveSurface(event);
    };
    const pointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      touchPointer = event.pointerId;
      lastPointer = null;
      moveSurface(event);
    };
    const pointerEnd = (event: PointerEvent) => {
      if (event.pointerId === touchPointer) {
        touchPointer = null;
        lastPointer = null;
      }
    };
    const pointerLeave = () => { lastPointer = null; touchPointer = null; targetTiltX = 0; targetTiltY = 0; wake(); };
    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const canvasRect = canvas.getBoundingClientRect();
      canvasLeft = canvasRect.left;
      canvasTop = canvasRect.top;
      dpr = Math.min(devicePixelRatio || 1, perf.maxCanvasDpr);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      settledMap.width = canvas.width; settledMap.height = canvas.height;
      cached = false;
      lastRenderedP = -1;
      const header = document.querySelector("header");
      const headerBottom = header ? Math.max(header.getBoundingClientRect().bottom,
        ...Array.from(header.querySelectorAll("a,button"), el => el.getBoundingClientRect().bottom)) : 0;
      sweep.resize(width, height, dpr, Math.max(0, headerBottom - scroller.getBoundingClientRect().top), perf.asciiCellBoost);
      pointerLeave();
      top = section.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      travel = Math.max(1, section.offsetHeight - height);
      globeTravel = Math.max(1, travel - (reduced.matches ? 0 : height * 2.4));
      target = clamp((scroller.scrollTop - top) / travel);
      wake();
    };
    const unsubscribePerf = onPerformanceTierChange((nextPerf) => {
      perf = nextPerf;
      resize();
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        const canvasRect = canvas.getBoundingClientRect();
        canvasLeft = canvasRect.left;
        canvasTop = canvasRect.top;
        last = 0;
        updateClock();
        if (clockTimer === undefined) clockTimer = window.setInterval(updateClock, 1000);
        wake();
      } else {
        if (clockTimer !== undefined) {
          window.clearInterval(clockTimer);
          clockTimer = undefined;
        }
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
        pointerLeave();
        sweep.resetMotion();
      }
    }, { root: scroller });
    observer.observe(section);
    const size = new ResizeObserver(resize);
    size.observe(canvas);
    size.observe(section);
    if (section.parentElement) size.observe(section.parentElement);
    scroller.addEventListener("scroll", scroll, { passive: true });
    canvas.addEventListener("pointermove", pointerMove, { passive: true });
    canvas.addEventListener("pointerdown", pointerDown, { passive: true });
    canvas.addEventListener("pointerup", pointerEnd, { passive: true });
    canvas.addEventListener("pointercancel", pointerEnd, { passive: true });
    canvas.addEventListener("pointerleave", pointerLeave, { passive: true });
    reduced.addEventListener("change", resize);
    document.addEventListener("visibilitychange", wake);
    resize();
    fetch("/maps/earth.json", { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Map unavailable"); return response.json(); })
      .then((data: LandPolygon[]) => {
        if (disposed) return;
        sampler = createLandSampler(data);
        cached = false;
        wake();
      })
      .catch(() => { if (!disposed) setFailed(true); });
    return () => {
      disposed = true;
      if (clockTimer !== undefined) window.clearInterval(clockTimer);
      unsubscribePerf();
      controller.abort();
      cancelAnimationFrame(raf);
      observer.disconnect();
      size.disconnect();
      scroller.removeEventListener("scroll", scroll);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointerup", pointerEnd);
      canvas.removeEventListener("pointercancel", pointerEnd);
      canvas.removeEventListener("pointerleave", pointerLeave);
      reduced.removeEventListener("change", resize);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.section} aria-label="From the world to Surabaya, Indonesia">
      <div className={styles.stickyContainer}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <p ref={captionRef} className={styles.caption}>A world of possibilities. A place to call home.</p>
        <div ref={labelRef} className={styles.location}>
          <div className={styles.locationHeader}>
            <span className={styles.liveDot} aria-hidden="true" />
            <strong>SURABAYA, ID</strong>
          </div>
          <span>7.2575° S · 112.7521° E</span>
          <span ref={clockRef} className={styles.localTime}>UTC+7 · WIB</span>
        </div>
        {failed && <p className={styles.fallback}>Surabaya, Indonesia · 7.2575° S, 112.7521° E</p>}
        <p className={styles.accessible}>An ASCII globe rotates toward Indonesia and expands into a map of the archipelago. Surabaya, East Java is marked at 7.2575 degrees south, 112.7521 degrees east.</p>
      </div>
    </section>
  );
}
