// Yerel sunucu — yalnızca 127.0.0.1 üzerinden dinler. Araştırma motoru ayrı süreçte çalışır.
import express from 'express';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { APP_ROOT, PORT, HOST, HEARTBEAT_STALE_MS } from './src/config.js';
import * as db from './src/db.js';
import { CATEGORIES, CATEGORY_LIST_NOTE, findLeaf, allLeaves } from './src/categories.js';
import { EBAY_ACCOUNT_TYPES, EBAY_FEE_SOURCE_URL, EBAY_STORE_FEE_SOURCE_URL, DEFAULT_SETTINGS } from './src/fees.js';
import { buildAnalysis } from './src/profit.js';
import { decide } from './src/decision.js';
import { toCsv } from './src/csv.js';

db.openDb();
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => { // yalnızca yerel istekler
  const ip = req.socket.remoteAddress || '';
  if (!/^(127\.|::1$|::ffff:127\.)/.test(ip)) return res.status(403).json({ error: 'Yalnızca yerel bağlantılar kabul edilir' });
  res.setHeader('Cache-Control', 'no-store'); next();
});
app.use(express.static(path.join(APP_ROOT, 'public')));

const WORKER = path.join(APP_ROOT, 'src', 'engine', 'worker.js');
const children = new Map();
function spawnWorker(args, extraEnv = {}) {
  const child = spawn(process.execPath, [WORKER, ...args], { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, ...extraEnv } });
  children.set(args.join(':'), child);
  child.on('exit', (code) => {
    children.delete(args.join(':')); console.log(`[worker ${args.join(' ')}] çıkış kodu ${code}`);
    if (args[0] === 'run') { const r = db.getRun(Number(args[1])); if (r && ACTIVE.has(r.status)) db.updateRun(r.id, { status: 'interrupted', currentAction: `Motor süreci beklenmedik şekilde sonlandı (kod ${code}); "Devam et" ile sürdürülebilir` }); }
  });
  return child;
}
const isFresh = (ts) => ts && (Date.now() - Date.parse(ts)) < HEARTBEAT_STALE_MS;
const ACTIVE = new Set(['running', 'paused', 'needs_user', 'queued']);
function reconcileRuns() { // sunucu yeniden başladığında yarım kalan işleri işaretle
  for (const r of db.listRuns(50)) if (ACTIVE.has(r.status) && !isFresh(r.heartbeatAt) && !children.has(`run:${r.id}`)) db.updateRun(r.id, { status: 'interrupted', currentAction: 'Motor süreci kesildi; "Devam et" ile kaldığı yerden sürdürülebilir' });
}
reconcileRuns();
function liveWorkerBusy(excludeRunId) {
  return db.listRuns(50).some(r => r.id !== excludeRunId && !r.demo && ACTIVE.has(r.status) && (isFresh(r.heartbeatAt) || children.has(`run:${r.id}`)));
}
function enrich(product, settings, run) {
  const analysis = buildAnalysis(product, settings, run?.config?.fulfillmentModel || 'self');
  const decision = decide(product, analysis, settings);
  return { ...product, analysis, decision };
}
const wrap = (fn) => (req, res) => { try { const out = fn(req, res); if (out && typeof out.then === 'function') out.catch(e => res.status(500).json({ error: e.message })); } catch (e) { res.status(500).json({ error: e.message }); } };

app.get('/api/meta', wrap((req, res) => {
  const settings = db.getSettings();
  res.json({ categories: CATEGORIES, categoryNote: CATEGORY_LIST_NOTE, categoryChecks: db.listCategoryChecks(), settings, defaults: DEFAULT_SETTINGS,
    ebayAccountTypes: EBAY_ACCOUNT_TYPES, feeSourceUrl: EBAY_FEE_SOURCE_URL, storeFeeSourceUrl: EBAY_STORE_FEE_SOURCE_URL,
    liveBusy: liveWorkerBusy(), headless: process.env.RESEARCH_HEADLESS === '1' });
}));
app.get('/api/settings', wrap((req, res) => res.json(db.getSettings())));
app.put('/api/settings', wrap((req, res) => {
  const allowed = new Set(Object.keys(DEFAULT_SETTINGS)); const patch = {};
  for (const [k, v] of Object.entries(req.body || {})) if (allowed.has(k)) patch[k] = v;
  if (patch.ebayFeeVerified === true && !db.getSettings().ebayFeeVerified) { patch.ebayFeeCheckedAt = new Date().toISOString().slice(0, 10); patch.ebayFeeSource = 'Kullanıcı resmî eBay ücret sayfasından doğruladı: ' + EBAY_FEE_SOURCE_URL; }
  res.json(db.saveSettings(patch));
}));

