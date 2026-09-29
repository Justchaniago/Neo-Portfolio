"use client";

import { useEffect, useRef } from "react";
import { createRadialBurst } from "./radialBurst";
import styles from "./NarrativeSection.module.css";

const lines = [
  "I build software, AI systems, automation,",
  "and all the invisible things that make them work.",
  "But the interesting part is how they work together.",
];
// Draft copy, isolated for editorial tuning.
const taglines = ["Different parts. One system.", "Connected by purpose.", "Built here. Reaching beyond."];
const drift = [
  [-110, -160, -18], [140, -90, 16], [-80, 150, -12], [180, 170, 22], [-160, 60, -15],
  [90, -170, 14], [-210, -60, -24], [150, 130, 12], [-120, 220, -19], [220, -130, 25],
  [-150, 90, -14], [130, -210, 18], [-190, 160, -22], [170, 50, 16], [-90, -150, -16],
  [140, 190, 13], [-180, -110, -25], [210, 120, 22], [-130, 180, -17], [90, -140, 15],
  [-200, 40, -20], [160, -190, 19], [-100, 130, -13], [200, -50, 24], [-160, 200, -18],
  [120, 70, 11], [-220, -150, -26], [150, 170, 17], [-80, -210, -14], [190, 90, 21],
];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const phase = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const ease = (v: number) => v * v * (3 - 2 * v);
const READING_START = 0.35;
const READING_END = 0.855;
const READING_SECONDS = 10.8;
const LOCK_SOURCE = "narrative-reading";

