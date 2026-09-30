const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t); };
const seed = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

/** Cached ASCII field with local, damped elastic displacement. */
export function createAsciiSweep() {
  const field = document.createElement("canvas");
  const layer = document.createElement("canvas");
  const rippled = document.createElement("canvas");
  const fieldCtx = field.getContext("2d")!;
  const layerCtx = layer.getContext("2d")!;
  const rippledCtx = rippled.getContext("2d")!;
  const palette = ".:+x#%@";
  const moving = new Map<number, { dx: number; dy: number; vx: number; vy: number }>();
  let width = 1, height = 1, dpr = 1, cell = 4, row = 5, gridStartY = 0, columns = 0;
  let cells: { x: number; y: number; glyph: string; alpha: number }[] = [];
  const offset = (y: number) => 0.48 * (1 - y / height) + 0.025 * Math.sin(y / height * 12) + 0.012 * Math.sin(y / height * 31);
  const sweep = (p: number) => -0.12 + 1.24 * clamp((p - 0.15) / 0.5);
  return {
    resize(w: number, h: number, ratio: number, headerBottom: number) {
      width = w; height = h; dpr = ratio;
      cell = width < 600 ? 4 : 6;
      row = cell * 1.25;
      for (const canvas of [field, layer, rippled]) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      moving.clear();
      columns = Math.max(1, Math.ceil(width / cell) - 1);
      gridStartY = 100 - Math.ceil(100 / row) * row;
      cells = [];
      fieldCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fieldCtx.fillStyle = "#fff"; fieldCtx.fillRect(0, 0, width, height);
      fieldCtx.font = `600 ${cell + 2}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      fieldCtx.textAlign = "center"; fieldCtx.textBaseline = "middle";
      const clearUntil = headerBottom + 16;
      const feather = Math.max(48, Math.min(120, height * 0.14));
      // Same grid origin as the map, extended across the full viewport.
      for (let y = gridStartY; y < height + row; y += row) {
        const density = smooth((y - clearUntil) / feather);
        for (let x = cell; x < width; x += cell) {
          const index = cells.length;
          if (density === 0) { cells.push({ x, y, glyph: "", alpha: 0 }); continue; }
          const random = seed(x / cell, (y - 100) / row);
          const alpha = (0.5 + random * 0.42) * density;
          const glyph = palette[Math.floor(random * palette.length)];
          fieldCtx.fillStyle = `rgba(18,22,26,${alpha})`;
          fieldCtx.fillText(glyph, x, y);
          cells[index] = { x, y, glyph, alpha };
        }
      }
    },
    covered(x: number, y: number, progress: number) {
      return smooth((sweep(progress) - (0.52 * x / width + offset(y)) + 0.04) / 0.08);
    },
    drag(x: number, y: number, dx: number, dy: number) {
      const radius = width < 600 ? 100 : 135;
      const distance = Math.hypot(dx, dy);
      if (distance < 0.01) return;
      const gain = Math.min(1, 28 / distance) * 6;
      const minColumn = Math.max(0, Math.floor((x - radius) / cell) - 1);
      const maxColumn = Math.min(columns - 1, Math.ceil((x + radius) / cell));
      const minRow = Math.max(0, Math.floor((y - radius - gridStartY) / row));
      const maxRow = Math.min(Math.ceil(cells.length / columns) - 1, Math.ceil((y + radius - gridStartY) / row));
      for (let iy = minRow; iy <= maxRow; iy++) {
        for (let ix = minColumn; ix <= maxColumn; ix++) {
          const index = iy * columns + ix;
          const item = cells[index];
          if (!item?.glyph) continue;
          const r2 = ((item.x - x) ** 2 + (item.y - y) ** 2) / (radius * radius);
          if (r2 >= 1) continue;
          // Smooth, compact support makes adjacent characters move as one surface.
          const weight = (1 - r2) ** 3;
          const state = moving.get(index) ?? { dx: 0, dy: 0, vx: 0, vy: 0 };
          state.vx += dx * gain * weight;
          state.vy += dy * gain * weight;
          const limit = Math.min(1, 95 / Math.max(1, Math.hypot(state.vx, state.vy)));
          state.vx *= limit; state.vy *= limit;
          moving.set(index, state);
        }
      }
    },
    resetMotion() { moving.clear(); },
    updateMotion(dt: number) {
      // Spring stiffness 180, damping 25: close to critical damping.
      // Bounded substeps keep the integration stable across display refresh rates.
      const elapsed = Math.min(0.1, dt / 1000);
      const steps = Math.max(1, Math.ceil(elapsed * 120));
      const step = elapsed / steps;
      for (const [index, state] of moving) {
        for (let i = 0; i < steps; i++) {
          state.vx += (-180 * state.dx - 25 * state.vx) * step;
          state.vy += (-180 * state.dy - 25 * state.vy) * step;
          state.dx += state.vx * step;
          state.dy += state.vy * step;
          const displacement = Math.hypot(state.dx, state.dy);
          if (displacement > 8) {
            state.dx *= 8 / displacement; state.dy *= 8 / displacement;
            const outward = (state.vx * state.dx + state.vy * state.dy) / 64;
            if (outward > 0) { state.vx -= outward * state.dx; state.vy -= outward * state.dy; }
          }
        }
        if (Math.hypot(state.dx, state.dy) < 0.01 && Math.hypot(state.vx, state.vy) < 0.04) moving.delete(index);
      }
      return moving.size > 0;
    },
    draw(ctx: CanvasRenderingContext2D, progress: number) {
      if (progress <= 0.15) return;
      if (progress >= 1) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height); return; }
      let surface = field;
      if (moving.size) {
        rippledCtx.setTransform(1, 0, 0, 1, 0, 0);
        rippledCtx.clearRect(0, 0, rippled.width, rippled.height);
        rippledCtx.drawImage(field, 0, 0);
        rippledCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        rippledCtx.font = fieldCtx.font;
        rippledCtx.textAlign = "center";
        rippledCtx.textBaseline = "middle";
        for (const index of moving.keys()) {
          const item = cells[index];
          if (!item) continue;
          // Remove the resting glyph before drawing its displaced position.
          rippledCtx.fillStyle = "#fff";
          rippledCtx.fillRect(item.x - cell / 2, item.y - row / 2, cell, row);
        }
        for (const [index, movement] of moving) {
          const item = cells[index];
          if (!item) continue;
          rippledCtx.fillStyle = `rgba(18,22,26,${item.alpha})`;
          rippledCtx.fillText(item.glyph, item.x + movement.dx, item.y + movement.dy);
        }
        surface = rippled;
      }
      if (progress >= 0.65) {
        ctx.drawImage(surface, 0, 0, width, height);
      } else {
        layerCtx.setTransform(1, 0, 0, 1, 0, 0);
        layerCtx.clearRect(0, 0, layer.width, layer.height);
        layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Build the whole mask before compositing the cached field once.
        for (let y = 0; y < height; y += row) {
          const edge = (sweep(progress) - offset(y + row / 2)) / 0.52 * width;
          const feather = width * 0.04 / 0.52;
          const mask = layerCtx.createLinearGradient(edge - feather, 0, edge + feather, 0);
          mask.addColorStop(0, "#fff"); mask.addColorStop(1, "rgba(255,255,255,0)");
          layerCtx.fillStyle = mask; layerCtx.fillRect(0, y, width, Math.min(row, height - y));
        }
        layerCtx.globalCompositeOperation = "source-in";
        layerCtx.drawImage(surface, 0, 0, width, height);
        layerCtx.globalCompositeOperation = "source-over";
        ctx.drawImage(layer, 0, 0, width, height);
      }
      if (progress > 0.75) {
        const white = -0.15 + 1.3 * clamp((progress - 0.75) / 0.25);
        const edge = height * (1 - white);
        const fade = ctx.createLinearGradient(0, edge - height * 0.15, 0, edge + height * 0.15);
        fade.addColorStop(0, "rgba(255,255,255,0)"); fade.addColorStop(1, "#fff");
        ctx.fillStyle = fade; ctx.fillRect(0, 0, width, height);
      }
    },
  };
}
