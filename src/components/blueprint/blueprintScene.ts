import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

export interface BlueprintSceneHandle {
  setProgress(p: number): void;
  resize(width: number, height: number): void;
  getDimAnchor(): { x: number; y: number };
  dispose(): void;
}

const BLUE = 0x1f45b4;
const LINE = 0xf2f5ff;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// camera keyframes: p=0 close-up on the screen, p>=0.75 full desk framing
const TARGET0 = new THREE.Vector3(0.6, 7.4, -4.6);
const TARGET1 = new THREE.Vector3(0.6, 6.2, -0.2);
const AZ0 = THREE.MathUtils.degToRad(70), AZ1 = THREE.MathUtils.degToRad(45);
const EL0 = THREE.MathUtils.degToRad(12), EL1 = THREE.MathUtils.degToRad(30);
const TW0 = 12.5, TW1 = 40.9; // desired horizontal view width in world units

interface DynSeg { parent: THREE.Object3D; a: THREE.Vector3; b: THREE.Vector3; r0: number; r1: number; slot: number }
interface DynCircle { parent: THREE.Object3D; c: THREE.Vector3; r: number; slot: number; n: number }

export function createBlueprintScene(
  canvas: HTMLCanvasElement,
  opts: { dpr?: number; lineWidth?: number; onContextLost?: () => void } = {},
): BlueprintSceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const dpr = opts.dpr ?? Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);

  let cw = 1, ch = 1;
  renderer.setSize(cw, ch, false);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);

  const lineMat = new LineMaterial({
    color: LINE,
    linewidth: opts.lineWidth ?? 1.6,
    resolution: new THREE.Vector2(cw * dpr, ch * dpr),
    alphaToCoverage: false,
  });
  const fillMat = new THREE.MeshBasicMaterial({
    color: BLUE,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 4,
  });
  const dimMat = new LineMaterial({
    color: LINE,
    linewidth: opts.lineWidth ?? 1.6,
    resolution: new THREE.Vector2(cw * dpr, ch * dpr),
    transparent: true,
    opacity: 0,
    alphaToCoverage: false,
  });

  const root = new THREE.Group();
  scene.add(root);
  const disposables: { dispose(): void }[] = [renderer, lineMat, fillMat, dimMat];

  const seg = (positions: number[] | Float32Array, parent: THREE.Object3D = root) => {
    const g = new LineSegmentsGeometry();
    g.setPositions(positions instanceof Float32Array ? positions : new Float32Array(positions));
    const l = new LineSegments2(g, lineMat);
    parent.add(l);
    disposables.push(g);
    return l;
  };
  const dimSeg = (positions: number[]) => {
    const g = new LineSegmentsGeometry();
    g.setPositions(new Float32Array(positions));
    const l = new LineSegments2(g, dimMat);
    root.add(l);
    disposables.push(g);
    return l;
  };
  const solid = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, parent: THREE.Object3D = root) => {
    const m = new THREE.Mesh(geo, fillMat);
    m.position.set(x, y, z);
    parent.add(m);
    const e = new THREE.EdgesGeometry(geo, 20);
    const g = new LineSegmentsGeometry();
    g.setPositions(new Float32Array(e.attributes.position.array as Float32Array));
    const l = new LineSegments2(g, lineMat);
    l.position.copy(m.position);
    parent.add(l);
    disposables.push(geo, e, g);
    return { m, l };
  };
  const arc = (cx: number, cy: number, cz: number, r: number, a0: number, a1: number, plane = 'xz', n = 32, parent: THREE.Object3D = root) => {
    const p: number[] = [];
    let prev: number[] | null = null;
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      const v = plane === 'xy' ? [cx + r * Math.cos(a), cy + r * Math.sin(a), cz]
        : plane === 'xz' ? [cx + r * Math.cos(a), cy, cz + r * Math.sin(a)]
        : [cx, cy + r * Math.cos(a), cz + r * Math.sin(a)];
      if (prev) p.push(...prev, ...v);
      prev = v;
    }
    seg(p, parent);
  };
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, ry = 0, parent: THREE.Object3D = root) => {
    const s = solid(new THREE.BoxGeometry(w, h, d), 0, 0, 0, parent);
    s.m.position.set(x, y, z); s.l.position.set(x, y, z);
    if (ry) { s.m.rotation.y = ry; s.l.rotation.y = ry; }
    return s;
  };

  /* ---------- dynamic silhouettes (recomputed when camDir changes) ---------- */
  const dynSegs: DynSeg[] = [];
  const dynCircles: DynCircle[] = [];
  let dynCap = 0;
  const dynTube = (a: number[], b: number[], r0: number, r1: number, parent: THREE.Object3D = root) => {
    dynSegs.push({ parent, a: new THREE.Vector3(...a), b: new THREE.Vector3(...b), r0, r1, slot: dynCap });
    dynCap += 12;
  };
  const dynCircle = (c: number[], r: number, n = 24, parent: THREE.Object3D = root) => {
    dynCircles.push({ parent, c: new THREE.Vector3(...c), r, slot: dynCap, n });
    dynCap += n * 6;
  };
  /* ---------- ground grid ---------- */
  {
    const R = 140, minor: number[] = [], major: number[] = [];
    for (let i = -R; i <= R; i++) {
      const arr = i % 5 === 0 ? major : minor;
      arr.push(i, 0, -R, i, 0, R, -R, 0, i, R, 0, i);
    }
    const mk = (arr: number[], op: number) => {
      const g = new LineSegmentsGeometry();
      g.setPositions(new Float32Array(arr));
      const m = new LineMaterial({ color: LINE, linewidth: 1, resolution: new THREE.Vector2(cw * dpr, ch * dpr), transparent: true, opacity: op });
      root.add(new LineSegments2(g, m));
      disposables.push(g, m);
    };
    mk(minor, 0.1); mk(major, 0.2);
  }

  /* ---------- desk slab ---------- */
  const SLAB_TOP = 4.4;
  box(34, 2.4, 20, 0, SLAB_TOP - 1.2, 0);

  /* ---------- 1. MacBook ---------- */
  const lap = new THREE.Group(); lap.position.set(0.6, SLAB_TOP, -0.6); root.add(lap);
  {
    box(9, 0.55, 6.4, 0, 0.28, 0, 0, lap);
    const kp: number[] = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 11; c++) {
      const x0 = -3.9 + c * 0.78, z0 = -2.45 + r * 0.62, w0 = 0.62, d0 = 0.5;
      kp.push(x0, 0.57, z0, x0 + w0, 0.57, z0, x0 + w0, 0.57, z0, x0 + w0, 0.57, z0 + d0,
        x0 + w0, 0.57, z0 + d0, x0, 0.57, z0 + d0, x0, 0.57, z0 + d0, x0, 0.57, z0);
    }
    seg(kp, lap);
    const tp = [-1.5, 0.57, 1.3, 1.5, 0.57, 1.3, 1.5, 0.57, 1.3, 1.5, 0.57, 2.6,
      1.5, 0.57, 2.6, -1.5, 0.57, 2.6, -1.5, 0.57, 2.6, -1.5, 0.57, 1.3];
    seg(tp, lap);
    const hg = new THREE.CylinderGeometry(0.22, 0.22, 8.6, 36); hg.rotateZ(Math.PI / 2);
    solid(hg, 0, 0.5, -3.05, lap);
    dynTube([-4.3, 0.5, -3.05], [4.3, 0.5, -3.05], 0.22, 0.22, lap);
    const lid = new THREE.Group(); lid.position.set(0, 0.5, -3.05); lid.rotation.x = -Math.PI * 0.11; lap.add(lid);
    box(9, 5.4, 0.32, 0, 2.7, 0, 0, lid);
    const scr = new THREE.Group(); scr.position.set(0, 2.7, 0.17); scr.scale.setScalar(0.88); lid.add(scr);
    const sc = [-4.1, 2.6, -4.1, -2.6, -4.1, -2.6, 4.1, -2.6, 4.1, -2.6, 4.1, 2.6, 4.1, 2.6, -4.1, 2.6];
    const toXY = (arr: number[]) => { const o: number[] = []; for (let i = 0; i < arr.length; i += 2) o.push(arr[i], arr[i + 1], 0.001); return o; };
    seg(toXY(sc), scr);
    const d: number[] = [];
    d.push(-3.6, 1.9, -3.6, -1.9, -3.6, -1.9, -2.5, -1.9, -2.5, -1.9, -2.5, 1.9, -2.5, 1.9, -3.6, 1.9);
    for (let i = 0; i < 4; i++) d.push(-3.4, 1.4 - i * 0.8, -2.7, 1.4 - i * 0.8);
    for (let i = 0; i < 3; i++) {
      const x0 = -2.1 + i * 2.1;
      d.push(x0, 1.9, x0, 1.0, x0, 1.0, x0 + 1.7, 1.0, x0 + 1.7, 1.0, x0 + 1.7, 1.9, x0 + 1.7, 1.9, x0, 1.9);
    }
    d.push(-2.1, 0.4, -2.1, -1.9, -2.1, -1.9, 4.0, -1.9, 4.0, -1.9, 4.0, 0.4, 4.0, 0.4, -2.1, 0.4);
    const pts = [[-1.9, -1.4], [-1.2, -0.6], [-0.5, -1.1], [0.3, -0.2], [1.1, -0.9], [1.9, 0.1], [2.7, -0.4], [3.6, 0.6]];
    for (let i = 0; i < pts.length - 1; i++) d.push(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    seg(toXY(d), scr);
  }

  /* ---------- 2. Phone on stand ---------- */
  const phoneG = new THREE.Group(); phoneG.position.set(9.8, SLAB_TOP, -0.4); phoneG.rotation.y = 0.72; root.add(phoneG);
  {
    const stand = new THREE.Group(); stand.position.set(0, 0, 0.9); phoneG.add(stand);
    box(2.6, 0.4, 2.2, 0, 0.2, 0, 0, stand);
    box(2.6, 0.5, 0.35, 0, 0.55, -0.9, 0, stand);
    const bk = box(2.6, 2.2, 0.3, 0, 1.1, 0.95, 0, stand);
    bk.m.rotation.x = -0.35; bk.l.rotation.x = -0.35;
    const ph = new THREE.Group(); ph.position.set(0, 0.6, 0.1); ph.rotation.x = -0.34; phoneG.add(ph);
    box(3.0, 5.8, 0.32, 0, 2.9, 0, 0, ph);
    const face = new THREE.Group(); face.position.set(0, 2.9, 0.18); ph.add(face);
    const t = (arr: number[]) => { const o: number[] = []; for (let i = 0; i < arr.length; i += 2) o.push(arr[i], arr[i + 1], 0.001); return o; };
    seg(t([-1.15, 2.35, -1.15, -2.35, -1.15, -2.35, 1.15, -2.35, 1.15, -2.35, 1.15, 2.35, 1.15, 2.35, -1.15, 2.35]), face);
    const q: number[] = []; const N = 9, s = 1.75 / N, qx0 = -0.875, qy0 = 0.15;
    const finder = (r: number, c: number) => (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
    const pat = (r: number, c: number) => ((r * 7 + c * 13 + r * c) % 7 < 2);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (finder(r, c) || !pat(r, c)) continue;
      const x0 = qx0 + c * s, y0 = qy0 + r * s;
      q.push(x0, y0, x0 + s * 0.94, y0, x0 + s * 0.94, y0, x0 + s * 0.94, y0 + s * 0.94,
        x0 + s * 0.94, y0 + s * 0.94, x0, y0 + s * 0.94, x0, y0 + s * 0.94, x0, y0);
    }
    for (const [fr, fc] of [[0, 0], [0, 6], [6, 0]]) {
      const fx = qx0 + fc * s, fy = qy0 + fr * s;
      q.push(fx, fy, fx + 3 * s, fy, fx + 3 * s, fy, fx + 3 * s, fy + 3 * s, fx + 3 * s, fy + 3 * s, fx, fy + 3 * s, fx, fy + 3 * s, fx, fy);
      const ix = fx + s, iy = fy + s;
      q.push(ix, iy, ix + s, iy, ix + s, iy, ix + s, iy + s, ix + s, iy + s, ix, iy + s, ix, iy + s, ix, iy);
      const dd = s * 0.22;
      q.push(ix + dd, iy + dd, ix + s - dd, iy + dd, ix + s - dd, iy + dd, ix + s - dd, iy + s - dd,
        ix + s - dd, iy + s - dd, ix + dd, iy + s - dd, ix + dd, iy + s - dd, ix + dd, iy + dd);
    }
    seg(t(q), face);
    seg(t([-0.9, -0.62, 0.9, -0.62, -0.9, -0.38, 0.9, -0.38, -0.9, -0.38, -0.9, -0.62, 0.9, -0.38, 0.9, -0.62]), face);
    seg(t([-0.9, -1.12, 0.4, -1.12, -0.9, -0.88, 0.4, -0.88, -0.9, -0.88, -0.9, -1.12, 0.4, -0.88, 0.4, -1.12]), face);
  }

  /* ---------- 3. Mug ---------- */
  const mug = new THREE.Group(); mug.position.set(9.4, SLAB_TOP, 6.8); mug.rotation.y = 0.9; root.add(mug);
  {
    solid(new THREE.CylinderGeometry(1.05, 1.0, 2.5, 36), 0, 1.25, 0, mug);
    dynTube([0, 0, 0], [0, 2.5, 0], 1.02, 1.02, mug);
    arc(0, 2.5, 0, 0.82, 0, Math.PI * 2, 'xz', 32, mug);
    const hg = new THREE.Group(); hg.position.set(1.05, 1.35, 0); mug.add(hg);
    const tor = new THREE.TorusGeometry(0.62, 0.16, 10, 20, Math.PI);
    const tm = solid(tor, 0, 0, 0, hg);
    tm.m.rotation.z = -Math.PI / 2; tm.l.rotation.z = -Math.PI / 2;
    const hp: number[] = [];
    for (let i = 0; i < 24; i++) {
      const a0 = -Math.PI / 2 + i * Math.PI / 24, a1 = -Math.PI / 2 + (i + 1) * Math.PI / 24;
      hp.push(0, 0.62 * Math.cos(a0), 0.62 * Math.sin(a0), 0, 0.62 * Math.cos(a1), 0.62 * Math.sin(a1));
    }
    seg(hp, hg);
  }

  /* ---------- 4. Notebook + pen ---------- */
  const nb = new THREE.Group(); nb.position.set(-7.6, SLAB_TOP, 5.2); nb.rotation.y = 0.42; root.add(nb);
  {
    box(7.6, 0.34, 5.4, 0, 0.17, 0, 0, nb);
    const rl: number[] = [];
    for (let i = 0; i < 7; i++) { const z = -2.1 + i * 0.7; rl.push(-3.2, 0.36, z, 3.2, 0.36, z); }
    seg(rl, nb);
    const pen = new THREE.Group(); pen.position.set(0.3, 0.5, 0.3); pen.rotation.y = -0.55; nb.add(pen);
    const pg = new THREE.CylinderGeometry(0.13, 0.13, 2.9, 24); pg.rotateZ(Math.PI / 2);
    solid(pg, 0, 0, 0, pen);
    dynTube([-1.45, 0, 0], [1.45, 0, 0], 0.13, 0.13, pen);
    const tip = new THREE.ConeGeometry(0.13, 0.5, 24); tip.rotateZ(-Math.PI / 2);
    solid(tip, 1.68, 0, 0, pen);
    dynTube([1.43, 0, 0], [1.93, 0, 0], 0.13, 0.001, pen);
  }

  /* ---------- 5. Architect lamp ---------- */
  const lamp = new THREE.Group(); lamp.position.set(-10.2, SLAB_TOP, 0.4); root.add(lamp);
  {
    solid(new THREE.CylinderGeometry(1.9, 2.1, 0.6, 40), 0, 0.3, 0, lamp);
    dynTube([0, 0, 0], [0, 0.6, 0], 2.1, 1.9, lamp);
    solid(new THREE.CylinderGeometry(0.32, 0.32, 0.5, 24), 0, 0.85, 0, lamp);
    dynTube([0, 0.6, 0], [0, 1.1, 0], 0.32, 0.32, lamp);
    const p0 = [0.8, 1.0, 0.3], p1 = [3.4, 7.2, 1.4], p2 = [7.6, 7.8, 1.0];
    const arm = (a: number[], b: number[]) => {
      const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
      const d = vb.clone().sub(va), len = d.length();
      const geo = new THREE.CylinderGeometry(0.16, 0.16, len, 36); geo.translate(0, len / 2, 0);
      const g = new THREE.Group(); g.position.copy(va);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      lamp.add(g); solid(geo, 0, 0, 0, g);
      dynTube(a, b, 0.16, 0.16, lamp);
    };
    arm(p0, p1);
    solid(new THREE.SphereGeometry(0.55, 24, 16), p1[0], p1[1], p1[2], lamp);
    dynCircle(p1, 0.55, 24, lamp);
    arm(p1, p2);
    solid(new THREE.SphereGeometry(0.45, 20, 14), p2[0], p2[1], p2[2], lamp);
    dynCircle(p2, 0.45, 24, lamp);
    const aim = new THREE.Vector3(10.0, 0.9, 3.6).sub(new THREE.Vector3(p2[0], p2[1], p2[2]));
    const sdir = aim.clone().normalize();
    const c0 = new THREE.Vector3(...p2).addScaledVector(sdir, 0.15);
    const c1 = new THREE.Vector3(...p2).addScaledVector(sdir, 2.5);
    const cg = new THREE.CylinderGeometry(0.4, 1.25, 2.35, 36);
    const g2 = new THREE.Group();
    g2.position.copy(c0.clone().add(c1).multiplyScalar(0.5));
    g2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sdir.clone().negate());
    lamp.add(g2); solid(cg, 0, 0, 0, g2);
    dynTube([c0.x, c0.y, c0.z], [c1.x, c1.y, c1.z], 0.4, 1.25, lamp);
    // neck + rim circles are geometric (fixed axis) -> static
    const circleStatic = (c: THREE.Vector3, n: THREE.Vector3, r: number, nseg = 40) => {
      const nn = n.clone().normalize();
      const u = new THREE.Vector3().crossVectors(nn, new THREE.Vector3(0, 1, 0));
      if (u.lengthSq() < 1e-6) u.set(1, 0, 0); u.normalize();
      const w = new THREE.Vector3().crossVectors(nn, u);
      const p: number[] = []; let prev: THREE.Vector3 | null = null;
      for (let i = 0; i <= nseg; i++) {
        const a = i / nseg * Math.PI * 2;
        const pt = c.clone().addScaledVector(u, Math.cos(a) * r).addScaledVector(w, Math.sin(a) * r);
        if (prev) p.push(prev.x, prev.y, prev.z, pt.x, pt.y, pt.z);
        prev = pt;
      }
      seg(p, lamp);
    };
    circleStatic(c0, sdir, 0.4);
    circleStatic(c1, sdir, 1.25);
    circleStatic(c1.clone().addScaledVector(sdir, 0.1), sdir, 1.06);
  }

  /* ---------- 6. Potted plant ---------- */
  const plant = new THREE.Group(); plant.position.set(9.4, SLAB_TOP, -6.2); root.add(plant);
  {
    solid(new THREE.CylinderGeometry(1.35, 1.05, 1.7, 36), 0, 0.85, 0, plant);
    dynTube([0, 0, 0], [0, 1.7, 0], 1.05, 1.35, plant);
    arc(0, 1.7, 0, 1.05, 0, Math.PI * 2, 'xz', 28, plant);
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(0.55, 0.7, 0.12, 1.9);
    leafShape.quadraticCurveTo(-0.25, 0.8, 0, 0);
    const lg = new THREE.ExtrudeGeometry(leafShape, { depth: 0.08, bevelEnabled: false });
    for (let i = 0; i < 5; i++) {
      const a = -0.7 + i * 0.35, leaf = solid(lg.clone(), 0, 0, 0, plant);
      leaf.m.position.set(0, 1.6, 0); leaf.l.position.set(0, 1.6, 0);
      leaf.m.rotation.order = 'YXZ'; leaf.l.rotation.order = 'YXZ';
      leaf.m.rotation.y = a; leaf.l.rotation.copy(leaf.m.rotation);
      leaf.m.rotation.x = -0.9 + 0.12 * i; leaf.l.rotation.x = leaf.m.rotation.x;
    }
    disposables.push(lg);
  }

  /* ---------- dimension detail (3D, fades in) ---------- */
  const dimMidLocal = new THREE.Vector3(0, 0, 0);
  {
    const y = SLAB_TOP + 0.03, zEdge = 3.2, zDim = 3.2 + 0.85, zExt = 3.2 + 1.0;
    const x1 = -4.5 + lap.position.x, x2 = 4.5 + lap.position.x;
    const zb = zEdge + lap.position.z;
    const ang = Math.atan2(-0.707, 0.707) + Math.PI / 4, tl = 0.28; // 45° slash ticks in the desk plane
    const dx = Math.cos(ang) * tl, dz = Math.sin(ang) * tl;
    dimSeg([
      x1, y, zb, x1, y, zb + zExt - zEdge,
      x2, y, zb, x2, y, zb + zExt - zEdge,
      x1, y, zb + zDim - zEdge, x2, y, zb + zDim - zEdge,
      x1 - dx, y, zb + zDim - zEdge - dz, x1 + dx, y, zb + zDim - zEdge + dz,
      x2 - dx, y, zb + zDim - zEdge - dz, x2 + dx, y, zb + zDim - zEdge + dz,
    ]);
    dimMidLocal.set((x1 + x2) / 2, y, zb + zDim - zEdge);
  }

  /* ---------- dynamic silhouette geometry ---------- */
  const dynArray = new Float32Array(dynCap);
  const dynGeo = new LineSegmentsGeometry();
  dynGeo.setPositions(dynArray);
  const dynLines = new LineSegments2(dynGeo, lineMat);
  dynLines.frustumCulled = false; // boundingSphere is stale after buffer rewrites
  root.add(dynLines);
  disposables.push(dynGeo);

  const tmpQ = new THREE.Quaternion();
  const tmpM = new THREE.Matrix4();
  const tmpAxis = new THREE.Vector3(), tmpT = new THREE.Vector3(), tmpDir = new THREE.Vector3();
  const tmpU = new THREE.Vector3(), tmpW = new THREE.Vector3(), tmpP = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const write6 = (i: number, v: THREE.Vector3) => {
    v.applyMatrix4(tmpM); // parent-local -> root space (dynLines is rooted)
    dynArray[i] = v.x; dynArray[i + 1] = v.y; dynArray[i + 2] = v.z;
  };
  function updateSilhouettes(camDir: THREE.Vector3) {
    for (const s of dynSegs) {
      s.parent.getWorldQuaternion(tmpQ);
      tmpM.copy(s.parent.matrixWorld);
      tmpDir.copy(camDir).applyQuaternion(tmpQ.invert());
      tmpAxis.copy(s.b).sub(s.a).normalize();
      tmpT.copy(tmpAxis).cross(tmpDir).normalize();
      const i = s.slot;
      write6(i, tmpP.copy(s.a).addScaledVector(tmpT, s.r0));
      write6(i + 3, tmpP.copy(s.b).addScaledVector(tmpT, s.r1));
      write6(i + 6, tmpP.copy(s.a).addScaledVector(tmpT, -s.r0));
      write6(i + 9, tmpP.copy(s.b).addScaledVector(tmpT, -s.r1));
    }
    for (const c of dynCircles) {
      c.parent.getWorldQuaternion(tmpQ);
      tmpM.copy(c.parent.matrixWorld);
      tmpDir.copy(camDir).applyQuaternion(tmpQ.invert());
      tmpU.copy(tmpDir).cross(UP);
      if (tmpU.lengthSq() < 1e-6) tmpU.set(1, 0, 0);
      tmpU.normalize();
      tmpW.copy(tmpDir).cross(tmpU).normalize();
      let i = c.slot;
      for (let k = 0; k < c.n; k++) {
        const a0 = k / c.n * Math.PI * 2, a1 = (k + 1) / c.n * Math.PI * 2;
        write6(i, tmpP.copy(c.c).addScaledVector(tmpU, Math.cos(a0) * c.r).addScaledVector(tmpW, Math.sin(a0) * c.r));
        write6(i + 3, tmpP.copy(c.c).addScaledVector(tmpU, Math.cos(a1) * c.r).addScaledVector(tmpW, Math.sin(a1) * c.r));
        i += 6;
      }
    }
    (dynGeo.attributes.instanceStart as unknown as { data: { needsUpdate: boolean } }).data.needsUpdate = true;
  }

  /* ---------- camera / progress ---------- */
  const camDir = new THREE.Vector3();
  const target = new THREE.Vector3();
  let aspect = 1;
  let curP = 0;

  function apply(p: number) {
    root.updateMatrixWorld(true);
    const e = easeInOutCubic(clamp01(p / 0.75));
    const az = lerp(AZ0, AZ1, e), el = lerp(EL0, EL1, e);
    const portrait = aspect < 1;
    target.x = lerp(TARGET0.x, TARGET1.x, e);
    // portrait p=0: bias the target down so the laptop centers instead of the screen
    target.y = lerp(TARGET0.y - (portrait ? 1.8 : 0), TARGET1.y, e);
    target.z = lerp(TARGET0.z, TARGET1.z, e);
    // portrait p=1: frame the object group (lamp..plant ~24u) at ~92% width, desk crops
    const tW = lerp(TW0, portrait ? 26 : TW1, e);
    // limiting-dimension framing: horizontal width drives, with a progress-aware vertical floor
    const F = Math.max(tW / aspect, lerp(8, 23, e));
    camera.left = -F * aspect / 2; camera.right = F * aspect / 2;
    camera.top = F / 2; camera.bottom = -F / 2;
    camera.updateProjectionMatrix();
    camDir.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
    camera.position.copy(target).addScaledVector(camDir, 120);
    camera.lookAt(target);
    updateSilhouettes(camDir);
    dimMat.opacity = clamp01((p - 0.55) / 0.3);
    renderer.render(scene, camera);
    curP = p;
  }

  const contextLost = (e: Event) => {
    e.preventDefault();
    opts.onContextLost?.();
  };
  canvas.addEventListener('webglcontextlost', contextLost);

  return {
    setProgress(p) {
      p = clamp01(p);
      if (p === curP) return;
      apply(p);
    },
    resize(width, height) {
      cw = Math.max(1, width); ch = Math.max(1, height);
      aspect = cw / ch;
      renderer.setPixelRatio(opts.dpr ?? Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(cw, ch, false);
      const res = renderer.getPixelRatio();
      lineMat.resolution.set(cw * res, ch * res);
      dimMat.resolution.set(cw * res, ch * res);
      root.traverse((o) => {
        const m = (o as LineSegments2).material as LineMaterial;
        if (m && (m as LineMaterial).isLineMaterial && m !== lineMat && m !== dimMat) m.resolution.set(cw * res, ch * res);
      });
      apply(curP);
    },
    getDimAnchor() {
      const q = dimMidLocal.clone().project(camera);
      return { x: (q.x + 1) / 2 * cw, y: (1 - q.y) / 2 * ch };
    },
    dispose() {
      canvas.removeEventListener('webglcontextlost', contextLost);
      for (const d of disposables) d.dispose();
      renderer.forceContextLoss();
    },
  };
}
