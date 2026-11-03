// ---------- shot list (seconds of the final video) ----------
const SHOTS = [];
const GROUND = 860;
const lucasCar = (x, face, o = {}) => Object.assign({ x, y: GROUND, s: 1, col: COL.lucas, stripe: true, roll: x, driver: driverFn(LUCAS, face, o.drv || {}) }, o);
function screen(ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); }
function fadeA(t, a, b, f = .3) { return Math.min(clamp((t - a) / f), clamp((b - t) / f)); }
function drawHUD(ctx, t, a = 1) {
  if (a <= 0) return; screen(ctx); ctx.save(); ctx.globalAlpha = a;
  rrect(ctx, 1500, 26, 384, 196, 20); ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  text(ctx, 'Painel da entrada', 1692, 56, 24, INK, INK, 0, 'Poppins', 700);
  lcd(ctx, 1522, 76, 340, dispAt(t), { flash: dispFlash(t) });
  ctx.restore();
}
function topCars(ctx, t, skip = {}) {
  for (const [i, c] of PARKED) carTop(ctx, SPOT_X(i), SPOT_Y, -Math.PI / 2, c);
  for (const k of ['d', 'e', 'c', 'lucas']) { if (skip[k]) continue; const s = carState(k, t); carTop(ctx, s.x, s.y, s.ang, CARS[k].col, { stripe: CARS[k].stripe, brake: s.brake && s.y > 300 && s.x > -200 && s.x < 2000 }); }
}
const SMART_ON = { maq: 1, gate: 1, disp: 1, ir: 1, us: 1, led: 1, ard: 1, wire: .35, num: 1 };
function titleCard(ctx, t, a, sub = true, y0 = 70) {
  if (a <= 0) return; screen(ctx); ctx.save(); ctx.globalAlpha = a;
  const y = y0 + (1 - easeOut(clamp(a))) * -30;
  ctx.font = '700 64px Poppins'; const w = Math.max(ctx.measureText('Estacionamento Inteligente com Arduino').width + 90, 900);
  rrect(ctx, W / 2 - w / 2, y, w, sub ? 168 : 110, 26); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
  text(ctx, 'Estacionamento Inteligente com Arduino', W / 2, y + 56, 64, '#1f4fa8', INK, 0, 'Poppins', 700);
  if (sub) text(ctx, 'Mundo SENAI', W / 2, y + 122, 44, INK, INK, 0, 'Poppins', 700);
  ctx.restore();
}
function moto(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ellipse(ctx, 0, 2, 110, 10); ctx.fillStyle = 'rgba(30,20,40,.22)'; ctx.fill();
  for (const wx of [-70, 70]) { circle(ctx, wx, -36, 36); fillStroke(ctx, '#2b2730', 6); circle(ctx, wx, -36, 14); fillStroke(ctx, '#cfd5dc', 4); }
  ctx.beginPath(); ctx.moveTo(-70, -36); ctx.lineTo(-20, -80); ctx.lineTo(40, -80); ctx.lineTo(70, -36); ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke();
  rrect(ctx, -40, -112, 90, 40, 18); fillStroke(ctx, '#2bb3a6', 5); rrect(ctx, -70, -100, 50, 18, 8); fillStroke(ctx, '#2b2730', 4);
  line(ctx, 50, -96, 72, -138, 7); line(ctx, 60, -138, 88, -138, 7);
  ctx.restore();
}

