"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { getPerformanceProfile } from "@/lib/performanceTier";
import { ramp } from "@/components/narrative/globeArrival";
import { clothFrame, createCloth, LAST_PICK, shuttle } from "./cloth";
import styles from "./TenunStudy.module.css";

const headline = "Start with what you have.";
const draft = "A voice note. A spreadsheet. I use AI to turn what you have into a prototype you can try.";
const craft =
  "You tell me what fits. I test what a demo skips: a missing input, a double booking. Your team gets a tool it can run.";
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// D and C share a centreline, not two crossfaded glyphs. Their terminals
// coincide on D's right edge and separate as the shuttle pulls the seam.
function initial(k: number) {
  const d = [
    84, 52, 84, 24, 69, 12, 45, 12, 23, 12, 19, 12, 16, 12, 16, 35, 16, 69, 16, 92, 25, 92, 37, 92, 45, 92,
    70, 92, 84, 77, 84, 52,
  ];
  const c = [
    82, 33, 75, 17, 61, 11, 45, 12, 26, 12, 16, 23, 13, 39, 9, 55, 12, 72, 23, 83, 31, 91, 41, 94, 52, 92, 67,
    91, 78, 82, 83, 71,
  ];
  return d.map((n, i) => `${i === 0 ? "M" : i === 2 ? "C" : ""}${mix(n, c[i], k).toFixed(2)}`).join(" ");
}

