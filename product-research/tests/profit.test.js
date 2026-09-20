import test from 'node:test';
import assert from 'node:assert/strict';
import { computeScenario, stressInputs, buildAnalysis } from '../src/profit.js';
import { DEFAULT_SETTINGS } from '../src/fees.js';
import { decide } from '../src/decision.js';

const base = { marketTotal: 40, shippingCharged: 6, amazonPrice: 15, amazonTaxRate: 0, inbound: 0, importCost: 0, ebayFeeRate: 13.6, ebayFeeFixedOver10: 0.40, ebayFeeFixedUnder10: 0.30,
  ebayFeeIncludesSalesTax: false, ebayBuyerSalesTaxRate: 0, otherFees: 0, adRate: 0, outbound: 6, packagingCost: 0.75, selfOpsCost: 0.5, otherOps: 0, riskRate: 3, fulfillmentModel: 'self', targetMarginPct: 15 };

test('kargo tahsilatı: piyasa toplamına tekrar kargo eklenmez; ürün bedeli = toplam − kargo', () => {
  const r = computeScenario(base);
  assert.equal(r.revenue, 40); assert.equal(r.itemPrice, 34); assert.equal(r.shippingCharged, 6);
});
test('komisyon matrahı: satış vergisi dahil ise matrah büyür, gelir değişmez', () => {
  const a = computeScenario(base);
  const b = computeScenario({ ...base, ebayFeeIncludesSalesTax: true, ebayBuyerSalesTaxRate: 10 });
  assert.equal(b.revenue, 40); assert.equal(b.feeBase, 44); assert.equal(b.costs.ebayFeePct, 5.98); assert.equal(a.costs.ebayFeePct, 5.44);
  assert.ok(b.netProfit < a.netProfit);
});
test('sabit ücret: 10 USD ve altı siparişte düşük sabit ücret', () => {
  assert.equal(computeScenario({ ...base, marketTotal: 10 }).costs.ebayFeeFixed, 0.30);
  assert.equal(computeScenario({ ...base, marketTotal: 10.01 }).costs.ebayFeeFixed, 0.40);
});
test('net kâr ve marj hesabı (marj gelire oranlanır, maliyete değil)', () => {
  const r = computeScenario(base);
  // giderler: 15 + 0 + 0 + 0 + 5.44 + 0.40 + 0 + 0 + 6 + 0.75 + 0.5 + 0 + 1.2 = 29.29
  assert.equal(r.totalCosts, 29.29); assert.equal(r.netProfit, 10.71); assert.equal(r.marginPct, 26.78);
});
test('azami alış fiyatı %15 marjı korur', () => {
  const r = computeScenario(base);
  const check = computeScenario({ ...base, amazonPrice: r.maxBuyPrice });
  assert.ok(Math.abs(check.marginPct - 15) < 0.05, `marj ${check.marginPct}`);
});
test('alış vergisi azami alış fiyatını düşürür', () => {
  const a = computeScenario(base).maxBuyPrice, b = computeScenario({ ...base, amazonTaxRate: 8 }).maxBuyPrice;
  assert.ok(b < a);
});
test('eksik maliyet sıfır sayılmaz: hesap yapılmaz ve eksik alan bildirilir', () => {
  const r = computeScenario({ ...base, outbound: null });
  assert.equal(r.ok, false); assert.deepEqual(r.missing, ['Müşteriye gönderim maliyeti']);
  const r2 = computeScenario({ ...base, inbound: null }); assert.ok(r2.missing.includes('Amazon→bana/depoya kargo'));
});
test('stres testi: amazon +%5, gelir −%5, gönderim +2', () => {
  const s = stressInputs(base);
  assert.equal(s.amazonPrice, 15.75); assert.equal(s.marketTotal, 38); assert.equal(s.outbound, 8);
  assert.ok(computeScenario(s).netProfit < computeScenario(base).netProfit);
});
test('ara depo senaryosu: paketleme depo ücretine dahilse iki kez sayılmaz', () => {
  const wh = computeScenario({ ...base, fulfillmentModel: 'warehouse', warehouseFee: 4, packagingCovered: true });
  assert.equal(wh.costs.packaging, 0); assert.equal(wh.costs.fulfillment, 4);
  const wh2 = computeScenario({ ...base, fulfillmentModel: 'warehouse', warehouseFee: 4, packagingCovered: false });
  assert.equal(wh2.costs.packaging, 0.75);
});