// ===== CENA 1 — uma situação comum =====
// 1a. Lucas dirigindo, tranquilo
SHOTS.push({ start: 0, end: 4.6, tr: 'fade', draw(ctx, lt, t) {
  const x = 250 + lt * 430; const hh = handheld(t, 2);
  const cam = { x: x + 260 + hh[0], y: 520 + hh[1], z: 1.02 + lt * .02 };
  street(ctx, t, cam);
  applyCam(ctx, cam, 1);
  carSide(ctx, lucasCar(x, { mouth: 'smile', look: [.5, 0], eyes: lt > 2.2 && lt < 2.35 ? 'happy' : 'normal' }, { bob: Math.sin(t * 9) * 1.5, drv: { headTilt: Math.sin(t * 4) * .06 } }));
  for (let k = 0; k < 3; k++) { const p = ((lt * .5 + k / 3) % 1); noteIcon(ctx, x + 30 + p * 120, 600 - p * 180, 1, Math.sin(p * Math.PI) * clamp(lt - .6)); }
} });
// 1b. fila na entrada
SHOTS.push({ start: 4.6, end: 8.4, tr: 'fade', draw(ctx, lt, t) {
  const cam = { x: 980 + lt * 10, y: 520, z: .84 + lt * .01 };
  street(ctx, t, cam);
  applyCam(ctx, cam, 1);
  oldEntrance(ctx, t, 1250); booth(ctx, 2000, 740);
  drawStick(ctx, C(ATTENDANT, { x: 1880, y: 750, s: 230, flip: -1, arms: { L: [.4, -.2], R: [1.6, -1.2] }, face: { mouth: 'flat', look: [-.5, 0] } }));
  const inch = k => Math.max(0, Math.sin((t - k) * 1.3)) * 6;
  const q = [[1560, COL.gray, '#2b2b2b'], [1080, COL.purple, '#c48b4a'], [600, COL.brown, '#555']];
  q.forEach(([qx, c, hair], k) => carSide(ctx, { x: qx + inch(k), y: GROUND, s: 1, col: c, brake: true, driver: driverFn(DRIVER(hair, '#5aa0e0'), { mouth: 'flat', look: [.6, 0] }) }));
  const x = kf(lt, [[0, -450], [1.7, 120, easeOut]]);
  const stopped = lt > 1.7; const surp = lt > 1.75;
  carSide(ctx, lucasCar(x, { mouth: surp ? (lt > 2.7 ? 'flat' : 'o') : 'smile', eyes: surp && lt < 2.7 ? 'wide' : 'normal', browUp: surp ? 1 : 0, look: [.6, 0] }, { tilt: stopped ? Math.sin((lt - 1.7) * 14) * Math.exp(-(lt - 1.7) * 5) * .02 : 0, brake: stopped }));
  exclaim(ctx, x + 40, 560, 90, fadeA(lt, 1.8, 2.8, .15));
  clockIcon(ctx, x + 40, 560, 50, t, 3, fadeA(lt, 2.9, 3.9, .2));
  for (let k = 0; k < 3; k++) clockIcon(ctx, q[k][0] + 30, 580, 36, t + k, 2, fadeA(lt, 2.3 + k * .2, 3.9, .2) * .9);
} });
// 1c. lá dentro: parece uma vaga... mas está ocupada
SHOTS.push({ start: 8.4, end: 12.2, tr: 'fade', draw(ctx, lt, t) {
  const x = kf(lt, [[0, 0], [2.4, 900, ease], [2.9, 900], [3.8, 1150, easeIn]]);
  const cam = { x: x + 380, y: 560, z: 1.0 };
  applyCam(ctx, cam, .1); sky(ctx); applyCam(ctx, cam, .3); cityStrip(ctx, -1500, 3500, 520, 11, .8);
  // far row of parked cars (parallax .85) with one "free" gap
  applyCam(ctx, cam, .85);
  ctx.fillStyle = '#7b8290'; ctx.fillRect(-2000, 560, 6000, 600); line(ctx, -2000, 560, 4000, 560, 5);
  const XB = 1240;
  for (const [dx, c] of [[-1600, COL.white], [-1240, COL.yellow], [-880, COL.gray], [-330, COL.pink], [330, COL.purple], [690, COL.brown], [1050, COL.gray], [1410, COL.white]]) carSide(ctx, { x: XB + dx, y: 740, s: .72, col: c, dir: (dx / 10) % 2 ? 1 : -1 });
  moto(ctx, XB, 740, .78);
  // foreground pillar (parallax 1.25) hides the motorbike at first
  applyCam(ctx, cam, 1.25);
  rrect(ctx, 1188 - 85, -400, 170, 1600, 10); fillStroke(ctx, '#d8d1c2', 7);
  ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(1188 + 30, -400, 50, 1600);
  ctx.fillStyle = '#f2c230'; for (let y = 640; y < 900; y += 80) { ctx.fillRect(1188 - 82, y, 164, 36); }
  applyCam(ctx, cam, 1);
  ctx.fillStyle = '#6d7480'; ctx.fillRect(-2000, 820, 6000, 400); line(ctx, -2000, 820, 4000, 820, 5);
  const happy = lt > .9 && lt < 2.2, sad = lt >= 2.2;
  carSide(ctx, lucasCar(x, { mouth: happy ? 'grin' : sad ? 'frown' : 'flat', eyes: happy ? 'happy' : 'normal', browAng: sad ? -.35 : 0, look: [.6, -.3] }, { y: 980, brake: lt > 2.3 && lt < 2.9 }));
  qMark(ctx, x + 30, 700, 80, fadeA(lt, .1, .85, .15));
  exclaim(ctx, x + 30, 700, 80, fadeA(lt, .95, 2.1, .15));
  if (sad) { sweat(ctx, x + 105, 780, 24, clamp((lt - 2.3) * 3)); qMark(ctx, x + 30, 700, 70, fadeA(lt, 2.5, 3.8, .2)); }
} });
// 1d. close no relógio: o tempo passa
SHOTS.push({ start: 12.2, end: 17.0, tr: 'fade', draw(ctx, lt, t) {
  const z = kf(lt, [[0, 2.3], [4.0, 2.45], [4.8, 1.6]]);
  const cam = { x: 990, y: 720, z };
  applyCam(ctx, cam, .1); sky(ctx);
  applyCam(ctx, cam, .5); cityStrip(ctx, -3000, 5000, 620, 4, 1);
  applyCam(ctx, cam, .8); ctx.fillStyle = '#7b8290'; ctx.fillRect(-3000, 640, 9000, 600);
  for (let k = -4; k < 10; k++) carSide(ctx, { x: ((k * 380 - lt * 240) % 4000) + 200, y: 760, s: .6, col: [COL.white, COL.gray, COL.purple, COL.brown, COL.yellow][(k + 10) % 5], dir: -1 });
  applyCam(ctx, cam, 1); ctx.fillStyle = '#6d7480'; ctx.fillRect(-2000, 800, 6000, 400);
  const raise = kf(lt, [[.2, 0], [.7, 1], [3.6, 1], [4.0, 0]]);
  const worried = lt > .9;
  carSide(ctx, lucasCar(960, { mouth: lt > 2.6 ? 'frown' : worried ? 'flat' : 'smile', browAng: worried ? -.3 : 0, browUp: lt > 2.6 ? .5 : 0, look: raise > .5 ? [.6, .5] : [.5, 0], blink: lt > 3.0 && lt < 3.12 ? 1 : 0 }, {
    roll: lt * 200, bob: Math.sin(t * 7) * 1.2,
    drv: { arms: { L: [.5, -1.3], R: raise > .01 ? { ik: [lerp(.2, .2, raise), lerp(-.3, -.6, raise)], bend: -1 } : [.6, -1.2] },
      prop: (c, k, p) => { if (k === 'R' && raise > .01) { circle(c, p[0], p[1], .045); fillStroke(c, '#fff', .012); line(c, p[0], p[1], p[0], p[1] - .03, .008); line(c, p[0], p[1], p[0] + .02, p[1], .008); } } } }));
  if (lt > 2.4) sweat(ctx, 1065, 600, 18, clamp((lt - 2.4) * 3));
  // big clock bubble, hands racing
  screen(ctx); clockIcon(ctx, 1520, 330, 130, t * 3.2, 3, fadeA(lt, .7, 4.3, .25));
  if (lt > 2.8) { ctx.save(); ctx.globalAlpha = fadeA(lt, 2.8, 4.3, .2); for (let k = 0; k < 3; k++) { const p = ((lt * .8 + k / 3) % 1); text(ctx, 'tic', 1330 + k * 60, 170 - p * 60, 34, '#fff', INK, 8, 'Poppins', 700); } ctx.restore(); }
} });

