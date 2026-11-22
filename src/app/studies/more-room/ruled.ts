import { ramp } from "@/components/narrative/globeArrival";

export const LINES = 6;
export const BASE = 3;
// The baseline only runs to the full stop, so it carries fewer points.
const SHARE = [1, 1, 1, 0.55, 1, 1];
const TOTAL = SHARE.reduce((sum, share) => sum + share, 0);
const TONE = 0.34;
const HAIR = 1.15;

export type Sheet = {
  w: number; h: number; dpr: number;
  mapX: number; mapY: number; mapScale: number;
  y: number[]; x0: number; x1: number; baseX1: number;
};
export type Pose = {
  gather: number; retreat: number[]; collapse: number; absorb: number; pinX: number; pinY: number;
};

// One slot per persistent point ID: rule index, position along it, grain.
// North goes to the top rule and west to the left, so paths rarely cross.
function assign(points: Int16Array) {
  const count = points.length / 6, slots = new Float32Array(count * 3);
  const ids = Uint32Array.from({ length: count }, (_, id) => id);
  ids.sort((a, b) => points[b * 6 + 4] - points[a * 6 + 4]);
  let seed = 90217, from = 0, share = 0;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let line = 0; line < LINES; line++) {
    share += SHARE[line];
    const to = line === LINES - 1 ? count : Math.round(count * share / TOTAL);
    const row = ids.subarray(from, to).sort((a, b) => points[a * 6 + 3] - points[b * 6 + 3]);
    row.forEach((id, rank) => {
      slots[id * 3] = line;
      slots[id * 3 + 1] = (rank + 0.5) / row.length;
      slots[id * 3 + 2] = random();
    });
    from = to;
  }
  return slots;
}

const vertex = `
attribute vec2 island;
attribute vec3 slot;
uniform vec2 view;
uniform vec3 map;      // centre x, centre y, pixels per degree
uniform vec4 lines[6]; // y, left, right, retreat
uniform float ink[6];
uniform float born;     // 0 for grains the map itself did not show
uniform vec4 pose;     // gather, collapse, absorb, DPR
uniform vec4 pin;      // x, y, map grain diameter, hairline diameter
varying float alpha;
void main() {
  int index = int(slot.x + .5);
  vec4 line = lines[index];
  float g = smoothstep(slot.z * .3, .7 + slot.z * .3, pose.x);
  float x = mix(line.y, line.z, slot.y), tone = 1. - line.w;
  if (index == 3) { x = mix(x, line.z, pose.y); tone = 1. - .92 * pose.y; }
  else x = line.y + (x - line.y) * tone;
  vec2 from = map.xy + island * vec2(25., -11.) * map.z;
  vec2 to = vec2(x, line.x + (fract(slot.z * 7.31) - .5) * .9);
  vec2 at = mix(mix(from, to, g), pin.xy, pose.z);
  gl_Position = vec4(at / view * vec2(2., -2.) + vec2(-1., 1.), 0., 1.);
  gl_PointSize = max(1., pose.w * mix(pin.z, pin.w, g));
  alpha = mix((.44 + .45 * slot.z) * born, ink[index] * tone, g) * (1. - pose.z * pose.z);
}`;
const fragment = `
precision mediump float;
varying float alpha;
void main() {
  float coverage = 1. - smoothstep(.22, .50, length(gl_PointCoord - .5));
  gl_FragColor = vec4(.086, .094, .102, alpha * coverage);
}`;

