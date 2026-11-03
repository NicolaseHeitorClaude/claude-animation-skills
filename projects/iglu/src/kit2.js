// Props, overlays and character helpers for the igloo short.
import * as THREE from 'three';
import { materials } from './materials.js';
import { rng, glowTexture } from './textures.js';
import { IG, plan, wallPoint, slabGeo, snowMats, S_TOTAL } from './igloo.js';
import { ikArm, clamp, smooth, lerp, range, easeInOut, V } from './anim.js';

const shadow = o => { o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; };
const TAU = Math.PI * 2;

// ---------- snow saw: grip at the origin, blade along +y ----------
export function snowSaw() {
  const M = materials();
  const g = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.13, 16), M.coatDark); g.add(grip);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.03), M.gunDark); guard.position.y = 0.072; g.add(guard);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.46, 0.005), M.saw); blade.position.set(0.012, 0.31, 0); g.add(blade);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0375, 0.0375, 0.005, 20, 1, false, 0, Math.PI), M.saw);
  tip.rotation.x = Math.PI / 2; tip.rotation.z = Math.PI / 2; tip.position.set(0.012, 0.54, 0); g.add(tip);
  for (let i = 0; i < 18; i++) { // teeth on one edge
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.016, 3), M.saw);
    t.rotation.z = Math.PI / 2; t.position.set(-0.034, 0.1 + i * 0.024, 0); g.add(t);
  }
  g.tip = new THREE.Vector3(0.012, 0.565, 0);
  g.edge = (k) => new THREE.Vector3(-0.03, 0.1 + k * 0.43, 0);
  return shadow(g);
}

// ---------- stake + cord for marking the circle ----------
export function stake() {
  const M = materials();
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.4, 10), M.wood); s.position.y = 0.12; g.add(s);
  const knot = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.007, 6, 14), M.string); knot.rotation.x = Math.PI / 2; knot.position.y = 0.22; g.add(knot);
  return shadow(g);
}
export function cord() {
  const M = materials();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 1, 6), M.string);
  m.castShadow = true;
  m.set = (a, b) => {
    const d = b.clone().sub(a); m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, d.length(), 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  };
  return m;
}
// groove drawn in the snow: arc on the ground, revealed from a0 by progress
export function groove(radius, w = 0.03) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x9cbfe3, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 });
  const m = new THREE.Mesh(new THREE.RingGeometry(radius - w / 2, radius + w / 2, 160, 1, 0, 0.001), mat);
  m.rotation.x = -Math.PI / 2; m.position.y = 0.003; m.receiveShadow = true;
  m.set = (a0, a1) => { m.geometry.dispose(); m.geometry = new THREE.RingGeometry(radius - w / 2, radius + w / 2, 160, 1, a0, Math.max(0.001, a1 - a0)); };
  return m;
}
// dark kerf lines on the snow around a rectangle (saw cut), revealed by progress 0..1 along the perimeter
export function kerf(cx, cz, lx, lz) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x7b9fc6 });
  const g = new THREE.Group();
  const sides = [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]];
  const bars = sides.map(([a, b]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.004, 0.012), mat); g.add(m); return { m, a, b }; });
  g.set = (k) => {
    bars.forEach(({ m, a, b }, i) => {
      const f = clamp(k * 4 - i);
      m.visible = f > 0.001;
      const A = V(cx + a[0] * lx / 2, 0.002, cz + a[1] * lz / 2), B = V(cx + b[0] * lx / 2, 0.002, cz + b[1] * lz / 2);
      const E = A.clone().lerp(B, f);
      m.position.copy(A).lerp(E, 0.5); m.scale.x = Math.max(0.001, A.distanceTo(E));
      m.rotation.y = -Math.atan2(B.z - A.z, B.x - A.x);
    });
  };
  g.set(0);
  return g;
}

// ---------- stack of cut blocks ----------
export function pile(n = 6, seed = 3) {
  const g = new THREE.Group();
  const M = snowMats();
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const col = i % 2, lay = Math.floor(i / 2);
    const geo = slabGeo(seed * 10 + i);
    const m = new THREE.Mesh(geo, M.block); m.castShadow = m.receiveShadow = true;
    m.rotation.set(-Math.PI / 2, 0, (r() - 0.5) * 0.08);
    m.position.set((r() - 0.5) * 0.03, IG.T / 2 + lay * (IG.T + 0.004), (col - 0.5) * (IG.P + 0.02));
    g.add(m);
  }
  g.topY = (n) => IG.T + Math.ceil(n / 2) * (IG.T + 0.004);
  return g;
}