// ===== CENA 2 — o problema =====
const attendantPose = (lt, t) => {
  const look = Math.sin(lt * 1.6) > 0 ? -1 : 1;
  return { look, write: Math.max(0, Math.sin(t * 14)) };
};
function clipboard(c, k, p) { if (k !== 'L') return; c.save(); c.translate(p[0] + .02, p[1] - .06); c.rotate(-.15); rrect(c, -.07, -.09, .14, .18, .012); fillStroke(c, '#c99a5b', .012); rrect(c, -.055, -.07, .11, .15, .008); fillStroke(c, '#fff', .008); for (let i = 0; i < 4; i++) line(c, -.04 + i * .018, -.04, -.04 + i * .018, .01, .007); line(c, -.048, -.005, .03, -.03, .007); c.restore(); }
SHOTS.push({ start: 17.0, end: 24.0, tr: 'fade', draw(ctx, lt, t) {
  const cam = { x: 1180 + lt * 12, y: 540, z: .86 + lt * .012 };
  street(ctx, t, cam);
  applyCam(ctx, cam, 1);
  oldEntrance(ctx, t, 1250); booth(ctx, 2000, 740);
  // exiting car in the far lane, leaving to the left
  const ex = kf(lt, [[2.2, 2400], [5.5, -600]], x => x);
  carSide(ctx, { x: ex, y: 760, s: .7, col: COL.white, dir: -1, roll: -ex });
  const q = [[1540, COL.yellow, '#2b2b2b'], [1080, COL.gray, '#c48b4a'], [600, COL.purple, '#555'], [120, COL.pink, '#3b2a20']];
  q.forEach(([qx, c, hair], k) => carSide(ctx, { x: qx + Math.max(0, Math.sin((t - k) * 1.1)) * 5, y: GROUND, s: 1, col: c, brake: true, driver: driverFn(DRIVER(hair, ['#5aa0e0', '#e86aa6', '#3fa35b', '#f2b52a'][k]), { mouth: lt > 2 ? 'frown' : 'flat', look: [.6, 0], browAng: lt > 2 ? -.25 : 0 }) }));
  const P = attendantPose(lt, t);
  drawStick(ctx, C(ATTENDANT, { x: 1830, y: 760, s: 300, flip: P.look > 0 ? 1 : -1,
    arms: { L: { ik: [.05, -.48] }, R: { ik: [.03 + P.write * .02, -.5 - P.write * .02], bend: -1 } }, prop: clipboard,
    face: { mouth: lt > 3.5 ? 'o' : 'flat', look: [.6, 0], browAng: lt > 3.5 ? -.3 : 0, browUp: lt > 3.5 ? .6 : 0 } }));
  for (let k = 0; k < 4; k++) clockIcon(ctx, q[k][0] + 30, 580, 40, t + k, 2, fadeA(lt, 1.3 + k * .35, 6.8, .2) * .95);
  qMark(ctx, 1830, 420, 90, fadeA(lt, 3.6, 6.9, .2), Math.sin(t * 3) * .1);
  qMark(ctx, 1960, 360, 64, fadeA(lt, 4.1, 6.9, .2), -Math.sin(t * 3) * .1);
  // manual count bubble
  screen(ctx); const ba = fadeA(lt, .6, 6.6, .3);
  if (ba > 0) { ctx.save(); ctx.globalAlpha = ba; circle(ctx, 300, 250, 150); fillStroke(ctx, '#fff', 6); circle(ctx, 450, 420, 22); fillStroke(ctx, '#fff', 5); circle(ctx, 490, 470, 12); fillStroke(ctx, '#fff', 4);
    const n = Math.min(9, Math.floor(lt * 2.2)); for (let i = 0; i < n; i++) { const g = Math.floor(i / 5), j = i % 5; if (j < 4) line(ctx, 210 + g * 110 + j * 20, 200, 210 + g * 110 + j * 20, 280, 9); else line(ctx, 200 + g * 110, 270, 290 + g * 110, 210, 9, '#e0392f'); }
    if (lt > 3.6) { line(ctx, 190, 320, 410, 180, 10, '#7a4bc4'); text(ctx, '?', 400, 330, 70, '#7a4bc4', INK, 0, 'Poppins', 700); }
    ctx.restore(); }
} });
SHOTS.push({ start: 24.0, end: 29.6, tr: 'fade', draw(ctx, lt, t) {
  const up = ease(clamp((lt - 4.2) / 1.4));
  const cam = { x: lerp(1500, 1700, ease(clamp(lt / 3))), y: lerp(560, 560, 1) - up * 900, z: lerp(1.1, 1.45, ease(clamp(lt / 3.5))) };
  street(ctx, t, cam);
  applyCam(ctx, cam, 1);
  oldEntrance(ctx, t, 1250); booth(ctx, 2000, 740);
  carSide(ctx, { x: 1540, y: GROUND, s: 1, col: COL.yellow, brake: true, driver: driverFn(DRIVER('#2b2b2b', '#5aa0e0'), { mouth: 'frown', look: [.6, 0] }) });
  const think = lt > 2.6;
  drawStick(ctx, C(ATTENDANT, { x: 1830, y: 760, s: 300, flip: -1,
    arms: { L: { ik: [.05, -.48] }, R: think ? { ik: [.12, -.9], bend: -1 } : [.5, -.3] }, prop: clipboard,
    face: { mouth: think ? 'smile' : 'frown', look: think ? [0, -.9] : [.6, 0], browUp: think ? 1 : 0, browAng: think ? 0 : -.3 } }));
  qMark(ctx, 1830, 420, 90, fadeA(lt, 0, 2.6, .25));
  const ga = clamp((lt - 2.7) / .3);
  bulb(ctx, 1830, 380 - (lt - 2.7) * 10, 1.2, ga > 0 ? clamp((lt - 2.9) / .4) * (0.85 + .15 * Math.sin(t * 9)) : 0, ga);
} });

