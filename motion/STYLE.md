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

## 6d. Sakin varyant — "göz yormayan"

Aynı dilin kısılmış hali. Uzun (60 sn+) tek plan konuşma videolarında hızlı
varyant yorucu oluyor; şu değişikliklerle sakinleşiyor:

| | Hızlı | Sakin |
|---|---|---|
| Easing | `spring` (taşar, zıplar) | sadece `outCubic` |
| Altyazı temposu | 0.8 sn | **1.3 sn** |
| Kelime girişi | 26 px + ölçek + harf harf | 11 px, sadece opaklık |
| Geçiş flaşı | var | **yok** |
| Zoom | vurgu darbeleri | 70 sn'de 1.00 → 1.045 tek yavaş kayma |
| SFX | ~2 sn'de bir | **tüm videoda 2 yumuşak geçiş** |
| Grafik | ~8 sn'de bir | ~8 sn'de bir (aynı) ama kutusuz |
| Renk | yüksek kontrast aksan | doygunluğu düşük, çekimden alınmış |

Kutuyu kaldırmak burada mümkün oldu çünkü konuşmacı **koyu bir üst** giyiyordu:
gömlek zaten temiz bir tuval, panel arka planı gerekmedi. Kaynağa bakıp böyle
bir alan var mı diye kontrol et — varsa kullan, yoksa 6b'deki panel.

## 6g. Sahne sahne dizgi

Videonun tamamını tek altyazı stiliyle geçmek yazıyı düz gösteriyor. Her öbeğe
kendi dizgisini ver; işaretler `overlay.html` içindeki metnin başına yazılır:

| İşaret | Ne | Nerede |
|---|---|---|
| `^` | Bebas Neue, 1.5× büyük, harf harf açılır | Cümlenin vurduğu kelime |
| `*` | Aksan rengi | İkincil vurgu |
| `~` | Playfair italik | Duygu, alıntı, düşünce |
| `&` | Great Vibes script | Videoda **bir kez**; kapanış gibi bir an |
| `-` | Inter 200, küçük, %66 opak | Bağlaç ve dolgu kelimeler |

Öbeğin kendisi de üç düzenden birini alır: `thin` (Inter 200, 51 px — sakin,
düşünen satırlar), `center` (Inter 800, 43 px — normal), `left` (sola dayalı,
46 px — liste gibi ardışık cümleler). Aynı satırda ince + kalın + italik
birlikte olunca yazı tasarlanmış görünüyor; hepsi aynı puntoda olunca altyazı
görünüyor.

Animasyon da işarete göre değişir: düz kelimeler soldan maskeyle açılır,
Bebas kelimeleri harf harf gelir, serif/script sağdan süzülür.

## 6h. Kendi başına duran motion graphic sahneleri

Referans videolarda grafiklerin bir kısmı altyazıya eşlik etmiyor — **sahneyi
devralıyor**. Konuşmacı kaybolur, ekranı 3–6 saniyeliğine animasyonlu bir
grafik alır. Bu, uzun konuşmalarda en çok işe yarayan şey.

Kural: her sahne söylenen şeyin **görsel karşılığı** olmalı, süsleme değil.

| Sahne | Ne anlatıyor | Nasıl çalışıyor |
|---|---|---|
| Terazi | "para mı, yapı mı" | Kefeler, konuşmacı "ama hiç kimse şunu konuşmuyor" derken terazi devrilir |
| Üç sütun | üçlü yapı | Numaralı (01/02/03) sütunlar sırayla yükselir, tepelerinde Bebas etiket |
| Kırılan bağlar | "X yoksa şu olur" | Yatay çizgiler ortadan kopar, iki parça ayrılır |
| Dağınık ağ | "kimsenin çevresi yok" | Bağlantısız noktalar, üçünün yanında etiket |
| Bağlanan ağ | kapanış | Aynı noktalar; aralarına çizgiler çizilir, script bir satırla biter |

