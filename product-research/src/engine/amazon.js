// Amazon sayfa ayrıştırıcıları. Fonksiyonlar page.evaluate içinde çalışır (dış kapsam kullanmaz).
// Yapı değiştiğinde alanlar null döner ve "doğrulanamadı" olarak işaretlenir; yanlış veri üretilmez.

export function parseSearchPageInBrowser() {
  const out = { items: [], nextUrl: null, resultText: null, layoutOk: false };
  const nodes = document.querySelectorAll('div.s-main-slot div[data-component-type="s-search-result"][data-asin], div[data-asin][data-index]');
  out.layoutOk = nodes.length > 0;
  const seen = new Set();
  for (const n of nodes) {
    const asin = n.getAttribute('data-asin'); if (!asin || seen.has(asin)) continue;
    const sponsored = !!(n.querySelector('.puis-sponsored-label-text, [data-component-type="sp-sponsored-result"], .s-sponsored-label-info-icon') || n.querySelector('a[href*="/sspa/click"]'));
    const h2 = n.querySelector('h2');
    const title = h2 ? h2.textContent.trim() : null;
    const a = n.querySelector('h2 a[href], a.a-link-normal.s-no-outline[href], a.a-link-normal[href*="/dp/"]');
    let href = a ? a.getAttribute('href') : null;
    if (href && href.startsWith('/')) href = location.origin + href;
    const priceEl = n.querySelector('.a-price[data-a-color="base"] .a-offscreen, .a-price .a-offscreen');
    const price = priceEl ? priceEl.textContent.trim() : null;
    const rating = n.querySelector('.a-icon-alt')?.textContent?.trim() || null;
    const bought = [...n.querySelectorAll('span')].map(s => s.textContent.trim()).find(t => /bought in past month/i.test(t)) || null;
    seen.add(asin);
    out.items.push({ asin, title, url: href || (location.origin + '/dp/' + asin), priceText: price, sponsored, rating, boughtText: bought });
  }
  const next = document.querySelector('a.s-pagination-next:not(.s-pagination-disabled)');
  if (next) out.nextUrl = new URL(next.getAttribute('href'), location.origin).toString();
  out.resultText = document.querySelector('[data-component-type="s-result-info-bar"] h1, .s-breadcrumb, span[data-component-type="s-result-info-bar"]')?.textContent?.trim() || null;
  return out;
}

