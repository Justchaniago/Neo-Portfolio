import { daylightAt, earthRadius, ramp } from "./globeArrival";
import { inkRamp } from "./globeInk";
import { createStarSeeds, SHORT_UNIT } from "./starField";

const vertex = `
attribute vec3 sphere;
attribute vec2 island;
attribute float grain;
attribute float inland;
attribute vec2 nextXY;
attribute vec4 star;
uniform vec2 view;
uniform vec4 camera; // sin/cos longitude, sin/cos latitude
uniform vec4 pose;   // radius, map pixels/degree, flatten, next shape
uniform vec4 light;  // arrival, dawn, DPR, grain diameter
uniform vec2 scatter; // displacement in pixels, phase along each seeded path
uniform float dissolve;
varying vec4 ink;
void main() {
  float x = sphere.x * camera.y - sphere.z * camera.x;
  float forward = sphere.x * camera.x + sphere.z * camera.y;
  float y = sphere.y * camera.w - forward * camera.z;
  float depth = sphere.y * camera.z + forward * camera.w;
  float seed = abs(grain);
  float morph = smoothstep(seed * .12, .87 + seed * .13, pose.z);
  vec2 ball = vec2(x, y) * pose.x;
  float gather = smoothstep(.27+.075*star.w,.75+.04*star.w,light.x);
  if (gather < 1.) {
    // The sky is centred on the viewport; the planet sits two percent lower.
    vec2 sky = star.xy * view * .5 + vec2(0.,.02*view.y);
    vec2 travel = ball - sky;
    float bow = 4.*gather*(1.-gather)*(.095+.105*star.w);
    ball = sky + travel*gather + vec2(-travel.y,travel.x)*bow;
  }
  vec2 map = island * vec2(25.,11.) * pose.y;
  vec2 at = mix(mix(ball, map, morph), nextXY * view * .5, pose.w);
  at += scatter.x * vec2(sin(seed*93. + scatter.y + island.x*7.), cos(seed*57. - scatter.y*1.2 + island.y*9.));
  float loose = 0.;
  if (dissolve > 0.) {
    float delay = .36*inland + .14*seed;
    loose = smoothstep(delay, delay+.5, dissolve);
    float wind = island.x*9. + island.y*5. + seed*4. + loose*(seed-.5)*5.;
    at += loose * min(view.x,view.y) * (.22+.32*seed) * vec2(cos(wind), sin(wind));
  }
  vec2 clip = at * 2. / view + vec2(0.,-.04);
  gl_Position = vec4(clip, 0., 1.);
  float rim = pow(1. - abs(depth), 2.);
  float sun = smoothstep(-.19,.46,mix(-.68*x+.22*y-depth, 1., smoothstep(0.,.35,light.x)));
  float land = step(0.,grain);
  float facing = smoothstep(-.15,.10,depth);
  float alpha = (0.26 + .61 * seed) * (.28 + .72 * land) * (.55 + .40 * facing + .62 * rim);
  alpha *= (.22 + .78 * facing) * sun;
  float skyAlpha = star.z < 0. ? .50+.45*star.w :
    (1.-smoothstep(.012,.060,star.z))*(.22+.58*star.w);
  alpha = mix(skyAlpha,alpha,gather);
  vec2 pixel = vec2(at.x + view.x*.5, view.y*.52-at.y);
  float span = view.x + .32 * view.y, feather = max(100., span*.22);
  float front = mix(-feather,span+feather,light.y);
  float night = clamp((pixel.x + .32 * pixel.y - front + feather)/(2.*feather),0.,1.);
  vec3 daylight = vec3(.059,.072,.085), dusk = vec3(.145,.20,.23), silver = vec3(.92,.94,.93);
  vec3 color = mix(mix(daylight,dusk,min(1.,night*2.)),silver,max(0.,night*2.-1.));
  ink = vec4(color,mix(alpha, .44+.45*seed, morph)*(1.-smoothstep(.1,1.,loose)));
  float starSize = star.z < 0. ? 1.15+1.5*star.w : .62+1.15*star.w;
  gl_PointSize = max(1., light.z * mix(starSize, light.w*(.66+.65*seed+.18*rim*(1.-morph)), gather));
}`;
const fragment = `
precision mediump float;
varying vec4 ink;
void main() {
  float coverage = 1. - smoothstep(.22,.50,length(gl_PointCoord-.5));
  gl_FragColor = vec4(ink.rgb,ink.a*coverage);
}`;

export type PointPose = {
  progress: number; flight: number; scale: number; next?: number; night?: boolean; spin?: number;
  dissolve?: number;
};
const spread = (p: number) => ramp(p,.35,.54) * (1-ramp(p,.54,.80));

