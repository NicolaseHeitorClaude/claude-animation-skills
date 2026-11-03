// "Como um iglu é construído" — the edit. Every shot reads the same build schedule (SCH) in global
// time, so the igloo, the pile, the tools and the character stay consistent from shot to shot.
import * as THREE from 'three';
import { makeHuman } from './human.js';
import { glowSprite } from './props.js';
import { kf, lerp, smooth, easeOut, easeIn, easeInOut, range, clamp, V, cam, place, shake, ikArm } from './anim.js';
import { IG, DOOR, TUN, plan, igloo, setClip, wallPoint, wallNormal, wallRadius, S_TOTAL, slabGeo, snowMats, blockMesh, tunnelPlan } from './igloo.js';
import { snowSaw, stake, cord, groove, kerf, pile, guideSpiral, rampGuide, arrow3D, measure, snowfall, crumbs, furHide, sleepingBag, magnifier, walkPose, STRIDE, turnSteps, holdBlock, reachTo, headLook } from './kit2.js';
export { CAPTIONS, DURATION } from './captions.js';
import { DURATION } from './captions.js';

// [fadeInStart, fullStart, fullEnd, fadeOutEnd, colour]
export const FADES = [[3.42, 3.6, 3.64, 3.84, '#ffffff']];
// [start, end, text]: the small note at the end
export const NOTES = [[57.9, 99, 'Explicação simplificada. Construção real exige experiência.']];

const PL = plan();
const TAU = Math.PI * 2;
const UP = V(0, 1, 0);
const Q = { x: 2.35, z: 1.05 };                 // where the first block is cut (slab standing, L along x)
const PILE = V(2.6, 0, -1.05);                  // stack of cut blocks
const PILE_TOP = V(2.6, 0.95, -1.05);           // where passed blocks leave the stack
const RW = IG.Ri + IG.T / 2;                    // circle radius (middle of the wall)
const spi = j => PL.nRing + j;
const KEY = PL.blocks.length - 1;

// ---------------- build schedule (global seconds) ----------------
// featured block for the close-up: second turn of the spiral, wall facing -x (seen in profile by a z=0 cut)
let J5 = 0, best = 9;
for (let j = 0; j < PL.nSpiral; j++) {
  const b = PL.blocks[spi(j)], th = (b.th0 + b.th1) / 2;
  if (th < TAU * 1.0 || th > TAU * 2.0) continue;
  const d = Math.abs(((th - Math.PI - 0.22) % TAU + TAU) % TAU - 0) ;
  const dd = Math.min(d, TAU - d);
  if (dd < best) { best = dd; J5 = j; }
}
const SCH = [];
SCH[0] = { manual: true, t1: 13.05 };
for (let i = 1; i < PL.nRing; i++) { const t1 = 13.3 + (i - 1) * 0.072; SCH[i] = { t0: t1 - 0.55, t1 }; }
for (let j = 0; j < 10; j++) { const t1 = 18.8 + j * 0.215; SCH[spi(j)] = { t0: t1 - 0.6, t1 }; }
for (let j = 10; j < J5; j++) SCH[spi(j)] = { t0: 21.0, t1: 21.0 };
SCH[spi(J5)] = { manual: true, t1: 23.45 };
{
  const n = PL.nSpiral - J5 - 1;
  for (let k = 0; k < n; k++) { const t1 = 24.4 + k * (2.6 / Math.max(1, n - 1)); SCH[spi(J5 + 1 + k)] = { t0: t1 - 0.6, t1 }; }
}
SCH[KEY] = { manual: true, t1: 31.2 };
const KEY_UP = 0.09, KEY_BIG = 1.13;
function keyState(T) {   // raise above the hole + oversize factor (trimmed to size), then lowered
  const big = lerp(KEY_BIG, 1, smooth(range(T, 28.0, 29.6)));
  const up = KEY_UP * (1 - easeInOut(range(T, 30.0, 31.2)));
  return { big, up, vis: T >= 27.2 };
}
// ramp cut, sweeping from th=0 at CUT0 to CUTMAX at CUT1; all of it is cut after 17.95
const CUT0 = 14.85, CUT1 = 17.85, CUTMAX = Math.PI * 0.8;
const thCut = T => CUTMAX * range(T, CUT0, CUT1);
function cutK(i, T) {
  if (T >= 17.95) return 1;
  const b = PL.blocks[i];
  const f = b.th1 / CUTMAX;
  if (f > 1) return 0;
  const tc = CUT0 + f * (CUT1 - CUT0);
  return T < tc ? 0 : Math.max(1e-3, clamp((T - tc) / 0.9));
}
const FILL = T => T < 31.6 ? 0 : T < 33.62 ? 0.07 * smooth(range(T, 31.7, 33.5)) : 1;
const TUN_T = k => 36.65 + k * 0.105;           // landing time of tunnel block k (15 blocks)

// ---------------- flights: stack -> above the slot -> down into place ----------------
const qFlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const _a = V(0, 0, 0), _b = V(0, 0, 0);
function bez(p0, p1, p2, t, out) { const u = 1 - t; return out.set(0, 0, 0).addScaledVector(p0, u * u).addScaledVector(p1, 2 * u * t).addScaledVector(p2, t * t); }
function flightPose(g, frame, k, from = PILE_TOP) {
  const to = frame.pos;
  const nh = V(frame.normal.x, 0, frame.normal.z).normalize();
  const app = to.clone().addScaledVector(UP, 0.42).addScaledVector(nh, 0.08);
  if (k < 0.72) {
    const u = easeInOut(k / 0.72);
    const ctrl = from.clone().lerp(app, 0.5); ctrl.y = 3.5;
    bez(from, ctrl, app, u, g.position);
  } else g.position.copy(app).lerp(to, smooth((k - 0.72) / 0.28));
  g.quaternion.copy(qFlat).slerp(frame.quat, smooth(k / 0.7));
}
function applyIg(ig, T, manual = {}) {
  for (const it of ig.userData.items) {
    const i = it.i, s = SCH[i];
    if (it.setCut) it.setCut(cutK(i, T));
    if (manual[i]) continue;
    if (i === KEY) { const k = keyState(T); it.g.visible = k.vis; it.g.position.copy(it.b.frame.pos).addScaledVector(UP, k.up); it.g.scale.set(k.big, 1, k.big); continue; }
    if (!s || T >= s.t1) { it.g.visible = true; it.g.position.copy(it.b.frame.pos); it.g.quaternion.copy(it.b.frame.quat); if (it.off && T < s?.t1) it.off.visible = false; continue; }
    if (s.manual || T < s.t0) { it.g.visible = false; if (it.off) it.off.visible = false; continue; }
    it.g.visible = true;
    flightPose(it.g, it.b.frame, (T - s.t0) / (s.t1 - s.t0));
  }
  ig.userData.fill.userData.u.uFill.value = FILL(T);
  const tn = ig.userData.tunnel;
  if (tn) tn.userData.meshes.forEach((m, k) => {
    const t1 = TUN_T(k), b = tunnelPlan().blocks[k];
    m.visible = T >= t1 - 0.4;
    m.position.copy(b.pos).addScaledVector(UP, 0.55 * (1 - easeOut(range(T, t1 - 0.4, t1))));
  });
}
// the landing block at time T (for heads and hands to follow)
function landing(T, from = 0, to = PL.blocks.length) {
  let bestI = -1, bt = 9;
  for (let i = from; i < to; i++) { const s = SCH[i]; if (!s || s.manual) continue; const d = s.t1 - T; if (d > -0.15 && d < bt) { bt = d; bestI = i; } }
  return bestI;
}

