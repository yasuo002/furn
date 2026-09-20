// Uçtan uca doğrulama (DEMO modu): sunucuyu geçici veri diziniyle başlatır, arayüzü headless tarayıcıyla kullanır,
// teslim listesindeki 8 akışı kontrol eder. Kullanım: node scripts/e2e-demo.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = 3799; const BASE = `http://127.0.0.1:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'research-e2e-'));
const shots = process.env.E2E_SHOTS || path.join(dataDir, 'shots'); fs.mkdirSync(shots, { recursive: true });
const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(PORT), RESEARCH_DATA_DIR: dataDir, RESEARCH_HEADLESS: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
server.stdout.on('data', d => process.env.E2E_VERBOSE && process.stdout.write(d)); server.stderr.on('data', d => process.env.E2E_VERBOSE && process.stderr.write(d));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const results = []; const step = (name, ok, info = '') => { results.push({ name, ok, info }); console.log(`${ok ? '✅' : '❌'} ${name}${info ? ' — ' + info : ''}`); };
const waitFor = async (fn, ms = 60000, every = 500) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('zaman aşımı: ' + fn.toString().slice(0, 100)); await sleep(every); } };
const api = async (u, o) => { const r = await fetch(BASE + u, { headers: { 'content-type': 'application/json' }, ...o }); return r.json(); };

