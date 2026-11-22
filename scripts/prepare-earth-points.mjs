// Bake once, not in the visitor's browser. Input: existing Natural Earth polygons.
import { readFileSync, writeFileSync } from "node:fs";

const folder = new URL("../public/maps/", import.meta.url);
const polygons = JSON.parse(readFileSync(new URL("earth.json", folder), "utf8"));
function raster(west, south, cols, rows, resolution, indonesiaOnly) {
  const mask = new Uint8Array(cols * rows);
  for (const polygon of polygons) {
    if (indonesiaOnly && !polygon.indonesia) continue;
    const cuts = new Map();
    for (const ring of polygon.rings) {
      for (let i = 1; i < ring.length; i++) {
        const [ax, ay] = ring[i - 1], [bx, by] = ring[i];
        const first = Math.max(0, Math.ceil((Math.min(ay, by) - south) * resolution - 0.5));
        const last = Math.min(rows, Math.ceil((Math.max(ay, by) - south) * resolution - 0.5));
        for (let y = first; y < last; y++) {
          const lat = south + (y + 0.5) / resolution;
          if (!cuts.has(y)) cuts.set(y, []);
          cuts.get(y).push(ax + (bx - ax) * (lat - ay) / (by - ay));
        }
      }
    }
    for (const [y, xs] of cuts) {
      xs.sort((a, b) => a - b);
      const col = x => Math.max(0, Math.min(cols, Math.ceil((x - west) * resolution - 0.5)));
      for (let k = 0; k + 1 < xs.length; k += 2) mask.fill(1, y * cols + col(xs[k]), y * cols + col(xs[k + 1]));
    }
  }
  return (x, y) => mask[Math.floor((y - south) * resolution) * cols + Math.floor((x - west) * resolution)];
}

const world = raster(-180, -90, 3600, 1800, 10, false);
const islands = raster(93, -13.5, 4000, 1760, 80, true);
const globe = [], map = [], count = 24576, rad = Math.PI / 180;
let seed = 6411903;
const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
while (globe.length < count) {
  const lon = rand() * 360 - 180, y = rand() * 2 - 1;
  const land = world(lon, Math.asin(y) / rad);
  if (!land && rand() > 0.34) continue;
  const cos = Math.sqrt(1 - y * y), x = cos * Math.sin(lon * rad), z = cos * Math.cos(lon * rad);
  globe.push({ x, y, z, sortX: x * Math.cos(118 * rad) - z * Math.sin(118 * rad), grain: (0.01 + 0.99 * rand()) * (land ? 1 : -1) });
}
while (map.length < count) {
  const x = rand() * 2 - 1, y = rand() * 2 - 1;
  if (islands(118 + x * 25, -2.5 + y * 11)) map.push({ sortX: x, y });
}
// Pair nearby screen positions to avoid a crossing swarm. Shuffle pairs once:
// even the shorter mobile prefix describes the entire sphere and archipelago.
for (const shape of [globe, map]) {
  shape.sort((a, b) => a.sortX - b.sortX);
  for (let i = 0; i < count; i += 256) shape.splice(i, 256, ...shape.slice(i, i + 256).sort((a, b) => a.y - b.y));
}
const ids = Array.from({ length: count }, (_, i) => i);
for (let i = count - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [ids[i], ids[j]] = [ids[j], ids[i]];
}
const bytes = Buffer.alloc(count * 12);
ids.forEach((id, i) => {
  const g = globe[id], m = map[id];
  [g.x, g.y, g.z, m.sortX, m.y, g.grain].forEach((v, j) => bytes.writeInt16LE(Math.round(v * 32767), i * 12 + j * 2));
});
writeFileSync(new URL("earth-points.v1.bin", folder), bytes);
