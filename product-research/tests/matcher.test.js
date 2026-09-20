import test from 'node:test';
import assert from 'node:assert/strict';
import { matchListing, parsePackCount, summarizeEbay, matchSummary } from '../src/matcher.js';
import { csvCell } from '../src/csv.js';
import { assessRisk } from '../src/risk.js';
import { normalizeListing, buildQueries } from '../src/engine/ebay.js';
import { normalizeProduct } from '../src/engine/amazon.js';
import { detectBlock } from '../src/engine/browser.js';

const az = { title: 'SimpleHouseware Mesh Desk Organizer with Sliding Drawer, 2 Pack, Silver', brand: 'SimpleHouseware', model: 'SHW-DO2P', packCount: 2, color: 'Silver' };
test('paket adedi ayrıştırma', () => {
  assert.equal(parsePackCount('Set of 3 Magazine Holders'), 3); assert.equal(parsePackCount('Pen holder 2-Pack black'), 2);
  assert.equal(parsePackCount('12 pcs drawer dividers'), 12); assert.equal(parsePackCount('Desk organizer black'), null);
});
test('paket adedi uyuşmazlığı → mismatch (başlık benzer olsa bile)', () => {
  const r = matchListing(az, { title: 'SimpleHouseware Mesh Desk Organizer with Sliding Drawer Silver (1 pack)' });
  assert.equal(r.verdict, 'mismatch'); assert.ok(r.reasons.some(x => x.includes('Paket adedi')));
});
test('model + marka eşleşmesi ve adet eşleşmesi → exact', () => {
  assert.equal(matchListing(az, { title: 'SimpleHouseware SHW-DO2P Mesh Desk Organizer Sliding Drawer 2 Pack Silver' }).verdict, 'exact');
});
test('kullanılmış / farklı renk → mismatch; sadece başlık benzerliği → uncertain', () => {
  assert.equal(matchListing(az, { title: 'SimpleHouseware SHW-DO2P Mesh Desk Organizer 2 Pack Silver - Used' }).verdict, 'mismatch');
  assert.equal(matchListing(az, { title: 'SimpleHouseware SHW-DO2P Mesh Desk Organizer 2 Pack Black' }).verdict, 'mismatch');
  assert.equal(matchListing({ title: 'Bamboo Monitor Stand Riser with Storage Drawer', brand: 'WoodNest', model: null }, { title: 'Bamboo Monitor Stand Riser Drawer' }).verdict, 'uncertain');
});
test('istatistik: best offer ve kargosu bilinmeyen satışlar fiyata girmez; yinelenenler ayıklanır; satıcı sayısı', () => {
  const now = new Date('2026-09-20T00:00:00Z');
  const L = (d, price, ship, seller, extra = {}) => ({ url: 'https://www.ebay.com/itm/' + d + price, title: 't', price, shipping: ship, shippingKnown: ship != null, soldAt: new Date(now - d * 864e5).toISOString().slice(0, 10), seller, match: { verdict: 'exact' }, ...extra });
  const sold = [L(1, 20, 0, 'a'), L(1, 20, 0, 'a'), L(10, 22, 5, 'b'), L(40, 30, 0, 'c', { bestOffer: true }), L(50, 25, null, 'a'), L(100, 10, 0, 'z')];
  const s = summarizeEbay({ sold, now });
  assert.equal(s.duplicatesRemoved, 1); assert.equal(s.exactSold90, 4); assert.equal(s.exactSold30, 2);
  assert.equal(s.pricedCount, 2); assert.equal(s.medianTotal, 23.5); assert.equal(s.bestOfferExcluded, 1); assert.equal(s.shippingUnknownExcluded, 1);
  assert.equal(s.distinctSellers, 3); assert.equal(s.unitsSold, null);
  assert.equal(matchSummary(s).verdict, 'exact');
});
test('eBay ilan normalizasyonu: kargo yoksa bilinmiyor (0 değil); best offer; tarih; satıcı', () => {
  const l = normalizeListing({ title: 'X', url: 'u', priceText: '$12.99', shippingText: '', soldText: 'Sold  Sep 12, 2026', seller: 'shop_a (1,204) 99.1%', bestOffer: true }, { sold: true });
  assert.equal(l.shippingKnown, false); assert.equal(l.total, null); assert.equal(l.soldAt, '2026-09-12'); assert.equal(l.seller, 'shop_a'); assert.equal(l.bestOffer, true);
  const l2 = normalizeListing({ title: 'X', priceText: '$10.00 to $15.00', shippingText: 'Free shipping' }, { sold: false });
  assert.equal(l2.price, null); assert.ok(l2.priceRange); assert.equal(l2.shipping, 0);
});
test('sorgu sırası: UPC → model → başlık', () => {
  const q = buildQueries({ upc: '012345678905', model: 'MB-PH5', brand: 'Marbrasse', title: 'Marbrasse Pen Holder Desk Organizer' });
  assert.deepEqual(q.map(x => x.type), ['upc', 'model', 'title']);
});
test('Amazon normalizasyonu: ağırlık oz, ücretsiz teslimat → 0, kupon koşullu, fiyat', () => {
  const az = normalizeProduct({ layoutOk: true, title: 'T', priceText: '$14.99', brandText: 'Visit the Marbrasse Store', deliveryText: 'FREE delivery Tuesday', details: { 'Item model number': 'MB-1', 'Item Weight': '1.5 pounds' }, conditional: [{ type: 'coupon', note: 'Apply $3 coupon' }] }, 'now');
  assert.equal(az.price, 14.99); assert.equal(az.brand, 'Marbrasse'); assert.equal(az.weightOz, 24); assert.equal(az.inboundShipping, 0); assert.ok(az.conditionalPrice);
  const az2 = normalizeProduct({ layoutOk: true, title: 'T', deliveryText: '$6.99 delivery Sep 26', details: {} }, 'now');
  assert.equal(az2.inboundShipping, 6.99); assert.equal(az2.price, null);
  const az3 = normalizeProduct({ layoutOk: true, title: 'T', deliveryText: 'Arrives Tuesday', details: {} }, 'now');
  assert.equal(az3.inboundShipping, null);
});
test('risk: batarya/elektrikli/gıda ürünleri elenir; sade düzenleyici geçer', () => {
  assert.equal(assessRisk({ title: 'LED Desk Lamp with USB Charging Port' }).flagged, true);
  assert.equal(assessRisk({ title: 'Bamboo Cutting Board Set' }).flagged, true);
  assert.equal(assessRisk({ title: 'Mesh Pen Holder Desk Organizer Black' }).flagged, false);
});
test('engel tespiti', () => {
  assert.equal(detectBlock({ url: 'https://www.amazon.com/errors/validateCaptcha', title: 'Amazon', text: 'Enter the characters you see below' }).kind, 'captcha');
  assert.equal(detectBlock({ url: 'https://www.ebay.com/splashui/challenge', title: 'Pardon Our Interruption', text: '' }).site, 'ebay');
  assert.equal(detectBlock({ url: 'https://www.amazon.com/dp/X', title: 'Product', text: 'Buy now', status: 200 }).blocked, false);
  assert.equal(detectBlock({ url: 'https://www.ebay.com/sch/i.html', title: 'x', text: '', status: 429 }).blocked, true);
});
test('CSV formül enjeksiyonu engellenir', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`); assert.equal(csvCell('+1'), "'+1"); assert.equal(csvCell('normal'), 'normal'); assert.equal(csvCell('a,b'), '"a,b"');
});

test('ilan bazında kullanıcı kararı istatistikleri yeniden hesaplar (kaynak veri değişmez)', async () => {
  const { effectiveProduct } = await import('../src/effective.js');
  const now = new Date().toISOString().slice(0, 10);
  const L = (u, v) => ({ url: u, title: 't', price: 20, shipping: 0, shippingKnown: true, soldAt: now, seller: 's' + u, match: { verdict: v, reasons: [] } });
  const p = { ebay: { checkedAt: new Date().toISOString(), sold: { listings: [L('a', 'exact'), L('b', 'uncertain'), L('c', 'uncertain')] }, active: { listings: [] }, stats: { exactSold90: 1 }, matchSummary: { verdict: 'exact' } }, overrides: { listingVerdicts: { b: 'exact', a: 'mismatch' } } };
  const e = effectiveProduct(p);
  assert.equal(e.ebay.stats.exactSold90, 1); assert.equal(e.ebay.stats.uncertainSold90, 1); assert.equal(e.ebay.stats.userAdjusted, true);
  assert.equal(p.ebay.sold.listings[0].match.verdict, 'exact'); // kaynak dokunulmadı
  assert.equal(effectiveProduct({ ebay: p.ebay, overrides: {} }).ebay.stats.exactSold90, 1);
});
