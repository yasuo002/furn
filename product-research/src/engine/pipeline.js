// Araştırma motoru: arayüzden bağımsız, ayrı süreçte çalışır; durumunu SQLite'a yazar.
import { getRun, updateRun, getSettings, insertProduct, listProducts, updateProduct, addObservation, addEvent, now, productAsinsForRun, getProduct } from '../db.js';
import { launchResearchBrowser, politeGoto, randomDelay, sleep, StopSignal, saveDebugSnapshot } from './browser.js';
import { parseSearchPageInBrowser, parseProductPageInBrowser, normalizeProduct, AMAZON_DP } from './amazon.js';
import { buildEbayUrl, parseEbayResultsInBrowser, normalizeListing, buildQueries } from './ebay.js';
import { matchListing, summarizeEbay, matchSummary } from '../matcher.js';
import { assessRisk } from '../risk.js';
import { buildAnalysis } from '../profit.js';
import { decide } from '../decision.js';
import { effectiveProduct } from '../effective.js';

const MAX_SEARCH_PAGES = 5;

export function computeProgress(runId, settings, run) {
  const products = listProducts(runId);
  const p = { found: products.length, compared: 0, eligible: 0, conditional: 0, rejected: 0, missing: 0 };
  for (const pr of products) {
    if (['done', 'error', 'blocked', 'risk'].includes(pr.status)) p.compared++;
    const eff = effectiveProduct(pr);
    const d = decide(eff, buildAnalysis(eff, settings, run?.config?.fulfillmentModel || 'self'), settings).decision;
    if (d === 'eligible') p.eligible++; else if (d === 'conditional') p.conditional++; else if (d === 'rejected') p.rejected++; else if (pr.status !== 'pending' && pr.status !== 'amazon_done') p.missing++;
  }
  return p;
}

