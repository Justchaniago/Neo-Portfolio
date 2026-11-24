"use client";

import { useEffect, useRef } from "react";
import { createBurnEdge } from "./burnEdge";
import { ARRIVAL_READY, arrivalAt, availableFlight, HORIZON_PASSED, ramp, sampleArrival, SKY_REVEALED } from "./globeArrival";
import { createRadialBurst } from "./radialBurst";
import styles from "./NarrativeSection.module.css";

const lines = [
  "I build software, AI systems, automation,",
  "and all the invisible things that make them work.",
  "But the interesting part is how they work together.",
];
// Draft copy, isolated for editorial tuning.
const tagline = "Let’s build what comes next at escape velocity.";
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
const READING_START = 0.08;
const READING_END = 0.74;
// Reading may run this far past either end, so a scroll that keeps going leaves at speed.
const READING_OVERRUN = 0.035;
// Reading pace in section progress per second, and how fast it settles after entry.
const READING_PACE = 0.3;
const LOCK_SOURCE = "narrative-reading";

export function NarrativeSection() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const edgeRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const hudFillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = section.current, visual = stage.current, copy = copyRef.current, canvas = canvasRef.current;
    const scroller = element?.closest<HTMLElement>("main");
    if (!element || !visual || !copy || !canvas || !scroller || !edgeRef.current) return;
    const burst = createRadialBurst(canvas);
    const edge = createBurnEdge(edgeRef.current, element);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const contrast = matchMedia("(forced-colors: active)");
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
    const captions = Array.from(visual.querySelectorAll<HTMLElement>("[data-tagline]"));
    const words = Array.from(copy.querySelectorAll<HTMLElement>("[data-narrative-word]")).map(el => ({
      el, dx: Number(el.dataset.driftX), dy: Number(el.dataset.driftY), rot: Number(el.dataset.driftRot),
      cx: 0, cy: 0, exitX: 0, exitY: 0, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0,
    }));
    let target = 0, current = 0, previous = 0, speed = 0, raf = 0, last = 0;
    let top = 0, travel = 1, width = 1, height = 1, viewTop = 0, viewLeft = 0;
    let visible = false, disposed = false;
    let mx = -9999, my = -9999, mouseVX = 0, mouseVY = 0;
    let reading = false, readingDone = false, bypassReading = false, travelling = false;
    let taglineProgress = 0;
    let direction = 1, smoothDirection = 1;
    let inputDistance = 0, inputVelocity = 0, touchY: number | null = null;
    // Signed progress per second, and the reading speed limit as it eases in from the entry speed.
    let rate = 0, pace = READING_PACE;
    let copyHidden = false;
    const externalLocks = new Set<string>();

    const setReadingLock = (locked: boolean) => {
      if (hudRef.current) {
        hudRef.current.dataset.active = String(locked);
      }
      window.dispatchEvent(new CustomEvent("portfolio:scroll-lock", { detail: { source: LOCK_SOURCE, locked } }));
    };
    const finishReading = (destination?: number) => {
      if (!reading) return;
      reading = false;
      if (destination !== undefined) {
        current = previous = destination;
        // Outside reading the section trails the page by 62 ms. Put the page that far ahead,
        // so the section keeps its speed across the release instead of dipping.
        target = destination + rate * 0.062;
        scroller.scrollTop = top + travel * target;
      }
      setReadingLock(false);
      // Hand the pace back to the page scroll instead of restarting it from a standstill.
      if (destination !== undefined && Math.abs(rate) > 0.004) {
        window.dispatchEvent(new CustomEvent("portfolio:scroll-carry", { detail: { velocity: rate * travel } }));
      }
      rate = 0;
    };

    const render = (time: number) => {
      raf = 0;
      if (reduced.matches) finishReading();
      if (!visible || document.hidden || disposed || reduced.matches) { last = 0; return; }
      const dt = Math.min(0.05, Math.max(0.001, (time - (last || time - 16.67)) / 1000));
      last = time;
      const step = (target - current) * (1 - Math.exp(-dt / 0.062));
      if (reading) pace += (READING_PACE - pace) * (1 - Math.exp(-dt / 0.3));
      current += reading ? Math.max(-dt * pace, Math.min(dt * pace, step)) : step;
      if (Math.abs(target - current) < 0.0001) current = target;
      rate = (current - previous) / dt;
      // The page scrolls with the reading, so nothing jumps when the lock releases.
      if (reading) scroller.scrollTop = top + travel * current;
      // Viewports/second makes the response consistent across section lengths.
      // Ease into acceleration, then coast back to idle more slowly.
      const scrollVelocity = Math.abs(current - previous) * travel / height / dt;
      inputVelocity = Math.max(inputVelocity * Math.exp(-dt / 0.16), inputDistance / height / dt);
      inputDistance = 0;
      const velocity = reading ? inputVelocity : scrollVelocity;
      const requestedSpeed = 1 - Math.exp(-velocity / 3);
      const response = requestedSpeed > speed ? 0.18 : 0.9;
      speed += (requestedSpeed - speed) * (1 - Math.exp(-dt / response));
      if (!reading && Math.abs(current - previous) > 0.00001) direction = Math.sign(current - previous);
      previous = current;
      smoothDirection += (direction - smoothDirection) * (1 - Math.exp(-dt / 0.12));
      const p = current;
      // The burst follows scroll velocity; the caption trails on its own, calmer track.
      taglineProgress += (p - taglineProgress) * (1 - Math.exp(-dt / 0.22));
      visual.style.setProperty("--stage-entry", String(ease(phase(p, 0, 0.04))));
      const entrance = ease(phase(p, 0, 0.075));
      const rise = (1 - entrance) * height * 0.28;
      // Hold the fully revealed copy briefly before sending each word off-canvas.
      const scatter = phase(p, 0.16, 0.38);
      const wordFade = 1 - ease(phase(scatter, 0.72, 0.98));
      let hasWordMotion = false;

      if (wordFade <= 0.001 && scatter >= 0.999) {
        if (!copyHidden) {
          copyHidden = true;
          copy.style.opacity = "0";
          copy.style.visibility = "hidden";
        }
      } else {
        if (copyHidden) {
          copyHidden = false;
          copy.style.visibility = "visible";
        }
        copy.style.opacity = String(entrance);
        copy.style.transform = "translate3d(0," + rise + "px,0) scale(" + (0.96 + entrance * 0.04) + ")";
        const factor = Math.pow(scatter, 1.3) * 3.4;
        const scale = Math.min(1, width / 1000, height / 650);
        const recall = Math.min(1, Math.pow(scatter, 1.2) * 1.6);
        const exitBlend = ease(scatter);
        for (const word of words) {
          const dx = word.cx + word.tx - mx, dy = word.cy + rise + word.ty - my;
          const distance = Math.hypot(dx, dy);
          if (finePointer.matches && scatter > 0.03 && distance > 0.1 && distance < 175) {
            const proximity = 1 - distance / 175;
            word.vx += (dx / distance * proximity ** 2 * 10 + mouseVX * proximity * 0.48) * dt * 60;
            word.vy += (dy / distance * proximity ** 2 * 10 + mouseVY * proximity * 0.48) * dt * 60;
          }
          word.vx *= Math.pow(0.92, dt * 60); word.vy *= Math.pow(0.92, dt * 60);
          word.x = Math.max(-500, Math.min(500, word.x + word.vx * dt * 60));
          word.y = Math.max(-400, Math.min(400, word.y + word.vy * dt * 60));
          if (scatter <= 0.001) word.x = word.y = word.vx = word.vy = 0;
          if (Math.abs(word.vx) > 0.02 || Math.abs(word.vy) > 0.02) hasWordMotion = true;
          word.tx = word.dx * factor * scale * (1 - exitBlend) + word.exitX * exitBlend + word.x * recall * (1 - scatter);
          word.ty = word.dy * factor * scale * (1 - exitBlend) + word.exitY * exitBlend + word.y * recall * (1 - scatter);
          word.el.style.opacity = String(wordFade);
          word.el.style.transform = "translate3d(" + word.tx + "px," + word.ty + "px,0) rotate(" + (word.rot * factor * (1 - exitBlend) + word.x * recall * (1 - scatter) * 0.04) + "deg)";
        }
      }
      mouseVX *= Math.pow(0.85, dt * 60); mouseVY *= Math.pow(0.85, dt * 60);
      const reveal = ease(phase(p, 0.30, 0.46));
      const burstExit = ease(phase(p, 0.62, 0.74));
      const destination = availableFlight(scroller, arrivalAt(p));
      const flight = sampleArrival(scroller, destination, time);

      if (flight < SKY_REVEALED) burst.draw(dt, reveal, speed, smoothDirection, reveal, burstExit, flight);

      captions.forEach(caption => {
        const enter = ease(phase(taglineProgress, 0.40, 0.50));
        const leave = ease(phase(taglineProgress, 0.63, 0.73));
        const visibilityAlpha = enter * (1 - leave) * (1 - ramp(flight, 0, .06));
        const depthScale = 0.95 + enter * 0.05 + leave * leave * 0.26;
        caption.style.opacity = String(visibilityAlpha);
        caption.style.transform = `translate3d(0, ${((1 - enter) * 22 - leave * 26).toFixed(1)}px, 0) scale(${depthScale.toFixed(3)})`;
      });

      if (hudFillRef.current) {
        const readNorm = clamp((p - READING_START) / (READING_END - READING_START));
        hudFillRef.current.style.transform = `scaleX(${readNorm.toFixed(4)})`;
      }
      if (hudRef.current) {
        hudRef.current.dataset.active = String(reading && p < 0.72);
      }
      visual.style.opacity = String(1 - ramp(flight, HORIZON_PASSED, SKY_REVEALED));
      visual.style.pointerEvents = p >= 0.86 ? "none" : "auto";
      const leavingForward = direction > 0 && current >= READING_END && taglineProgress >= 0.69;
      const leavingReverse = direction < 0 && current <= READING_START;
      if (reading && (leavingForward || leavingReverse)) {
        readingDone = leavingForward;
        finishReading(current);
      }
      if ((reveal > 0 && flight < SKY_REVEALED) || hasWordMotion || current !== target || flight !== destination || Math.abs(taglineProgress - p) > 0.002) {
        raf = requestAnimationFrame(render);
      }
    };
    const wake = () => { if (!raf && visible && !reduced.matches && !document.hidden && !disposed) raf = requestAnimationFrame(render); };
    const scroll = () => {
      edge.scroll(clamp(1 + (scroller.scrollTop - top) / height), scroller.scrollTop);
      const nextTarget = clamp((scroller.scrollTop - top) / travel);
      if (reading) {
        // Our own per-frame sync, or a nudge inside the interval.
        if (Math.abs(nextTarget - current) < .004 || (nextTarget >= READING_START - .001 && nextTarget <= READING_END + .001)) { wake(); return; }
        // Hash navigation or a native jump can move even a locked scroller.
        // Never drag that landing back into the reading interval.
        finishReading();
        readingDone = nextTarget > READING_END;
        current = previous = taglineProgress = nextTarget;
      }
      const oldTarget = target;
      target = nextTarget;
      if (scroller.scrollTop <= 16) bypassReading = false;
      if (!reading && target < 0.3 && !bypassReading) readingDone = false;
      const enteringForward = !readingDone && !bypassReading && oldTarget < READING_START && target >= READING_START;
      const enteringReverse = !bypassReading && oldTarget >= READING_END && target < READING_END;
      // A fast flick may cross the entire reading interval. Don't drag it back
      // into Narrative; when landing inside, start at the actual landing point.
      if (!reduced.matches && !travelling && externalLocks.size === 0 && target >= READING_START && target <= READING_END && (enteringForward || enteringReverse)) {
        reading = true; inputDistance = 0;
        direction = enteringReverse ? -1 : 1;
        if (Math.abs(target - current) > 0.03) {
          // A jump landed here: read from the landing point.
          current = previous = taglineProgress = target;
          rate = 0;
        }
        // Arriving on a scroll: keep its speed and let the reading pace take over from there.
        pace = Math.max(0.08, Math.min(READING_PACE, Math.abs(rate)));
        target = Math.max(READING_START, Math.min(READING_END, current + direction * Math.abs(rate) * 0.3));
        setReadingLock(true);
        wake();
        return;
      }
      if (Math.abs(target - current) > 0.00005 || Math.abs(target - oldTarget) > 0.00005) {
        wake();
      }
    };
    const measure = () => {
      if (disposed) return;
      // CSS can resize the section before the media-query change event arrives.
      if (reduced.matches) finishReading();
      const bounds = scroller.getBoundingClientRect();
      top = element.getBoundingClientRect().top - bounds.top + scroller.scrollTop;
      width = visual.clientWidth; height = visual.clientHeight;
      edge.resize(width, height, !reduced.matches && !contrast.matches);
      viewTop = bounds.top; viewLeft = visual.getBoundingClientRect().left;
      travel = Math.max(1, element.offsetHeight - height);
      words.forEach(word => {
        let x = word.el.offsetWidth / 2, y = word.el.offsetHeight / 2;
        let node: HTMLElement | null = word.el;
        while (node && node !== visual) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent as HTMLElement | null; }
        word.cx = x; word.cy = y;
        let dx = x - width / 2, dy = y - height / 2;
        let distance = Math.hypot(dx, dy);
        if (distance < 1) { dx = word.dx; dy = word.dy; distance = Math.hypot(dx, dy) || 1; }
        const ux = dx / distance, uy = dy / distance;
        const edgeX = (width / 2 + word.el.offsetWidth / 2 + 32) / Math.max(Math.abs(ux), 0.0001);
        const edgeY = (height / 2 + word.el.offsetHeight / 2 + 32) / Math.max(Math.abs(uy), 0.0001);
        const exitDistance = Math.max(0, Math.min(edgeX, edgeY) - distance);
        word.exitX = ux * exitDistance;
        word.exitY = uy * exitDistance;
      });
      burst.resize(width, height);
      if (reading) scroller.scrollTop = top + travel * current;
      scroll();
      wake();
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
      if (delta === 0) return;
      const nextDirection = Math.sign(delta);
      if (nextDirection !== direction) target = current;
      direction = nextDirection;
      const distance = Math.min(height * 3, Math.abs(delta));
      inputDistance += distance;
      target = Math.max(READING_START - READING_OVERRUN, Math.min(READING_END + READING_OVERRUN, target + direction * distance / height * 0.7));
      wake();
    };
    const wheel = (event: WheelEvent) => {
      if (bypassReading && event.deltaY > 0 && scroller.scrollTop > 16) bypassReading = false;
      if (!reading || externalLocks.size > 0 || event.ctrlKey) return;
      event.preventDefault();
      drive(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1));
    };
    const touchStart = (event: TouchEvent) => { touchY = event.touches.length === 1 ? event.touches[0].clientY : null; };
    const touchMove = (event: TouchEvent) => {
      if (touchY === null || event.touches.length !== 1) return;
      const next = event.touches[0].clientY, delta = touchY - next;
      touchY = next;
      if (bypassReading && delta > 0 && scroller.scrollTop > 16) bypassReading = false;
      if (!reading || externalLocks.size > 0) return;
      event.preventDefault(); drive(delta);
    };
    const touchEnd = () => { touchY = null; };
    const keyboard = (event: KeyboardEvent) => {
      if (!reading || externalLocks.size > 0 || event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLElement && event.target.closest("input,textarea,select,button,a,[contenteditable]"))) return;
      if (["ArrowDown", "PageDown", " ", "End"].includes(event.key)) { event.preventDefault(); drive(event.shiftKey ? -height : height * 0.35); }
      else if (["ArrowUp", "PageUp", "Home"].includes(event.key)) { event.preventDefault(); drive(-height * 0.35); }
      else if (event.key === "Escape") { event.preventDefault(); finishReading(current); }
    };
    const navigation = () => { readingDone = true; bypassReading = true; finishReading(); };
    // A programmatic jump (Home, End) passes through without being held; reading resumes once it lands.
    const passage = (event: Event) => {
      travelling = Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active);
      if (travelling) finishReading();
      else readingDone = target > READING_END;
    };
    const lockChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ source?: string; locked?: boolean }>).detail;
      if (!detail?.source || detail.source === LOCK_SOURCE) return;
      if (detail.locked) externalLocks.add(detail.source); else externalLocks.delete(detail.source);
    };
    const visibility = () => { last = 0; if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake(); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      element.dataset.visible = String(visible);
      if (visible) { last = 0; wake(); scroll(); } else { cancelAnimationFrame(raf); raf = 0; last = 0; }
    }, { root: scroller });
    observer.observe(element);
    const resize = new ResizeObserver(measure);
    resize.observe(visual); resize.observe(element); resize.observe(copy); resize.observe(scroller);
    if (element.parentElement) resize.observe(element.parentElement);
    scroller.addEventListener("scroll", scroll, { passive: true });
    scroller.addEventListener(ARRIVAL_READY, wake);
    scroller.addEventListener("wheel", wheel, { passive: false, capture: true });
    scroller.addEventListener("touchstart", touchStart, { passive: true, capture: true });
    scroller.addEventListener("touchmove", touchMove, { passive: false, capture: true });
    scroller.addEventListener("touchend", touchEnd, { passive: true });
    scroller.addEventListener("touchcancel", touchEnd, { passive: true });
    window.addEventListener("keydown", keyboard);
    window.addEventListener("portfolio:go-home", navigation);
    window.addEventListener("portfolio:request-section", navigation);
    window.addEventListener("portfolio:toggle-projects", navigation);
    window.addEventListener("portfolio:scroll-travel", passage);
    window.addEventListener("portfolio:scroll-lock", lockChanged);
    visual.addEventListener("pointermove", pointer, { passive: true });
    visual.addEventListener("pointerleave", leave);
    reduced.addEventListener("change", motionChange);
    contrast.addEventListener("change", measure);
    document.addEventListener("visibilitychange", visibility);
    void document.fonts.ready.then(measure);
    measure();
    return () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect(); resize.disconnect();
      finishReading();
      scroller.removeEventListener("scroll", scroll); visual.removeEventListener("pointermove", pointer);
      scroller.removeEventListener(ARRIVAL_READY, wake);
      scroller.removeEventListener("wheel", wheel, true);
      scroller.removeEventListener("touchstart", touchStart, true);
      scroller.removeEventListener("touchmove", touchMove, true);
      scroller.removeEventListener("touchend", touchEnd);
      scroller.removeEventListener("touchcancel", touchEnd);
      window.removeEventListener("keydown", keyboard);
      window.removeEventListener("portfolio:go-home", navigation);
      window.removeEventListener("portfolio:request-section", navigation);
      window.removeEventListener("portfolio:toggle-projects", navigation);
      window.removeEventListener("portfolio:scroll-travel", passage);
      window.removeEventListener("portfolio:scroll-lock", lockChanged);
      visual.removeEventListener("pointerleave", leave); reduced.removeEventListener("change", motionChange);
      contrast.removeEventListener("change", measure);
      edge.resize(0, 0, false);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return (
    <section ref={section} className={styles.section} data-home-chapter="CRAFT" aria-label="A little about the work">
      <canvas ref={edgeRef} className={styles.burnEdge} aria-hidden="true" />
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
          <p data-tagline className={styles.tagline}>{tagline}</p>
        </div>
        <div ref={hudRef} className={styles.readingHud} data-active="false" aria-hidden="true">
          <span className={styles.readingTrack}>
            <span ref={hudFillRef} className={styles.readingFill} />
          </span>
          <button
            type="button"
            tabIndex={-1}
            className={styles.readingSkip}
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
            }}
          >
            ESC TO SKIP
          </button>
        </div>
      </div>
      <span id="star-arrival" className={styles.arrivalMark} aria-hidden="true" />
    </section>
  );
}
