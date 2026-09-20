// DEMO/TEST MODU sabit verileri. Gerçek ürün veya fiyat DEĞİLDİR; yalnızca akışı doğrulamak içindir.
const daysAgo = (n) => { const d = new Date(Date.now() - n * 864e5); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export const DEMO_PRODUCTS = [
  { asin: 'B0DEMO0001', title: 'Marbrasse Pen Holder Desk Organizer, 5 Compartments Mesh Pencil Cup, Black', brand: 'Marbrasse', model: 'MB-PH5-BLK', price: 14.99, weight: '12 ounces', dims: '6.3 x 4.1 x 4 inches; 12 ounces', color: 'Black', bought: '2K+ bought in past month', delivery: 'FREE delivery Tuesday, September 23', seller: 'Marbrasse Direct', shipsFrom: 'Amazon',
    sold: [
      ...[3, 7, 12, 19, 25, 33, 41, 52, 66, 80].map((d, i) => ({ title: 'Marbrasse Pen Holder Desk Organizer 5 Compartments Mesh Pencil Cup Black MB-PH5-BLK', price: [35.99, 36.5, 34.99, 37.0, 35.5, 36.99, 33.99, 35.0, 36.25, 34.5][i], ship: i % 3 === 0 ? 4.99 : 0, daysAgo: d, seller: ['office_deals_us', 'deskpro_store', 'homegoods4u', 'office_deals_us'][i % 4] })),
      { title: 'Marbrasse Pen Holder Desk Organizer Mesh Pencil Cup - Used, minor scratches', price: 12.0, ship: 0, daysAgo: 20, seller: 'usedstuff', used: true },
      { title: 'Marbrasse Pen Holder Desk Organizer 5 Compartments Mesh Pencil Cup White', price: 25.0, ship: 0, daysAgo: 15, seller: 'deskpro_store' },
    ],
    active: [ { title: 'Marbrasse Pen Holder Desk Organizer 5 Compartments Mesh Black MB-PH5-BLK', price: 34.49, ship: 0 }, { title: 'Marbrasse Mesh Pencil Cup 5 Compartments Black', price: 33.99, ship: 3.99 } ] },
  { asin: 'B0DEMO0002', title: 'SimpleHouseware Mesh Desk Organizer with Sliding Drawer, 2 Pack, Silver', brand: 'SimpleHouseware', model: 'SHW-DO2P', price: 24.87, weight: '2.1 pounds', dims: '13 x 9 x 8 inches; 2.1 pounds', color: 'Silver', packCount: 2, bought: '500+ bought in past month', delivery: 'FREE delivery Wednesday, September 24', seller: 'Amazon.com', shipsFrom: 'Amazon',
    sold: [4, 9, 16, 22, 30, 45, 60].map((d, i) => ({ title: 'SimpleHouseware Mesh Desk Organizer with Sliding Drawer Silver (1 pack)', price: [19.99, 21.5, 20.0, 22.0, 19.5, 21.0, 20.5][i], ship: 0, daysAgo: d, seller: ['a_seller', 'b_seller', 'c_seller'][i % 3] })),
    active: [] },
  { asin: 'B0DEMO0003', title: 'Acrylic Desktop File Sorter 5 Section Letter Tray Organizer, Clear', brand: 'ClearView Office', model: 'CV-FS5', price: 18.49, weight: '1.4 pounds', dims: '12 x 9.5 x 6 inches; 1.4 pounds', color: 'Clear', bought: '300+ bought in past month', delivery: 'FREE delivery Thursday, September 25', seller: 'ClearView Office', shipsFrom: 'Amazon', captchaFirst: true,
    sold: [2, 6, 11, 18, 27, 38, 50, 71, 85].map((d, i) => ({ title: 'ClearView Office CV-FS5 Acrylic Desktop File Sorter 5 Section Letter Tray Clear', price: [43.99, 41.99, 44.5, 42.0, 45.0, 41.5, 43.0, 42.5, 44.0][i], ship: [0, 5.99, 0, 0, 6.5, 0, 0, 5.99, 0][i], daysAgo: d, seller: ['acrylic_hub', 'officeworld', 'acrylic_hub', 'tidyhome'][i % 4] })),
    active: [ { title: 'ClearView Office CV-FS5 Acrylic File Sorter 5 Section Clear', price: 45.95, ship: 0 } ] },
  { asin: 'B0DEMO0004', title: 'Bamboo Monitor Stand Riser with Storage Drawer, Natural', brand: 'WoodNest', model: 'WN-MSR1', price: 29.99, weight: null, dims: null, color: 'Natural', bought: '100+ bought in past month', delivery: '$6.99 delivery September 26 - 29', seller: 'WoodNest Home', shipsFrom: 'WoodNest Home', ebayChallengeFirst: true,
    sold: [5, 14, 21, 35, 49, 63, 77].map((d, i) => ({ title: 'WoodNest WN-MSR1 Bamboo Monitor Stand Riser with Storage Drawer Natural', price: [48.0, 52.0, 49.99, 47.5, 51.0, 50.0, 46.99][i], ship: [0, 0, 8.99, 0, 0, 9.5, 0][i], daysAgo: d, seller: ['bamboo_goods', 'deskcraft', 'bamboo_goods', 'deskcraft', 'zen_office'][i % 5] })),
    active: [ { title: 'WoodNest WN-MSR1 Bamboo Monitor Riser Natural', price: 45.0, ship: 0 } ] },
  { asin: 'B0DEMO0005', title: 'Metal Mesh Magazine File Holder, Set of 3, Black', brand: 'OfficeMate Pro', model: 'OMP-MF3', price: 21.99, weight: '1.8 pounds', dims: '10 x 4 x 12 inches; 1.8 pounds', color: 'Black', packCount: 3, bought: '50+ bought in past month', delivery: 'FREE delivery Tuesday, September 23', seller: 'Amazon.com', shipsFrom: 'Amazon',
    sold: [
      { title: 'OfficeMate Pro OMP-MF3 Metal Mesh Magazine File Holder Set of 3 Black', price: 34.99, ship: 0, daysAgo: 3, seller: 'shelf_life', bestOffer: true },
      { title: 'OfficeMate Pro OMP-MF3 Metal Mesh Magazine File Holder Set of 3 Black', price: 33.5, ship: null, daysAgo: 9, seller: 'paperworks' },
      { title: 'OfficeMate Pro OMP-MF3 Metal Mesh Magazine File Holder 3 Pack Black', price: 35.0, ship: 0, daysAgo: 17, seller: 'shelf_life' },
      { title: 'OfficeMate Pro OMP-MF3 Metal Mesh Magazine File Holder Set of 3 Black', price: 32.99, ship: 4.5, daysAgo: 26, seller: 'orgstore' },
      { title: 'OfficeMate Pro OMP-MF3 Magazine File Holder Set of 3 Black', price: 36.0, ship: 0, daysAgo: 40, seller: 'paperworks' },
      { title: 'OfficeMate Pro OMP-MF3 Metal Mesh Magazine File Holder Set of 3 Black', price: 34.0, ship: 0, daysAgo: 58, seller: 'orgstore', bestOffer: true },
      { title: 'OfficeMate Pro OMP-MF3 Metal Mesh Magazine File Holder Set of 3 Black', price: 33.0, ship: 0, daysAgo: 84, seller: 'shelf_life' },
    ], active: [] },
  { asin: 'B0DEMO0006', title: 'LED Desk Lamp with USB Charging Port and Pen Holder, Dimmable', brand: 'LumiDesk', model: 'LD-USB2', price: 25.99, weight: '1.2 pounds', dims: '15 x 5 x 5 inches; 1.2 pounds', color: 'White', bought: '1K+ bought in past month', delivery: 'FREE delivery Tuesday, September 23', seller: 'LumiDesk', shipsFrom: 'Amazon', sold: [], active: [] },
  { asin: 'B0DEMO0007', title: 'Felt Desk Drawer Organizer Tray, 6 Slot, Gray', brand: 'SoftSort', model: 'SS-DT6', price: 11.49, weight: '7 ounces', dims: '11 x 7 x 2 inches; 7 ounces', color: 'Gray', bought: null, delivery: 'FREE delivery on orders over $35', seller: 'SoftSort', shipsFrom: 'Amazon',
    sold: [ { title: 'SoftSort SS-DT6 Felt Desk Drawer Organizer Tray 6 Slot Gray', price: 16.99, ship: 0, daysAgo: 12, seller: 'craftytrays' }, { title: 'SoftSort SS-DT6 Felt Drawer Organizer Tray 6 Slot Gray', price: 15.5, ship: 3.5, daysAgo: 44, seller: 'craftytrays' } ], active: [] },
  { asin: 'B0DEMO0008', title: 'Rotating Desk Organizer Pen Holder 360 Degree, Wood Grain', brand: 'SpinDesk', model: 'SD-R360', price: 19.99, coupon: 'Apply $3.00 coupon', weight: '14.4 ounces', dims: '5 x 5 x 6 inches; 14.4 ounces', color: 'Brown', bought: '800+ bought in past month', delivery: 'FREE delivery Tuesday, September 23', seller: 'SpinDesk Official', shipsFrom: 'Amazon',
    sold: [3, 8, 15, 24, 36, 55, 70, 88].map((d, i) => ({ title: 'SpinDesk SD-R360 Rotating Desk Organizer Pen Holder 360 Wood Grain Brown', price: [29.99, 31.0, 30.5, 28.99, 32.0, 29.5, 30.0, 31.5][i], ship: 0, daysAgo: d, seller: ['spin_store', 'deskly', 'spin_store', 'organizeit'][i % 4] })),
    active: [ { title: 'SpinDesk SD-R360 Rotating Desk Organizer Wood Grain', price: 28.5, ship: 0 } ] },
];

export function amazonSearchHtml(pageNo = 1) {
  const cards = pageNo === 1 ? DEMO_PRODUCTS.slice(0, 6) : DEMO_PRODUCTS.slice(6);
  const sponsored = pageNo === 1 ? `<div data-component-type="s-search-result" data-asin="B0SPONSOR1" data-index="0" class="s-result-item"><span class="puis-sponsored-label-text">Sponsored</span><h2><a href="/sspa/click?ie=UTF8&url=/dp/B0SPONSOR1"><span>Sponsored Desk Organizer (skipped)</span></a></h2><span class="a-price"><span class="a-offscreen">$9.99</span></span></div>` : '';
  return `<!doctype html><html><head><title>Amazon.com : pen holder desk organizer (DEMO)</title></head><body>
<div class="s-main-slot"><span data-component-type="s-result-info-bar"><h1>1-16 of over 3,000 results for "pen holder desk organizer" (DEMO VERİSİ)</h1></span>${sponsored}
${cards.map((p, i) => `<div data-component-type="s-search-result" data-asin="${p.asin}" data-index="${i + 1}" class="s-result-item">
<h2><a class="a-link-normal s-no-outline" href="/dp/${p.asin}/ref=sr_1_${i + 1}"><span>${esc(p.title)}</span></a></h2>
<span class="a-icon-alt">4.5 out of 5 stars</span><span>${p.bought || ''}</span>
<span class="a-price" data-a-color="base"><span class="a-offscreen">$${p.price.toFixed(2)}</span></span></div>`).join('\n')}
<div class="s-pagination-container">${pageNo === 1 ? '<a class="s-pagination-next" href="/s?k=pen+holder+desk+organizer&i=office-products&page=2">Next</a>' : '<span class="s-pagination-next s-pagination-disabled">Next</span>'}</div>
</div></body></html>`;
}

export function amazonProductHtml(p) {
  const details = [['Brand', p.brand], ['Item model number', p.model], ['Color', p.color], ['Item Weight', p.weight], ['Product Dimensions', p.dims], ['Number of Items', p.packCount], ['Best Sellers Rank', '#1,234 in Office Products (DEMO)']].filter(([, v]) => v != null);
  return `<!doctype html><html><head><title>Amazon.com: ${esc(p.title)} (DEMO)</title></head><body>
<span id="productTitle">${esc(p.title)}</span>
<a id="bylineInfo" href="#">Visit the ${esc(p.brand)} Store</a>
<div id="corePrice_feature_div"><span class="a-price"><span class="a-offscreen">$${p.price.toFixed(2)}</span></span></div>
${p.coupon ? `<div id="couponBadgeRegularVpc"><label>${esc(p.coupon)}</label></div>` : ''}
<div id="social-proofing-faceout-title-tk_bought">${p.bought || ''}</div>
<span id="acrPopover" title="4.5 out of 5 stars">4.5 out of 5 stars</span><span id="acrCustomerReviewText">2,345 ratings</span>
<div id="availability"><span>In Stock</span></div>
<div id="mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE" data-csa-c-delivery-price="${/free/i.test(p.delivery) ? 'FREE' : (p.delivery.match(/\$[\d.]+/) || [''])[0]}">${esc(p.delivery)}</div>
<div id="tabular-buybox"><div class="tabular-buybox-text" tabular-attribute-name="Ships from">${esc(p.shipsFrom)}</div><div class="tabular-buybox-text" tabular-attribute-name="Sold by">${esc(p.seller)}</div></div>
<div id="feature-bullets"><ul><li><span class="a-list-item">Sturdy construction for everyday desk use (DEMO)</span></li></ul></div>
<table id="productDetails_techSpec_section_1">${details.map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')}</table>
</body></html>`;
}

export const amazonCaptchaHtml = () => `<!doctype html><html><head><title>Amazon.com</title></head><body><h4>Enter the characters you see below</h4><p>Sorry, we just need to make sure you're not a robot. (DEMO CAPTCHA SAYFASI)</p><form action="/errors/validateCaptcha"><input name="field-keywords"></form></body></html>`;
export const ebayChallengeHtml = () => `<!doctype html><html><head><title>Pardon Our Interruption</title></head><body><h1>Pardon Our Interruption...</h1><p>As you were browsing something about your browser made us think you were a bot. (DEMO)</p></body></html>`;

function ebayCard(l, sold, idx) {
  const ship = l.ship == null ? '' : (l.ship === 0 ? '<span class="s-item__shipping s-item__logisticsCost">Free shipping</span>' : `<span class="s-item__shipping s-item__logisticsCost">+$${l.ship.toFixed(2)} shipping</span>`);
  return `<li class="s-item"><div class="s-item__wrapper"><a class="s-item__link" href="https://www.ebay.com/itm/${sold ? 2 : 3}0${String(idx).padStart(10, '0')}?hash=demo"></a>
<div class="s-item__title"><span role="heading">${esc(l.title)}</span></div>
<div class="s-item__subtitle">${l.used ? 'Pre-Owned' : 'Brand New'}</div>
${sold ? `<div class="s-item__caption"><span class="s-item__caption--signal POSITIVE">Sold  ${daysAgo(l.daysAgo)}</span></div>` : ''}
<span class="s-item__price">$${l.price.toFixed(2)}</span> ${ship}
${l.bestOffer ? '<span class="s-item__purchase-options-with-icon">Best offer accepted</span>' : ''}
${l.seller ? `<span class="s-item__seller-info-text">${l.seller} (1,204) 99.1%</span>` : ''}
</div></li>`;
}
export function ebayResultsHtml(p, { sold }) {
  const list = sold ? (p.sold || []) : (p.active || []);
  return `<!doctype html><html><head><title>${esc(p.model)} for sale | eBay (DEMO)</title></head><body>
<h1 class="srp-controls__count-heading"><span class="BOLD">${list.length}</span> results for ${esc(p.model)} (DEMO VERİSİ)</h1>
${list.length === 0 ? '<div class="srp-save-null-search"><h3>No exact matches found</h3></div>' : ''}
<ul class="srp-results srp-list"><li class="s-item"><div class="s-item__title">Shop on eBay</div></li>${list.map((l, i) => ebayCard(l, sold, i)).join('\n')}</ul>
</body></html>`;
}
