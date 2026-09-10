// Referans videoların GÖRÜNTÜSÜNÜ inceler: kareler örneklenir, üzerinde
// altyazı bandı (konum, yükseklik, renk, kutu kullanımı), flaş/sarsıntı/zoom
// yoğunluğu ve grafik renk paleti ölçülür. Tamamen yerel; API anahtarı gerekmez.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ffmpeg } from './bin.js';
import { newId, DATA_DIR } from './store.js';

const require = createRequire(import.meta.url);
const { loadImage, createCanvas } = require('@napi-rs/canvas');

const SAMPLE_FPS = 4;      // saniyede kaç kare incelensin
const SAMPLE_W = 192;      // analiz genişliği (hız için küçük)
const MAX_FRAMES = 240;

async function sampleFrames(file, dir) {
  await fs.mkdir(dir, { recursive: true });
  await ffmpeg([
    '-i', file,
    '-vf', `fps=${SAMPLE_FPS},scale=${SAMPLE_W}:-2`,
    '-frames:v', String(MAX_FRAMES),
    path.join(dir, 'f_%04d.png'),
  ]);
  return (await fs.readdir(dir)).filter((f) => f.endsWith('.png')).sort().map((f) => path.join(dir, f));
}

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// Bir karenin satır bazlı "yazı olabilirliği" + parlaklık/renk istatistikleri.
function analyzeFrame(img) {
  const w = img.width, h = img.height;
  const cv = createCanvas(w, h);
  const c = cv.getContext('2d');
  c.drawImage(img, 0, 0);
  const { data } = c.getImageData(0, 0, w, h);

  const rowText = new Float32Array(h);
  const rowFlat = new Float32Array(h);   // düz/tek renk satır oranı (kutu, bant)
  const rowColor = new Array(h);
  let meanL = 0;

  for (let y = 0; y < h; y++) {
    let edges = 0, bright = 0, flat = 0;
    let cr = 0, cg = 0, cb = 0, cn = 0;
    let prevL = null;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const L = lum(r, g, b);
      meanL += L;
      if (prevL !== null) {
        const d = Math.abs(L - prevL);
        if (d > 55) edges++;          // keskin kenar → yazı konturu
        else if (d < 4) flat++;       // düz alan → kutu/bant
      }
      // Yazı pikseli adayı: parlak ya da doygun renkli
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      if (L > 165 || (sat > 0.55 && L > 90)) { bright++; cr += r; cg += g; cb += b; cn++; }
      prevL = L;
    }
    // Yazı bandı: çok sayıda keskin kenar + yeterli parlak piksel, ama tüm satır dolu değil.
    const edgeRatio = edges / w;
    const brightRatio = bright / w;
    rowText[y] = edgeRatio > 0.06 && brightRatio > 0.02 && brightRatio < 0.6 ? edgeRatio : 0;
    rowFlat[y] = flat / w;
    rowColor[y] = cn ? [cr / cn, cg / cn, cb / cn] : null;
  }
  return { rowText, rowFlat, rowColor, meanL: meanL / (w * h), w, h };
}