// ---------------- character ----------------
const STAND = { lSh: [0.06, 0, 0.2], rSh: [0.06, 0, -0.2], lEl: [-0.22, 0, 0], rEl: [-0.22, 0, 0], lHip: [0, 0, 0.06], rHip: [0, 0, -0.06], lAn: [0, 0, -0.06], rAn: [0, 0, 0.06] };
const idle = (t, k = 1) => Math.sin(t * 1.6) * 0.015 * k;
// legs for a crouch / knee bend with the feet flat on the ground
function legs(hip, knee, spread = 0.07) {
  const drop = 0.44 * Math.cos(hip) + 0.45 * Math.cos(hip + knee) - 0.89;
  return { lHip: [hip, 0, spread], rHip: [hip, 0, -spread], lKn: [knee, 0, 0], rKn: [knee, 0, 0], lAn: [-(hip + knee), 0, -spread], rAn: [-(hip + knee), 0, spread], drop };
}
function person() { const h = makeHuman('parka'); return h; }
function withSaw(h, side = 'r') { const s = snowSaw(); h.j[side + 'Wr'].add(s); s.position.set(0, -0.075, 0.01); s.rotation.x = Math.PI / 2; return s; }
// sitting on the platform edge, feet down in the entrance pit
function sitPose(h, t) {
  h.setPose({ drop: -0.77, spine: [-0.08, 0, 0], chest: [idle(t) - 0.05, 0, 0], neck: [0.08, 0, 0],
    lHip: [-1.5, 0, 0.12], rHip: [-1.5, 0, -0.12], lKn: [1.48, 0, 0], rKn: [1.48, 0, 0], lAn: [0.02, 0, -0.1], rAn: [0.02, 0, 0.1],
    lSh: [-0.45, 0, 0.18], rSh: [-0.45, 0, -0.18], lEl: [-0.9, 0.3, 0], rEl: [-0.9, -0.3, 0] });
}
const SIT_AT = V(0.05, 0, -0.04);

// ---------------- shared scene bits ----------------
function igScene(makeStage, { door = false, pit = null, shadowSize = 4, sunDir = [-4, 7, 5], furn = door, pileOn = true } = {}) {
  const scene = makeStage({ shadowSize, sunDir, pit: pit ?? (door ? ['door', { block: [Q.x, Q.z, IG.L, IG.T + 0.9, IG.P] }] : { block: [Q.x, Q.z, IG.L, IG.T + 0.9, IG.P] }) });
  const ig = igloo({ door }); scene.add(ig);
  let st = null;
  if (pileOn) { st = pile(6); st.position.copy(PILE); scene.add(st); }
  const out = { scene, ig, pile: st };
  if (furn) {
    const fur = furHide(); fur.position.set(0, 0, -0.62); scene.add(fur);
    const bag = sleepingBag(); bag.position.set(-0.05, 0.04, -0.82); bag.rotation.y = 0.05; scene.add(bag);
    out.fur = fur; out.bag = bag;
  }
  return out;
}
const clipZ = new THREE.Plane(V(0, 0, -1), 0);   // removes z > 0 (front half, towards a camera on +z)
const clipX = new THREE.Plane(V(-1, 0, 0), 0);   // removes x > 0 (for the entrance section)
const res = (o = {}) => ({ bloom: 0.12, ...o });

// =====================================================================
// 1. HOOK: finished igloo in the blizzard, then a cutaway: someone sheltered inside
function sHook({ makeStage }) {
  const S = igScene(makeStage, { door: true, shadowSize: 5 });
  const h = person(); h.root.position.copy(SIT_AT); S.scene.add(h.root);
  const sf = snowfall(2600, { box: [16, 7, 16], wind: [3.2, -1.3, 0.6], size: 0.05 });
  S.scene.add(sf);
  const glow = glowSprite(0xffa860, 0.75); glow.position.set(0.05, 0.75, 0.1); S.scene.add(glow);
  const warm = new THREE.PointLight(0xffb070, 0, 3); warm.position.set(0, 1.0, 0.2); S.scene.add(warm);
  const c = cam(40);
  const plane = new THREE.Plane(V(0, 0, -1), 4);
  return {
    scene: S.scene, camera: c,
    update(t, T) {
      applyIg(S.ig, 99);
      sitPose(h, t); h.setMouth(0);
      headLook(h, V(0.6, 1.2, 3), 0.6);
      sf.update(t, 1);
      const reveal = easeInOut(range(t, 1.7, 2.7));
      plane.constant = lerp(4, 0, reveal);
      setClip(reveal > 0 ? [plane] : null);
      glow.material.opacity = 0.18 * reveal; warm.intensity = 0.25 * reveal;
      const k = easeInOut(range(t, 0, 3.6));
      const s = shake(t, 1.2, 2);
      place(c, [lerp(3.4, 1.0, k) + s[0], lerp(2.1, 1.8, k) + s[1], lerp(11.0, 7.9, k)], [lerp(0.3, 0.05, k), lerp(1.2, 0.8, k), 0]);
      return res({ shadowCenter: [0, 0, 0] });
    },
  };
}

// 2a. MATERIAL: empty field, the builder saws a block out of hard, wind-packed snow
function sCutWide({ makeStage }) {
  const scene = makeStage({ shadowSize: 2.5, pit: { block: [Q.x, Q.z, IG.L, IG.T, IG.P] }, shadowCenter: [Q.x, 0, Q.z] });
  const slab = new THREE.Mesh(slabGeo(5), snowMats().block); slab.castShadow = slab.receiveShadow = true;
  slab.position.set(Q.x, -IG.P / 2 + 0.0, Q.z); scene.add(slab);
  const kf1 = kerf(Q.x, Q.z, IG.L, IG.T); scene.add(kf1);
  const h = person(); h.root.position.set(Q.x + 0.05, 0, Q.z + 0.5); h.root.rotation.y = Math.PI; scene.add(h.root);
  const saw = withSaw(h, 'r');
  const cr = crumbs(30, { seed: 4, speed: 0.4, dir: V(0, 1, 0.3) }); scene.add(cr);
  const c = cam(36);
  return {
    scene, camera: c,
    update(t, T) {
      setClip(null);
      const prog = smooth(range(t, 0.25, 2.75));
      kf1.set(prog);
      // where the saw is on the outline
      const per = prog * 4, side = Math.min(3, Math.floor(per)), f = per - side;
      const C = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]];
      const ax = Q.x + lerp(C[side][0], C[side + 1][0], f) * IG.L / 2, az = Q.z + lerp(C[side][1], C[side + 1][1], f) * IG.T / 2;
      const L = legs(-0.95, 1.55, 0.12);
      h.setPose({ ...STAND, ...L, spine: [0.55, 0, 0], chest: [0.25 + idle(t), 0, 0], neck: [0.15, 0, 0], head: [0.2, 0, 0], lSh: [-0.6, 0, 0.3], lEl: [-1.3, 0, 0] });
      h.root.position.set(Q.x + lerp(-0.12, 0.12, smooth(range(t, 0.3, 2.6))), 0, Q.z + 0.55);
      // up-down saw strokes, blade pointing down into the kerf
      const stroke = Math.sin(t * 10) * 0.06;
      const grip = V(ax, 0.42 + stroke, az + 0.02);
      reachTo(h, 'r', grip, { hint: V(0, -1, -0.15).normalize(), pole: h.root.localToWorld(V(-0.8, 0.6, 0.2)) });
      // left hand rests on the knee
      reachTo(h, 'l', h.root.localToWorld(V(0.12, 0.5, 0.42)), { hint: V(0, -0.3, -1).normalize() });
      cr.position.set(ax, 0.01, az); cr.update(((t * 10) % (Math.PI * 2)) / 10 * 1.0);
      const k = easeInOut(range(t, 0, 2.8));
      place(c, [lerp(Q.x + 2.6, Q.x + 1.6, k), lerp(1.5, 1.1, k), lerp(Q.z + 3.6, Q.z + 2.5, k)], [Q.x - 0.05, lerp(0.55, 0.45, k), Q.z + 0.1]);
      return res({ shadowCenter: [Q.x, 0, Q.z] });
    },
  };
}

