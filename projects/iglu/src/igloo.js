import * as THREE from 'three';
import { rng } from './textures.js';

// ---------------------------------------------------------------------------
// One igloo, built the same way in every shot.
// Inner surface: half-ellipse, radius Ri at the floor, height Hi at the top.
// Blocks follow one continuous spiral: block bottom s = P * theta / 2pi (s is
// the distance along the wall from the floor), top = bottom + P. The first row
// is a plain ring whose top is later cut into a ramp (top = P * theta / 2pi),
// so the spiral sits on it with no overlaps.
// ---------------------------------------------------------------------------
export const IG = { Ri: 1.5, Hi: 1.9, T: 0.2, P: 0.34, L: 0.56, gap: 0.026, hole: 0.42 };
export const DOOR = { th: Math.PI / 2, half: 0.34, s: 0.62 };   // door window (azimuth +z), cut after the dome is closed
export const VENT = { u: [0.32, 0.68], v: [0.3, 0.78] };         // hole inside one high block

// ---------- textures ----------
function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
let _tex = null;
export function snowTextures() {
  if (_tex) return _tex;
  const r = rng(77);
  // granular bump: many small soft grains
  const [c, g] = canvas(512);
  g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const x = r() * 512, y = r() * 512, s = 0.6 + r() * 2.4, v = 90 + r() * 140;
    g.fillStyle = `rgba(${v},${v},${v},${0.35 + r() * 0.5})`;
    g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
  }
  const bump = new THREE.CanvasTexture(c); bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.anisotropy = 8;
  // colour variation: very slight blue/white mottling
  const [c2, g2] = canvas(256);
  g2.fillStyle = '#ffffff'; g2.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    const x = r() * 256, y = r() * 256, s = 1 + r() * 7;
    g2.fillStyle = r() < 0.5 ? `rgba(220,232,246,${0.15 + r() * 0.25})` : `rgba(255,255,255,${0.3})`;
    g2.beginPath(); g2.arc(x, y, s, 0, 7); g2.fill();
  }
  const col = new THREE.CanvasTexture(c2); col.wrapS = col.wrapT = THREE.RepeatWrapping; col.colorSpace = THREE.SRGBColorSpace;
  // fur for the insulating hide
  const [c3, g3] = canvas(256);
  g3.fillStyle = '#7a5434'; g3.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) {
    const x = r() * 256, y = r() * 256, l = 3 + r() * 8, a = r() * 0.6 - 0.3;
    const v = r(); g3.strokeStyle = v < 0.5 ? 'rgba(160,118,78,.55)' : 'rgba(70,45,25,.5)';
    g3.lineWidth = 1 + r(); g3.beginPath(); g3.moveTo(x, y); g3.lineTo(x + Math.sin(a) * l, y + Math.cos(a) * l); g3.stroke();
  }
  const fur = new THREE.CanvasTexture(c3); fur.wrapS = fur.wrapT = THREE.RepeatWrapping; fur.colorSpace = THREE.SRGBColorSpace;
  _tex = { bump, col, fur };
  return _tex;
}

let _M = null;
export function snowMats() {
  if (_M) return _M;
  const T = snowTextures();
  const block = new THREE.MeshStandardMaterial({ color: 0xe8eff8, map: T.col, roughness: 0.93, metalness: 0, bumpMap: T.bump, bumpScale: 1.6 });
  const cut = new THREE.MeshBasicMaterial({ color: 0xc9dcee, side: THREE.BackSide });
  const fill = new THREE.MeshStandardMaterial({ color: 0xc9d9ea, roughness: 1, bumpMap: T.bump, bumpScale: 0.8 });
  const ground = new THREE.MeshStandardMaterial({ color: 0xe9f0f8, map: T.col, roughness: 0.96, bumpMap: T.bump, bumpScale: 0.9 });
  const pit = new THREE.MeshStandardMaterial({ color: 0xdbe8f5, roughness: 0.95, bumpMap: T.bump, bumpScale: 0.9, side: THREE.DoubleSide });
  const fur = new THREE.MeshStandardMaterial({ color: 0xffffff, map: T.fur, roughness: 1, bumpMap: T.fur, bumpScale: 3 });
  const bag = new THREE.MeshStandardMaterial({ color: 0x2f5fa8, roughness: 0.6 });
  const bagIn = new THREE.MeshStandardMaterial({ color: 0xd8442c, roughness: 0.7 });
  _M = { block, cut, fill, ground, pit, fur, bag, bagIn, ghost: new THREE.MeshBasicMaterial({ color: 0x9fd3ff, transparent: true, opacity: 0.35, depthWrite: false }) };
  return _M;
}
// cutaway: one plane (or none) applied to every igloo material
export function setClip(planes) {
  const M = snowMats();
  for (const m of [M.block, M.cut, M.fill]) {
    const p = planes || null;
    if (m.clippingPlanes !== p) { m.clippingPlanes = p; m.needsUpdate = true; }
  }
  for (const f of _fillMats) { const p = planes || null; if (f.clippingPlanes !== p) { f.clippingPlanes = p; f.needsUpdate = true; } }
}

