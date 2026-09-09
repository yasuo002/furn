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