// ---------- spiral guide line: thin dashed tube along the top edge of the spiral ----------
export function guideSpiral(th0 = 0, th1 = TAU * 1.6, color = 0xffc93a) {
  const pl = plan();
  const pts = [];
  for (let i = 0; i <= 300; i++) {
    const th = th0 + (th1 - th0) * i / 300;
    const s = Math.min(S_TOTAL - 0.05, pl.sOf(th) + 0.012);
    pts.push(wallPoint(th, s, IG.T + 0.035));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 600, 0.011, 6, false);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(color) }, uK: { value: 0 }, uA: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 uCol; uniform float uK, uA; varying vec2 vUv;
      void main(){ if (vUv.x > uK) discard; float d = step(0.45, fract(vUv.x * 90.0)); if (d < 0.5) discard; gl_FragColor = vec4(uCol, uA); }`,
    transparent: true, depthWrite: false, toneMapped: false,
  });
  const m = new THREE.Mesh(geo, mat); m.renderOrder = 5;
  m.set = (k, a = 1) => { mat.uniforms.uK.value = k; mat.uniforms.uA.value = a; m.visible = k > 0 && a > 0; };
  m.set(0);
  return m;
}
// straight dashed guide on the ramp cut (from ground at th=0 to full height at 2pi)
export function rampGuide() {
  const pl = plan();
  const pts = [];
  for (let i = 0; i <= 200; i++) { const th = TAU * i / 200; pts.push(wallPoint(th, Math.max(0.01, pl.ramp(th)), IG.T + 0.02)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 400, 0.009, 6, false);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(0xffc93a) }, uK: { value: 0 }, uA: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 uCol; uniform float uK, uA; varying vec2 vUv;
      void main(){ if (vUv.x > uK) discard; if (fract(vUv.x * 60.0) < 0.45) discard; gl_FragColor = vec4(uCol, uA); }`,
    transparent: true, depthWrite: false, toneMapped: false,
  });
  const m = new THREE.Mesh(geo, mat); m.renderOrder = 5;
  m.set = (k, a = 1) => { mat.uniforms.uK.value = k; mat.uniforms.uA.value = a; m.visible = k > 0 && a > 0; };
  m.set(0);
  return m;
}

// ---------- arrows: tube along points with a cone head, revealed by k ----------
export function arrow3D(points, { color = 0xffffff, r = 0.018, head = 0.07, opacity = 0.95 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => Array.isArray(p) ? V(...p) : p));
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false });
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, r, 8, false), mat);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, head, 14), mat);
  const g = new THREE.Group(); g.add(tube, cone); g.renderOrder = 6; tube.renderOrder = cone.renderOrder = 6;
  const idx = tube.geometry.index.count;
  g.set = (k, a = 1) => {
    k = clamp(k); g.visible = k > 0.01 && a > 0.01;
    mat.opacity = opacity * a;
    tube.geometry.setDrawRange(0, Math.floor(idx * k / 6) * 6);
    const p = curve.getPointAt(k), tg = curve.getTangentAt(k);
    cone.position.copy(p); cone.quaternion.setFromUnitVectors(V(0, 1, 0), tg);
  };
  g.mat = mat; g.curve = curve;
  g.set(0);
  return g;
}
// double-headed measuring arrow (height difference)
export function measure(a, b, color = 0xffffff) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, toneMapped: false });
  const A = V(...a), B = V(...b), d = B.clone().sub(A), L = d.length();
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, L - 0.1, 8), mat);
  bar.position.copy(A).lerp(B, 0.5); bar.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); g.add(bar);
  for (const [p, dir] of [[B, d.clone().normalize()], [A, d.clone().normalize().negate()]]) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 12), mat);
    c.position.copy(p).addScaledVector(dir, -0.035); c.quaternion.setFromUnitVectors(V(0, 1, 0), dir); g.add(c);
  }
  for (const p of [A, B]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.008, 0.008), mat); t.position.copy(p); g.add(t); }
  g.renderOrder = 7; g.children.forEach(c => c.renderOrder = 7);
  g.set = (a) => { mat.opacity = a; g.visible = a > 0.01; };
  g.set(0);
  return g;
}

