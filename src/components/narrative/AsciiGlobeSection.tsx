"use client";

import { useEffect, useRef, useState } from "react";
import { createLandSampler, SURABAYA, type LandPolygon } from "./globeData";
import styles from "./AsciiGlobeSection.module.css";

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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const label = labelRef.current;
    const scroller = section?.closest<HTMLElement>("main");
    if (!section || !canvas || !scroller || !label) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const controller = new AbortController();
    let sampler: ReturnType<typeof createLandSampler> | undefined;
    let width = 0, height = 0, dpr = 1, top = 0, travel = 1;
    let target = 0, current = 0, raf = 0, last = 0;
    let visible = false, disposed = false;

    const draw = () => {
      if (!sampler) return;
      const p = reduced.matches ? 1 : current;
      const zoom = phase(p, 0.32, 0.84);
      const flatten = phase(p, 0.52, 0.84);
      const pin = phase(p, 0.84, 0.96);
      const focus = phase(p, 0, 0.34);
      const lon0 = mix(32, 118, focus) * RAD;
      const lat0 = mix(14, -2.5, focus) * RAD;
      const sinLat = Math.sin(lat0), cosLat = Math.cos(lat0);
      const cx = width / 2, cy = height * 0.53;
      const scale = Math.min((width - 32) / 50, Math.max(4, height - 190) / 22);
      const radius = mix(Math.min(width * 0.43, height * 0.34), scale / RAD, zoom);
      // Sample in screen space: no overlapping glyphs, projection singularities or back-face bleed.
      const cell = width < 600 ? 4 : 6;
      const row = cell * 1.25;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      ctx.font = `600 ${cell + 2}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const palette = ":+x#%@";
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
          const light = clamp(0.56 + z * 0.38 - nx * 0.2 + ny * 0.12);
          if (land) {
            const alpha = land === 2 ? 1 : mix(0.78 + light * 0.22, 0.18, flatten);
            ctx.fillStyle = land === 2 && zoom > 0.6 ? `rgba(115,24,48,${alpha})` : `rgba(18,22,26,${alpha})`;
            ctx.fillText(palette[Math.min(5, Math.floor(light * 6))], x, y);
          } else if (flatten < 0.99) {
            ctx.fillStyle = `rgba(65,75,85,${(0.20 + z * 0.14) * (1 - flatten)})`;
            ctx.fillText(".", x, y);
          }
        }
      }
      const px = cx + (SURABAYA.lon - 118) * scale;
      const py = cy - (SURABAYA.lat + 2.5) * scale;
      if (pin > 0) {
        ctx.globalAlpha = pin;
        ctx.strokeStyle = "#a01838";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, 11 + (1 - pin) * 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#a01838";
        ctx.font = "bold 16px monospace";
        ctx.fillText("+", px, py);
        const labelY = Math.min(height - 104, py + 64);
        ctx.beginPath();
        ctx.moveTo(px, py + 15);
        ctx.lineTo(px, labelY - 12);
        ctx.stroke();
        label.style.left = `${Math.max(100, Math.min(width - 100, px))}px`;
        label.style.top = `${labelY}px`;
        ctx.globalAlpha = 1;
      }
      label.style.opacity = String(pin);
    };

    const tick = (time: number) => {
      raf = 0;
      if (!visible || document.hidden || disposed) return;
      const dt = Math.min(50, time - (last || time - 16));
      last = time;
      current += (target - current) * (1 - Math.exp(-dt / 65));
      if (Math.abs(target - current) < 0.0001) current = target;
      draw();
      if (current !== target && !reduced.matches) raf = requestAnimationFrame(tick);
    };
    const wake = () => { if (!raf && !disposed) raf = requestAnimationFrame(tick); };
    const scroll = () => { target = clamp((scroller.scrollTop - top) / travel); wake(); };
    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      top = section.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      travel = Math.max(1, section.offsetHeight - height);
      scroll();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { last = 0; wake(); }
    }, { root: scroller });
    observer.observe(section);
    const size = new ResizeObserver(resize);
    size.observe(canvas);
    size.observe(section);
    if (section.parentElement) size.observe(section.parentElement);
    scroller.addEventListener("scroll", scroll, { passive: true });
    reduced.addEventListener("change", wake);
    document.addEventListener("visibilitychange", wake);
    resize();
    fetch("/maps/earth.json", { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Map unavailable"); return response.json(); })
      .then((data: LandPolygon[]) => {
        if (disposed) return;
        sampler = createLandSampler(data);
        wake();
      })
      .catch(() => { if (!disposed) setFailed(true); });
    return () => {
      disposed = true;
      controller.abort();
      cancelAnimationFrame(raf);
      observer.disconnect();
      size.disconnect();
      scroller.removeEventListener("scroll", scroll);
      reduced.removeEventListener("change", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.section} aria-label="From the world to Surabaya, Indonesia">
      <div className={styles.stickyContainer}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <p className={styles.caption}>A world of possibilities. A place to call home.</p>
        <div ref={labelRef} className={styles.location}>
          <strong>SURABAYA, ID</strong>
          <span>7.2575° S · 112.7521° E</span>
        </div>
        {failed && <p className={styles.fallback}>Surabaya, Indonesia · 7.2575° S, 112.7521° E</p>}
        <p className={styles.accessible}>An ASCII globe rotates toward Indonesia and expands into a map of the archipelago. Surabaya, East Java is marked at 7.2575 degrees south, 112.7521 degrees east.</p>
      </div>
    </section>
  );
}