export async function runResearch(runId) {
  let run = getRun(runId);
  if (!run) throw new Error('Araştırma bulunamadı: ' + runId);
  const settings = getSettings();
  const log = (msg, level = 'info') => { addEvent(runId, level, msg); console.log(`[run ${runId}] ${msg}`); };
  const setAction = (a) => updateRun(runId, { currentAction: a, heartbeatAt: now() });
  updateRun(runId, { status: 'running', startedAt: run.startedAt || now(), workerPid: process.pid, heartbeatAt: now(), command: null, userNotice: null, error: null });
  const hb = setInterval(() => { try { updateRun(runId, { heartbeatAt: now() }); } catch {} }, 5000);

  // Duraklat / devam / durdur kapısı — her adım arasında çağrılır.
  const gate = async () => {
    for (;;) {
      const r = getRun(runId);
      if (r.command === 'stop') throw new StopSignal();
      if (r.command === 'pause') { updateRun(runId, { status: 'paused', command: null, currentAction: 'Duraklatıldı' }); log('Duraklatıldı'); }
      const r2 = getRun(runId);
      if (r2.status === 'paused') { await sleep(1000); const r3 = getRun(runId); if (r3.command === 'resume') { updateRun(runId, { status: 'running', command: null }); log('Devam ediliyor'); return; } if (r3.command === 'stop') throw new StopSignal(); continue; }
      return;
    }
  };
  // Engel/CAPTCHA: kullanıcı müdahalesini bekle
  const waitForUser = async (block) => {
    updateRun(runId, { status: 'needs_user', userNotice: block.message, currentAction: 'Kullanıcı müdahalesi bekleniyor' });
    log('Kullanıcı müdahalesi bekleniyor: ' + block.message, 'warn');
    for (;;) {
      await sleep(1500);
      const r = getRun(runId);
      if (r.command === 'stop') throw new StopSignal();
      if (r.command === 'resume') { updateRun(runId, { status: 'running', command: null, userNotice: null }); log('Kullanıcı devam etti; sayfa yeniden deneniyor'); return 'retry'; }
    }
  };

  let context;
  try {
    setAction('Araştırma tarayıcısı başlatılıyor');
    context = await launchResearchBrowser({ demo: run.demo });
    const page = context.pages()[0] || await context.newPage();
    const gotoOpts = { settings, onBlocked: waitForUser, log };

    // ---- 1. Amazon listeleme ----
    const target = Number(run.config.productCount || 25);
    let existing = productAsinsForRun(runId).filter(Boolean);
    if (existing.length < target && !run.progress.discoveryDone) {
      let url = run.category.url; let pageNo = 1; let position = existing.length;
      const seen = new Set(existing);
      while (url && seen.size < target && pageNo <= MAX_SEARCH_PAGES) {
        await gate();
        setAction(`Amazon listesi taranıyor: ${run.category.leafLabel} (sayfa ${pageNo})`);
        const res = await politeGoto(page, url, gotoOpts);
        if (!res.ok) { log(`Amazon listesi alınamadı: ${res.error}`, 'error'); updateRun(runId, { userNotice: `Amazon kategori listesi alınamadı: ${res.error}. İnternet bağlantısını ve tarayıcı penceresini kontrol edin; araştırma tamamlanmış sayılmaz.` }); break; }
        const parsed = await page.evaluate(parseSearchPageInBrowser);
        if (!parsed.layoutOk) { const snap = await saveDebugSnapshot(page, 'amazon-search'); log(`Amazon arama sayfası yapısı tanınamadı (ürün kartı bulunamadı). Site yapısı değişmiş olabilir. Anlık görüntü: ${snap}`, 'error'); updateRun(runId, { userNotice: 'Amazon arama sayfası yapısı tanınamadı; sonuç kartları bulunamadı. Tarayıcıdaki sayfayı kontrol edin.' }); break; }
        let added = 0;
        for (const it of parsed.items) {
          if (it.sponsored || !it.asin || seen.has(it.asin)) continue;
          if (seen.size >= target) break;
          seen.add(it.asin); position++;
          const pid = insertProduct(runId, { position, asin: it.asin, url: AMAZON_DP(it.asin), title: it.title });
          updateProduct(pid, { amazon: { access: 'pending', listing: { priceText: it.priceText, rating: it.rating, boughtText: it.boughtText, listUrl: it.url } } });
          added++;
        }
        log(`Sayfa ${pageNo}: ${parsed.items.length} kart, ${added} yeni ürün (sponsorlu/yinelenen atlandı)`);
        updateRun(runId, { progress: { ...computeProgress(runId, settings, run), discoveryDone: false } });
        url = parsed.nextUrl; pageNo++;
        if (url && seen.size < target) await randomDelay(settings);
      }
      updateRun(runId, { progress: { ...computeProgress(runId, settings, run), discoveryDone: true } });
      if (seen.size === 0) { log('Hiç ürün bulunamadı.', 'warn'); const r0 = getRun(runId); updateRun(runId, { status: 'error', error: r0.userNotice || 'Kategori sayfasında hiç ürün bulunamadı', finishedAt: now(), currentAction: 'Ürün bulunamadı' }); return; }
    }

    // ---- 2. Ürün bazında Amazon detayı + eBay karşılaştırması ----
    for (const pr of listProducts(runId)) {
      if (pr.status === 'done' || pr.status === 'risk') continue;
      await gate();
      try {
        await processProduct({ page, product: getProduct(pr.id), run, settings, log, setAction, gotoOpts });
      } catch (e) {
        if (e instanceof StopSignal) throw e;
        log(`Ürün ${pr.asin} işlenemedi: ${e.message}`, 'error');
        updateProduct(pr.id, { status: 'error', error: e.message.split('\n')[0] });
      }
      updateRun(runId, { progress: { ...computeProgress(runId, settings, run), discoveryDone: true } });
      await randomDelay(settings);
    }
    const prog = computeProgress(runId, settings, run);
    updateRun(runId, { status: 'completed', finishedAt: now(), currentAction: 'Tamamlandı', progress: { ...prog, discoveryDone: true } });
    log(`Tamamlandı: ${prog.found} ürün, uygun ${prog.eligible}, koşullu ${prog.conditional}, elenen ${prog.rejected}, veri eksik ${prog.missing}` + (prog.eligible === 0 ? ' — UYGUN ÜRÜN BULUNAMADI' : ''));
  } catch (e) {
    if (e instanceof StopSignal) { updateRun(runId, { status: 'stopped', finishedAt: now(), currentAction: 'Durduruldu', command: null }); log('Kullanıcı durdurdu'); }
    else { updateRun(runId, { status: 'error', error: e.message, finishedAt: now(), currentAction: 'Hata' }); log('Motor hatası: ' + e.message, 'error'); }
  } finally {
    clearInterval(hb);
    if (context) await context.close().catch(() => {});
  }
}

export async function fetchAmazonProduct({ page, url, gotoOpts }) {
  const res = await politeGoto(page, url, gotoOpts);
  if (!res.ok) return { access: res.blocked ? 'blocked' : 'error', note: res.error, checkedAt: now() };
  const raw = await page.evaluate(parseProductPageInBrowser);
  const az = normalizeProduct(raw, now());
  if (!az.layoutOk) { const snap = await saveDebugSnapshot(page, 'amazon-product'); az.access = 'unverified'; az.note = `Amazon ürün sayfası yapısı tanınamadı (başlık bulunamadı). Anlık görüntü: ${snap}`; }
  return az;
}

