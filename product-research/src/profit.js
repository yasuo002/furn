// Kâr hesabı — saf fonksiyonlar. Tüm tutarlar USD.
// Gelir = ürün bedeli + müşteriden tahsil edilen kargo = eBay piyasa TOPLAM fiyatı (ürün + kargo).
// eBay'in tahsil edip aktardığı satış vergisi gelir değildir; yalnızca komisyon matrahına girer.
// Hesaplanan kâr, işletme gelir/kurumlar vergisi ÖNCESİ operasyonel net kârdır.
import { estimateOutbound } from './fees.js';

export const round2 = (n) => (n == null || !Number.isFinite(n) ? null : Math.round(n * 100) / 100);

export function computeScenario(i) {
  const missing = [];
  if (i.marketTotal == null) missing.push('eBay piyasa fiyatı');
  if (i.amazonPrice == null) missing.push('Amazon fiyatı');
  if (i.inbound == null) missing.push('Amazon→bana/depoya kargo');
  if (i.outbound == null) missing.push('Müşteriye gönderim maliyeti');
  if (missing.length) return { ok: false, missing };

  const revenue = i.marketTotal;
  const shippingCharged = Math.min(i.shippingCharged ?? 0, revenue);
  const itemPrice = revenue - shippingCharged;
  const taxRate = (i.ebayBuyerSalesTaxRate ?? 0) / 100;
  const feeBase = i.ebayFeeIncludesSalesTax ? revenue * (1 + taxRate) : revenue;
  const feePct = feeBase * ((i.ebayFeeRate ?? 0) / 100);
  const feeFixed = revenue > 10 ? (i.ebayFeeFixedOver10 ?? 0) : (i.ebayFeeFixedUnder10 ?? 0);
  const otherFees = i.otherFees ?? 0;
  const ads = revenue * ((i.adRate ?? 0) / 100);
  const risk = revenue * ((i.riskRate ?? 0) / 100);
  const amazonTax = i.amazonPrice * ((i.amazonTaxRate ?? 0) / 100);
  const packaging = i.packagingCovered ? 0 : (i.packagingCost ?? 0);
  const fulfillment = i.fulfillmentModel === 'warehouse' ? (i.warehouseFee ?? 0) : (i.selfOpsCost ?? 0);
  const costs = {
    amazonPrice: i.amazonPrice, amazonTax, inbound: i.inbound, importCost: i.importCost ?? 0,
    ebayFeePct: feePct, ebayFeeFixed: feeFixed, otherFees, ads, outbound: i.outbound, packaging,
    fulfillment, otherOps: i.otherOps ?? 0, risk,
  };
  const totalCosts = Object.values(costs).reduce((a, b) => a + b, 0);
  const netProfit = revenue - totalCosts;
  const marginPct = revenue > 0 ? (netProfit / revenue) * 100 : null;
  // %m marjı koruyan azami Amazon alış fiyatı: R(1-m) - (diğer giderler) = P(1+t)
  const otherCosts = totalCosts - i.amazonPrice - amazonTax;
  const m = (i.targetMarginPct ?? 15) / 100;
  const maxBuyPrice = (revenue * (1 - m) - otherCosts) / (1 + (i.amazonTaxRate ?? 0) / 100);
  return {
    ok: true, revenue: round2(revenue), itemPrice: round2(itemPrice), shippingCharged: round2(shippingCharged),
    feeBase: round2(feeBase), costs: Object.fromEntries(Object.entries(costs).map(([k, v]) => [k, round2(v)])),
    totalCosts: round2(totalCosts), netProfit: round2(netProfit), marginPct: round2(marginPct), maxBuyPrice: round2(maxBuyPrice),
  };
}

export function stressInputs(i) {
  if (i.marketTotal == null || i.amazonPrice == null || i.outbound == null) return i;
  return { ...i, amazonPrice: i.amazonPrice * 1.05, marketTotal: i.marketTotal * 0.95, outbound: i.outbound + 2 };
}