export function NarrativeSection() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = section.current, visual = stage.current, copy = copyRef.current, canvas = canvasRef.current;
    const scroller = element?.closest<HTMLElement>("main");
    if (!element || !visual || !copy || !canvas || !scroller) return;
    const burst = createRadialBurst(canvas);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
    const captions = Array.from(visual.querySelectorAll<HTMLElement>("[data-tagline]"));
    const words = Array.from(copy.querySelectorAll<HTMLElement>("[data-narrative-word]")).map(el => ({
      el, dx: Number(el.dataset.driftX), dy: Number(el.dataset.driftY), rot: Number(el.dataset.driftRot),
      cx: 0, cy: 0, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0,
    }));
    let target = 0, current = 0, previous = 0, speed = 0, raf = 0, last = 0;
    let top = 0, travel = 1, width = 1, height = 1, viewTop = 0, viewLeft = 0;
    let visible = false, disposed = false;
    let mx = -9999, my = -9999, mouseVX = 0, mouseVY = 0;
    let reading = false, readingDone = false, readingTime = 0;
    let inputDistance = 0, inputVelocity = 0, touchY: number | null = null;
    const externalLocks = new Set<string>();

    const setReadingLock = (locked: boolean) => {
      window.dispatchEvent(new CustomEvent("portfolio:scroll-lock", { detail: { source: LOCK_SOURCE, locked } }));
    };
    const finishReading = (destination?: number) => {
      if (!reading) return;
      reading = false;
      if (destination !== undefined) {
        current = target = previous = destination;
        scroller.scrollTop = top + travel * destination;
      }
      setReadingLock(false);
    };

    const render = (time: number) => {
      raf = 0;
      if (reduced.matches) finishReading();
      if (!visible || document.hidden || disposed || reduced.matches) { last = 0; return; }
      const dt = Math.min(0.05, Math.max(0.001, (time - (last || time - 16.67)) / 1000));
      last = time;
      current += (target - current) * (1 - Math.exp(-dt / 0.075));
      if (Math.abs(target - current) < 0.00001) current = target;
      // Viewports/second makes the response consistent across section lengths.
      // Ease into acceleration, then coast back to idle more slowly.
      const scrollVelocity = Math.abs(current - previous) * travel / height / dt;
      inputVelocity = Math.max(inputVelocity * Math.exp(-dt / 0.16), inputDistance / height / dt);
      inputDistance = 0;
      const velocity = reading ? inputVelocity : scrollVelocity;
      const requestedSpeed = 1 - Math.exp(-velocity / 3);
      const response = requestedSpeed > speed ? 0.18 : 0.9;
      speed += (requestedSpeed - speed) * (1 - Math.exp(-dt / response));
      previous = current;
      if (reading && externalLocks.size === 0) readingTime = Math.min(READING_SECONDS, readingTime + dt);
      const p = reading ? READING_START + 0.495 * readingTime / READING_SECONDS : current;
      const entrance = ease(phase(p, 0, 0.065));
      const fade = 1 - ease(phase(p, 0.205, 0.285));
      const rise = (1 - entrance) * height * 0.34;
      copy.style.opacity = String(entrance * fade);
      copy.style.transform = "translate3d(0," + rise + "px,0)";
      const scatter = phase(p, 0.065, 0.225);
      const factor = Math.pow(scatter, 1.35) * 3.5;
      const scale = Math.min(1, width / 1000, height / 650);
      const recall = Math.min(1, Math.pow(scatter, 1.2) * 1.6);
      if (fade > 0) for (const word of words) {
        const dx = word.cx + word.tx - mx, dy = word.cy + rise + word.ty - my;
        const distance = Math.hypot(dx, dy);
        if (finePointer.matches && scatter > 0.04 && distance > 0.1 && distance < 160) {
          const proximity = 1 - distance / 160;
          word.vx += (dx / distance * proximity ** 2 * 9 + mouseVX * proximity * 0.45) * dt * 60;
          word.vy += (dy / distance * proximity ** 2 * 9 + mouseVY * proximity * 0.45) * dt * 60;
        }
        word.vx *= Math.pow(0.92, dt * 60); word.vy *= Math.pow(0.92, dt * 60);
        word.x = Math.max(-500, Math.min(500, word.x + word.vx * dt * 60));
        word.y = Math.max(-400, Math.min(400, word.y + word.vy * dt * 60));
        if (scatter <= 0.001) word.x = word.y = word.vx = word.vy = 0;
        word.tx = word.dx * factor * scale + word.x * recall;
        word.ty = word.dy * factor * scale + word.y * recall;
        word.el.style.transform = "translate3d(" + word.tx + "px," + word.ty + "px,0) rotate(" + (word.rot * factor + word.x * recall * 0.04) + "deg)";
      }
      mouseVX *= Math.pow(0.85, dt * 60); mouseVY *= Math.pow(0.85, dt * 60);
      const reveal = ease(phase(p, 0.225, 0.345));
      const intensity = reveal * (1 - ease(phase(p, 0.855, 0.94)));
      burst.draw(dt, intensity, speed, reveal);
      captions.forEach((caption, i) => {
        const start = 0.35 + i * 0.165;
        const enter = ease(phase(p, start, start + 0.035));
        const leave = ease(phase(p, start + 0.125, start + 0.16));
        caption.style.opacity = String(enter * (1 - leave));
        caption.style.transform = "translate3d(0," + ((1 - enter) * 18 - leave * 12) + "px,0)";
      });
      visual.style.setProperty("--window-progress", String(ease(phase(p, 0.895, 0.99))));
      if (reading && readingTime >= READING_SECONDS) {
        readingDone = true;
        finishReading(READING_END);
      }
      if (intensity > 0 || p < 0.29 || current !== target || speed > 0.001) raf = requestAnimationFrame(render);
    };
    const wake = () => { if (!raf && visible && !reduced.matches && !document.hidden && !disposed) raf = requestAnimationFrame(render); };
    const scroll = () => {
      target = clamp((scroller.scrollTop - top) / travel);
      if (!reading && target < 0.3) readingDone = false;
      if (!reading && !readingDone && !reduced.matches && externalLocks.size === 0 && target >= READING_START && scroller.scrollTop >= top) {
        reading = true; readingTime = 0; inputDistance = 0;
        current = target = previous = READING_START;
        setReadingLock(true);
        scroller.scrollTop = top + travel * READING_START;
      }
      wake();
    };
    const measure = () => {
      if (disposed) return;
      // CSS can resize the section before the media-query change event arrives.
      if (reduced.matches) finishReading();
      const bounds = scroller.getBoundingClientRect();
      top = element.getBoundingClientRect().top - bounds.top + scroller.scrollTop;
      width = visual.clientWidth; height = visual.clientHeight;
      viewTop = bounds.top; viewLeft = visual.getBoundingClientRect().left;
      travel = Math.max(1, element.offsetHeight - height);
      words.forEach(word => {
        let x = word.el.offsetWidth / 2, y = word.el.offsetHeight / 2;
        let node: HTMLElement | null = word.el;
        while (node && node !== visual) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent as HTMLElement | null; }
        word.cx = x; word.cy = y;
      });
      visual.style.setProperty("--portal-scale-x", String(width / Math.min(width * 0.22, 240) * 1.6));
      visual.style.setProperty("--portal-scale-y", String(height / Math.min(height * 0.28, 290) * 1.8));
      burst.resize(width, height);
      if (reading) scroller.scrollTop = top + travel * READING_START;
      scroll();
    };
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const x = event.clientX - viewLeft, y = event.clientY - viewTop;
      if (mx > -1000) { mouseVX = Math.max(-30, Math.min(30, x - mx)); mouseVY = Math.max(-30, Math.min(30, y - my)); }
      mx = x; my = y; wake();
    };
    const leave = () => { mx = my = -9999; mouseVX = mouseVY = 0; };
    const motionChange = () => { finishReading(); cancelAnimationFrame(raf); raf = 0; last = 0; current = target; measure(); };
    const drive = (delta: number) => {
      if (delta < -0.5) { finishReading(0.29); return; }
      inputDistance += Math.min(height * 3, Math.abs(delta));
      wake();
    };
    const wheel = (event: WheelEvent) => {
      if (!reading || externalLocks.size > 0 || event.ctrlKey) return;
      event.preventDefault();
      drive(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1));
    };
    const touchStart = (event: TouchEvent) => { touchY = event.touches.length === 1 ? event.touches[0].clientY : null; };
    const touchMove = (event: TouchEvent) => {
      if (touchY === null || event.touches.length !== 1) return;
      const next = event.touches[0].clientY, delta = touchY - next;
      touchY = next;
      if (!reading || externalLocks.size > 0) return;
      event.preventDefault(); drive(delta);
    };
    const touchEnd = () => { touchY = null; };
    const keyboard = (event: KeyboardEvent) => {
      if (!reading || externalLocks.size > 0 || event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLElement && event.target.closest("input,textarea,select,button,a,[contenteditable]"))) return;
      if (["ArrowDown", "PageDown", " ", "End"].includes(event.key)) { event.preventDefault(); drive(event.shiftKey ? -height : height * 0.35); }
      else if (["ArrowUp", "PageUp", "Home", "Escape"].includes(event.key)) { event.preventDefault(); finishReading(0.29); }
    };
    const navigation = () => { readingDone = true; finishReading(); };
    const lockChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ source?: string; locked?: boolean }>).detail;
      if (!detail?.source || detail.source === LOCK_SOURCE) return;
      if (detail.locked) externalLocks.add(detail.source); else externalLocks.delete(detail.source);
    };
    const visibility = () => { last = 0; if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake(); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { last = 0; scroll(); } else { cancelAnimationFrame(raf); raf = 0; last = 0; }
    }, { root: scroller });
    observer.observe(element);
    const resize = new ResizeObserver(measure);
    resize.observe(visual); resize.observe(element); resize.observe(copy); resize.observe(scroller);
    if (element.parentElement) resize.observe(element.parentElement);
    scroller.addEventListener("scroll", scroll, { passive: true });
    scroller.addEventListener("wheel", wheel, { passive: false, capture: true });
    scroller.addEventListener("touchstart", touchStart, { passive: true, capture: true });
    scroller.addEventListener("touchmove", touchMove, { passive: false, capture: true });
    scroller.addEventListener("touchend", touchEnd, { passive: true });
    scroller.addEventListener("touchcancel", touchEnd, { passive: true });
    window.addEventListener("keydown", keyboard);
    window.addEventListener("portfolio:go-home", navigation);
    window.addEventListener("portfolio:request-section", navigation);
    window.addEventListener("portfolio:toggle-projects", navigation);
    window.addEventListener("portfolio:scroll-lock", lockChanged);
    visual.addEventListener("pointermove", pointer, { passive: true });
    visual.addEventListener("pointerleave", leave);
    reduced.addEventListener("change", motionChange);
    document.addEventListener("visibilitychange", visibility);
    void document.fonts.ready.then(measure);
    measure();
    return () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect(); resize.disconnect();
      finishReading();
      scroller.removeEventListener("scroll", scroll); visual.removeEventListener("pointermove", pointer);
      scroller.removeEventListener("wheel", wheel, true);
      scroller.removeEventListener("touchstart", touchStart, true);
      scroller.removeEventListener("touchmove", touchMove, true);
      scroller.removeEventListener("touchend", touchEnd);
      scroller.removeEventListener("touchcancel", touchEnd);
      window.removeEventListener("keydown", keyboard);
      window.removeEventListener("portfolio:go-home", navigation);
      window.removeEventListener("portfolio:request-section", navigation);
      window.removeEventListener("portfolio:toggle-projects", navigation);
      window.removeEventListener("portfolio:scroll-lock", lockChanged);
      visual.removeEventListener("pointerleave", leave); reduced.removeEventListener("change", motionChange);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return (
    <section ref={section} className={styles.section} aria-label="A little about the work">
      <div ref={stage} className={styles.stage}>
        <canvas ref={canvasRef} className={styles.burst} aria-hidden="true" />
        <div ref={copyRef} className={styles.copy}>
          {lines.map((line, lineIndex) => (
            <p key={line} className={styles.line}>
              {line.split(" ").map((word, index) => {
                const [x, y, rotation] = drift[(lineIndex * 10 + index) % drift.length];
                return <span key={index} data-narrative-word data-drift-x={x} data-drift-y={y} data-drift-rot={rotation} className={styles.word}>{word}{" "}</span>;
              })}
            </p>
          ))}
        </div>
        <div className={styles.taglines}>
          {taglines.map(text => <p key={text} data-tagline className={styles.tagline}>{text}</p>)}
        </div>
        <div className={styles.window} aria-hidden="true" />
      </div>
    </section>
  );
}