export async function processProduct({ page, product, run, settings, log, setAction, gotoOpts }) {
  const pid = product.id;
  let az = product.amazon && product.amazon.access === 'ok' && product.status === 'amazon_done' ? product.amazon : null;
  if (!az) {
    setAction(`Amazon ürün sayfası: ${product.asin}`);
    az = await fetchAmazonProduct({ page, url: product.url, gotoOpts });
    az.listing = product.amazon?.listing || null;
    addObservation(pid, 'amazon', az, az.checkedAt);
    if (az.access !== 'ok') {
      updateProduct(pid, { amazon: az, status: az.access === 'blocked' ? 'blocked' : 'error', error: az.note, checkedAt: az.checkedAt });
      log(`${product.asin}: Amazon verisi alınamadı (${az.note})`, 'warn');
      return;
    }
    const risk = assessRisk({ title: az.title, brand: az.brand, bullets: az.bullets, details: az.details, availability: az.availability });
    updateProduct(pid, { amazon: az, title: az.title || product.title, risk, status: risk.flagged ? 'risk' : 'amazon_done', checkedAt: az.checkedAt });
    if (az.unverified.length) log(`${product.asin}: doğrulanamayan alanlar: ${az.unverified.join(', ')}`);
    if (risk.flagged) { log(`${product.asin}: risk nedeniyle elendi (${risk.reasons.join('; ')})`); return; }
    await randomDelay(settings);
  }

  // ---- eBay ----
  const queries = buildQueries(az);
  const amazonInfo = { title: az.title, brand: az.brand, model: az.model, upc: az.upc, packCount: az.packCount, color: az.variant?.color, size: az.variant?.size, variantCount: az.variant?.count };
  const ebay = { checkedAt: now(), queries: [], sold: null, active: null, stats: null, matchSummary: null, access: 'ok', note: null, windowNote: 'eBay arama sonuçları yaklaşık son 90 günü kapsar; 30 ve 90 günlük sayımlar ilan tarihlerinden hesaplanır.' };
  let best = null;
  const minSold = Number(settings.demandMinSold90 ?? 5);
  for (const q of queries) {
    setAction(`eBay satılmış ilanlar (${q.type}): ${q.q}`);
    const listings = []; let pageNo = 1; let hasMore = false; let blocked = null; let itemsSeen = 0;
    const maxPages = Math.max(1, Number(settings.ebayMaxResultPages || 1));
    while (pageNo <= maxPages) {
      const url = buildEbayUrl(q.q, { sold: true, page: pageNo });
      const res = await politeGoto(page, url, gotoOpts);
      if (!res.ok) { blocked = res; break; }
      const parsed = await page.evaluate(parseEbayResultsInBrowser);
      if (!parsed.layout && !parsed.noResults) { const snap = await saveDebugSnapshot(page, 'ebay-search'); ebay.queries.push({ ...q, url, error: 'eBay sonuç sayfası yapısı tanınamadı' }); log(`${product.asin}: eBay sayfa yapısı tanınamadı. Anlık görüntü: ${snap}`, 'warn'); ebay.access = 'unverified'; ebay.note = `eBay sonuç sayfası yapısı tanınamadı (anlık görüntü: ${snap})`; break; }
      itemsSeen += parsed.items.length;
      for (const raw of parsed.items) { if (raw.sponsored) continue; const l = normalizeListing(raw, { sold: true }); l.match = matchListing(amazonInfo, l); l.query = q.type; listings.push(l); }
      hasMore = parsed.hasNext; ebay.queries.push({ ...q, url, page: pageNo, items: parsed.items.length, resultCountText: parsed.resultCountText });
      if (!hasMore) break;
      pageNo++; await randomDelay(settings);
    }
    if (blocked) { ebay.access = 'blocked'; ebay.note = blocked.error; ebay.queries.push({ ...q, error: blocked.error }); break; }
    const exactCount = listings.filter(l => l.match.verdict === 'exact').length;
    const cand = { query: q, listings, hasMore, itemsSeen };
    if (!best || exactCount > best.listings.filter(l => l.match.verdict === 'exact').length) best = cand;
    log(`${product.asin}: eBay "${q.q}" → ${listings.length} satılmış ilan, ${exactCount} birebir`);
    if (exactCount >= minSold) break;
    await randomDelay(settings);
  }
  if (ebay.access === 'blocked') { updateProduct(pid, { ebay, status: 'blocked', error: ebay.note }); addObservation(pid, 'ebay', ebay, ebay.checkedAt); return; }
  const soldListings = best ? best.listings : [];
  ebay.sold = { listings: soldListings, itemsExamined: best ? best.itemsSeen : 0, hasMore: best ? best.hasMore : false, query: best ? best.query : null,
    coverageNote: best && best.hasMore ? 'Sonuçların yalnızca ilk sayfası incelendi; 90 günlük kapsam eksik olabilir.' : 'Görünen tüm sonuçlar incelendi.' };

  // aktif rakipler
  let activeListings = [];
  if (best && soldListings.some(l => l.match.verdict !== 'mismatch')) {
    await randomDelay(settings);
    setAction(`eBay aktif rakipler: ${best.query.q}`);
    const url = buildEbayUrl(best.query.q, { sold: false, sortLowest: true, perPage: 60 });
    const res = await politeGoto(page, url, gotoOpts);
    if (res.ok) {
      const parsed = await page.evaluate(parseEbayResultsInBrowser);
      activeListings = parsed.items.filter(r => !r.sponsored).map(r => { const l = normalizeListing(r, { sold: false }); l.match = matchListing(amazonInfo, l); return l; }).filter(l => l.match.verdict !== 'mismatch').slice(0, 25);
      ebay.queries.push({ type: 'active', q: best.query.q, url, items: parsed.items.length });
    } else ebay.queries.push({ type: 'active', q: best.query.q, url, error: res.error });
  }
  ebay.active = { listings: activeListings };
  const oldest = soldListings.map(l => l.soldAt).filter(Boolean).sort()[0];
  const coveragePartial = !!(best && best.hasMore && oldest && (Date.now() - Date.parse(oldest)) < 90 * 864e5);
  ebay.stats = summarizeEbay({ sold: soldListings, active: activeListings, coveragePartial });
  ebay.matchSummary = matchSummary(ebay.stats);
  addObservation(pid, 'ebay', ebay, ebay.checkedAt);
  updateProduct(pid, { ebay, status: 'done', checkedAt: ebay.checkedAt, error: null });
  const analysis = buildAnalysis(getProduct(pid), settings, run.config.fulfillmentModel);
  const d = decide(getProduct(pid), analysis, settings);
  log(`${product.asin}: ${d.label} — birebir satış(90g) ${ebay.stats.exactSold90}, medyan ${ebay.stats.medianTotal ?? '—'} USD, temkinli marj ${analysis.selected.conservative.ok ? analysis.selected.conservative.marginPct + '%' : '—'}`);
}

