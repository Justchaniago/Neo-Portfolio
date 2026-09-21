/**
 * GLSL Shaders for Google Antigravity Halo Particle Effect
 * Faithfully adapted from antigravity.google
 */

export const SIMPLEX_NOISE_GLSL = /* glsl */ `
// Simplex 3D Noise by Ian McEwan, Ashima Arts
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857; // 1.0/7.0
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

export const VERTEX_SHADER = /* glsl */ `
attribute vec2 refPos;
attribute vec4 seeds;

uniform vec2 uRingPos;
uniform float uRingRadius;
uniform float uRingWidth;
uniform float uRingWidth2;
uniform float uRingDisplacement;
uniform float uTime;
uniform float uParticleScale;
uniform float uPixelRatio;

varying vec4 vSeeds;
varying vec2 vLocalPos;
varying vec2 vScreenPos;
varying float vScale;
varying float vVelocity;

${SIMPLEX_NOISE_GLSL}

void main() {
  vSeeds = seeds;
  float time = uTime * 0.5;
  vec2 currentPos = refPos;

  // Ring halo distance
  float dist = distance(currentPos, uRingPos);
  float noise0 = snoise(vec3(currentPos * 0.2 + vec2(18.4924, 72.9744), time * 0.5));
  float dist1 = distance(currentPos + (noise0 * 0.005), uRingPos);

  // Halo scale dynamic curve
  float t = smoothstep(uRingRadius - (uRingWidth * 2.0), uRingRadius, dist) - smoothstep(uRingRadius, uRingRadius + uRingWidth, dist1);
  float t2 = smoothstep(uRingRadius - (uRingWidth2 * 2.0), uRingRadius, dist) - smoothstep(uRingRadius, uRingRadius + uRingWidth2, dist1);
  float t3 = smoothstep(uRingRadius + uRingWidth2, uRingRadius, dist);

  t = pow(max(t, 0.0), 2.0);
  t2 = pow(max(t2, 0.0), 3.0);

  t += t2 * 3.0;
  t += t3 * 0.4;
  t += snoise(vec3(currentPos * 30.0 + vec2(11.4924, 12.9744), time * 0.5)) * t3 * 0.5;

  float nS = snoise(vec3(currentPos * 2.0 + vec2(18.4924, 72.9744), time * 0.5));
  t += pow((nS + 1.5) * 0.5, 2.0) * 0.6;

  // Mid and close scale noise field
  float noise1 = snoise(vec3(currentPos * 4.0 + vec2(88.494, 32.4397), time * 0.35));
  float noise2 = snoise(vec3(currentPos * 4.0 + vec2(50.904, 120.947), time * 0.35));
  float noise3 = snoise(vec3(currentPos * 20.0 + vec2(18.4924, 72.9744), time * 0.5));
  float noise4 = snoise(vec3(currentPos * 20.0 + vec2(50.904, 120.947), time * 0.5));

  vec2 disp = vec2(noise1, noise2) * 0.03 + vec2(noise3, noise4) * 0.005;

  // Subtle sinusoidal ripples
  disp.x += sin((refPos.x * 20.0) + (time * 4.0)) * 0.02 * clamp(dist, 0.0, 1.0);
  disp.y += cos((refPos.y * 20.0) + (time * 3.0)) * 0.02 * clamp(dist, 0.0, 1.0);

  // Halo displacement push
  vec2 pos = vec2(0.0);
  pos -= (uRingPos - (currentPos + disp)) * pow(max(t2, 0.0), 0.75) * uRingDisplacement;

  vec2 finalPos = currentPos + disp + (pos * 0.25);
  float scale = clamp(t, 0.0, 2.6);

  vScale = scale;
  vVelocity = scale * 0.25;
  vLocalPos = finalPos;

  vec4 viewSpace = modelViewMatrix * vec4(vec3(finalPos, 0.0), 1.0);
  gl_Position = projectionMatrix * viewSpace;
  vScreenPos = gl_Position.xy;

  // Particle size scaled with DPI and responsive particle scale
  // Bold, crisp, legible pills across both mobile and desktop
  gl_PointSize = max(3.0, (vScale * 24.0) * (uPixelRatio * 0.5) * uParticleScale);
}
`;


export const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec4 vSeeds;
varying vec2 vScreenPos;
varying vec2 vLocalPos;
varying float vScale;
varying float vVelocity;

uniform vec3 uColor1; // Charcoal obsidian
uniform vec3 uColor2; // Rich ruby burgundy
uniform vec3 uColor3; // Warm champagne gold / amber
uniform vec2 uRingPos;
uniform vec2 uRez;
uniform float uAlpha;
uniform float uTime;

${SIMPLEX_NOISE_GLSL}

// Signed distance field for rounded box / solid capsule pill
float sdRoundBox(in vec2 p, in vec2 b, in vec4 r) {
  r.xy = (p.x > 0.0) ? r.xy : r.zw;
  r.x  = (p.y > 0.0) ? r.x  : r.y;
  vec2 q = abs(p) - b + r.x;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}

// 2D Rotation
vec2 rotate(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, s, -s, c) * v;
}

void main() {
  // Simplex noise for individual capsule angle & color variation
  float noiseAngle = snoise(vec3(vLocalPos * 10.0 + vec2(18.4924, 72.9744), uTime * 0.85));
  float noiseColor = snoise(vec3(vLocalPos * 2.2 + vec2(74.664, 91.556), uTime * 0.5));
  noiseColor = (noiseColor + 1.0) * 0.5;

  // Radial angle pointing towards the ring halo center
  float angle = atan(vLocalPos.y - uRingPos.y, vLocalPos.x - uRingPos.x);

  vec2 uv = gl_PointCoord.xy;
  uv -= vec2(0.5);
  uv.y *= -1.0;
  uv = rotate(uv, -angle + (noiseAngle * 0.5));

  // Option 1: Quiet Luxury Palette (Charcoal + Rich Burgundy + Champagne Gold)
  // Halo energy factor: particles in the active halo illuminate into vibrant burgundy and gold
  float haloEnergy = smoothstep(0.08, 0.55, vScale);
  float colorMix = clamp(noiseColor * 0.65 + haloEnergy * 0.55, 0.0, 1.0);

  float mid = 0.45;
  vec3 col = (colorMix < mid)
    ? mix(uColor1, uColor2, smoothstep(0.08, mid, colorMix))
    : mix(uColor2, uColor3, smoothstep(mid, 0.92, colorMix));

  // Solid, well-defined capsule pill with noticeable body
  float rounded = sdRoundBox(uv, vec2(0.46, 0.165), vec4(0.16));
  // Crisp edges - not too soft / blurry
  rounded = smoothstep(0.025, 0.0, rounded);

  // High-clarity alpha visibility
  float a = uAlpha * rounded * smoothstep(0.04, 0.18, vScale);

  if (a < 0.01) {
    discard;
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(a, 0.0, 1.0));
}




`;
