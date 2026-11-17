"use client";

export type PerformanceTier = "high" | "medium" | "low";

export interface PerformanceProfile {
  tier: PerformanceTier;
  isSafari: boolean;
  isWindows: boolean;
  isMobile: boolean;
  maxWebglDpr: number;
  maxCanvasDpr: number;
  haloAntialias: boolean;
  haloDensityScale: number;
  asciiCellBoost: number;
  burstRayScale: number;
}

const TIER_RANK: Record<PerformanceTier, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

let cachedProfile: PerformanceProfile | null = null;
let fpsMonitorStarted = false;
const listeners = new Set<(profile: PerformanceProfile) => void>();

function detectGpuTier(): { isSoftware: boolean; isIntegratedWindows: boolean; isHighEnd: boolean } {
  if (typeof document === "undefined") {
    return { isSoftware: false, isIntegratedWindows: false, isHighEnd: false };
  }
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl", { powerPreference: "high-performance" }) ||
      canvas.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) {
      return { isSoftware: true, isIntegratedWindows: false, isHighEnd: false };
    }
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "").toLowerCase()
      : String(gl.getParameter(gl.RENDERER) || "").toLowerCase();

    const loseContext = gl.getExtension("WEBGL_lose_context");
    loseContext?.loseContext();

    const isSoftware = /swiftshader|llvmpipe|software|basic render driver|microsoft basic/i.test(renderer);
    const isIntegratedWindows = /intel\(r\)\s*(uhd|hd\s*graphics|iris)|amd\s*radeon\(tm\)\s*graphics/i.test(renderer);
    const isHighEnd = /apple\s*m\d|nvidia|geforce\s*(rtx|gtx)|radeon\s*rx|arc\(tm\)/i.test(renderer);

    return { isSoftware, isIntegratedWindows, isHighEnd };
  } catch {
    return { isSoftware: false, isIntegratedWindows: false, isHighEnd: false };
  }
}

function buildProfile(tier: PerformanceTier, isSafari: boolean, isWindows: boolean, isMobile: boolean): PerformanceProfile {
  if (tier === "low") {
    return {
      tier: "low",
      isSafari,
      isWindows,
      isMobile,
      maxWebglDpr: 1.0,
      maxCanvasDpr: 1.0,
      haloAntialias: false,
      haloDensityScale: 0.58,
      asciiCellBoost: 2,
      burstRayScale: 0.55,
    };
  }

  if (tier === "medium") {
    return {
      tier: "medium",
      isSafari,
      isWindows,
      isMobile,
      maxWebglDpr: isMobile ? 1.25 : 1.25,
      maxCanvasDpr: 1.35,
      haloAntialias: false,
      haloDensityScale: 0.8,
      asciiCellBoost: 1,
      burstRayScale: 0.78,
    };
  }

  return {
    tier: "high",
    isSafari,
    isWindows,
    isMobile,
    maxWebglDpr: isSafari || isWindows ? 1.5 : 1.75,
    maxCanvasDpr: isSafari || isWindows ? 1.5 : 1.75,
    haloAntialias: !isSafari && !isWindows,
    haloDensityScale: 1.0,
    asciiCellBoost: 0,
    burstRayScale: 1.0,
  };
}

function applyRootAttributes(profile: PerformanceProfile) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (root.dataset.perfTier !== profile.tier) {
    root.dataset.perfTier = profile.tier;
  }
  const engine = profile.isSafari ? "webkit" : "standard";
  if (root.dataset.browserEngine !== engine) {
    root.dataset.browserEngine = engine;
  }
  const platform = profile.isWindows ? "windows" : "other";
  if (root.dataset.platform !== platform) {
    root.dataset.platform = platform;
  }
}

function startAdaptiveFpsMonitor() {
  if (fpsMonitorStarted || typeof window === "undefined") return;
  fpsMonitorStarted = true;

  let sampleCount = 0;
  let slowFrames = 0;
  let totalDelta = 0;
  let lastTime = 0;
  let checksCompleted = 0;

  const sample = (now: number) => {
    if (!cachedProfile || cachedProfile.tier === "low" || checksCompleted >= 3) {
      return;
    }

    if (document.hidden || document.documentElement.dataset.splashComplete !== "true") {
      lastTime = 0;
      requestAnimationFrame(sample);
      return;
    }

    if (lastTime > 0) {
      const dt = now - lastTime;
      // Ignore long idle/tab-switch gaps
      if (dt > 4 && dt < 180) {
        sampleCount += 1;
        totalDelta += dt;
        if (dt > 24.5) slowFrames += 1; // Below ~41 FPS

        if (sampleCount >= 90) {
          const avgFps = 1000 / (totalDelta / sampleCount);
          const slowRatio = slowFrames / sampleCount;
          checksCompleted += 1;

          if (avgFps < 32 || slowRatio > 0.45) {
            downgradePerformanceTier("low");
            return;
          }
          if (cachedProfile.tier === "high" && (avgFps < 46 || slowRatio > 0.25)) {
            downgradePerformanceTier("medium");
          }

          sampleCount = 0;
          slowFrames = 0;
          totalDelta = 0;
        }
      }
    }

    lastTime = now;
    requestAnimationFrame(sample);
  };

  requestAnimationFrame(sample);
}

export function downgradePerformanceTier(targetTier: PerformanceTier) {
  const current = getPerformanceProfile();
  if (TIER_RANK[targetTier] >= TIER_RANK[current.tier]) return;

  cachedProfile = buildProfile(targetTier, current.isSafari, current.isWindows, current.isMobile);
  applyRootAttributes(cachedProfile);
  for (const listener of listeners) {
    listener(cachedProfile);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("portfolio:perf-tier-change", { detail: cachedProfile }));
  }
}

export function getPerformanceProfile(): PerformanceProfile {
  if (cachedProfile) return cachedProfile;

  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return buildProfile("high", false, false, false);
  }

  const ua = navigator.userAgent || "";
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
  const isWindows = /windows|win32|win64/i.test(ua) || /win/i.test(navigator.platform || "");
  const isMobile = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cores = navigator.hardwareConcurrency || 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const saveData = Boolean(
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
  );

  const gpu = detectGpuTier();

  let tier: PerformanceTier = "high";

  if (reducedMotion || saveData || gpu.isSoftware || cores <= 2 || memory <= 2) {
    tier = "low";
  } else if (
    gpu.isIntegratedWindows ||
    cores <= 4 ||
    memory <= 4 ||
    (isWindows && !gpu.isHighEnd) ||
    (isSafari && isMobile)
  ) {
    tier = "medium";
  }

  cachedProfile = buildProfile(tier, isSafari, isWindows, isMobile);
  applyRootAttributes(cachedProfile);
  startAdaptiveFpsMonitor();

  return cachedProfile;
}

export function onPerformanceTierChange(callback: (profile: PerformanceProfile) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
