"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./AmbientToggle.module.css";

type Status = "idle" | "loading" | "playing" | "pausing" | "error";
type Engine = { audio: HTMLAudioElement; context: AudioContext; gain: GainNode; analyser: AnalyserNode; source: MediaElementAudioSourceNode };

export function AmbientToggle() {
  const engine = useRef<Engine | null>(null);
  const pathMain = useRef<SVGPathElement>(null);
  const pathBurgundy = useRef<SVGPathElement>(null);
  const pathGold = useRef<SVGPathElement>(null);
  const operation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    const supported = window.matchMedia("(min-width: 768px)");
    const stopOnUnsupported = () => {
      if (supported.matches) return;
      operation.current += 1;
      if (timer.current) clearTimeout(timer.current);
      const player = engine.current;
      if (player) {
        player.gain.gain.cancelScheduledValues(player.context.currentTime);
        player.gain.gain.value = 0;
        player.audio.pause();
        void player.context.suspend().catch(() => {});
      }
      setStatus("idle");
    };
    supported.addEventListener("change", stopOnUnsupported);
    return () => {
      supported.removeEventListener("change", stopOnUnsupported);
      operation.current += 1;
      if (timer.current) clearTimeout(timer.current);
      const player = engine.current;
      if (player) {
        player.audio.pause();
        player.audio.removeAttribute("src");
        player.audio.load();
        player.source.disconnect();
        player.analyser.disconnect();
        player.gain.disconnect();
        void player.context.close().catch(() => {});
        engine.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const player = engine.current;
    if (!player || (status !== "playing" && status !== "pausing")) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const waveMain = pathMain.current;
    const waveBurgundy = pathBurgundy.current;
    const waveGold = pathGold.current;
    const timeData = new Uint8Array(player.analyser.fftSize);
    const freqData = new Uint8Array(player.analyser.frequencyBinCount);
    
    // Control points for organic spline interpolation
    const N = 16;
    const smoothMain = new Float32Array(N + 1);
    const smoothBurgundy = new Float32Array(N + 1);
    const smoothGold = new Float32Array(N + 1);
    
    let frame = 0;
    let phase = 0;

    // Helper: convert sampled points into a continuous smooth cubic SVG path
    const buildSpline = (pts: Array<[number, number]>) => {
      if (pts.length < 2) return "";
      let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? i : i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

        // Catmull-Rom to Cubic Bezier control points
        const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
        const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
        const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
        const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

        d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
      }
      return d;
    };

    let pauseProgress = 1;
    const draw = () => {
      if (status === "pausing") {
        pauseProgress = Math.max(0, pauseProgress - 0.04);
      } else {
        pauseProgress = Math.min(1, pauseProgress + 0.08);
      }

      player.analyser.getByteTimeDomainData(timeData);
      player.analyser.getByteFrequencyData(freqData);

      let energy = 0;
      for (let i = 0; i < 24; i++) energy += freqData[i];
      const energyLevel = (energy / (24 * 255)) * pauseProgress;
      phase += (0.045 + energyLevel * 0.055) * pauseProgress;

      const ptsMain: Array<[number, number]> = [];
      const ptsBurgundy: Array<[number, number]> = [];
      const ptsGold: Array<[number, number]> = [];

      for (let i = 0; i <= N; i++) {
        const t = i / N;
        // Perfect sine envelope pinning both ends exactly at (0, 14) and (112, 14)
        const envelope = Math.sin(t * Math.PI);
        const x = t * 112;

        if (i === 0 || i === N || reduced.matches) {
          smoothMain[i] = 0;
          smoothBurgundy[i] = 0;
          smoothGold[i] = 0;
          ptsMain.push([x, 14]);
          ptsBurgundy.push([x, 14]);
          ptsGold.push([x, 14]);
          continue;
        }

        // Real-time audio sample
        const timeIndex = Math.floor(t * (timeData.length - 1));
        const audioSample = ((timeData[timeIndex] - 128) / 128) * pauseProgress;
        const freqIndex = Math.floor((t <= 0.5 ? t * 2 : (1 - t) * 2) * 16);
        const freqBoost = (freqData[freqIndex] / 255) * pauseProgress;

        // 1. Main White Wave (Primary presence)
        const mainPulse = Math.sin(phase * 1.2 + t * Math.PI * 3) * (0.3 + energyLevel * 0.7);
        const targetMain = (audioSample * 1.5 + mainPulse * 0.6 + freqBoost * 0.4) * 11 * Math.pow(envelope, 1.1) * pauseProgress;
        smoothMain[i] += (targetMain - smoothMain[i]) * (status === "pausing" ? 0.12 : 0.16);

        // 2. Burgundy Wave (Counter-harmonic opposite flow)
        const burgundyCounter = Math.sin(-phase * 1.4 + t * Math.PI * 2.5 + 1.2) * (0.35 + energyLevel * 0.65);
        const targetBurgundy = (-audioSample * 1.2 + burgundyCounter * 0.75 - freqBoost * 0.3) * 8.5 * Math.pow(envelope, 1.25) * pauseProgress;
        smoothBurgundy[i] += (targetBurgundy - smoothBurgundy[i]) * (status === "pausing" ? 0.1 : 0.14);

        // 3. Gold Wave (Counter harmonic offset & subtle micro-dance)
        const goldCounter = Math.cos(phase * 1.5 - t * Math.PI * 3.5 + 0.6) * (0.3 + energyLevel * 0.6);
        const targetGold = (audioSample * 0.8 * Math.cos(t * Math.PI * 2) + goldCounter * 0.7) * 7.5 * Math.pow(envelope, 1.3) * pauseProgress;
        smoothGold[i] += (targetGold - smoothGold[i]) * (status === "pausing" ? 0.1 : 0.15);

        ptsMain.push([x, 14 + smoothMain[i]]);
        ptsBurgundy.push([x, 14 + smoothBurgundy[i]]);
        ptsGold.push([x, 14 + smoothGold[i]]);
      }

      waveMain?.setAttribute("d", buildSpline(ptsMain));
      waveBurgundy?.setAttribute("d", buildSpline(ptsBurgundy));
      waveGold?.setAttribute("d", buildSpline(ptsGold));

      if (!reduced.matches) frame = requestAnimationFrame(draw);
    };

    const restart = () => { cancelAnimationFrame(frame); draw(); };
    reduced.addEventListener("change", restart);
    draw();
    return () => {
      cancelAnimationFrame(frame);
      reduced.removeEventListener("change", restart);
      const flat = "M0,14 C28,14 84,14 112,14";
      waveMain?.setAttribute("d", flat);
      waveBurgundy?.setAttribute("d", flat);
      waveGold?.setAttribute("d", flat);
    };
  }, [status]);

  const toggle = async () => {
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    if (status === "loading" || status === "pausing") return;
    const id = ++operation.current;
    try {
      if (!engine.current) {
        const context = new AudioContext();
        const audio = new Audio("/audio/ambient.mp3");
        audio.loop = true;
        audio.preload = "none";
        const source = context.createMediaElementSource(audio);
        const gain = context.createGain();
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        gain.gain.value = 0;
        source.connect(gain).connect(analyser).connect(context.destination);
        engine.current = { audio, context, source, gain, analyser };
      }
      const player = engine.current;
      if (status === "playing") {
        setStatus("pausing");
        player.gain.gain.cancelScheduledValues(player.context.currentTime);
        player.gain.gain.setTargetAtTime(0, player.context.currentTime, 0.12);
        timer.current = setTimeout(() => {
          if (id !== operation.current) return;
          player.audio.pause();
          player.gain.gain.value = 0;
          void player.context.suspend().catch(() => {});
          setStatus("idle");
        }, 650);
        return;
      }
      setStatus("loading");
      if (status === "error") player.audio.load();
      await Promise.all([player.context.resume(), player.audio.play()]);
      if (id !== operation.current) return;
      player.gain.gain.cancelScheduledValues(player.context.currentTime);
      player.gain.gain.setTargetAtTime(0.35, player.context.currentTime, 0.25);
      setStatus("playing");
    } catch {
      if (id !== operation.current) return;
      engine.current?.audio.pause();
      setStatus("error");
    }
  };

  const isPlaying = status === "playing" || status === "pausing";
  const ariaText = status === "error" ? "audio unavailable · retry" : status === "loading" ? "loading ambient" : isPlaying ? "ambient" : "click for ambient";

  return <button type="button" className={styles.toggle} data-playing={isPlaying} aria-label={ariaText} aria-pressed={status === "playing"} aria-busy={status === "loading"} onClick={() => void toggle()}>
    <span className={styles.lineWrap}>
      <svg className={styles.waveSvg} viewBox="0 0 112 28" width="112" height="28" aria-hidden="true">
        {/* Subtle background threads (Burgundy & Gold) counter-flowing */}
        <path ref={pathBurgundy} className={styles.waveBurgundy} d="M0 14 H112" fill="none" stroke="#901a35" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        <path ref={pathGold} className={styles.waveGold} d="M0 14 H112" fill="none" stroke="#dfa13d" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        {/* Primary White Waveform */}
        <path ref={pathMain} className={styles.waveMain} d="M0 14 H112" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
    <span className={styles.labelContainer} aria-live="polite">
      <span className={`${styles.labelText} ${isPlaying ? styles.textHidden : styles.textVisible}`} aria-hidden={isPlaying}>
        {status === "error" ? "audio unavailable · retry" : status === "loading" ? "loading ambient" : "click for ambient"}
      </span>
      <span className={`${styles.labelText} ${styles.textActiveLabel} ${isPlaying ? styles.textActivePlaying : styles.textHidden}`} aria-hidden={!isPlaying}>
        ambient
      </span>
    </span>
  </button>;
}
