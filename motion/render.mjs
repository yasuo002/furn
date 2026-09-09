/* Bir overlay HTML'ini kare kare saydam PNG olarak render eder.
   Kullanim:
     node render.mjs <cikis_klasoru> --html <overlay.html> [--fps 30] [--dur 27.9]
                     [--times 1,5.2,12]     # sadece bu anlari render et (onizleme)
*/
import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i > -1 ? argv[i + 1] : d; };
const here = path.dirname(new URL(import.meta.url).pathname);

const outDir = path.resolve(argv[0] || 'frames');
const htmlPath = path.resolve(arg('html', path.join(here, 'overlay.html')));
const fps  = Number(arg('fps', 30));
const dur  = Number(arg('dur', 30));
const only = arg('times', null);

const times = only
  ? only.split(',').map(Number)
  : Array.from({ length: Math.round(dur * fps) }, (_, i) => i / fps);

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  args: [
    '--force-device-scale-factor=1',
    '--disable-lcd-text',                  // saydam alfada renk saçağını önler
    '--disable-font-subpixel-positioning',
    '--font-render-hinting=none',
    '--force-color-profile=srgb',
    '--hide-scrollbars',
  ],
});
const page = await browser.newPage({
  viewport: { width: 720, height: 1280 },
  deviceScaleFactor: 1,
});
page.on('pageerror', (e) => { console.error('overlay hatasi:', e.message); process.exitCode = 1; });
await page.goto('file://' + htmlPath, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => document.documentElement.dataset.ready === '1');

const t0 = Date.now();
for (let i = 0; i < times.length; i++) {
  const t = times[i];
  await page.evaluate((v) => window.setT(v), t);
  const name = only ? `t_${t.toFixed(2)}.png` : String(i).padStart(5, '0') + '.png';
  await page.screenshot({ path: path.join(outDir, name), omitBackground: true });
  if (!only && i % 100 === 0) {
    process.stdout.write(`  ${i}/${times.length}  ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
  }
}
await browser.close();
console.log(`bitti: ${times.length} kare -> ${outDir}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
