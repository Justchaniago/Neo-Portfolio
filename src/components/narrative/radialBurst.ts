/** Rendering only: the narrative owns the animation clock and lifecycle. */
export function createRadialBurst(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  let width = 0, height = 0, dpr = 1, clock = 0;
  let veil: CanvasGradient | undefined;
  const palette = ["108,232,248", "68,162,250", "138,98,246", "244,234,216"];
  const rays = Array.from({ length: 240 }, (_, i) => {
    const seed = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
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
      width = w; height = h; dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        veil = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.min(width * 0.44, 340));
        veil.addColorStop(0, "rgba(5,5,7,0.92)");
        veil.addColorStop(0.45, "rgba(5,5,7,0.64)");
        veil.addColorStop(1, "rgba(5,5,7,0)");
      }
    },
    draw(dt: number, intensity: number, speed: number, direction: number, reveal: number, exit = 0) {
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (intensity <= 0) return;
      ctx.lineCap = "round";
      // Smooth velocity comes from the controller; warp only engages at high input.
      const warp = Math.max(0, (speed - 0.25) / 0.75);
      clock += direction * dt * (0.065 + speed * 0.18 + warp * warp * 0.9);
      const extent = Math.hypot(width, height) * 0.6;
      const cx = width / 2, cy = height / 2;
      const count = width < 600 ? 140 : rays.length;
      for (let i = 0; i < count; i++) {
        const ray = rays[i];
        const position = ray.phase + clock * (0.55 + ray.depth * 0.72);
        const cycle = position - Math.floor(position);
        // During the outro, finish every active ray outward instead of recycling it.
        const t = cycle + (1 - cycle) * exit;
        const radius = (22 + Math.pow(t, 1.95 + warp * 0.6) * extent) * (0.12 + reveal * 0.88);
        const length = (10 + t * t * (width < 600 ? 130 : 255)) * (0.38 + ray.depth * 0.68) * reveal * (1 + warp * 3.8);
        const alpha = intensity * Math.min(1, t * 5.2) * Math.min(1, (1 - t) * 6.5) * (0.28 + ray.depth * 0.68);
        if (alpha <= 0.01) continue;
        const end = radius + length;
        // Radial lens stretch with a subtle tangential bend toward the edges.
        const bend = warp * t * t * length * 0.13;
        const sx = cx + ray.x * radius, sy = cy + ray.y * radius;
        const mx = cx + ray.x * (radius + length * 0.56), my = cy + ray.y * (radius + length * 0.56);
        const ex = cx + ray.x * end - ray.y * bend;
        const ey = cy + ray.y * end + ray.x * bend;

        // Outer trail
        ctx.strokeStyle = "rgba(" + ray.color + "," + (alpha * 0.42) + ")";
        ctx.lineWidth = 0.5 + ray.depth * 0.9;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(mx, my, ex, ey);
        ctx.stroke();

        // Bright meteor head segment (front 45% of the streak)
        const hx = cx + ray.x * (radius + length * 0.55);
        const hy = cy + ray.y * (radius + length * 0.55);
        ctx.strokeStyle = "rgba(" + ray.color + "," + Math.min(1, alpha * 1.15) + ")";
        ctx.lineWidth = 0.85 + ray.depth * 1.45;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Luminous leading spark on prominent shooting stars
        if (ray.spark && ray.depth > 0.45 && t > 0.12 && t < 0.92) {
          ctx.fillStyle = "rgba(255,255,255," + Math.min(1, alpha * 1.25) + ")";
          ctx.beginPath();
          ctx.arc(ex, ey, 0.9 + ray.depth * 1.1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Fine chromatic edge, confined to the canvas, never the text.
        if (warp > 0.08 && i % 3 === 0) {
          const split = warp * (1.1 + t * 3.2);
          ctx.strokeStyle = "rgba(155,112,255," + (alpha * warp * 0.38) + ")";
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(sx - ray.y * split, sy + ray.x * split);
          ctx.quadraticCurveTo(mx - ray.y * split, my + ray.x * split, ex - ray.y * split, ey + ray.x * split);
          ctx.stroke();
        }
      }
      if (veil) { ctx.fillStyle = veil; ctx.fillRect(0, 0, width, height); }
    },
  };
}
