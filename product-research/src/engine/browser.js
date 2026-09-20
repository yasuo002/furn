// Görünür, kalıcı araştırma tarayıcısı (Playwright/Chromium). Kişisel profil kopyalanmaz; ayrı profil dizini kullanılır.
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { PROFILE_DIR, DATA_DIR, HEADLESS } from '../config.js';

export class StopSignal extends Error { constructor() { super('stop'); this.name = 'StopSignal'; } }
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export function randomDelay(settings) {
  const min = Number(settings?.requestDelayMinMs ?? 2500), max = Math.max(min, Number(settings?.requestDelayMaxMs ?? 6000));
  return sleep(min + Math.random() * (max - min));
}

export async function launchResearchBrowser({ demo = false, headless = HEADLESS } = {}) {
  const dir = demo ? path.join(DATA_DIR, 'browser-profile-demo') : PROFILE_DIR;
  fs.mkdirSync(dir, { recursive: true });
  const context = await chromium.launchPersistentContext(dir, {
    headless, viewport: { width: 1280, height: 900 }, locale: 'en-US', timezoneId: 'America/New_York',
    args: ['--disable-blink-features=AutomationControlled'], ignoreDefaultArgs: ['--enable-automation'],
  });
  context.setDefaultTimeout(45_000);
  if (demo) { const { installDemoRoutes } = await import('./demo/router.js'); await installDemoRoutes(context); }
  return context;
}

// Erişim engeli / CAPTCHA / giriş tespiti. Sayfa metni yalnızca veri olarak değerlendirilir.
export function detectBlock({ url = '', title = '', text = '', status = 200 }) {
  const t = (title + '\n' + text.slice(0, 4000)).toLowerCase();
  const u = url.toLowerCase();
  if (u.includes('/errors/validatecaptcha') || /enter the characters you see below|type the characters you see in this image|not a robot/.test(t))
    return { blocked: true, kind: 'captcha', site: 'amazon', message: 'Amazon CAPTCHA istiyor. Açık tarayıcı penceresinde doğrulamayı tamamlayıp "Devam et"e basın.' };
  if (/api-services-support@amazon\.com|request was throttled|to discuss automated access/.test(t) || (status === 503 && u.includes('amazon.')))
    return { blocked: true, kind: 'access', site: 'amazon', message: 'Amazon erişimi kısıtladı (503/otomatik erişim uyarısı). Birkaç dakika bekleyip tarayıcıda sayfayı elle açtıktan sonra "Devam et"e basın.' };
  if (u.includes('/ap/signin') && u.includes('amazon.'))
    return { blocked: true, kind: 'login', site: 'amazon', message: 'Amazon giriş sayfasına yönlendirdi. Gerekliyse tarayıcı penceresinde giriş yapıp "Devam et"e basın.' };
  if (u.includes('splashui/challenge') || u.includes('/captcha') || /pardon our interruption|security measure|please verify yourself|checking your browser/.test(t))
    return { blocked: true, kind: 'captcha', site: 'ebay', message: 'eBay doğrulama (challenge) sayfası gösterdi. Açık tarayıcı penceresinde doğrulamayı tamamlayıp "Devam et"e basın.' };
  if (u.includes('signin.ebay.') )
    return { blocked: true, kind: 'login', site: 'ebay', message: 'eBay giriş sayfasına yönlendirdi. Gerekliyse tarayıcı penceresinde giriş yapıp "Devam et"e basın.' };
  if (status === 403 || status === 429)
    return { blocked: true, kind: 'access', site: u.includes('ebay') ? 'ebay' : 'amazon', message: `Sunucu ${status} döndürdü (erişim engeli/hız sınırı). Bekleyip "Devam et"e basın.` };
  return { blocked: false };
}

export async function pageSnapshot(page, response) {
  const title = await page.title().catch(() => '');
  const text = await page.evaluate(() => document.body ? document.body.innerText : '').catch(() => '');
  return { url: page.url(), title, text, status: response ? response.status() : 200 };
}

// Sayfaya git, engel kontrolü yap. Engelde onBlocked(info) çağrılır; 'retry' dönerse sayfa yeniden yüklenir.
export async function politeGoto(page, url, { settings, onBlocked, maxRetries = 2, log = () => {} } = {}) {
  let attempt = 0;
  for (;;) {
    let response = null;
    try {
      response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800 + Math.random() * 700);
    } catch (e) {
      if (attempt < maxRetries) { attempt++; log(`Sayfa yüklenemedi (${e.message.split('\n')[0]}), yeniden deneniyor (${attempt}/${maxRetries})`); await sleep(3000 * attempt); continue; }
      return { ok: false, error: `Sayfa yüklenemedi: ${e.message.split('\n')[0]}` };
    }
    const snap = await pageSnapshot(page, response);
    const block = detectBlock(snap);
    if (!block.blocked) return { ok: true, status: snap.status };
    log(`Engel tespit edildi: ${block.message}`);
    const action = onBlocked ? await onBlocked(block) : 'abort';
    if (action !== 'retry') return { ok: false, blocked: block, error: block.message };
    // kullanıcı müdahalesinden sonra: mevcut sayfa hâlâ engelli mi?
    const snap2 = await pageSnapshot(page, null);
    if (!detectBlock(snap2).blocked && page.url().split('?')[0] === url.split('?')[0]) return { ok: true, status: 200 };
    await randomDelay(settings);
  }
}

// Site yapısı tanınmadığında sayfanın HTML'ini data/debug altına kaydeder (en fazla 30 dosya tutulur).
export async function saveDebugSnapshot(page, label) {
  try {
    const dir = path.join(DATA_DIR, 'debug'); fs.mkdirSync(dir, { recursive: true });
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();
    for (const f of files.slice(0, Math.max(0, files.length - 29))) fs.unlinkSync(path.join(dir, f));
    const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-${label.replace(/[^a-z0-9_-]+/gi, '_')}.html`;
    const html = await page.content();
    fs.writeFileSync(path.join(dir, name), `<!-- url: ${page.url()} -->\n` + html);
    return path.join(dir, name);
  } catch { return null; }
}