// ---------- dome geometry ----------
const N = 2000;
const table = (() => {
  const A = [], S = [];
  let s = 0, px = IG.Ri, py = 0;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI / 2;
    const x = IG.Ri * Math.cos(a), y = IG.Hi * Math.sin(a);
    s += Math.hypot(x - px, y - py); px = x; py = y;
    A.push(a); S.push(s);
  }
  return { A, S };
})();
export const S_TOTAL = table.S[N];
function aOfS(s) {
  s = Math.min(Math.max(s, 0), S_TOTAL);
  let lo = 0, hi = N;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (table.S[m] < s) lo = m; else hi = m; }
  const k = (s - table.S[lo]) / Math.max(1e-9, table.S[hi] - table.S[lo]);
  return table.A[lo] + (table.A[hi] - table.A[lo]) * k;
}
// point on the wall: azimuth th, distance s along the wall, w outwards from the inner face
export function wallPoint(th, s, w, out = new THREE.Vector3()) {
  const a = aOfS(s);
  const nx = IG.Hi * Math.cos(a), ny = IG.Ri * Math.sin(a), nl = Math.hypot(nx, ny);
  const r = IG.Ri * Math.cos(a) + w * nx / nl, y = IG.Hi * Math.sin(a) + w * ny / nl;
  return out.set(r * Math.cos(th), y, r * Math.sin(th));
}
export function wallNormal(th, s) {
  const a = aOfS(s);
  const nx = IG.Hi * Math.cos(a), ny = IG.Ri * Math.sin(a), nl = Math.hypot(nx, ny);
  return new THREE.Vector3(nx / nl * Math.cos(th), ny / nl, nx / nl * Math.sin(th));
}
export function wallRadius(s, w = 0) { const p = wallPoint(0, s, w); return Math.hypot(p.x, p.z); }

