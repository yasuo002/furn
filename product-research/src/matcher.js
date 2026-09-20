// eBay ilanı ↔ Amazon ürünü eşleştirme ve satış istatistikleri (saf fonksiyonlar).
const STOP = new Set(['the', 'and', 'for', 'with', 'of', 'to', 'in', 'on', 'a', 'an', 'new', 'brand', 'free', 'shipping', 'by', 'or', 'from', 'set', 'pack', 'pcs', 'piece', 'pieces', 'count', 'ct', 'pk', 'x']);
const COLORS = ['black', 'white', 'gray', 'grey', 'silver', 'gold', 'rose gold', 'red', 'blue', 'navy', 'green', 'yellow', 'orange', 'pink', 'purple', 'brown', 'beige', 'clear', 'transparent', 'walnut', 'oak', 'bamboo', 'natural', 'teal', 'ivory', 'cream'];
const USED_WORDS = /\b(used|pre-owned|preowned|open box|for parts|refurbished|damaged|broken|read description|not working|missing)\b/i;

export const norm = (s) => String(s || '').toLowerCase().replace(/[™®©]/g, ' ').replace(/[^a-z0-9.\-+"/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
export const compact = (s) => norm(s).replace(/[\s\-.]/g, '');

export function tokens(s) {
  return norm(s).replace(/[-/]/g, ' ').split(' ').filter(t => t.length > 1 && !STOP.has(t) && !/^\d+$/.test(t));
}
export function parsePackCount(s) {
  const t = norm(s);
  let m;
  if ((m = t.match(/\b(?:pack|set|box|case|lot)\s+of\s+(\d{1,3})\b/))) return Number(m[1]);
  if ((m = t.match(/\b(\d{1,3})\s*[- ]?\s*(?:pack|pcs|pc|pieces|piece|count|ct|pk|units|packs)\b/))) return Number(m[1]);
  if ((m = t.match(/\b(\d{1,3})\s*x\s+/))) return Number(m[1]);
  return null;
}
export function parseColor(s) {
  const t = ' ' + norm(s) + ' ';
  return COLORS.filter(c => t.includes(' ' + c + ' '));
}
export function parseSizes(s) {
  const t = norm(s);
  const out = new Set();
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)\s*(?:inch|inches|in\b|"|cm|mm|ft|oz|lb|lbs|gallon|gal|quart|qt|liter|l\b|ml)/g)) out.add(m[0].replace(/\s+/g, ''));
  for (const m of t.matchAll(/\b(xs|s|m|l|xl|xxl|small|medium|large|x-large|extra large)\b/g)) out.add(m[1]);
  return [...out];
}
function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

// amazon: { title, brand, model, upc, packCount, color, size, condition }
// listing: { title, condition, subtitle }
export function matchListing(amazon, listing) {
  const reasons = []; let score = 0; let conflict = false;
  const lt = listing.title || '';
  const ltn = norm(lt); const ltc = compact(lt);
  const brand = norm(amazon.brand);
  const model = norm(amazon.model);

  if (USED_WORDS.test(lt) || /\b(used|pre-owned|for parts|refurbished|open box)\b/i.test(listing.condition || '') || /\b(used|pre-owned|for parts|refurbished|open box)\b/i.test(listing.subtitle || '')) {
    return { verdict: 'mismatch', score: 0, reasons: ['Kullanılmış/açık kutu/parça ilanı (yeni ürün değil)'] };
  }
  let brandHit = false, modelHit = false;
  if (brand && brand !== 'generic' && brand !== 'unbranded') {
    brandHit = ltn.includes(brand) || ltc.includes(compact(brand));
    if (brandHit) { score += 0.3; reasons.push(`Marka eşleşti (${amazon.brand})`); } else reasons.push('Marka başlıkta yok');
  }
  if (amazon.upc && ltc.includes(compact(amazon.upc))) { score += 0.5; reasons.push('UPC/EAN başlıkta'); modelHit = true; }
  if (model && model.length >= 3 && /\d/.test(model)) {
    if (ltc.includes(compact(model))) { modelHit = true; score += 0.45; reasons.push(`Model numarası eşleşti (${amazon.model})`); }
    else reasons.push('Model numarası başlıkta yok');
  }
  const overlap = jaccard(tokens(amazon.title), tokens(lt));
  score += Math.min(0.35, overlap * 0.5);
  reasons.push(`Başlık örtüşmesi %${Math.round(overlap * 100)}`);

  const ap = amazon.packCount ?? parsePackCount(amazon.title) ?? 1;
  const lp = parsePackCount(lt);
  if (lp != null && lp !== ap) { conflict = true; reasons.push(`Paket adedi uyuşmuyor (Amazon ${ap}, eBay ${lp})`); }
  else if (lp == null && ap > 1) { reasons.push(`Amazon ${ap}'li paket; eBay başlığında adet yok`); score -= 0.15; }
  else if (lp != null) reasons.push(`Paket adedi eşleşti (${ap})`);

  const ac = amazon.color ? parseColor(amazon.color) : parseColor(amazon.title);
  const lc = parseColor(lt);
  if (ac.length && lc.length && !lc.some(c => ac.includes(c))) { conflict = true; reasons.push(`Renk/varyant uyuşmuyor (Amazon ${ac.join('/')}, eBay ${lc.join('/')})`); }
  else if (ac.length && !lc.length) { reasons.push('eBay başlığında renk bilgisi yok'); score -= 0.05; }

  const as = parseSizes(amazon.size || amazon.title); const ls = parseSizes(lt);
  if (as.length && ls.length && !ls.some(s => as.includes(s))) { reasons.push(`Ölçü farklı olabilir (Amazon ${as.join(',')}, eBay ${ls.join(',')})`); score -= 0.2; }

  let verdict;
  if (conflict) verdict = 'mismatch';
  else if ((modelHit && (brandHit || !brand || overlap >= 0.3)) || (brandHit && overlap >= 0.5)) verdict = 'exact'; // yalnızca başlık benzerliği asla 'exact' vermez
  else if (brandHit || modelHit || overlap >= 0.35) verdict = 'uncertain';
  else verdict = 'mismatch';
  if (verdict === 'exact' && lp == null && ap > 1) verdict = 'uncertain';
  if (verdict === 'exact' && ac.length && !lc.length && (amazon.variantCount || 0) > 1) verdict = 'uncertain';
  return { verdict, score: Math.round(Math.max(0, Math.min(1, score)) * 100) / 100, reasons };
}

export function median(arr) { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
export function quartile1(arr) { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); const pos = (s.length - 1) * 0.25; const lo = Math.floor(pos), hi = Math.ceil(pos); return s[lo] + (s[hi] - s[lo]) * (pos - lo); }
const r2 = (n) => n == null ? null : Math.round(n * 100) / 100;

// Satılmış ve aktif ilanlardan istatistik. listings: [{title,url,price,shipping,shippingKnown,soldAt,seller,bestOffer,match}]
export function summarizeEbay({ sold = [], active = [], now = new Date(), coveragePartial = false }) {
  const t = now.getTime(); const d30 = t - 30 * 864e5; const d90 = t - 90 * 864e5;
  const seen = new Set(); const dedup = [];
  for (const l of sold) { const key = l.url ? l.url.replace(/\?.*$/, '') + '|' + (l.soldAt || '') : l.title + '|' + l.price + '|' + l.soldAt; if (seen.has(key)) continue; seen.add(key); dedup.push(l); }
  const exact = dedup.filter(l => l.match?.verdict === 'exact');
  const uncertain = dedup.filter(l => l.match?.verdict === 'uncertain');
  const inWindow = (l, from) => { if (!l.soldAt) return false; const s = Date.parse(l.soldAt); return Number.isFinite(s) && s >= from && s <= t + 864e5; };
  const exact90 = exact.filter(l => inWindow(l, d90)); const exact30 = exact.filter(l => inWindow(l, d30));
  const undated = exact.filter(l => !l.soldAt).length;
  const priced = exact90.filter(l => l.price != null && l.shippingKnown && !l.bestOffer).map(l => l.price + (l.shipping || 0));
  const bestOfferExcluded = exact90.filter(l => l.bestOffer).length;
  const shippingUnknownExcluded = exact90.filter(l => !l.shippingKnown).length;
  const sellers = exact90.map(l => l.seller).filter(Boolean);
  const distinctSellers = sellers.length ? new Set(sellers.map(s => s.toLowerCase())).size : (exact90.length ? null : 0);
  const soldDates = dedup.map(l => l.soldAt).filter(Boolean).map(Date.parse).filter(Number.isFinite);
  const activeExact = active.filter(l => l.match?.verdict !== 'mismatch' && l.price != null && l.shippingKnown).map(l => l.price + (l.shipping || 0));
  const lastSold = exact.map(l => l.soldAt).filter(Boolean).sort().at(-1) || null;
  return {
    listingsExamined: dedup.length, duplicatesRemoved: sold.length - dedup.length,
    exactSold90: exact90.length, exactSold30: exact30.length, exactUndated: undated, uncertainSold90: uncertain.filter(l => inWindow(l, d90)).length,
    mismatch: dedup.length - exact.length - uncertain.length,
    pricedCount: priced.length, bestOfferExcluded, shippingUnknownExcluded,
    medianTotal: r2(median(priced)), q1Total: r2(quartile1(priced)),
    distinctSellers, lastSoldAt: lastSold,
    dateRange: soldDates.length ? { from: new Date(Math.min(...soldDates)).toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) } : null,
    coveragePartial,
    unitsSold: null, unitsSoldNote: 'Satılan birim sayısı arama sonuçlarından doğrulanamaz; yalnızca satılmış ilan sayısı sayıldı.',
    activeCount: active.length, activeLowestTotal: activeExact.length ? r2(Math.min(...activeExact)) : null, activeMedianTotal: r2(median(activeExact)),
  };
}

export function matchSummary(stats) {
  if (stats.exactSold90 > 0 || (stats.exactSold90 === 0 && stats.exactUndated > 0)) return { verdict: 'exact', reason: `${stats.exactSold90} birebir eşleşen satılmış ilan (90 gün)` };
  if (stats.uncertainSold90 > 0) return { verdict: 'uncertain', reason: `${stats.uncertainSold90} belirsiz eşleşme — inceleme gerekli` };
  if (stats.listingsExamined > 0) return { verdict: 'mismatch', reason: 'İncelenen ilanların hiçbiri birebir eşleşmedi' };
  return { verdict: 'none', reason: 'eBay Sold Items sonucu yok' };
}