// Count nearby occupied map cells once. Coastal grains release before interior grains.
function inlandWeights(points: Int16Array) {
  const stride = 106;
  const cells = new Uint8Array(stride * 50);
  const ids = Uint16Array.from({ length: points.length / 6 }, (_, i) => {
    const x = Math.round(points[6*i+3] / 32767 * 50) + 52;
    const y = Math.round(points[6*i+4] / 32767 * 22) + 24;
    const cell = y * stride + x;
    cells[cell] = 1;
    return cell;
  });
  return Float32Array.from(ids, c => (cells[c-2] + cells[c+2] + cells[c-2*stride] + cells[c+2*stride]
    + cells[c-stride-1] + cells[c-stride+1] + cells[c+stride-1] + cells[c+stride+1]) / 8);
}

// Same IDs and endpoints on devices without a usable GPU. A shorter prefix
// keeps the islands legible while bounding per-frame CPU work.
export function createPointFallback(canvas: HTMLCanvasElement, bytes: ArrayBuffer) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("Canvas unavailable");
  const data = new Int16Array(bytes);
  const inland = inlandWeights(data);
  const count = Math.min(data.length / 6, 5600), stars = createStarSeeds(count);
  const ink = inkRamp(0x101418, 0x25333b, 0xe6eae8);
  let w = 1, h = 1, ratio = 1, target: Float32Array | null = null;
  return {
    resize(width: number, height: number, dpr: number) {
      w = width; h = height; ratio = dpr;
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
    },
    setNextShape(xy: Float32Array) {
      if (xy.length !== data.length / 3) throw Error("Expected one XY destination per particle");
      target = xy;
    },
    draw({ progress, flight, scale, next = 0, night = false, spin = 0, dissolve = 0 }: PointPose) {
      const focus = ramp(progress, 0, .42), rad = Math.PI / 180;
      const lon = (28 + 90 * focus + spin) * rad, lat = (16 - 18.5 * focus) * rad;
      const sx = Math.sin(lon), cx = Math.cos(lon), sy = Math.sin(lat), cy = Math.cos(lat);
      const blend = ramp(progress, night ? .53 : .30, .82), radius = earthRadius(w, h, flight, night) * (1 + .24 * blend);
      const scatter = night ? spread(progress)*Math.min(w,h)*.18 : 0;
      const dawn = night ? 0 : daylightAt(flight), feather = Math.max(100, (w + h*.32)*.22);
      const front = -feather + (w+h*.32+2*feather)*dawn;
      ctx.setTransform(ratio,0,0,ratio,0,0);
      ctx.clearRect(0,0,w,h);
      if (dissolve >= 1) return;
      const size = Math.max(1, Math.min(2.6, earthRadius(w,h,1)/105));
      const sun = ramp(flight,0,.35);
      for (let id = 0; id < count; id++) {
        const i = id * 6, s = id * 4;
        const shine = stars[s+3]/SHORT_UNIT, rank = stars[s+2]/SHORT_UNIT;
        const gather = ramp(flight,.27+.075*shine,.75+.04*shine);
        if (!gather && rank >= .060) continue;
        const a = data[i]/32767, b = data[i+1]/32767, c = data[i+2]/32767;
        const grain = data[i+5]/32767, seed = Math.abs(grain);
        const m = ramp(blend, seed*.12, .87+seed*.13), forward = a*sx+c*cx;
        const x = a*cx-c*sx, y = b*cy-forward*sy, z = b*sy+forward*cy;
        let dx = x*radius*(1-m)+data[i+3]/32767*25*scale*m;
        let dy = y*radius*(1-m)+data[i+4]/32767*11*scale*m;
        if (scatter) {
          dx += scatter*Math.sin(seed*93+progress*12+data[i+3]/32767*7);
          dy += scatter*Math.cos(seed*57-progress*14.4+data[i+4]/32767*9);
        }
        if (gather < 1) {
          const ox = stars[s]/SHORT_UNIT*w*.5, oy = (stars[s+1]/SHORT_UNIT*.5+.02)*h;
          const vx = dx-ox, vy = dy-oy, bow = 4*gather*(1-gather)*(.095+.105*shine);
          dx = ox+vx*gather-vy*bow; dy = oy+vy*gather+vx*bow;
        }
        if (target && next) {
          dx += (target[i/3]*w*.5-dx)*next; dy += (target[i/3+1]*h*.5-dy)*next;
        }
        let fade = 1;
        if (dissolve > 0) {
          const delay = .36*inland[id]+.14*seed, loose = ramp(dissolve,delay,delay+.5);
          if (loose >= 1) continue;
          const wind = (data[i+3]*9+data[i+4]*5)/32767+seed*4+loose*(seed-.5)*5;
          const drift = loose*Math.min(w,h)*(.22+.32*seed);
          dx += drift*Math.cos(wind); dy += drift*Math.sin(wind);
          fade = 1-ramp(loose,.1,1);
        }
        const px = w*.5+dx, py = h*.52-dy;
        const alpha = (.38+.6*seed)*(grain > 0 ? 1 : .34)*(z >= 0 ? 1 : .24)
          * ramp((-.68*x+.22*y-z)*(1-sun)+sun,-.19,.46);
        const skyAlpha = rank < 0 ? .50+.45*shine : (1-ramp(rank,.012,.060))*(.22+.58*shine);
        ctx.globalAlpha = ((skyAlpha*(1-gather)+alpha*gather)*(1-m)+(.44+.45*seed)*m)*fade;
        const shade = Math.max(0,Math.min(1,(px+.32*py-front+feather)/(2*feather)));
        ctx.fillStyle = ink[Math.round(512*shade)];
        const diameter = (rank < 0 ? 1.15+1.5*shine : .62+1.15*shine)*(1-gather)+size*(.7+.5*seed)*gather;
        ctx.fillRect(px-diameter/2, py-diameter/2, diameter, diameter);
      }
      ctx.globalAlpha = 1;
    },
    dispose() { canvas.width = canvas.height = 1; },
  };
}