// block geometry, in a local frame centred on the block. sb/st: bottom/top as functions of azimuth.
function paramBlock(th0, th1, sb, st, { w0 = 0, w1 = IG.T, gap = IG.gap, seed = 1, bevel = 0.028, map = null } = {}) {
  const thm = (th0 + th1) / 2, rm = wallRadius((sb(thm) + st(thm)) / 2, IG.T / 2);
  const nu = Math.max(4, Math.ceil(((th1 - th0) * rm) / 0.05)), nv = 4;
  const g = new THREE.BoxGeometry(1, 1, 1, nu, nv, 2);
  const p = g.attributes.position;
  const r = rng(seed * 131 + 7);
  const ph = [r() * 6, r() * 6, r() * 6];
  const gt = gap / 2 / rm;
  const P = new THREE.Vector3();
  const mapF = map || ((th, s, w) => wallPoint(th, s, w, P));
  for (let i = 0; i < p.count; i++) {
    let u = p.getX(i) + 0.5, v = p.getY(i) + 0.5, w = p.getZ(i) + 0.5;
    const eu = u < 1e-4 || u > 1 - 1e-4, ev = v < 1e-4 || v > 1 - 1e-4, ew = w < 1e-4 || w > 1 - 1e-4;
    const span = (th1 - th0) * rm;
    if ((eu + ev + ew) >= 2) { // chamfer the edges a little so blocks read as cut, rounded slabs
      if (eu) u = u < 0.5 ? bevel / span : 1 - bevel / span;
      if (ev) v = v < 0.5 ? bevel / IG.P : 1 - bevel / IG.P;
      if (ew) w = w < 0.5 ? bevel / IG.T : 1 - bevel / IG.T;
    }
    const th = th0 + gt + (1 - u) * (th1 - th0 - 2 * gt);   // u runs towards smaller azimuth: right-handed frame
    const b = sb(th) + gap / 2, t = st(th) - gap / 2;
    const s = b + v * (t - b);
    const wd = w0 + w * (w1 - w0) + (w > 0.99 ? 0.004 * Math.sin(u * 7 + ph[0]) * Math.sin(v * 5 + ph[1]) : 0);
    const q = mapF(th, s, wd);
    p.setXYZ(i, q.x, q.y, q.z);
  }
  g.computeVertexNormals();
  return g;
}
// world matrix of a block (centre + axes: x along the wall, y up the wall, z outwards)
function frameOf(th, s, w = IG.T / 2) {
  const c = wallPoint(th, s, w);
  const n = wallNormal(th, s);
  const t = new THREE.Vector3(Math.sin(th), 0, -Math.cos(th));   // local x: towards smaller azimuth
  const m = new THREE.Vector3().crossVectors(n, t).normalize();
  const M = new THREE.Matrix4().makeBasis(t, m, n);
  const q = new THREE.Quaternion().setFromRotationMatrix(M);
  return { pos: c, quat: q, normal: n, th };
}
function localise(g, fr) {
  const inv = new THREE.Matrix4().compose(fr.pos, fr.quat, new THREE.Vector3(1, 1, 1)).invert();
  g.applyMatrix4(inv);
  g.computeBoundingSphere();
  return g;
}

