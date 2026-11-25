"use client";

import { useEffect, useRef, useState } from "react";
import { getPerformanceProfile, onPerformanceTierChange } from "@/lib/performanceTier";
import styles from "./AsciiGlobeSection.module.css";
import { ARRIVAL_END, arrivalAt, availableFlight, earthRadius, ramp as phase, sampleArrival, setArrivalReady } from "./globeArrival";
import { createPointCloud, createPointFallback, dispersing, globeAngles, TRACE_COUNT } from "./pointCloud";
import { createBurnEdge } from "./burnEdge";

// Keep the map exit inside its existing scroll distance.
const TAIL = 1.9;

const clamp = (v: number) => Math.max(0, Math.min(1, v));

export function AsciiGlobeSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const edgeRef = useRef<HTMLCanvasElement>(null);
  const meteorRef = useRef<HTMLSpanElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const field = fieldRef.current;
    const caption = captionRef.current;
    const scroller = section?.closest<HTMLElement>("main");
    if (!section || !field || !scroller || !caption || !edgeRef.current) return;
    const burn = createBurnEdge(edgeRef.current, section, "#fff");
    const craft = section.previousElementSibling as HTMLElement | null;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const controller = new AbortController();
    let perf = getPerformanceProfile();
    let cloud: ReturnType<typeof createPointCloud> | ReturnType<typeof createPointFallback> | null = null;
    let particleBytes: ArrayBuffer | undefined, surface: HTMLCanvasElement | null = null;
    let width = 0, height = 0, dpr = 1, top = 0, travel = 1;
    let target = 0, current = 0, raf = 0, last = 0;
    let visible = false, disposed = false, primed = false;
    let spin = 0, driftTime = 0;
    let shownCopy = "", shownTurn = "", shownBurn = "", tail = 0;
    let craftTravel = 1, craftTop = 0, approach = 1, wantedApproach = 1, arrivalDistance = 0;
    const fine = matchMedia("(any-hover: hover) and (any-pointer: fine)");
    const trail = new Float32Array(TRACE_COUNT*4);
    let px=0, py=0, easedX=0, easedY=0, sample=false, slot=0, left=0, screenTop=0;
    let tap: {id:number; x:number; y:number} | null = null;
    let skyActive=false, meteorTimer=0, streak: Animation | null=null;
    const scheduleMeteor = (first: boolean) => {
      meteorTimer = window.setTimeout(() => {
        const el = meteorRef.current;
        if (!el || !skyActive || document.hidden || disposed) return;
        const right = Math.random() < .5;
        const dx = (right ? 1 : -1)*Math.min(width*.09,95), dy=Math.abs(dx)*(.26+Math.random()*.27);
        const angle = Math.atan2(dy,dx)*180/Math.PI;
        el.style.left = `${(right ? 12 : 58)+Math.random()*28}%`;
        el.style.top = `${16+Math.random()*52}%`;
        el.style.width = `${Math.min(26,Math.abs(dx)*.38)}px`;
        const pose = (t:number) => `translate(${dx*t}px,${dy*t}px) rotate(${angle}deg)`;
        streak = el.animate([{transform:pose(0),opacity:0},{transform:pose(.27),opacity:.55,offset:.27},
          {transform:pose(1),opacity:0}],{duration:900+Math.random()*550,easing:"linear"});
        scheduleMeteor(false);
      }, (first ? 2800+Math.random()*3600 : 11000+Math.random()*14000));
    };
    const meteorState = (on:boolean) => {
      if (skyActive===on) return;
      skyActive=on;
      if (on) scheduleMeteor(true);
      else { clearTimeout(meteorTimer); streak?.cancel(); streak=null; }
    };
    const resetInput = () => {
      px=py=easedX=easedY=0; sample=false; tap=null; trail.fill(0); meteorState(false);
    };
    const draw = (dt: number) => {
      const distance = current * travel, mapTravel = travel - tail;
      const p = reduced.matches ? 1 : clamp((distance - arrivalDistance) / Math.max(1, mapTravel - arrivalDistance));
      const q = tail ? clamp((target * travel - mapTravel) / tail) : 0;
      // The ink starts below the viewport; lead it in as the last grains fade.
      const rise = phase(q,.47,1);
      const scale = Math.min((width - 32) / 50, Math.max(4, height - 150) / 22);
      const turning = !!cloud && !reduced.matches && approach >= .84 && p < .64;
      const drifting = !!cloud && !reduced.matches && dispersing(p);
      if (drifting) driftTime += dt / 1000;
      if (turning) spin = (spin + dt * .009 * phase(approach,.84,.99) * (1-phase(p,.40,.64))) % 360;
      const active = !reduced.matches && visible && !!cloud && approach>.40 && p<.4;
      if (!active) resetInput();
      meteorState(active && approach>.455 && approach<.68);
      const settle = -Math.expm1(-dt/155);
      easedX += (px-easedX)*settle; easedY += (py-easedY)*settle;
      const skyWeight = phase(approach,.40,.50);
      const globeWeight = phase(approach,.70,.93)*(1-phase(p,.27,.40));
      const yaw = spin-easedX*3*globeWeight, tilt = easedY*2.4*globeWeight;
      let lit=false;
      for (let j=3; j<trail.length; j+=4) {
        trail[j]=Math.max(0,trail[j]-dt/950);
        if (trail[j]) lit=true;
      }
      if (sample && globeWeight>.6) {
        const r=earthRadius(width,height,approach,true);
        const x=hitX/r, y=hitY/r, z2=1-x*x-y*y;
        if (z2>0) {
          // Invert the rendered camera rotation so the mark stays on the same grains.
          const [lon,lat]=globeAngles(p,yaw,tilt), z=Math.sqrt(z2);
          const forward=z*Math.cos(lat)-y*Math.sin(lat);
          const j=slot*4;
          trail[j]=x*Math.cos(lon)+forward*Math.sin(lon);
          trail[j+1]=y*Math.cos(lat)+z*Math.sin(lat);
          trail[j+2]=forward*Math.cos(lon)-x*Math.sin(lon);
          trail[j+3]=1; slot=(slot+1)%TRACE_COUNT; lit=true;
        }
      }
      sample=false;
      cloud?.draw({
        progress: p, flight: approach, scale, night: true, spin:yaw, tilt, driftTime,
        driftX:-10*easedX*skyWeight, driftY:8*easedY*skyWeight,
        trail, tracing:lit ? globeWeight : 0,
        dissolve: clamp((q - .10) / .44),
      });
      const offset = ((1 - rise) * 100).toFixed(3);
      if (offset !== shownBurn) section.style.setProperty("--burn-offset", `${shownBurn = offset}%`);
      if (!reduced.matches) burn.scrub(rise);
      // The lettering travels clockwise along the rim with scroll, then leaves before the grains scatter.
      const copy = (phase(approach,.86,1) * (1-phase(p,.27,.40))).toFixed(3);
      const turn = (-46 + 16 * phase(approach,.83,1) + 96 * clamp(p / .40)).toFixed(2);
      if (copy !== shownCopy) section.style.setProperty("--global-copy", shownCopy = copy);
      if (turn !== shownTurn) section.style.setProperty("--turn", `${shownTurn = turn}deg`);
      caption.style.opacity = String(phase(p,.75,.89) * (1 - phase(q,.02,.11)));
      caption.style.top = `${height * .52 + 11 * scale + 12}px`;
      return turning || drifting || lit || Math.abs(px-easedX)+Math.abs(py-easedY)>.001;
    };

    const tick = (time: number) => {
      raf = 0;
      if (!visible || document.hidden || disposed) return;
      const dt = Math.min(50, time - (last || time - 16));
      last = time;
      const flight = reduced.matches ? 1 : availableFlight(scroller, wantedApproach);
      approach = reduced.matches ? 1 : sampleArrival(scroller, flight, time);
      current += (target - current) * (1 - Math.exp(-dt / 62));
      if (Math.abs(target - current) < 0.0001) current = target;
      const turning = draw(dt);
      if ((current !== target || approach !== flight || turning) && !reduced.matches) {
        raf = requestAnimationFrame(tick);
      }
    };
    const wake = () => { if (!raf && !disposed && visible && !document.hidden) raf = requestAnimationFrame(tick); };
    let hitX=0, hitY=0;
    const point = (e:PointerEvent, touch=false) => {
      if (!visible || reduced.matches || !cloud || approach<.4 ||
          (e.target instanceof Element && e.target.closest("a,button,[role=button]"))) return;
      hitX=e.clientX-left-width*.5; hitY=screenTop+height*.52-e.clientY;
      if (!touch) {
        px=Math.max(-1,Math.min(1,hitX/(width*.5)));
        py=Math.max(-1,Math.min(1,(e.clientY-screenTop-height*.5)/(height*.5)));
      }
      sample=true; wake();
    };
    const events={passive:true,signal:controller.signal};
    scroller.addEventListener("pointermove",e=>{
      if (e.pointerType!=="touch" && fine.matches) point(e);
      if (tap && Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>8) tap=null;
    },events);
    scroller.addEventListener("pointerleave",()=>{ px=py=0; sample=false; wake(); },events);
    scroller.addEventListener("pointerdown",e=>{
      if (e.pointerType==="touch") tap={id:e.pointerId,x:e.clientX,y:e.clientY};
    },events);
    scroller.addEventListener("pointerup",e=>{
      if (tap?.id===e.pointerId && Math.hypot(e.clientX-tap.x,e.clientY-tap.y)<8) point(e,true);
      tap=null;
    },events);
    scroller.addEventListener("pointercancel",()=>{tap=null;},events);
    const visibility = () => {
      if (document.hidden) {
        resetInput();
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      } else {
        wake();
      }
    };
    const scroll = () => {
      if (!primed) return;
      const flight = reduced.matches || !craft ? 1 : arrivalAt((scroller.scrollTop - craftTop) / craftTravel);
      const nextTarget = clamp((scroller.scrollTop - top) / travel);
      if (wantedApproach === flight && Math.abs(nextTarget - target) < 0.0001 && Math.abs(nextTarget - current) < 0.0001) return;
      wantedApproach = flight;
      target = nextTarget;
      wake();
    };
    const resize = () => {
      if (!primed) return;
      const w = field.clientWidth, h = field.clientHeight;
      const viewport=scroller.getBoundingClientRect();
      left=viewport.left; screenTop=viewport.top;
      const ratio = Math.min(devicePixelRatio || 1, perf.maxWebglDpr);
      if (width !== w || height !== h || dpr !== ratio) {
        width = w; height = h; dpr = ratio;
        section.style.setProperty("--rim-size", `${2.6 * earthRadius(w,h,1,true)}px`);
        cloud?.resize(w,h,ratio,perf.tier === "low");
      }
      top = section.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      travel = Math.max(1, section.offsetHeight - height);
      tail = reduced.matches ? 0 : Math.min(height * TAIL, travel * .6);
      burn.resize(w, h, !reduced.matches);
      if (craft) {
        craftTravel = Math.max(1, craft.offsetHeight - height);
        craftTop = craft.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      }
      arrivalDistance = craft && !reduced.matches ? Math.max(0, craftTop + craftTravel * ARRIVAL_END - top) : 0;
      wantedApproach = reduced.matches || !craft ? 1 : arrivalAt((scroller.scrollTop - craftTop) / craftTravel);
      target = clamp((scroller.scrollTop - top) / travel);
      current = target;
      wake();
    };
    const release = () => {
      surface?.removeEventListener("webglcontextlost", lost);
      cloud?.dispose(); cloud = null;
      surface?.remove(); surface = null;
    };
    const install = (cpu: boolean) => {
      if (!particleBytes || disposed) return;
      release();
      surface = document.createElement("canvas");
      try {
        cloud = cpu ? createPointFallback(surface, particleBytes) : createPointCloud(surface, particleBytes);
      } catch {
        if (!cpu) { install(true); return; }
        setFailed(true); setArrivalReady(scroller, true); wake(); return;
      }
      surface.dataset.pointRenderer = cpu ? "2d" : "gpu";
      field.append(surface);
      if (!cpu) surface.addEventListener("webglcontextlost", lost);
      cloud.resize(width, height, Math.min(dpr, perf.maxWebglDpr), perf.tier === "low");
      setArrivalReady(scroller, true);
      wake();
    };
    function lost(event: Event) { event.preventDefault(); install(true); }
    const prime = () => {
      if (primed || disposed) return;
      primed = true;
      resize();
      fetch("/maps/earth-points.v1.bin", { signal: controller.signal })
        .then(response => { if (!response.ok) throw new Error("Map unavailable"); return response.arrayBuffer(); })
        .then((data: ArrayBuffer) => {
          if (disposed) return;
          if (!data.byteLength || data.byteLength % 12) throw Error("Invalid particle targets");
          particleBytes = data;
          install(reduced.matches);
        })
        .catch(() => {
          if (disposed) return;
          setFailed(true); setArrivalReady(scroller, true); wake();
        });
    };
    const preload = new IntersectionObserver(([entry], self) => {
      if (entry.isIntersecting) { self.disconnect(); prime(); }
    }, { root: scroller, rootMargin: "180% 0px" });
    preload.observe(section);
    const unsubscribePerf = onPerformanceTierChange((nextPerf) => {
      perf = nextPerf;
      resize();
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        prime();
        last = 0;
        wake();
      } else {
        resetInput();
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      }
    }, { root: scroller });
    observer.observe(section);
    const size = new ResizeObserver(resize);
    size.observe(field);
    size.observe(section);
    if (section.parentElement) size.observe(section.parentElement);
    scroller.addEventListener("scroll", scroll, { passive: true });
    reduced.addEventListener("change", resize);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      resetInput();
      unsubscribePerf();
      controller.abort();
      setArrivalReady(scroller, false);
      release();
      cancelAnimationFrame(raf);
      observer.disconnect();
      preload.disconnect();
      size.disconnect();
      scroller.removeEventListener("scroll", scroll);
      reduced.removeEventListener("change", resize);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return (
    <section ref={sectionRef} className={styles.section} data-home-chapter="ORIGIN" aria-label="Working globally, from Indonesia">
      <div className={styles.stickyContainer}>
        <div ref={fieldRef} className={styles.field} aria-hidden="true" />
        <span ref={meteorRef} className={styles.meteor} aria-hidden="true" />
        <svg className={styles.global} viewBox="0 0 260 260" role="img" aria-label="Working globally, wherever you are.">
          <defs>
            <path id="origin-rim" d="M18 130a112 112 0 1 1 224 0a112 112 0 1 1 -224 0" />
          </defs>
          <text textAnchor="middle">
            <textPath href="#origin-rim" startOffset="25%">Working globally</textPath>
          </text>
          <text textAnchor="middle">
            <textPath href="#origin-rim" startOffset="75%">Wherever you are</textPath>
          </text>
        </svg>
        <p ref={captionRef} className={styles.caption}>I lived in Indonesia.</p>
        {failed && <p className={styles.fallback}>Worldwide / Indonesia</p>}
        <div className={styles.burn} aria-hidden="true"><canvas ref={edgeRef} /></div>
      </div>
    </section>
  );
}
