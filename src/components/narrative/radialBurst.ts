import { getPerformanceProfile } from "@/lib/performanceTier";

function traceArch(
  ctx: CanvasRenderingContext2D,
  cx: number,
  centerY: number,
  w: number,
  h: number
) {
  const r = w * 0.5;
  const topY = centerY - h * 0.5;
  const bottomY = centerY + h * 0.5;
  const arcCenterY = topY + r;
  ctx.beginPath();
  ctx.arc(cx, arcCenterY, r, Math.PI, 0, false);
  ctx.lineTo(cx + r, bottomY);
  ctx.lineTo(cx - r, bottomY);
  ctx.closePath();
}

/** Rendering only: the narrative owns the animation clock and lifecycle. */
export function createRadialBurst(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  let width = 0, height = 0, dpr = 1, clock = 0, rayScale = 1;
  let veil: CanvasGradient | undefined;
  const palette = ["108,232,248", "68,162,250", "138,98,246", "244,234,216"];
  const tunnelMultipliers = [2.45, 1.96, 1.58, 1.28, 1.09];
  const rays = Array.from({ length: 240 }, (_, i) => {
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
    };
  });

  return {
    resize(w: number, h: number) {
      const perf = getPerformanceProfile();
      width = w;
      height = h;
      dpr = Math.min(window.devicePixelRatio || 1, perf.maxCanvasDpr);
      rayScale = perf.burstRayScale;
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
      portalProgress = 0
    ) {
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#050507";
      ctx.fillRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;

      // Boost starfield warp as the camera accelerates into the portal
      const portalThrust = Math.sin(portalProgress * Math.PI) * 0.72;
      const effectiveIntensity = Math.max(intensity, portalProgress > 0 && portalProgress < 0.92 ? (1 - portalProgress) * 0.55 : 0);

      if (effectiveIntensity > 0.001) {
        ctx.lineCap = "round";
        const warp = Math.min(1.35, Math.max(0, (speed - 0.25) / 0.75) + portalThrust);
        clock += direction * dt * (0.065 + speed * 0.18 + warp * warp * 0.95);
        const extent = Math.hypot(width, height) * 0.6;
        const count = Math.round((width < 600 ? 140 : rays.length) * rayScale);
        const activeReveal = Math.max(reveal, portalProgress > 0 ? 1 : 0);

        for (let i = 0; i < count; i++) {
          const ray = rays[i];
          const position = ray.phase + clock * (0.55 + ray.depth * 0.72);
          const cycle = position - Math.floor(position);
          const t = cycle + (1 - cycle) * exit * 0.65;
          const radius = (22 + Math.pow(t, 1.95 + warp * 0.6) * extent) * (0.12 + activeReveal * 0.88);
          const length =
            (10 + t * t * (width < 600 ? 130 : 255)) *
            (0.38 + ray.depth * 0.68) *
            activeReveal *
            (1 + warp * 3.8);
          const alpha =
            effectiveIntensity *
            Math.min(1, t * 5.2) *
            Math.min(1, (1 - t) * 6.5) *
            (0.28 + ray.depth * 0.68);
          if (alpha <= 0.01) continue;
          const end = radius + length;
          const bend = warp * t * t * length * 0.13;
          const sx = cx + ray.x * radius,
            sy = cy + ray.y * radius;
          const mx = cx + ray.x * (radius + length * 0.56),
            my = cy + ray.y * (radius + length * 0.56);
          const ex = cx + ray.x * end - ray.y * bend;
          const ey = cy + ray.y * end + ray.x * bend;

          ctx.strokeStyle = "rgba(" + ray.color + "," + alpha * 0.42 + ")";
          ctx.lineWidth = 0.5 + ray.depth * 0.9;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(mx, my, ex, ey);
          ctx.stroke();

          const hx = cx + ray.x * (radius + length * 0.55);
          const hy = cy + ray.y * (radius + length * 0.55);
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
        if (veil && portalProgress < 0.4) {
          ctx.globalAlpha = 1 - portalProgress / 0.4;
          ctx.fillStyle = veil;
          ctx.fillRect(0, 0, width, height);
          ctx.globalAlpha = 1;
        }
      }

      // 3D Spatial Portal Tunnel & See-Through Window into the Globe
      if (portalProgress > 0.0005) {
        const isMobile = width < 768;
        const baseW = isMobile
          ? Math.min(192, Math.max(142, width * 0.42))
          : Math.min(236, Math.max(148, width * 0.2));
        const baseH = baseW * (isMobile ? 1.24 : 1.28);

        // Phase 1: Arch doorway rises from horizon and locks to optical center
        const riseT = Math.min(1, portalProgress / 0.24);
        const riseEase = 1 - Math.pow(1 - riseT, 3);
        const startY = height + baseH * 0.45;
        const targetY = height * 0.52;
        const portalCenterY = startY + (targetY - startY) * riseEase;

        // Phase 2: Perspective camera dolly accelerating through the portal
        const flyT = Math.max(0, (portalProgress - 0.08) / 0.92);
        const maxScale = (Math.hypot(width, height) / Math.min(baseW, baseH)) * 2.35;
        // True perspective 1/z-like acceleration curve
        const innerScale = 1 + Math.pow(flyT, 2.25) * maxScale;

        const innerW = baseW * innerScale;
        const innerH = baseH * innerScale;

        // Outer tunnel boundary (corridor entrance rushing past the viewer)
        const outerScale = innerScale * tunnelMultipliers[0];
        const outerW = baseW * outerScale;
        const outerH = baseH * outerScale;

        // Draw 3D corridor wall between outer tunnel entrance and inner portal threshold
        const tunnelAlpha = Math.min(1, portalProgress * 5);
        traceArch(ctx, cx, portalCenterY, outerW, outerH);
        ctx.fillStyle = `rgba(9, 12, 20, ${0.88 * tunnelAlpha})`;
        ctx.fill();

        // Perspective corridor guide lines connecting outer arch to inner portal opening
        const guideAlpha = 0.28 * tunnelAlpha * (1 - Math.pow(flyT, 3));
        if (guideAlpha > 0.01) {
          ctx.strokeStyle = `rgba(108, 232, 248, ${guideAlpha})`;
          ctx.lineWidth = 1;
          const angles = [-Math.PI, -Math.PI * 0.75, -Math.PI * 0.5, -Math.PI * 0.25, 0];
          const outerTopY = portalCenterY - outerH * 0.5 + outerW * 0.5;
          const innerTopY = portalCenterY - innerH * 0.5 + innerW * 0.5;
          ctx.beginPath();
          for (const a of angles) {
            const cos = Math.cos(a);
            const sin = Math.sin(a);
            ctx.moveTo(cx + cos * (innerW * 0.5), innerTopY + sin * (innerW * 0.5));
            ctx.lineTo(cx + cos * (outerW * 0.5), outerTopY + sin * (outerW * 0.5));
          }
          // Bottom corner perspective rails
          ctx.moveTo(cx - innerW * 0.5, portalCenterY + innerH * 0.5);
          ctx.lineTo(cx - outerW * 0.5, portalCenterY + outerH * 0.5);
          ctx.moveTo(cx + innerW * 0.5, portalCenterY + innerH * 0.5);
          ctx.lineTo(cx + outerW * 0.5, portalCenterY + outerH * 0.5);
          ctx.stroke();
        }

        // Concentric 3D arch ribs rushing past the camera
        for (let rIdx = 0; rIdx < tunnelMultipliers.length; rIdx++) {
          const mult = tunnelMultipliers[rIdx];
          const rw = baseW * innerScale * mult;
          const rh = baseH * innerScale * mult;
          // Skip rings that have already expanded far beyond the viewport
          if (rw > width * 2.6 && rh > height * 2.6) continue;

          const depthFactor = (rIdx + 1) / tunnelMultipliers.length;
          const ringAlpha = tunnelAlpha * (0.18 + depthFactor * 0.42);
          traceArch(ctx, cx, portalCenterY, rw, rh);
          ctx.strokeStyle =
            rIdx % 2 === 0
              ? `rgba(108, 232, 248, ${ringAlpha})`
              : `rgba(244, 234, 216, ${ringAlpha * 0.85})`;
          ctx.lineWidth = 1 + depthFactor * 1.4;
          ctx.stroke();
        }

        // Luminous outer rim glow around the innermost portal opening
        traceArch(ctx, cx, portalCenterY, innerW + 6, innerH + 6);
        ctx.strokeStyle = `rgba(108, 232, 248, ${0.45 * tunnelAlpha})`;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Punch a true transparent window inside the inner arch so the live ASCII Globe is visible inside!
        ctx.globalCompositeOperation = "destination-out";
        traceArch(ctx, cx, portalCenterY, innerW, innerH);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";

        // Atmospheric threshold mist inside the portal that clears as you fly in
        const mistFade = Math.max(0, 1 - Math.max(0, (portalProgress - 0.06) / 0.42));
        const mistAlpha = mistFade * mistFade * 0.86;
        if (mistAlpha > 0.005) {
          traceArch(ctx, cx, portalCenterY, innerW, innerH);
          ctx.fillStyle = `rgba(255, 255, 255, ${mistAlpha.toFixed(3)})`;
          ctx.fill();
        }

        // Crisp inner portal doorframe edge
        if (innerW < width * 2.2) {
          traceArch(ctx, cx, portalCenterY, innerW, innerH);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.88 * tunnelAlpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    },
  };
}
