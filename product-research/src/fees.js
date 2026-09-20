// eBay ücret varsayılanları ve ayar varsayılanları.
// DİKKAT: Bu değerler geliştirme sırasında resmî eBay sayfasından DOĞRULANAMADI (ağ erişimi engelliydi);
// üçüncü taraf özetlerden alınmıştır. Kullanıcı ayarlar panelinden resmî sayfayı açıp doğrulayana kadar
// tüm sonuçlar "Koşullu" olarak işaretlenir.

export const EBAY_FEE_SOURCE_URL = 'https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822';
export const EBAY_STORE_FEE_SOURCE_URL = 'https://www.ebay.com/help/selling/fees-credits-invoices/store-selling-fees?id=4809';

export const EBAY_ACCOUNT_TYPES = [
  { id: 'no_store', label: 'Mağazasız hesap', defaultFeeRate: 13.6 },
  { id: 'starter', label: 'Starter mağaza', defaultFeeRate: 13.6 },
  { id: 'basic', label: 'Basic mağaza', defaultFeeRate: 12.35 },
  { id: 'premium', label: 'Premium mağaza', defaultFeeRate: 12.35 },
  { id: 'anchor', label: 'Anchor mağaza', defaultFeeRate: 12.35 },
];

export const DEFAULT_SETTINGS = {
  setupConfirmed: false,          // kullanıcı ilk kurulum maliyetlerini gözden geçirip kaydetti mi
  originZip: '',
  sampleDestZip: '',
  amazonTaxRate: 0,               // % — geri alınamayan alış vergisi (kullanıcı girmeli)
  amazonInboundDefault: null,     // USD — Amazon'dan bana kargo doğrulanamazsa kullanılacak tahmin (null = bilinmiyor)
  importCost: 0,                  // USD — ithalat/gümrük (ABD içi için genelde 0)
  ebayAccountType: 'no_store',
  ebayFeeRate: 13.6,              // % — kategori komisyonu
  ebayFeeFixedOver10: 0.40,       // USD — 10 USD üzeri siparişte sabit ücret
  ebayFeeFixedUnder10: 0.30,      // USD — 10 USD ve altı siparişte
  ebayFeeIncludesSalesTax: true,  // komisyon matrahına alıcının satış vergisi dahil mi
  ebayBuyerSalesTaxRate: 7,       // % — yalnızca komisyon matrahı için tahmini alıcı satış vergisi (gelir DEĞİL)
  ebayFeeVerified: false,
  ebayFeeSource: 'Üçüncü taraf özetler (resmî sayfa doğrulanamadı)',
  ebayFeeCheckedAt: '2026-09-20',
  otherFees: 0,                   // USD/sipariş — diğer geçerli ücretler
  adRate: 0,                      // % — reklam (Promoted Listings) oranı
  packagingCost: 0.75,            // USD
  selfOpsCost: 0.50,              // USD — kendi gönderimim için operasyon gideri
  warehouseFee: 4,                // USD — ara depo (seçili senaryo); 3/4/5 ayrıca karşılaştırılır
  warehouseFeeCovers: 'Kabul, depolama (kısa süre), paketleme ve etiketleme; kargo ücreti ve paketleme malzemesi HARİÇ',
  warehouseIncludesPackaging: false, // true ise depo ücreti paketlemeyi kapsar, paketleme ayrıca sayılmaz
  otherOps: 0,                    // USD
  riskRate: 3,                    // % gelir — iade/hasar/kayıp payı (tahmin)
  shippingChargedDefault: 0,      // USD — müşteriden tahsil edilecek kargo (0 = ücretsiz kargo)
  outboundTable: [                // ağırlık (oz) üst sınırı → tahmini gönderim maliyeti (USD). TAHMİNDİR.
    { maxOz: 4, cost: 4.50 }, { maxOz: 8, cost: 5.00 }, { maxOz: 12, cost: 5.60 }, { maxOz: 16, cost: 6.50 },
    { maxOz: 32, cost: 8.20 }, { maxOz: 48, cost: 9.90 }, { maxOz: 80, cost: 12.50 }, { maxOz: 160, cost: 17.00 },
  ],
  outboundUnknownWeightEstimate: null, // USD — ağırlık bilinmiyorsa (null = hesaplanamaz)
  minMarginPct: 15,
  demandMinSold90: 5,
  demandMinSellers: 2,
  ebayMaxResultPages: 1,
  requestDelayMinMs: 2500,
  requestDelayMaxMs: 6000,
};

export function estimateOutbound(weightOz, settings) {
  if (weightOz == null || !Number.isFinite(weightOz)) {
    return settings.outboundUnknownWeightEstimate != null
      ? { cost: Number(settings.outboundUnknownWeightEstimate), source: 'estimate', note: 'Ağırlık bilinmiyor; ayarlardaki genel tahmin kullanıldı' }
      : { cost: null, source: 'missing', note: 'Paket ağırlığı doğrulanamadı ve genel tahmin tanımlı değil' };
  }
  const table = [...(settings.outboundTable || [])].sort((a, b) => a.maxOz - b.maxOz);
  for (const row of table) if (weightOz <= row.maxOz) return { cost: Number(row.cost), source: 'estimate', note: `Ağırlık ${weightOz} oz → ayarlardaki tahmini tarife (≤${row.maxOz} oz)` };
  return { cost: null, source: 'missing', note: `Ağırlık ${weightOz} oz tarife tablosunun dışında` };
}
