// ---------- top view of the parking lot (becomes the maquette) ----------
// R: reveal amounts 0..1 { maq, gate, disp, ir, us, led, ard, wire, num, booth }
const WIRE = '#ffcf4a';
function stripedArm(ctx, x0, y0, x1, y1, w) {
  const L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
  ctx.save(); ctx.translate(x0, y0); ctx.rotate(a);
  rrect(ctx, 0, -w / 2, L, w, w / 2); ctx.fillStyle = '#ffd23a'; ctx.fill();
  ctx.save(); rrect(ctx, 0, -w / 2, L, w, w / 2); ctx.clip(); ctx.fillStyle = '#2b2730';
  for (let x = w; x < L; x += w * 2.2) { ctx.beginPath(); ctx.moveTo(x, -w); ctx.lineTo(x + w, -w); ctx.lineTo(x + w * .2, w); ctx.lineTo(x - w * .8, w); ctx.fill(); }
  ctx.restore(); rrect(ctx, 0, -w / 2, L, w, w / 2); fillStroke(ctx, null, Math.max(2.5, w * .22)); ctx.restore();
}
function popS(ctx, x, y, k, fn) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); const s = backOut(clamp(k)); ctx.scale(s, s); ctx.globalAlpha *= clamp(k * 3); fn(); ctx.restore(); }
function wirePath(ctx, pts, a, prog = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a * .9; ctx.beginPath();
  let tot = 0; for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let left = tot * prog; ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); const k = Math.min(1, left / l); ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)); left -= l; }
  ctx.lineWidth = 4; ctx.strokeStyle = WIRE; ctx.setLineDash([10, 7]); ctx.lineCap = 'round'; ctx.stroke(); ctx.setLineDash([]); ctx.restore();
}
function ptOn(pts, k) {
  let tot = 0; const L = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); tot += l; }
  let d = clamp(k) * tot; for (let i = 0; i < L.length; i++) { if (d <= L[i]) { const u = d / L[i]; return [lerp(pts[i][0], pts[i + 1][0], u), lerp(pts[i][1], pts[i + 1][1], u)]; } d -= L[i]; }
  return pts[pts.length - 1];
}
const ARD = [62, 318, 180];   // x, y, width (top view)
const WIRES = {
  ir1: [[150, 395], [150, IR1_Y], [238, IR1_Y]],
  ir2: [[150, 395], [150, IR2_Y], [238, IR2_Y]],
  gate: [[150, 395], [150, GATE_Y], [236, GATE_Y]],
  lcd: [[150, 395], [150, 740], [565, 740], [565, 694]],
  bus: [[150, 318], [150, 32], [1720, 32]],
};
function pulseDot(ctx, p, a = 1) {
  ctx.save(); ctx.globalAlpha = a; const g = ctx.createRadialGradient(p[0], p[1], 2, p[0], p[1], 34); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,214,80,.9)'); g.addColorStop(1, 'rgba(255,214,80,0)');
  ctx.fillStyle = g; ctx.fillRect(p[0] - 36, p[1] - 36, 72, 72); ctx.restore();
}
function drawLot(ctx, t, R = {}) {
  const maq = R.maq || 0;
  // surroundings
  ctx.fillStyle = '#9fd67a'; ctx.fillRect(-3000, -2000, 8000, 5000);
  if (maq > 0) {
    ctx.save(); ctx.globalAlpha = maq; ctx.fillStyle = '#d9dee6'; ctx.fillRect(-3000, -2000, 8000, 5000);
    // maquette board: MDF slab with an edge
    rrect(ctx, 18, 22, 1790, 1010, 18); ctx.fillStyle = '#b98c58'; ctx.fill();
    rrect(ctx, 10, 10, 1790, 1000, 18); fillStroke(ctx, '#e7c896', 6); ctx.restore();
  }
  // trees (old world) and grass patches
  const grassA = 1 - maq * .0;
  ctx.save(); ctx.globalAlpha = grassA * (1 - maq);
  rrect(ctx, 30, 30, 200, 270, 20); ctx.fillStyle = '#8fcf6a'; ctx.fill();
  ctx.restore();
  // road
  ctx.fillStyle = '#5d6470'; ctx.fillRect(-3000, 840, 8000, 140); line(ctx, -3000, 840, 5000, 840, 5); line(ctx, -3000, 980, 5000, 980, 5);
  ctx.fillStyle = '#f5f2e8'; for (let x = -3000; x < 5000; x += 160) ctx.fillRect(x, 906, 80, 8);
  ctx.fillStyle = '#d9d4c7'; ctx.fillRect(-3000, 980, 8000, 40);
  // store building
  rrect(ctx, 760, 540, 1000, 260, 14); fillStroke(ctx, '#f2a7a0', 6);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 800; x < 1720; x += 120) { rrect(ctx, x, 570, 80, 50, 8); ctx.fill(); }
  rrect(ctx, 1010, 680, 500, 84, 14); fillStroke(ctx, '#ffffff', 5); text(ctx, 'MERCADO', 1260, 724, 56, '#e0392f', INK, 0, 'Poppins', 700);
  // asphalt
  ctx.beginPath(); ctx.moveTo(560, 40); ctx.lineTo(1760, 40); ctx.lineTo(1760, 505); ctx.lineTo(425, 505); ctx.lineTo(425, 840); ctx.lineTo(255, 840); ctx.lineTo(255, 300); ctx.lineTo(560, 300); ctx.closePath();
  fillStroke(ctx, '#6d7480', 6);
  // back wall
  rrect(ctx, 552, 26, 1216, 22, 6); fillStroke(ctx, '#c9c2b4', 4);
  // spot lines + tint
  for (let i = 0; i < SPOTS; i++) {
    const cx = SPOT_X(i);
    if ((R.led || 0) > 0) { const on = ledAt(i, t); ctx.save(); ctx.globalAlpha = R.led * (.22 + .25 * ledFlip(i, t)) * clamp(R.ledK ? R.ledK(i) : 1); ctx.fillStyle = on === 'R' ? LED_R : LED_G; ctx.fillRect(cx - 80, 52, 160, 246); ctx.restore(); }
  }
  ctx.strokeStyle = '#f6f4ee'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  for (let k = 0; k <= SPOTS; k++) { const x = 560 + 170 * k; ctx.beginPath(); ctx.moveTo(x, 52); ctx.lineTo(x, 298); ctx.stroke(); }
  // aisle arrows
  ctx.save(); ctx.globalAlpha = .7; for (const ax of [760, 1180, 1600]) { ctx.beginPath(); ctx.moveTo(ax - 40, 455); ctx.lineTo(ax + 20, 455); ctx.lineTo(ax + 20, 440); ctx.lineTo(ax + 50, 462); ctx.lineTo(ax + 20, 484); ctx.lineTo(ax + 20, 469); ctx.lineTo(ax - 40, 469); ctx.closePath(); ctx.fillStyle = '#f6f4ee'; ctx.fill(); } ctx.restore();
  // spot numbers
  for (let i = 0; i < SPOTS; i++) { const k = R.numK ? R.numK(i) : (R.num || 0); popS(ctx, SPOT_X(i), 278, k, () => { circle(ctx, 0, 0, 20); fillStroke(ctx, '#ffffff', 4); text(ctx, String(i + 1), 0, 2, 26, INK, INK, 0, 'Poppins', 700); }); }
  // booth (old manual control) on the right of the driveway
  if ((R.booth || 0) > 0) popS(ctx, 520, 650, R.booth, () => { rrect(ctx, -55, -45, 110, 90, 10); fillStroke(ctx, '#f2c230', 5); rrect(ctx, -62, -52, 124, 22, 8); fillStroke(ctx, '#e0392f', 4); });
}
// smart components on top of the lot (drawn after the cars so they read clearly)
function drawSmart(ctx, t, R = {}) {
  const wa = R.wire || 0;
  // wires
  if (wa > 0) {
    const wp = R.wireP != null ? R.wireP : 1;
    wirePath(ctx, WIRES.bus, wa * (R.us || 0), wp);
    for (let i = 0; i < SPOTS; i++) wirePath(ctx, [[SPOT_X(i) - 28, 32], [SPOT_X(i) - 28, 58]], wa * (R.us || 0), wp);
    wirePath(ctx, WIRES.ir1, wa * (R.ir || 0), wp); wirePath(ctx, WIRES.ir2, wa * (R.ir || 0), wp);
    wirePath(ctx, WIRES.gate, wa * (R.gate || 0), wp); wirePath(ctx, WIRES.lcd, wa * (R.disp || 0), wp);
  }
  // IR sensors (beams across the driveway)
  const ir = R.ir || 0;
  if (ir > 0) for (const [yy, key] of [[IR1_Y, 'ir1'], [IR2_Y, 'ir2']]) {
    const f = irFlash(key, t);
    ctx.save(); ctx.globalAlpha = clamp(ir * 2); irBeam(ctx, 262, yy, 418, yy, 1, f); ctx.restore();
    popS(ctx, 250, yy, ir, () => irPost(ctx, 0, 0, 1, f)); popS(ctx, 430, yy, ir, () => irPost(ctx, 0, 0, 1, f));
    if (f > 0) { ctx.save(); ctx.globalAlpha = f; circle(ctx, 340, yy, 40 + (1 - f) * 60); ctx.lineWidth = 6; ctx.strokeStyle = IRC; ctx.stroke(); ctx.restore(); }
  }
  // gate (top view: the arm foreshortens as the servo lifts it)
  const g = R.gate || 0;
  if (g > 0) {
    const open = gateAt(t);
    popS(ctx, 246, GATE_Y, g, () => {
      const L = 176 * (1 - .82 * Math.sin(open * Math.PI / 2));
      ctx.save(); ctx.globalAlpha *= .3; stripedArm(ctx, 10 + open * 8, 10 + open * 26, 10 + L + open * 8, 10 + open * 26, 16); ctx.restore();
      stripedArm(ctx, 8, 0, 8 + L, 0, 16 + open * 4);
      rrect(ctx, -20, -22, 40, 44, 8); fillStroke(ctx, '#3a4a8f', 4); circle(ctx, 0, 0, 9); fillStroke(ctx, '#cfd5dc', 3);
    });
  }
  // ultrasonic sensors + LEDs per spot
  const us = R.us || 0, led = R.led || 0;
  for (let i = 0; i < SPOTS; i++) {
    const cx = SPOT_X(i);
    const kU = R.usK ? R.usK(i) : us, kL = R.ledK ? R.ledK(i) : led;
    popS(ctx, cx - 30, 66, kU, () => usSensor(ctx, 0, 0, 1));
    const w = usAt(i, t); if (w >= 0 && kU > .5) usWaves(ctx, cx - 30, 80, Math.PI / 2, w, 1.1, .7);
    popS(ctx, cx + 36, 66, kL, () => { const st = ledAt(i, t); rrect(ctx, -32, -16, 64, 32, 12); fillStroke(ctx, '#3b3442', 3); ledDot(ctx, -15, 0, 11, LED_R, st === 'R'); ledDot(ctx, 15, 0, 11, LED_G, st === 'G'); });
  }
  // LCD panel on its post
  const dp = R.disp || 0;
  if (dp > 0) popS(ctx, 565, 646, dp, () => { rrect(ctx, -8, 40, 16, 30, 4); fillStroke(ctx, '#7d858f', 3); lcd(ctx, -115, -46, 230, dispAt(t), { flash: dispFlash(t) }); });
  // Arduino
  const ad = R.ard || 0;
  if (ad > 0) popS(ctx, ARD[0] + ARD[2] / 2, ARD[1] + 38, ad, () => {
    const pu = pulseAt(t); const blink = pu && pu[1] > .4 && pu[1] < .65;
    arduino(ctx, -ARD[2] / 2, -38, ARD[2], t, { blink, glow: blink ? 1 : 0, label: R.ardLabel ? 'Arduino Mega 2560' : '' });
  });
  // signal pulse
  const pu = pulseAt(t);
  if (pu && wa > 0) {
    const [k, p] = pu; const src = k === 'ir2' ? WIRES.ir2 : WIRES.ir1; const dst = k === 'ir1x' ? WIRES.lcd : WIRES.gate;
    if (p < .42) pulseDot(ctx, ptOn(src.slice().reverse(), p / .42));
    else if (p > .6) pulseDot(ctx, ptOn(dst, (p - .6) / .4), 1 - clamp((p - .95) / .05));
  }
}
// ---------- side view: the smart entrance (scenes 4 and 6) ----------
const GS = { ground: 860, lcdX: 560, ir1: 820, gateX: 1180, armL: 300, ir2: 1460 };
function sideBackdrop(ctx, cam, t, o = {}) {
  applyCam(ctx, cam, .1); sky(ctx); applyCam(ctx, cam, .12); sun(ctx, 1650, 150, 60, t);
  drawCloud(ctx, 300 + t * 5, 170, 90, 1); drawCloud(ctx, 1200 + t * 4, 120, 70, 2);
  applyCam(ctx, cam, .35); cityStrip(ctx, -800, 2800, 640, o.seed || 5, .9);
  applyCam(ctx, cam, 1);
}
function gateSide(ctx, t, cam, o = {}) {
  sideBackdrop(ctx, cam, t, o);
  const G = GS.ground;
  // lot behind: hedge + parked cars + store
  rrect(ctx, -400, 560, 2800, 130, 10); fillStroke(ctx, '#f2a7a0', 5);
  rrect(ctx, 1500, 585, 360, 70, 12); fillStroke(ctx, '#fff', 4); text(ctx, 'MERCADO', 1680, 621, 44, '#e0392f', INK, 0, 'Poppins', 700);
  for (const [x, c] of [[120, COL.gray], [420, COL.purple], [1000, COL.white], [1330, COL.brown]]) carSide(ctx, { x, y: 720, s: .45, col: c, dir: 1 });
  rrect(ctx, -400, 700, 2800, 46, 14); ctx.fillStyle = '#5fb565'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
  // ground
  ctx.fillStyle = '#6d7480'; ctx.fillRect(-1000, 740, 4000, 400); line(ctx, -1000, 742, 3000, 742, 5);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(-1000, 742, 4000, 30);
  // IR sensor bollards (beam crosses the lane: drawn as a glowing band on the floor)
  for (const [x, key] of [[GS.ir1, 'ir1'], [GS.ir2, 'ir2']]) {
    const f = irFlash(key, t);
    ctx.save(); ctx.globalAlpha = .45 + f * .5; ellipse(ctx, x, G - 6, 26 + f * 20, 90, 0); ctx.fillStyle = IRC; ctx.globalAlpha *= .35; ctx.fill(); ctx.restore();
    ctx.save(); ctx.setLineDash([12, 9]); ctx.lineDashOffset = -t * 40; line(ctx, x, 770, x, G + 70, 5 + f * 4, f > 0 ? '#ffb3ff' : IRC); ctx.restore();
    rrect(ctx, x - 16, 740, 32, 50, 6); fillStroke(ctx, '#3b3442', 4); circle(ctx, x, 756, 8); ctx.fillStyle = f > 0 ? '#ffd1ff' : IRC; ctx.fill();
    if (f > 0) { ctx.save(); ctx.globalAlpha = f; circle(ctx, x, 756, 20 + (1 - f) * 70); ctx.lineWidth = 6; ctx.strokeStyle = IRC; ctx.stroke(); ctx.restore(); }
  }
  // LCD panel on a post
  rrect(ctx, GS.lcdX - 10, 520, 20, 230, 5); fillStroke(ctx, '#7d858f', 4);
  lcd(ctx, GS.lcdX - 170, 380, 340, dispAt(t), { flash: dispFlash(t) });
}
function gateArmSide(ctx, t) {
  // housing + arm (drawn in front of cars)
  const open = gateAt(t), x = GS.gateX;
  const a = -open * Math.PI / 2 * .98;
  ctx.save(); ctx.translate(x - 20, 700); ctx.rotate(-a); stripedArm(ctx, 0, 0, -GS.armL, 0, 26); ctx.restore();
  rrect(ctx, x - 50, 672, 80, 190, 10); fillStroke(ctx, '#3a4a8f', 6);
  rrect(ctx, x - 38, 760, 56, 40, 6); fillStroke(ctx, '#1c2240', 4); text(ctx, 'servo', x - 10, 781, 18, '#cfe3ff', INK, 0, 'Poppins', 700);
  circle(ctx, x - 20, 700, 13); fillStroke(ctx, '#cfd5dc', 4);
  ellipse(ctx, x - 10, 862, 60, 10); ctx.fillStyle = 'rgba(30,20,40,.2)'; ctx.fill();
}
// Arduino call-out (screen space, top right) with wires to the IR sensor, the servo and the display
const toScreen = (cam, p) => [(p[0] - cam.x) * cam.z + W / 2, (p[1] - cam.y) * cam.z + H / 2];
function arduinoCallout(ctx, t, a, cam, o = {}) {
  if (a <= 0) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a;
  const bx = 1500, by = 50, bw = 380, bh = 270; const pu = pulseAt(t); const blink = pu && pu[1] > .4 && pu[1] < .65;
  const ir = toScreen(cam, [o.irX || GS.ir1, 745]), sv = toScreen(cam, [GS.gateX - 10, 690]), lc = toScreen(cam, [GS.lcdX + 170, 450]);
  const wIr = [ir, [ir[0], by + bh + 40], [bx + 60, by + bh + 40], [bx + 60, by + bh]];
  const wSv = [[bx + bw - 60, by + bh], [bx + bw - 60, sv[1] - 60], [sv[0], sv[1] - 60], sv];
  const wLc = [[bx, by + 60], [lc[0], by + 60], lc];
  wirePath(ctx, wIr, 1); wirePath(ctx, wSv, 1); wirePath(ctx, wLc, 1);
  rrect(ctx, bx, by, bw, bh, 26); fillStroke(ctx, '#eaf6ff', 6);
  arduino(ctx, bx + 40, by + 28, 300, t, { blink, glow: blink ? .8 : 0 });
  text(ctx, 'Arduino Mega 2560', bx + bw / 2, by + bh - 44, 32, INK, INK, 0, 'Poppins', 700);
  if (pu) {
    const [k, p] = pu;
    if (p < .42) pulseDot(ctx, ptOn(wIr, p / .42));
    else if (p > .6) pulseDot(ctx, ptOn(k === 'ir1x' ? wLc.slice().reverse() : wSv, (p - .6) / .4), 1 - clamp((p - .95) / .05));
  }
  ctx.restore();
}
// ---------- side view: a parking space with its own sensor + LEDs ----------
const PS = { ground: 860, wall: 1500 };
function parkSide(ctx, t, cam, spot = 2) {
  sideBackdrop(ctx, cam, t, { seed: 9 });
  ctx.fillStyle = '#6d7480'; ctx.fillRect(-1000, 742, 4000, 400); line(ctx, -1000, 742, 3000, 742, 5);
  // painted spot lines on floor
  ctx.save(); ctx.globalAlpha = .9; ctx.fillStyle = '#f6f4ee'; ctx.fillRect(840, 840, 680, 10); ctx.restore();
  const on = ledAt(spot, t), fl = ledFlip(spot, t);
  ctx.save(); ctx.globalAlpha = .25 + fl * .25; ctx.fillStyle = on === 'R' ? LED_R : LED_G; ctx.fillRect(840, 742, 680, 98); ctx.restore();
  // back wall
  rrect(ctx, PS.wall, 380, 300, 520, 8); fillStroke(ctx, '#d8d1c2', 6);
  ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 420; y < 860; y += 60) ctx.fillRect(PS.wall + 6, y, 288, 4);
  // spot number
  circle(ctx, PS.wall + 150, 470, 46); fillStroke(ctx, '#fff', 5); text(ctx, String(spot + 1), PS.wall + 150, 473, 54, INK, INK, 0, 'Poppins', 700);
}
function parkSideFront(ctx, t, spot = 2) {
  const on = ledAt(spot, t);
  // LEDs (red + green) and the ultrasonic sensor facing the car
  rrect(ctx, PS.wall - 50, 540, 50, 150, 10); fillStroke(ctx, '#3b3442', 4);
  ledDot(ctx, PS.wall - 25, 580, 18, LED_R, on === 'R'); ledDot(ctx, PS.wall - 25, 648, 18, LED_G, on === 'G');
  usSensor(ctx, PS.wall - 16, 760, 1.15, -Math.PI / 2);
  const w = usAt(spot, t); if (w >= 0) usWaves(ctx, PS.wall - 34, 760, Math.PI, w, 1.6, .55);
}
// ---------- side view: street + old entrance ----------
function street(ctx, t, cam, o = {}) {
  applyCam(ctx, cam, .1); sky(ctx); applyCam(ctx, cam, .12); sun(ctx, 1600, 150, 60, t);
  applyCam(ctx, cam, .2); drawCloud(ctx, 300 + t * 5, 170, 90, 1); drawCloud(ctx, 1200 + t * 4, 120, 70, 2); drawCloud(ctx, 2400 + t * 4, 200, 80, 3);
  applyCam(ctx, cam, .4); cityStrip(ctx, cam.x * .4 - 2400, cam.x * .4 + 2400, 700, 3, 1);
  applyCam(ctx, cam, .7); for (let k = -6; k < 30; k++) { const x = k * 520; if (Math.abs(x - cam.x * .7 - 0) < 1700) tree(ctx, x, 740, .9, k + 20); }
  applyCam(ctx, cam, 1); roadSide(ctx, cam.x - 1500, cam.x + 1500, 740, 400);
}
function oldEntrance(ctx, t, x0) {
  // booth + sign over the entrance (manual control)
  rrect(ctx, x0 - 20, 380, 24, 360, 6); fillStroke(ctx, '#7d858f', 4); rrect(ctx, x0 + 560, 380, 24, 360, 6); fillStroke(ctx, '#7d858f', 4);
  rrect(ctx, x0 - 40, 330, 640, 80, 14); fillStroke(ctx, '#2a63c9', 6); text(ctx, 'ESTACIONAMENTO', x0 + 282, 372, 50, '#fff', INK, 0, 'Poppins', 700);
}
function booth(ctx, x, y) {
  rrect(ctx, x - 110, y - 280, 220, 280, 12); fillStroke(ctx, '#f2c230', 6);
  rrect(ctx, x - 125, y - 310, 250, 40, 10); fillStroke(ctx, '#e0392f', 5);
  rrect(ctx, x - 80, y - 240, 160, 100, 8); fillStroke(ctx, '#c8ecff', 5);
}
