// ---------- the parking system: one timeline that every shot reads (display, gate, LEDs, sensors, cars) ----------
// all times are seconds of the final video
const SPOTS = 7;
const SPOT_X = i => 645 + 170 * i, SPOT_Y = 180;            // spot centres (top view)
const DRIVE_X = 340, IR2_Y = 560, GATE_Y = 625, IR1_Y = 700, ROAD_N = 875, ROAD_S = 945;

const EV = {
  // display (LCD 16x2): number of free spaces, or 'L' = ESTACIONAMENTO LOTADO
  disp: [[0, '3'], [55.9, '2'], [84.5, '1'], [87.6, 'L'], [106.1, '1'], [107.8, 'L']],
  // gate: [start, end, target] target 1 = open, 0 = closed
  gate: [[53.6, 54.9, 1], [62.4, 63.6, 0], [84.2, 84.6, 1], [85.7, 86.1, 0], [87.3, 87.7, 1], [88.9, 89.3, 0], [104.6, 105.0, 1], [106.1, 106.5, 0], [107.6, 108.0, 1], [109.4, 109.8, 0]],
  ir1: [51.2, 84.0, 87.0, 94.5, 105.7, 107.4],
  ir2: [60.9, 85.3, 88.5, 104.4, 109.0],
  // LED per spot: [time, 'R'|'G']
  led: [[[0, 'R']], [[0, 'R']], [[0, 'G'], [76.4, 'R'], [101.6, 'G'], [111.5, 'R']], [[0, 'R']], [[0, 'G'], [87.2, 'R']], [[0, 'R']], [[0, 'G'], [91.0, 'R']]],
  // ultrasonic detections [spot, t0, t1]
  us: [[2, 74.6, 76.2], [4, 86.7, 87.2], [6, 90.4, 91.0], [2, 110.9, 111.5]],
  usScan: [80.9, 83.0],  // every spot pings in turn
  // signal pulses IR1 -> Arduino -> servo (entry authorisations) and IR2 -> Arduino -> servo (exit)
  pulse: [[51.85, 'ir1'], [84.05, 'ir1'], [87.05, 'ir1'], [94.55, 'ir1x'], [104.45, 'ir2'], [107.45, 'ir1']],
};
// ---------- state lookups ----------
function dispAt(t) { let v = null; for (const [tt, s] of EV.disp) if (t >= tt) v = s; return v; }
function dispFlash(t) { let f = 0; for (const [tt] of EV.disp) if (tt > 1 && t >= tt && t < tt + .6) f = 1 - (t - tt) / .6; return f; }
function gateAt(t) { let v = 0; for (const [a, b, g] of EV.gate) { if (t >= b) v = g; else if (t > a) { const k = ease((t - a) / (b - a)); v = g ? k : 1 - k; break; } } return v; }
function ledAt(i, t) { let v = 'G'; for (const [tt, s] of EV.led[i]) if (t >= tt) v = s; return v; }
function ledFlip(i, t) { let f = 0; for (const [tt] of EV.led[i]) if (tt > 1 && t >= tt && t < tt + .5) f = 1 - (t - tt) / .5; return f; }
function irFlash(which, t) { let f = 0; for (const tt of EV[which]) if (t >= tt && t < tt + .7) f = Math.max(f, 1 - (t - tt) / .7); return f; }
function usAt(i, t) { for (const [s, a, b] of EV.us) if (s === i && t >= a && t < b) return (t - a) / (b - a); const [a, b] = EV.usScan; const st = a + i * .22; if (t >= st && t < st + .7) return (t - st) / .7; return -1; }
function pulseAt(t) { for (const [tt, k] of EV.pulse) if (t >= tt && t < tt + 2.0) return [k, (t - tt) / 2.0]; return null; }