// ---------- the build plan ----------
// list of block descriptors in build order: {kind, th0, th1, sb, st, frame, geo, pieces?}
let _plan = null;
export function plan() {
  if (_plan) return _plan;
  const P = IG.P, TAU = Math.PI * 2;
  const blocks = [];
  // row 1: ring of full-height blocks
  const r1 = wallRadius(P / 2, IG.T / 2);
  const n1 = Math.round(TAU * r1 / IG.L);
  const ring = [];
  for (let i = 0; i < n1; i++) ring.push([i * TAU / n1, (i + 1) * TAU / n1]);
  const ramp = th => P * Math.min(Math.max(th, 0), TAU) / TAU;
  ring.forEach(([a, b], i) => blocks.push({ kind: 'ring', i, th0: a, th1: b, sb: () => 0, st: () => P, stCut: th => Math.max(ramp(th), 0.0) }));
  // spiral
  const below = ring.map(x => x[1]);                 // joint azimuths of the course underneath (unwrapped)
  const spiral = [];
  let th = 0;
  const sOf = th => P * th / TAU;
  while (true) {
    const smid = sOf(th) + P / 2;
    if (sOf(th) + P > S_TOTAL - IG.hole) break;
    const rc = wallRadius(smid, IG.T / 2);
    let d = IG.L / rc;
    if (rc < 0.75) d = Math.min(TAU / 5, IG.L * 0.9 / rc);
    // stagger the joints: keep the new joint away from the joints of the course below
    for (let k = 0; k < 4; k++) {
      const end = th + d;
      const near = below.reduce((m, j) => Math.min(m, Math.abs(((end - j) % TAU + TAU + Math.PI) % TAU - Math.PI)), 9);
      if (near * rc < 0.15) d += 0.2 / rc; else break;
    }
    spiral.push([th, th + d]);
    below.push(th + d);
    th += d;
  }
  const thEnd = th;
  spiral.forEach(([a, b], i) => blocks.push({ kind: 'spiral', i, th0: a, th1: b, sb: sOf, st: x => sOf(x) + P }));
  // key block: from the edge of the last turn to the apex
  const boundary = phi => { const ts = thEnd - (((thEnd - phi) % TAU) + TAU) % TAU; return sOf(ts) + P; };
  const ph0 = thEnd;
  blocks.push({ kind: 'key', th0: ph0, th1: ph0 + TAU, sb: x => boundary(x - 1e-6 * 0) , st: () => S_TOTAL + 0.02 });
  // vent: one block in the last turn but one, opposite the door side
  let vent = -1, best = 9;
  blocks.forEach((b, i) => {
    if (b.kind !== 'spiral') return;
    const sm = b.sb((b.th0 + b.th1) / 2) + P / 2;
    const az = (((b.th0 + b.th1) / 2) % TAU + TAU) % TAU;
    const score = Math.abs(sm - (S_TOTAL - IG.hole - P * 1.1)) * 2 + Math.abs(az - (Math.PI * 1.25)) * 0.3;
    if (score < best) { best = score; vent = i; }
  });
  blocks[vent].vent = true;
  // geometry + frames
  blocks.forEach((b, i) => {
    const thm = (b.th0 + b.th1) / 2;
    b.id = i;
    if (b.kind === 'key') {
      b.frame = frameOf(thm, S_TOTAL - 0.12);
      b.frame.pos = wallPoint(0, S_TOTAL - 0.001, IG.T / 2);
      b.frame.quat = new THREE.Quaternion();
      b.frame.normal = new THREE.Vector3(0, 1, 0);
      const g = new THREE.BoxGeometry(1, 1, 1, 64, 6, 2);
      const p = g.attributes.position, Q = new THREE.Vector3();
      for (let k = 0; k < p.count; k++) {
        const u = p.getX(k) + 0.5, v = p.getY(k) + 0.5, w = p.getZ(k) + 0.5;
        const ph = b.th0 + 0.002 + (1 - u) * (TAU - 0.004);
        const s0 = boundary(ph) + IG.gap / 2;
        const s = s0 + v * (S_TOTAL - s0);
        wallPoint(ph, s, w * IG.T + (w > 0.99 ? 0.003 * Math.sin(u * 30) : 0), Q);
        p.setXYZ(k, Q.x, Q.y, Q.z);
      }
      g.computeVertexNormals();
      b.geo = localise(g, b.frame);
      b.boundary = boundary;
      return;
    }
    const smid = (b.sb(thm) + b.st(thm)) / 2;
    b.frame = frameOf(thm, smid);
    b.smid = smid;
    if (b.vent) {
      const U = VENT.u, Vv = VENT.v;
      const L = (u) => b.th0 + u * (b.th1 - b.th0);
      const sv = (x, v) => b.sb(x) + v * P;
      const parts = [
        [L(0), L(U[0]), x => b.sb(x), x => b.st(x)],
        [L(U[1]), L(1), x => b.sb(x), x => b.st(x)],
        [L(U[0]), L(U[1]), x => b.sb(x), x => sv(x, Vv[0])],
        [L(U[0]), L(U[1]), x => sv(x, Vv[1]), x => b.st(x)],
      ];
      const geos = parts.map(([a, c, sb, st], k) => paramBlock(a, c, sb, st, { seed: i * 7 + k, gap: k < 2 ? IG.gap : 0.004 }));
      // pieces are glued: merge into one geometry
      b.geo = localise(mergeGeos(geos), b.frame);
      b.ventCenter = wallPoint(L((U[0] + U[1]) / 2), sv(L(0.5), (Vv[0] + Vv[1]) / 2), IG.T / 2);
      b.ventNormal = wallNormal(L(0.5), sv(L(0.5), 0.55));
      return;
    }
    b.geo = localise(paramBlock(b.th0, b.th1, b.sb, b.st, { seed: i }), b.frame);
    if (b.kind === 'ring') {
      // after the ramp cut: the low part and the wedge that comes off
      b.geoLow = localise(paramBlock(b.th0, b.th1, b.sb, x => Math.max(b.stCut(x), 0.012), { seed: i, bevel: 0.006 }), b.frame);
      b.geoOff = localise(paramBlock(b.th0, b.th1, x => Math.max(b.stCut(x), 0.012), b.st, { seed: i + 300, gap: IG.gap, bevel: 0.006 }), b.frame);
    }
  });
  // door cut: blocks that cross the door window get a door-shaped version
  blocks.forEach((b, i) => {
    if (b.kind === 'key') return;
    const d0 = DOOR.th - DOOR.half, d1 = DOOR.th + DOOR.half;
    const wrap = x => { let y = x % TAU; return y < 0 ? y + TAU : y; };
    const a = b.th0, c = b.th1;
    // find the door window copy that overlaps [a, c]
    let k0 = null;
    for (let k = -1; k < 8; k++) { const o0 = d0 + k * TAU, o1 = d1 + k * TAU; if (o1 > a && o0 < c) { k0 = [o0, o1]; break; } }
    if (!k0) return;
    const sbot = b.kind === 'ring' ? b.sb : b.sb;
    const stop = b.kind === 'ring' ? (x => Math.max(b.stCut(x), 0.012)) : b.st;
    const low = th => sbot(th), top = th => stop(th);
    const midTh = (Math.max(a, k0[0]) + Math.min(c, k0[1])) / 2;
    if (low(midTh) >= DOOR.s) return;          // whole block is above the door
    const parts = [];
    if (k0[0] > a) parts.push([a, k0[0], low, top, IG.gap]);
    if (k0[1] < c) parts.push([k0[1], c, low, top, IG.gap]);
    const lo2 = th => Math.max(low(th), DOOR.s);
    const mA = Math.max(a, k0[0]), mC = Math.min(c, k0[1]);
    if (top(midTh) > DOOR.s + 0.03) parts.push([mA, mC, lo2, top, 0.004]);
    b.door = parts.length ? localise(mergeGeos(parts.map(([x0, x1, sb, st, gp], k) => paramBlock(x0, x1, sb, st, { seed: i * 11 + k, gap: gp }))), b.frame) : 'gone';
    void wrap;
  });
  const nRing = ring.length, nSpiral = spiral.length;
  _plan = { blocks, nRing, nSpiral, thEnd, sOf, ramp, key: blocks[blocks.length - 1], vent: blocks[vent] };
  return _plan;
}