// ===== CENA 3 — o estacionamento ganha inteligência =====
SHOTS.push({ start: 29.6, end: 44.0, tr: 'cut', draw(ctx, lt, t) {
  const z0 = kf(t, [[29.6, 2.6], [31.9, 1.05], [42.4, 1.05], [44.0, 1.9]]);
  const cx = kf(t, [[29.6, 480], [31.9, 925], [42.4, 925], [44.0, 640]]), cy = kf(t, [[29.6, 680], [31.9, 505], [42.4, 505], [44.0, 790]]);
  const cam = { x: cx, y: cy, z: z0, r: kf(t, [[29.6, .25], [31.9, 0]]) };
  applyCam(ctx, cam, 1);
  const R = {
    maq: inv(32.0, 33.4, t), booth: 1 - inv(32.6, 33.1, t),
    ard: inv(35.5, 36.0, t), ardLabel: true,
    numK: i => inv(37.0 + i * .2, 37.3 + i * .2, t),
    gate: inv(38.9, 39.3, t), ir: inv(39.3, 39.7, t), disp: inv(39.7, 40.1, t),
    usK: i => inv(40.8 + i * .17, 41.1 + i * .17, t), ledK: i => inv(40.95 + i * .17, 41.25 + i * .17, t), us: inv(40.8, 41.1, t), led: inv(40.95, 41.25, t),
    wire: kf(t, [[35.6, 0], [36.2, .95], [42.5, .95], [43.6, .35]]),
  };
  drawLot(ctx, t, R);
  topCars(ctx, t, { d: 1, e: 1, c: 1 });
  drawSmart(ctx, t, R);
  // little labels as each part arrives
  pill(ctx, 150, 470, 'placa Arduino', fadeA(t, 36.0, 38.8, .25), 26);
  pill(ctx, 1205, 345, '7 vagas', fadeA(t, 37.6, 40.4, .25), 30);
  pill(ctx, 120, 632, 'cancela', fadeA(t, 39.1, 41.2, .25), 24);
  pill(ctx, 565, 545, 'painel LCD', fadeA(t, 39.9, 42.0, .25), 24);
  pill(ctx, 1205, 360, 'sensor e LEDs em cada vaga', fadeA(t, 41.1, 42.7, .25), 26);
  // title
  const ta = fadeA(t, 32.4, 38.0, .5); titleCard(ctx, t, ta, false, 560);
  // the rising camera: fade in from the sky colour
  screen(ctx); const sa = 1 - clamp((t - 29.6) / .7); if (sa > 0) { ctx.fillStyle = `rgba(160,215,250,${sa})`; ctx.fillRect(0, 0, W, H); }
} });

