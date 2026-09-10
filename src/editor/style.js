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
  return {
    shotLength: Math.round(shotLength * 100) / 100,
    pace,
    // Fast reference edits get denser captions and more motion accents.
    captionRatio: pace === 'hızlı' ? 0.85 : pace === 'orta' ? 0.6 : 0.4,
    accentRatio: pace === 'hızlı' ? 0.7 : pace === 'orta' ? 0.45 : 0.25,
    portraitBias: portrait > clips.length / 2,
    sampleCount: clips.length,
    totalReferenceDuration: Math.round(total * 10) / 10,
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

// Splits the brief / description into caption-sized chunks.
export function chunkText(text, count) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const parts = clean.split(/(?<=[.!?…])\s+|\s*\|\s*|\n+/).filter(Boolean);
  const words = clean.split(' ');
  let chunks = parts.length >= count ? parts : [];
  if (!chunks.length) {
    const per = Math.max(2, Math.ceil(words.length / Math.max(1, count)));
    chunks = [];
    for (let i = 0; i < words.length; i += per) chunks.push(words.slice(i, i + per).join(' '));
  }
  return chunks.slice(0, count).map((s) => s.trim());
}

// Builds the initial layer stack for the target video from the style profile.
export function buildTimeline({ target, style, brief = '', sfx = [] }) {
  const dur = target.meta.duration || 10;
  // Kısa videoda referans temposu kadar uzun plan bırakmayalım: en az 4 vuruş çıksın.
  const shot = Math.max(0.6, Math.min(style.shotLength, Math.max(1.2, dur / 4)));
  const beats = [];
  for (let t = 0; t < dur - 0.25; t += shot) beats.push(Math.round(t * 100) / 100);

  const captionCount = Math.max(1, Math.round(beats.length * style.captionRatio));
  const texts = chunkText(brief, captionCount);
  const layers = [];

  beats.forEach((t, i) => {
    const end = Math.min(dur, t + shot);
    if (i < captionCount) {
      const text = texts[i] || `Sahne ${i + 1}`;
      layers.push(captionLayer(text, t + 0.1, Math.max(t + 0.8, end - 0.1), {
        style: { ...DEFAULT_CAPTION_STYLE, anim: i % 3 === 0 ? 'pop' : i % 3 === 1 ? 'slide' : 'fade' },
      }));
    }
    // Motion accents land on the beat, following the reference pacing.
    if (i > 0 && i / beats.length <= Math.max(style.accentRatio, 0.5)) {
      const preset = i % 4 === 1 ? 'flash' : i % 4 === 2 ? 'zoom' : i % 4 === 3 ? 'shake' : 'wipe';
      const len = preset === 'flash' ? 0.18 : preset === 'wipe' ? 0.4 : 0.6;
      layers.push(motionLayer(preset, t, Math.min(dur, t + len)));
    }
  });

  // Optional SFX: one hit per accent, in the order the user uploaded them.
  const accents = layers.filter((l) => l.type === 'motion');
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

  return {
    output: {
      width: target.meta.width,
      height: target.meta.height,
      fps: Math.min(60, Math.max(24, Math.round(target.meta.fps || 30))),
      duration: Math.round(dur * 100) / 100,
      orientation: target.meta.orientation, // dikey video → dikey çıktı
    },
    layers,
  };
}