app.get('/api/runs', wrap((req, res) => res.json(db.listRuns(200))));
app.post('/api/runs', wrap((req, res) => {
  const b = req.body || {};
  const leaf = findLeaf(b.mainId, b.subId, b.leafId);
  if (!leaf) return res.status(400).json({ error: 'Geçerli bir ana kategori / alt kategori / dar alt kategori seçin' });
  const demo = !!b.demo;
  if (!demo && liveWorkerBusy()) return res.status(409).json({ error: 'Zaten çalışan bir canlı araştırma var. Araştırma tarayıcısı tek seferde bir iş yürütür.' });
  const settings = db.getSettings();
  const minMarginPct = Number(b.minMarginPct ?? settings.minMarginPct ?? 15);
  const config = { minMarginPct, productCount: Math.max(1, Math.min(200, Number(b.productCount || 25))), fulfillmentModel: b.fulfillmentModel === 'warehouse' ? 'warehouse' : 'self' };
  if (minMarginPct !== settings.minMarginPct) db.saveSettings({ minMarginPct });
  const run = db.createRun({ category: leaf, config, settings: { ...settings, minMarginPct }, demo });
  db.addEvent(run.id, 'info', `Araştırma oluşturuldu: ${leaf.mainLabel} › ${leaf.subLabel} › ${leaf.leafLabel}${demo ? ' [DEMO MODU — örnek veri]' : ''}`);
  spawnWorker(['run', String(run.id)]);
  res.json(db.getRun(run.id));
}));
app.get('/api/runs/:id', wrap((req, res) => {
  const run = db.getRun(Number(req.params.id)); if (!run) return res.status(404).json({ error: 'Bulunamadı' });
  const settings = db.getSettings();
  if (ACTIVE.has(run.status) && !isFresh(run.heartbeatAt) && !children.has(`run:${run.id}`) && run.status !== 'queued') { db.updateRun(run.id, { status: 'interrupted', currentAction: 'Motor süreci kesildi' }); }
  const products = db.listProducts(run.id).map(p => enrich(p, settings, run));
  res.json({ ...db.getRun(run.id), products, events: db.listEvents(run.id, 60) });
}));
app.delete('/api/runs/:id', wrap((req, res) => { const run = db.getRun(Number(req.params.id)); if (run && ACTIVE.has(run.status)) return res.status(409).json({ error: 'Çalışan araştırma silinemez' }); db.deleteRun(Number(req.params.id)); res.json({ ok: true }); }));
app.post('/api/runs/:id/command', wrap((req, res) => {
  const id = Number(req.params.id); const run = db.getRun(id); if (!run) return res.status(404).json({ error: 'Bulunamadı' });
  const cmd = req.body?.command;
  if (!['pause', 'resume', 'stop'].includes(cmd)) return res.status(400).json({ error: 'Geçersiz komut' });
  const alive = isFresh(run.heartbeatAt) || children.has(`run:${id}`);
  if (cmd === 'resume' && (run.status === 'interrupted' || !alive) && run.status !== 'completed') {
    if (!run.demo && liveWorkerBusy(id)) return res.status(409).json({ error: 'Başka bir canlı araştırma çalışıyor' });
    db.updateRun(id, { status: 'queued', command: null, userNotice: null });
    spawnWorker(['run', String(id)]);
    return res.json(db.getRun(id));
  }
  if (cmd === 'stop' && !alive) { db.updateRun(id, { status: 'stopped', finishedAt: db.now(), command: null }); return res.json(db.getRun(id)); }
  db.setRunCommand(id, cmd);
  db.addEvent(id, 'info', `Kullanıcı komutu: ${cmd}`);
  res.json(db.getRun(id));
}));
app.get('/api/runs/:id/events', wrap((req, res) => res.json(db.listEvents(Number(req.params.id), 300))));