// ===== CENA 4 — a entrada inteligente (vista lateral) =====
const lucasX4 = t => kf(t, [[44.0, -350], [46.6, 330, easeOut], [49.7, 330], [51.0, 615, ease], [57.2, 615], [60.9, 1245, x => x * x], [62.6, 1950, x => x]]);
SHOTS.push({ start: 44.0, end: 64.4, tr: 'fade', draw(ctx, lt, t) {
  const x = lucasX4(t);
  const cx = kf(t, [[44.0, 380], [46.6, 600], [47.4, 560], [49.4, 560], [50.6, 900], [55.0, 900], [55.6, 600], [56.9, 600], [57.8, 950], [60.0, 1100], [64.4, 1200]]);
  const cy = kf(t, [[44.0, 610], [46.6, 610], [47.4, 520], [49.4, 520], [50.6, 600], [55.0, 600], [55.6, 540], [56.9, 540], [57.8, 600]]);
  const z = kf(t, [[44.0, 1.2], [46.6, 1.2], [47.4, 1.6], [49.4, 1.6], [50.6, 1.2], [55.0, 1.2], [55.6, 1.5], [56.9, 1.5], [57.8, 1.2]]);
  const hh = handheld(t, 2); const cam = { x: cx + hh[0], y: cy + hh[1], z };
  gateSide(ctx, t, cam);
  const moving = (t > 44 && t < 46.6) || (t > 49.7 && t < 51) || t > 57.2;
  const lookPanel = t > 46.8 && t < 50.0, react = t > 51.2 && t < 53.6;
  carSide(ctx, lucasCar(x, { mouth: lookPanel ? 'grin' : react ? 'o' : 'smile', look: lookPanel ? [-.2, -.9] : [.6, 0], browUp: react ? 1 : 0, eyes: react ? 'wide' : 'normal' }, { brake: !moving, lights: true }));
  gateArmSide(ctx, t);
  arduinoCallout(ctx, t, fadeA(t, 50.8, 55.3, .4), cam);
  pill(ctx, GS.lcdX, 340, 'painel: vagas livres', fadeA(t, 46.8, 49.6, .25), 24);
  pill(ctx, GS.ir1 + 40, 560, 'sensor infravermelho 1', fadeA(t, 51.2, 53.4, .25), 24);
  pill(ctx, GS.gateX - 40, 300, 'servo motor', fadeA(t, 53.4, 55.4, .25), 24);
  pill(ctx, GS.lcdX, 340, 'vaga reservada', fadeA(t, 55.7, 57.4, .25), 26, '#fff4c2');
  pill(ctx, GS.ir2, 600, 'sensor infravermelho 2', fadeA(t, 60.8, 63.4, .25), 24);
} });