// 2b. MATERIAL close-up: the block comes out; its white, grainy faces show it is packed snow, not ice
function sCutClose({ makeStage }) {
  const scene = makeStage({ shadowSize: 1.4, pit: { block: [Q.x, Q.z, IG.L, IG.T, IG.P] }, shadowCenter: [Q.x, 0, Q.z] });
  const slab = new THREE.Mesh(slabGeo(5), snowMats().block); slab.castShadow = slab.receiveShadow = true; scene.add(slab);
  const kf1 = kerf(Q.x, Q.z, IG.L, IG.T); kf1.set(1); scene.add(kf1);
  const h = person(); h.root.position.set(Q.x, 0, Q.z + 0.5); h.root.rotation.y = Math.PI; scene.add(h.root);
  const saw = snowSaw(); saw.position.set(Q.x + 0.55, 0.012, Q.z + 0.15); saw.rotation.set(Math.PI / 2, 0, 0.7); scene.add(saw);
  const cr = crumbs(45, { seed: 9, speed: 0.25, gravity: -2.5, dir: V(0, -1, 0), spread: 1.2, life: 1.2 }); scene.add(cr);
  const c = cam(30);
  return {
    scene, camera: c,
    update(t, T) {
      setClip(null);
      const lift = easeInOut(range(t, 0.45, 1.85));
      const y = -IG.P / 2 + lift * (0.95 + IG.P / 2 - 0.05);
      slab.position.set(Q.x, y, Q.z);
      // crouch -> stand with the block (back straight-ish, legs doing the work)
      const L = legs(lerp(-1.05, -0.12, lift), lerp(1.7, 0.2, lift), 0.13);
      h.setPose({ ...STAND, ...L, spine: [lerp(0.5, 0.0, lift), 0, 0], chest: [lerp(0.25, -0.05, lift) + idle(t), 0, 0], neck: [lerp(0.2, 0.1, lift), 0, 0], head: [lerp(0.25, 0.1, lift), 0, 0] });
      h.root.position.set(Q.x, 0, Q.z + lerp(0.48, 0.36, lift));
      holdBlock(h, slab, { spread: 0.5 });
      cr.position.set(Q.x, y - IG.P / 2, Q.z); cr.update(t - 0.6);
      const k = easeInOut(range(t, 0, 1.9));
      place(c, [Q.x + lerp(0.55, 0.6, k), lerp(0.85, 0.95, k), Q.z - lerp(0.95, 1.35, k)], [Q.x, lerp(-0.05, 0.7, lift), Q.z + 0.1]);
      return res({ shadowCenter: [Q.x, 0, Q.z] });
    },
  };
}

// 2c. carrying the block with both hands to the stack of cut blocks
function sCarry({ makeStage }) {
  const scene = makeStage({ shadowSize: 3, pit: { block: [Q.x, Q.z, IG.L, IG.T, IG.P] }, shadowCenter: [2.7, 0, 0] });
  const st = pile(5); st.position.copy(PILE); scene.add(st);
  const slab = new THREE.Mesh(slabGeo(5), snowMats().block); slab.castShadow = slab.receiveShadow = true; scene.add(slab);
  const h = person(); scene.add(h.root);
  const saw = snowSaw(); saw.position.set(Q.x + 0.55, 0.012, Q.z + 0.15); saw.rotation.set(Math.PI / 2, 0, 0.7); scene.add(saw);
  const path = new THREE.CatmullRomCurve3([V(Q.x, 0, Q.z + 0.36), V(Q.x + 0.55, 0, Q.z + 0.45), V(3.05, 0, 0.55), V(2.95, 0, -0.15), V(PILE.x, 0, PILE.z + 0.62)]);
  const LEN = path.getLength();
  const top6 = PILE.clone().add(V(0.0, IG.T / 2 + 2 * (IG.T + 0.004), 0.5 * (IG.P + 0.02)));
  const c = cam(40);
  return {
    scene, camera: c,
    update(t, T) {
      setClip(null);
      const w = range(t, 0.05, 1.3);
      const d = LEN * smooth(w);
      const u = path.getUtoTmapping(0, d);
      const p = path.getPointAt(Math.min(0.999, d / LEN));
      const tg = path.getTangentAt(Math.min(0.999, d / LEN));
      h.root.position.copy(p);
      h.root.rotation.y = Math.atan2(tg.x, tg.z);
      const ph = d / STRIDE * TAU;
      const wp = walkPose(ph, 0.3 * Math.min(1, w * 6) * (1 - smooth(range(t, 1.2, 1.35))), true);
      const down = easeInOut(range(t, 1.3, 1.68));
      const L = legs(-0.55 * down, 0.9 * down, 0.08);
      const pose = down > 0 ? { ...STAND, ...L } : { ...STAND, ...wp };
      h.setPose({ ...pose, spine: [-0.06 + 0.45 * down, 0, 0], chest: [-0.04 + idle(t), 0, 0], neck: [0.12 + 0.2 * down, 0, 0], head: [0.1, 0, 0] });
      void u;
      // block held in front of the chest; at the end laid flat on top of the stack
      h.root.updateMatrixWorld(true);
      const held = h.root.localToWorld(V(0, 1.02, 0.36));
      const qHeld = h.root.quaternion.clone();
      slab.position.copy(held).lerp(top6, down);
      slab.quaternion.copy(qHeld).slerp(qFlat, down);
      holdBlock(h, slab, { spread: 0.5 });
      const k = easeInOut(range(t, 0, 1.7));
      place(c, [lerp(5.4, 5.6, k), lerp(1.9, 2.1, k), lerp(2.6, 0.8, k)], [lerp(2.8, 2.75, k), 0.6, lerp(0.55, -0.35, k)]);
      return res({ shadowCenter: [2.7, 0, 0] });
    },
  };
}

