import { SURABAYA } from "@/components/narrative/globeData";
import { ramp } from "@/components/narrative/globeArrival";

const STRIDE = 8;
const PASSES = 8;
export const LAST_PICK = 0.7;
export function clothFrame(w: number, h: number) {
  const stacked = w < 740 && h > w;
  const width = Math.min(w * (stacked ? 0.78 : 0.43), h * (stacked ? 0.55 : 0.77));
  const height = width * 0.68;
  const cx = w * (stacked ? 0.5 : 0.278),
    cy = h * (stacked ? 0.315 : 0.51);
  const scale = Math.min((w - 32) / 50, Math.max(4, h - 190) / 22);
  return {
    w,
    h,
    width,
    height,
    cx,
    cy,
    scale,
    pinX: w * 0.5 + (SURABAYA.lon - 118) * scale,
    pinY: h * 0.52 - (SURABAYA.lat + 2.5) * scale,
  };
}
type Frame = ReturnType<typeof clothFrame>;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// The same drape defines the destination fabric and the shuttle's selvedges.
function fabricX(f: Frame, u: number, v: number) {
  return f.cx + f.width * (u - 0.5 + 0.12 * (v - 0.5) + 0.016 * Math.sin(v * 6.28));
}
function fabricY(f: Frame, u: number, v: number) {
  return f.cy + f.height * (v - 0.5 - 0.17 * (u - 0.5) + 0.05 * Math.sin(u * 6.28 + v * 1.4));
}

export function shuttle(f: Frame, p: number) {
  const runs = PASSES * ramp(p, 0.32, LAST_PICK);
  const lane = Math.min(PASSES - 1, Math.floor(runs));
  const t = runs - lane,
    u = mix(lane % 2, 1 - (lane % 2), ramp(t, 0, 0.88));
  const v = (lane + ramp(t, 0.82, 1)) / PASSES;
  const entry = ramp(p, 0.055, 0.32);
  return {
    x: mix(f.pinX, fabricX(f, u, v), entry),
    y: mix(f.pinY, fabricY(f, u, v), entry) - Math.sin(entry * Math.PI) * f.height * 0.22,
  };
}

function geometry(raw: Int16Array, f: Frame, count: number) {
  const out = new Float32Array(count * STRIDE);
  const rows = 36,
    cols = 56;
  let seed = 1351711;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let id = 0; id < count; id++) {
    const i = id * STRIDE,
      j = id * 6,
      warp = id % 2 === 0;
    let u = random(),
      v = random();
    const row = Math.floor(v * rows),
      col = Math.floor(u * cols);
    const over = (row + col) % 2 === Number(warp);
    if (warp) u = (col + 0.5 + (random() - 0.5) * 0.24) / cols;
    else v = (row + 0.5 + (random() - 0.5) * 0.24) / rows;
    const wave = Math.sin(6.28 * (u * 0.86 + v * 0.61)) * 0.115 + Math.sin(u * 11 - v * 5) * 0.026;
    const comb = Math.floor(v * 24) / 23;
    out[i] = f.w * 0.5 + (raw[j + 3] / 32767) * 25 * f.scale;
    out[i + 1] = f.h * 0.52 - (raw[j + 4] / 32767) * 11 * f.scale;
    out[i + 2] = fabricX(f, u, v) + (1 - u) * f.width * 0.083 * Math.sin(v * 9);
    out[i + 3] = f.cy + f.height * ((comb - 0.5) * 1.32 + wave + 0.2 * (0.5 - u));
    out[i + 4] = fabricX(f, u, v);
    out[i + 5] = fabricY(f, u, v);
    // Unequal tension: knots close in the order the shuttle reaches them.
    const lane = Math.min(PASSES - 1, Math.floor(v * PASSES));
    out[i + 6] = (lane + (lane % 2 ? 1 - u : u) * 0.85) / PASSES;
    const diamond = Math.abs(((u * 4) % 1) - 0.5) * 2 + Math.abs(((v * 3) % 1) - 0.5) * 2;
    const brocade = diamond > 0.8 && diamond < 1.1;
    const selvedge = !warp && (row === rows - 2 || row === rows - 4);
    out[i + 7] = ((over ? 0.58 : 0.27) + (brocade ? 0.18 : 0) + random() * 0.21) * (selvedge ? -1 : 1);
  }
  return out;
}

