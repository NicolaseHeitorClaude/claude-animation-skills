// ---------- world props: camera, sky, city, cars, parking, sensors, panel, Arduino ----------
const COL = {
  lucas: '#2f7de1', gray: '#bfc6cf', purple: '#8a5cd0', white: '#f3f2ee', brown: '#b07a45',
  yellow: '#f2c230', pink: '#e86aa6', orange: '#f08a3c', navy: '#3a4a8f',
};
const LED_R = '#ff3b30', LED_G = '#28e06a', IRC = '#d45cff', USC = '#33c8ff';
const LCD_BG = '#7fd14a', LCD_TX = '#13320e';

function applyCam(ctx, cam, p = 1) {
  const z = 1 + (cam.z - 1) * p;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(W / 2, H / 2); ctx.rotate((cam.r || 0) * p); ctx.scale(z, z);
  ctx.translate(-(W / 2 + (cam.x - W / 2) * p), -(H / 2 + (cam.y - H / 2) * p));
}
function sky(ctx, top = '#6cc4f5', bot = '#e9f6ff') {
  const g = ctx.createLinearGradient(0, -400, 0, 900); g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(-3000, -2000, 9000, 4000);
}
function sun(ctx, x, y, r, t) {
  ctx.save(); ctx.globalAlpha = .35; circle(ctx, x, y, r * 1.6 + Math.sin(t * 2) * 4); ctx.fillStyle = '#fff3b0'; ctx.fill(); ctx.restore();
  circle(ctx, x, y, r); fillStroke(ctx, '#ffd84a', 6, '#e8a92a');
}
// a strip of simple buildings for the street (repeats every 2400 px)
function cityStrip(ctx, x0, x1, base, seed = 3, scale = 1) {
  const R = rng(seed); const cols = ['#f7c59f', '#a7d3f2', '#f4e1a1', '#c9b6e8', '#f2a7a0', '#b9e3c6', '#ffd6a5'];
  const items = []; let x = -1200;
  while (x < 3600) { const w = (160 + R() * 160) * scale, h = (180 + R() * 280) * scale; items.push([x, w, h, cols[Math.floor(R() * cols.length)], R()]); x += w + (20 + R() * 40) * scale; }
  const span = 4800;
  for (const [bx, w, h, c, r] of items) {
    for (const off of [-span, 0, span]) {
      const X = bx + off; if (X + w < x0 || X > x1) continue;
      rrect(ctx, X, base - h, w, h, 8 * scale); fillStroke(ctx, c, 5 * scale);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      for (let wy = base - h + 30 * scale; wy < base - 60 * scale; wy += 62 * scale) for (let wx = X + 22 * scale; wx < X + w - 40 * scale; wx += 52 * scale) { rrect(ctx, wx, wy, 30 * scale, 36 * scale, 5 * scale); ctx.fill(); }
      ctx.fillStyle = 'rgba(40,20,60,.12)'; ctx.fillRect(X + w * .7, base - h + 4, w * .3 - 3, h - 6);
    }
  }
}
function tree(ctx, x, base, s = 1, seed = 1) {
  rrect(ctx, x - 12 * s, base - 120 * s, 24 * s, 120 * s, 6 * s); fillStroke(ctx, '#8a5a35', 5 * s);
  const R = rng(seed); ctx.beginPath();
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const r = 52 * s * (.8 + R() * .3); ctx.moveTo(x + Math.cos(a) * 40 * s + r, base - 175 * s + Math.sin(a) * 28 * s); ctx.arc(x + Math.cos(a) * 40 * s, base - 175 * s + Math.sin(a) * 28 * s, r, 0, TAU); }
  ctx.fillStyle = '#4fae5a'; ctx.fill(); ctx.lineWidth = 5 * s; ctx.strokeStyle = INK; ctx.stroke();
  ctx.save(); ctx.fill(); ctx.restore();
  ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const r = 52 * s * .8; ctx.moveTo(x + Math.cos(a) * 40 * s + r, base - 175 * s + Math.sin(a) * 28 * s); ctx.arc(x + Math.cos(a) * 40 * s, base - 175 * s + Math.sin(a) * 28 * s, r, 0, TAU); } ctx.fillStyle = '#4fae5a'; ctx.fill();
  ellipse(ctx, x - 30 * s, base - 205 * s, 30 * s, 16 * s, -.4); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill();
}
function roadSide(ctx, x0, x1, top, h = 220, dash = 0) {
  ctx.fillStyle = '#d9d4c7'; ctx.fillRect(x0, top - 40, x1 - x0, 44); line(ctx, x0, top - 40, x1, top - 40, 5);
  ctx.fillStyle = '#5d6470'; ctx.fillRect(x0, top, x1 - x0, h);
  line(ctx, x0, top, x1, top, 5);
  ctx.fillStyle = '#f5f2e8'; for (let x = Math.floor((x0 - dash) / 160) * 160 + dash; x < x1; x += 160) ctx.fillRect(x, top + h * .55, 80, 10);
}