// ===== CENA 5 — encontrando a vaga =====
SHOTS.push({ start: 64.4, end: 73.0, tr: 'cut', draw(ctx, lt, t) {
  const L = carState('lucas', t);
  const fx = kf(t, [[64.4, L.x], [68.6, 700], [71.6, 925], [73.0, SPOT_X(2) - 20]]), fy = kf(t, [[64.4, 560], [68.6, 420], [71.6, 505], [73.0, 330]]);
  const fz = kf(t, [[64.4, 1.7], [68.6, 1.25], [69.4, 1.05], [71.6, 1.05], [73.0, 1.6]]);
  const cam = { x: lerp(L.x, fx, clamp((t - 64.6) / 2)), y: lerp(L.y, fy, clamp((t - 64.6) / 2)), z: fz };
  applyCam(ctx, cam, 1);
  drawLot(ctx, t, SMART_ON); topCars(ctx, t, { d: 1, e: 1, c: 1 }); drawSmart(ctx, t, SMART_ON);
  // green rings on the free spaces
  const ga = fadeA(t, 69.0, 72.2, .3);
  if (ga > 0) for (let i = 0; i < SPOTS; i++) if (ledAt(i, t) === 'G') { const p = (t * 1.2 + i * .2) % 1; ctx.save(); ctx.globalAlpha = ga * (1 - p); rrect(ctx, SPOT_X(i) - 82 - p * 20, 52 - p * 20, 164 + p * 40, 246 + p * 40, 16); ctx.lineWidth = 8; ctx.strokeStyle = LED_G; ctx.stroke(); ctx.restore(); }
  pill(ctx, 905, 560, 'luz verde = vaga livre', ga, 32, '#e6ffe9');
  // fade the gate side view into this one
  drawHUD(ctx, t, clamp((t - 64.6) / .4));
} });
SHOTS.push({ start: 73.0, end: 80.6, tr: 'cut', draw(ctx, lt, t) {
  const x = kf(t, [[73.0, -320], [74.4, 1235, easeOut]]);
  const cx = kf(t, [[73.0, 700], [74.4, 1050], [74.8, 1300], [76.9, 1300], [77.6, 1060]]), cy = kf(t, [[73.0, 560], [74.8, 640], [76.9, 640], [77.6, 590]]);
  const z = kf(t, [[73.0, 1.0], [74.4, 1.0], [74.8, 1.45], [76.9, 1.45], [77.6, 1.12]]);
  const cam = { x: cx, y: cy, z };
  parkSide(ctx, t, cam, 2);
  applyCam(ctx, cam, 1);
  const out = t > 77.6; const inCar = !out;
  const door = kf(t, [[77.4, 0], [77.8, 1], [79.6, 1], [80.0, 0]]);
  carSide(ctx, lucasCar(x, { mouth: 'smile', look: [.6, -.2] }, { brake: t < 74.6, driver: inCar ? driverFn(LUCAS, { mouth: 'smile', look: [.6, -.2] }) : null }));
  if (door > 0) { ctx.save(); ctx.translate(x - 32, GROUND - 40); ctx.transform(1, 0, -.25 * door, 1, 0, 0); ctx.globalAlpha = 1; rrect(ctx, -150 * (1 - .55 * door) - 10, -150, 150 * (1 - .55 * door), 120, 14); fillStroke(ctx, shadeCol(COL.lucas, .15), 5); ctx.restore(); }
  if (out) {
    const k = clamp((t - 77.6) / .7); const lx = lerp(x - 60, x - 300, ease(k));
    const stretch = t > 78.4 && t < 79.6;
    drawStick(ctx, C(LUCAS, { x: lx, y: GROUND + 20, s: 260, flip: -1, legs: k < 1 ? walkLegs(t, 10, .4) : undefined,
      arms: stretch ? POSE.handsUp.arms : k < 1 ? walkArms(t, 10, .4) : POSE.idle.arms,
      face: { eyes: stretch ? 'happy' : 'normal', mouth: stretch ? 'grin' : 'smile', look: [.4, 0] } }));
    if (t > 78.6) puff(ctx, lx - 110, GROUND - 250 - (t - 78.6) * 30, 22 + (t - 78.6) * 14, t, '#ffffff', 7, clamp(1 - (t - 78.6) / 1.2));
    if (t > 78.4) { text(ctx, 'ufa!', lx - 40, GROUND - 330, 46, '#fff', INK, 10, 'Poppins', 700); }
  }
  parkSideFront(ctx, t, 2);
  pill(ctx, PS.wall - 200, 520, 'sensor ultrassônico', fadeA(t, 74.7, 76.3, .25), 22);
  pill(ctx, PS.wall - 200, 520, 'luz vermelha = ocupada', fadeA(t, 76.4, 78.0, .25), 22, '#ffe3e1');
  drawHUD(ctx, t, 1);
} });
SHOTS.push({ start: 80.6, end: 92.6, tr: 'cut', draw(ctx, lt, t) {
  const cx = kf(t, [[80.6, 925], [88.0, 925], [88.9, 565], [90.0, 565], [90.9, 925]]), cy = kf(t, [[80.6, 505], [88.0, 505], [88.9, 650], [90.0, 650], [90.9, 505]]);
  const z = kf(t, [[80.6, 1.05], [88.0, 1.05], [88.9, 2.3], [90.0, 2.3], [90.9, 1.05]]);
  const cam = { x: cx, y: cy, z };
  applyCam(ctx, cam, 1);
  drawLot(ctx, t, SMART_ON); topCars(ctx, t, { c: 1 }); drawSmart(ctx, t, SMART_ON);
  // legend
  screen(ctx); const la = fadeA(t, 80.9, 83.7, .3);
  if (la > 0) { ctx.save(); ctx.globalAlpha = la; rrect(ctx, 40, 40, 400, 150, 22); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    ledDot(ctx, 90, 85, 16, LED_G, true); text(ctx, 'Verde: livre', 120, 87, 36, INK, INK, 0, 'Poppins', 700, 'left');
    ledDot(ctx, 90, 145, 16, LED_R, true); text(ctx, 'Vermelho: ocupada', 120, 147, 36, INK, INK, 0, 'Poppins', 700, 'left'); ctx.restore(); }
  pill(ctx, 905, 560, 'um sensor ultrassônico por vaga', fadeA(t, 81.0, 83.6, .3), 30);
  // time passes
  const ca = fadeA(t, 83.1, 91.8, .3);
  if (ca > 0) { clockIcon(ctx, 110, 120, 62, (t - 83) * 14, 4, ca); pill(ctx, 300, 120, 'mais tarde...', ca, 30); }
} });

