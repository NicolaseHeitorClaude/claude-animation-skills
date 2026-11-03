// run from the project folder:  node tools/render.js stills 1.5,3.2 | range f0 f1 out.mp4
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
(async () => {
  const mode = process.argv[2];
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => { console.log('[err]', e.message); process.exitCode = 2; });
  await page.goto('file://' + process.cwd() + '/web/index.html');
  await page.evaluate(async () => { await document.fonts.load('700 40px Poppins'); await document.fonts.load('500 40px JBMono'); });
  const total = await page.evaluate(() => window.TOTAL_FRAMES);
  if (mode === 'stills') {
    fs.mkdirSync('stills', { recursive: true });
    for (const t of process.argv[3].split(',').map(Number)) {
      const d = await page.evaluate(f => { renderFrame(f); return grab(.9); }, Math.round(t * 30));
      fs.writeFileSync(`stills/s_${t.toFixed(2)}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
    }
  } else if (mode === 'range') {
    const f0 = +process.argv[3], f1 = Math.min(total, +process.argv[4]), outF = process.argv[5];
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', outF + '.part.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = f0; f < f1; f++) {
      const d = await page.evaluate(f => { renderFrame(f); return grab(.94); }, f);
      if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      if ((f - f0) % 150 === 0) console.log(`${outF} frame ${f - f0}/${f1 - f0} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); const code = await new Promise(r => ff.on('close', r));
    if (code === 0) fs.renameSync(outF + '.part.mp4', outF); else { console.log('ffmpeg failed'); process.exitCode = 1; }
  } else if (mode === 'frames') { console.log(total); }
  await browser.close();
})();
