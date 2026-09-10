# AI Ad Generator

Local web-app port of the n8n workflow **"test items in spaces"**. It turns a
product/painting photo into a short social-ready video ad:

1. **Upload** a painting/product photo (+ optional room photo) and a description.
2. **Gemini 2.5 Flash** (via [fal.ai](https://fal.ai)) places the painting on the wall of the room.
3. The edited image is hosted on **imgbb**.
4. **WAN v2.2 i2v** (via fal.ai queue) animates it into a video (queue + poll loop).
5. *(Optional)* the video is posted to TikTok / Instagram / YouTube via upload-post.

Each step maps 1:1 to a node in the original n8n graph — see `src/pipeline.js`.

## Run locally

```bash
npm install
npm start            # → http://localhost:3000
```

Open http://localhost:3000 and use the form.

### Modes

- **MOCK mode** (default, no keys): the pipeline runs end-to-end with fake URLs so
  you can see the flow and UI without spending API credits.
- **LIVE mode**: copy `.env.example` to `.env`, set `FAL_KEY` and `IMGBB_API_KEY`,
  then `npm start`. Social posting also needs `UPLOAD_POST_API_KEY`.

```bash
cp .env.example .env
# edit .env, then:
npm start
```

> The app loads `.env` automatically on startup (`src/env.js`). You can also just
> export the variables in your shell instead of using a file.

## Project layout

| File                | Purpose                                             |
|---------------------|-----------------------------------------------------|
| `server.js`         | Express server, form endpoint, SSE progress stream  |
| `src/pipeline.js`   | The pipeline (one function per n8n node)            |
| `public/index.html` | The upload form + live log + result viewer          |


## Yerel video editörü (`/editor.html`)

Örnek videolardan edit tarzını öğrenen, katman tabanlı yerel bir editör.
`npm start` sonrası **http://localhost:3000/editor.html**.

1. **Örnek alınacak videolar (3–10)** — sahne kesimleri ffmpeg ile çıkarılır **ve videolar kare kare
   incelenir** (`src/editor/vision.js`, saniyede 4 kare): altyazı bandının ekrandaki konumu, puntosu,
   rengi ve kutulu olup olmadığı; altyazı sıklığı ve ortalama ekranda kalma süresi; flaş sayısı;
   kurgu/kamera hareket enerjisi; grafik renk paleti. Bunlar kesim temposuyla birlikte bir
   *stil profili*ne dönüşür ve yeni kurguya uygulanır: öğrenilen yazı stili altyazı katmanlarına,
   ölçülen flaş/hareket yoğunluğu efekt karışımına (zoom, flaş, sarsıntı, wipe), palet ise
   grafiklerin rengine gider. Ne öğrenildiği kartın altında özetlenir.
2. **Editlenecek video** — çıktı kaynak çözünürlüğünü korur, yani dikey giren dikey çıkar.
3. **SFX (isteğe bağlı)** — vuruş noktalarına otomatik yerleşir, sonra taşınabilir.
4. **Yapay zekâ talimatı** — *ne yapılacağını* anlatan serbest alan; bu metin ekrana **altyazı olarak
   çıkmaz**. Tempo (`hızlı`, `sakin`), altyazı yoğunluğu/stili (`büyük harf`, `sarı`, `altta`, `kutu`,
   `daktilo`), hangi efektler kullanılsın/kullanılmasın (`zoom ve flaş kullan, sarsıntı istemiyorum`),
   SFX tercihi. Ekrana çıkacak yazıyı istiyorsan **tırnak içinde** ver ya da
   `Ekranda şu metinler geçsin:` satırının altına madde madde yaz — sadece bunlar altyazı olur.
   Metin vermediysen editörde doldurmak üzere birkaç `(metin girin)` yer tutucusu oluşur
   (`ANTHROPIC_API_KEY` varsa metinleri model yazar). Talimattan ne anlaşıldığı
   "Talimatı uygula ve kurgula" sonrası kartın altında özetlenir.

### Akış

1. **🎓 Örnekleri incele ve öğren** — örnek videolar sahne sahne çözümlenir (`src/editor/learn.js`):
   her sahnenin rolü (açılış / aksiyon / ürün-detay / anlatım / kapanış), yazı var mı, kesimde flaş
   atılmış mı, sahne hareketli mi durgun mu. Sonuç bir **kurgu grameri**dir: yazılı sahne oranı,
   kesimde flaş oranı, hareketli sahne oranı, ortalama sahne süresi ve öğrenilen yazı stili.
   İlerleme canlı akar, öğrenilenler sahne listesiyle birlikte ekranda gösterilir.
2. **🎬 Videoyu sahne sahne kurgula ve üret** — hedef video da sahnelere ayrılır (kesimsiz uzun
   çekimler, örneklerdeki ortalama sahne süresine göre hareketin en sakin olduğu yerlerden bölünür)
   ve her sahne için karar verilir (`src/editor/director.js`): durgun sahneye zoom, hareketli sahneye
   sarsıntı, kesime flaş/wipe, ürün-detay sahnesine vurgu dairesi, kapanışa alt bilgi şeridi, sakin
   sahnelere altyazı. Hangi sahnede ne yapıldığı gerekçesiyle listelenir, ardından video ffmpeg ile
   render edilip sonuç kartında verilir.
3. **Editör** — çıkan videoya tıklayınca katman bazlı editör açılır ve her şey elle düzeltilebilir.

Editörde:

- **Katmanlar**: altyazı, grafik/hareket (zoom, sarsıntı, flaş, alt bant, wipe, alt bilgi
  şeridi, vurgu dairesi), görsel ve SFX katmanları ayrı ayrı görünür/gizlenir, düzenlenir.
- **Önizleme**: video üstüne canvas ile birebir çizim; katmanı tuvalde sürükleyerek konumlandırma.
- **Zaman çizelgesi**: klipleri sürükle-bırak taşıma ve kenarlarından süre değiştirme.
- **Girdi alanı**: `3. saniyede "İndirim başladı" yaz`, `2. altyazıyı kırmızı yap ve büyüt`,
  `5-6 sn arası zoom ekle`, `orijinal sesi kıs` gibi komutlar. 📎 ile eklenen **resim/ses
  dosyaları doğrudan katman olur** (`4. saniyede bu sesi ekle`).
  `ANTHROPIC_API_KEY` varsa komutlar modelle, yoksa yerleşik kural motoruyla yorumlanır.
- **Dışa aktar**: aynı katmanlar sunucuda ffmpeg ile yakılır (altyazı/grafik → libass,
  zoom/sarsıntı → zoompan, görsel → overlay, SFX → amix) ve MP4 bilgisayara indirilir.

Projeler ve medya `data/projects/<id>/` altında tutulur — tamamen yerel, internet gerekmez.
ffmpeg/ffprobe `ffmpeg-static` ile birlikte gelir, sistem kurulumu gerekmez.
