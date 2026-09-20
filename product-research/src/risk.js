// Ürün bazında risk kontrolü. Kategori uygun olsa bile ürün başlığı/özellikleri taranır.
// Sayfa metni veri olarak işlenir; içindeki talimatlar uygulanmaz.
const EXCLUDED = [
  { re: /\b(battery|batteries|rechargeable|lithium|li-ion|power bank|charger|charging)\b/i, reason: 'Batarya/şarj ürünü' },
  { re: /\b(food|snack|candy|tea|coffee|drink|beverage|edible|spice|supplement|vitamin|protein)\b/i, reason: 'Gıda/içecek/takviye' },
  { re: /\b(medicine|medical|pharma|drug|first aid|thermometer|bandage|pill)\b/i, reason: 'İlaç/medikal' },
  { re: /\b(cosmetic|makeup|lipstick|skincare|lotion|cream|serum|shampoo|soap|toothbrush|toothpaste|mouthwash|deodorant|perfume)\b/i, reason: 'Kozmetik / cilde-ağıza uygulanan ürün' },
  { re: /\b(baby|infant|toddler|crib|pacifier|car seat|stroller)\b/i, reason: 'Bebek güvenliği ürünü' },
  { re: /\b(helmet|respirator|safety glasses|goggles|protective|ppe|mask|life jacket)\b/i, reason: 'Koruyucu ekipman' },
  { re: /\b(brake|airbag|seat belt|smoke detector|carbon monoxide|fire extinguisher)\b/i, reason: 'Güvenlik açısından kritik parça' },
  { re: /\b(chemical|solvent|acid|bleach|pesticide|flammable|aerosol|lighter fluid|propane|butane|fuel)\b/i, reason: 'Kimyasal/yanıcı madde' },
  { re: /\b(cutting board|food storage|lunch box|water bottle|tumbler|mug|plate|bowl set|utensil|spatula|baking|bakeware|cookware)\b/i, reason: 'Gıda ile temas eden ürün' },
  { re: /\b(knife|blade|razor|scalpel)\b/i, reason: 'Kesici ürün (risk politikası)' },
  { re: /\b(recall|recalled)\b/i, reason: 'Geri çağırma ifadesi' },
  { re: /\b(replica|inspired by|compatible with (apple|nike|lego|disney))\b/i, reason: 'Sahtecilik/marka ihlali riski' },
  { re: /\b(electric|electronic|plug-in|usb|led|wireless|bluetooth|heated|motorized)\b/i, reason: 'Elektrikli ürün (kapsam: elektriksiz)' },
];
const BRAND_RISK = /\b(disney|marvel|nike|adidas|apple|lego|pokemon|nintendo|hello kitty|star wars|harry potter)\b/i;

export function assessRisk({ title = '', brand = '', bullets = [], details = {}, availability = '' }) {
  const text = [title, brand, ...(bullets || []), ...Object.entries(details || {}).map(([k, v]) => `${k} ${v}`)].join(' \n ');
  const reasons = [];
  for (const rule of EXCLUDED) if (rule.re.test(text)) reasons.push(rule.reason);
  if (BRAND_RISK.test(title) && !BRAND_RISK.test(brand)) reasons.push('Lisanslı marka adı geçiyor; sahtecilik/İP riski');
  if (/currently unavailable|out of stock/i.test(availability)) reasons.push('Stokta yok');
  if (/\b(hazmat|hazardous)\b/i.test(text)) reasons.push('Tehlikeli madde işareti');
  return { flagged: reasons.length > 0, reasons: [...new Set(reasons)] };
}