// ---------- car, side view (faces +x, wheels on y=0, length ~410) ----------
function carSide(ctx, o) {
  const s = o.s || 1, dir = o.dir || 1, col = o.col || COL.lucas;
  ctx.save(); ctx.translate(o.x, o.y + (o.bob || 0)); ctx.scale(s * dir, s);
  ellipse(ctx, 0, 2, 215, 14); ctx.fillStyle = 'rgba(30,20,40,.22)'; ctx.fill();
  ctx.save(); ctx.rotate(o.tilt || 0);
  // cabin
  const cabin = () => { ctx.beginPath(); ctx.moveTo(-150, -112); ctx.lineTo(-112, -198); ctx.quadraticCurveTo(-105, -206, -92, -206); ctx.lineTo(48, -206); ctx.quadraticCurveTo(60, -206, 68, -198); ctx.lineTo(132, -112); ctx.closePath(); };
  cabin(); fillStroke(ctx, col, 6);
  // windows
  const winR = () => { ctx.beginPath(); ctx.moveTo(-132, -118); ctx.lineTo(-102, -192); ctx.lineTo(-36, -192); ctx.lineTo(-36, -118); ctx.closePath(); };
  const winF = () => { ctx.beginPath(); ctx.moveTo(-24, -118); ctx.lineTo(-24, -192); ctx.lineTo(52, -192); ctx.lineTo(110, -118); ctx.closePath(); };
  winR(); ctx.fillStyle = '#c8ecff'; ctx.fill(); winF(); ctx.fillStyle = '#c8ecff'; ctx.fill();
  if (o.driver) { ctx.save(); winF(); ctx.clip(); o.driver(ctx); ctx.restore(); }
  if (o.passenger) { ctx.save(); winR(); ctx.clip(); o.passenger(ctx); ctx.restore(); }
  for (const w of [winR, winF]) { ctx.save(); w(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(-60, -200); ctx.lineTo(-30, -200); ctx.lineTo(-90, -110); ctx.lineTo(-120, -110); ctx.fill(); ctx.beginPath(); ctx.moveTo(40, -200); ctx.lineTo(55, -200); ctx.lineTo(0, -110); ctx.lineTo(-15, -110); ctx.fill(); ctx.restore(); w(); fillStroke(ctx, null, 5); }
  // body
  const body = () => { rrect(ctx, -208, -122, 416, 92, [34, 40, 18, 18]); };
  body(); ctx.fillStyle = col; ctx.fill();
  ctx.save(); body(); ctx.clip(); ctx.fillStyle = 'rgba(20,10,40,.16)'; ctx.fillRect(-220, -62, 440, 40);
  if (o.stripe) { ctx.fillStyle = '#ffffff'; ctx.fillRect(-220, -92, 440, 12); }
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(-200, -116, 400, 8); ctx.restore();
  body(); fillStroke(ctx, null, 6);
  // door line + handle
  line(ctx, -32, -118, -32, -38, 4); line(ctx, -150, -112, -150, -40, 3, 'rgba(34,28,34,.5)');
  rrect(ctx, -14, -100, 30, 8, 4); fillStroke(ctx, '#e9eef2', 3);
  // lights
  ellipse(ctx, 196, -96, 14, 11); fillStroke(ctx, o.lights ? '#fff6b0' : '#fff2c4', 4);
  rrect(ctx, -212, -108, 14, 24, 5); fillStroke(ctx, o.brake ? '#ff4d3d' : '#d8473c', 4);
  if (o.brake) { ctx.save(); ctx.globalAlpha = .45; circle(ctx, -214, -96, 30); ctx.fillStyle = '#ff6a4d'; ctx.fill(); ctx.restore(); }
  if (o.lights) { ctx.save(); ctx.globalAlpha = .25; ctx.beginPath(); ctx.moveTo(205, -96); ctx.lineTo(420, -140); ctx.lineTo(420, -40); ctx.closePath(); ctx.fillStyle = '#fff6b0'; ctx.fill(); ctx.restore(); }
  // bumpers
  rrect(ctx, 168, -52, 46, 16, 7); fillStroke(ctx, '#d9dde2', 4); rrect(ctx, -216, -52, 46, 16, 7); fillStroke(ctx, '#d9dde2', 4);
  ctx.restore();
  // wheels
  for (const wx of [-128, 128]) {
    ctx.save(); ctx.translate(wx, -40); circle(ctx, 0, 0, 40); fillStroke(ctx, '#2b2730', 6);
    circle(ctx, 0, 0, 19); fillStroke(ctx, '#cfd5dc', 4); ctx.rotate((o.roll || 0) / 40);
    for (let k = 0; k < 5; k++) { ctx.rotate(TAU / 5); line(ctx, 0, 0, 0, -16, 4, '#7d858f'); }
    ctx.restore();
  }
  if (o.exhaust) { for (let k = 0; k < 3; k++) { const p = ((o.exhaust * 2 + k / 3) % 1); puff(ctx, -235 - p * 90, -40 - p * 30, 10 + p * 18, 0, '#e8e8e8', 5 + k, (1 - p) * .7); } }
  ctx.restore();
}
// driver head+shoulders inside the front window (local car coords, before car flip)
const driverFn = (who, face, extra = {}) => ctx => drawStick(ctx, C(who, Object.assign({ x: 22, y: -36, s: 150, shadow: false, face, arms: { L: [.5, -1.3], R: [.6, -1.2] } }, extra)));

// ---------- car, top view (heading +x, centre at 0, 150 x 80) ----------
function carTop(ctx, x, y, ang, col, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); const sc = o.s || 1; ctx.scale(sc, sc);
  ctx.save(); ctx.translate(7, 9); rrect(ctx, -76, -40, 152, 80, 24); ctx.fillStyle = 'rgba(25,20,35,.28)'; ctx.fill(); ctx.restore();
  // mirrors
  for (const sd of [-1, 1]) { ellipse(ctx, 22, sd * 44, 8, 6); fillStroke(ctx, col, 3); }
  rrect(ctx, -76, -40, 152, 80, 24); fillStroke(ctx, col, 4.5);
  ctx.save(); rrect(ctx, -76, -40, 152, 80, 24); ctx.clip(); ctx.fillStyle = 'rgba(20,10,40,.14)'; ctx.fillRect(-80, 14, 170, 40); ctx.restore();
  if (o.stripe) { ctx.fillStyle = '#fff'; ctx.fillRect(34, -7, 40, 14); ctx.fillRect(-74, -7, 22, 14); }
  // glass + roof
  ctx.beginPath(); ctx.moveTo(14, -30); ctx.lineTo(36, -26); ctx.lineTo(36, 26); ctx.lineTo(14, 30); ctx.closePath(); fillStroke(ctx, '#bfe7ff', 3.5);
  ctx.beginPath(); ctx.moveTo(-40, -28); ctx.lineTo(-52, -24); ctx.lineTo(-52, 24); ctx.lineTo(-40, 28); ctx.closePath(); fillStroke(ctx, '#bfe7ff', 3.5);
  rrect(ctx, -40, -30, 54, 60, 10); fillStroke(ctx, shadeCol(col, .12), 3.5);
  if (o.stripe) { ctx.fillStyle = '#fff'; ctx.fillRect(-40, -7, 54, 14); rrect(ctx, -40, -30, 54, 60, 10); fillStroke(ctx, null, 3.5); }
  // lights
  for (const sd of [-1, 1]) { ellipse(ctx, 72, sd * 26, 5, 9); fillStroke(ctx, '#fff6c0', 2.5); rrect(ctx, -78, sd * 26 - 9, 6, 18, 3); fillStroke(ctx, o.brake ? '#ff4d3d' : '#c9443a', 2.5); }
  if (o.brake) { ctx.save(); ctx.globalAlpha = .4; for (const sd of [-1, 1]) { circle(ctx, -80, sd * 26, 18); ctx.fillStyle = '#ff6a4d'; ctx.fill(); } ctx.restore(); }
  if (o.lights) { ctx.save(); ctx.globalAlpha = .18; ctx.beginPath(); ctx.moveTo(76, -30); ctx.lineTo(220, -70); ctx.lineTo(220, 70); ctx.lineTo(76, 30); ctx.closePath(); ctx.fillStyle = '#fff6b0'; ctx.fill(); ctx.restore(); }
  ctx.restore();
}
function shadeCol(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = Math.round(r * (1 - k)); g = Math.round(g * (1 - k)); b = Math.round(b * (1 - k)); return `rgb(${r},${g},${b})`; }

