// Learns an edit "style" from the reference videos and turns it into a starting
// timeline for the target video. Pure heuristics — no API key required.
import { newId } from './store.js';

export function buildStyleProfile(references) {
  const clips = references.filter((r) => r.meta?.duration);
  if (!clips.length) {
    return { shotLength: 2.2, pace: 'orta', captionRatio: 0.55, accentRatio: 0.4, portraitBias: false, sampleCount: 0 };
  }
  let cuts = 0;
  let total = 0;
  let portrait = 0;
  for (const c of clips) {
    cuts += (c.cuts?.length || 0) + 1;
    total += c.meta.duration;
    if (c.meta.orientation === 'portrait') portrait++;
  }
  const shotLength = Math.max(0.6, Math.min(6, total / Math.max(1, cuts)));
  const pace = shotLength < 1.4 ? 'hızlı' : shotLength < 2.8 ? 'orta' : 'sakin';

  const profile = {
    shotLength: Math.round(shotLength * 100) / 100,
    pace,
    // Fast reference edits get denser captions and more motion accents.
    captionRatio: pace === 'hızlı' ? 0.85 : pace === 'orta' ? 0.6 : 0.4,
    accentRatio: pace === 'hızlı' ? 0.7 : pace === 'orta' ? 0.45 : 0.25,
    portraitBias: portrait > clips.length / 2,
    sampleCount: clips.length,
    totalReferenceDuration: Math.round(total * 10) / 10,
  };

  return { ...profile, ...mergeVision(clips) };
}