// ---------- falling, wind-blown snow (deterministic in t) ----------
export function snowfall(n = 1400, { box = [14, 6, 14], center = [0, 0, 0], wind = [1.6, -0.9, 0.3], size = 0.035, seed = 4, opacity = 0.9 } = {}) {
  const r = rng(seed);
  const geo = new THREE.BufferGeometry();
  const base = new Float32Array(n * 3), pos = new Float32Array(n * 3), sp = new Float32Array(n);
  for (let i = 0; i < n; i++) { base[i * 3] = r() * box[0]; base[i * 3 + 1] = r() * box[1]; base[i * 3 + 2] = r() * box[2]; sp[i] = 0.7 + r() * 0.6; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size, map: glowTexture(), transparent: true, opacity, depthWrite: false, color: 0xffffff, toneMapped: false });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false;
  const wrap = (x, L) => ((x % L) + L) % L;
  p.update = (t, k = 1) => {
    for (let i = 0; i < n; i++) {
      const s = sp[i];
      pos[i * 3] = center[0] - box[0] / 2 + wrap(base[i * 3] + wind[0] * s * t + 0.15 * Math.sin(t * 2 + i), box[0]);
      pos[i * 3 + 1] = center[1] + wrap(base[i * 3 + 1] + wind[1] * s * t, box[1]);
      pos[i * 3 + 2] = center[2] - box[2] / 2 + wrap(base[i * 3 + 2] + wind[2] * s * t + 0.1 * Math.cos(t * 1.7 + i), box[2]);
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = opacity * k;
  };
  p.update(0);
  return p;
}
// small snow crumbs (meshes, not glows): burst from a point at t0
export function crumbs(n = 40, { seed = 2, speed = 0.6, gravity = -3.5, size = 0.012, dir = V(0, 1, 0), spread = 0.8, life = 0.9 } = {}) {
  const r = rng(seed);
  const M = snowMats();
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const P = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, M.fill); m.scale.setScalar(size * (0.5 + r()));
    const v = V(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(spread).add(dir.clone().normalize()).normalize().multiplyScalar(speed * (0.3 + r() * 0.8));
    P.push({ m, v, d: r() * 0.25 }); g.add(m);
  }
  g.update = (t) => {
    for (const { m, v, d } of P) {
      const tt = t - d; m.visible = tt > 0 && tt < life;
      if (!m.visible) continue;
      m.position.set(v.x * tt, Math.max(-5, v.y * tt + 0.5 * gravity * tt * tt), v.z * tt);
      m.rotation.set(tt * 5, tt * 3, 0);
    }
  };
  g.update(-1);
  return g;
}

// ---------- interior furnishings ----------
export function furHide() {
  const M = snowMats();
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(1.7, 0.04, 1.0, 20, 1, 12);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) + 0.008 * Math.sin(x * 9) * Math.cos(z * 7)); if (Math.abs(x) > 0.8 || Math.abs(z) > 0.45) p.setY(i, p.getY(i) - 0.01); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, M.fur); m.position.y = 0.02; m.castShadow = m.receiveShadow = true; g.add(m);
  return g;
}
export function sleepingBag() {
  const M = snowMats();
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.35, 10, 24), M.bag);
  body.rotation.z = Math.PI / 2; body.scale.set(1, 1, 0.62); body.position.y = 0.13; g.add(body);
  for (let i = 0; i < 7; i++) { const q = new THREE.Mesh(new THREE.TorusGeometry(0.196, 0.012, 6, 30), M.bag); q.rotation.y = Math.PI / 2; q.scale.set(0.62, 1, 1); q.position.set(-0.6 + i * 0.2, 0.13, 0); g.add(q); }
  const open = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 12, 0, Math.PI * 2, 0, 1.2), M.bagIn);
  open.rotation.z = -Math.PI / 2; open.scale.set(0.62, 1, 1.0); open.position.set(0.86, 0.13, 0); g.add(open);
  return shadow(g);
}