// ---------- icons ----------
function clockIcon(ctx, x, y, r, t, spin = 1, a = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  circle(ctx, 0, 0, r); fillStroke(ctx, '#ffffff', r * .12);
  circle(ctx, 0, 0, r * .8); ctx.lineWidth = r * .04; ctx.strokeStyle = '#d7dde6'; ctx.stroke();
  for (let k = 0; k < 12; k++) { const an = k / 12 * TAU; line(ctx, Math.cos(an) * r * .68, Math.sin(an) * r * .68, Math.cos(an) * r * .8, Math.sin(an) * r * .8, r * .05); }
  const m = t * spin * 2.2, h = m / 12;
  line(ctx, 0, 0, Math.sin(h) * r * .45, -Math.cos(h) * r * .45, r * .1); line(ctx, 0, 0, Math.sin(m) * r * .68, -Math.cos(m) * r * .68, r * .07, '#e0392f');
  circle(ctx, 0, 0, r * .08); ctx.fillStyle = INK; ctx.fill();
  // bells
  for (const sd of [-1, 1]) { ctx.save(); ctx.rotate(sd * .7); ctx.beginPath(); ctx.arc(0, -r * 1.08, r * .28, Math.PI, 0); ctx.closePath(); fillStroke(ctx, '#ffd23a', r * .08); ctx.restore(); }
  ctx.restore();
}
function qMark(ctx, x, y, s, a = 1, rot = 0) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot);
  circle(ctx, 0, 0, s * .62); fillStroke(ctx, '#ffffff', s * .08);
  text(ctx, '?', 0, s * .04, s * .9, '#7a4bc4', INK, 0, 'Poppins', 700); ctx.restore();
}
function exclaim(ctx, x, y, s, a = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  circle(ctx, 0, 0, s * .62); fillStroke(ctx, '#ffe14d', s * .08);
  text(ctx, '!', 0, s * .04, s * .9, '#e0392f', INK, 0, 'Poppins', 700); ctx.restore();
}
function bulb(ctx, x, y, s, glow = 1, a = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  if (glow > 0) { const g = ctx.createRadialGradient(0, -10 * s, 5, 0, -10 * s, 120 * s); g.addColorStop(0, `rgba(255,240,140,${.8 * glow})`); g.addColorStop(1, 'rgba(255,240,140,0)'); ctx.fillStyle = g; ctx.fillRect(-130 * s, -140 * s, 260 * s, 260 * s); }
  circle(ctx, 0, -14 * s, 38 * s); fillStroke(ctx, glow > .3 ? '#fff27a' : '#f3f0e2', 5 * s);
  rrect(ctx, -18 * s, 20 * s, 36 * s, 26 * s, 6 * s); fillStroke(ctx, '#aab2bd', 4 * s);
  line(ctx, -12 * s, 30 * s, 12 * s, 30 * s, 3 * s); line(ctx, -12 * s, 38 * s, 12 * s, 38 * s, 3 * s);
  ctx.restore();
}
function noteIcon(ctx, x, y, s, a = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  ellipse(ctx, 0, 0, 14 * s, 10 * s, -.4); ctx.fillStyle = INK; ctx.fill(); line(ctx, 12 * s, -4 * s, 12 * s, -50 * s, 5 * s);
  ctx.beginPath(); ctx.moveTo(12 * s, -50 * s); ctx.quadraticCurveTo(34 * s, -40 * s, 30 * s, -22 * s); ctx.lineWidth = 5 * s; ctx.stroke(); ctx.restore();
}
function pill(ctx, x, y, str, a = 1, size = 30, fill = '#ffffff', fg = INK) {
  if (a <= 0) return; size *= 1.35; ctx.save(); ctx.globalAlpha = a; ctx.font = `700 ${size}px Poppins`; const w = ctx.measureText(str).width + size * 1.1;
  const sc = .85 + .15 * backOut(clamp(a)); ctx.translate(x, y); ctx.scale(sc, sc);
  rrect(ctx, -w / 2, -size * .78, w, size * 1.56, size * .78); fillStroke(ctx, fill, 4);
  text(ctx, str, 0, size * .04, size, fg, INK, 0, 'Poppins', 700); ctx.restore();
}