// ---------- top-view paths (catmull-rom through named points) ----------
function mkPath(pts) {
  const P = pts.map(p => [p[0], p[1]]), names = {}; pts.forEach((p, i) => { if (p[2]) names[p[2]] = i; });
  const out = [], idx = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    idx[i] = out.length;
    for (let k = 0; k < 24; k++) {
      const u = k / 24, u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map(j => .5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3)));
    }
  }
  idx[P.length - 1] = out.length; out.push(P[P.length - 1]);
  const len = [0]; for (let i = 1; i < out.length; i++) len.push(len[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
  const mark = {}; for (const n in names) mark[n] = len[idx[names[n]]];
  return { pts: out, len, total: len[len.length - 1], mark };
}
function posOn(path, d) {
  d = clamp(d, 0, path.total); let i = 1; while (i < path.len.length - 1 && path.len[i] < d) i++;
  const a = path.pts[i - 1], b = path.pts[i], k = (d - path.len[i - 1]) / Math.max(1e-6, path.len[i] - path.len[i - 1]);
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.atan2(b[1] - a[1], b[0] - a[0])];
}
const entryPts = i => [[2300, ROAD_N, 'east'], [1200, ROAD_N, 'appr'], [560, ROAD_N, 'wait'], [440, ROAD_N - 6], [365, 820], [DRIVE_X, IR1_Y + 72, 'stop1'], [DRIVE_X, IR2_Y - 20, 'in2'], [DRIVE_X + 8, 470], [420, 412], [560, 402, 'aisle'], [SPOT_X(i) - 150, 404], [SPOT_X(i) - 35, 375, 'pre'], [SPOT_X(i), 290], [SPOT_X(i), SPOT_Y, 'park']];
const PATHS = {
  in2: mkPath(entryPts(2)), in4: mkPath(entryPts(4)), in6: mkPath(entryPts(6)),
  outRev: mkPath([[SPOT_X(2), SPOT_Y, 'park'], [SPOT_X(2), 290], [SPOT_X(2) + 45, 378], [SPOT_X(2) + 150, 410, 'end']]),
  outFwd: mkPath([[SPOT_X(2) + 150, 410, 'start'], [SPOT_X(2) - 20, 405], [520, 402], [400, 428], [DRIVE_X + 4, IR2_Y - 75, 'exstop'], [DRIVE_X, 640], [DRIVE_X, 760, 'ir1'], [325, 840], [250, ROAD_N + 2], [60, ROAD_N], [-500, ROAD_N, 'gone']]),
};
// car schedules: [t0, t1, path, fromMark, toMark, reverse?, easing]
const CARS = {
  lucas: { col: COL.lucas, stripe: true, sched: [
    [41.6, 44.2, 'in2', 'east', 'wait', 0, 'out'],          // end of scene 3, arriving on the road
    [44.2, 51.0, 'in2', 'wait', 'stop1', 0, 'inout'],        // (side view shows this part)
    [57.2, 62.0, 'in2', 'stop1', 'in2', 0, 'in'],
    [62.0, 72.9, 'in2', 'in2', 'pre', 0, 'linout'],
    [73.0, 74.4, 'in2', 'pre', 'park', 0, 'out'],
    [100.9, 102.3, 'outRev', 'park', 'end', 1, 'inout'],
    [102.4, 104.3, 'outFwd', 'start', 'exstop', 0, 'inout'],
    [105.0, 106.0, 'outFwd', 'exstop', 'ir1', 0, 'in'],
    [106.0, 108.2, 'outFwd', 'ir1', 'gone', 0, 'lin'],
  ], start: ['in2', 'east'] },
  d: { col: COL.yellow, sched: [[82.7, 84.0, 'in4', 'appr', 'stop1', 0, 'out'], [84.65, 86.8, 'in4', 'stop1', 'park', 0, 'inout']], start: ['in4', 'east'] },
  e: { col: COL.pink, sched: [[85.4, 86.95, 'in6', 'appr', 'stop1', 0, 'out'], [87.75, 90.4, 'in6', 'stop1', 'park', 0, 'inout']], start: ['in6', 'east'] },
  c: { col: COL.orange, sched: [[93.0, 95.0, 'in2', 'east', 'wait', 0, 'out'], [106.5, 107.35, 'in2', 'wait', 'stop1', 0, 'inout'], [108.05, 110.9, 'in2', 'stop1', 'park', 0, 'inout']], start: ['in2', 'east'] },
};
const EASE = { in: t => t * t, out: t => 1 - (1 - t) * (1 - t), inout: ease, lin: t => t, linout: t => t < .8 ? t * .95 / .8 * 1.0 : .95 + (1 - Math.pow(1 - (t - .8) / .2, 2)) * .05 };
const PARKED = [[0, COL.gray], [1, COL.purple], [3, COL.white], [5, COL.brown]];
function carState(key, t) {
  const c = CARS[key]; let p = PATHS[c.start[0]], d = p.mark[c.start[1]], rev = 0, moving = 0;
  for (const [t0, t1, pn, a, b, r, e] of c.sched) {
    const P = PATHS[pn];
    if (t >= t1) { p = P; d = P.mark[b]; rev = r; continue; }
    if (t > t0) { const k = EASE[e]((t - t0) / (t1 - t0)); p = P; d = lerp(P.mark[a], P.mark[b], k); rev = r; moving = 1; }
    break;
  }
  const [x, y, ang] = posOn(p, d); return { x, y, ang: ang + (rev ? Math.PI : 0), moving, brake: !moving };
}
