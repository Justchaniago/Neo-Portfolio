import { SURABAYA } from "@/components/narrative/globeData";

const EM = 128;
const PAD = 12;

/** Make one glyph imprint after font load. Point IDs never change on resize or reverse. */
export function makeLetterpress(points: Int16Array, family: string) {
  const tile = document.createElement("canvas");
  const ink = tile.getContext("2d", { willReadFrequently: true });
  if (!ink) throw Error("Type sampler unavailable");
  const setFace = () => {
    ink.font = `500 ${EM}px ${family}`;
    ink.letterSpacing = "-5px";
  };
  setFace();
  const lines = ["What got", "easier?"];
  tile.width = Math.ceil(Math.max(...lines.map(line => ink.measureText(line).width))) + 2 * PAD;
  tile.height = EM * 2 + 2 * PAD;
  setFace();
  ink.fillStyle = "black";
  lines.forEach((line, i) => ink.fillText(line, PAD, EM * (.85 + i * .96)));
  const { width: w, height: h } = tile;
  const rgba = ink.getImageData(0, 0, w, h).data;
  const solid = (x: number, y: number) => rgba[(y * w + x) * 4 + 3] >= 128;
  const mark = Math.ceil(PAD + ink.measureText("easier").width + 1);
  let dotTop = h, dotX = 0, dotY = 0, area = 0;
  // Lift only the disconnected punctuation dot; the Surabaya pin supplies its ink.
  for (let y = h - 1; y > EM; y--) {
    let on = false;
    for (let x = mark; x < w; x++) if (solid(x, y)) {
      on = true; dotX += x + .5; dotY += y + .5; area++;
    }
    if (on) dotTop = y;
    else if (area) break;
  }
  if (!area) throw Error("Question mark unavailable");

  let x0 = w, x1 = 0, y0 = h, y1 = 0, used = 0;
  const pixels = new Uint32Array(w * h);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
    if (!solid(x, y)) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    if (x < mark || y < dotTop) pixels[used++] = y * w + x;
  }
  const count = points.length / 6;
  const ids = Uint32Array.from({ length: count }, (_, id) => id);
  ids.sort((a, b) => points[a * 6 + 3] - points[b * 6 + 3] || points[b * 6 + 4] - points[a * 6 + 4]);
  const coords = new Float32Array(count * 2);
  let seed = 57163;
  const jitter = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  // Join west to left, east to right instead of making every island cross every letter.
  ids.forEach((id, rank) => {
    const pixel = pixels[Math.floor((rank + .5) * used / count)];
    coords[id * 2] = pixel % w - x0 + jitter();
    coords[id * 2 + 1] = Math.floor(pixel / w) - y0 + jitter();
  });
  const width = x1 - x0 + 1, height = y1 - y0 + 1;
  const dot = { x: dotX / area - x0, y: dotY / area - y0, diameter: 2 * Math.sqrt(area / Math.PI) };
  const xy = new Float32Array(coords.length);

  return (viewW: number, viewH: number, edge: number, introBottom: number, answerTop: number) => {
    const portrait = viewW <= 850 && viewH > viewW;
    const top = portrait ? Math.max(68, viewH * .135) : viewH * .25;
    const bottom = portrait ? answerTop - 24 : viewH * .77;
    const textScale = Math.min((portrait ? viewW - 2 * edge : viewW * .53) / width, (bottom - top) / height);
    const textY = (top + bottom - height * textScale) / 2;
    for (let i = 0; i < xy.length; i += 2) {
      xy[i] = 2 * (edge + coords[i] * textScale - viewW * .5) / viewW;
      xy[i + 1] = 2 * (viewH * .52 - textY - coords[i + 1] * textScale) / viewH;
    }
    const mapY = portrait ? (introBottom + viewH - 30) * .5 : viewH * .51;
    const mapX = viewW * (portrait ? .5 : .735);
    const mapScale = Math.min(viewW * (portrait ? .88 : .42) / 50,
      (portrait ? viewH - 64 - introBottom : viewH * .78) / 22);
    return {
      xy, mapScale, shiftX: mapX - viewW * .5, shiftY: mapY - viewH * .52,
      homeX: mapX + (SURABAYA.lon - 118) * mapScale, homeY: mapY - (SURABAYA.lat + 2.5) * mapScale,
      endX: edge + dot.x * textScale, endY: textY + dot.y * textScale, diameter: dot.diameter * textScale,
    };
  };
}
