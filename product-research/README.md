# Amazon → eBay Ürün Araştırma (yerel)

Amazon.com'daki ürünleri seçtiğiniz kategoride tarar, aynı ürünün eBay.com'daki **gerçekleşmiş (Sold Items)** satışlarını inceler ve tüm giderler sonrası net kâr marjını hesaplar. Yalnızca **araştırma ve karar desteği** içindir: otomatik satın alma, ilan yayınlama veya müşteri mesajlaşması yapmaz.

- Tamamen yerel çalışır (`http://127.0.0.1:3777`), sunucu yalnızca yerel bağlantı kabul eder.
- Araştırma motoru arayüzden bağımsız ayrı bir süreçte çalışır; durum SQLite'ta tutulur. Sayfa yenilense, tarayıcı kapansa bile araştırma sürer.
- Görünür Chromium (Playwright) ile araştırma yapar; ayrı ve kalıcı bir araştırma profili kullanır (kişisel tarayıcı profilinize dokunmaz).
- Amazon/eBay API hesabı, ücretli servis veya yapay zekâ API'si **gerektirmez**.
- Arayüz Türkçe, para birimi USD.

## Gereksinimler

- Node.js **22.13 veya üzeri** (SQLite için `node:sqlite` kullanılır; harici derleme yok).
- Chromium (Playwright indirir).

## Kurulum ve başlatma

```bash
cd product-research
npm install
npx playwright install chromium      # ilk kurulumda bir kez
npm start                             # → http://127.0.0.1:3777
```

Tarayıcınızda `http://127.0.0.1:3777` adresini açın. Veriler `product-research/data/` altında saklanır (`research.db` veritabanı, `browser-profile/` araştırma tarayıcısı profili).

İsteğe bağlı ortam değişkenleri: `PORT` (varsayılan 3777), `RESEARCH_DATA_DIR`, `RESEARCH_HEADLESS=1` (tarayıcıyı gizli çalıştırır; CAPTCHA çözmeniz gerekebileceği için önerilmez).

## İlk kullanımda girmeniz gereken maliyetler (Ayarlar)

Sağ üstteki **Ayarlar** panelinden şunları girip **"Maliyet girdilerini gözden geçirdim"** kutusunu işaretleyin; onaylanana kadar tüm sonuçlar "Koşullu" kalır:

