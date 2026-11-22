export const GUIDE_STARS = 240;
export const SHORT_UNIT = 32767;

// One repeatable prefix for the burst heads, point buffer and no-WebGL path.
// Signed-normalized shorts: sky XY (Y up), visibility rank, luminosity.
export function createStarSeeds(count: number) {
  const data = new Int16Array(count * 4);
  let state = 0x31b6fc27;
  const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < count; i++) {
    let x = random() * 2 - 1, y = random() * 2 - 1;
    if (i < GUIDE_STARS) {
      const angle = i * 2.3999632297;
      const dx = Math.cos(angle), dy = -Math.sin(angle);
      const reach = (.035 + .955 * Math.sqrt(random())) / Math.max(Math.abs(dx), Math.abs(dy));
      x = dx * reach; y = dy * reach;
    }
    data[i * 4] = Math.round(x * SHORT_UNIT);
    data[i * 4 + 1] = Math.round(y * SHORT_UNIT);
    data[i * 4 + 2] = i < GUIDE_STARS ? -SHORT_UNIT : Math.round(random() * SHORT_UNIT);
    data[i * 4 + 3] = Math.round(random() * SHORT_UNIT);
  }
  return data;
}