// ---------- magnifier: canvas schematic of snow grains with trapped air ----------
export function magnifier(size = 0.9) {
  const C = 768;
  const c = document.createElement('canvas'); c.width = c.height = C;
  const g2 = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const r = rng(91);
  const grains = [];
  // packed rounded grains on a jittered grid; the gaps between them are the air pockets
  for (let y = -40; y < C + 40; y += 62) for (let x = -40; x < C + 40; x += 62) {
    grains.push({ x: x + (r() - 0.5) * 30 + ((y / 62) % 2) * 31, y: y + (r() - 0.5) * 26, rx: 26 + r() * 12, ry: 22 + r() * 12, a: r() * 3 });
  }
  const pockets = [];
  for (let i = 0; i < 70; i++) pockets.push({ x: r() * C, y: r() * C, s: 7 + r() * 13, p: r() * 6 });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const m = new THREE.Mesh(new THREE.CircleGeometry(size / 2, 96), mat); m.renderOrder = 20;
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthTest: false, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(size / 2, size / 2 + 0.022, 96), ringMat); ring.renderOrder = 21;
  const g = new THREE.Group(); g.add(m, ring);
  g.draw = (t, heat = 0, a = 1) => {
    g2.clearRect(0, 0, C, C);
    g2.save(); g2.beginPath(); g2.arc(C / 2, C / 2, C / 2, 0, TAU); g2.clip();
    g2.fillStyle = '#9fc9ef'; g2.fillRect(0, 0, C, C);           // air between grains (light blue)
    for (const q of grains) {
      g2.fillStyle = '#ffffff';
      g2.beginPath(); g2.ellipse(q.x, q.y, q.rx, q.ry, q.a, 0, TAU); g2.fill();
      g2.fillStyle = 'rgba(190,214,238,0.55)';
      g2.beginPath(); g2.ellipse(q.x + 5, q.y + 6, q.rx * 0.8, q.ry * 0.7, q.a, 0, TAU); g2.fill();
      g2.fillStyle = '#ffffff';
      g2.beginPath(); g2.ellipse(q.x - 3, q.y - 3, q.rx * 0.82, q.ry * 0.8, q.a, 0, TAU); g2.fill();
    }
    // trapped air bubbles, gently pulsing
    for (const p of pockets) {
      const s = p.s * (1 + 0.08 * Math.sin(t * 2 + p.p));
      g2.fillStyle = 'rgba(120,175,230,0.9)'; g2.beginPath(); g2.arc(p.x, p.y, s, 0, TAU); g2.fill();
      g2.fillStyle = 'rgba(255,255,255,0.8)'; g2.beginPath(); g2.arc(p.x - s * 0.35, p.y - s * 0.35, s * 0.28, 0, TAU); g2.fill();
    }
    // heat: warm wavy arrows entering from the left, fading as they cross
    if (heat > 0) {
      for (let k = 0; k < 3; k++) {
        const y0 = C * (0.3 + k * 0.2);
        const len = C * 0.62 * heat;
        const grad = g2.createLinearGradient(0, 0, C * 0.75, 0);
        grad.addColorStop(0, 'rgba(255,140,40,0.95)'); grad.addColorStop(0.55, 'rgba(255,160,70,0.55)'); grad.addColorStop(1, 'rgba(255,170,90,0.0)');
        g2.strokeStyle = grad; g2.lineWidth = 16; g2.lineCap = 'round';
        g2.beginPath();
        for (let x = 0; x <= len; x += 6) { const y = y0 + Math.sin(x * 0.03 - t * 4 + k) * 14; if (x === 0) g2.moveTo(x, y); else g2.lineTo(x, y); }
        g2.stroke();
      }
    }
    g2.restore();
    tex.needsUpdate = true;
    mat.opacity = a; ringMat.opacity = a; g.visible = a > 0.01;
  };
  g.draw(0, 0, 0);
  return g;
}

