/** Rendering only: the narrative owns the animation clock and lifecycle. */
export function createRadialBurst(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  let width = 0, height = 0, dpr = 1, clock = 0;
  let veil: CanvasGradient | undefined;
  const rays = Array.from({ length: 216 }, (_, i) => {
    const seed = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    const angle = i * 2.3999632297;
    return { x: Math.cos(angle), y: Math.sin(angle), phase: seed(i + 1), depth: seed(i + 130), color: ["95,226,239", "56,155,240", "121,87,235"][i % 7 === 0 ? 2 : i % 3 === 0 ? 1 : 0] };
  });
  return {
    resize(w: number, h: number) {
      width = w; height = h; dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        veil = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.min(width * 0.45, 350));
        veil.addColorStop(0, "rgba(0,0,0,0.94)");
        veil.addColorStop(0.45, "rgba(0,0,0,0.72)");
        veil.addColorStop(1, "rgba(0,0,0,0)");
      }
    },
    draw(dt: number, intensity: number, speed: number, direction: number, reveal: number, exit = 0) {
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (intensity <= 0) return;
      // Smooth velocity comes from the controller; warp only engages at high input.
      const warp = Math.max(0, (speed - 0.3) / 0.7);
      clock += direction * dt * (0.055 + speed * 0.16 + warp * warp * 0.85);
      const extent = Math.hypot(width, height) * 0.58;
      for (let i = 0; i < (width < 600 ? 128 : rays.length); i++) {
        const ray = rays[i];
        const position = ray.phase + clock * (0.55 + ray.depth * 0.7);
        const cycle = position - Math.floor(position);
        // During the outro, finish every active ray outward instead of recycling it.
        const t = cycle + (1 - cycle) * exit;
        const radius = (28 + Math.pow(t, 2 + warp * 0.6) * extent) * (0.12 + reveal * 0.88);
        const length = (8 + t * t * (width < 600 ? 115 : 230)) * (0.4 + ray.depth * 0.6) * reveal * (1 + warp * 3.8);
        const alpha = intensity * Math.min(1, t * 5) * Math.min(1, (1 - t) * 7) * (0.25 + ray.depth * 0.65);
        ctx.strokeStyle = "rgba(" + ray.color + "," + alpha + ")";
        ctx.lineWidth = 0.6 + ray.depth * 1.2;
        const end = radius + length;
        // Radial lens stretch with a subtle tangential bend toward the edges.
        const bend = warp * t * t * length * 0.13;
        const sx = width / 2 + ray.x * radius, sy = height / 2 + ray.y * radius;
        const ex = width / 2 + ray.x * end - ray.y * bend;
        const ey = height / 2 + ray.y * end + ray.x * bend;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(width / 2 + ray.x * (radius + length * 0.55), height / 2 + ray.y * (radius + length * 0.55), ex, ey);
        ctx.stroke();
        // Fine chromatic edge, confined to the canvas, never the text.
        if (warp > 0.1 && i % 3 === 0) {
          const split = warp * (1 + t * 3);
          ctx.strokeStyle = "rgba(145,103,255," + (alpha * warp * 0.35) + ")";
          ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.moveTo(sx - ray.y * split, sy + ray.x * split);
          ctx.quadraticCurveTo(width / 2 + ray.x * (radius + length * 0.55) - ray.y * split, height / 2 + ray.y * (radius + length * 0.55) + ray.x * split, ex - ray.y * split, ey + ray.x * split);
          ctx.stroke();
        }
      }
      if (veil) { ctx.fillStyle = veil; ctx.fillRect(0, 0, width, height); }
    },
  };
}