function mergeGeos(list) {
  // minimal merge for non-indexed + indexed BoxGeometries with position/normal/uv
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, ov * 3); nor.set(g.attributes.normal.array, ov * 3); uv.set(g.attributes.uv.array, ov * 2);
    const I = g.index.array; for (let k = 0; k < I.length; k++) idx[oi + k] = I[k] + ov;
    ov += g.attributes.position.count; oi += I.length;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  m.setIndex(new THREE.BufferAttribute(idx, 1));
  return m;
}

// a block mesh: front faces in snow, back faces in the flat "cut" colour for cutaways
let _offMat = null;
function offMat() { if (!_offMat) { _offMat = snowMats().block.clone(); _offMat.side = THREE.DoubleSide; } return _offMat; }
export function blockMesh(geo) {
  const M = snowMats();
  const g = new THREE.Group();
  const a = new THREE.Mesh(geo, M.block); a.castShadow = true; a.receiveShadow = true;
  const b = new THREE.Mesh(geo, M.cut);
  g.add(a, b); g.userData.front = a;
  return g;
}

// ---------- the whole igloo, with a state per block ----------
// opts: door (cut + tunnel), fill (joint fill shell 0..1), clip handled by setClip()
export function igloo({ door = false, tunnel = door } = {}) {
  const pl = plan();
  const root = new THREE.Group();
  const items = pl.blocks.map((b, i) => {
    const g = new THREE.Group();
    g.position.copy(b.frame.pos); g.quaternion.copy(b.frame.quat);
    root.add(g);
    const it = { b, g, i };
    if (door && b.door) {
      if (b.door !== 'gone') g.add(blockMesh(b.door));
      it.doorCut = true;
      return it;
    }
    if (b.kind === 'ring') {
      it.full = blockMesh(b.geo); it.low = blockMesh(b.geoLow);
      it.off = new THREE.Mesh(b.geoOff, offMat()); it.off.castShadow = it.off.receiveShadow = true;
      g.add(it.full, it.low); root.add(it.off);
      it.setCut = (k) => { // 0 = uncut, 0..1 = cut piece sliding off outwards, 1 = gone
        it.full.visible = k <= 0; it.low.visible = k > 0;
        it.off.visible = k > 0 && k < 1;
        if (k > 0 && k < 1) {
          const n = b.frame.normal, e = easeOut(Math.min(1, k * 1.6));
          const axis = new THREE.Vector3(Math.sin(b.frame.th), 0, -Math.cos(b.frame.th));
          it.off.quaternion.copy(b.frame.quat).premultiply(new THREE.Quaternion().setFromAxisAngle(axis, -0.5 * e));
          it.off.position.copy(b.frame.pos).addScaledVector(n, 0.28 * e).add(new THREE.Vector3(0, -0.16 * e, 0));
          it.off.scale.setScalar(1 - smoothK(k, 0.6, 1));
        }
      };
      it.setCut(1);
    } else {
      g.add(blockMesh(b.geo));
    }
    return it;
  });
  const fill = fillShell(door); root.add(fill);
  root.userData = { items, fill, plan: pl };
  if (tunnel) { const tn = tunnelBlocks(); root.add(tn); root.userData.tunnel = tn; }
  return root;
}
const easeOut = t => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
const smoothK = (t, a, b) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

