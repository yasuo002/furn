# motion — dikey video için kod tabanlı kurgu katmanı

Bir kaynak videonun üzerine tipografi, motion graphics ve kinetik altyazı
bindirir. After Effects yok: katman `overlay.html` içinde HTML/CSS/SVG olarak
tanımlanır, headless Chromium ile **kare kare saydam PNG** olarak render edilir,
ffmpeg ile videoya bindirilir. SFX'ler de hazır kütüphaneden değil, `sfx.py`
içinde osilatör ve filtreyle sentezlenir.

```
motion/
  render.mjs         herhangi bir overlay'i kare dizisine çeviren renderer
  fetch-fonts.sh     Montserrat + Inter + Playfair italic -> motion/fonts/
  STYLE.md           ölçülmüş kurgu dili — yeni bir kurguya başlarken önce bunu oku
  water-filter/      musluk filtresi reklamı  (tasarım sahneleri)
  car-review/        araba yorumu kurgusu     (kinetik altyazı + SFX)
```

## Kullanım

```bash
npm install                 # playwright (chromium indirir)
./motion/fetch-fonts.sh     # ortak fontlar

# proje 1 — musluk filtresi
./motion/water-filter/make-stills.sh girdi.mp4     # kart görselleri
./motion/water-filter/build.sh       girdi.mp4 cikti.mp4

# proje 2 — araba yorumu
./motion/car-review/build.sh         girdi.mp4 cikti.mp4
```

Birkaç kareyi hızlıca kontrol etmek için:

```bash
node motion/render.mjs /tmp/onizleme --html motion/car-review/overlay.html \
     --times 1.3,5.9,13.9
```

## Neden kare kare?

Overlay'lerde **hiç CSS animasyonu yok**. Tüm animasyon tek bir fonksiyondan
hesaplanır:

```js
window.setT(saniye)   // o anın karesini kurar
```

Render eden taraf `setT(i/fps)` çağırıp ekran görüntüsü alır. Çıktı bu yüzden
deterministik: aynı girdi her zaman aynı kareleri verir, zamanlayıcı kayması ya
da düşen kare olmaz.

---

## Proje: water-filter

Musluk ucu su filtresi reklamı. Görüntünün üzerine bindirilen bantların yanında
**üç tam ekran tasarım sahnesi** var: açık zeminde havada duran kart, içinde
glow'lu ürün karesi, halka aksanlar, altta kalın sans + italik serif wordmark.

| Sahne | Ne | Nasıl |
|---|---|---|
| `scA` açılış | Koyu lacivert kart, glow'lu ürün karesi | Kart alttan yaylanır, görsel dönerek oturur, wordmark kelime kelime yükselir |
| `scB` önce/sonra | İki beyaz kart yan yana, altta `önce/sonra` | Kartlar zıt yönlerden kayar, PIP ve karaoke caption eşlik eder |
| `scC` kapanış | Koyu kart, CTA düğmesi | Düğme nabız atar, üzerinden parlama geçer |

Sahneler **opak**: altlarındaki görüntüyü tamamen kapatırlar, yani videonun
süresi ve sesi hiç değişmeden araya tasarım sahnesi girmiş olur. Denk geldikleri
pencereler görüntüde tekrara düşen bölümlerden seçildi. Kart içindeki duraǧan
kareler yavaş Ken Burns ile büyütülür.

Zamanlama `overlay.html` içindeki tek `T` tablosunda:

```js
const T = {
  scA  :[ 0.00,  2.95],   // TASARIM SAHNESİ — açılış kartı
  step :[ 4.45,  8.30],   // 01 KURULUM: "MUSLUĞA TAK"
  ring :[ 6.60,  8.25],   //   musluk ucundaki vurgu halkası
  use  :[ 8.50, 10.30],   // çip: "SÜZÜLMÜŞ SUYLA YIKA"
  proof:[10.55, 14.85],   // kanıt: "FİLTREDE KALANLAR"
  arw  :[11.95, 14.40],   //   tortuyu gösteren ok + halka
  scB  :[15.05, 18.55],   // TASARIM SAHNESİ — önce / sonra
  reuse:[18.75, 21.45],   // sayaç 30 + YIKA → SIK → TEKRAR TAK
  ben  :[21.65, 24.15],   // 3 maddelik fayda listesi
  scC  :[24.30,     D],   // TASARIM SAHNESİ — kapanış + CTA
};
```

Metinler HTML'de düz yazı olarak durur. Marka adı iki yerde: `#brandName` ve
`.tag` (şu an `FURN`).

---

## Proje: car-review

360×640, üzerinde yanmış altyazı olan bir sokak röportajı. `build.sh` beş iş
yapar:

1. **Eski altyazıyı siler** — `delogo` + aynı dikdörtgene yerel `gblur`. Kalan
   leke, altyazı plakasının (`#plate`) altında kalır.
2. **720×1280'e yükseltir** ve vurgu anlarında **zoom punch** uygular. `crop` bu
   ffmpeg derlemesinde `eval=frame` desteklemediği için yaklaşma
   `scale=...:eval=frame` + sabit merkez crop ile yapılır.
3. **İstif listesi anında** (12.94–15.04) görüntüyü blurlar.
4. Kinetik altyazı ve grafik katmanını bindirir.
5. **SFX parçasını** mikslerken `alimiter` ile tepe seviyeyi güvene alır.

### Kinetik altyazı

Konuşma metni ve zamanlaması `overlay.html` içindeki `CAPS` dizisinde durur;
kaynak videonun yanmış altyazısından, altyazı bandının kare kare değişimi
ölçülerek çıkarıldı. Kelimeler segmentin ilk %58'inde sırayla yaylanarak belirir;
`*` ile başlayan kelimeler vurgu rengine (amber) boyanır.

```js
{a:3.98, b:5.57, who:AK, w:['“Ulan','arabaya','bak','*GEMİ','*GİBİ”','der.']}
```

Diğer öğeler: konuşmacı çipi (`ALİ KITAY` / `ARAÇ SAHİBİ`), dev anahtar kelime
patlamaları (`BIGS`), ışınlı "BMW!" impact sahnesi, "kimse demez ki" kartları,
blurlu istif listesi ve final özet kartı.

### SFX

`sfx.py` hazır ses dosyası kullanmaz. Beyaz gürültü ve sinüs osilatörlerini bir
Chamberlin state-variable bant filtresinden geçirerek beş ses üretir — `whoosh`,
`impact`, `pop`, `riser`, `ding` — ve `EVENTS` listesindeki zamanlara stereo
panlayarak yerleştirir. `riser` hedefe *varması* gerektiği için başı değil sonu
hizalanır.

```python
EVENTS = [
    (5.50, 'riser',  0.42, 0.00),   # "BMW!" öncesi yükseliş
    (5.60, 'impact', 0.95, 0.00),
    ...
]
```

## Notlar

- Alt bantlar `bottom: 180px`'te biter; TikTok/Reels arayüzünün kapattığı
  bölgenin üstünde kalır.
- Fontlar (Montserrat, Inter, Playfair Display) SIL Open Font License ile
  dağıtılır; repoda tutulmuyor, `fetch-fonts.sh` indiriyor.
