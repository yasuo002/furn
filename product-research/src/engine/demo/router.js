// DEMO MODU: amazon.com ve ebay.com istekleri gerçek ağa çıkmaz; sabit örnek sayfalar döner.
import { DEMO_PRODUCTS, amazonSearchHtml, amazonProductHtml, amazonCaptchaHtml, ebayChallengeHtml, ebayResultsHtml } from './fixtures.js';

const state = { captchaShown: new Set(), challengeShown: new Set() };
const html = (route, body, status = 200) => route.fulfill({ status, contentType: 'text/html; charset=utf-8', body });

export async function installDemoRoutes(context) {
  await context.route(/https?:\/\/(www\.)?amazon\.com\/.*/, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/s') return html(route, amazonSearchHtml(Number(url.searchParams.get('page') || 1)));
    const m = url.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    if (m) {
      const p = DEMO_PRODUCTS.find(x => x.asin === m[1]);
      if (!p) return html(route, '<html><head><title>Page Not Found</title></head><body>Not found</body></html>', 404);
      if (p.captchaFirst && !state.captchaShown.has(p.asin)) { state.captchaShown.add(p.asin); return html(route, amazonCaptchaHtml()); }
      return html(route, amazonProductHtml(p));
    }
    return html(route, '<html><body>demo</body></html>');
  });
  await context.route(/https?:\/\/(www\.)?ebay\.com\/.*/, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/sch/i.html') {
      const q = (url.searchParams.get('_nkw') || '').toLowerCase();
      const p = DEMO_PRODUCTS.find(x => q.includes(x.model.toLowerCase())) || DEMO_PRODUCTS.find(x => q.includes(x.brand.toLowerCase()));
      if (!p) return html(route, ebayResultsHtml({ model: q, sold: [], active: [] }, { sold: true }));
      if (p.ebayChallengeFirst && !state.challengeShown.has(p.asin)) { state.challengeShown.add(p.asin); return html(route, ebayChallengeHtml()); }
      return html(route, ebayResultsHtml(p, { sold: url.searchParams.get('LH_Sold') === '1' }));
    }
    return html(route, '<html><body>demo</body></html>');
  });
  // diğer tüm dış istekleri engelle (demo tamamen çevrimdışı)
  await context.route(/^https?:\/\/(?!(www\.)?(amazon|ebay)\.com\/)/, (route) => route.abort());
}
