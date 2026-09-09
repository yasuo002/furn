# Kısa video kurgu dili — ölçülmüş referans

Bu dosya bir *hafıza* yerine geçer. Model oturumlar arasında bir şey
öğrenmiyor; incelenen videolardan çıkan sayılar ve kurallar buraya yazıldığı
için sonraki oturumlarda (ya da başka biri tarafından) yeniden üretilebiliyor.
Yeni bir kurguya başlarken önce bunu, sonra `water-filter/` ve `car-review/`
klasörlerindeki çalışan örnekleri oku.

Aşağıdaki her sayı, referans videolar üzerinde ffmpeg + küçük Python
betikleriyle **ölçüldü** — göz kararı değil. Ekran değişimi hep aynı komutla
sayılır, yoksa rakamlar karşılaştırılabilir olmuyor:

```bash
ffmpeg -i V.mp4 -vf "crop=720:420:0:620,select='gt(scene,0.04)',metadata=print:file=-" -f null -
```

---

## 1. Ölçümler

| | ref-A (cyan, talking head) | ref-B (warm, talking head) | ref-C ($5 vs $999) |
|---|---|---|---|
| Süre | 34.9 s | 32.5 s | 22.2 s |
| Sert kesim | 8 → ort. **4.4 s**/plan | 8 → ort. **4.1 s**/plan | yok (sabit split-screen) |
| Ekrandaki değişim | 52 → **0.67 s**'de bir | 57 → **0.57 s**'de bir | kart içinde |
| Ses transient'leri | 48, medyan aralık **0.54 s** | 18, medyan aralık **1.12 s** | — |
| Transient dağılımı | %58 tiz (whoosh), %8 bas (impact) | %44 tiz, %11 bas | — |
| Baskın renkler | `#2188AC` `#6CA4BD` `#90BFD0` `#D8EDEC` | `#C99270` `#AC866E` `#614B38` `#F6F1ED` | `#0D2810` `#143817` + altın |

**Çıkan kural:** ekranda bir şey ortalama **her 0.6–1.0 saniyede** değişiyor.
Bu tempo bu tarzın belkemiği — yazı değişmiyorsa grafik giriyor, o da yoksa
kamera yaklaşıyor. Boş geçen 1.5 saniye yok.

Uyarı: referanslar 32–35 sn ve bol B-roll'lu, o yüzden bandın hızlı ucundalar.
17 sn'lik yoğun konuşmalı bir klipte 0.8 sn civarı gerçekçi; oraya inmek için
metni daha da kısaltmak okunurluğu bozuyor. Tempoyu metni kıyarak değil,
**grafik olayı ekleyerek** artır.

---

## 2. Tipografi

Üç rol var, üçü de her videoda aynı mantıkla çalışıyor:

| Rol | Karakter | Kullanım |
|---|---|---|
| **Gövde altyazı** | Ağır geometrik/neo-grotesk sans (Inter 800–900, Poppins 700) | Konuşmanın kendisi. 42–48 px, satır aralığı 1.15–1.25, harf aralığı hafif negatif (`-.015em`) |
| **Vurgu kelimesi** | Aynı sans ama **renkli** ya da 2× büyük | Cümlenin can alıcı kelimesi. Sarı `#FFC93C` / cyan `#22E3F5` / altın |
| **Duygu satırı** | İtalik serif (Playfair Display Italic) veya kaligrafik script (Great Vibes) | Tek kelime ya da kısa satır. Hep sans'ın *yanında*, tek başına değil |

Kalıp hep aynı: **kalın sans + italik/script** yan yana.
`musluktan akan su` / *`temiz mi?`* · `para kazanmayı` / *`öğrendin.`* ·
`So what` / *`Commerce`*

Okunurluk: koyu zeminde beyaz metin + çok katmanlı gölge (dört yöne 2 px
koyu kaydırma + geniş yumuşak gölge). Ayrı bir plaka yoksa metin altındaki
görüntü mutlaka karartılır.

---

## 3. Renk

Her video **tek bir baskın hue** üzerine kurulu, aksan rengi onun tamamlayıcısı:

- ref-A: soğuk cyan zemin → aksan **cyan/beyaz**
- ref-B: sıcak toprak zemin → aksan **sarı/turuncu**
- ref-C: derin yeşil → aksan **altın**

Kural: zemin rengini çekimden al, aksanı ondan türet, üçüncü bir renk ekleme.
Negatif/uyarı için tek istisna: kırmızı `#FF3B30`.

---

## 4. Animasyon sözlüğü