// Yeniden kontrol: seçili ürünlerin Amazon fiyat/stok bilgisini yeni gözlem olarak kaydeder (eski sonucu silmez).
export async function runRecheck(job, { updateJob }) {
  const settings = getSettings();
  const log = (m) => { console.log(`[recheck ${job.id}] ${m}`); updateJob({ message: m, heartbeatAt: now() }); };
  let context;
  try {
    updateJob({ status: 'running' });
    context = await launchResearchBrowser({ demo: job.demo });
    const page = context.pages()[0] || await context.newPage();
    const gotoOpts = { settings, log, onBlocked: async () => 'abort' };
    for (const pid of job.productIds) {
      const pr = getProduct(pid); if (!pr) continue;
      log(`Yeniden kontrol: ${pr.asin}`);
      const az = await fetchAmazonProduct({ page, url: pr.url, gotoOpts });
      az.listing = pr.amazon?.listing || null;
      addObservation(pid, 'amazon_recheck', az, az.checkedAt);
      if (az.access === 'ok') {
        const risk = assessRisk({ title: az.title, brand: az.brand, bullets: az.bullets, details: az.details, availability: az.availability });
        updateProduct(pid, { amazon: { ...az, previousPrice: pr.amazon?.price ?? null, previousCheckedAt: pr.amazon?.checkedAt ?? null }, risk, checkedAt: az.checkedAt });
      } else updateProduct(pid, { amazon: { ...(pr.amazon || {}), recheckNote: az.note, recheckAt: az.checkedAt } });
      await randomDelay(settings);
    }
    updateJob({ status: 'completed', message: `${job.productIds.length} ürün yeniden kontrol edildi` });
  } catch (e) {
    updateJob({ status: 'error', message: e.message });
  } finally { if (context) await context.close().catch(() => {}); }
}
