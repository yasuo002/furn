/* Arayüz: durum sunucuda tutulur; sayfa yenilense de araştırma sürer. Sadece görüntüleme + komut gönderme. */
const $ = (s) => document.querySelector(s);
const api = async (url, opts = {}) => { const r = await fetch(url, { headers: { 'content-type': 'application/json' }, ...opts }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.statusText); return j; };
const usd = (n) => n == null || !Number.isFinite(Number(n)) ? '—' : Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
const pct = (n) => n == null ? '—' : '%' + Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
const dt = (s) => s ? new Date(s).toLocaleString('tr-TR') : '—';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STATUS_TR = { queued: 'Sırada', running: 'Çalışıyor', paused: 'Duraklatıldı', needs_user: 'Kullanıcı müdahalesi gerekli', stopped: 'Durduruldu', completed: 'Tamamlandı', error: 'Hata', interrupted: 'Kesildi' };

const state = { meta: null, run: null, filter: 'all', sortKey: 'margin', sortAsc: false, selected: new Set(), openProductId: null, timer: null };
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => localStorage.setItem(k, JSON.stringify(v)) };

// ---------- kategori seçimleri ----------
function fillCategories() {
  const cats = state.meta.categories; const sel = store.get('catSel', {});
  const main = $('#selMain'), sub = $('#selSub'), leaf = $('#selLeaf');
  main.innerHTML = cats.map(c => `<option value="${c.id}">${esc(c.label)}</option>`).join('');
  if (sel.mainId) main.value = sel.mainId;
  const onMain = () => {
    const c = cats.find(x => x.id === main.value);
    sub.innerHTML = c.subs.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join('');
    if (sel.subId && c.subs.some(s => s.id === sel.subId)) sub.value = sel.subId;
    onSub();
  };
  const onSub = () => {
    const c = cats.find(x => x.id === main.value); const s = c.subs.find(x => x.id === sub.value);
    const checks = state.meta.categoryChecks || {};
    leaf.innerHTML = s.leaves.map(l => { const ck = checks[l.id]; const tag = ck ? (ck.ok ? ` ✓ (${ck.resultCount} sonuç)` : ' ✗ doğrulanamadı') : ''; return `<option value="${l.id}">${esc(l.label)}${tag}</option>`; }).join('');
    if (sel.leafId && s.leaves.some(l => l.id === sel.leafId)) leaf.value = sel.leafId;
    onLeaf();
  };
  const onLeaf = () => {
    store.set('catSel', { mainId: main.value, subId: sub.value, leafId: leaf.value });
    const c = cats.find(x => x.id === main.value); const s = c.subs.find(x => x.id === sub.value); const l = s.leaves.find(x => x.id === leaf.value);
    const ck = (state.meta.categoryChecks || {})[l.id];
    $('#catNote').innerHTML = `${esc(state.meta.categoryNote)} Sorgu: <a href="${l.url}" target="_blank" rel="noopener">${esc(decodeURIComponent(l.url))}</a>` + (ck ? ` — son doğrulama ${dt(ck.checkedAt)}: ${ck.ok ? '<span class="tag ok">geçerli</span>' : '<span class="tag no">başarısız</span>'} ${esc(ck.note || '')}` : ' — <span class="tag">henüz doğrulanmadı</span>');
  };
  main.onchange = onMain; sub.onchange = onSub; leaf.onchange = onLeaf; onMain();
}
function setupBanner() {
  const s = state.meta.settings; const items = [];
  if (!s.setupConfirmed) items.push('İlk kurulum maliyetleri onaylanmadı (Amazon alış vergisi, paketleme, operasyon, gönderim tarifesi). Ayarlar panelinden girip kaydedin.');
  if (!s.ebayFeeVerified) items.push(`eBay komisyon oranı (%${s.ebayFeeRate} + ${s.ebayFeeFixedOver10} $) resmî kaynaktan doğrulanmadı; kaynak: ${s.ebayFeeSource}. Doğrulanana kadar tüm sonuçlar "Koşullu" kalır.`);
  $('#setupBanner').innerHTML = items.length ? `<div class="banner warn">${items.map(esc).join('<br>')}</div>` : '';
}

// ---------- araştırma ----------
async function startRun() {
  const body = { mainId: $('#selMain').value, subId: $('#selSub').value, leafId: $('#selLeaf').value, minMarginPct: Number($('#inMargin').value), productCount: Number($('#inCount').value), fulfillmentModel: $('#selModel').value, demo: $('#chkDemo').checked };
  if (body.demo && !confirm('Demo/test modu: amazon.com ve ebay.com yerine sabit örnek sayfalar kullanılır. Sonuçlar GERÇEK DEĞİLDİR. Devam edilsin mi?')) return;
  try { const run = await api('/api/runs', { method: 'POST', body: JSON.stringify(body) }); store.set('currentRunId', run.id); state.selected.clear(); await refresh(); } catch (e) { alert(e.message); }
}
async function command(cmd) { if (!state.run) return; try { await api(`/api/runs/${state.run.id}/command`, { method: 'POST', body: JSON.stringify({ command: cmd }) }); await refresh(); } catch (e) { alert(e.message); } }