function product(over = {}) {
  return {
    status: 'done', amazon: { access: 'ok', price: 15, inboundShipping: 0, weightOz: 12, variant: {} }, risk: { flagged: false, reasons: [] }, overrides: {},
    ebay: { access: 'ok', sold: { itemsExamined: 10 }, matchSummary: { verdict: 'exact' }, stats: { exactSold90: 8, exactSold30: 3, distinctSellers: 3, medianTotal: 40, q1Total: 36, uncertainSold90: 0 } },
    ...over,
  };
}
const verified = { ...DEFAULT_SETTINGS, setupConfirmed: true, ebayFeeVerified: true, ebayFeeIncludesSalesTax: false };

test('karar: doğrulanmış gönderim + yeterli talep + temkinli marj → UYGUN', () => {
  const p = product({ overrides: { outboundCost: 6, outboundVerified: true } });
  const a = buildAnalysis(p, verified, 'self');
  assert.equal(a.estimated.length, 0, JSON.stringify(a.estimated));
  assert.equal(decide(p, a, verified).decision, 'eligible');
});
test('karar: tahmini gönderim tablosu kullanıldığında → KOŞULLU ("tahmini maliyetle hesaplandı")', () => {
  const p = product(); const a = buildAnalysis(p, verified, 'self');
  assert.ok(a.estimated.some(e => e.includes('Müşteriye gönderim')));
  assert.equal(decide(p, a, verified).decision, 'conditional');
});
test('karar: komisyon doğrulanmamışsa UYGUN olamaz', () => {
  const p = product({ overrides: { outboundCost: 6, outboundVerified: true } });
  const s = { ...verified, ebayFeeVerified: false };
  assert.equal(decide(p, buildAnalysis(p, s, 'self'), s).decision, 'conditional');
});
test('karar: doğrulanmış talep yetersiz → ELENEN; erişim engeli → VERİ EKSİK', () => {
  const low = product(); low.ebay.stats = { ...low.ebay.stats, exactSold90: 2, uncertainSold90: 0 };
  assert.equal(decide(low, buildAnalysis(low, verified, 'self'), verified).decision, 'rejected');
  const blocked = product({ status: 'blocked', ebay: { access: 'blocked', note: 'CAPTCHA' } });
  assert.equal(decide(blocked, buildAnalysis(blocked, verified, 'self'), verified).decision, 'missing');
});
test('karar: yalnızca baz fiyatla yeterli marj → KOŞULLU', () => {
  const p = product({ overrides: { outboundCost: 6, outboundVerified: true } }); p.ebay.stats = { ...p.ebay.stats, medianTotal: 40, q1Total: 26 };
  const a = buildAnalysis(p, verified, 'self'); const d = decide(p, a, verified);
  assert.equal(d.decision, 'conditional'); assert.ok(d.reasons.some(r => r.includes('Yalnızca baz')));
});
test('karar: marj her iki senaryoda eşik altında ve girdiler doğrulanmış → ELENEN', () => {
  const p = product({ overrides: { outboundCost: 6, outboundVerified: true } }); p.ebay.stats = { ...p.ebay.stats, medianTotal: 24, q1Total: 22 };
  assert.equal(decide(p, buildAnalysis(p, verified, 'self'), verified).decision, 'rejected');
});
test('karar: risk → ELENEN; eşleşme yanlış → ELENEN', () => {
  const r = product({ risk: { flagged: true, reasons: ['Batarya'] } });
  assert.equal(decide(r, buildAnalysis(r, verified, 'self'), verified).decision, 'rejected');
  const m = product(); m.ebay.matchSummary = { verdict: 'mismatch' };
  assert.equal(decide(m, buildAnalysis(m, verified, 'self'), verified).decision, 'rejected');
});
test('analiz: ağırlık ve genel tahmin yoksa gönderim eksik → hesap yapılmaz, karar KOŞULLU', () => {
  const p = product(); p.amazon.weightOz = null;
  const a = buildAnalysis(p, { ...verified, outboundUnknownWeightEstimate: null }, 'self');
  assert.equal(a.selected.conservative.ok, false);
  assert.equal(decide(p, a, verified).decision, 'conditional');
});