// ===== CENA 6 — e quando está lotado? (vista lateral) =====
const cX6 = t => kf(t, [[92.6, -350], [94.4, 615, easeOut], [96.6, 615], [97.6, 330, ease]]);
SHOTS.push({ start: 92.6, end: 98.0, tr: 'fade', draw(ctx, lt, t) {
  const x = cX6(t); const cam = { x: kf(t, [[92.6, 640], [94.4, 880]]), y: 600, z: 1.2 };
  gateSide(ctx, t, cam);
  const reading = t > 94.7;
  carSide(ctx, { x, y: GROUND, s: 1, col: COL.orange, roll: x, brake: !(t < 94.4 || (t > 96.6 && t < 97.6)), lights: true,
    driver: driverFn(DRIVER('#7a4a2a', '#3fa35b'), { mouth: reading ? (t > 95.8 ? 'smile' : 'flat') : 'smile', look: reading && t < 95.8 ? [-.2, -.9] : [.6, 0] }, { headTilt: t > 95.8 && t < 96.5 ? Math.sin((t - 95.8) * 18) * .08 : 0 }) });
  gateArmSide(ctx, t);
  arduinoCallout(ctx, t, fadeA(t, 94.3, 97.4, .35), cam);
  pill(ctx, GS.gateX - 150, 600, 'entrada bloqueada', fadeA(t, 95.2, 97.8, .3), 24, '#e9eefc');
} });

