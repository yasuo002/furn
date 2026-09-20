// Araştırma motoru süreci. Kullanım: node src/engine/worker.js run <runId> | recheck <jobId> | check-category <leafId>
import { runResearch, runRecheck } from './pipeline.js';
import { getRecheckJob, updateRecheckJob, saveCategoryCheck, openDb, saveSettings, now } from '../db.js';
import { allLeaves } from '../categories.js';
import { launchResearchBrowser, politeGoto, saveDebugSnapshot } from './browser.js';
import { parseSearchPageInBrowser } from './amazon.js';
import { buildEbayUrl, parseEbayResultsInBrowser, normalizeListing } from './ebay.js';

openDb();
const [mode, arg] = process.argv.slice(2);
if (mode === 'run') {
  await runResearch(Number(arg));
} else if (mode === 'recheck') {
  const job = getRecheckJob(Number(arg));
  if (!job) { console.error('İş bulunamadı'); process.exit(1); }
  await runRecheck(job, { updateJob: (f) => updateRecheckJob(job.id, f) });
} else if (mode === 'check-category') {
  const leaf = allLeaves().find(l => l.id === arg);
  if (!leaf) { console.error('Kategori bulunamadı'); process.exit(1); }
  const demo = process.env.RESEARCH_DEMO === '1';
  let ctx;
  try {
    ctx = await launchResearchBrowser({ demo });
    const page = ctx.pages()[0] || await ctx.newPage();
    const res = await politeGoto(page, leaf.url, { settings: {}, onBlocked: async () => 'abort' });
    if (!res.ok) saveCategoryCheck(leaf.id, false, null, res.error);
    else { const p = await page.evaluate(parseSearchPageInBrowser); const n = p.items.filter(i => !i.sponsored).length; saveCategoryCheck(leaf.id, p.layoutOk && n > 0, n, p.layoutOk ? `${n} sponsorsuz ürün kartı` : 'Sayfa yapısı tanınamadı'); }
  } catch (e) { saveCategoryCheck(leaf.id, false, null, e.message.split('\n')[0]); }
  finally { if (ctx) await ctx.close().catch(() => {}); }
} else if (mode === 'selfcheck') {
  // Canlı erişim testi: Amazon ve eBay'e ulaşılabiliyor mu, sayfa yapısı tanınıyor mu? Sonuç ayarlara yazılır.
  const demo = process.env.RESEARCH_DEMO === '1';
  const result = { status: 'running', demo, startedAt: now(), amazon: null, ebay: null };
  let ctx;
  try {
    ctx = await launchResearchBrowser({ demo });
    const page = ctx.pages()[0] || await ctx.newPage();
    const opts = { settings: {}, onBlocked: async () => 'abort' };
    const aurl = `https://www.amazon.com/s?k=${encodeURIComponent(demo ? 'pen holder desk organizer' : 'desk organizer')}&i=office-products`;
    let r = await politeGoto(page, aurl, opts);
    if (!r.ok) result.amazon = { ok: false, blocked: !!r.blocked, note: r.error, url: aurl };
    else {
      const p = await page.evaluate(parseSearchPageInBrowser);
      const items = p.items.filter(i => !i.sponsored);
      const snap = p.layoutOk ? null : await saveDebugSnapshot(page, 'selfcheck-amazon');
      result.amazon = { ok: p.layoutOk && items.length > 0, items: items.length, withPrice: items.filter(i => i.priceText).length, withTitle: items.filter(i => i.title).length, url: aurl,
        note: p.layoutOk ? `Sayfa yapısı tanındı: ${items.length} sponsorsuz ürün kartı` : `Ürün kartı bulunamadı; anlık görüntü: ${snap}` };
    }
    const eurl = buildEbayUrl(demo ? 'Marbrasse MB-PH5-BLK' : 'desk organizer', { sold: true });
    r = await politeGoto(page, eurl, opts);
    if (!r.ok) result.ebay = { ok: false, blocked: !!r.blocked, note: r.error, url: eurl };
    else {
      const p = await page.evaluate(parseEbayResultsInBrowser);
      const ls = p.items.map(x => normalizeListing(x, { sold: true }));
      const snap = p.layout ? null : await saveDebugSnapshot(page, 'selfcheck-ebay');
      result.ebay = { ok: !!p.layout && ls.length > 0, layout: p.layout, items: ls.length, withSoldDate: ls.filter(l => l.soldAt).length, withSeller: ls.filter(l => l.seller).length, withShipping: ls.filter(l => l.shippingKnown).length, withPrice: ls.filter(l => l.price != null).length, url: eurl,
        note: p.layout ? `Sayfa yapısı tanındı (${p.layout}): ${ls.length} satılmış ilan` : (p.noResults ? 'Sonuç yok' : `Sonuç kartı bulunamadı; anlık görüntü: ${snap}`) };
    }
    result.status = 'completed';
  } catch (e) { result.status = 'error'; result.error = e.message.split('\n')[0]; }
  finally { if (ctx) await ctx.close().catch(() => {}); }
  result.finishedAt = now();
  saveSettings({ lastSelfCheck: result });
} else { console.error('Kullanım: worker.js run <runId> | recheck <jobId> | check-category <leafId>'); process.exit(2); }
process.exit(0);
