// "Yönetmen": hedef videoyu sahne sahne inceler, öğrenilen kurgu gramerine göre
// her sahneye ne yapılacağına karar verir (animasyon mı, motion grafik mi, yazı mı)
// ve gerekçesiyle birlikte katmanları üretir.
import { captionLayer, motionLayer } from './style.js';
import { newId } from './store.js';

const round = (n) => Math.round(Math.max(0, n) * 100) / 100;

// Sahnenin karakterine göre rol: açılış / aksiyon / ürün-detay / anlatım / kapanış
function sceneRole(s, i, total) {
  if (i === 0) return 'açılış';
  if (i === total - 1) return 'kapanış';
  if (s.motion > 25) return 'aksiyon';
  if (s.saturation > 0.35 && s.motion < 14) return 'ürün/detay';
  if (s.motion < 6) return 'durgun';
  return 'anlatım';
}

export function directTimeline({ target, scenes, grammar, plan, sfx = [], captionTexts = [] }) {
  const dur = target.meta.duration || 10;
  const layers = [];
  const decisions = [];

  const allowed = plan?.effects?.allow ?? null;          // talimat efektleri kısıtlıyorsa
  const denied = new Set(plan?.effects?.deny || []);
  const canUse = (p) => (allowed ? allowed.includes(p) : true) && !denied.has(p);
  const intensity = plan?.effects?.intensity ?? 1;
  const capStyleBase = {
    ...(grammar?.caption
      ? { y: grammar.caption.y, fontSize: grammar.caption.fontSize, color: grammar.caption.color, bg: grammar.caption.bg }
      : {}),
    ...(plan?.captionStyle || {}),
  };
  const gfxColor = plan?.captionStyle?.color || grammar?.caption?.color || '#ffffff';

  // Yazı hangi sahnelere düşecek: öğrenilen "sahnelerin %X'inde yazı var" oranına göre.
  const wantCaptions = plan?.captionMode !== 'none';
  const textRatio = plan?.captionMode === 'many' ? 1
    : plan?.captionMode === 'few' ? 0.35
    : (grammar?.textSceneRatio ?? 0.6);
  const capDur = grammar?.caption?.avgDuration || 2.2;

  const textScenes = [];
  if (wantCaptions) {
    const wanted = captionTexts.length || Math.max(1, Math.round(scenes.length * textRatio));
    // Yazıyı en "sakin" sahnelere koy: hareketli sahnede yazı okunmaz.
    const ordered = [...scenes].sort((a, b) => a.motion - b.motion).slice(0, wanted);
    textScenes.push(...ordered.sort((a, b) => a.start - b.start));
  }
  // Verilen metin sahneden fazlaysa hiçbiri düşmesin: sahneler metinler arasında bölünür.
  const perScene = new Map();
  if (wantCaptions && captionTexts.length > textScenes.length && textScenes.length) {
    captionTexts.forEach((text, i) => {
      const sc = textScenes[i % textScenes.length];
      if (!perScene.has(sc.index)) perScene.set(sc.index, []);
      perScene.get(sc.index).push(text);
    });
  }

  scenes.forEach((s, i) => {
    const role = sceneRole(s, i, scenes.length);
    const acts = [];

    // 1) Kesim vurgusu: referanslarda kesimlerde flaş varsa ilk sahne hariç uygula.
    if (i > 0 && canUse('flash') && (grammar?.flashOnCutRatio ?? 0) >= 0.15) {
      layers.push(motionLayer('flash', s.start, Math.min(dur, s.start + 0.18), { intensity, color: '#ffffff' }));
      acts.push('kesimde flaş');
    } else if (i > 0 && canUse('wipe') && (grammar?.highMotionRatio ?? 0) >= 0.35) {
      layers.push(motionLayer('wipe', s.start, Math.min(dur, s.start + 0.35), { intensity, color: gfxColor }));
      acts.push('silme geçişi');
    }

    // 2) Sahnenin kendi hareketine göre animasyon.
    if (s.motion < 6 && canUse('zoom')) {
      // Durgun sahne → yavaş zoom vuruşu (dikkat düşmesin)
      layers.push(motionLayer('zoom', s.start, Math.min(dur, s.start + Math.min(1.4, s.duration)), { intensity: intensity * 0.9, color: gfxColor }));
      acts.push('durgun sahne → zoom');
    } else if (s.motion > 30 && canUse('shake') && (grammar?.highMotionRatio ?? 0) >= 0.3) {
      layers.push(motionLayer('shake', s.start, Math.min(dur, s.start + Math.min(0.6, s.duration)), { intensity, color: gfxColor }));
      acts.push('hareketli sahne → sarsıntı');
    }

    // 3) Motion grafik: ürün/detay sahnesinde vurgu dairesi, kapanışta alt bilgi şeridi.
    if (role === 'ürün/detay' && canUse('circle')) {
      layers.push(motionLayer('circle', s.start + 0.15, Math.min(dur, s.start + Math.min(1.2, s.duration)), { intensity, color: gfxColor }));
      acts.push('ürün detayına vurgu dairesi');
    }
    if (role === 'kapanış' && canUse('lowerthird') && s.duration > 1.2) {
      layers.push(motionLayer('lowerthird', s.start + 0.1, Math.min(dur, s.end - 0.05), {
        intensity, color: gfxColor, text: plan?.ctaText || '', y: 72,
      }));
      acts.push('kapanışta alt bilgi şeridi');
    }

    // 4) Yazı: sakin sahnelere, öğrenilen stille ve öğrenilen süreyle.
    const textIdx = textScenes.findIndex((x) => x.index === s.index);
    if (textIdx >= 0) {
      const texts = perScene.get(s.index) || [captionTexts[textIdx] || `(metin girin ${textIdx + 1})`];
      const slot = (s.duration - 0.25) / texts.length;
      texts.forEach((raw, k) => {
        const start = s.start + 0.12 + k * slot;
        const end = Math.min(s.end - 0.05, start + Math.max(0.8, Math.min(capDur, slot - 0.1)));
        if (end <= start + 0.4) return;
        const text = plan?.captionStyle?.uppercase ? raw.toLocaleUpperCase('tr-TR') : raw;
        layers.push(captionLayer(text, start, end, { style: capStyleBase }));
      });
      acts.push(texts.length > 1 ? `${texts.length} altyazı` : 'altyazı');
    }

    decisions.push({
      scene: i + 1,
      start: s.start,
      end: s.end,
      role,
      motion: s.motion,
      actions: acts.length ? acts : ['dokunulmadı'],
    });
  });

  // 5) SFX'leri vuruş noktalarına dağıt.
  if (plan?.useSfx !== false && sfx.length) {
    const accents = layers.filter((l) => l.type === 'motion').sort((a, b) => a.start - b.start);
    sfx.forEach((s, i) => {
      const at = accents[i % Math.max(1, accents.length)]?.start ?? (i * dur) / (sfx.length + 1);
      layers.push({
        id: newId('sfx_'), type: 'sfx', name: s.originalName || 'SFX', visible: true,
        file: s.fileName, url: s.url, start: round(at), gain: 1,
      });
    });
  }

  layers.sort((a, b) => a.start - b.start);

  return {
    timeline: {
      output: {
        width: target.meta.width,
        height: target.meta.height,
        fps: Math.min(60, Math.max(24, Math.round(target.meta.fps || 30))),
        duration: round(dur),
        orientation: target.meta.orientation,   // dikey giren dikey çıkar
        sourceAudioGain: plan?.sourceAudioGain ?? 1,
      },
      layers,
    },
    decisions,
  };
}
