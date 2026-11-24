import { getPerformanceProfile } from "@/lib/performanceTier";
import { HORIZON_ENTRY, HORIZON_PASSED, ramp } from "./globeArrival";
import { createStarSeeds, GUIDE_STARS, SHORT_UNIT } from "./starField";

const OUTER_STARS = 320;

/** Rendering only: the narrative owns the animation clock and lifecycle. */
export function createRadialBurst(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  let width = 0, height = 0, dpr = 1, clock = 0, rayScale = 1;
  let smoothExit = 0, smoothFlight = 0, primed = false;
  let veil: CanvasGradient | undefined;
  const sky = createStarSeeds(OUTER_STARS);
  const palette = [
    [132, 224, 246],
    [98, 174, 250],
    [158, 134, 242],
    [244, 234, 216],
  ] as const;

  const seed = (n: number) => {
    const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
  };

  const rays = Array.from({ length: OUTER_STARS }, (_, i) => {
    const angle = i * 2.3999632297;
    const colorIndex = i % 9 === 0 ? 3 : i % 7 === 0 ? 2 : i % 3 === 0 ? 1 : 0;
    const skyX = i < GUIDE_STARS ? sky[i * 4] / SHORT_UNIT : Math.cos(angle) * (0.18 + 0.82 * Math.sqrt(seed(i + 41)));
    const skyY = i < GUIDE_STARS ? sky[i * 4 + 1] / SHORT_UNIT : -Math.sin(angle) * (0.18 + 0.82 * Math.sqrt(seed(i + 83)));
    return {
      x: Math.cos(angle),
      y: Math.sin(angle),
      phase: seed(i + 1),
      depth: 0.25 + 0.75 * seed(i + 130),
      mag: 0.35 + 0.65 * Math.pow(seed(i + 271), 1.6),
      rgb: palette[colorIndex],
      spark: i % 6 === 0,
      skyX,
      skyY,
    };
  });

  return {
    resize(w: number, h: number) {
      const perf = getPerformanceProfile();
      width = w;
      height = h;
      dpr = Math.min(window.devicePixelRatio || 1, perf.maxCanvasDpr);
      rayScale = perf.burstRayScale;
      for (const ray of rays) {
        const dx = ray.skyX * w, dy = -ray.skyY * h;
        const distance = Math.hypot(dx, dy) || 1;
        ray.x = dx / distance;
        ray.y = dy / distance;
      }
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
      if (!ctx) return;
      if (!primed || Math.abs(flight - smoothFlight) > 0.35) {
        smoothExit = exit;
        smoothFlight = flight;
        primed = true;
      } else {
        const alpha = 1 - Math.exp(-Math.max(0.001, dt) * 22);
        smoothExit += (exit - smoothExit) * alpha;
        smoothFlight += (flight - smoothFlight) * alpha;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#050507";
      ctx.fillRect(0, 0, width, height);

      const cx = width * 0.5, cy = height * 0.5;
      const short = Math.min(width, height), reach = Math.hypot(cx, cy);
      const unit = (v: number) => Math.max(0, Math.min(1, v));

      const spool = unit(smoothExit * 0.52 + ramp(smoothFlight, 0, HORIZON_ENTRY) * 0.72);
      const open = unit(smoothFlight / HORIZON_PASSED);
      const horizonFade = ramp(smoothFlight, 0.004, 0.11);

      // Open tunnel mouth: starts right at the natural central opening of the starburst,
      // then widens smoothly past the viewport edges so the distant starry sky opens up completely.
      const baseMouth = short * 0.135;
      const throat = smoothFlight > 0.001
        ? baseMouth * ramp(smoothFlight, 0, 0.05) + (reach * 1.34 - baseMouth) * Math.pow(open, 2.35)
        : 0;

      if (intensity > 0.001 && open < 0.996) {
        ctx.lineCap = "round";
        const scrollWarp = Math.min(1.3, Math.max(0, (speed - 0.22) / 0.78));
        const warp = Math.max(scrollWarp, spool * spool * 1.72);
        const forward = smoothExit > 0.03 || smoothFlight > 0 ? 1 : direction;

        clock += dt * forward * (0.048 + speed * 0.15 + warp * warp * 0.92);
        const continuousDrive = smoothExit * smoothExit * 0.42 + smoothFlight * (0.88 + smoothFlight * 3.2);
        const travel = clock + continuousDrive;

        const focal = reach * 0.135 * (0.18 + reveal * 0.82);
        const exposure = 0.014 + reveal * (0.024 * speed + warp * 0.175) * (1 - open * 0.22);
        const shift = unit(spool * 0.86);
        const fadeOut = 1 - ramp(open, 0.76, 1);
        const outerCount = Math.round((width < 600 ? 190 : OUTER_STARS) * rayScale);

        ctx.globalCompositeOperation = "lighter";

        for (let i = 0; i < outerCount; i++) {
          const ray = rays[i];
          const p = ray.phase + travel * (0.48 + ray.depth * 0.68);
          const u = p - Math.floor(p);
          const zHead = 1.0 - u * 0.938;
          const zTail = Math.min(1.04, zHead + exposure * (0.45 + 0.75 * ray.depth));

          const rawHead = focal / zHead;
          const rawTail = focal / zTail;
          // Tunnel walls part smoothly around the widening central opening without any ring or twist.
          const rHead = throat > 0 ? Math.hypot(rawHead, throat * 0.92) : rawHead;
          const rTail = throat > 0 ? Math.hypot(rawTail, throat * 0.92) : rawTail;
          if (rTail > reach * 1.18) continue;

          const rMid = 0.5 * (rTail + rHead);
          const env = ramp(u, 0, 0.14) * (1 - ramp(u, 0.91, 1));
          const alpha = intensity * fadeOut * env * (0.22 + 0.72 * ray.mag);
          if (alpha <= 0.008) continue;

          const bend = warp * u * u * (rHead - rTail) * 0.04 * (1 - open);
          const sx = cx + ray.x * rTail, sy = cy + ray.y * rTail;
          const mx = cx + ray.x * rMid, my = cy + ray.y * rMid;
          const ex = cx + ray.x * rHead - ray.y * bend, ey = cy + ray.y * rHead + ray.x * bend;

          const rCol = Math.round(ray.rgb[0] + (236 - ray.rgb[0]) * shift);
          const gCol = Math.round(ray.rgb[1] + (241 - ray.rgb[1]) * shift);
          const bCol = Math.round(ray.rgb[2] + (249 - ray.rgb[2]) * shift);
          const rgb = rCol + "," + gCol + "," + bCol;
          const proximity = unit((1 - zHead) * 1.15);
          const widthBase = 0.42 + 0.95 * ray.mag * proximity;

          ctx.strokeStyle = "rgba(" + rgb + "," + Math.min(1, alpha * 0.34) + ")";
          ctx.lineWidth = widthBase * 1.45;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(mx, my, ex, ey);
          ctx.stroke();

          const coreX = mx + (ex - mx) * 0.22, coreY = my + (ey - my) * 0.22;
          ctx.strokeStyle = "rgba(246,248,252," + Math.min(1, alpha * (0.72 + 0.42 * shift)) + ")";
          ctx.lineWidth = widthBase * 0.78;
          ctx.beginPath();
          ctx.moveTo(coreX, coreY);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          if (ray.spark && ray.mag > 0.55 && u > 0.18 && u < 0.92) {
            ctx.fillStyle = "rgba(252,253,255," + Math.min(1, alpha * 0.95) + ")";
            ctx.beginPath();
            ctx.arc(ex, ey, Math.max(0.55, widthBase * 0.68), 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.globalCompositeOperation = "source-over";
        if (veil && spool < 1) {
          ctx.globalAlpha = 1 - spool;
          ctx.fillStyle = veil;
          ctx.fillRect(0, 0, width, height);
          ctx.globalAlpha = 1;
        }
      }

      // Pure open tunnel center: no black hole, no ring — just a soft feathered window
      // revealing the distant starry sky far on the horizon until it opens across the whole screen.
      if (throat > 1 && horizonFade > 0.001) {
        const apertureOuter = Math.max(4, throat * 1.04);
        const apertureInner = throat * 0.28;
        const mask = ctx.createRadialGradient(cx, cy, apertureInner, cx, cy, apertureOuter);
        mask.addColorStop(0, "rgba(0,0,0," + horizonFade + ")");
        mask.addColorStop(0.54, "rgba(0,0,0," + horizonFade * 0.78 + ")");
        mask.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = mask;
        ctx.beginPath();
        ctx.arc(cx, cy, apertureOuter, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      }
    },
  };
}
