// ---------- compositor: shots, crossfades, subtitles (2 lines max), grade ----------
const canvas = document.getElementById('c'); canvas.width = W; canvas.height = H;
const out = canvas.getContext('2d');
const bufA = document.createElement('canvas'); bufA.width = W; bufA.height = H; const actx = bufA.getContext('2d');
const DUR = TOTAL; const TOTAL_FRAMES = Math.round(DUR * FPS);
const XF = .45; // crossfade length (s) for tr:'fade'
function renderShot(ctx, i, t) {
  const s = SHOTS[i];
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.save(); s.draw(ctx, t - s.start, t); ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
// subtitles: Poppins, white on a dark rounded box, centred, wrapped into at most 2 balanced lines
function wrap2(ctx, str, maxW) {
  if (ctx.measureText(str).width <= maxW) return [str];
  const w = str.split(' '); let best = null;
  for (let k = 1; k < w.length; k++) { const a = w.slice(0, k).join(' '), b = w.slice(k).join(' '); const m = Math.max(ctx.measureText(a).width, ctx.measureText(b).width); if (!best || m < best[0]) best = [m, a, b]; }
  return [best[1], best[2]];
}
function drawSubs(ctx, t) {
  const c = CUES.find(c => t >= c.s && t < c.e); if (!c) return;
  const a = Math.min(clamp((t - c.s) / .12), clamp((c.e - t) / .12));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a;
  const size = 44; ctx.font = `700 ${size}px Poppins`;
  const lines = wrap2(ctx, c.text, 1400); const lh = size * 1.28;
  const wmax = Math.max(...lines.map(l => ctx.measureText(l).width));
  const bh = lines.length * lh + 26, by = H - 58 - bh;
  rrect(ctx, W / 2 - wmax / 2 - 30, by, wmax + 60, bh, 18); ctx.fillStyle = 'rgba(14,12,24,.74)'; ctx.fill();
  lines.forEach((l, k) => text(ctx, l, W / 2, by + 13 + lh * (k + .5) + 2, size, '#ffffff', INK, 0, 'Poppins', 700));
  ctx.restore();
}
function grade(ctx) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(W / 2, H / 2, 600, W / 2, H / 2, 1200); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,5,20,.22)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function renderFrame(f) {
  const t = f / FPS; performanceT = t;
  let i = SHOTS.findIndex(s => t >= s.start && t < s.end); if (i < 0) i = SHOTS.length - 1;
  const s = SHOTS[i], nx = SHOTS[i + 1];
  renderShot(out, i, t);
  // crossfade into the next shot
  if (nx && s.tr === 'fade' && t > s.end - XF) {
    renderShot(actx, i + 1, t); out.save(); out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = ease((t - (s.end - XF)) / XF); out.drawImage(bufA, 0, 0); out.restore();
  }
  grade(out);
  if (window.OVERLAY) OVERLAY(out, t);
  drawSubs(out, t);
}
window.renderFrame = renderFrame; window.TOTAL_FRAMES = TOTAL_FRAMES; window.DUR = DUR;
window.grab = (q = .93) => canvas.toDataURL('image/jpeg', q);