// 3a. top view: marking the circle with a cord tied to a stake
const RING_A0 = -0.38;
const ringNow = T => RING_A0 + TAU * lerp(0.78, 1.0, smooth(range(T, 10.0, 11.95)));
function topCam(c, t, k0 = 0) {
  const k = easeInOut(k0);
  c.up.set(1, 0, 0);
  c.position.set(lerp(-0.45, -0.35, k), lerp(9.6, 9.0, k), 0.05);
  c.lookAt(lerp(-0.4, -0.3, k), 0, 0);
}
function sCircle({ makeStage }) {
  const S = igScene(makeStage, { shadowSize: 4.2, sunDir: [-3, 8, 4] });
  const h = person(); S.scene.add(h.root);
  const saw = withSaw(h, 'r');
  const sk = stake(); S.scene.add(sk);
  const cd = cord(); S.scene.add(cd);
  const gr = groove(RW); S.scene.add(gr);
  const c = cam(52);
  return {
    scene: S.scene, camera: c,
    update(t, T) {
      setClip(null);
      applyIg(S.ig, T);
      const th = ringNow(T);
      gr.set(RING_A0, th);
      // walk outside the line, tangent to the circle, saw tip on the line
      const RWALK = RW + 0.42;
      const dist = (th - RING_A0) * RWALK;
      h.root.position.set(Math.cos(th - 0.12) * RWALK, 0, Math.sin(th - 0.12) * RWALK);
      h.root.rotation.y = -(th - 0.12);
      const moving = 1 - smooth(range(T, 11.8, 12.0));
      const wp = walkPose(dist / STRIDE * TAU, 0.3 * moving);
      h.setPose({ ...STAND, ...wp, spine: [0.45, 0, 0], chest: [0.15, 0, 0], neck: [0.1, 0, 0], head: [0.2, 0, 0] });
      const tip = V(Math.cos(th) * RW, 0.0, Math.sin(th) * RW);
      const grip = tip.clone().add(V(Math.cos(th) * 0.18, 0.5, Math.sin(th) * 0.18)).addScaledVector(V(-Math.sin(th), 0, Math.cos(th)), -0.15);
      reachTo(h, 'r', grip, { hint: tip.clone().sub(grip).normalize() });
      cd.set(V(0, 0.22, 0), tip.clone().add(V(0, 0.02, 0)));
      topCam(c, t, range(T, 10.0, 14.55));
      return res({ shadowCenter: [0.3, 0, 0] });
    },
  };
}
// 3b. top view: the first row is set on the circle
function sFirstRow({ makeStage }) {
  const S = igScene(makeStage, { shadowSize: 4.2, sunDir: [-3, 8, 4] });
  const h = person(); S.scene.add(h.root);
  const sk = stake(); S.scene.add(sk);
  const gr = groove(RW); gr.set(RING_A0, RING_A0 + TAU); S.scene.add(gr);
  const it0 = S.ig.userData.items[0];
  const saw = snowSaw(); saw.position.set(2.0, 0.012, -1.65); saw.rotation.set(Math.PI / 2, 0, 0.4); S.scene.add(saw);
  const c = cam(52);
  const th0 = ringNow(12.0) - 0.12, P0 = V(Math.cos(th0) * (RW + 0.42), 0, Math.sin(th0) * (RW + 0.42));
  const b0 = PL.blocks[0], tm = (b0.th0 + b0.th1) / 2;
  const P1 = V(Math.cos(tm) * (RW + 0.55), 0, Math.sin(tm) * (RW + 0.55));
  return {
    scene: S.scene, camera: c,
    update(t, T) {
      setClip(null);
      applyIg(S.ig, T, { 0: true });
      S.pile.children[5].visible = T < 12.25;
      // pick the top block of the stack, step to the circle, set it down
      const pick = easeInOut(range(T, 12.05, 12.3)), walk = smooth(range(T, 12.3, 12.75)), set = easeInOut(range(T, 12.72, 13.05));
      const pos = P0.clone().lerp(P1, walk);
      h.root.position.copy(pos);
      const face0 = Math.atan2(PILE.x - P0.x, PILE.z - P0.z), face1 = Math.atan2(-P1.x, -P1.z);
      h.root.rotation.y = lerp(face0, face1, smooth(range(T, 12.28, 12.6)));
      const bend = T < 12.3 ? pick : 1 - smooth(range(T, 12.3, 12.45));
      const L = legs(-0.7 * Math.max(bend, set), 1.1 * Math.max(bend, set), 0.1);
      const wp = walkPose(walk * 0.9 / STRIDE * TAU, 0.25 * Math.sin(walk * Math.PI), true);
      const lowered = Math.max(bend, set);
      h.setPose({ ...STAND, ...(walk > 0 && walk < 1 ? wp : L), spine: [0.4 * lowered, 0, 0], chest: [0.15 * lowered, 0, 0], neck: [0.2, 0, 0] });
      // block 0: on the stack -> in the hands -> on the circle
      it0.g.visible = T >= 12.25;
      if (T >= 12.25 && T < 13.05) {
        h.root.updateMatrixWorld(true);
        const held = h.root.localToWorld(V(0, lerp(0.95, 0.75, set), 0.4));
        const q = h.root.quaternion.clone();
        it0.g.position.copy(held).lerp(b0.frame.pos, set);
        it0.g.quaternion.copy(q).slerp(b0.frame.quat, set);
        holdBlock(h, it0.g, { spread: 0.5 });
      } else if (T >= 13.05) {
        it0.g.position.copy(b0.frame.pos); it0.g.quaternion.copy(b0.frame.quat);
        // watches the rest arrive
        const li = landing(T, 1, PL.nRing);
        if (li >= 0) headLook(h, PL.blocks[li].frame.pos, 0.8);
      } else {
        const top = PILE.clone().add(V(0, IG.T / 2 + 2 * (IG.T + 0.004), 0.5 * (IG.P + 0.02)));
        it0.g.position.copy(top); it0.g.quaternion.copy(qFlat);
        if (pick > 0.6) holdBlock(h, it0.g, { spread: 0.5 });
      }
      topCam(c, t, range(T, 10.0, 14.55));
      return res({ shadowCenter: [0.3, 0, 0] });
    },
  };
}