app.get('/api/runs/:id/export.csv', wrap((req, res) => {
  const run = db.getRun(Number(req.params.id)); if (!run) return res.status(404).send('Bulunamadı');
  const settings = db.getSettings();
  const rows = db.listProducts(run.id).map(p => enrich(p, settings, run)).map(p => {
    const s = p.ebay?.stats || {}; const a = p.analysis; const c = a.selected.conservative; const b = a.selected.base;
    return {
      'Ürün adı': p.title, 'ASIN': p.asin, 'Kategori': run.category.mainLabel + ' / ' + run.category.subLabel + ' / ' + run.category.leafLabel,
      'Amazon fiyatı (USD)': p.amazon?.price, 'Koşullu fiyat notu': p.amazon?.conditionalPrice?.note || '', 'Toplam alış maliyeti (USD)': c.ok ? (c.costs.amazonPrice + c.costs.amazonTax + c.costs.inbound) : '',
      'Amazon bağlantısı': p.url, 'eBay medyan toplam (USD)': s.medianTotal, 'eBay temkinli toplam (USD)': s.q1Total,
      'Satılmış ilan (90g)': s.exactSold90, 'Satılmış ilan (30g)': s.exactSold30, 'Farklı satıcı': s.distinctSellers ?? 'doğrulanamadı', 'Dönem': s.dateRange ? `${s.dateRange.from} – ${s.dateRange.to}` : '',
      'eBay kanıt bağlantıları': (p.ebay?.sold?.listings || []).filter(l => l.match?.verdict === 'exact').slice(0, 5).map(l => l.url).join(' '),
      'Önerilen ürün fiyatı (temkinli, USD)': c.ok ? c.itemPrice : '', 'Müşteriden kargo (USD)': c.ok ? c.shippingCharged : '', 'Toplam gider (temkinli, USD)': c.ok ? c.totalCosts : '',
      'Net kâr temkinli (USD)': c.ok ? c.netProfit : '', 'Net marj temkinli (%)': c.ok ? c.marginPct : '', 'Net kâr baz (USD)': b.ok ? b.netProfit : '', 'Net marj baz (%)': b.ok ? b.marginPct : '',
      'Stres testi kâr (USD)': a.selected.stress.ok ? a.selected.stress.netProfit : '', 'Stres testi marj (%)': a.selected.stress.ok ? a.selected.stress.marginPct : '',
      'Azami alış fiyatı (USD)': c.ok ? c.maxBuyPrice : '', 'Gönderim modeli': run.config.fulfillmentModel === 'warehouse' ? `Ara depo (${settings.warehouseFee} USD)` : 'Kendim gönderiyorum',
      'Son kontrol': p.checkedAt, 'Karar': p.decision.label, 'Gerekçe': p.decision.reasons.join(' | '), 'Tahmini/eksik': [...a.estimated, ...a.missingInfo].join(' | '), 'Demo': run.demo ? 'EVET (örnek veri)' : '',
    };
  });
  const headers = rows.length ? Object.keys(rows[0]) : ['Ürün adı'];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="arastirma-${run.id}.csv"`);
  res.send(toCsv(headers, rows));
}));

app.get('/api/products/:id', wrap((req, res) => {
  const p = db.getProduct(Number(req.params.id)); if (!p) return res.status(404).json({ error: 'Bulunamadı' });
  const run = db.getRun(p.runId);
  res.json({ ...enrich(p, db.getSettings(), run), observations: db.listObservations(p.id), run: { id: run.id, category: run.category, config: run.config, demo: run.demo } });
}));
app.put('/api/products/:id/overrides', wrap((req, res) => {
  const p = db.getProduct(Number(req.params.id)); if (!p) return res.status(404).json({ error: 'Bulunamadı' });
  const allowed = ['shippingCharged', 'outboundCost', 'outboundVerified', 'inboundCost', 'weightOz', 'matchVerdict', 'note'];
  const ov = { ...p.overrides };
  for (const k of allowed) if (k in (req.body || {})) { const v = req.body[k]; if (v === null || v === '' || v === undefined) delete ov[k]; else ov[k] = v; }
  ov.updatedAt = db.now();
  const updated = db.updateProduct(p.id, { overrides: ov });
  res.json(enrich(updated, db.getSettings(), db.getRun(p.runId)));
}));

app.post('/api/recheck', wrap((req, res) => {
  const ids = (req.body?.productIds || []).map(Number).filter(Boolean);
  if (!ids.length) return res.status(400).json({ error: 'Ürün seçin' });
  const first = db.getProduct(ids[0]); const run = first ? db.getRun(first.runId) : null;
  const demo = !!run?.demo;
  if (!demo && liveWorkerBusy()) return res.status(409).json({ error: 'Araştırma tarayıcısı meşgul; canlı araştırma bitince deneyin' });
  const job = db.createRecheckJob(ids, demo);
  spawnWorker(['recheck', String(job.id)]);
  res.json(job);
}));
app.get('/api/recheck', wrap((req, res) => res.json(db.listRecheckJobs(10))));

app.post('/api/categories/:leafId/check', wrap((req, res) => {
  const leaf = allLeaves().find(l => l.id === req.params.leafId); if (!leaf) return res.status(404).json({ error: 'Kategori yok' });
  const demo = !!req.body?.demo;
  if (!demo && liveWorkerBusy()) return res.status(409).json({ error: 'Araştırma tarayıcısı meşgul' });
  const child = spawnWorker(['check-category', leaf.id], demo ? { RESEARCH_DEMO: '1' } : {});
  child.on('exit', () => {});
  res.json({ started: true });
}));
app.post('/api/open-url', wrap((req, res) => {
  const url = String(req.body?.url || '');
  if (!/^https:\/\/(www\.)?(ebay|amazon|usps)\.com\//.test(url)) return res.status(400).json({ error: 'Yalnızca ebay.com / amazon.com / usps.com adresleri açılabilir' });
  spawn(process.execPath, [path.join(APP_ROOT, 'src', 'engine', 'open-url.js'), url], { stdio: 'ignore', detached: true, env: process.env }).unref();
  res.json({ ok: true });
}));

app.listen(PORT, HOST, () => {
  console.log(`\n  Amazon → eBay Ürün Araştırma  →  http://${HOST}:${PORT}\n  Veri dizini: ${path.join(APP_ROOT, 'data')}\n`);
});