1. **Amazon alış vergisi (%)** — eyaletinize göre, geri alınamayan satış vergisi.
2. **eBay hesap/mağaza türü, kategori komisyonu ve sabit ücret** — varsayılan %13.6 + 0.40 $ (>10 $) / 0.30 $ (≤10 $). Bu değerler geliştirme sırasında **resmî eBay sayfasından doğrulanamadı** (ağ engeli); üçüncü taraf özetlerden alındı. "Resmî ücret sayfasını araştırma tarayıcısında aç" düğmesiyle sayfayı açıp **"Oranları resmî sayfadan doğruladım"** kutusunu işaretleyin. Kaynak ve kontrol tarihi saklanır.
3. **Komisyon matrahı** — eBay komisyonu alıcının ödediği satış vergisini de matraha dahil eder; tahmini alıcı vergi oranı (varsayılan %7) yalnızca matrah için kullanılır, gelir olarak yazılmaz.
4. **Paketleme, kendi gönderimim için operasyon gideri, ara depo ücreti** (3/4/5 $ senaryoları ayrıca karşılaştırılır; depo ücretinin neyi kapsadığını yazın, paketleme dahilse kutucuğu işaretleyin ki iki kez sayılmasın).
5. **Müşteriye gönderim tarifesi** — ağırlık (oz) → maliyet tablosu. Canlı kargo API'si **bağlı değildir**; bu tablo bir tahmindir ve sonuçlar "tahmini maliyetle hesaplandı" olarak işaretlenir. Ürün bazında gerçek tarifeden doğruladığınız bedeli detay panelinden girip "doğruladım" işaretleyebilirsiniz.
6. **Reklam oranı, diğer ücretler, iade/hasar risk payı** (varsayılan gelirin %3'ü; %5 senaryosu ayrıca gösterilir — tahmindir).
7. **Talep eşikleri** — varsayılan: son 90 günde en az 5 birebir eşleşen satılmış ilan ve en az 2 farklı satıcı.

## Kullanım

0. İlk canlı çalıştırmadan önce **Canlı erişim testi** düğmesine basın: araştırma tarayıcısı Amazon ve eBay'de birer arama açar; erişim engeli olup olmadığını ve sayfa yapısının tanınıp tanınmadığını (kart, fiyat, satış tarihi, satıcı, kargo alanları) raporlar. Yapı tanınmazsa sayfanın HTML anlık görüntüsü `data/debug/` altına kaydedilir.
1. Üstte **ana kategori → alt kategori → dar alt kategori** seçin. Liste **elle tanımlanmış güvenli kategorilerden** oluşur (elektriksiz ofis düzenleyicileri, gıda ile temas etmeyen ev düzenleme, basit hobi aksesuarları); Amazon'un canlı kategori ağacı değildir. Her yaprak bir Amazon arama sorgusuna karşılık gelir; **"Kategori adresini doğrula"** ile sorgunun sonuç döndürdüğünü kendi makinenizde kontrol edebilirsiniz.
2. Minimum marj (%15), ürün sayısı (25) ve gönderim modelini seçin, **Araştırmayı başlat**.
3. Görünür bir Chromium penceresi açılır. **CAPTCHA, giriş veya erişim engeli** görülürse araştırma duraklar ve arayüzde açıklama çıkar; sorunu tarayıcı penceresinde elle giderip **Devam et**'e basın. CAPTCHA otomatik çözülmez, engel aşılmaz.
4. Sonuçlar araştırma sürerken tabloya eklenir. **Uygun / Koşullu / Elenen / Tümü** filtreleri ve sütun sıralaması vardır. Satıra tıklayınca detay paneli açılır: Amazon bilgileri, her eBay satışının bağlantısı/tarihi/fiyatı, eşleşme gerekçesi, tüm maliyet kalemleri, baz/temkinli hesap, kendi gönderim ve 3/4/5 $ depo senaryoları, stres testi, %15 marjı koruyan azami alış fiyatı, eksik bilgiler ve varsayımlar.
5. Detay panelinde kullanıcı tahminlerini (kargo tahsilatı, gönderim maliyeti, ağırlık, eşleşme kararı) girdiğinizde marj yeniden hesaplanır; kaynak verilerle kullanıcı değişiklikleri ayrı saklanır. Satılmış ilan listesinde her ilanın eşleşme kararını (birebir / belirsiz / uyumsuz) elle düzeltebilirsiniz; satış sayısı, medyan ve karar buna göre yeniden hesaplanır.
6. **Geçmiş**: eski araştırmaları açın, CSV alın veya silin. **Seçilileri yeniden kontrol et**: Amazon fiyat/stokunu yeniden okur ve **yeni gözlem** ekler (eski sonuç silinmez).
7. **CSV dışa aktar**: bağlantılar dahildir; harici metinlerde formül çalıştırılması engellenir.

## Hesap mantığı (özet)

- Tüm karşılaştırmalar **ürün + müşterinin ödediği kargo toplamı** üzerinden. Piyasa toplamı 40 $ ve müşteriden 6 $ kargo alınacaksa önerilen ürün bedeli 34 $'dır; toplam fiyata tekrar kargo eklenmez.
- **Baz** senaryo: gerçekleşmiş satışların medyan toplamı. **Temkinli**: alt çeyrek toplamı. Aktif rakipler bunun altındaysa rekabet uyarısı.
- Best Offer ile satılan ilanlar (kabul edilen fiyat görünmez) ve kargosu bilinmeyen satışlar fiyat istatistiğine girmez; eksik kargo sıfır sayılmaz. Yinelenen sonuçlar ayıklanır. Tarih aralığı bilinmeyen "X sold" bilgisi 30/90 günlük satış olarak gösterilmez; satılan birim sayısı arama sonuçlarından doğrulanamadığı için ayrı ve boş bırakılır.
- Eşleştirme: önce UPC/EAN veya tam model numarası, yoksa marka + başlık. Marka/model, paket adedi, renk/ölçü ve yeni/kullanılmış durumu kontrol edilir; **yalnızca başlık benzerliği asla "birebir" sayılmaz**, belirsizler kullanıcı incelemesine ayrılır.
- Net kâr = gelir − (Amazon fiyatı + alış vergisi + Amazon→bana kargo + ithalat + eBay komisyon + sabit ücret + diğer ücretler + reklam + müşteriye gönderim + paketleme + operasyon/depo + diğer + risk payı). Marj = net kâr / gelir. **İşletme gelir/kurumlar vergisi öncesi operasyonel net kârdır.**
- Stres testi: Amazon +%5, eBay geliri −%5, gönderim +2 $.
- Karar: **UYGUN** = birebir eşleşme + doğrulanmış yeterli talep + kritik maliyetler doğrulanmış + temkinli fiyatla seçili senaryoda ≥ eşik marj. **KOŞULLU** = eksik veri, tahmini maliyet, belirsiz eşleşme, koşullu indirim veya yalnızca baz fiyatla yeterli marj. **ELENEN** = doğrulanmış verilerle talep yetersiz, eşleşme yanlış, ürün riskli veya marj eşik altı. Erişim sorunu yaşayan ürün "**Veri eksik**" olarak ayrılır, elenmez.

## Demo/test modu

"Demo/test modu" kutusu işaretliyken amazon.com ve ebay.com yerine uygulamanın içindeki sabit örnek sayfalar kullanılır (ağa çıkılmaz). Sonuç tablosu ve dışa aktarma açıkça **DEMO** olarak etiketlenir; gerçek ürün veya fiyat içermez. Akış doğrulaması için `npm run e2e` bu modda 13 adımı otomatik test eder; `npm test` kâr/eşleştirme/ayrıştırıcı birim testlerini çalıştırır.

## Sınırlar ve doğrulanamayanlar

- **Canlı Amazon/eBay taraması geliştirme ortamında doğrulanamadı**: ortamın ağ politikası amazon.com ve ebay.com'u engelliyordu. Ayrıştırıcılar bilinen sayfa yapısına göre yazıldı ve sabit örnek sayfalarla test edildi; site yapısı farklıysa ilgili alanlar "doğrulanamadı" olarak işaretlenir, motor günlüğünde uyarı görünür. İlk canlı çalıştırmada küçük bir ürün sayısıyla (5) deneyip motor günlüğünü kontrol edin.
- Kategori sorgularının Amazon'da sonuç döndürdüğü canlı doğrulanamadı; "Kategori adresini doğrula" düğmesi bunun için var.
- eBay komisyon oranları resmî sayfadan doğrulanmadı (yukarıya bakın).
- Canlı kargo ücreti API'si yok; gönderim maliyeti tarifeden tahmin edilir.
- eBay arama sonuçları yaklaşık son 90 günü kapsar; satıcı adı sonuç kartında yoksa "farklı satıcı" alanı doğrulanamadı olarak kalır ve karar Koşullu olur.
- Yapay zekâ destekli eşleştirme için bağlantı **yoktur**; eşleştirme tamamen kural tabanlıdır.

## Dosya yapısı

| Yol | İşlev |
|---|---|
| `server.js` | Express API + statik arayüz (yalnızca 127.0.0.1), motor süreçlerini başlatır |
| `src/engine/worker.js` | Motor süreci (araştırma, yeniden kontrol, kategori doğrulama) |
| `src/engine/pipeline.js` | Araştırma akışı: Amazon listesi → ürün → eBay sold/aktif → istatistik → karar |
| `src/engine/browser.js` | Kalıcı Chromium profili, engel/CAPTCHA tespiti, nazik gezinme |
| `src/engine/amazon.js`, `src/engine/ebay.js` | Sayfa ayrıştırıcıları ve normalizasyon |
| `src/engine/demo/` | Demo modu sabit sayfaları ve yönlendirici |
| `src/matcher.js` | Eşleştirme kuralları ve satış istatistikleri |
| `src/profit.js`, `src/decision.js` | Kâr hesabı ve karar kuralları |
| `src/fees.js`, `src/categories.js`, `src/risk.js`, `src/csv.js` | Varsayılanlar, kategori listesi, risk kontrolü, CSV |
| `public/` | Türkçe arayüz |
| `tests/`, `scripts/e2e-demo.mjs` | Birim ve uçtan uca testler |