Hepsi `overlay.html` içinde hazır. Kullanılan easing'ler:

```js
spring   = x => 1 - 2**(-10x) * cos(3πx)     // yaylanarak oturur — kelimeler, çipler, kartlar
outExpo  = x => 1 - 2**(-10x)                // hızlı çıkıp yumuşak duran — kartlar, çizgiler
outBack  = x => 1 + 2.9(x-1)³ + 1.9(x-1)²    // hafif taşıp geri gelen — rozetler
```

| Hareket | Nasıl | Nerede |
|---|---|---|
| Kelime girişi | `spring`, 26 px aşağıdan, `scale .62→1`, kelime başına ~90 ms gecikme | Altyazı |
| Vurgu patlaması | `scale 1.7→1` + arkada dönen ışınlar | "BMW!" anı |
| Kart girişi | `outExpo`, 300 px yandan veya 70 px alttan, `scale .90→1`, gölge birlikte büyür | Bilgi kartları |
| Çizgi çizimi | SVG `stroke-dasharray` + `dashoffset` animasyonu | Halka, ok, alt çizgi |
| Ken Burns | Duraǧan görsele `scale 1.05→1.13` | Kart içindeki fotoğraflar |
| Zoom punch | Görüntüye `1.02 → 1.105` gaussian darbe, 0.22 s genişlik | Vurgu anları, kesimler |
| Geçiş flaşı | Beyaz, 0.22 s, tepe %30 | Her sahne değişimi |

Zoom punch'ın ffmpeg karşılığı (`crop` bu derlemede `eval=frame` desteklemiyor):

```
scale=w='trunc(720*(Z)/2)*2':h='trunc(1280*(Z)/2)*2':eval=frame,
crop=720:1280:'(in_w-720)/2':'(in_h-1280)/2'
Z = 1.02 + Σ 0.085·exp(-((t-tᵢ)/0.22)²)
```

---

## 5. SFX

Hazır kütüphane yok; hepsi `car-review/sfx.py` içinde gürültü + sinüs
osilatörlerinden ve bir Chamberlin state-variable bant filtresinden üretiliyor.

| Ses | Reçete | Nereye |
|---|---|---|
| `whoosh` | Beyaz gürültü, bant merkezi 320 → 5200 Hz üstel süpürme, `sin(πt)^1.4` zarf, 0.50 s | Her kesim ve kart girişi. **En sık kullanılan** — transientlerin ~%55'i |
| `impact` | 105 Hz'den 34 Hz'e düşen sinüs + 30 ms gürültü tıkırtısı, `exp(-4.6t)` | Vurgu kelimesi, sert kesim. Seyrek — ~%10 |
| `pop` | 1500 → 260 Hz sinüs, `exp(-26t)`, 0.16 s | Küçük öğeler: çip, rozet, işaret |
| `riser` | Gürültü 480 → 7600 Hz + yükselen sinüs, `(t/T)^2.1` zarf, 1.3 s | Büyük ana **giden** 1.3 s. Sonu hedefe hizalanır, başı değil |
| `ding` | 1760 + 2640 + 3520 Hz, ayrı sönümler | Onay, tik, olumlu vurgu |

Miks: konuşma `0.94`, SFX `1.0`, sonda `alimiter=limit=0.97`.
SFX ortalaması konuşmanın **8 dB altında** kalmalı — duyulsun ama bastırmasın.

---

## 6. Grafik dağarcığı

**Önce iki kural** — ikisi de bu kurguda hata yapıp düzelterek öğrenildi:

1. **Grafik, altyazının söylemediğini göstermeli.** Altyazıdaki bir kelimeyi
   büyütüp ekrana basmak grafik değil, aynı bilginin ikinci kopyası. İzleyici
   bunu gereksiz bulur. Kelime patlaması ancak *tek başına* varsa (altyazı o an
   yoksa) iş görür. Doğru grafik bir karşılaştırma, bir ölçek, bir liste, bir
   durum tablosudur.
   *Örnek:* "Golf parasına bu arabayı alabilirsiniz" derken altyazıya
   `GOLF PARASINA` yazmak yerine `BMW 5  =  GOLF (dizel·otomatik)` denklemini
   göstermek — cümlenin tezi görselleşir.

2. **SFX seyrek olmalı: ~2 saniyede bir, fazlası değil.** Her altyazı
   değişimine tik koymak sesi çamura çeviriyor. 17 sn'lik bir klipte 28 olay
   fazla, **8 olay doğru**. Her ses bir kesime, bir grafik girişine ya da bir
   vurguya bağlanmalı; dolgu sesi olmamalı. Referanslardaki yüksek transient
   sayısının çoğu konuşmanın kendisidir, eklenen efekt değil.