export function parseProductPageInBrowser() {
  const txt = (sel) => { const e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
  const out = { layoutOk: false };
  out.title = txt('#productTitle');
  out.layoutOk = !!out.title;
  out.asin = (location.pathname.match(/\/dp\/([A-Z0-9]{10})/) || [])[1] || document.querySelector('input#ASIN')?.value || null;
  // fiyat: tek seferlik satın alma fiyatı
  const priceSel = ['#corePrice_feature_div .a-price .a-offscreen', '#corePriceDisplay_desktop_feature_div .priceToPay .a-offscreen', '#apex_desktop .a-price .a-offscreen',
    '#priceblock_ourprice', '#priceblock_dealprice', '#tp_price_block_total_price_ww .a-offscreen', '#price_inside_buybox', '#newBuyBoxPrice'];
  out.priceText = null;
  for (const s of priceSel) { const t = txt(s); if (t && /\$\s?\d/.test(t)) { out.priceText = t; break; } }
  // koşullu indirimler (kupon, abonelik)
  const cond = [];
  const couponEl = document.querySelector('#couponBadgeRegularVpc, .promoPriceBlockMessage, [id^="vpcButton"] label, #vpcButton, .couponBadge');
  if (couponEl) cond.push({ type: 'coupon', note: couponEl.textContent.replace(/\s+/g, ' ').trim().slice(0, 140) });
  const sns = document.querySelector('#snsAccordionRowMiddle, #sns-base-price, #snsPrice');
  if (sns) cond.push({ type: 'subscribe_save', note: sns.textContent.replace(/\s+/g, ' ').trim().slice(0, 140) });
  out.conditional = cond;
  out.brandText = txt('#bylineInfo') || txt('#brand') || null;
  out.availability = txt('#availability') || txt('#outOfStock') || null;
  out.seller = txt('#sellerProfileTriggerId') || txt('div.tabular-buybox-text[tabular-attribute-name="Sold by"]') || txt('#merchantInfo') || null;
  out.shipsFrom = txt('div.tabular-buybox-text[tabular-attribute-name="Ships from"]') || txt('#fulfillerInfoFeature_feature_div') || null;
  const delEl = document.querySelector('#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE, #deliveryBlockMessage, [data-csa-c-delivery-price]');
  out.deliveryText = delEl ? delEl.textContent.replace(/\s+/g, ' ').trim() : null;
  out.deliveryPriceAttr = delEl ? (delEl.getAttribute('data-csa-c-delivery-price') || delEl.querySelector('[data-csa-c-delivery-price]')?.getAttribute('data-csa-c-delivery-price') || null) : null;
  out.boughtText = txt('#social-proofing-faceout-title-tk_bought') || null;
  out.ratingText = txt('#acrPopover') || null;
  out.reviewCountText = txt('#acrCustomerReviewText') || null;
  out.bullets = [...document.querySelectorAll('#feature-bullets li span.a-list-item')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 12);
  // ürün bilgileri tablosu
  const details = {};
  for (const tr of document.querySelectorAll('#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr, #productDetails_techSpec_section_2 tr, table.prodDetTable tr')) {
    const k = tr.querySelector('th')?.textContent?.replace(/\s+/g, ' ').trim(); const v = tr.querySelector('td')?.textContent?.replace(/\s+/g, ' ').trim();
    if (k && v) details[k] = v;
  }
  for (const li of document.querySelectorAll('#detailBullets_feature_div li, #detailBulletsWrapper_feature_div li')) {
    const spans = li.querySelectorAll('span.a-text-bold, span'); const t = li.textContent.replace(/\s+/g, ' ').trim();
    const m = t.match(/^(.+?)\s*[:‏‎]+\s*(.+)$/); if (m) details[m[1].replace(/[‎‏:]/g, '').trim()] = m[2].replace(/[‎‏]/g, '').trim();
  }
  out.details = details;
  out.variant = {
    color: txt('#variation_color_name .selection') || txt('#inline-twister-expanded-dimension-text-color_name') || null,
    size: txt('#variation_size_name .selection') || txt('#inline-twister-expanded-dimension-text-size_name') || null,
    style: txt('#variation_style_name .selection') || null,
    count: document.querySelectorAll('#twister .a-button, #twister li, [id^="inline-twister-row"] li').length,
  };
  out.usedOffer = !!document.querySelector('#usedBuySection, #usedAccordionRow');
  return out;
}

// evaluate çıktısını yapılandırılmış ürün kaydına çevirir (Node tarafı).
export function normalizeProduct(raw, checkedAt) {
  const money = (t) => { if (!t) return null; const m = String(t).replace(/,/g, '').match(/\$\s?(\d+(?:\.\d{1,2})?)/); return m ? Number(m[1]) : null; };
  const d = raw.details || {};
  const get = (...keys) => { for (const k of keys) { const hit = Object.keys(d).find(x => x.toLowerCase().replace(/\s+/g, ' ') === k.toLowerCase()); if (hit) return d[hit]; } return null; };
  let brand = null;
  if (raw.brandText) { const m = raw.brandText.match(/(?:Visit the (.+?) Store|Brand:\s*(.+))/i); brand = m ? (m[1] || m[2]).trim() : raw.brandText.trim(); }
  brand = get('Brand', 'Brand Name') || brand;
  const model = get('Item model number', 'Model Number', 'Model', 'Part Number', 'Manufacturer Part Number');
  const upc = get('UPC', 'EAN', 'GTIN');
  const weightText = get('Item Weight', 'Product Weight') || (get('Package Dimensions', 'Product Dimensions') || '').split(';')[1]?.trim() || null;
  let weightOz = null;
  if (weightText) { const m = weightText.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(ounces|ounce|oz|pounds|pound|lbs|lb|grams|g|kilograms|kg)\b/); if (m) { const v = Number(m[1]); const u = m[2]; weightOz = /oz|ounce/.test(u) ? v : /lb|pound/.test(u) ? v * 16 : /kg|kilogram/.test(u) ? v * 35.274 : v / 28.3495; weightOz = Math.round(weightOz * 10) / 10; } }
  const dims = get('Product Dimensions', 'Package Dimensions', 'Item Dimensions LxWxH') || null;
  const packText = get('Number of Items', 'Unit Count', 'Item Package Quantity');
  const packCount = packText ? Number(String(packText).match(/\d+/)?.[0]) || null : null;
  // Amazon→bana kargo: teslimat metninden. Doğrulanamazsa null (asla 0 varsayılmaz).
  let inboundShipping = null, inboundSource = 'missing', deliveryNote = raw.deliveryText || null;
  const dp = raw.deliveryPriceAttr || raw.deliveryText || '';
  if (/\bfree\b/i.test(dp)) { inboundShipping = 0; inboundSource = 'source'; }
  else { const m = dp.replace(/,/g, '').match(/\$\s?(\d+(?:\.\d{1,2})?)\s*(?:delivery|shipping)/i); if (m) { inboundShipping = Number(m[1]); inboundSource = 'source'; } }
  const price = money(raw.priceText);
  const conditional = (raw.conditional || []).length ? { note: raw.conditional.map(c => c.note).join(' | '), types: raw.conditional.map(c => c.type) } : null;
  const bsr = get('Best Sellers Rank', 'Amazon Best Sellers Rank');
  return {
    access: 'ok', layoutOk: !!raw.layoutOk, checkedAt,
    asin: raw.asin || null, title: raw.title || null, brand: brand || null, model: model || null, upc: upc || null,
    variant: { color: raw.variant?.color || get('Color') || null, size: raw.variant?.size || get('Size') || null, style: raw.variant?.style || null, count: raw.variant?.count || 0 },
    packCount, condition: 'New (Amazon ana satın alma kutusu)', price, priceText: raw.priceText || null, conditionalPrice: conditional,
    seller: raw.seller || null, shipsFrom: raw.shipsFrom || null, availability: raw.availability || null, deliveryText: deliveryNote,
    inboundShipping, inboundSource, weightOz, weightText: weightText || null, dims,
    demand: { boughtText: raw.boughtText || null, ratingText: raw.ratingText || null, reviewCountText: raw.reviewCountText || null, bsr: bsr || null,
      note: 'Kaynakta göründüğü biçimde saklanır; kesin satış adedi türetilmez' },
    bullets: raw.bullets || [], details: d,
    unverified: [
      ...(price == null ? ['fiyat'] : []), ...(model == null ? ['model numarası'] : []), ...(upc == null ? ['UPC/EAN'] : []),
      ...(weightOz == null ? ['ağırlık'] : []), ...(inboundShipping == null ? ['Amazon kargo bedeli'] : []), ...(raw.seller ? [] : ['satıcı']),
    ],
  };
}

export const AMAZON_DP = (asin) => `https://www.amazon.com/dp/${asin}?th=1&psc=1`;
