// WebKit can rasterize a viewport-sized gradient for each fillText. Sample
// the dawn palette at each glyph instead; keep native font coverage and alpha.
export function inkRamp(day: number, dusk: number, night: number) {
  return Array.from({ length: 513 }, (_, i) => {
    const a = i <= 256 ? day : dusk, b = i <= 256 ? dusk : night;
    const t = i <= 256 ? i / 256 : (i - 256) / 256;
    const channel = (shift: number) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
    return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
  });
}