// Referansların GÖRÜNTÜ analizlerini (vision.js) tek bir öğrenilmiş stile indirger.
function mergeVision(clips) {
  const vs = clips.map((c) => c.vision).filter((v) => v && !v.error);
  if (!vs.length) return { vision: null };

  const avg = (pick) => {
    const xs = vs.map(pick).filter((x) => typeof x === 'number' && !Number.isNaN(x));
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  const withCaptions = vs.filter((v) => v.hasCaptions);
  const vote = (pick) => {
    const counts = new Map();
    for (const v of vs) {
      const k = pick(v);
      if (k) counts.set(k, (counts.get(k) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  };

  const captionsPerMinute = avg((v) => v.captionsPerMinute) || 0;
  const flashesPerMinute = avg((v) => v.flashesPerMinute) || 0;
  const motionEnergy = avg((v) => v.motionEnergy) || 0;
  const avgCaptionDur = avg((v) => v.avgCaptionDur);
  const coverage = avg((v) => v.captionCoverage) || 0;

  // Öğrenilen efekt karışımı: referansta ne kadar flaş/hareket varsa o kadar kullan.
  const presets = ['zoom'];
  if (flashesPerMinute >= 3) presets.push('flash');
  if (motionEnergy >= 6) presets.push('shake');
  if (motionEnergy >= 3.5) presets.push('wipe');
  if (withCaptions.some((v) => v.captionBg === 'box')) presets.push('bar');

  const palette = [...new Set(vs.flatMap((v) => v.palette || []))].slice(0, 5);

  return {
    vision: {
      analyzed: vs.length,
      captionsPerMinute: Math.round(captionsPerMinute),
      avgCaptionDur: avgCaptionDur ? Math.round(avgCaptionDur * 10) / 10 : null,
      captionCoverage: Math.round(coverage * 100) / 100,
      flashesPerMinute: Math.round(flashesPerMinute),
      motionEnergy: Math.round(motionEnergy * 10) / 10,
      palette,
      captionsSeen: withCaptions.length,
    },
    learnedCaption: withCaptions.length
      ? {
          y: Math.round(avg((v) => v.captionY) || 78),
          fontSize: Math.round((avg((v) => v.captionFontSize) || 6.4) * 10) / 10,
          color: vote((v) => v.captionColor) || '#ffffff',
          bg: vote((v) => v.captionBg) === 'box' ? 'box' : 'none',
        }
      : null,
    learnedPresets: presets,
    // Görüntüden ölçülen altyazı sıklığı, kesim temposunun önüne geçer.
    captionRatioFromVision: captionsPerMinute ? Math.min(1, captionsPerMinute / 30) : null,
    accentRatioFromVision: flashesPerMinute || motionEnergy
      ? Math.min(1, (flashesPerMinute / 20) + (motionEnergy / 20))
      : null,
  };
}

const DEFAULT_CAPTION_STYLE = {
  fontSize: 6.4,        // yüzde — çıktı yüksekliğine göre
  color: '#ffffff',
  outline: '#000000',
  outlineWidth: 3,
  bg: 'none',           // 'none' | 'box'
  bgColor: '#000000',
  bold: true,
  x: 50,                // yüzde
  y: 78,
  anim: 'pop',          // pop | fade | slide | type
};

export function captionLayer(text, start, end, extra = {}) {
  return {
    id: newId('cap_'),
    type: 'caption',
    name: text.slice(0, 24) || 'Altyazı',
    visible: true,
    start: round(start),
    end: round(end),
    text,
    style: { ...DEFAULT_CAPTION_STYLE, ...(extra.style || {}) },
    ...extra,
  };
}

export function motionLayer(preset, start, end, params = {}) {
  return {
    id: newId('mot_'),
    type: 'motion',
    name: MOTION_LABELS[preset] || preset,
    visible: true,
    preset,
    start: round(start),
    end: round(end),
    params: { color: '#ffffff', intensity: 1, text: '', ...params },
  };
}

export const MOTION_LABELS = {
  zoom: 'Zoom vuruşu',
  shake: 'Sarsıntı',
  flash: 'Flaş geçiş',
  bar: 'Alt bant',
  wipe: 'Silme geçişi',
  lowerthird: 'Alt bilgi şeridi',
  circle: 'Vurgu dairesi',
};

function round(n) { return Math.round(Math.max(0, n) * 100) / 100; }

// Builds the initial layer stack for the target video from the style profile
// and the plan parsed out of the user's AI instruction.
export function buildTimeline({ target, style, sfx = [], plan = null }) {
  const dur = target.meta.duration || 10;
  // Kısa videoda referans temposu kadar uzun plan bırakmayalım: en az 4 vuruş çıksın.
  const shot = Math.max(0.6, Math.min(style.shotLength, Math.max(1.2, dur / 4)));
  const beats = [];
  for (let t = 0; t < dur - 0.25; t += shot) beats.push(Math.round(t * 100) / 100);

  // Görüntüden ölçülen altyazı sıklığı varsa onu kullan (talimat hâlâ üstüne yazar).
  const ratio = style.captionRatioFromVision != null && !plan?.pace && plan?.captionMode === 'auto'
    ? style.captionRatioFromVision
    : style.captionRatio;
  const captionCount = Math.max(0, Math.round(beats.length * ratio));
  // Talimat metni altyazıya çevrilmez; metin yalnızca kullanıcı açıkça verdiyse gelir,
  // yoksa editörde doldurulacak yer tutucular oluşur.
  const explicit = plan?.captionTexts?.length ? plan.captionTexts : null;
  // Metin verilmediyse çizelgeyi doldurmak yerine birkaç yer tutucu bırak.
  const placeholderCount = Math.min(captionCount, 4);
  const texts = explicit || Array.from({ length: placeholderCount }, (_, i) => `(metin girin ${i + 1})`);
  const total = explicit ? explicit.length : placeholderCount;
  // Öncelik: talimat > referanslardan öğrenilen stil > varsayılan.
  const capStyle = { ...DEFAULT_CAPTION_STYLE, ...(style.learnedCaption || {}), ...(plan?.captionStyle || {}) };
  const presets = plan?.effects?.allow?.length ? plan.effects.allow
    : plan?.effects?.allow ? []
    : (style.learnedPresets?.length ? style.learnedPresets : ['flash', 'zoom', 'shake', 'wipe']);
  const intensity = plan?.effects?.intensity ?? 1;
  const layers = [];

  // Talimatta metin varsa satır sayısı kadar eşit dilime böl.
  const slots = explicit
    ? explicit.map((_, i) => (i * dur) / explicit.length)
    : beats;
  const learnedDur = style.vision?.avgCaptionDur || null;

  slots.forEach((t, i) => {
    const slotLen = explicit ? dur / explicit.length : shot;
    const end = Math.min(dur, t + slotLen);
    if (i < total) {
      let text = texts[i] || `Sahne ${i + 1}`;
      if (plan?.captionStyle?.uppercase) text = text.toLocaleUpperCase('tr-TR');
      const anim = capStyle.anim || (i % 3 === 0 ? 'pop' : i % 3 === 1 ? 'slide' : 'fade');
      layers.push(captionLayer(text, t + 0.1, Math.max(t + 0.8, end - 0.1), {
        style: { ...capStyle, anim: plan?.captionStyle?.anim || anim },
      }));
    }
  });

  // Hareket vuruşları her zaman kesim ritmine oturur (altyazı sayısından bağımsız).
  if (presets.length) {
    beats.forEach((t, i) => {
      if (i === 0) return;
      const accent = style.accentRatioFromVision != null && !plan?.effects?.allow
        ? Math.max(style.accentRatioFromVision, 0.35)
        : Math.max(style.accentRatio, 0.5);
      if (i / beats.length > accent) return;
      const preset = presets[(i - 1) % presets.length];
      const len = preset === 'flash' ? 0.18 : preset === 'wipe' ? 0.4 : preset === 'lowerthird' ? 2.4 : 0.6;
      // Grafik rengi referansların paletinden gelir; flaş beyaz kalır.
      const color = preset === 'flash' ? '#ffffff'
        : (plan?.captionStyle?.color || style.vision?.palette?.[0] || '#ffffff');
      layers.push(motionLayer(preset, t, Math.min(dur, t + len), { intensity, color }));
    });
  }

  // İsteğe bağlı SFX: vuruş noktalarına, yükleme sırasına göre.
  const accents = layers.filter((l) => l.type === 'motion');
  if (plan?.useSfx !== false) {
    sfx.forEach((s, i) => {
      const at = accents[i]?.start ?? Math.min(dur - 0.1, i * shot);
      layers.push({
        id: newId('sfx_'),
        type: 'sfx',
        name: s.originalName || 'SFX',
        visible: true,
        file: s.fileName,
        url: s.url,
        start: round(at),
        gain: 1,
      });
    });
  }

  layers.sort((a, b) => a.start - b.start);

  return {
    output: {
      width: target.meta.width,
      height: target.meta.height,
      fps: Math.min(60, Math.max(24, Math.round(target.meta.fps || 30))),
      duration: Math.round(dur * 100) / 100,
      orientation: target.meta.orientation, // dikey video → dikey çıktı
      sourceAudioGain: plan?.sourceAudioGain ?? 1,
    },
    layers,
  };
}
