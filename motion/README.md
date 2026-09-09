# motion — dikey video için tipografi & motion graphics katmanı

Bir kaynak videonun (9:16, 720×1280) üzerine kod tabanlı bir motion graphics
katmanı bindirir. After Effects yok: katman `overlay.html` içinde HTML/CSS/SVG
olarak tanımlanır, headless Chromium ile **kare kare saydam PNG** olarak
render edilir, ffmpeg ile videoya bindirilir.

## Kullanım

```bash
npm install                    # playwright (chromium indirir)
./motion/fetch-fonts.sh        # Montserrat + Inter + Playfair italic -> motion/fonts/
./motion/make-stills.sh girdi.mp4   # kart gorselleri -> motion/img/
./motion/build.sh girdi.mp4 motion/out/reklam.mp4
```

Sadece birkaç kareyi hızlıca kontrol etmek için:

```bash
cd motion && node render.mjs preview --times 3.2,11.4,25.4
```

## Neden kare kare?

`overlay.html` içinde **hiç CSS animasyonu yok**. Tüm animasyon tek bir
fonksiyondan hesaplanır:

```js
window.setT(saniye)   // o anın karesini kurar
```

Render eden taraf `setT(i/fps)` çağırıp ekran görüntüsü alır. Böylece çıktı
deterministik olur — aynı girdi her zaman aynı kareleri verir, drop frame ya da
zamanlayıcı kayması olmaz.

## Metinleri değiştirmek

Ekrandaki her metin `overlay.html` içindeki HTML bloklarında düz yazı olarak
durur (`id="hook"`, `id="step1"`, `id="proof"`, `id="ben"`, `id="end"` …).
Marka adı iki yerde geçer: `#brandName` ve `#endName` (şu an `FURN`).

Zamanlama tek bir tabloda toplanmıştır — saniye cinsinden `[başlangıç, bitiş]`:

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

`scA` / `scB` / `scC` **opak** tam ekran sahnelerdir: altlarındaki görüntüyü
tamamen kapatırlar, yani videonun süresi ve sesi hiç değişmeden araya tasarım
sahnesi girmiş olur. Bu sahnelerin denk geldiği pencereler görüntüde tekrara
düşen bölümler (kutu açılışı, filtrenin durulanması, son plan) seçildi.

Kaynak videoyu değiştirirsen `D` sabitini ve bu aralıkları yeni akışa göre
güncellemen gerekir; `ring` ve `arw` ayrıca ekrandaki bir noktayı hedefler
(720×1280 koordinat sisteminde) — sahne değişirse o koordinatlar da değişir.

## Katmanın içindekiler

| Öğe | Ne yapar |
|---|---|
| İlerleme çubuğu | Üstte, süre boyunca dolar — izlenme süresini tutar |
| Marka rozeti | Sol üst, kapanış kartına kadar görünür |
| Kelime kelime giriş | Başlıklar yaylı (spring) easing ile alttan yükselir |
| Vurgu bandı | Kanca cümlesinin ikinci satırının altını doldurur |
| Halka / ok | SVG `stroke-dasharray` ile çizilerek ürünü işaret eder |
| Sayaç | 0 → 30 sayarak "30 güne kadar tek filtre" mesajını verir |
| Kapanış kartı | Logo, slogan, nabız atan CTA ve parlama (shine) efekti |

## Tasarım sahneleri

Üç tam ekran sahne, açık zemin üzerinde havada duran kart diline oturur:

| Sahne | Ne | Nasıl |
|---|---|---|
| `scA` açılış | Koyu lacivert kart, içinde glow'lu ürün karesi, halka aksanlar | Kart alttan yaylanarak gelir, görsel dönerek yerine oturur, wordmark kelime kelime yükselir |
| `scB` önce/sonra | İki beyaz kart yan yana (kirli filtre / berrak su), altta `önce/sonra` | Kartlar zıt yönlerden kayar, `sonra` italik serif sağdan gelir, köşede PIP ve karaoke caption |
| `scC` kapanış | Koyu kart, CTA düğmesi, marka | Açılışla aynı iskelet; düğme nabız atar, üzerinden parlama geçer |

Ortak tipografi kalıbı: **kalın sans + italik serif** (`musluktan akan su` /
*`temiz mi?`*). Kart içindeki duraǧan kareler yavaş Ken Burns ile büyütülür,
böylece donmuş görüntü hissi vermez.

Caption baloncuǧu karaoke gibi çalışır: `karaoke(el, p)` kelimeleri sırayla
sarıya çevirir.

## Notlar

- Alt bantlar `bottom: 180px`'te biter; kaynak videodaki gömülü açıklama
  yazısının üstünde kalır. TikTok/Reels arayüzü de bu bölgeyi kapatır.
- Metinlerde ölçülemeyen sağlık iddiası yok — yalnızca videoda **gözle görülen**
  şey anlatılır ("kum, tortu ve pas kalıntısı"). Arıtma oranı / bakteri gibi bir
  iddia eklenecekse test raporuyla desteklenmelidir.
