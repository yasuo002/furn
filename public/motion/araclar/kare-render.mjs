import { chromium } from 'playwright-core';
const FPS = 30, DUR = 69.87, N = Math.round(DUR * FPS);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto('file:///home/user/furn/public/motion/girisim-edit.html');
await p.waitForTimeout(3000);
const st = await p.$('#stage');
for (let f = 0; f < N; f++) {
  await p.evaluate(s => window.__edit.time(s), f / FPS);
  await st.screenshot({ path: `full/f${String(f).padStart(5,'0')}.png`, omitBackground: true });
  if (f % 200 === 0) console.log(f, '/', N);
}
console.log('bitti', N);
await b.close();