// smooth shell just under the outer face: shows white packed snow in the joints. uFill reveals it by azimuth.
const _fillMats = [];
function fillShell(door) {
  const pts = [];
  for (let i = 0; i <= 80; i++) { const s = (i / 80) * S_TOTAL; const p = wallPoint(0, s, IG.T - 0.03); pts.push(new THREE.Vector2(Math.hypot(p.x, p.z), p.y)); }
  pts.reverse();   // winding: faces point outwards
  const g = new THREE.LatheGeometry(pts, 160);
  const M = snowMats();
  const mat = M.fill.clone();
  const pl = plan();
  mat.userData.u = { uFill: { value: 0 }, uDoor: { value: door ? 1 : 0 }, uVent: { value: pl.vent.ventCenter.clone() } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, mat.userData.u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vW; uniform float uFill, uDoor; uniform vec3 uVent;')
      .replace('void main() {', `void main() {
        float az = atan(vW.z, vW.x); az = az < 0.0 ? az + 6.2831853 : az;
        float k = fract((az - 1.5707963 + 0.6) / 6.2831853);
        float wob = 0.03 * sin(vW.y * 13.0 + az * 5.0);
        if (uFill <= 0.0 || k > uFill * 1.05 + wob * min(1.0, uFill * 20.0)) discard;
        if (uDoor > 0.5 && abs(az - 1.5707963) < ${DOOR.half.toFixed(3)} && vW.y < ${(wallPoint(0, DOOR.s, IG.T).y).toFixed(3)}) discard;
        if (distance(vW, uVent) < 0.17) discard;`);
  };
  mat.customProgramCacheKey = () => 'fill' + (door ? 1 : 0);
  _fillMats.push(mat);
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  m.userData.u = mat.userData.u;
  return m;
}