async function refresh() {
  const id = store.get('currentRunId', null);
  if (!id) { renderRun(null); return; }
  try { state.run = await api(`/api/runs/${id}`); } catch { state.run = null; store.set('currentRunId', null); }
  renderRun(state.run);
}
function renderRun(run) {
  const active = run && ['queued', 'running', 'paused', 'needs_user'].includes(run.status);
  $('#btnStart').disabled = false;
  $('#btnPause').disabled = !(run && run.status === 'running');
  $('#btnResume').disabled = !(run && ['paused', 'needs_user', 'interrupted'].includes(run.status));
  $('#btnStop').disabled = !active && !(run && run.status === 'interrupted');
  if (!run) { $('#runTitle').textContent = 'Araştırma yok'; $('#runMeta').textContent = ''; $('#tbody').innerHTML = ''; $('#notice').innerHTML = ''; return; }
  const c = run.category;
  $('#runTitle').textContent = `#${run.id} · ${c.mainLabel} › ${c.subLabel} › ${c.leafLabel}`;
  $('#runMeta').textContent = ` — ${STATUS_TR[run.status] || run.status} · ${run.config.productCount} ürün · min marj %${run.config.minMarginPct} · ${run.config.fulfillmentModel === 'warehouse' ? 'Ara depo' : 'Kendim gönderiyorum'} · başlangıç ${dt(run.startedAt || run.createdAt)}`;
  const p = run.progress || {};
  $('#stFound').textContent = p.found ?? 0; $('#stCompared').textContent = p.compared ?? 0; $('#stEligible').textContent = p.eligible ?? 0; $('#stConditional').textContent = p.conditional ?? 0; $('#stRejected').textContent = p.rejected ?? 0; $('#stMissing').textContent = p.missing ?? 0;
  $('#stAction').textContent = run.currentAction || STATUS_TR[run.status] || '—';
  let notice = '';
  if (run.demo) notice += `<div class="banner demo">DEMO/TEST MODU — Bu tabloda gerçek ürün, fiyat veya satış verisi YOKTUR. Yalnızca akışı doğrulamak için sabit örnek sayfalar kullanıldı.</div>`;
  if (run.status === 'needs_user') notice += `<div class="banner warn"><strong>Kullanıcı müdahalesi gerekli:</strong> ${esc(run.userNotice)}<br><span class="note">Araştırma tarayıcı penceresinde sorunu giderin (CAPTCHA, giriş, bekleme) ve "Devam et"e basın. CAPTCHA otomatik çözülmez.</span></div>`;
  else if (run.userNotice) notice += `<div class="banner warn">${esc(run.userNotice)}</div>`;
  if (run.status === 'error') notice += `<div class="banner warn">Motor hatası: ${esc(run.error)}</div>`;
  if (run.status === 'interrupted') notice += `<div class="banner warn">Motor süreci kesildi (uygulama kapanmış olabilir). "Devam et" kaldığı yerden sürdürür; tamamlanan ürünler korunur.</div>`;
  if (run.status === 'completed' && (p.eligible ?? 0) === 0) notice += `<div class="banner info">Bu araştırmada <strong>UYGUN ürün bulunamadı</strong>. Eşikler düşürülmedi, veri uydurulmadı. Koşullu adayları ve eksik maliyetleri inceleyin.</div>`;
  if (!state.meta.settings.ebayFeeVerified || !state.meta.settings.setupConfirmed) notice += `<div class="banner info">Sonuçlar tahmini/doğrulanmamış maliyet girdileri içerdiği için "Uygun" yerine "Koşullu" görünebilir; Ayarlar'dan doğrulayın.</div>`;
  $('#notice').innerHTML = notice;
  $('#log').textContent = (run.events || []).map(e => `${new Date(e.ts).toLocaleTimeString('tr-TR')} [${e.level}] ${e.message}`).join('\n');
  renderTable();
  if (state.openProductId) { const pr = run.products.find(x => x.id === state.openProductId); if (pr && $('#drawer').classList.contains('open') && !$('#drawer').dataset.editing) openDetail(pr.id, false); }
}