// ---------- character helpers ----------
// walk cycle. ph in radians (2pi = two steps). amp = hip swing
export function walkPose(ph, amp = 0.36, carry = false) {
  const s = Math.sin(ph), c = Math.cos(ph);
  const lift = (x) => Math.max(0, x);
  const p = {
    lHip: [-amp * s, 0, 0.05], rHip: [amp * s, 0, -0.05],
    lKn: [0.12 + 0.75 * lift(c) * lift(s + 0.6), 0, 0], rKn: [0.12 + 0.75 * lift(-c) * lift(-s + 0.6), 0, 0],
    drop: -0.015 - 0.02 * Math.abs(c),
    spine: [0.04, 0.05 * s, 0], chest: [0, -0.08 * s, 0],
  };
  p.lAn = [-(p.lHip[0] + p.lKn[0]) * 0.8 + 0.1 * lift(c), 0, -0.05];
  p.rAn = [-(p.rHip[0] + p.rKn[0]) * 0.8 + 0.1 * lift(-c), 0, 0.05];
  if (!carry) { p.lSh = [0.35 * s, 0, 0.14]; p.rSh = [-0.35 * s, 0, -0.14]; p.lEl = [-0.3 - 0.2 * lift(-s), 0, 0]; p.rEl = [-0.3 - 0.2 * lift(s), 0, 0]; }
  return p;
}
export const STRIDE = 1.3; // metres per 2pi of walk phase
// stepping in place while turning: ang = accumulated yaw (rad)
export function turnSteps(ang) {
  const ph = ang / 0.55 * Math.PI;
  const a = Math.max(0, Math.sin(ph)), b = Math.max(0, -Math.sin(ph));
  return { lHip: [-0.25 * a, 0, 0.06], lKn: [0.5 * a, 0, 0], lAn: [-0.2 * a, 0, -0.06], rHip: [-0.25 * b, 0, -0.06], rKn: [0.5 * b, 0, 0], rAn: [-0.2 * b, 0, 0.06], drop: -0.01 - 0.015 * (a + b) };
}
// both hands on a block: on its two ends (local x = +-L/2), palms in
export function holdBlock(h, blockObj, { spread = 0.5, up = 0, pole = null, side = 1 } = {}) {
  blockObj.updateMatrixWorld(true);
  const half = (IG.L / 2) * spread * 2 * 0.5 + 0.035;
  for (const [s, k] of [[1, 'l'], [-1, 'r']]) {
    // left hand at the block end that is on the character's left
    h.root.updateMatrixWorld(true);
    const endA = blockObj.localToWorld(V(half, up, 0)), endB = blockObj.localToWorld(V(-half, up, 0));
    const leftDir = V(1, 0, 0).applyQuaternion(h.root.getWorldQuaternion(new THREE.Quaternion()));
    const useA = endA.clone().sub(endB).dot(leftDir) > 0;
    const T = (s > 0) === useA ? endA : endB;
    const P = pole || h.root.localToWorld(V(s * 0.8, 0.9, -0.3));
    const hint = blockObj.localToWorld(V(0, 0, 0)).sub(T).normalize();
    ikArm(h, k, T, P, hint);
  }
}
export function reachTo(h, side, target, { pole = null, hint = null } = {}) {
  const s = side === 'l' ? 1 : -1;
  h.root.updateMatrixWorld(true);
  const P = pole || h.root.localToWorld(V(s * 0.9, 0.9, -0.4));
  const hi = hint || target.clone().sub(h.root.localToWorld(V(s * 0.2, 1.4, 0))).normalize();
  ikArm(h, side, target, P, hi);
}
export function faceDir(h, dx, dz) { h.root.rotation.y = Math.atan2(dx, dz); }
export function headLook(h, target, k = 1) {
  // turn neck/head towards a world point (approximate, yaw + pitch split)
  h.root.updateMatrixWorld(true);
  const head = h.j.neck.getWorldPosition(V(0, 0, 0));
  const local = h.root.worldToLocal(target.clone()).sub(h.root.worldToLocal(head.clone()));
  const yaw = clamp(Math.atan2(local.x, local.z), -1.0, 1.0) * k;
  const pitch = clamp(-Math.atan2(local.y, Math.hypot(local.x, local.z)), -0.7, 0.8) * k;
  h.j.neck.rotation.set(pitch * 0.5, yaw * 0.5, 0, 'YXZ');
  h.j.head.rotation.set(pitch * 0.5, yaw * 0.5, 0, 'YXZ');
}
export { lerp, smooth, range, easeInOut };
