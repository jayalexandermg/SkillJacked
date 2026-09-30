// Renders the promo deterministically via seek(t).
//
//   node render.js stills <out-dir> <t1,t2,...>
//   node render.js chunk  <out.mp4> <fromFrame> <toFrame>     (60 fps output frames)
//
// Video chunks capture 8 subframes per output frame and blend them with
// ffmpeg tmix (motion blur). Chunks are independent because every chunk starts
// on an output-frame boundary, so they concatenate losslessly.
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');

const HTML = path.join(__dirname, 'dist', 'skilljacked-promo.html');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
// SUB=16 is used for the few chunks with fast camera moves (fine text
// ghosts at 8 subframes once it moves ~20 px/frame).
const FPS = 60, SUB = Number(process.env.SUB || 8);

async function open() {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-proxy-server', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto('file://' + HTML);
  await page.waitForFunction('window.READY === true');
  return { browser, page };
}

async function stills(outDir, times) {
  fs.mkdirSync(outDir, { recursive: true });
  const { browser, page } = await open();
  for (const t of times) {
    await page.evaluate((x) => window.seek(x), t);
    await page.screenshot({ path: path.join(outDir, `t${t.toFixed(3).padStart(7, '0')}.png`) });
  }
  await browser.close();
}

async function chunk(out, from, to) {
  const { browser, page } = await open();
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-c:v', 'mjpeg', '-i', '-',
    '-vf', `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/${FPS}/TB`, '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = from; f < to; f++) {
    for (let s = 0; s < SUB; s++) {
      await page.evaluate((x) => window.seek(x), (f * SUB + s) / (FPS * SUB));
      const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    }
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg exit ' + c)))));
  await browser.close();
}

const [mode, a, b, c] = process.argv.slice(2);
(mode === 'stills' ? stills(a, b.split(',').map(Number)) : chunk(a, Number(b), Number(c)))
  .catch((e) => { console.error(e); process.exit(1); });