function hex([r, g, b]) {
  const q = (v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${q(r)}${q(g)}${q(b)}`;
}

// Beyaza yakın renkleri beyaza yuvarla ki palet gürültülü olmasın.
function normalizeColor(rgb) {
  const [r, g, b] = rgb;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const sat = mx === 0 ? 0 : (mx - mn) / mx;
  if (sat < 0.22) return mx > 170 ? '#ffffff' : '#000000';
  // 24'lük adımlara yuvarla ki neredeyse aynı tonlar tek renkte toplansın.
  return hex(rgb.map((v) => Math.round(v / 24) * 24));
}

export async function analyzeReferenceVideo(file, meta) {
  const dir = path.join(DATA_DIR, 'tmp', newId('an_'));
  let frames = [];
  try {
    frames = await sampleFrames(file, dir);
    if (!frames.length) return null;

    const H = 0; // ilk karede belirlenecek
    let rowsSum = null, rowsFlatSum = null, height = 0, width = 0;
    const colorVotes = new Map();
    const textPresence = [];   // kare kare: yazı var mı
    const lumas = [];
    let prevData = null;
    let motionSum = 0, motionN = 0;

    for (const f of frames) {
      const img = await loadImage(f);
      const a = analyzeFrame(img);
      height = a.h; width = a.w;
      if (!rowsSum) { rowsSum = new Float32Array(a.h); rowsFlatSum = new Float32Array(a.h); }
      let frameText = 0;
      for (let y = 0; y < a.h; y++) {
        rowsSum[y] += a.rowText[y];
        rowsFlatSum[y] += a.rowFlat[y];
        if (a.rowText[y] > 0) frameText++;
        if (a.rowText[y] > 0 && a.rowColor[y]) {
          const key = normalizeColor(a.rowColor[y]);
          colorVotes.set(key, (colorVotes.get(key) || 0) + a.rowText[y]);
        }
      }
      textPresence.push(frameText / a.h > 0.02);
      lumas.push(a.meanL);

      // Kare farkı → hareket enerjisi (sarsıntı / hızlı kamera)
      const cv = createCanvas(a.w, a.h);
      const c = cv.getContext('2d');
      c.drawImage(img, 0, 0);
      const cur = c.getImageData(0, 0, a.w, a.h).data;
      if (prevData) {
        let diff = 0;
        for (let i = 0; i < cur.length; i += 16) diff += Math.abs(cur[i] - prevData[i]);
        motionSum += diff / (cur.length / 16);
        motionN++;
      }
      prevData = cur;
      await fs.rm(f, { force: true });
    }

    // --- altyazı bandı ---
    const n = frames.length;
    const rowScore = Array.from(rowsSum, (v) => v / n);
    const peak = Math.max(...rowScore);
    const thr = Math.max(0.02, peak * 0.45);
    let bandStart = -1, bandEnd = -1, best = 0, curStart = -1, curSum = 0;
    for (let y = 0; y < height; y++) {
      if (rowScore[y] >= thr) {
        if (curStart < 0) { curStart = y; curSum = 0; }
        curSum += rowScore[y];
      } else if (curStart >= 0) {
        if (curSum > best) { best = curSum; bandStart = curStart; bandEnd = y - 1; }
        curStart = -1;
      }
    }
    if (curStart >= 0 && curSum > best) { bandStart = curStart; bandEnd = height - 1; }

    // Bandın gerçek yüksekliği için eşiği düşürüp merkezden dışa doğru genişlet:
    // yüksek eşik yalnız yazının en yoğun satırlarını yakalıyor, punto küçük çıkıyordu.
    const hasCaptions = bandStart >= 0 && peak > 0.03;
    let loStart = bandStart, loEnd = bandEnd;
    if (hasCaptions) {
      const soft = Math.max(0.012, peak * 0.18);
      while (loStart > 0 && rowScore[loStart - 1] >= soft) loStart--;
      while (loEnd < height - 1 && rowScore[loEnd + 1] >= soft) loEnd++;
    }
    const bandCenter = hasCaptions ? ((loStart + loEnd) / 2 / height) * 100 : null;
    // Dar band ≈ büyük harf yüksekliği; punto bunun ~1.4 katıdır.
    const capHeight = hasCaptions ? ((bandEnd - bandStart + 1) / height) * 100 : null;

    // Kutu/bant kullanımı: yazı bandındaki satırlar aynı zamanda çok "düz" mü?
    const bandFlat = hasCaptions
      ? Array.from({ length: loEnd - loStart + 1 }, (_, i) => rowsFlatSum[loStart + i] / n)
          .reduce((a, b) => a + b, 0) / (loEnd - loStart + 1)
      : 0;

    // Renk oyları → en çok kullanılan yazı/grafik rengi + palet
    const palette = [...colorVotes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c);
    const captionColor = palette[0] || '#ffffff';

    // --- flaş: ani parlaklık sıçraması ---
    let flashes = 0;
    for (let i = 1; i < lumas.length - 1; i++) {
      if (lumas[i] - lumas[i - 1] > 22 && lumas[i] - lumas[i + 1] > 12) flashes++;
    }

    // --- yazı süresi / kapsama ---
    const coverage = textPresence.filter(Boolean).length / n;
    let runs = 0, inRun = false, runLens = [];
    let curLen = 0;
    for (const p of textPresence) {
      if (p) { curLen++; if (!inRun) { runs++; inRun = true; } }
      else { if (inRun) runLens.push(curLen); inRun = false; curLen = 0; }
    }
    if (inRun) runLens.push(curLen);
    const avgCaptionDur = runLens.length ? (runLens.reduce((a, b) => a + b, 0) / runLens.length) / SAMPLE_FPS : null;

    const motion = motionN ? motionSum / motionN : 0;
    const dur = meta?.duration || n / SAMPLE_FPS;

    return {
      frames: n,
      hasCaptions,
      captionY: hasCaptions ? Math.round(bandCenter) : null,
      captionFontSize: hasCaptions ? Math.round(Math.min(14, Math.max(3, capHeight * 1.4)) * 10) / 10 : null,
      captionColor: hasCaptions ? captionColor : null,
      captionBg: hasCaptions && bandFlat > 0.72 ? 'box' : 'none',
      captionCoverage: hasCaptions ? Math.round(coverage * 100) / 100 : 0,
      avgCaptionDur: hasCaptions && avgCaptionDur ? Math.round(avgCaptionDur * 10) / 10 : null,
      captionsPerMinute: hasCaptions && runs && dur ? Math.round((runs / dur) * 60) : 0,
      palette,
      flashesPerMinute: dur ? Math.round((flashes / dur) * 60) : 0,
      motionEnergy: Math.round(motion * 10) / 10,   // yüksek = sarsıntılı/hareketli kurgu
    };
  } catch (e) {
    return { error: String(e.message || e) };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