// ---------- tablo ----------
function rowModel(p) {
  const s = p.ebay?.stats || {}; const a = p.analysis; const c = a.selected.conservative; const b = a.selected.base;
  return { id: p.id, p, title: p.title || p.asin, cat: `${state.run.category.subLabel} / ${state.run.category.leafLabel}`, amazonPrice: p.amazon?.price ?? null,
    buyCost: c.ok ? c.costs.amazonPrice + c.costs.amazonTax + c.costs.inbound : (p.amazon?.price ?? null), median: s.medianTotal ?? null, q1: s.q1Total ?? null, sold90: s.exactSold90 ?? null, sold30: s.exactSold30 ?? null, range: s.dateRange,
    itemPrice: c.ok ? c.itemPrice : null, shipCharged: c.ok ? c.shippingCharged : null, totalCosts: c.ok ? c.totalCosts : null, net: c.ok ? c.netProfit : null, margin: c.ok ? c.marginPct : null, baseMargin: b.ok ? b.marginPct : null,
    checkedAt: p.checkedAt, decision: p.decision.decision, label: p.decision.label, reasons: p.decision.reasons, evidence: (p.ebay?.sold?.listings || []).filter(l => l.match?.verdict === 'exact').slice(0, 3) };
}
function renderTable() {
  const run = state.run; if (!run) return;
  let rows = run.products.map(rowModel);
  const total = rows.length;
  if (state.filter !== 'all') rows = rows.filter(r => r.decision === state.filter);
  const k = state.sortKey; const dir = state.sortAsc ? 1 : -1;
  rows.sort((x, y) => { const a = x[k], b = y[k]; if (a == null && b == null) return 0; if (a == null) return 1; if (b == null) return -1; return (typeof a === 'number' ? a - b : String(a).localeCompare(String(b), 'tr')) * dir; });
  document.querySelectorAll('#tbl th[data-k]').forEach(th => { th.classList.toggle('sorted', th.dataset.k === k); th.classList.toggle('asc', th.dataset.k === k && state.sortAsc); });
  const model = run.config.fulfillmentModel === 'warehouse' ? `Ara depo (${state.meta.settings.warehouseFee} $)` : 'Kendim';
  $('#tbody').innerHTML = rows.map(r => `<tr data-id="${r.id}" class="${state.openProductId === r.id ? 'sel' : ''}">
    <td><input type="checkbox" class="rowsel" data-id="${r.id}" ${state.selected.has(r.id) ? 'checked' : ''}></td>
    <td class="title"><a href="#" class="open" data-id="${r.id}">${esc(r.title)}</a><div class="note">${esc(r.p.asin || '')} ${r.p.amazon?.brand ? '· ' + esc(r.p.amazon.brand) : ''} ${r.p.amazon?.conditionalPrice ? '<span class="tag">koşullu fiyat var</span>' : ''} ${r.p.status === 'blocked' ? '<span class="tag no">erişim sorunu</span>' : ''}</div></td>
    <td>${esc(r.cat)}</td>
    <td class="num">${usd(r.amazonPrice)}</td><td class="num">${usd(r.buyCost)}</td>
    <td>${r.p.url ? `<a href="${esc(r.p.url)}" target="_blank" rel="noopener">Amazon</a>` : '—'}</td>
    <td class="num">${usd(r.median)}</td><td class="num">${usd(r.q1)}</td>
    <td class="num">${r.sold90 == null ? '—' : `${r.sold90} <span class="note">(90g) / ${r.sold30} (30g)</span>`}${r.range ? `<div class="note">${r.range.from} – ${r.range.to}</div>` : ''}</td>
    <td>${r.evidence.length ? r.evidence.map((l, i) => `<a href="${esc(l.url)}" target="_blank" rel="noopener" title="${esc(l.title)}">#${i + 1}</a>`).join(' ') : '—'}</td>
    <td class="num">${usd(r.itemPrice)}</td><td class="num">${usd(r.shipCharged)}</td><td class="num">${usd(r.totalCosts)}</td>
    <td class="num ${r.net != null ? (r.net < 0 ? 'neg' : 'pos') : ''}">${usd(r.net)}</td>
    <td class="num ${r.margin != null ? (r.margin < run.config.minMarginPct ? 'neg' : 'pos') : ''}">${pct(r.margin)}${r.baseMargin != null ? `<div class="note">baz ${pct(r.baseMargin)}</div>` : ''}</td>
    <td>${esc(model)}</td><td>${dt(r.checkedAt)}</td>
    <td><span class="pill ${r.decision}">${esc(r.label)}</span><div class="note" style="white-space:normal;max-width:260px">${esc(r.reasons[0] || '')}</div></td>
  </tr>`).join('');
  $('#tableNote').textContent = `${rows.length} / ${total} satır · Temkinli senaryo (alt çeyrek) gösterilir; baz (medyan) ve tüm maliyet kalemleri detay panelinde. Kâr rakamları işletme gelir/kurumlar vergisi öncesi operasyonel net kârdır.`;
  document.querySelectorAll('a.open').forEach(a => a.onclick = (e) => { e.preventDefault(); openDetail(Number(a.dataset.id), true); });
  document.querySelectorAll('.rowsel').forEach(cb => cb.onchange = () => { cb.checked ? state.selected.add(Number(cb.dataset.id)) : state.selected.delete(Number(cb.dataset.id)); });
}

// ---------- detay paneli ----------
function scenarioTable(a) {
  const keys = [['self', 'Kendim gönderiyorum'], ['wh3', 'Ara depo 3 $'], ['wh4', 'Ara depo 4 $'], ['wh5', 'Ara depo 5 $']];
  const cell = (r) => r.ok ? `${usd(r.netProfit)} <span class="note">(${pct(r.marginPct)})</span>` : `<span class="note">hesaplanamadı</span>`;
  return `<table class="mini"><tr><th>Senaryo</th><th>Baz (medyan)</th><th>Temkinli (alt çeyrek)</th></tr>${keys.map(([k, l]) => `<tr><td>${l}${k === a.selectedKey ? ' <span class="tag">seçili</span>' : ''}</td><td>${cell(a.scenarios.base[k])}</td><td>${cell(a.scenarios.conservative[k])}</td></tr>`).join('')}</table>`;
}
function costTable(r) {
  if (!r.ok) return `<div class="note">Hesaplanamadı — eksik: ${esc((r.missing || []).join(', '))}</div>`;
  const L = { amazonPrice: 'Amazon alış fiyatı', amazonTax: 'Geri alınamayan alış vergisi', inbound: 'Amazon → bana/depoya kargo', importCost: 'İthalat/gümrük', ebayFeePct: 'eBay komisyon (%)', ebayFeeFixed: 'eBay sipariş başı sabit ücret', otherFees: 'Diğer ücretler', ads: 'Reklam', outbound: 'Müşteriye gerçek gönderim', packaging: 'Paketleme', fulfillment: 'Operasyon / ara depo', otherOps: 'Diğer operasyon', risk: 'İade/hasar/kayıp risk payı' };
  return `<table class="mini"><tr><td>Gelir (ürün ${usd(r.itemPrice)} + kargo ${usd(r.shippingCharged)})</td><td class="num"><b>${usd(r.revenue)}</b></td></tr>
  ${Object.entries(r.costs).map(([k, v]) => `<tr><td>${L[k] || k}</td><td class="num">−${usd(v)}</td></tr>`).join('')}
  <tr><td>Komisyon matrahı</td><td class="num note">${usd(r.feeBase)}</td></tr>
  <tr><td><b>Toplam gider</b></td><td class="num"><b>−${usd(r.totalCosts)}</b></td></tr>
  <tr><td><b>Net kâr / marj</b></td><td class="num ${r.netProfit < 0 ? 'neg' : 'pos'}"><b>${usd(r.netProfit)} · ${pct(r.marginPct)}</b></td></tr>
  <tr><td>%${state.meta.settings.minMarginPct} marjı koruyan azami alış fiyatı</td><td class="num">${usd(r.maxBuyPrice)}</td></tr></table>`;
}
async function openDetail(id, scroll) {
  state.openProductId = id;
  let p; try { p = await api(`/api/products/${id}`); } catch (e) { alert(e.message); return; }
  const az = p.amazon || {}; const eb = p.ebay || {}; const s = eb.stats || {}; const a = p.analysis; const ov = p.overrides || {};
  const sold = (eb.sold?.listings || []); const active = (eb.active?.listings || []);
  const lrow = (l) => `<tr><td><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a>${l.bestOffer ? ' <span class="tag">Best Offer — fiyat kesin değil</span>' : ''}${l.qtySoldText ? ` <span class="tag" title="Tarih aralığı bilinmiyor; 30/90 günlük satış olarak sayılmaz">${esc(l.qtySoldText)}</span>` : ''}</td><td>${l.soldAt || '—'}</td><td class="num">${usd(l.price)}${l.priceRange ? ' <span class="note">aralık</span>' : ''}</td><td class="num">${l.shippingKnown ? usd(l.shipping) : '<span class="tag no">bilinmiyor</span>'}</td><td class="num">${usd(l.total)}</td><td>${esc(l.seller || '—')}</td><td><span class="pill ${l.match?.verdict === 'exact' ? 'eligible' : l.match?.verdict === 'uncertain' ? 'conditional' : 'rejected'}" title="${esc((l.match?.reasons || []).join('\n'))}">${l.match?.verdict === 'exact' ? 'birebir' : l.match?.verdict === 'uncertain' ? 'belirsiz' : 'uyumsuz'}</span></td></tr>`;
  const d = $('#drawer'); delete d.dataset.editing;
  d.innerHTML = `<button class="close" id="closeDrawer">Kapat ✕</button>
  <h2>${esc(p.title || p.asin)}</h2>
  <div><span class="pill ${p.decision.decision}">${esc(p.decision.label)}</span> <span class="note">${p.run.demo ? '<b style="color:#7c2d12">DEMO VERİSİ</b> · ' : ''}${esc(p.run.category.leafLabel)} · son kontrol ${dt(p.checkedAt)}</span></div>
  <ul class="reasons">${p.decision.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>

  <h3>Amazon ürün bilgileri</h3>
  <div class="kv">
    <div>Bağlantı</div><div><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.url)}</a></div>
    <div>ASIN</div><div>${esc(az.asin || p.asin)}</div><div>Marka / model</div><div>${esc(az.brand || '—')} / ${esc(az.model || 'doğrulanamadı')}</div>
    <div>UPC/EAN</div><div>${esc(az.upc || 'sayfada yok')}</div>
    <div>Varyant</div><div>${esc([az.variant?.color, az.variant?.size, az.variant?.style].filter(Boolean).join(' · ') || '—')} · paket adedi ${az.packCount ?? 'belirtilmemiş (1 varsayıldı)'}</div>
    <div>Durum</div><div>${esc(az.condition || '—')}</div>
    <div>Güncel fiyat</div><div><b>${usd(az.price)}</b> ${az.price == null ? '<span class="tag no">doğrulanamadı</span>' : ''} ${az.previousPrice != null ? `<span class="note">(önceki gözlem ${usd(az.previousPrice)} · ${dt(az.previousCheckedAt)})</span>` : ''}</div>
    <div>Koşullu fiyat/indirim</div><div>${az.conditionalPrice ? esc(az.conditionalPrice.note) + ' <span class="tag">normal alış fiyatı sayılmadı</span>' : 'yok'}</div>
    <div>Satıcı / gönderen</div><div>${esc(az.seller || 'doğrulanamadı')} / ${esc(az.shipsFrom || 'doğrulanamadı')}</div>
    <div>Stok / teslimat</div><div>${esc(az.availability || '—')} · ${esc(az.deliveryText || '—')}</div>
    <div>Amazon → bana/depoya kargo</div><div>${az.inboundShipping != null ? usd(az.inboundShipping) + ' <span class="tag ok">kaynaktan</span>' : '<span class="tag no">doğrulanamadı</span>'}</div>
    <div>Ağırlık / ölçü</div><div>${az.weightOz != null ? az.weightOz + ' oz' : '<span class="tag no">doğrulanamadı</span>'} ${esc(az.weightText ? '(' + az.weightText + ')' : '')} · ${esc(az.dims || '—')}</div>
    <div>Talep göstergeleri (kaynaktaki biçimde)</div><div>${esc(az.demand?.boughtText || '—')} · ${esc(az.demand?.ratingText || '')} ${esc(az.demand?.reviewCountText || '')} · ${esc(az.demand?.bsr || '')}</div>
    <div>Kontrol zamanı</div><div>${dt(az.checkedAt)}</div>
    ${p.risk?.flagged ? `<div>Risk</div><div class="neg">${esc(p.risk.reasons.join('; '))}</div>` : ''}
  </div>

  <h3>eBay eşleştirme ve gerçekleşmiş satışlar</h3>
  <div class="kv">
    <div>Erişim</div><div>${eb.access === 'ok' ? 'tamam' : `<span class="tag no">${esc(eb.access || 'yapılmadı')}</span> ${esc(eb.note || '')}`}</div>
    <div>Eşleşme gerekçesi</div><div>${esc(eb.matchSummary?.reason || '—')} ${ov.matchVerdict ? `<span class="tag">kullanıcı: ${esc(ov.matchVerdict)}</span>` : ''}</div>
    <div>Sorgular</div><div>${(eb.queries || []).map(q => `<a href="${esc(q.url || '#')}" target="_blank" rel="noopener">${esc(q.type)}: ${esc(q.q)}</a>${q.error ? ` <span class="tag no">${esc(q.error)}</span>` : ''}`).join('<br>') || '—'}</div>
    <div>Satılmış ilan (birebir)</div><div><b>${s.exactSold90 ?? '—'}</b> son 90 gün · ${s.exactSold30 ?? '—'} son 30 gün · belirsiz ${s.uncertainSold90 ?? 0} · incelenen ${s.listingsExamined ?? 0} (yinelenen ${s.duplicatesRemoved ?? 0} ayıklandı)</div>
    <div>Satılan birim</div><div>${s.unitsSold ?? 'doğrulanamadı'} <span class="note">${esc(s.unitsSoldNote || '')}</span></div>
    <div>İncelenen tarih aralığı</div><div>${s.dateRange ? `${s.dateRange.from} – ${s.dateRange.to}` : '—'} ${s.coveragePartial ? '<span class="tag no">kapsam eksik</span>' : ''} <span class="note">${esc(eb.sold?.coverageNote || '')}</span></div>
    <div>Farklı satıcı</div><div>${s.distinctSellers ?? '<span class="tag no">doğrulanamadı</span>'}</div>
    <div>En son satış</div><div>${s.lastSoldAt || '—'}</div>
    <div>Medyan / alt çeyrek toplam</div><div><b>${usd(s.medianTotal)}</b> / <b>${usd(s.q1Total)}</b> <span class="note">(${s.pricedCount ?? 0} fiyatlı satış; Best Offer ${s.bestOfferExcluded ?? 0}, kargosu bilinmeyen ${s.shippingUnknownExcluded ?? 0} hariç)</span></div>
    <div>Aktif rakipler</div><div>${s.activeCount ?? 0} ilan · en düşük toplam ${usd(s.activeLowestTotal)} · medyan ${usd(s.activeMedianTotal)} ${a.competitionWarning ? `<div class="neg">${esc(a.competitionWarning)}</div>` : ''}</div>
    <div>Kontrol zamanı</div><div>${dt(eb.checkedAt)}</div>
  </div>
  <details ${sold.length ? 'open' : ''}><summary class="note">Satılmış ilanlar (${sold.length})</summary>
  <table class="mini"><tr><th>İlan</th><th>Satış tarihi</th><th>Fiyat</th><th>Kargo</th><th>Toplam</th><th>Satıcı</th><th>Eşleşme</th></tr>${sold.map(lrow).join('')}</table></details>
  <details><summary class="note">Aktif rakip ilanlar (${active.length})</summary><table class="mini"><tr><th>İlan</th><th></th><th>Fiyat</th><th>Kargo</th><th>Toplam</th><th></th><th>Eşleşme</th></tr>${active.map(lrow).join('')}</table></details>

  <h3>Maliyet kalemleri — seçili senaryo (${a.fulfillmentModel === 'warehouse' ? 'ara depo' : 'kendim gönderiyorum'})</h3>
  <div class="grid2"><div><b>Baz (medyan ${usd(a.inputs.prices.base)})</b>${costTable(a.selected.base)}</div><div><b>Temkinli (alt çeyrek ${usd(a.inputs.prices.conservative)})</b>${costTable(a.selected.conservative)}</div></div>
  <h3>Gönderim senaryoları (net kâr · marj)</h3>${scenarioTable(a)}
  <div class="note">Ara depo ücreti kapsamı: ${esc(state.meta.settings.warehouseFeeCovers)}${state.meta.settings.warehouseIncludesPackaging ? ' (paketleme dahil, ayrıca sayılmadı)' : ' (paketleme ayrıca sayıldı)'}.</div>
  <h3>Stres testi (Amazon +%5, eBay geliri −%5, gönderim +2 $ — temkinli fiyat üzerinden)</h3>
  <div>${a.selected.stress.ok ? `Net kâr <b class="${a.selected.stress.netProfit < 0 ? 'neg' : 'pos'}">${usd(a.selected.stress.netProfit)}</b> · marj <b>${pct(a.selected.stress.marginPct)}</b>` : '<span class="note">hesaplanamadı</span>'}</div>
  <h3>Risk payı %5 senaryosu (tahmin)</h3>
  <div>Baz: ${a.selected.risk5.base.ok ? `${usd(a.selected.risk5.base.netProfit)} (${pct(a.selected.risk5.base.marginPct)})` : '—'} · Temkinli: ${a.selected.risk5.conservative.ok ? `${usd(a.selected.risk5.conservative.netProfit)} (${pct(a.selected.risk5.conservative.marginPct)})` : '—'}</div>

  <h3>Eksik bilgiler ve varsayımlar</h3>
  <ul class="reasons">${[...a.missingInfo.map(m => 'Eksik: ' + m), ...a.estimated.map(m => 'Tahmini: ' + m), ...a.assumptions].map(x => `<li>${esc(x)}</li>`).join('')}</ul>

  <h3>Kullanıcı tahminleri (kaynak verilerden ayrı saklanır; marj yeniden hesaplanır)</h3>
  <form id="ovForm" class="grid2">
    <label class="f">Müşteriden tahsil edilecek kargo ($)<input name="shippingCharged" type="number" step="0.01" min="0" value="${ov.shippingCharged ?? ''}" placeholder="ayar: ${state.meta.settings.shippingChargedDefault}"></label>
    <label class="f">Müşteriye gönderim maliyeti ($)<input name="outboundCost" type="number" step="0.01" min="0" value="${ov.outboundCost ?? ''}" placeholder="${a.inputs.outbound != null ? 'tahmin: ' + a.inputs.outbound : 'bilinmiyor'}"></label>
    <label class="f"><span><input name="outboundVerified" type="checkbox" ${ov.outboundVerified ? 'checked' : ''}> Bu gönderim bedelini gerçek tarifeden doğruladım</span><span class="note">İşaretli değilse "tahmini maliyetle hesaplandı" sayılır.</span></label>
    <label class="f">Amazon → bana kargo ($)<input name="inboundCost" type="number" step="0.01" min="0" value="${ov.inboundCost ?? ''}" placeholder="${az.inboundShipping != null ? 'kaynak: ' + az.inboundShipping : 'bilinmiyor'}"></label>
    <label class="f">Paket ağırlığı (oz)<input name="weightOz" type="number" step="0.1" min="0" value="${ov.weightOz ?? ''}" placeholder="${az.weightOz ?? 'bilinmiyor'}"></label>
    <label class="f">Eşleşme kararı (inceleme sonrası)<select name="matchVerdict"><option value="">motor kararı (${esc(eb.matchSummary?.verdict || '—')})</option><option value="exact" ${ov.matchVerdict === 'exact' ? 'selected' : ''}>birebir eşleşme onaylandı</option><option value="mismatch" ${ov.matchVerdict === 'mismatch' ? 'selected' : ''}>eşleşme yanlış</option></select></label>
    <label class="f">Not<input name="note" value="${esc(ov.note || '')}"></label>
    <div class="btns" style="align-self:end"><button class="primary" type="submit">Kaydet ve yeniden hesapla</button><button type="button" id="ovClear">Tahminleri temizle</button></div>
  </form>
  <h3>Gözlem geçmişi (${p.observations.length})</h3>
  <table class="mini"><tr><th>Zaman</th><th>Tür</th><th>Özet</th></tr>${p.observations.map(o => `<tr><td>${dt(o.checkedAt)}</td><td>${esc(o.kind)}</td><td>${o.kind.startsWith('amazon') ? `fiyat ${usd(o.data?.price)} · ${esc(o.data?.availability || o.data?.note || '')}` : `birebir satış(90g) ${o.data?.stats?.exactSold90 ?? '—'} · medyan ${usd(o.data?.stats?.medianTotal)}`}</td></tr>`).join('')}</table>`;
  d.classList.add('open'); if (scroll) d.scrollTop = 0;
  $('#closeDrawer').onclick = () => { d.classList.remove('open'); state.openProductId = null; renderTable(); };
  d.querySelectorAll('input,select').forEach(el => el.addEventListener('focus', () => { d.dataset.editing = '1'; }));
  $('#ovForm').onsubmit = async (e) => {
    e.preventDefault(); const f = new FormData(e.target); const body = {};
    for (const k of ['shippingCharged', 'outboundCost', 'inboundCost', 'weightOz']) body[k] = f.get(k) === '' ? null : Number(f.get(k));
    body.outboundVerified = f.get('outboundVerified') === 'on' ? true : null; body.matchVerdict = f.get('matchVerdict') || null; body.note = f.get('note') || null;
    try { await api(`/api/products/${id}/overrides`, { method: 'PUT', body: JSON.stringify(body) }); await refresh(); openDetail(id, false); } catch (err) { alert(err.message); }
  };
  $('#ovClear').onclick = async () => { await api(`/api/products/${id}/overrides`, { method: 'PUT', body: JSON.stringify({ shippingCharged: null, outboundCost: null, outboundVerified: null, inboundCost: null, weightOz: null, matchVerdict: null, note: null }) }); await refresh(); openDetail(id, false); };
  renderTable();
}

// ---------- ayarlar ----------
function openSettings() {
  const s = state.meta.settings; const m = state.meta;
  const F = (k, label, attrs = 'type="number" step="0.01"') => `<label class="f">${label}<input name="${k}" ${attrs} value="${esc(s[k] ?? '')}"></label>`;
  $('#settingsBody').innerHTML = `<button class="close" id="closeSettings">Kapat ✕</button><h2>Ayarlar ve maliyet senaryoları</h2>
  <div class="note">Tüm tutarlar USD. Bu değerler tahmindir; sonuçlar "tahmini maliyetle hesaplandı" olarak işaretlenir. Kâr, işletme gelir/kurumlar vergisi öncesi operasyonel net kârdır.</div>
  <form id="setForm">
  <h3>Konum ve vergi</h3><div class="grid2">${F('originZip', 'Çıkış posta kodu', 'type="text"')}${F('sampleDestZip', 'Örnek varış posta kodu (gönderim tahmini için)', 'type="text"')}${F('amazonTaxRate', 'Amazon alış vergisi (%) — geri alınamayan', 'type="number" step="0.01"')}${F('amazonInboundDefault', 'Amazon→bana kargo, doğrulanamazsa tahmin ($; boş = bilinmiyor)')}${F('importCost', 'İthalat/gümrük ($/adet)')}</div>
  <div class="note">Canlı kargo ücreti API'si bağlı değildir; posta kodları yalnızca kayıt/etiket içindir. Gönderim maliyeti aşağıdaki ağırlık tarifesinden tahmin edilir.</div>
  <h3>eBay ücretleri</h3><div class="grid2">
    <label class="f">Hesap/mağaza türü<select name="ebayAccountType">${m.ebayAccountTypes.map(t => `<option value="${t.id}" ${s.ebayAccountType === t.id ? 'selected' : ''}>${esc(t.label)} (varsayılan %${t.defaultFeeRate})</option>`).join('')}</select></label>
    ${F('ebayFeeRate', 'Kategori komisyonu (%)')}${F('ebayFeeFixedOver10', 'Sabit ücret, sipariş > 10 $ ($)')}${F('ebayFeeFixedUnder10', 'Sabit ücret, sipariş ≤ 10 $ ($)')}
    <label class="f"><span><input type="checkbox" name="ebayFeeIncludesSalesTax" ${s.ebayFeeIncludesSalesTax ? 'checked' : ''}> Komisyon matrahına alıcının satış vergisi dahil</span></label>
    ${F('ebayBuyerSalesTaxRate', 'Tahmini alıcı satış vergisi (%) — yalnızca matrah için, gelir değil')}${F('otherFees', 'Diğer sipariş başı ücretler ($)')}${F('adRate', 'Reklam oranı (%)')}
  </div>
  <div class="banner ${s.ebayFeeVerified ? 'info' : 'warn'}">Kaynak: ${esc(s.ebayFeeSource)} · kontrol tarihi ${esc(s.ebayFeeCheckedAt)}.
    <div class="btns" style="margin-top:6px"><button type="button" class="openurl" data-url="${m.feeSourceUrl}">Resmî ücret sayfasını araştırma tarayıcısında aç</button><button type="button" class="openurl" data-url="${m.storeFeeSourceUrl}">Mağaza ücret sayfasını aç</button>
    <label><input type="checkbox" name="ebayFeeVerified" ${s.ebayFeeVerified ? 'checked' : ''}> Oranları resmî sayfadan doğruladım</label></div></div>
  <h3>Operasyon</h3><div class="grid2">${F('packagingCost', 'Paketleme ($/sipariş)')}${F('selfOpsCost', 'Kendi gönderimim için operasyon gideri ($/sipariş)')}${F('warehouseFee', 'Ara depo ücreti — seçili senaryo ($/sipariş; 3/4/5 ayrıca karşılaştırılır)', 'type="number" step="1" min="0"')}
    <label class="f">Depo ücretinin kapsadığı işlemler<input name="warehouseFeeCovers" type="text" value="${esc(s.warehouseFeeCovers)}"></label>
    <label class="f"><span><input type="checkbox" name="warehouseIncludesPackaging" ${s.warehouseIncludesPackaging ? 'checked' : ''}> Depo ücreti paketlemeyi kapsar (paketleme ayrıca sayılmaz)</span></label>
    ${F('otherOps', 'Diğer operasyon giderleri ($/sipariş)')}${F('riskRate', 'İade/hasar/kayıp risk payı (% gelir; tahmin)')}${F('shippingChargedDefault', 'Müşteriden tahsil edilecek kargo, varsayılan ($; 0 = ücretsiz kargo)')}
  </div>
  <h3>Müşteriye gönderim tarifesi (tahmin — kendi taşıyıcı tarifenizle güncelleyin)</h3>
  <div class="note">Ağırlık üst sınırı (oz) → maliyet ($). Amazon sayfasındaki ürün/paket ağırlığı bu tabloya göre eşlenir.</div>
  <div id="obTable">${(s.outboundTable || []).map((r, i) => `<div class="btns"><input type="number" name="ob_max_${i}" value="${r.maxOz}" step="0.1" style="width:90px"> oz → <input type="number" name="ob_cost_${i}" value="${r.cost}" step="0.01" style="width:90px"> $</div>`).join('')}</div>
  <div class="grid2">${F('outboundUnknownWeightEstimate', 'Ağırlık bilinmiyorsa genel gönderim tahmini ($; boş = hesaplanamaz)')}</div>
  <h3>Talep eşikleri ve tarama</h3><div class="grid2">${F('demandMinSold90', 'Son 90 günde en az birebir satılmış ilan', 'type="number" step="1"')}${F('demandMinSellers', 'En az farklı satıcı', 'type="number" step="1"')}${F('minMarginPct', 'Minimum net kâr marjı (%)')}${F('ebayMaxResultPages', 'eBay sonuç sayfası sayısı (sorgu başına)', 'type="number" step="1" min="1" max="3"')}${F('requestDelayMinMs', 'İstek aralığı en az (ms)', 'type="number" step="100"')}${F('requestDelayMaxMs', 'İstek aralığı en çok (ms)', 'type="number" step="100"')}</div>
  <h3>Onay</h3><label><input type="checkbox" name="setupConfirmed" ${s.setupConfirmed ? 'checked' : ''}> Yukarıdaki maliyet girdilerini gözden geçirdim (onaylanmadan tüm sonuçlar "Koşullu" kalır)</label>
  <div class="btns" style="margin-top:12px"><button class="primary" type="submit">Kaydet</button></div></form>`;
  $('#settingsModal').classList.add('open');
  $('#closeSettings').onclick = () => $('#settingsModal').classList.remove('open');
  document.querySelectorAll('.openurl').forEach(b => b.onclick = async () => { try { await api('/api/open-url', { method: 'POST', body: JSON.stringify({ url: b.dataset.url }) }); } catch (e) { alert(e.message); } });
  $('#setForm').onsubmit = async (e) => {
    e.preventDefault(); const f = new FormData(e.target); const body = {};
    const nums = ['amazonTaxRate', 'amazonInboundDefault', 'importCost', 'ebayFeeRate', 'ebayFeeFixedOver10', 'ebayFeeFixedUnder10', 'ebayBuyerSalesTaxRate', 'otherFees', 'adRate', 'packagingCost', 'selfOpsCost', 'warehouseFee', 'otherOps', 'riskRate', 'shippingChargedDefault', 'outboundUnknownWeightEstimate', 'demandMinSold90', 'demandMinSellers', 'minMarginPct', 'ebayMaxResultPages', 'requestDelayMinMs', 'requestDelayMaxMs'];
    for (const k of nums) body[k] = f.get(k) === '' || f.get(k) == null ? null : Number(f.get(k));
    for (const k of ['originZip', 'sampleDestZip', 'ebayAccountType', 'warehouseFeeCovers']) body[k] = f.get(k);
    for (const k of ['ebayFeeIncludesSalesTax', 'warehouseIncludesPackaging', 'setupConfirmed', 'ebayFeeVerified']) body[k] = f.get(k) === 'on';
    const table = []; for (let i = 0; f.has(`ob_max_${i}`); i++) if (f.get(`ob_max_${i}`) !== '' && f.get(`ob_cost_${i}`) !== '') table.push({ maxOz: Number(f.get(`ob_max_${i}`)), cost: Number(f.get(`ob_cost_${i}`)) });
    body.outboundTable = table;
    try { state.meta.settings = await api('/api/settings', { method: 'PUT', body: JSON.stringify(body) }); $('#settingsModal').classList.remove('open'); $('#inMargin').value = state.meta.settings.minMarginPct; setupBanner(); await refresh(); } catch (err) { alert(err.message); }
  };
}

// ---------- geçmiş ----------
async function openHistory() {
  const runs = await api('/api/runs'); const jobs = await api('/api/recheck');
  $('#historyBody').innerHTML = `<button class="close" id="closeHistory">Kapat ✕</button><h2>Araştırma geçmişi</h2>
  <table class="mini"><tr><th>#</th><th>Kategori</th><th>Ayarlar</th><th>Durum</th><th>Sonuç</th><th>Zaman</th><th></th></tr>
  ${runs.map(r => `<tr><td>${r.id}${r.demo ? ' <span class="tag">DEMO</span>' : ''}</td><td>${esc(r.category.mainLabel)} › ${esc(r.category.subLabel)} › ${esc(r.category.leafLabel)}</td><td>${r.config.productCount} ürün · %${r.config.minMarginPct} · ${r.config.fulfillmentModel === 'warehouse' ? 'depo' : 'kendim'}</td><td>${esc(STATUS_TR[r.status] || r.status)}</td><td>${r.progress.found ?? 0} bulundu · ${r.progress.eligible ?? 0} uygun · ${r.progress.conditional ?? 0} koşullu · ${r.progress.rejected ?? 0} elenen</td><td>${dt(r.createdAt)}${r.finishedAt ? '<br>' + dt(r.finishedAt) : ''}</td><td class="btns"><button class="openrun" data-id="${r.id}">Aç</button><a href="/api/runs/${r.id}/export.csv">CSV</a><button class="delrun" data-id="${r.id}">Sil</button></td></tr>`).join('')}</table>
  <h3>Yeniden kontrol işleri</h3><table class="mini">${jobs.map(j => `<tr><td>#${j.id}</td><td>${j.productIds.length} ürün</td><td>${esc(j.status)}</td><td>${esc(j.message || '')}</td><td>${dt(j.createdAt)}</td></tr>`).join('') || '<tr><td class="note">yok</td></tr>'}</table>`;
  $('#historyModal').classList.add('open');
  $('#closeHistory').onclick = () => $('#historyModal').classList.remove('open');
  document.querySelectorAll('.openrun').forEach(b => b.onclick = async () => { store.set('currentRunId', Number(b.dataset.id)); state.selected.clear(); $('#historyModal').classList.remove('open'); await refresh(); });
  document.querySelectorAll('.delrun').forEach(b => b.onclick = async () => { if (!confirm('Bu araştırma ve sonuçları silinsin mi?')) return; try { await api(`/api/runs/${b.dataset.id}`, { method: 'DELETE' }); if (store.get('currentRunId') === Number(b.dataset.id)) store.set('currentRunId', null); openHistory(); refresh(); } catch (e) { alert(e.message); } });
}

// ---------- başlangıç ----------
async function init() {
  state.meta = await api('/api/meta');
  fillCategories(); setupBanner();
  $('#inMargin').value = state.meta.settings.minMarginPct;
  $('#btnStart').onclick = startRun; $('#btnPause').onclick = () => command('pause'); $('#btnResume').onclick = () => command('resume'); $('#btnStop').onclick = () => { if (confirm('Araştırma durdurulsun mu? (Tamamlanan sonuçlar korunur)')) command('stop'); };
  $('#btnSettings').onclick = openSettings; $('#btnHistory').onclick = openHistory;
  $('#btnExport').onclick = () => { if (state.run) location.href = `/api/runs/${state.run.id}/export.csv`; };
  $('#btnRecheck').onclick = async () => { if (!state.selected.size) return alert('Tabloda ürün seçin'); try { await api('/api/recheck', { method: 'POST', body: JSON.stringify({ productIds: [...state.selected] }) }); alert('Yeniden kontrol başlatıldı; sonuç yeni gözlem olarak eklenir (eski sonuç silinmez).'); } catch (e) { alert(e.message); } };
  $('#btnCheckCat').onclick = async () => { try { await api(`/api/categories/${$('#selLeaf').value}/check`, { method: 'POST', body: JSON.stringify({ demo: $('#chkDemo').checked }) }); alert('Doğrulama araştırma tarayıcısında başlatıldı; sonuç birkaç saniye içinde kategori listesinde görünür.'); setTimeout(async () => { state.meta = await api('/api/meta'); fillCategories(); }, 15000); } catch (e) { alert(e.message); } };
  $('#chkAll').onchange = (e) => { document.querySelectorAll('.rowsel').forEach(cb => { cb.checked = e.target.checked; e.target.checked ? state.selected.add(Number(cb.dataset.id)) : state.selected.delete(Number(cb.dataset.id)); }); };
  document.querySelectorAll('#filterTabs button').forEach(b => b.onclick = () => { state.filter = b.dataset.f; document.querySelectorAll('#filterTabs button').forEach(x => x.classList.toggle('active', x === b)); renderTable(); });
  document.querySelectorAll('#tbl th[data-k]').forEach(th => { if (th.dataset.k === '_sel') return; th.onclick = () => { if (state.sortKey === th.dataset.k) state.sortAsc = !state.sortAsc; else { state.sortKey = th.dataset.k; state.sortAsc = th.dataset.k === 'title'; } renderTable(); }; });
  await refresh();
  state.timer = setInterval(async () => { if (state.run && ['queued', 'running', 'paused', 'needs_user'].includes(state.run.status)) await refresh(); else if (state.run) { /* tamamlanan iş: seyrek yenile */ } }, 2500);
  setInterval(async () => { if (state.run && !['queued', 'running', 'paused', 'needs_user'].includes(state.run.status)) await refresh(); }, 15000);
}
init().catch(e => { document.body.insertAdjacentHTML('afterbegin', `<div class="banner warn">Uygulama yüklenemedi: ${esc(e.message)}</div>`); });