// 4a. the ramp: the top of the first row is sawn off on a slope that rises once around
function sRampCut({ makeStage }) {
  const S = igScene(makeStage, { shadowSize: 3.2, sunDir: [-3, 7, 5] });
  const h = person(); S.scene.add(h.root);
  const saw = withSaw(h, 'l');
  const rg = rampGuide(); S.scene.add(rg);
  const cr = crumbs(40, { seed: 12, speed: 0.5, dir: V(0, 1, 0), life: 0.6 }); S.scene.add(cr);
  const c = cam(40);
  return {
    scene: S.scene, camera: c,
    update(t, T) {
      setClip(null);
      applyIg(S.ig, T);
      rg.set(smooth(range(T, 14.6, 15.4)), 0.9);
      const th = Math.max(0.12, thCut(T));
      // builder walks inside the ring, facing along it; saw in the outer (left) hand on the cut line
      const RIN = RW - 0.5;
      const dist = th * RIN;
      h.root.position.set(Math.cos(th - 0.28) * RIN, 0, Math.sin(th - 0.28) * RIN);
      h.root.rotation.y = -(th - 0.28);
      const moving = range(T, CUT0, CUT0 + 0.2) * (1 - range(T, CUT1 - 0.15, CUT1));
      const wp = walkPose(dist / (STRIDE * 0.7) * TAU, 0.22 * moving);
      const L = legs(-0.45, 0.75, 0.1);
      h.setPose({ ...STAND, ...wp, lHip: [wp.lHip[0] - 0.45, 0, 0.1], rHip: [wp.rHip[0] - 0.45, 0, -0.1], lKn: [wp.lKn[0] + 0.7, 0, 0], rKn: [wp.rKn[0] + 0.7, 0, 0], lAn: [wp.lAn[0] - 0.2, 0, -0.1], rAn: [wp.rAn[0] - 0.2, 0, 0.1], drop: L.drop + wp.drop, spine: [0.5, 0.1, 0], chest: [0.2, 0.15, 0], neck: [0.1, -0.35, 0], head: [0.25, -0.2, 0] });
      const pl = PL;
      const cutP = wallPoint(th, pl.ramp(th) + 0.02, IG.T / 2);
      const tng = V(-Math.sin(th), 0, Math.cos(th));
      const slope = V(0, IG.P / (TAU * RW), 0);
      const stroke = Math.sin(T * 11) * 0.07;
      const grip = cutP.clone().addScaledVector(tng, -0.3 + stroke).add(V(0, 0.16, 0)).addScaledVector(wallNormal(th, 0), -0.02);
      reachTo(h, 'l', grip, { hint: tng.clone().add(slope).normalize(), pole: h.root.localToWorld(V(1, 0.6, -0.2)) });
      reachTo(h, 'r', h.root.localToWorld(V(-0.14, 0.62, 0.32)), { hint: V(0, -1, 0) });
      cr.position.copy(cutP); cr.update(((T * 3) % 1) * 0.6);
      const k = easeInOut(range(T, 14.55, 17.95));
      place(c, [lerp(2.9, 0.7, k), lerp(3.0, 2.9, k), lerp(5.2, 5.6, k)], [lerp(0.8, -0.2, k), 0.05, lerp(0.6, 0.8, k)]);
      return res({ shadowCenter: [0, 0, 0.5] });
    },
  };
}
// builder inside, turning to face a slot; arms up to the landing block
function builderAt(h, T, target, t, { reach = true, base = 0 } = {}) {
  const ang = target ? Math.atan2(target.x - h.root.position.x, target.z - h.root.position.z) : base;
  return ang;
}
// 4b. the dashed guide shows the spiral; the next blocks follow the ramp
function sSpiral({ makeStage }) {
  const S = igScene(makeStage, { shadowSize: 4, sunDir: [-3, 7, 5] });
  const h = person(); h.root.position.set(-0.2, 0, -0.15); S.scene.add(h.root);
  const gs = guideSpiral(0, TAU * 1.85); S.scene.add(gs);
  const c = cam(40);
  // smoothed facing so the turns stay calm
  const yawAt = (T) => {
    let acc = 0, n = 0;
    for (let d = -0.35; d <= 0.35; d += 0.07) { const li = landing(T + d, spi(0), spi(10)); const b = li >= 0 ? PL.blocks[li] : PL.blocks[spi(0)]; acc += (b.th0 + b.th1) / 2; n++; }
    return -acc / n + Math.PI / 2;
  };
  return {
    scene: S.scene, camera: c,
    update(t, T) {
      setClip(null);
      applyIg(S.ig, T);
      gs.set(smooth(range(T, 18.05, 19.3)), 0.9);
      const yaw = yawAt(T);
      h.root.rotation.y = yaw;
      const ts = turnSteps(yaw);
      h.setPose({ ...STAND, ...ts, spine: [0.2, 0, 0], chest: [0.05 + idle(t), 0, 0], neck: [0.15, 0, 0] });
      const li = landing(T, spi(0), spi(10));
      if (li >= 0) {
        const s = SCH[li], k = clamp((T - s.t0) / (s.t1 - s.t0));
        const it = S.ig.userData.items[li];
        if (k > 0.55 && k < 1.05) holdBlock(h, it.g, { spread: 0.5 }); else { reachTo(h, 'l', h.root.localToWorld(V(0.25, 1.05, 0.35)), { hint: V(0, 0, 1).applyQuaternion(h.root.quaternion) }); reachTo(h, 'r', h.root.localToWorld(V(-0.25, 1.05, 0.35)), { hint: V(0, 0, 1).applyQuaternion(h.root.quaternion) }); }
        headLook(h, it.g.position, 0.7);
      }
      const k = easeInOut(range(T, 17.95, 21.0));
      place(c, [lerp(3.4, 2.6, k), lerp(2.7, 3.3, k), lerp(4.8, 4.9, k)], [0.0, 0.15, 0.0]);
      return res({ shadowCenter: [0, 0, 0] });
    },
  };
}

// 5a. one block, adjusted and leaned inwards (cutaway shows it in profile)
function sTilt({ makeStage }) {
  const S = igScene(makeStage, { shadowSize: 2.6, sunDir: [-3, 7, 5] });
  const h = person(); S.scene.add(h.root);
  const it = S.ig.userData.items[spi(J5)];
  const b = it.b;
  // tilt: how far this block leans in from vertical (about its own x axis)
  const m = V(0, 1, 0).applyQuaternion(b.frame.quat);
  const beta = Math.acos(clamp(m.y, -1, 1));
  const pivotL = V(0, -IG.P / 2, -IG.T / 2);       // inner bottom edge, local
  const pivotW = pivotL.clone().applyQuaternion(b.frame.quat).add(b.frame.pos);
  const tng = V(1, 0, 0).applyQuaternion(b.frame.quat);
  const nrm = b.frame.normal.clone();
  // small curved arrow over the top of the block: outward -> inward
  const topC = wallPoint((b.th0 + b.th1) / 2, b.smid + IG.P / 2 + 0.03, IG.T / 2).addScaledVector(tng, -0.18);
  const arr = arrow3D([topC.clone().addScaledVector(nrm, 0.28).add(V(0, 0.1, 0)), topC.clone().addScaledVector(nrm, 0.05).add(V(0, 0.2, 0)), topC.clone().addScaledVector(nrm, -0.22).add(V(0, 0.12, 0))], { color: 0xffc93a, r: 0.011, head: 0.05 });
  S.scene.add(arr);
  const thm = (b.th0 + b.th1) / 2;
  const standAt = wallPoint(thm, 0, -0.62); standAt.y = 0;
  standAt.addScaledVector(tng, 0.05);
  const c = cam(42);
  return {
    scene: S.scene, camera: c,
    update(t, T) {
      setClip([clipZ]);
      applyIg(S.ig, T, { [spi(J5)]: true });
      const lean = smooth(range(T, 21.55, 22.95));           // 0 = upright, 1 = leaning in like the wall
      const seat = easeInOut(range(T, 22.9, 23.45));
      const a = beta * (1 - lean);
      const q = new THREE.Quaternion().setFromAxisAngle(tng, a);   // rotate about the tangent through the pivot
      it.g.visible = true;
      it.g.quaternion.copy(q).multiply(b.frame.quat);
      const off = b.frame.pos.clone().sub(pivotW).applyQuaternion(q);
      it.g.position.copy(pivotW).add(off).addScaledVector(UP, 0.035 * (1 - seat));
      arr.set(range(T, 21.6, 22.5), 1 - range(T, 23.3, 23.7));
      // builder inside, facing the block, both mittens on the inner face
      h.root.position.copy(standAt);
      h.root.rotation.y = Math.atan2(b.frame.pos.x - standAt.x, b.frame.pos.z - standAt.z);
      const tap = T > 23.5 ? Math.max(0, Math.sin((T - 23.5) * 14)) * (1 - range(T, 23.5, 23.95)) : 0;
      h.setPose({ ...STAND, ...legs(-0.3, 0.5, 0.12), spine: [0.25, 0, 0], chest: [0.1 + idle(t), 0, 0], neck: [0.2, 0, 0], head: [0.15, 0, 0] });
      it.g.updateMatrixWorld(true);
      const pA = it.g.localToWorld(V(-0.06, 0.04, -IG.T / 2 - 0.045));
      const pB = it.g.localToWorld(V(-0.22, 0.1 + 0.05 * tap, -IG.T / 2 - 0.045 - 0.04 * tap));
      const into = nrm.clone();
      reachTo(h, 'l', pA, { hint: into });
      reachTo(h, 'r', pB, { hint: into });
      headLook(h, pA, 0.8);
      const k = easeInOut(range(T, 21.0, 24.0));
      const nh = V(nrm.x, 0, nrm.z).normalize();
      const cpos = b.frame.pos.clone().addScaledVector(nh, lerp(1.7, 1.5, k)).add(V(0, lerp(0.75, 0.6, k), lerp(3.3, 2.9, k)));
      const look = b.frame.pos.clone().addScaledVector(nh, -0.4).add(V(0, 0.15, -0.1));
      place(c, [cpos.x, cpos.y, cpos.z], [look.x, look.y, look.z]);
      return res({ shadowCenter: [b.frame.pos.x, 0, 0] });
    },
  };
}
// 5b. sped up: the spiral climbs, every block leaning a little more, until a dome forms
function sDome({ makeStage }) {
  const S = igScene(makeStage, { shadowSize: 4.2, sunDir: [-3, 7, 5] });
  const h = person(); h.root.position.set(0.1, 0, -0.35); S.scene.add(h.root);
  const c = cam(40);
  return {
    scene: S.scene, camera: c,
    update(t, T) {
      setClip([clipZ]);
      applyIg(S.ig, T);
      const yaw = -0.6 - 0.35 * t;           // slow, steady turn
      h.root.rotation.y = yaw;
      h.setPose({ ...STAND, ...turnSteps(yaw), spine: [-0.05, 0, 0], chest: [-0.05 + idle(t), 0, 0], neck: [-0.35, 0, 0], head: [-0.2, 0, 0] });
      const li = landing(T, spi(J5 + 1), KEY);
      const tgt = li >= 0 ? S.ig.userData.items[li].g.position.clone() : V(0, 1.8, 0);
      const fw = V(Math.sin(yaw), 0, Math.cos(yaw));
      const hp = V(0.1, 0, -0.35).addScaledVector(fw, 0.32);
      reachTo(h, 'l', hp.clone().add(V(0, 1.75, 0)).addScaledVector(V(fw.z, 0, -fw.x), 0.18), { hint: UP });
      reachTo(h, 'r', hp.clone().add(V(0, 1.75, 0)).addScaledVector(V(fw.z, 0, -fw.x), -0.18), { hint: UP });
      void tgt;
      const k = easeInOut(range(T, 24.0, 27.4));
      place(c, [lerp(0.6, 0.2, k), lerp(1.7, 2.3, k), lerp(5.8, 7.2, k)], [0.1, lerp(0.9, 1.0, k), 0]);
      return res({ shadowCenter: [0, 0, 0] });
    },
  };
}