// ---------- LCD 16x2 panel ----------
function lcdLines(state) {
  if (state === 'L') return ['ESTACIONAMENTO', 'LOTADO'];
  if (state == null) return ['', ''];
  return ['Vagas: ' + state, ''];
}
function lcd(ctx, x, y, w, state, o = {}) {
  // x,y = top-left; w = width; aspect ~ 2.6
  const h = w * .4; const L = lcdLines(state); const on = o.on == null ? 1 : o.on;
  ctx.save(); ctx.translate(x, y);
  rrect(ctx, 0, 0, w, h, w * .05); fillStroke(ctx, '#1f4fa8', w * .022);
  rrect(ctx, w * .07, h * .16, w * .86, h * .68, w * .02); fillStroke(ctx, on ? LCD_BG : '#6d8a63', w * .012);
  if (o.flash) { ctx.save(); ctx.globalAlpha = o.flash; rrect(ctx, w * .07, h * .16, w * .86, h * .68, w * .02); ctx.fillStyle = '#e9ff9a'; ctx.fill(); ctx.restore(); }
  // faint 16x2 cell grid
  ctx.save(); rrect(ctx, w * .07, h * .16, w * .86, h * .68, w * .02); ctx.clip();
  const cw = w * .86 / 16, ch = h * .68 / 2;
  ctx.fillStyle = 'rgba(20,60,10,.08)'; for (let r = 0; r < 2; r++) for (let c = 0; c < 16; c++) ctx.fillRect(w * .07 + c * cw + cw * .08, h * .16 + r * ch + ch * .1, cw * .84, ch * .8);
  if (on) {
    ctx.font = `500 ${Math.min(ch * .9, cw * 1.6)}px JBMono`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillStyle = LCD_TX;
    for (let r = 0; r < 2; r++) { const str = L[r]; for (let c = 0; c < str.length; c++) ctx.fillText(str[c], w * .07 + (c + .5) * cw, h * .16 + (r + .55) * ch); }
  }
  ctx.restore();
  if (o.label) text(ctx, o.label, w / 2, h + w * .07, w * .065, '#ffffff', INK, w * .018, 'Poppins', 700);
  ctx.restore();
}