- **Yüzen kart**: açık zeminde koyu ya da beyaz kart, 30 px köşe, `0 40px 90px rgba(0,0,0,.5)` gölge, üstte tarayıcı noktaları
- **Bilgi kartı**: beyaz, sol üstte renkli daire ikon (✓ / ✕), tek satır alıntı
- **PIP**: sol altta 20 px köşeli küçük kart, konuşan kişi
- **Karaoke caption**: koyu yarı saydam plaka, kelimeler sırayla sarıya döner
- **İstif listesi**: görüntü blurlanır, satırlar alt alta birikir, güncel satır beyaz, öncekiler %42 opak
- **Sayaç**: `outExpo` ile 0 → hedef
- **Karşılaştırma kartı**: iki sütun, üstte pill etiket, altta tek cümle
- **Işın patlaması**: 28 ışın, dönerek büyür, arkada kalır

---

## 6b. Yanmış altyazıyı silmek — gerçekçi beklenti

360p, düşük bitrate bir kaynakta beyaz altyazı **temiz silinemiyor**. Denenenler
ve sonuçları:

| Yöntem | Sonuç |
|---|---|
| Tek kalın `delogo` (82 px) + blur | Geniş, belirgin yatay leke |
| İki ince `delogo` (23 + 42 px) | Belirgin biçimde daha iyi, ama leke duruyor — **en iyisi bu** |
| Altı çok ince `delogo` (12 px) | Daha kötü: metin dikey çizgilere dönüşüyor |
| Sadece güçlü blur | Parlak metin gri sise dönüşüyor, daha göze batıyor |

Yani lekeyi bir şeyin örtmesi gerekiyor. Bunu yaparken **ekranın büyük bir
bölümünü karartmak yerine, lekeyi tam kadar örten tanımlı bir panel** kullan:
kenarları belli, köşeleri yuvarlak, üstünde ince bir aksan çizgisi olan bir
alt bant. Bulanıklaştırılan bölgeyi de hafifçe karart (`eq=brightness=-0.05`),
yoksa çevresinden açık kalıp gri bir levha gibi durur. Altyazı panelin içinde
**dikey ortalanmalı**, yoksa uzun satırlarda dışarı taşar.

Bu kurguda karartılan alan 720×470'ten 656×194'e indi — %62 azalma.

## 6c. Yazı düz durmasın

Tek punto, tek ağırlık, tek renkle dizilmiş bir satır düz görünür. Bir altyazı
öbeğinde en az üç kademe olmalı:

| Rol | Boyut | Görünüm |
|---|---|---|
| Vurgu | 64 px (1.33×) | Aksan rengi, harfler tek tek açılır |
| Normal | 48 px | Beyaz, ağır sans |
| Bağlaç (`bir`, `ki`, `da`, `çok`) | 36 px (0.75×) | %60 opak — ritim yaratır, okumayı yavaşlatmaz |
| Alıntı | 54 px | İtalik serif |

Vurgu kelimelerinde kelime değil **harf** animasyonu kullan: harfler sırayla
hafif dönerek yükselir. Kelime blok halinde zıplayınca hareket ucuz duruyor.

## 7. Yeni kurgu için sıra

1. `ffmpeg` ile kontakt sayfası çıkar, planları ve konuşmayı zaman damgalarıyla yaz
2. Gömülü altyazı varsa: bandın kare kare değişimini ölçerek zamanlamayı çıkar, sonra `delogo` + yerel blur ile sil
3. Zemin renginden paleti türet, aksanı seç
4. Altyazıyı `CAPS` dizisine gir, `*` ile vurgulanacak kelimeleri işaretle
5. Ekranın **0.6–1.0 s**'den uzun süre sabit kalmadığından emin ol — boşluklara grafik ya da zoom punch koy
6. SFX olaylarını kesimlere ve vurgulara hizala, riser'ları hedeften geriye doğru yerleştir
7. `build.sh` ile render et, kontakt sayfasıyla kontrol et

## Sınırlar

- Font **tanıma** yapamıyorum; karakteri tarif edip en yakın açık lisanslı
  eşdeğeri kullanıyorum (script için Great Vibes, geometrik sans için Poppins).
- Sesi dinleyemiyorum; SFX'leri spektral analizle sınıflandırıp sentezliyorum.
- Kaynak videonun çözünürlüğü çıktının tavanı. 360×640 bir klip 720×1280'e
  yükseltilir ama gerçek detay kazanmaz.