const vertex = `
attribute vec2 island, loose, woven;
attribute vec2 fibre;
uniform vec2 view;
uniform vec4 pose;
varying float alpha;
varying float red;
void main(){
  float close=smoothstep(fibre.x-.12,fibre.x+.12,pose.y);
  vec2 at=mix(island,mix(loose,woven,close),pose.x);
  gl_Position=vec4(at/view*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
  gl_PointSize=pose.z;
  alpha=mix(.62,abs(fibre.y),pose.x)*pose.w;
  red=(1.-step(0.,fibre.y))*close*pose.x;
}`;
const fragment = `
precision mediump float;
varying float alpha;
varying float red;
void main(){float a=1.-smoothstep(.19,.50,length(gl_PointCoord-.5));gl_FragColor=vec4(mix(vec3(.08,.082,.09),vec3(.61,.09,.21),red),a*alpha);}
`;

export function createCloth(canvas: HTMLCanvasElement, raw: Int16Array, cpu = false) {
  const gl = !cpu
    ? canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false })
    : null;
  const ctx = gl ? null : canvas.getContext("2d");
  if (!gl && !ctx) throw Error("Canvas unavailable");
  const program = gl?.createProgram(),
    buffer = gl?.createBuffer();
  let view: WebGLUniformLocation | null = null,
    pose: WebGLUniformLocation | null = null;
  const dispose = () => {
    if (gl) {
      gl.deleteBuffer(buffer!);
      gl.deleteProgram(program!);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  };
  if (gl && program && buffer) {
    for (const [type, src] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ] as const) {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      gl.attachShader(program, sh);
      gl.deleteShader(sh);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      dispose();
      throw Error("Cloth shader unavailable");
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const [i, name] of ["island", "loose", "woven", "fibre"].entries()) {
      const loc = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, STRIDE * 4, i * 8);
    }
    view = gl.getUniformLocation(program, "view");
    pose = gl.getUniformLocation(program, "pose");
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  let attrs: Float32Array<ArrayBufferLike> = new Float32Array(),
    count = 0,
    diameter = 1,
    ratio = 1,
    painted = -1;
  return {
    resize(f: Frame, dpr: number) {
      count = Math.min(raw.length / 6, gl ? Math.min(24576, Math.max(6500, Math.round(f.width * 44))) : 5600);
      ratio = dpr;
      diameter = Math.max(1.05, Math.min(2.2, (f.width / Math.sqrt(count)) * 0.53));
      canvas.width = Math.round(f.w * dpr);
      canvas.height = Math.round(f.h * dpr);
      attrs = geometry(raw, f, count);
      painted = -1;
      if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(view, f.w, f.h);
        gl.bufferData(gl.ARRAY_BUFFER, attrs, gl.STATIC_DRAW);
      }
    },
    draw(p: number) {
      // During the type change only the red nib moves; leave the fabric alone.
      const poseKey = p >= LAST_PICK && p <= 0.91 ? LAST_PICK : p;
      if (poseKey === painted) return;
      painted = poseKey;
      const unravel = ramp(p, 0.035, 0.34),
        close = mix(-0.13, 1.13, ramp(p, 0.32, LAST_PICK)),
        fade = 1 - ramp(p, 0.91, 1);
      if (gl) {
        gl.uniform4f(pose, unravel, close, diameter * ratio, fade);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, count);
        return;
      }
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
      ctx.fillStyle = "#151518";
      for (let i = 0; i < attrs.length; i += STRIDE) {
        const k = ramp(close, attrs[i + 6] - 0.12, attrs[i + 6] + 0.12);
        const x = mix(attrs[i], mix(attrs[i + 2], attrs[i + 4], k), unravel),
          y = mix(attrs[i + 1], mix(attrs[i + 3], attrs[i + 5], k), unravel);
        ctx.fillStyle = attrs[i + 7] < 0 && k * unravel > 0.5 ? "#9c1737" : "#151518";
        ctx.globalAlpha = mix(0.62, Math.abs(attrs[i + 7]), unravel) * fade;
        ctx.fillRect(x, y, diameter, diameter);
      }
      ctx.globalAlpha = 1;
    },
    dispose,
  };
}