// ---------- Arduino Mega 2560 (stylised board, top view) ----------
function arduino(ctx, x, y, w, t, o = {}) {
  const h = w * .48; ctx.save(); ctx.translate(x, y);
  if (o.glow) { ctx.save(); ctx.globalAlpha = o.glow * .6; rrect(ctx, -w * .08, -w * .08, w * 1.16, h + w * .16, w * .1); ctx.fillStyle = '#7fe0ff'; ctx.fill(); ctx.restore(); }
  rrect(ctx, 0, 0, w, h, w * .03); fillStroke(ctx, '#1677b6', w * .014);
  // headers
  ctx.fillStyle = '#20232a';
  ctx.fillRect(w * .2, h * .04, w * .7, h * .09); ctx.fillRect(w * .2, h * .87, w * .7, h * .09); ctx.fillRect(w * .9, h * .14, w * .07, h * .72);
  ctx.fillStyle = '#d9b44a'; for (let i = 0; i < 22; i++) { ctx.fillRect(w * .21 + i * w * .031, h * .07, w * .012, h * .03); ctx.fillRect(w * .21 + i * w * .031, h * .9, w * .012, h * .03); }
  // usb + jack
  rrect(ctx, -w * .03, h * .2, w * .14, h * .2, 3); fillStroke(ctx, '#c9ced6', w * .008);
  rrect(ctx, -w * .02, h * .62, w * .1, h * .18, 3); fillStroke(ctx, '#2b2730', w * .008);
  // chip
  rrect(ctx, w * .42, h * .34, w * .2, w * .2 * .9, 3); fillStroke(ctx, '#2b2730', w * .008);
  ctx.fillStyle = '#9aa3ad'; for (let i = 0; i < 6; i++) { ctx.fillRect(w * .43 + i * w * .03, h * .3, w * .012, h * .04); ctx.fillRect(w * .43 + i * w * .03, h * .34 + w * .18, w * .012, h * .04); }
  text(ctx, 'MEGA 2560', w * .28, h * .5, w * .06, '#e9f6ff', INK, 0, 'Poppins', 700);
  // power LED
  const blink = o.blink ? (Math.sin(t * 30) > 0 ? 1 : .2) : .6;
  circle(ctx, w * .82, h * .72, w * .022); ctx.fillStyle = `rgba(80,255,120,${blink})`; ctx.fill();
  circle(ctx, w * .82, h * .6, w * .018); ctx.fillStyle = o.blink ? `rgba(255,200,60,${blink})` : 'rgba(255,200,60,.3)'; ctx.fill();
  if (o.label) text(ctx, o.label, w / 2, h + w * .1, w * .085, '#ffffff', INK, w * .022, 'Poppins', 700);
  ctx.restore();
}
// HC-SR04 style ultrasonic sensor (front view), centre x,y
function usSensor(ctx, x, y, s = 1, ang = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  rrect(ctx, -34, -14, 68, 28, 5); fillStroke(ctx, '#2a63c9', 3.5);
  for (const sd of [-1, 1]) { circle(ctx, sd * 17, 0, 12); fillStroke(ctx, '#d9dee4', 3); circle(ctx, sd * 17, 0, 6); ctx.fillStyle = '#5b636d'; ctx.fill(); }
  ctx.restore();
}
function usWaves(ctx, x, y, dirAng, p, s = 1, spread = .6) {
  // p: 0..1 phase progress over the emission; 3 arcs travelling out
  ctx.save(); ctx.translate(x, y); ctx.rotate(dirAng);
  for (let k = 0; k < 3; k++) {
    const q = (p * 2.2 - k * .3); if (q < 0 || q > 1) continue;
    const r = 18 * s + q * 110 * s; ctx.globalAlpha = Math.min(1, (1 - q) * 1.4);
    ctx.beginPath(); ctx.arc(0, 0, r, -spread, spread); ctx.lineWidth = 9 * s; ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 5.5 * s; ctx.strokeStyle = USC; ctx.lineCap = 'round'; ctx.stroke();
  }
  ctx.restore();
}
function ledDot(ctx, x, y, r, col, on) {
  if (on) { ctx.save(); const g = ctx.createRadialGradient(x, y, r * .2, x, y, r * 3.2); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.globalAlpha = .55; ctx.fillStyle = g; ctx.fillRect(x - r * 3.3, y - r * 3.3, r * 6.6, r * 6.6); ctx.restore(); }
  circle(ctx, x, y, r); fillStroke(ctx, on ? col : (col === LED_R ? '#6e3632' : '#2f5a3c'), Math.max(2, r * .28));
  if (on) { circle(ctx, x - r * .3, y - r * .3, r * .3); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); }
}
// IR emitter/receiver pair post (top view) – a small box with a lens
function irPost(ctx, x, y, s = 1, flash = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rrect(ctx, -14, -14, 28, 28, 6); fillStroke(ctx, '#3b3442', 3.5);
  circle(ctx, 0, 0, 7); ctx.fillStyle = flash > 0 ? '#ffd1ff' : IRC; ctx.fill();
  ctx.restore();
}
function irBeam(ctx, x0, y0, x1, y1, a, flash = 0) {
  ctx.save(); ctx.globalAlpha = a * (.55 + .45 * flash); ctx.setLineDash([14, 10]); ctx.lineDashOffset = -performanceT * 40;
  line(ctx, x0, y0, x1, y1, 5 + flash * 5, flash > 0 ? '#ffb3ff' : IRC); ctx.setLineDash([]);
  if (flash > 0) { ctx.globalAlpha = flash * .5; line(ctx, x0, y0, x1, y1, 26, IRC); }
  ctx.restore();
}
let performanceT = 0; // set by the compositor each frame (for dash animation)
