# Sahne notları — referans videolardan çıkarılan kurallar

İki referans videodan (9:16, 720x1280, 30 fps, 32–35 sn) kare kare çıkarılan
gözlemler. Yeni bir cümle geldiğinde sahneler bu kurallara göre kurulur.
Çalışan uygulaması: `sahne-kit.html`.

## Ritim
- Konuşan kafa ile grafik sahneler **dönüşümlü**; kesme noktaları ortalama
  **2–4,5 saniyede bir** (ölçüm: 3.9 / 6.3 / 11.0 / 13.4 / 15.8 / 19.5 / 23.9 / 28.5 sn).
- Grafik sahneler 2–4,5 sn sürer, yani bir sahne = bir cümlecik.
- Altyazı kelime hızı **0,35–0,50 sn/kelime**. Yığın sahnelerinde de aynı tempo.

## Tipografi
- Gövde: nötr grotesk (Helvetica/Inter ailesi), 600–800 ağırlık, sıkı satır arası (1,0–1,2), negatif harf aralığı.
- Vurgu: **kalın italik serif** (didone) — yalnızca anahtar kelimede.
- Aynı satırda **karışık punto ve ağırlık**: uzun kelimeler büyük ve beyaz,
  bağlaç/kısa kelimeler (≤3 harf) bir önceki satıra küçük ve daha soluk yapışır.
- Türkçe büyük harf CSS `text-transform` ile değil, metnin kendisiyle yazılır
  (aksi halde İ → I bozulur).

## Renk
- Video A: tamamen **gri tonlama** — açık gri duvar, beyaz metin, siyah nesneler; vurgu yok.
- Video B: siyah zemin + **kehribar/altın** (#F5A623) vurgu; ikinci sahnede
  mor-lacivert aurora; anahtar kelime her zaman kehribar.
- Kural: sahne başına tek vurgu rengi, gerisi nötr.

## Giriş hareketleri (ölçülen davranış)
- **Oturma**: kelime gri/bulanık gelir, ~0,45 sn sonra tam beyaza oturur. Yeni kelime hep en soluk olandır.
- **Pop**: %105'e büyüyüp yerine oturan kısa vuruş — vurgulu kelimelerde ve etiketlerde.
- **Kademeli etiket**: sırayla ve yatayda kaydırılarak gelen yuvarlak köşeli etiketler.
- Arka planda daima yavaş bir hareket: kayan ışık, dönen ızgara, nefes alan parlama.

## Tekrar eden sahne arketipleri
1. **Kelime yığını** — dokulu gri duvar; cümle satır satır birikir (video A, 24–29 sn).
2. **Vurgulu altyazı** — siyah zemin, kehribar ışık kapısı, silüet; italik serif + grotesk katmanı (video B, 2–5 sn).
3. **Beyaz patlama** — patlamış beyaz ışık, küçük siyah metin (video A, 15–18 sn).
4. **Editoryal kolaj** — gri ürün makrosu, teknik ızgara, çember, dört uçlu yıldız, sıkışık manşet + hayalet ikinci satır (video A, 3–6 sn).
5. **Etiket yığını** — aurora gradyan, kademeli translucent etiketler, italik kalın metin + küçük simge (video B, 19–22 sn).
6. **Video içinde video** — telefon çerçevesi, kırmızı ilerleme çubuğu, altında kehribar altyazı (video B, 14–16 sn).

Geçiş öğeleri: köşelerden geçen beyaz bıçak/kağıt uçak şekilleri, ince ızgara,
grenli doku. Her sahne bir "süpürme" ile açılır.

---

# Üçüncü referans: "$5 Edit vs $999 Edit" (22 sn, 9:16, 30 fps)

Öncekilerden farklı bir tür: **kesme yok**. Tek çekim, aynı ham görüntü iki kurguyla
yan yana oynatılıyor. İddia görüntüde değil, kurguda.

## Sahne düzeni (kabuk)
- Zemin: açık gri stüdyo fonu, üzerinden geçen **yumuşak ışık şeritleri** (yavaş, sürekli).
- Solda küçük kart: **"$5 Edit"** — ham çekim; sabit geniş plan, altyazı yok, grafik yok, renk düzeltmesi yok.
- Sağda büyük kart: **"$999 Edit"** — aynı an, aynı ses; kurgulanmış hâli.
- İki kart da yuvarlak köşeli, gölgeli; etiketler kartların üstünde kalın siyah grotesk.
- Altta sabit CTA: **Comment "Raw"** (ağır siyah) + *To get the raw video* (ince ikinci satır).
- Boyut farkı argümanın kendisi: ucuz kurgu küçük ve sönük, pahalı kurgu büyük ve canlı.

## Pahalı kurguda ne var (ham çekimde olmayan)
1. **Kahraman kelime altyazısı** — beyaz kalın grotesk iki satır, aralarına **altın rengi
   el yazısı/script** ile anahtar kelime (≈2× punto, hafif eğik, yumuşak parlama).
   Kelime satırın *üstüne biniyor*, ayrı satıra çıkmıyor.
2. **Plan büyütme (punch-in)** — kesme yerine kadraj değişimi: geniş plandan yüz planına.
   Küçük kart hep aynı planda kalır, fark böyle görünür hale gelir.
3. **Bölüm rozetleri** — yuvarlak kare çerçeveli numara ("1", "2 Sales"); ekranın ortasında
   parlayarak açılır, sonra köşeye küçülerek yerleşir ve konu boyunca orada kalır.
4. **Noktalı yol** — rozetler arasında el çizimi hissi veren kesikli çizgi, ucunda küçük ok.
   Adımların sırasını görsel olarak bağlar.
5. **Kavram grafikleri** — konuyu resmeden basit semboller:
   - **Terazi**: siyah silüet, kefelerde yeşil parlayan etiketler ("Distribution", "Marketing"),
     kefeler dengesizliği gösterecek şekilde eğik.
   - **Piramit**: üç kademe, alttan üste doğru açılır; koyu tepe → parlak taban,
     beyaz kalın numaralar, yanlarında etiketler ve noktalı bağlantılar.
6. **Renk dünyası birliği** — grafik sahnelerin zemini, çekimdeki yeşil fonun aynı tonu
   (koyu yeşil radyal vinyet + gren). Grafik "üstüne yapıştırılmış" değil, sahnenin içinde duruyor.

## Ritim (ölçüm)
- Tam ekran grafik ↔ yüz geçişleri: 3.4 / 7.4 / 9.6 / 10.2 / 19.8 sn.
- Grafik bölümleri ~3–4,5 sn, yüz bölümleri ~2–3 sn — önceki iki videoyla aynı tempo.
- Yani "her 3 saniyede yeni görsel sebep" kuralı burada da geçerli; sadece kesmeyle değil,
  **grafik değiştirerek** uygulanıyor.

## Çıkarılan kurallar
- Bir fikri anlatmak için gerçek görüntü şart değil: **silüet + etiket** yeter (terazi, piramit).
- Numaralandırma ancak gerçekten sıra varsa kullanılıyor; rozet konu boyunca ekranda kalarak
  izleyiciye "neredeyiz" bilgisini veriyor.
- Vurgu tek kelimede ve tek biçimde: renk + yazı karakteri aynı anda değişiyor, punto ile birlikte.
- Karşılaştırma videosunda **ham taraf hiç dokunulmadan** bırakılıyor; kurgunun katkısı ancak
  yan yana görülünce anlaşılıyor.
