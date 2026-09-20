// Araştırma tarayıcısında bir adresi açar (ör. eBay resmî ücret sayfası, ürün sayfası). Tek argüman: URL.
import { launchResearchBrowser, sleep } from './browser.js';
const url = process.argv[2];
if (!url || !/^https:\/\/(www\.)?(ebay|amazon|usps)\.com\//.test(url)) { console.error('Geçersiz URL'); process.exit(2); }
const ctx = await launchResearchBrowser({ headless: false });
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto(url).catch(() => {});
// Pencere kullanıcı kapatana kadar açık kalır.
await new Promise((resolve) => { ctx.on('close', resolve); const t = setInterval(() => { if (ctx.pages().length === 0) { clearInterval(t); resolve(); } }, 2000); });
await ctx.close().catch(() => {});
await sleep(100);
process.exit(0);