export function createRuled(canvas: HTMLCanvasElement, points: Int16Array, cpu = false) {
  const slots = assign(points), all = points.length / 6;
  const gl = cpu ? null : canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false });
  const ctx = gl ? null : canvas.getContext("2d");
  if (!gl && !ctx) throw Error("Canvas unavailable");
  const buffers: WebGLBuffer[] = [], program = gl?.createProgram();
  const at: Record<string, WebGLUniformLocation | null> = {};
  const dispose = () => {
    if (!gl) { canvas.width = canvas.height = 1; return; }
    buffers.forEach(buffer => gl.deleteBuffer(buffer));
    gl.deleteProgram(program!);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
  if (gl && program) {
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source); gl.compileShader(shader);
      gl.attachShader(program, shader); gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { dispose(); throw Error("Rule shader unavailable"); }
    gl.useProgram(program);
    for (const [name, data, size, type, stride, offset] of [
      ["island", points, 2, gl.SHORT, 12, 6], ["slot", slots, 3, gl.FLOAT, 0, 0],
    ] as const) {
      const buffer = gl.createBuffer()!, slot = gl.getAttribLocation(program, name);
      buffers.push(buffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(slot); gl.vertexAttribPointer(slot, size, type, true, stride, offset);
    }
    for (const name of ["view", "map", "lines", "ink", "born", "pose", "pin"]) at[name] = gl.getUniformLocation(program, name);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  const lines = new Float32Array(LINES * 4), ink = new Float32Array(LINES);
  let sheet: Sheet | undefined, drawn = all, shown = all, grain = 1;

  return {
    resize(next: Sheet) {
      sheet = next;
      canvas.width = Math.round(next.w * next.dpr); canvas.height = Math.round(next.h * next.dpr);
      // Same density and grain size as the homepage map at this viewport.
      const radius = Math.min(next.w * 0.43, next.h * 0.33);
      shown = gl ? Math.min(all, Math.max(3600, Math.round(radius * radius * 0.31))) : Math.min(all, 5600);
      grain = Math.max(1.1, Math.min(2.7, radius / Math.sqrt(shown) * 0.93));
      // A sparse map would leave dotted rules: on the GPU, extra grains join as the rules form.
      const length = (LINES - 1) * (next.x1 - next.x0) + next.baseX1 - next.x0;
      drawn = gl ? Math.min(all, Math.max(shown, Math.ceil(length * 3.2))) : shown;
      for (let i = 0; i < LINES; i++) {
        const right = i === BASE ? next.baseX1 : next.x1;
        lines.set([next.y[i], next.x0, right, 0], i * 4);
        // Overlapping grains add up; aim each rule at one quiet tone.
        const density = drawn * SHARE[i] / TOTAL / Math.max(1, right - next.x0);
        ink[i] = 1 - Math.pow(1 - TONE, 1 / Math.max(1, density * HAIR));
      }
      if (!gl) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(at.view, next.w, next.h);
      gl.uniform3f(at.map, next.mapX, next.mapY, next.mapScale);
      gl.uniform1fv(at.ink, ink);
    },
    draw({ gather, retreat, collapse, absorb, pinX, pinY }: Pose) {
      if (!sheet) return;
      for (let i = 0; i < LINES; i++) lines[i * 4 + 3] = retreat[i];
      if (gl) {
        gl.uniform4fv(at.lines, lines);
        gl.uniform4f(at.pose, gather, collapse, absorb, sheet.dpr);
        gl.uniform4f(at.pin, pinX, pinY, grain, HAIR);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(at.born, 1);
        gl.drawArrays(gl.POINTS, 0, shown);
        if (drawn > shown) {
          gl.uniform1f(at.born, 0);
          gl.drawArrays(gl.POINTS, shown, drawn - shown);
        }
        return;
      }
      if (!ctx) return;
      ctx.setTransform(sheet.dpr, 0, 0, sheet.dpr, 0, 0);
      ctx.clearRect(0, 0, sheet.w, sheet.h);
      ctx.fillStyle = "#16181a";
      const fade = 1 - absorb * absorb;
      for (let id = 0; id < drawn && fade > 0; id++) {
        const line = slots[id * 3], u = slots[id * 3 + 1], z = slots[id * 3 + 2], l = line * 4;
        const g = ramp(gather, z * 0.3, 0.7 + z * 0.3);
        let x = lines[l + 1] + (lines[l + 2] - lines[l + 1]) * u, tone = 1 - lines[l + 3];
        if (line === BASE) { x += (lines[l + 2] - x) * collapse; tone = 1 - 0.92 * collapse; }
        else x = lines[l + 1] + (x - lines[l + 1]) * tone;
        const a = (0.44 + 0.45 * z + (ink[line] * tone - 0.44 - 0.45 * z) * g) * fade;
        if (a < 0.004) continue;
        const fx = sheet.mapX + points[id * 6 + 3] / 32767 * 25 * sheet.mapScale;
        const fy = sheet.mapY - points[id * 6 + 4] / 32767 * 11 * sheet.mapScale;
        const ty = lines[l] + ((z * 7.31) % 1 - 0.5) * 0.9, size = grain + (HAIR - grain) * g;
        const px = fx + (x - fx) * g, py = fy + (ty - fy) * g;
        ctx.globalAlpha = a;
        ctx.fillRect(px + (pinX - px) * absorb - size / 2, py + (pinY - py) * absorb - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    },
    dispose,
  };
}