// ===== CENA 7 — uma vaga liberada, um novo caminho =====
SHOTS.push({ start: 98.0, end: 100.8, tr: 'cut', draw(ctx, lt, t) {
  const cam = { x: 1080, y: 600, z: 1.12 };
  parkSide(ctx, t, cam, 2);
  applyCam(ctx, cam, 1);
  const x = 1235; const inside = t > 99.9;
  const door = kf(t, [[99.2, 0], [99.45, 1], [99.85, 1], [100.1, 0]]);
  carSide(ctx, lucasCar(x, { mouth: 'smile', look: [.6, 0] }, { driver: inside ? driverFn(LUCAS, { mouth: 'smile', look: [.6, 0] }) : null, exhaust: t > 100.2 ? t : 0, dir: 1 }));
  if (!inside) {
    const lx = kf(t, [[98.0, 300], [99.3, x - 120, x => x]]);
    const walking = t < 99.3;
    drawStick(ctx, C(LUCAS, { x: lx, y: GROUND + 20, s: 260, alpha: 1 - clamp((t - 99.6) / .3), legs: walking ? walkLegs(t, 10, .45) : undefined, arms: walking ? walkArms(t, 10, .35) : POSE.idle.arms,
      prop: (c, k, p) => { if (k === 'L') { rrect(c, p[0] - .06, p[1], .12, .13, .02); fillStroke(c, '#f6e7c8', .012); line(c, p[0] - .03, p[1], p[0] + .03, p[1], .01); } }, face: { mouth: 'smile', look: [.5, 0] } }));
  }
  if (door > 0) { ctx.save(); ctx.translate(x - 32, GROUND - 40); ctx.transform(1, 0, -.25 * door, 1, 0, 0); rrect(ctx, -150 * (1 - .55 * door) - 10, -150, 150 * (1 - .55 * door), 120, 14); fillStroke(ctx, shadeCol(COL.lucas, .15), 5); ctx.restore(); }
  parkSideFront(ctx, t, 2);
  drawHUD(ctx, t, 1);
} });
SHOTS.push({ start: 100.8, end: TOTAL, tr: 'cut', draw(ctx, lt, t) {
  const L = carState('lucas', t), Cc = carState('c', t);
  const fx = kf(t, [[100.8, SPOT_X(2)], [102.4, SPOT_X(2) - 60], [104.0, 430], [107.6, 430], [109.4, 640], [110.4, 925], [113.0, 925]]);
  const fy = kf(t, [[100.8, 300], [102.4, 360], [104.0, 660], [107.6, 660], [109.4, 420], [110.4, 505], [113.0, 505]]);
  const z = kf(t, [[100.8, 1.6], [102.4, 1.45], [104.0, 1.55], [107.6, 1.55], [109.4, 1.25], [111.0, 1.05], [114.5, .97]]);
  const cam = { x: fx, y: fy, z };
  applyCam(ctx, cam, 1);
  drawLot(ctx, t, SMART_ON); topCars(ctx, t, { d: 0, e: 0 }); drawSmart(ctx, t, SMART_ON);
  pill(ctx, SPOT_X(2), 340, 'luz verde: vaga livre de novo', fadeA(t, 101.7, 103.6, .3), 26, '#e6ffe9');
  pill(ctx, 640, 790, 'saída concluída', fadeA(t, 106.2, 107.5, .25), 26);
  pill(ctx, 640, 790, 'novo acesso liberado', fadeA(t, 107.6, 109.2, .25), 26, '#fff4c2');
  drawHUD(ctx, t, 1 - clamp((t - 111.4) / .6));
  titleCard(ctx, t, clamp((t - 111.9) / .9), true, 520);
} });
