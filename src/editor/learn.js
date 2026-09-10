// Örnek videoları SAHNE SAHNE inceleyip bir "kurgu grameri" çıkarır:
// hangi sahnede yazı var, kesimlerde flaş atılıyor mu, hareketli sahnelerde
// sarsıntı mı sakin sahnelerde zoom mu kullanılmış, sahne uzunlukları ne.
import { analyzeScenes, analyzeReferenceVideo } from './vision.js';
import { mediaDir } from './store.js';
import path from 'node:path';

export async function learnFromReferences(project, { onLog } = {}) {
  const perVideo = [];

  for (const ref of project.references) {
    if (ref.kind !== 'video') continue;
    const file = path.join(mediaDir(project.id), ref.fileName);
    onLog?.(`İnceleniyor: ${ref.originalName}`);

    const vision = ref.vision && !ref.vision.error ? ref.vision : await analyzeReferenceVideo(file, ref.meta);
    ref.vision = vision;
    const scenes = await analyzeScenes(file, { duration: ref.meta.duration, cuts: ref.cuts || [] });

    // Her sahneye rol ve gözlem etiketi ver.
    const marked = scenes.map((s, i) => {
      const role = i === 0 ? 'açılış'
        : i === scenes.length - 1 ? 'kapanış'
        : s.motion > 25 ? 'aksiyon'
        : s.saturation > 0.35 ? 'ürün/detay'
        : 'anlatım';
      return {
        ...s,
        role,
        hasText: s.textRatio > 0.3,
        cutFlash: s.lumaJump > 40,       // sahne içinde sert parlaklık sıçraması = flaş
        highMotion: s.motion > 25,
        still: s.motion < 6,
      };
    });

    onLog?.(`  ${ref.originalName}: ${marked.length} sahne — ` +
      `${marked.filter((s) => s.hasText).length} sahnede yazı, ` +
      `${marked.filter((s) => s.cutFlash).length} flaş, ` +
      `${marked.filter((s) => s.highMotion).length} hareketli sahne`);

    perVideo.push({
      name: ref.originalName,
      file: ref.fileName,
      duration: ref.meta.duration,
      scenes: marked,
      vision,
    });
  }

  const all = perVideo.flatMap((v) => v.scenes);
  if (!all.length) return { perVideo, grammar: null };

  const ratio = (fn) => Math.round((all.filter(fn).length / all.length) * 100) / 100;
  const avg = (fn) => Math.round((all.reduce((a, s) => a + fn(s), 0) / all.length) * 10) / 10;

  const grammar = {
    scenesStudied: all.length,
    videosStudied: perVideo.length,
    avgSceneDuration: avg((s) => s.duration),
    textSceneRatio: ratio((s) => s.hasText),       // sahnelerin kaçında yazı var
    flashOnCutRatio: ratio((s) => s.cutFlash),     // kesimlerde flaş kullanımı
    highMotionRatio: ratio((s) => s.highMotion),   // sarsıntı/hızlı kamera eğilimi
    stillRatio: ratio((s) => s.still),             // durgun sahne oranı (zoom fırsatı)
    avgMotion: avg((s) => s.motion),
    // Öğrenilen yazı stili tüm referansların ortalaması (vision.js ölçtü).
    caption: mergeCaptionStyle(perVideo.map((v) => v.vision).filter(Boolean)),
  };

  onLog?.(`Öğrenildi: ${grammar.scenesStudied} sahne / ${grammar.videosStudied} video — ` +
    `sahnelerin %${Math.round(grammar.textSceneRatio * 100)}'inde yazı, ` +
    `%${Math.round(grammar.flashOnCutRatio * 100)} flaş, ` +
    `%${Math.round(grammar.highMotionRatio * 100)} hareketli, ` +
    `ortalama sahne ${grammar.avgSceneDuration}s`);

  return { perVideo, grammar };
}

function mergeCaptionStyle(visions) {
  const withCaps = visions.filter((v) => v?.hasCaptions);
  if (!withCaps.length) return null;
  const avg = (pick) => withCaps.reduce((a, v) => a + pick(v), 0) / withCaps.length;
  const vote = (pick) => {
    const m = new Map();
    for (const v of withCaps) { const k = pick(v); if (k) m.set(k, (m.get(k) || 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  };
  return {
    y: Math.round(avg((v) => v.captionY || 78)),
    fontSize: Math.round(avg((v) => v.captionFontSize || 6.4) * 10) / 10,
    color: vote((v) => v.captionColor) || '#ffffff',
    bg: vote((v) => v.captionBg) === 'box' ? 'box' : 'none',
    avgDuration: Math.round(avg((v) => v.avgCaptionDur || 2) * 10) / 10,
    perMinute: Math.round(avg((v) => v.captionsPerMinute || 0)),
  };
}
