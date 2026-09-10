# KURGU STÜDYO

Kendi bilgisayarında çalışan kurgu asistanı. Örnek videolardan tarz öğrenir,
konuşmayı çözümler, altyazı ve motion grafikleri **ayrı katmanlar** olarak üretir,
sohbetten verdiğin komutlarla düzeltir ve sonunda videoyu dışa aktarır.

## Kurulum (bir kez)

**Windows:** `KUR_WINDOWS.bat` → çift tıkla
**Mac:** `KUR_MAC.command` → çift tıkla
*(Mac'te "geliştirici doğrulanamadı" derse: sağ tık → Aç)*

Kurulum Python paketlerini ve Chromium'u indirir. İlk kurguda ayrıca
konuşma modeli (~640 MB) bir kez otomatik iner.

## Çalıştırma

**Windows:** `BASLAT_WINDOWS.bat` — **Mac:** `BASLAT_MAC.command`
Tarayıcı `http://127.0.0.1:8765` adresinde açılır. Her şey bilgisayarında kalır.

## Kullanım

1. **Örnek videolar** (3–10) — soldaki ilk kutuya bırak, “Tarzı çıkar”a bas.
   Kesim ritmi, renk paleti ve yazı yoğunluğu ölçülür; kurgu bunlara göre ayarlanır.
2. **Editlenecek video** — bırak, “Kurgula”ya bas.
   Dikey video koyarsan çıktı da dikey olur; çözünürlük kaynakla aynı kalır.
3. **SFX** (isteğe bağlı) — ses efektlerini buraya bırak, sonra sohbetten
   “12. saniyeye şu sesi ekle” diyerek yerleştir.
4. **Zaman çizelgesi** — her altyazı ve grafik ayrı bir katman. Tıkla, sağdaki
   panelden metnini, zamanını, konumunu düzelt.
5. **Sohbet** — aşağıdaki alandan komut ver, `＋` ile dosya/resim ekle.
6. **Bilgisayarıma aktar** — final videoyu basar ve indirir.
   “6 sn önizleme” imlecin bulunduğu yerden kısa bir kontrol çıktısı verir.

## Sohbette anlaşılan komutlar (anahtarsız, çevrimdışı)

| Örnek | Ne yapar |
|---|---|
| `altyazıyı büyüt` / `küçült` / `52 punto yap` | altyazı boyutu |
| `altyazıyı yukarı al` / `aşağı al` | altyazı konumu |
| `altyazı zeminini kapat` | arkadaki bulanık şerit |
| `Marka katmanını sil` / `3. katmanı gizle` | katman kaldır / gizle |
| `Hero soru'yu 12. saniyeye taşı` | zamanlama |
| `Karşıtlık'ı 1 saniye uzat` | süre |
| `üst yazıyı "YENİ METİN" yap` | metin değiştirme |
| `AYNI HATA yazısını TEKRAR yap` | tırnaksız metin değiştirme |
| `rengi #E2643C yap` | aksan rengi |
| `sesi kıs` / `aç` | SFX seviyesi |
| dosya ekleyip `8. saniyeye ekle` | resim/video/ses katmanı |

**Serbest cümleler** (“şu sahnede üç madde yerine iki madde olsun, ikincisi
üstü çizili”) için Claude'a bağlan: başlatmadan önce `ANTHROPIC_API_KEY`
ortam değişkenini tanımla. Tanımlı değilse sistem yine tamamen çalışır,
sadece yukarıdaki kalıplarla sınırlı kalır.

## Klasörler

```
proje/aktif/     yüklediğin dosyalar + plan.json (kurgunun tamamı)
cikti/           basılan videolar
varliklar/       fontlar, konuşma modeli
core/            analiz, konuşma çözümleme, planlama, render
web/sahne/       motion grafik motoru (motor.js) — şablonları buradan değiştirebilirsin
```

`proje/aktif/plan.json` kurgunun tek kaynağıdır; elle de düzenleyebilirsin.

## Sık sorunlar

- **“Konuşma çözümlenemedi”** — videoda ses yok ya da çok kısık.
- **Export uzun sürüyor** — her kare tarayıcıda çiziliyor; 70 sn'lik dikey
  video ortalama bir makinede 6–12 dakika sürer. “6 sn önizleme” ile kontrol et.
- **Port dolu** — `python app.py 8790` gibi başka bir port ver.