// ---------- tunnel (block vault) ----------
export const TUN = { floor: -0.4, ri: 0.36, springY: 0.02, t: 0.16, z0: 1.38, z1: 2.75, rings: 3 };
let _tun = null;
export function tunnelPlan() {
  if (_tun) return _tun;
  // cross-section path: right wall up, arch over, left wall down. param q in [0, 1]
  const { floor, ri, springY } = TUN;
  const wallH = springY - floor, arc = Math.PI * ri, Ltot = 2 * wallH + arc;
  const sec = (q, w) => {   // returns [x, y] for inner path offset by w outward
    const d = q * Ltot;
    if (d < wallH) return [ri + w, floor + d];
    if (d < wallH + arc) { const a = (d - wallH) / ri; return [Math.cos(a) * (ri + w), springY + Math.sin(a) * (ri + w)]; }
    return [-(ri + w), springY - (d - wallH - arc)];
  };
  const cuts = [0, wallH / Ltot, (wallH + arc / 3) / Ltot, (wallH + 2 * arc / 3) / Ltot, (wallH + arc) / Ltot, 1];
  const blocks = [];
  const dz = (TUN.z1 - TUN.z0) / TUN.rings;
  for (let r = 0; r < TUN.rings; r++) for (let k = 0; k < 5; k++) {
    const za = TUN.z0 + r * dz, zb = za + dz;
    const qa = cuts[k], qb = cuts[k + 1];
    const g = new THREE.BoxGeometry(1, 1, 1, 6, 3, 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5, w = p.getZ(i) + 0.5;
      const q = qa + 0.004 + u * (qb - qa - 0.008);
      const [x, y] = sec(q, w * TUN.t);
      p.setXYZ(i, x, y, za + 0.008 + v * (dz - 0.016));
    }
    g.computeVertexNormals();
    const qm = (qa + qb) / 2, [cx, cy] = sec(qm, TUN.t / 2);
    const c = new THREE.Vector3(cx, cy, (za + zb) / 2);
    g.translate(-c.x, -c.y, -c.z);
    blocks.push({ geo: g, pos: c, ring: r, k });
  }
  _tun = { blocks, sec };
  return _tun;
}
export function tunnelBlocks() {
  const tp = tunnelPlan();
  const g = new THREE.Group();
  g.userData.meshes = tp.blocks.map(b => { const m = blockMesh(b.geo); m.position.copy(b.pos); g.add(m); return m; });
  return g;
}