// 6a. the last opening: a block cut to measure, trimmed from inside
function sKeyIn({ makeStage }) {
  const S = igScene(makeStage, { shadowSize: 3, sunDir: [-3, 7, 5] });
  const h = person(); h.root.position.set(-0.1, 0, -0.2); h.root.rotation.y = Math.PI * 0.75; S.scene.add(h.root);
  const saw = withSaw(h, 'r');
  const cr = crumbs(60, { seed: 21, speed: 0.15, gravity: -3, dir: V(0, -1, 0), spread: 0.6, life: 1.3 }); S.scene.add(cr);
  const keyIt = S.ig.userData.items[KEY];
  const holeY = wallPoint(0, S_TOTAL - IG.hole, 0).y;
  const RH = wallRadius(S_TOTAL - IG.hole) - 0.04;
  const c = cam(36);
  return {
    scene: S.scene, camera: c,
    update(t, T) {
      setClip([clipZ]);
      applyIg(S.ig, T);
      h.setPose({ ...STAND, ...legs(-0.05, 0.1, 0.13), spine: [-0.12, 0, 0], chest: [-0.15 + idle(t), 0, 0], neck: [-0.45, 0, 0], head: [-0.3, 0, 0] });
      // left mitten steadies the block; the saw follows the edge of the opening
      const a = lerp(-2.2, -0.95, smooth(range(T, 28.0, 29.6))) + Math.sin(T * 12) * 0.05;
      const edge = V(Math.cos(a) * RH, holeY + 0.02, Math.sin(a) * RH - 0.0);
      reachTo(h, 'l', V(-0.12, holeY - 0.06, -0.12), { hint: UP });
      reachTo(h, 'r', edge.clone().add(V(0, -0.38, 0.05)), { hint: UP.clone().add(V(0, 0, -0.2)).normalize(), pole: h.root.localToWorld(V(-0.9, 1.2, 0.3)) });
      cr.position.copy(edge); cr.update(((T - 27.9) % 0.9));
      cr.visible = T > 27.95 && T < 29.65;
      const k = easeInOut(range(T, 27.4, 29.9));
      place(c, [lerp(2.3, 1.9, k), lerp(0.95, 1.05, k), lerp(2.6, 2.2, k)], [-0.15, lerp(1.4, 1.55, k), -0.2]);
      void keyIt;
      return res({ shadowCenter: [0, 0, 0] });
    },
  };
}
// 6b. slow motion: the key block settles into the top
function sKeyOut({ makeStage }) {
  const S = igScene(makeStage, { shadowSize: 2.2, sunDir: [-3, 7, 5] });
  const cr = crumbs(36, { seed: 31, speed: 0.22, gravity: -1.2, dir: V(0, 0.4, 0), spread: 1.3, life: 1.4, size: 0.01 }); S.scene.add(cr);
  const top = wallPoint(0, S_TOTAL, IG.T);
  const c = cam(32);
  return {
    scene: S.scene, camera: c,
    update(t, T) {
      setClip(null);
      applyIg(S.ig, T);
      cr.position.copy(top).add(V(0.25, -0.05, 0.2)); cr.update(T - 31.15);
      const k = easeInOut(range(T, 29.9, 31.5));
      place(c, [lerp(2.6, 2.2, k), lerp(2.75, 2.6, k), lerp(3.0, 2.6, k)], [0, 1.75, 0]);
      return res({ shadowCenter: [0, 1, 0] });
    },
  };
}