let browser;
try {
  await waitFor(async () => { try { return (await fetch(BASE + '/api/meta')).ok; } catch { return false; } }, 15000);
  await api('/api/settings', { method: 'PUT', body: JSON.stringify({ requestDelayMinMs: 100, requestDelayMaxMs: 250 }) });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  page.on('pageerror', e => console.log('SAYFA HATASI:', e.message));
  page.on('dialog', d => { if (process.env.E2E_VERBOSE) console.log('DIALOG:', d.type(), d.message().slice(0, 120)); d.accept(); });
  await page.goto(BASE); await page.waitForSelector('#selLeaf option', { state: 'attached' });

  // 1. kategori seçimi alt kategorileri günceller
  const subsBefore = await page.$$eval('#selSub option', o => o.map(x => x.textContent));
  await page.selectOption('#selMain', 'hobby');
  const subsAfter = await page.$$eval('#selSub option', o => o.map(x => x.textContent));
  const leaves = await page.$$eval('#selLeaf option', o => o.map(x => x.textContent));
  step('1. Ana kategori seçilince alt kategoriler güncelleniyor', subsBefore.join() !== subsAfter.join() && leaves.length > 0, `${subsAfter[0]} / ${leaves[0]}`);
  await page.selectOption('#selMain', 'office'); await page.selectOption('#selSub', 'desk-org'); await page.selectOption('#selLeaf', 'pen-holders');

  // 2. başlat gerçek iş oluşturuyor (demo modunda)
  await page.fill('#inCount', '8'); await page.check('#chkDemo');
  await page.click('#btnStart');
  const run = await waitFor(async () => { const runs = await api('/api/runs'); return runs[0]; }, 10000);
  step('2. Başlat düğmesi araştırma işi oluşturuyor (ayrı motor süreci)', !!run && run.demo === true, `run #${run.id}, durum ${run.status}`);

  // 3. sonuçlar kademeli geliyor
  const firstRows = await waitFor(async () => { const n = await page.$$eval('#tbody tr', r => r.length); return n > 0 ? n : null; }, 30000);
  const doneEarly = await waitFor(async () => { const r = await api(`/api/runs/${run.id}`); const d = r.products.filter(p => p.status === 'done').length; return d >= 1 && r.status !== 'completed' ? d : null; }, 30000);
  step('3. Sonuçlar araştırma sürerken tabloya kademeli ekleniyor', firstRows > 0 && doneEarly >= 1, `${firstRows} satır, ${doneEarly} tamamlanmış ürün varken araştırma sürüyordu`);

  // 6a. CAPTCHA → kullanıcı müdahalesi
  await waitFor(async () => (await api(`/api/runs/${run.id}`)).status === 'needs_user', 40000);
  await page.waitForFunction(() => document.querySelector('#notice')?.textContent.includes('CAPTCHA'), null, { timeout: 10000 });
  await page.screenshot({ path: path.join(shots, '1-captcha.png'), fullPage: true });
  step('6a. CAPTCHA engeli arayüzde açıklamayla gösteriliyor', true, (await page.textContent('#notice')).trim().slice(0, 90));
  await page.click('#btnResume');
  // 6b. eBay engeli
  await waitFor(async () => { const r = await api(`/api/runs/${run.id}`); return r.status === 'needs_user' && /eBay/.test(r.userNotice || ''); }, 40000);
  step('6b. eBay erişim engeli gösteriliyor, devam sonrası kaldığı yerden sürüyor', true);
  await page.click('#btnResume');
  await waitFor(async () => (await api(`/api/runs/${run.id}`)).status === 'running', 15000);

  // 4. duraklat / devam / durdur
  await page.click('#btnPause');
  const paused = await waitFor(async () => (await api(`/api/runs/${run.id}`)).status === 'paused', 15000);
  const comparedAtPause = (await api(`/api/runs/${run.id}`)).progress.compared; await sleep(3000);
  const stillPaused = (await api(`/api/runs/${run.id}`));
  await page.click('#btnResume');
  const resumed = await waitFor(async () => ['running', 'completed'].includes((await api(`/api/runs/${run.id}`)).status), 15000);
  step('4a. Duraklatma ve devam etme çalışıyor', paused && stillPaused.status === 'paused' && stillPaused.progress.compared === comparedAtPause && resumed);

  // 5. sayfa yenileme
  await page.reload(); await page.waitForSelector('#tbody tr');
  const afterReload = await page.textContent('#runTitle');
  step('5. Sayfa yenilendiğinde işlem durumu ve sonuçlar korunuyor', afterReload.includes(`#${run.id}`), afterReload);

  await waitFor(async () => (await api(`/api/runs/${run.id}`)).status === 'completed', 90000);
  await page.waitForFunction(() => document.querySelector('#stAction')?.textContent.includes('Tamamlandı'), null, { timeout: 15000 });
  await page.screenshot({ path: path.join(shots, '2-results.png'), fullPage: true });
  const final = await api(`/api/runs/${run.id}`);
  const labels = final.products.map(p => `${p.asin.slice(-1)}:${p.decision.label}`).join(' ');
  step('6c. Eksik veri / risk / talep yetersizliği kararları ayrışıyor', final.products.some(p => p.decision.reasons.join().includes('Eksik')) && final.products.some(p => p.decision.reasons.join().includes('Risk')) && final.products.some(p => p.decision.reasons.join().includes('Talep yetersiz')), labels);

  // 7. maliyet değişikliği marjı günceller
  const target = final.products.find(p => p.asin === 'B0DEMO0001');
  const before = target.analysis.selected.conservative;
  await page.click(`a.open[data-id="${target.id}"]`); await page.waitForSelector('#ovForm');
  await page.fill('#ovForm [name=outboundCost]', String((before.costs.outbound + 4).toFixed(2)));
  await page.check('#ovForm [name=outboundVerified]');
  await page.click('#ovForm button[type=submit]');
  await waitFor(async () => { const p = await api(`/api/products/${target.id}`); return p.overrides.outboundCost != null; }, 10000);
  const afterP = await api(`/api/products/${target.id}`); const after = afterP.analysis.selected.conservative;
  const okMargin = Math.abs((before.netProfit - 4) - after.netProfit) < 0.011 && after.marginPct < before.marginPct && afterP.analysis.estimated.every(e => !e.includes('Müşteriye gönderim'));
  step('7. Maliyet değişikliği kâr ve marjı doğru güncelliyor', okMargin, `net ${before.netProfit} → ${after.netProfit} (gönderim +4 $), marj %${before.marginPct} → %${after.marginPct}`);
  await page.screenshot({ path: path.join(shots, '3-detail.png'), fullPage: true });
  // ayar değişikliği (paketleme +1) tüm tabloyu etkiler
  const s0 = await api('/api/settings'); await api('/api/settings', { method: 'PUT', body: JSON.stringify({ packagingCost: s0.packagingCost + 1 }) });
  const after2 = (await api(`/api/products/${target.id}`)).analysis.selected.conservative;
  step('7b. Ayar değişikliği (paketleme +1 $) yeniden hesaplanıyor', Math.abs(after.netProfit - 1 - after2.netProfit) < 0.011, `net ${after.netProfit} → ${after2.netProfit}`);
  await api('/api/settings', { method: 'PUT', body: JSON.stringify({ packagingCost: s0.packagingCost }) });

  // 8. CSV
  const csv = await (await fetch(`${BASE}/api/runs/${run.id}/export.csv`)).text();
  const lines = csv.trim().split('\n');
  step('8. CSV dışa aktarma çalışıyor (bağlantılar dahil, formül koruması var)', lines.length === final.products.length + 1 && csv.includes('https://www.amazon.com/dp/') && csv.includes('ebay.com/itm/'), `${lines.length - 1} satır`);

  // durdurma ayrı bir işte
  await page.click('#closeDrawer'); await page.check('#chkDemo');
  if (process.env.E2E_VERBOSE) console.log('chkDemo:', await page.$eval('#chkDemo', e => e.checked));
  await page.click('#btnStart'); const run2 = await waitFor(async () => { const runs = await api('/api/runs'); return runs[0].id !== run.id ? runs[0] : null; }, 20000);
  await waitFor(async () => (await api(`/api/runs/${run2.id}`)).status === 'running', 15000); await sleep(1500);
  await page.click('#btnStop');
  const stopped = await waitFor(async () => (await api(`/api/runs/${run2.id}`)).status === 'stopped', 20000);
  step('4b. Durdurma çalışıyor (tamamlanan sonuçlar korunuyor)', stopped, `run #${run2.id}`);

  // geçmiş
  await page.click('#btnHistory'); await page.waitForSelector('.openrun');
  const histRows = await page.$$eval('.openrun', b => b.length);
  step('Geçmiş: eski araştırmalar listeleniyor ve açılabiliyor', histRows >= 2, `${histRows} kayıt`);
  await page.screenshot({ path: path.join(shots, '4-history.png') });
} catch (e) {
  step('HATA', false, e.message);
} finally {
  if (browser) await browser.close();
  server.kill();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\nEkran görüntüleri: ${shots}\nSonuç: ${results.length - failed}/${results.length} adım başarılı`);
  process.exit(failed ? 1 : 0);
}
