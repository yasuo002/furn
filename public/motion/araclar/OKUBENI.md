# Kurgu boru hattı

Ham konuşma videosunu, grafik sahneler ve tipografik altyazılarla birleştirilmiş
tek bir dosyaya çeviren zincir.

1. **Ses → metin.** `ffmpeg` ile 16 kHz mono WAV çıkarılır, sherpa-onnx whisper-small
   modeliyle 7 saniyelik pencereler hâlinde yazıya dökülür; her pencerenin konuşma
   başlangıcı/bitişi ses enerjisinden bulunur.
2. **Altyazı planı** — `altyazi-plani.py`. Elle düzeltilmiş metin işaretlerle yazılır:
   `*altın anahtar*`, `!turuncu olumsuz!`, `_serif italik_`, `[kutu]`.
   Kelimeler 2-3'lük kartlara bölünür, kart süreleri harf sayısına göre dağıtılır.
   Çıktı: `captions.json`.
3. **Kurgu katmanı** — `girisim-edit.html`. `girisim-sahneler.html` içindeki altı sahne
   ile altyazı katmanını tek zaman çizelgesinde toplar. `window.__edit.time(saniye)`
   çağrısı o ana ait kareyi kurar; grafik açıkken altyazı gizlenir.
4. **Kare render** — `kare-render.mjs`. Başsız Chromium ile saniyede 30 kare,
   1080x1920, saydam arka planlı PNG.
5. **Birleştirme** — kareler `qtrle` (alfa) videoya kodlanır, kaynak video
   1080x1920'e ölçeklenip altına konur, özgün ses eklenir, H.264 olarak yazılır.

Sahne yerleşimi ve hızları `girisim-edit.html` içindeki `PLACE` dizisindedir:
`[sahne, başlangıç saniyesi, hız, sahne süresi ms]`.
