// eBay arama sonuçları ayrıştırıcısı (Sold Items / aktif ilanlar). page.evaluate içinde çalışır.
export function buildEbayUrl(query, { sold = true, page = 1, perPage = 120, sortLowest = false } = {}) {
  const u = new URL('https://www.ebay.com/sch/i.html');
  u.searchParams.set('_nkw', query);
  u.searchParams.set('_ipg', String(perPage));
  u.searchParams.set('LH_ItemCondition', '1000'); // Yeni
  u.searchParams.set('LH_PrefLoc', '1'); // ABD içi
  u.searchParams.set('rt', 'nc');
  if (sold) { u.searchParams.set('LH_Sold', '1'); u.searchParams.set('LH_Complete', '1'); u.searchParams.set('_sop', '13'); } // 13 = en yeni bitiş
  else if (sortLowest) u.searchParams.set('_sop', '15'); // fiyat+kargo en düşük
  if (page > 1) u.searchParams.set('_pgn', String(page));
  return u.toString();
}

export function parseEbayResultsInBrowser() {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const out = { items: [], hasNext: false, layout: null, resultCountText: null, noResults: false };
  let cards = [...document.querySelectorAll('ul.srp-results li.s-item, li.s-item')];
  if (cards.length) out.layout = 'classic';
  else { cards = [...document.querySelectorAll('ul.srp-results li.s-card, li.s-card, div.s-card')]; if (cards.length) out.layout = 'card'; }
  out.resultCountText = clean(document.querySelector('.srp-controls__count-heading, h1.srp-controls__count-heading, .result-count__count-heading')?.textContent) || null;
  out.noResults = !!document.querySelector('.srp-save-null-search, .srp-null-search') || /0 results/i.test(out.resultCountText || '');
  for (const c of cards) {
    const titleEl = c.querySelector('.s-item__title, .s-card__title');
    const title = clean(titleEl?.textContent).replace(/^(new listing|sponsored)\s*/i, '');
    if (!title || /^shop on ebay$/i.test(title)) continue;
    const a = c.querySelector('a.s-item__link, a.s-card__link, a[href*="/itm/"]');
    const url = a ? a.href.split('?')[0] : null;
    const priceText = clean(c.querySelector('.s-item__price, .s-card__price')?.textContent);
    const shippingText = clean(c.querySelector('.s-item__shipping, .s-item__logisticsCost, .s-card__shipping, .s-item__freeXDays, .s-card__logisticsCost')?.textContent);
    const allText = clean(c.textContent);
    const soldEl = c.querySelector('.s-item__caption--signal, .s-item__ended-date, .s-item__caption .POSITIVE, .s-card__caption, .POSITIVE');
    const soldText = clean(soldEl?.textContent) || (allText.match(/Sold\s+[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}/) || [])[0] || null;
    const seller = clean(c.querySelector('.s-item__seller-info-text, .s-card__seller-info-text, .su-card-container__attributes__secondary .su-styled-text')?.textContent) || null;
    const subtitle = clean(c.querySelector('.s-item__subtitle, .s-card__subtitle')?.textContent) || null;
    const bestOffer = /best offer accepted/i.test(allText);
    const orBestOffer = /or best offer/i.test(allText);
    const qtySoldText = (allText.match(/\b[\d,]+\+?\s+sold\b/i) || [])[0] || null;
    const sponsored = /\bSponsored\b/.test(c.textContent) && !!c.querySelector('.s-item__sep, [aria-label="Sponsored"], .SECONDARY_INFO');
    out.items.push({ title, url, priceText, shippingText, soldText, seller, subtitle, bestOffer, orBestOffer, qtySoldText, sponsored });
  }
  out.hasNext = !!document.querySelector('a.pagination__next:not([aria-disabled="true"]), .pagination__next:not(.disabled) a');
  return out;
}

// Node tarafı: ham kart → yapılandırılmış ilan
export function normalizeListing(raw, { sold }) {
  const money = (t) => { if (!t) return null; const s = String(t).replace(/,/g, ''); if (/\bto\b/.test(s)) return null; const m = s.match(/\$\s?(\d+(?:\.\d{1,2})?)/); return m ? Number(m[1]) : null; };
  const price = money(raw.priceText);
  const priceRange = /\bto\b/.test(raw.priceText || '') ? raw.priceText : null;
  let shipping = null, shippingKnown = false, shippingNote = null;
  const st = raw.shippingText || '';
  if (/free/i.test(st)) { shipping = 0; shippingKnown = true; }
  else if (/\$\s?\d/.test(st)) { shipping = money(st); shippingKnown = shipping != null; }
  else if (/not specified|varies/i.test(st) || !st) { shippingNote = st ? 'Kargo belirtilmemiş' : 'Kargo bilgisi yok'; }
  let soldAt = null;
  if (raw.soldText) { const m = raw.soldText.match(/([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})/); if (m) { const d = new Date(`${m[1]} ${m[2]}, ${m[3]} 12:00:00 UTC`); if (!isNaN(d)) soldAt = d.toISOString().slice(0, 10); } }
  let seller = null, sellerFeedback = null;
  if (raw.seller) { const m = raw.seller.match(/^([^\s(]+)\s*\(([\d,]+)\)/); if (m) { seller = m[1]; sellerFeedback = m[2]; } else seller = raw.seller.split(' ')[0] || null; }
  return {
    title: raw.title, url: raw.url, price, priceRange, shipping, shippingKnown, shippingNote, total: (price != null && shippingKnown) ? Math.round((price + shipping) * 100) / 100 : null,
    soldAt, soldText: raw.soldText || null, seller, sellerFeedback, condition: raw.subtitle, bestOffer: !!raw.bestOffer, orBestOffer: !!raw.orBestOffer,
    qtySoldText: raw.qtySoldText || null, sponsored: !!raw.sponsored, kind: sold ? 'sold' : 'active',
  };
}

// Arama sorguları: önce UPC/EAN veya tam model, sonra marka+başlık.
export function buildQueries(az) {
  const qs = [];
  if (az.upc) qs.push({ type: 'upc', q: az.upc });
  if (az.model && /\d/.test(az.model) && az.model.length >= 3 && !/does not apply|n\/a|unknown/i.test(az.model)) qs.push({ type: 'model', q: `${az.brand ? az.brand + ' ' : ''}${az.model}`.trim() });
  const words = String(az.title || '').replace(/[|,()\[\]]/g, ' ').split(/\s+/).filter(w => w.length > 1 || /\d/.test(w)).slice(0, 9).join(' ');
  if (words) qs.push({ type: 'title', q: `${az.brand && !words.toLowerCase().includes(az.brand.toLowerCase()) ? az.brand + ' ' : ''}${words}`.trim() });
  return qs;
}