export function createPointCloud(canvas: HTMLCanvasElement, bytes: ArrayBuffer) {
  const count = bytes.byteLength / 12;
  if (!Number.isInteger(count) || count < 1) throw Error("Invalid particle targets");
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) throw Error("WebGL unavailable");
  const program = gl.createProgram()!;
  const buffers: WebGLBuffer[] = [];
  const release = () => {
    for (const buffer of buffers) gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source); gl.compileShader(shader);
      gl.attachShader(program, shader); gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error("Particle shader unavailable");
    gl.useProgram(program);
    const buffer = gl.createBuffer()!;
    buffers.push(buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, bytes, gl.STATIC_DRAW);
    for (const [name, size, offset] of [["sphere",3,0],["island",2,6],["grain",1,10]] as const) {
      const loc = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.SHORT, true, 12, offset);
    }
    const stars = gl.createBuffer()!;
    buffers.push(stars);
    gl.bindBuffer(gl.ARRAY_BUFFER, stars);
    gl.bufferData(gl.ARRAY_BUFFER, createStarSeeds(count), gl.STATIC_DRAW);
    const star = gl.getAttribLocation(program, "star");
    gl.enableVertexAttribArray(star);
    gl.vertexAttribPointer(star, 4, gl.SHORT, true, 0, 0);
    const destination = gl.getAttribLocation(program, "nextXY");
    const coast = gl.createBuffer()!;
    buffers.push(coast);
    gl.bindBuffer(gl.ARRAY_BUFFER, coast);
    gl.bufferData(gl.ARRAY_BUFFER, inlandWeights(new Int16Array(bytes)), gl.STATIC_DRAW);
    const inland = gl.getAttribLocation(program, "inland");
    gl.enableVertexAttribArray(inland);
    gl.vertexAttribPointer(inland, 1, gl.FLOAT, false, 0, 0);
    const loc = (name: string) => gl.getUniformLocation(program, name);
    const view = loc("view"), cam = loc("camera"), pose = loc("pose"), light = loc("light"), scatter = loc("scatter"), exit = loc("dissolve");
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    let width = 0, height = 0, ratio = 1, budget = count, diameter = 1, nextBuffer: WebGLBuffer | null = null;
    return {
      resize(w: number, h: number, dpr: number, low: boolean) {
        width = w; height = h; ratio = dpr;
        canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(view, w, h);
        const r = earthRadius(w, h, 1);
        budget = Math.min(count, Math.max(3600, Math.round(r * r * (low ? .20 : .31))));
        diameter = Math.max(1.1, Math.min(2.7, r / Math.sqrt(budget) * .93));
      },
      setNextShape(xy: Float32Array) {
        if (xy.length !== count * 2) throw Error("Expected one XY destination per particle");
        if (!nextBuffer) { nextBuffer = gl.createBuffer()!; buffers.push(nextBuffer); }
        gl.bindBuffer(gl.ARRAY_BUFFER, nextBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, xy, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(destination);
        gl.vertexAttribPointer(destination, 2, gl.FLOAT, false, 0, 0);
      },
      draw({ progress, flight, scale, next = 0, night = false, spin = 0, dissolve = 0 }: PointPose) {
        const focus = ramp(progress, 0, .42), zoom = ramp(progress, night ? .53 : .30, .82);
        const rad = Math.PI / 180, lon = (28 + 90*focus + spin)*rad, lat = (16 - 18.5*focus)*rad;
        const morph = zoom, radius = earthRadius(width, height, flight, night);
        gl.uniform4f(cam, Math.sin(lon), Math.cos(lon), Math.sin(lat), Math.cos(lat));
        gl.uniform4f(pose, radius * (1 + .24 * zoom), scale, morph, nextBuffer ? Math.min(1,Math.max(0,next)) : 0);
        gl.uniform4f(light, flight, night ? 0 : daylightAt(flight), ratio, diameter);
        gl.uniform2f(scatter, night ? spread(progress)*Math.min(width,height)*.18 : 0, progress*12);
        gl.uniform1f(exit, dissolve);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (dissolve < 1) gl.drawArrays(gl.POINTS, 0, budget);
      },
      dispose: release,
    };
  } catch (error) { release(); throw error; }
}