Son iki sahne aynı nokta düzenini paylaşıyor: önce kopuk, sonra bağlı. Aynı
görselin dönüşmesi, iki ayrı grafikten çok daha güçlü.

Toplam tam ekran süresi videonun **%25–30'unu geçmesin**; üstünde slayt
gösterisine dönüyor. Bu 70 sn'lik kurguda 21 sn (≈%30).

Etiketleri noktaya sabitlerken taşmayı kontrol et: `offsetWidth` ile sağa
sığmıyorsa etiketi noktanın soluna al.

## 6i. Ne zaman hiç ses efekti koymamalı

Kaynakta zaten müzik varsa ve kurgu görsel olarak yeterince olay taşıyorsa
efekt eklemek sadece çamur yapıyor. Bu videoda hepsi kaldırıldı: çıktının ses
seviyesi kaynakla birebir aynı (−17.2 dB). Efekt, **görüntünün tek başına
anlatamadığı** bir vurgu varsa eklenir; ritim doldurmak için değil.

## 6f. Tek plan videoyu izlenebilir kılmak

60 sn+ tek plan bir konuşmada asıl sorun grafik azlığı değil, **kadrajın hiç
değişmemesi**. En büyük kazanç sanal kesme: aynı çekimden geniş / orta / yakın
kadrajlar üretip konuşmanın doğal sınırlarında sertçe geçmek.

```
scale=w='trunc(720*(Z)/2)*2':h='...':eval=frame,
crop=720:1280:'(in_w-720)/2+(XO)':'(in_h-1280)/2+(YO)'
```

`framing.py` bir plan tablosunu bu ifadelere çeviriyor. Kurallar:

- **Zoom tavanı 1.30.** Üstü 720p kaynakta gözle görülür yumuşuyor.
- **Yakın planda pencereyi yukarı kaydır** (`y` negatif, −60…−80). Merkezden
  kırpınca yüz kadrajın altına düşüyor.
- **Panel/diyagram anlarında geniş kal** (1.02–1.06); grafiğin nefes alacağı
  yer lazım.
- Plan içinde zoom'u 0.02 kadar sürükle — sabit kadraj ölü duruyor.
- Kaynağın kendi açılış/kapanışında zoom **tam 1.00** olmalı, yoksa onların
  görüntüsünü de kırpmış olursun.

Yazı tarafında tek animasyon yerine üç ayrı davranış kullan: normal kelimeler
soldan maskeyle açılır (`clip-path: inset()`), vurgu kelimeleri harf harf gelip
kısa bir parıltı bırakır, italik alıntılar sağdan süzülür. Aynı satırda üç farklı
hareket olması yazıyı canlı gösteriyor, hepsini birden zıplatmadan.

Font çeşitliliği de aynı işi görüyor: gövde için Inter, panel için Space Grotesk,
etiket/bölüm için JetBrains Mono, tam ekran vuruşlar için Bebas Neue, duygu
satırı için Playfair italic. Beş rol, beş karakter.

## 6e. Kaynağın kendi kapanışına dokunma

Bu videonun son 8 saniyesi zaten markalı bir outro'ydu (uzay çekimi +
"GİRİŞİM SENARYOSU"). İlk render onun üzerine kendi kapanış kartımı bindirmişti.
**Kurgulamadan önce videonun son 10 saniyesine bak:** kendi outro'su, logosu ya
da CTA'sı varsa katman ondan önce tamamen çekilmeli. Aynısı açılış için de
geçerli.

## 7. Yeni kurgu için sıra

1. `ffmpeg` ile kontakt sayfası çıkar; **ilk ve son 10 saniyeye ayrıca bak**
   (kaynağın kendi açılış/kapanışı varsa katman oraya girmez)
1b. Konuşma metni: gömülü altyazı varsa bandın değişiminden, yoksa ASR ile
   (`founder-short/asr.py` — uzun geçiş metni, kısa geçiş zamanlamayı verir)
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