export function TenunStudy() {
  const rootRef = useRef<HTMLElement>(null),
    stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null),
    firstRef = useRef<SVGPathElement>(null),
    threadRef = useRef<SVGPathElement>(null);
  useEffect(() => {
    const root = rootRef.current,
      stage = stageRef.current,
      host = hostRef.current,
      initialPath = firstRef.current,
      thread = threadRef.current;
    if (!root || !stage || !host || !initialPath || !thread) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce), (forced-colors: active)");
    const abort = new AbortController(),
      glyph = initialPath.ownerSVGElement!;
    let frame = clothFrame(1, 1),
      travel = 1,
      letter = { x: 0, y: 0, scale: 1 },
      dpr = 1;
    let raf = 0,
      lastTime = 0,
      lastP = -1,
      lastTurn = -1,
      current = 0,
      visible = true,
      disposed = false;
    let bytes: Int16Array | undefined,
      canvas: HTMLCanvasElement | null = null,
      renderer: ReturnType<typeof createCloth> | null = null;
    const css = stage.style;
    function paint(p: number) {
      if (lastP === p || disposed) return;
      lastP = p;
      const quiet = motion.matches;
      const turn = ramp(p, 0.8, 0.89),
        out = quiet ? 1 : 1 - ramp(p, 0.92, 0.99);
      const show = quiet ? 1 : ramp(p, 0.035, 0.16) * out;
      renderer?.draw(quiet ? 0.87 : p);
      css.setProperty("--intro", String(1 - ramp(p, 0, 0.075)));
      css.setProperty("--show", String(show));
      css.setProperty("--first", String(1 - ramp(p, 0.67, 0.735)));
      css.setProperty("--last", String(ramp(p, 0.71, 0.77)));
      root!.style.setProperty("--connect", String(quiet ? 1 : ramp(p, 0.93, 1)));
      root!.dataset.connect = String(quiet || p > 0.93);
      css.setProperty("--entry", String(1 - ramp(p, 0.045, 0.19)));
      css.setProperty("--pin-x", `${frame.pinX}px`);
      css.setProperty("--pin-y", `${frame.pinY}px`);
      if (lastTurn !== turn) {
        initialPath!.setAttribute("d", initial(turn));
        lastTurn = turn;
      }
      const nib = (at: number) => {
        const from = shuttle(frame, at),
          pass = ramp(at, LAST_PICK, 0.8),
          open = ramp(at, 0.8, 0.89);
        const x = letter.x + mix(84, 83, open) * letter.scale,
          y = letter.y + mix(52, 71, open) * letter.scale;
        const gutter = letter.x - Math.min(24, frame.w * 0.045),
          side = 1 - pass;
        return {
          x: side ** 3 * from.x + 3 * side * pass * gutter + pass ** 3 * x,
          y:
            side ** 3 * from.y +
            3 * side ** 2 * pass * (from.y + frame.height * 0.14) +
            3 * side * pass ** 2 * (y + letter.scale * 26) +
            pass ** 3 * y,
        };
      };
      const tip = nib(p);
      css.setProperty("--tip-x", `${tip.x}px`);
      css.setProperty("--tip-y", `${tip.y}px`);
      css.setProperty("--tip", String(quiet ? 0 : out));
      let trail = "";
      for (let j = 0; j <= 6; j++) {
        const at = nib(Math.max(0, p - 0.015 * (1 - j / 6)));
        trail += `${j ? "L" : "M"}${at.x.toFixed(2)},${at.y.toFixed(2)}`;
      }
      thread!.setAttribute("d", trail);
      thread!.style.opacity = String(quiet ? 0 : ramp(p, 0.045, 0.09) * (1 - ramp(p, 0.89, 0.92)));
      stage!.dataset.step = p < 0.09 ? "origin" : p < 0.34 ? "threads" : p < 0.74 ? "weave" : "finish";
    }
    function target() {
      return motion.matches || !travel ? 0.9 : Math.min(1, Math.max(0, root!.scrollTop / travel));
    }
    function tick(now: number) {
      raf = 0;
      if (!visible || document.hidden || disposed) return;
      const next = target(),
        dt = Math.min(64, Math.max(1, now - (lastTime || now - 16)));
      lastTime = now;
      current += (next - current) * -Math.expm1(-dt / 53);
      if (Math.abs(next - current) < 0.00006) current = next;
      paint(current);
      if (current !== next) raf = requestAnimationFrame(tick);
    }
    function wake() {
      if (!raf && visible && !document.hidden && !disposed) {
        lastTime = 0;
        raf = requestAnimationFrame(tick);
      }
    }
    function measure() {
      const box = stage!.getBoundingClientRect(),
        g = glyph.getBoundingClientRect();
      const w = stage!.clientWidth,
        h = stage!.clientHeight,
        ratio = Math.min(devicePixelRatio || 1, getPerformanceProfile().maxWebglDpr);
      if (w !== frame.w || h !== frame.h || ratio !== dpr) {
        frame = clothFrame(w, h);
        dpr = ratio;
        renderer?.resize(frame, dpr);
      }
      travel = Math.max(0, root!.querySelector<HTMLElement>("[data-track]")!.offsetHeight - h);
      letter = { x: g.left - box.left, y: g.top - box.top, scale: g.width / 100 };
      lastP = -1;
      current = target();
      paint(current);
      wake();
    }
    function release() {
      canvas?.removeEventListener("webglcontextlost", lost);
      renderer?.dispose();
      renderer = null;
      canvas?.remove();
    }
    function lost(e: Event) {
      e.preventDefault();
      install(true);
    }
    function install(cpu: boolean) {
      if (!bytes || disposed) return;
      release();
      canvas = document.createElement("canvas");
      try {
        renderer = createCloth(canvas, bytes, cpu);
      } catch {
        if (!cpu) {
          install(true);
          return;
        }
        root!.dataset.fallback = "true";
        measure();
        return;
      }
      host!.append(canvas);
      canvas.addEventListener("webglcontextlost", lost);
      renderer.resize(frame, dpr);
      lastP = -1;
      paint(current);
    }
    const resize = new ResizeObserver(measure);
    resize.observe(stage);
    resize.observe(glyph);
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) wake();
        else {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { root },
    );
    io.observe(stage);
    motion.addEventListener("change", measure);
    root.addEventListener("scroll", wake, { passive: true });
    document.addEventListener("visibilitychange", wake);
    measure();
    void document.fonts.ready.then(() => {
      if (!disposed) measure();
    });
    fetch("/maps/earth-points.v1.bin", { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw Error("No point data");
        return r.arrayBuffer();
      })
      .then((b) => {
        if (disposed) return;
        if (!b.byteLength || b.byteLength % 12) throw Error("Invalid particle bank");
        bytes = new Int16Array(b);
        install(motion.matches);
      })
      .catch(() => {
        if (!disposed) {
          root.dataset.fallback = "true";
          measure();
        }
      });
    return () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(raf);
      release();
      resize.disconnect();
      io.disconnect();
      motion.removeEventListener("change", measure);
      root.removeEventListener("scroll", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);
  return (
    <main ref={rootRef} className={styles.reader} aria-label="Tenun motion study" tabIndex={0}>
      <section data-track="" className={styles.track} aria-labelledby="tenun-title">
        <div ref={stageRef} className={styles.stage}>
          <div ref={hostRef} className={styles.points} aria-hidden="true" />
          <span className={styles.origin} aria-hidden="true">
            SURABAYA, ID
          </span>
          <div className={styles.editorial}>
            <h1 id="tenun-title" className={styles.heading}>
              {headline}
            </h1>
            <div className={styles.word} aria-hidden="true">
              <svg viewBox="0 0 100 104" className={styles.initial} focusable="false">
                <path ref={firstRef} d={initial(0)} />
              </svg>
              <span className={styles.fixed}>
                RAFT<span className={styles.period}>.</span>
              </span>
            </div>
            <div className={styles.body}>
              <p className={styles.draft}>{draft}</p>
              <p className={styles.craft}>{craft}</p>
            </div>
          </div>
          <svg aria-hidden="true" className={styles.thread}>
            <path ref={threadRef} />
          </svg>
          <i className={styles.tip} aria-hidden="true" />
          <p className={styles.scroll} aria-hidden="true">
            Scroll <span>↓</span>
          </p>
        </div>
      </section>
      <section className={styles.end} aria-label="Have an idea?">
        <h2>
          Have an idea?
          <br />
          <Link
            href="/?section=contact"
            prefetch={false}
            onFocus={() => {
              const el = rootRef.current;
              if (el && el.dataset.connect === "false") el.scrollTop = el.scrollHeight;
            }}
          >
            Let’s make it real.
          </Link>
        </h2>
      </section>
    </main>
  );
}
