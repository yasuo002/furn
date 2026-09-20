// Kullanıcının ilan bazında eşleşme kararlarını (overrides.listingVerdicts) uygulayıp istatistikleri yeniden hesaplar.
// Kaynak veriler değiştirilmez; yalnızca hesaplama için etkin bir kopya üretilir.
import { summarizeEbay, matchSummary } from './matcher.js';
const ALLOWED = new Set(['exact', 'uncertain', 'mismatch']);

export function effectiveProduct(p) {
  const lv = p?.overrides?.listingVerdicts;
  if (!lv || !Object.keys(lv).length || !p.ebay?.sold?.listings) return p;
  const sold = p.ebay.sold.listings.map(l => {
    const v = l.url ? lv[l.url] : null;
    if (!v || !ALLOWED.has(v)) return l;
    return { ...l, userVerdict: v, match: { ...(l.match || {}), verdict: v, reasons: [...(l.match?.reasons || []), `Kullanıcı kararı: ${v}`] } };
  });
  const stats = { ...summarizeEbay({ sold, active: p.ebay.active?.listings || [], coveragePartial: !!p.ebay.stats?.coveragePartial, now: new Date(p.ebay.checkedAt || Date.now()) }), userAdjusted: true };
  return { ...p, ebay: { ...p.ebay, sold: { ...p.ebay.sold, listings: sold }, stats, matchSummary: { ...matchSummary(stats), userAdjusted: true } } };
}