// ---------- ground with optional pits ----------
// pit: null | {block:[x,z,lx,lz,depth]} | 'door' (interior pit + tunnel trench + ramp) ; may be an array
export function snowGround(pit = null) {
  const M = snowMats();
  const g = new THREE.Group();
  const shape = new THREE.Shape([[-60, -60], [60, -60], [60, 60], [-60, 60]].map(([x, y]) => new THREE.Vector2(x, y)));
  const pits = pit == null ? [] : Array.isArray(pit) ? pit : [pit];
  const floors = [];
  for (const p of pits) {
    let poly, depth, ramp = null;
    if (p === 'door') {
      depth = -TUN.floor;
      const zp = 0.12, R = IG.Ri - 0.02, hw = TUN.ri + TUN.t + 0.01, zr = 3.35;
      poly = [];
      const a0 = Math.asin(zp / R), a1 = Math.acos(hw / R);
      for (let i = 0; i <= 16; i++) { const a = a0 + (a1 - a0) * i / 16; poly.push([R * Math.cos(a), R * Math.sin(a)]); }
      poly.push([hw, TUN.z1], [hw, zr], [-hw, zr], [-hw, TUN.z1]);
      for (let i = 0; i <= 16; i++) { const a = Math.PI - a1 - (Math.PI - a1 - (Math.PI - a0)) * i / 16; poly.push([R * Math.cos(a), R * Math.sin(a)]); }
      ramp = { hw, za: TUN.z1, zb: zr };
    } else {
      const [x, z, lx, lz, d] = p.block; depth = d;
      poly = [[x - lx / 2, z - lz / 2], [x + lx / 2, z - lz / 2], [x + lx / 2, z + lz / 2], [x - lx / 2, z + lz / 2]];
    }
    // three.js shapes are in x/y; we map y -> -z after rotating, so flip z here
    shape.holes.push(new THREE.Path(poly.map(([x, z]) => new THREE.Vector2(x, -z))));
    floors.push({ poly, depth, ramp });
  }
  const gg = new THREE.PlaneGeometry(120, 120, 120, 120);
  gg.rotateX(-Math.PI / 2);
  const P = gg.attributes.position, UV = gg.attributes.uv;
  for (let i = 0; i < P.count; i++) UV.setXY(i, P.getX(i) / 1.2, P.getZ(i) / 1.2);
  // holes are cut in the fragment shader (no thin triangles)
  const rects = [], door = pits.includes('door');
  for (const p of pits) if (p !== 'door') rects.push(p.block);
  const gm = M.ground.clone();
  const glsl = [];
  for (const [x, z, lx, lz] of rects) glsl.push(`(abs(vG.x - ${x.toFixed(3)}) < ${(lx / 2).toFixed(3)} && abs(vG.z - ${z.toFixed(3)}) < ${(lz / 2).toFixed(3)})`);
  if (door) {
    const zp = 0.12, R = IG.Ri - 0.02, hw = TUN.ri + TUN.t + 0.01;
    glsl.push(`(length(vG.xz) < ${R.toFixed(3)} && vG.z > ${zp.toFixed(3)})`, `(abs(vG.x) < ${hw.toFixed(3)} && vG.z > 1.0 && vG.z < 3.35)`);
  }
  if (glsl.length) {
    gm.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vG;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvG = (modelMatrix * vec4(transformed,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vG;').replace('void main() {', `void main() { if (${glsl.join(' || ')}) discard;`);
    };
    gm.customProgramCacheKey = () => 'ground' + glsl.join();
  }
  const ground = new THREE.Mesh(gg, gm); ground.receiveShadow = !window.NOGS; g.add(ground);
  void shape;
  for (const f of floors) {
    const yAt = (x, z) => f.ramp && z > f.ramp.za ? -f.depth * (1 - (z - f.ramp.za) / (f.ramp.zb - f.ramp.za)) : -f.depth;
    // floor (flat part) + ramp quad
    const flat = f.ramp ? f.poly.filter(([, z]) => z <= f.ramp.za + 1e-6) : f.poly;
    const sh = new THREE.Shape(flat.map(([x, z]) => new THREE.Vector2(x, -z)));
    const fg = new THREE.ShapeGeometry(sh); fg.rotateX(-Math.PI / 2); fg.translate(0, -f.depth, 0);
    const fl = new THREE.Mesh(fg, M.pit); fl.receiveShadow = true; g.add(fl);
    if (f.ramp) {
      const { hw, za, zb } = f.ramp;
      const rg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-hw, -f.depth, za), new THREE.Vector3(hw, -f.depth, za), new THREE.Vector3(hw, 0, zb), new THREE.Vector3(-hw, 0, zb)]);
      rg.setIndex([0, 2, 1, 0, 3, 2]); rg.computeVertexNormals();
      const rm = new THREE.Mesh(rg, M.pit); rm.receiveShadow = true; g.add(rm);
    }
    // walls
    const pos = [];
    for (let i = 0; i < f.poly.length; i++) {
      const [x0, z0] = f.poly[i], [x1, z1] = f.poly[(i + 1) % f.poly.length];
      const y0 = yAt(x0, z0), y1 = yAt(x1, z1);
      if (y0 > -1e-4 && y1 > -1e-4) continue;
      pos.push(x0, 0, z0, x1, 0, z1, x1, y1, z1, x0, 0, z0, x1, y1, z1, x0, y0, z0);
    }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wg.computeVertexNormals();
    const wm = new THREE.Mesh(wg, M.pit); wm.receiveShadow = true; wm.castShadow = false; g.add(wm);
  }
  // distant snow hills
  const r = rng(5);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r() * 0.5, d = 32 + r() * 18;
    const h = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.ground);
    h.scale.set(8 + r() * 10, 2.5 + r() * 4, 8 + r() * 8);
    h.position.set(Math.cos(a) * d, -0.2, Math.sin(a) * d);
    g.add(h);
  }
  return g;
}

// a plain rectangular snow block (pile, cut-out slab): L along x, P along y, T along z
export function slabGeo(seed = 1) {
  const g = new THREE.BoxGeometry(IG.L - IG.gap, IG.P - IG.gap, IG.T, 8, 4, 2);
  const p = g.attributes.position, b = 0.02;
  const hx = (IG.L - IG.gap) / 2, hy = (IG.P - IG.gap) / 2, hz = IG.T / 2;
  const r = rng(seed); const ph = r() * 6;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ex = Math.abs(Math.abs(x) - hx) < 1e-4, ey = Math.abs(Math.abs(y) - hy) < 1e-4, ez = Math.abs(Math.abs(z) - hz) < 1e-4;
    if (ex + ey + ez >= 2) { if (ex) x -= Math.sign(x) * b; if (ey) y -= Math.sign(y) * b; if (ez) z -= Math.sign(z) * b; }
    if (ez && z > 0) z += 0.003 * Math.sin(x * 9 + ph) * Math.sin(y * 11);
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}