// 7a. the joints get packed with snow
function sChink({ makeStage }) {
  const S = igScene(makeStage, { shadowSize: 2.6, sunDir: [-3, 7, 5] });
  const h = person(); S.scene.add(h.root);
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 2), snowMats().fill); ball.castShadow = true; S.scene.add(ball);
  const az0 = Math.PI / 2 - 0.6;
  const c = cam(36);
  return {
    scene: S.scene, camera: c,
    update(t, T) {
      setClip(null);
      applyIg(S.ig, T);
      const f = FILL(T), az = az0 + f * TAU + 0.02;
      const st = wallPoint(az + 0.05, 0, IG.T + 0.48); st.y = 0;
      h.root.position.copy(st);
      h.root.rotation.y = Math.atan2(-st.x, -st.z);
      h.setPose({ ...STAND, ...legs(-0.15, 0.25, 0.14), spine: [0.15, 0.1, 0], chest: [0.05 + idle(t), 0.1, 0], neck: [0.1, -0.1, 0] });
      // the right mitten rubs snow up and down the joints at the fill front
      const sh = 0.45 + 0.42 * (0.5 + 0.5 * Math.sin(T * 5.5));
      const p = wallPoint(az, sh, IG.T + 0.05);
      reachTo(h, 'r', p, { hint: wallNormal(az, sh).negate() });
      reachTo(h, 'l', wallPoint(az + 0.22, 0.75, IG.T + 0.05), { hint: wallNormal(az + 0.2, 0.75).negate() });
      h.root.updateMatrixWorld(true);
      ball.position.copy(h.j.rWr.localToWorld(V(0, -0.07, 0.05)));
      ball.scale.setScalar(1 - 0.5 * range(T, 31.6, 33.6));
      headLook(h, p, 0.7);
      const look = wallPoint(az0 + 0.12, 0.8, IG.T);
      const k = easeInOut(range(T, 31.5, 33.62));
      const cp = wallPoint(az0 - 0.55, 1.15, IG.T + lerp(3.4, 3.0, k));
      place(c, [cp.x, cp.y, cp.z], [look.x, look.y, look.z]);
      return res({ shadowCenter: [look.x, 0, look.z] });
    },
  };
}
// 7b. the vent near the top stays open: air goes in and out
function sVent({ makeStage }) {
  const S = igScene(makeStage, { shadowSize: 3, sunDir: [-3, 7, 5] });
  const v = PL.vent, vc = v.ventCenter.clone(), n = v.ventNormal.clone();
  const tng = V(-n.z, 0, n.x).normalize();
  const out = arrow3D([vc.clone().addScaledVector(n, -0.05), vc.clone().addScaledVector(n, 0.3).add(V(0, 0.1, 0)), vc.clone().addScaledVector(n, 0.55).add(V(0, 0.45, 0))], { color: 0xffe6cc, r: 0.013, head: 0.06, opacity: 0.85 });
  const inn = arrow3D([vc.clone().addScaledVector(n, 0.62).addScaledVector(tng, 0.32).add(V(0, -0.12, 0)), vc.clone().addScaledVector(n, 0.3).addScaledVector(tng, 0.15).add(V(0, -0.05, 0)), vc.clone().addScaledVector(n, 0.02).addScaledVector(tng, 0.05)], { color: 0x9fd8ff, r: 0.013, head: 0.06, opacity: 0.85 });
  S.scene.add(out, inn);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.008, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffc93a, transparent: true, toneMapped: false }));
  ring.position.copy(vc).addScaledVector(n, IG.T / 2 + 0.03); ring.lookAt(ring.position.clone().add(n)); S.scene.add(ring);
  const c = cam(36);
  return {
    scene: S.scene, camera: c,
    update(t, T) {
      setClip(null);
      applyIg(S.ig, T);
      const a = smooth(range(T, 34.3, 34.8));
      ring.material.opacity = a * (0.75 + 0.25 * Math.sin(T * 5)); ring.visible = a > 0.01;
      const ph = (T - 34.6) * 0.9;
      out.set(clamp(ph % 1.4), a); inn.set(clamp((ph + 0.5) % 1.4), a);
      const k = easeInOut(range(T, 33.62, 36.5));
      const cp = vc.clone().addScaledVector(n, lerp(3.6, 2.0, k)).add(V(0, lerp(-0.6, 0.15, k), 0)).addScaledVector(tng, lerp(0.8, 0.45, k));
      place(c, [cp.x, cp.y, cp.z], [vc.x, vc.y - lerp(0.25, 0.12, k), vc.z]);
      return res({ shadowCenter: [vc.x * 0.5, 0, vc.z * 0.5] });
    },
  };
}

// 8. entrance tunnel (low) and the raised sleeping platform, in a side section
function sEntrance({ makeStage }) {
  const S = igScene(makeStage, { door: true, shadowSize: 3.6, sunDir: [3, 7, 4] });
  const h = person(); S.scene.add(h.root);
  const ms = measure([0.35, TUN.floor, 0.2], [0.35, 0.06, 0.2], 0xffffff); S.scene.add(ms);
  const c = cam(38);
  return {
    scene: S.scene, camera: c,
    update(t, T) {
      setClip([clipX]);
      applyIg(S.ig, T);
      // fur unrolls, then the sleeping bag is laid on it
      const fu = easeOut(range(T, 38.75, 39.4));
      S.fur.scale.set(Math.max(0.01, fu), 1, 1); S.fur.position.x = -0.85 * (1 - fu); S.fur.visible = fu > 0.01;
      const bg = easeInOut(range(T, 39.3, 39.95));
      S.bag.visible = T > 39.3; S.bag.position.y = 0.04 + 0.35 * (1 - bg);
      ms.set(smooth(range(T, 40.0, 40.4)));
      // builder stands in the entrance pit, then turns to the platform
      h.root.position.set(-0.55, TUN.floor, 0.95);
      const turn = smooth(range(T, 38.5, 39.2));
      h.root.rotation.y = lerp(0.2, Math.PI + 0.25, turn);
      h.setPose({ ...STAND, ...turnSteps(turn * Math.PI), chest: [idle(t), 0, 0], neck: [0.1, 0, 0] });
      const k = easeInOut(range(T, 36.5, 41.35));
      place(c, [lerp(6.6, 5.4, k), lerp(0.75, 0.85, k), lerp(2.0, 0.9, k)], [0, lerp(0.0, 0.1, k), lerp(1.5, 0.6, k)]);
      return res({ shadowCenter: [0, 0, 1] });
    },
  };
}

// 9a. close to the wall: the snow holds countless tiny pockets of air
function sAir({ makeStage }) {
  const S = igScene(makeStage, { door: true, shadowSize: 2.4, sunDir: [-3, 7, 5] });
  const lens = magnifier(0.42); S.scene.add(lens);
  const line = arrow3D([V(0, 0, 0), V(0, 0, 0.01)], { color: 0xffffff, r: 0.003, head: 0.001 });
  const az = 0.15, wp = wallPoint(az, 0.95, IG.T + 0.01), n = wallNormal(az, 0.95);
  const c = cam(34);
  return {
    scene: S.scene, camera: c,
    update(t, T) {
      setClip(null);
      applyIg(S.ig, 99);
      const k = easeInOut(range(T, 41.35, 43.2));
      const cp = wp.clone().addScaledVector(n, lerp(2.4, 0.75, k)).add(V(0, lerp(0.35, 0.1, k), 0)).addScaledVector(V(-n.z, 0, n.x), lerp(0.4, 0.1, k));
      place(c, [cp.x, cp.y, cp.z], [wp.x, wp.y - 0.05, wp.z]);
      c.updateMatrixWorld(true);
      // the lens floats in front of the camera, above the captions
      const a = smooth(range(T, 42.75, 43.2));
      const lp = c.localToWorld(V(0, 0.07, -0.62));
      lens.position.copy(lp); lens.quaternion.copy(c.quaternion);
      lens.scale.setScalar(0.6 + 0.4 * a);
      lens.draw(T, smooth(range(T, 44.25, 45.6)), a);
      return res({ shadowCenter: [wp.x, 0, wp.z] });
    },
  };
}
// 9b. body heat stays in, wind stays out
function sHeat({ makeStage }) {
  const S = igScene(makeStage, { door: true, shadowSize: 4, sunDir: [-3, 7, 5] });
  const h = person(); h.root.position.copy(SIT_AT); S.scene.add(h.root);
  const glow = glowSprite(0xff9a50, 1.3); glow.position.set(0.05, 0.62, 0.15); S.scene.add(glow);
  const warm = new THREE.PointLight(0xffc89a, 0, 2); warm.position.set(0, 0.9, 0.2); S.scene.add(warm);
  const sf = snowfall(1800, { box: [16, 7, 10], center: [0, 0, -2], wind: [2.6, -1.0, 0.0], size: 0.045 }); S.scene.add(sf);
  // warm arrows from the body towards the wall (stop at the wall), with tiny faint ones outside
  const heat = [];
  for (const [a, y] of [[2.6, 0.75], [2.2, 1.3], [1.6, 1.6], [0.95, 1.3], [0.45, 0.75]]) {
    const dx = Math.cos(a), dy = (y - 0.8) / 1.2;
    const from = V(0.05 + dx * 0.32, 0.85 + dy * 0.25, -0.02);
    const p = V(dx * 1.1, y, -0.02);
    const sIn = wallPoint(Math.atan2(p.z, p.x), 0, 0);
    // scale to land on the inner wall
    const dir = p.clone().sub(from).normalize();
    let tHit = 0; for (let k = 0; k < 300; k++) { const q = from.clone().addScaledVector(dir, k * 0.01); const r = Math.hypot(q.x, q.z), y2 = q.y; if ((r / IG.Ri) ** 2 + (y2 / IG.Hi) ** 2 > 0.96) { tHit = k * 0.01; break; } }
    const end = from.clone().addScaledVector(dir, tHit);
    const ar = arrow3D([from, from.clone().lerp(end, 0.5).add(V(0, 0.03, 0)), end], { color: 0xff9b3d, r: 0.014, head: 0.06, opacity: 0.9 });
    const end2 = from.clone().addScaledVector(dir, tHit + IG.T + 0.05), end3 = end2.clone().addScaledVector(dir, 0.13);
    const tiny = arrow3D([end2, end3], { color: 0xffb36b, r: 0.006, head: 0.03, opacity: 0.45 });
    S.scene.add(ar, tiny); heat.push([ar, tiny]); void sIn;
  }
  // wind outside: from the left, around the dome
  const wind = [];
  for (const [y, z, bend] of [[0.5, -0.4, 0.9], [1.2, -0.6, 1.0], [1.9, -0.5, 0.9], [2.6, -0.4, 0.5]]) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const x = -4.2 + i * 0.33;
      const r = Math.hypot(x, z), inside = (r / (IG.Ri + IG.T + 0.25)) ** 2 + (y / (IG.Hi + IG.T + 0.25)) ** 2;
      const lift = inside < 1.6 ? bend * Math.max(0, 1.6 - inside) * 0.55 : 0;
      pts.push(V(x, y + lift, z));
    }
    const ar = arrow3D(pts, { color: 0xe8f4ff, r: 0.012, head: 0.07, opacity: 0.8 }); S.scene.add(ar); wind.push(ar);
  }
  const c = cam(38);
  return {
    scene: S.scene, camera: c,
    update(t, T) {
      setClip([clipZ]);
      applyIg(S.ig, 99);
      sitPose(h, t); headLook(h, V(0.8, 1.0, 4), 0.4);
      sf.update(T, 1);
      const gA = smooth(range(T, 46.0, 46.8));
      glow.material.opacity = 0.32 * gA * (0.9 + 0.1 * Math.sin(T * 3)); warm.intensity = 0.25 * gA;
      heat.forEach(([ar, tiny], i) => { const k = range(T, 46.3 + i * 0.12, 47.4 + i * 0.12); ar.set(k, 1); tiny.set(range(T, 47.7, 48.3), 1); });
      wind.forEach((ar, i) => ar.set(range(T, 48.55 + i * 0.1, 49.6 + i * 0.1), 1));
      const k = easeInOut(range(T, 45.95, 50.0));
      place(c, [lerp(0.3, 0.2, k), lerp(1.35, 1.5, k), lerp(5.6, 6.8, k)], [lerp(0.05, -0.2, k), lerp(0.95, 1.05, k), 0]);
      return res({ shadowCenter: [0, 0, 0] });
    },
  };
}

