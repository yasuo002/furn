# Derinkuyu — Remotion belgesel videosu

Belgesel tadında, seslendirmeye göre otomatik zamanlanan 1080p video. Metin `src/script.ts`, sahneler `src/scenes/index.tsx`.

## Kurulum ve önizleme
```bash
cd remotion
npm install
npm run dev          # Remotion Studio: http://localhost:3000
```

## Gerçek görselleri ekle
`public/images/manifest.json` içindeki 19 dosyayı Wikimedia Commons'tan indirip aynı adla `public/images/` altına koy.
Eksik dosyalar yer tutucuyla render edilir; `npm run check-assets` eksikleri listeler.

## Seslendirmeyle senkron
1. `SCRIPT.md`'yi kaydet (bölüm bölüm ayrı dosya kaydetmek en kolayı).
2. Her bölümün süresini saniye olarak `src/script.ts` içindeki ilgili `overrideSeconds` alanına yaz.
3. Ses dosyalarını `public/audio/` altına koy ve `src/Video.tsx` içinde `<Audio src={staticFile('audio/01.mp3')} />` ile ilgili `Sequence`'e ekle
   (ya da tek parça kaydı en üst `AbsoluteFill` içine tek `<Audio>` olarak koy).
4. Süreleri değiştirince alt sahneler orantılı ölçeklenir; ince ayar için `src/scenes/index.tsx` içindeki `w` ağırlıklarını oynat.

## İkinci video: Kuzey Kore
Kompozisyon `KuzeyKore` (`src/nk/`). Metin: `SCRIPT-kuzey-kore.md`, storyboard: `STORYBOARD-kuzey-kore.md`, görseller: `public/images/nk/manifest.json`.
```bash
npx remotion render KuzeyKore out/kuzey-kore.mp4
COMP=KuzeyKore node scripts/render-preview.mjs 0.5 28   # hızlı önizleme
```

## Render
```bash
npm run render            # 1080p, out/derinkuyu.mp4
npm run render:preview    # yarım çözünürlük hızlı önizleme
node scripts/stills.mjs "60,500,900" 0.5   # seçili kareleri PNG olarak al
```

İnternetsiz / Google Fonts erişimi olmayan makinede: `REMOTION_OFFLINE_FONTS=1` (sistem yazı tipleri) ya da
`public/fonts/` altına Playfair Display + Inter TTF dosyalarını koy (bkz. `public/fonts/README.md`).
Chromium yolu gerekiyorsa: `REMOTION_BROWSER_EXECUTABLE=/yol/chrome`.

## Yapı
```
src/
  script.ts            seslendirme metni + süre modeli (WPM, overrideSeconds)
  Video.tsx            bölümleri sırayla dizer
  scenes/index.tsx     10 bölümün alt sahneleri (Beats ağırlıkları)
  components/
    AnatoliaMap.tsx    gerçek coğrafya (world-atlas / Natural Earth), işaretçi ve rota animasyonu
    CrossSection.tsx   yeraltı şehri kesiti, kat kat iniş
    StoneDoor.tsx      taş kapı mekaniği (üstten görünüm)
    Ventilation.tsx    baca / hava akışı prensibi
    TuffFormation.tsx  volkan → kül → tüf → peri bacası
    Timeline.tsx       kesin / tahmin / tartışmalı işaretli zaman çizelgesi
    KenBurns.tsx       gerçek fotoğraf için yavaş zoom-pan (dosya yoksa yer tutucu)
    Text.tsx           başlık, alt bant, bölüm kartı, sayaç, alıntı
    Overlay.tsx        anahtar cümle bandı, büyük ifade kartı, derinlik göstergesi
```
Yeni bir video için: `script.ts` metnini değiştir, `scenes/index.tsx`'te sahneleri yeniden diz; bileşenler aynen kullanılabilir.