// Ürün + ayarlar + kullanıcı değişiklikleri → tüm senaryolar.
export function buildAnalysis(product, settings, fulfillmentModel = 'self') {
  const az = product.amazon || {}; const eb = product.ebay || {}; const ov = product.overrides || {}; const st = eb.stats || {};
  const estimated = []; const missingInfo = []; const assumptions = [];

  const amazonPrice = az.price ?? null;
  if (amazonPrice == null) missingInfo.push('Amazon satın alınabilir fiyat doğrulanamadı');
  if (az.conditionalPrice) assumptions.push(`Koşullu fiyat (${az.conditionalPrice.note}) normal alış fiyatı sayılmadı`);

  // Amazon → bana / depoya kargo
  let inbound = null, inboundSource = 'missing';
  if (ov.inboundCost != null) { inbound = Number(ov.inboundCost); inboundSource = 'user_estimate'; estimated.push('Amazon kargo (kullanıcı tahmini)'); }
  else if (az.inboundShipping != null) { inbound = Number(az.inboundShipping); inboundSource = 'source'; }
  else if (settings.amazonInboundDefault != null) { inbound = Number(settings.amazonInboundDefault); inboundSource = 'estimate'; estimated.push('Amazon kargo (ayarlardaki tahmin)'); }
  else missingInfo.push('Amazon→bana kargo bedeli doğrulanamadı');

  // Müşteriye gönderim
  const weightOz = ov.weightOz != null ? Number(ov.weightOz) : (az.weightOz ?? null);
  if (ov.weightOz != null) estimated.push('Paket ağırlığı (kullanıcı tahmini)');
  let outbound = null, outboundSource = 'missing', outboundNote = '';
  if (ov.outboundCost != null) {
    outbound = Number(ov.outboundCost);
    if (ov.outboundVerified) { outboundSource = 'user_verified'; assumptions.push('Gönderim bedeli kullanıcı tarafından gerçek tarifeden doğrulandı'); }
    else { outboundSource = 'user_estimate'; estimated.push('Müşteriye gönderim (kullanıcı tahmini)'); }
  } else {
    const est = estimateOutbound(weightOz, settings);
    outbound = est.cost; outboundSource = est.source; outboundNote = est.note;
    if (est.source === 'estimate') estimated.push(`Müşteriye gönderim (${est.note})`);
    else missingInfo.push(`Müşteriye gönderim maliyeti: ${est.note}`);
  }
  if (az.weightOz == null && ov.weightOz == null) missingInfo.push('Paket ağırlığı Amazon sayfasında doğrulanamadı');

  const shippingCharged = ov.shippingCharged != null ? Number(ov.shippingCharged) : Number(settings.shippingChargedDefault || 0);
  if (!settings.ebayFeeVerified) estimated.push('eBay komisyon oranı resmî kaynaktan doğrulanmadı');
  if (!settings.setupConfirmed) estimated.push('İlk kurulum maliyetleri (vergi, paketleme, operasyon) onaylanmadı');
  assumptions.push(`Komisyon matrahı: gelir${settings.ebayFeeIncludesSalesTax ? ` + %${settings.ebayBuyerSalesTaxRate} tahmini alıcı satış vergisi` : ''}`);
  assumptions.push(`Risk payı gelirin %${settings.riskRate}'i (tahmin); %5 senaryosu ayrıca gösterilir`);
  if (settings.amazonTaxRate === 0) assumptions.push('Amazon alış vergisi %0 varsayıldı (ayarlardan girin)');

  const common = {
    amazonPrice, amazonTaxRate: settings.amazonTaxRate, inbound, importCost: settings.importCost,
    ebayFeeRate: settings.ebayFeeRate, ebayFeeFixedOver10: settings.ebayFeeFixedOver10, ebayFeeFixedUnder10: settings.ebayFeeFixedUnder10,
    ebayFeeIncludesSalesTax: settings.ebayFeeIncludesSalesTax, ebayBuyerSalesTaxRate: settings.ebayBuyerSalesTaxRate, otherFees: settings.otherFees,
    adRate: settings.adRate, outbound, packagingCost: settings.packagingCost, selfOpsCost: settings.selfOpsCost, otherOps: settings.otherOps,
    riskRate: settings.riskRate, shippingCharged, targetMarginPct: settings.minMarginPct,
  };
  const models = {
    self: { fulfillmentModel: 'self', packagingCovered: false },
    wh3: { fulfillmentModel: 'warehouse', warehouseFee: 3, packagingCovered: !!settings.warehouseIncludesPackaging },
    wh4: { fulfillmentModel: 'warehouse', warehouseFee: 4, packagingCovered: !!settings.warehouseIncludesPackaging },
    wh5: { fulfillmentModel: 'warehouse', warehouseFee: 5, packagingCovered: !!settings.warehouseIncludesPackaging },
  };
  const selectedKey = fulfillmentModel === 'warehouse' ? ('wh' + String(Math.round(Number(settings.warehouseFee) || 4))) : 'self';
  const selModel = models[selectedKey] || { fulfillmentModel: 'warehouse', warehouseFee: Number(settings.warehouseFee) || 4, packagingCovered: !!settings.warehouseIncludesPackaging };

  const prices = { base: st.medianTotal ?? null, conservative: st.q1Total ?? null };
  if (prices.base == null) missingInfo.push('eBay gerçekleşmiş satış fiyatı (medyan) hesaplanamadı');
  const scen = {};
  for (const [pk, mt] of Object.entries(prices)) {
    scen[pk] = {};
    for (const [mk, mv] of Object.entries(models)) scen[pk][mk] = computeScenario({ ...common, ...mv, marketTotal: mt });
  }
  const selBase = computeScenario({ ...common, ...selModel, marketTotal: prices.base });
  const selCons = computeScenario({ ...common, ...selModel, marketTotal: prices.conservative });
  const stress = computeScenario(stressInputs({ ...common, ...selModel, marketTotal: prices.conservative }));
  const risk5 = {
    base: computeScenario({ ...common, ...selModel, marketTotal: prices.base, riskRate: 5 }),
    conservative: computeScenario({ ...common, ...selModel, marketTotal: prices.conservative, riskRate: 5 }),
  };
  const competitionWarning = (st.activeLowestTotal != null && prices.conservative != null && st.activeLowestTotal < prices.conservative)
    ? `Aktif rakip toplam fiyatı (${st.activeLowestTotal} USD) temkinli satış fiyatının (${prices.conservative} USD) altında` : null;

  return {
    fulfillmentModel, selectedKey, inputs: { amazonPrice, inbound, inboundSource, outbound, outboundSource, outboundNote, weightOz, shippingCharged, prices },
    estimated, missingInfo, assumptions, scenarios: scen, selected: { base: selBase, conservative: selCons, stress, risk5 },
    competitionWarning,
  };
}