// 10a. even surrounded by snow, it is warmer inside than out
function sWarmer({ makeStage }) {
  const S = igScene(makeStage, { door: true, shadowSize: 5, sunDir: [-3, 7, 5] });
  const h = person(); h.root.position.copy(SIT_AT); S.scene.add(h.root);
  const glow = glowSprite(0xff9a50, 1.5); glow.position.set(0.05, 0.75, 0.1); S.scene.add(glow);
  const warm = new THREE.PointLight(0xffc89a, 0.25, 2); warm.position.set(0, 1.0, 0.2); S.scene.add(warm);
  const sf = snowfall(2600, { box: [18, 7, 14], center: [0, 0, -1], wind: [3.0, -1.2, 0.3], size: 0.05 }); S.scene.add(sf);
  const plane = new THREE.Plane(V(0, 0, -1), 0);
  const c = cam(40);
  return {
    scene: S.scene, camera: c,
    update(t, T) {
      setClip([plane]);
      applyIg(S.ig, 99);
      sitPose(h, t); headLook(h, V(0.6, 1.0, 4), 0.5);
      sf.update(T, 1);
      glow.material.opacity = 0.3 * (0.92 + 0.08 * Math.sin(T * 2.6));
      const k = easeInOut(range(T, 50.0, 54.9));
      place(c, [lerp(1.6, 3.4, k), lerp(1.6, 2.3, k), lerp(6.4, 8.2, k)], [0.1, lerp(1.0, 1.05, k), 0]);
      return res({ shadowCenter: [0, 0, 0] });
    },
  };
}
// 10b. the finished igloo, the builder at the entrance
function sEnd({ makeStage }) {
  const S = igScene(makeStage, { door: true, shadowSize: 5, sunDir: [-4, 7, 5] });
  const h = person(); h.root.position.set(0.15, 0, 3.75); h.root.rotation.y = 0.1; S.scene.add(h.root);
  const sf = snowfall(1200, { box: [16, 7, 16], wind: [1.0, -0.8, 0.2], size: 0.04, opacity: 0.8 }); S.scene.add(sf);
  const saw = snowSaw(); S.scene.add(saw);
  const c = cam(38);
  return {
    scene: S.scene, camera: c,
    update(t, T) {
      setClip(null);
      applyIg(S.ig, 99);
      sf.update(T, 1);
      const nod = T > 57.6 ? Math.sin(range(T, 57.6, 58.4) * Math.PI) * 0.12 : 0;
      h.setPose({ ...STAND, chest: [idle(t), 0, 0], neck: [nod, 0, 0], head: [0.05, 0, 0], rSh: [0.0, 0, -0.18], rEl: [-0.2, 0, 0] });
      h.root.updateMatrixWorld(true);
      // saw held loosely in the left hand, pointing down
      reachTo(h, 'l', h.root.localToWorld(V(0.3, 0.72, 0.06)), { hint: V(0, -1, 0.1).normalize() });
      h.j.lWr.updateMatrixWorld(true);
      saw.position.copy(h.j.lWr.localToWorld(V(0, -0.075, 0.01)));
      saw.quaternion.copy(h.j.lWr.getWorldQuaternion(new THREE.Quaternion())).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)));
      const k = easeInOut(range(T, 54.9, DURATION));
      place(c, [lerp(1.9, 1.3, k), lerp(1.55, 1.4, k), lerp(9.2, 7.9, k)], [lerp(0.25, 0.15, k), lerp(1.05, 1.0, k), 0.9]);
      return res({ shadowCenter: [0, 0, 1] });
    },
  };
}

export const SHOTS = [
  { start: 0, end: 3.62, build: sHook },
  { start: 3.62, end: 6.4, build: sCutWide },
  { start: 6.4, end: 8.3, build: sCutClose },
  { start: 8.3, end: 10.0, build: sCarry },
  { start: 10.0, end: 12.0, build: sCircle },
  { start: 12.0, end: 14.55, build: sFirstRow },
  { start: 14.55, end: 17.95, build: sRampCut },
  { start: 17.95, end: 21.0, build: sSpiral },
  { start: 21.0, end: 24.0, build: sTilt },
  { start: 24.0, end: 27.4, build: sDome },
  { start: 27.4, end: 29.9, build: sKeyIn },
  { start: 29.9, end: 31.5, build: sKeyOut },
  { start: 31.5, end: 33.62, build: sChink },
  { start: 33.62, end: 36.5, build: sVent },
  { start: 36.5, end: 41.35, build: sEntrance },
  { start: 41.35, end: 45.95, build: sAir },
  { start: 45.95, end: 50.0, build: sHeat },
  { start: 50.0, end: 54.9, build: sWarmer },
  { start: 54.9, end: 99, build: sEnd },
];
