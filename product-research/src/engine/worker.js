// Araştırma motoru süreci. Kullanım: node src/engine/worker.js run <runId> | recheck <jobId> | check-category <leafId>
import { runResearch, runRecheck } from './pipeline.js';
import { getRecheckJob, updateRecheckJob, saveCategoryCheck, openDb } from '../db.js';
import { allLeaves } from '../categories.js';
import { launchResearchBrowser, politeGoto } from './browser.js';
import { parseSearchPageInBrowser } from './amazon.js';

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
} else { console.error('Kullanım: worker.js run <runId> | recheck <jobId> | check-category <leafId>'); process.exit(2); }
process.exit(0);
