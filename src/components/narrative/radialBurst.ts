import { getPerformanceProfile } from "@/lib/performanceTier";
import { HEADS_LANDED, ramp } from "./globeArrival";
import { createStarSeeds, GUIDE_STARS, SHORT_UNIT } from "./starField";

/** Rendering only: the narrative owns the animation clock and lifecycle. */
export function createRadialBurst(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  let width = 0, height = 0, dpr = 1, clock = 0, rayScale = 1;
  let veil: CanvasGradient | undefined;
  const sky = createStarSeeds(GUIDE_STARS);
  let parked = false;
  let departureSpeed = 0, clockRate = 0;
  const palette = ["108,232,248", "68,162,250", "138,98,246", "244,234,216"];
  const rays = Array.from({ length: GUIDE_STARS }, (_, i) => {
    const seed = (n: number) => {
      const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const angle = i * 2.3999632297;
    const colorIndex = i % 11 === 0 ? 3 : i % 7 === 0 ? 2 : i % 3 === 0 ? 1 : 0;
    return {
      x: Math.cos(angle),
      y: Math.sin(angle),
      phase: seed(i + 1),
      depth: seed(i + 130),
      color: palette[colorIndex],
      spark: i % 5 === 0,
      skyX: sky[i * 4] / SHORT_UNIT, skyY: sky[i * 4 + 1] / SHORT_UNIT,
      shine: sky[i * 4 + 3] / SHORT_UNIT,
    };
  });

  return {
    resize(w: number, h: number) {
      const perf = getPerformanceProfile();
      width = w;
      height = h;
      dpr = Math.min(window.devicePixelRatio || 1, perf.maxCanvasDpr);
      rayScale = perf.burstRayScale;
      parked = false;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        veil = ctx.createRadialGradient(
          width / 2,
          height / 2,
          0,
          width / 2,
          height / 2,
          Math.min(width * 0.44, 340)
        );
        veil.addColorStop(0, "rgba(5,5,7,0.92)");
        veil.addColorStop(0.45, "rgba(5,5,7,0.64)");
        veil.addColorStop(1, "rgba(5,5,7,0)");
        ctx.fillStyle = "#050507";
        ctx.fillRect(0, 0, width, height);
      }
    },
    draw(
      dt: number,
      intensity: number,
      speed: number,
      direction: number,
      reveal: number,
      exit = 0,
      flight = 0
    ) {
      if (!ctx || (parked && flight >= HEADS_LANDED)) return;
      parked = flight >= HEADS_LANDED;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#050507";
      ctx.fillRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;

      const landed = ramp(flight, 0, HEADS_LANDED);
      const brake = 1 - landed;

      if (intensity > 0.001 || landed > 0) {
        ctx.lineCap = "round";
        if (flight === 0) departureSpeed = speed;
        const warp = brake * Math.min(1.35, Math.max(0, (departureSpeed - 0.25) / 0.75));
        if (flight === 0) {
          clockRate = direction * (0.065 + speed * 0.18 + warp * warp * 0.95);
          clock += dt * clockRate;
        }
        // Leave the looping warp at its actual phase. Coast without wrapping a
        // visible head back to the centre halfway through its landing.
        const coast = clockRate * .085 * (1 - (1 - Math.min(1, flight / HEADS_LANDED)) ** 2);
        const extent = Math.hypot(width, height) * 0.6;
        const count = Math.round((width < 600 ? 140 : rays.length) * rayScale);
        const activeReveal = reveal;

        for (let i = 0; i < count; i++) {
          const ray = rays[i];
          const position = ray.phase + clock * (0.55 + ray.depth * 0.72);
          const cycle = Math.max(0, Math.min(1, position - Math.floor(position) + coast * (0.55 + ray.depth * 0.72)));
          const t = cycle + (1 - cycle) * exit * 0.65;
          const radius = (22 + Math.pow(t, 1.95 + warp * 0.6) * extent) * (0.12 + activeReveal * 0.88);
          const length = 0.8 + brake *
            (10 + t * t * (width < 600 ? 130 : 255)) *
            (0.38 + ray.depth * 0.68) *
            activeReveal *
            (1 + warp * 3.8);
          const alpha =
            intensity * brake *
            Math.min(1, t * 5.2) *
            Math.min(1, (1 - t) * 6.5) *
            (0.28 + ray.depth * 0.68);
          if (alpha <= 0.01 && landed === 0) continue;
          const end = radius + length;
          const bend = warp * t * t * length * 0.13;
          const headX = cx + ray.x * end - ray.y * bend;
          const headY = cy + ray.y * end + ray.x * bend;
          const ex = headX + (cx * (1 + ray.skyX) - headX) * landed;
          const ey = headY + (cy * (1 - ray.skyY) - headY) * landed;
          if (landed > 0) {
            ctx.globalAlpha = landed * (.50 + .45 * ray.shine);
            ctx.fillStyle = "#e9eeed";
            ctx.beginPath();
            ctx.arc(ex, ey, .5 * (1.15 + 1.5 * ray.shine), 0, 2 * Math.PI);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          if (alpha <= .01) continue;
          const ox = ex - headX + cx, oy = ey - headY + cy;
          const sx = ox + ray.x * radius, sy = oy + ray.y * radius;
          const mx = ox + ray.x * (radius + length * .56), my = oy + ray.y * (radius + length * .56);

          ctx.strokeStyle = "rgba(" + ray.color + "," + alpha * 0.42 + ")";
          ctx.lineWidth = 0.5 + ray.depth * 0.9;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(mx, my, ex, ey);
          ctx.stroke();

          const hx = ox + ray.x * (radius + length * 0.55);
          const hy = oy + ray.y * (radius + length * 0.55);
          ctx.strokeStyle = "rgba(" + ray.color + "," + Math.min(1, alpha * 1.15) + ")";
          ctx.lineWidth = 0.85 + ray.depth * 1.45;
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          if (ray.spark && ray.depth > 0.45 && t > 0.12 && t < 0.92) {
            ctx.fillStyle = "rgba(255,255,255," + Math.min(1, alpha * 1.25) + ")";
            ctx.beginPath();
            ctx.arc(ex, ey, 0.9 + ray.depth * 1.1, 0, Math.PI * 2);
            ctx.fill();
          }

          if (warp > 0.08 && i % 3 === 0) {
            const split = warp * (1.1 + t * 3.2);
            ctx.strokeStyle = "rgba(155,112,255," + alpha * warp * 0.38 + ")";
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(sx - ray.y * split, sy + ray.x * split);
            ctx.quadraticCurveTo(
              mx - ray.y * split,
              my + ray.x * split,
              ex - ray.y * split,
              ey + ray.x * split
            );
            ctx.stroke();
          }
        }
        if (veil && brake > 0) {
          ctx.globalAlpha = brake;
          ctx.fillStyle = veil;
          ctx.fillRect(0, 0, width, height);
          ctx.globalAlpha = 1;
        }
      }

    },
  };
}
