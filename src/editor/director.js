// "Yönetmen": hedef videoyu sahne sahne inceler, öğrenilen kurgu gramerine göre
// her sahneye ne yapılacağına karar verir (animasyon mı, motion grafik mi, yazı mı)
// ve gerekçesiyle birlikte katmanları üretir.
import { captionLayer, motionLayer } from './style.js';
import { newId } from './store.js';
import { techniqueLabel } from './techniques.js';

// Sahne karakterine göre uygulanabilir teknikler: hangi durumda ne işe yarar.
// `needs` sahnenin sağlaması gereken koşul, `preset` ise editördeki karşılığı.
const TECHNIQUE_RULES = [
  {
    key: 'zoomIn', preset: 'zoom',
    label: 'Push-in zoom (yavaş yakınlaşma)',
    fits: (s, role) => (s.motion < 8 ? 0.9 : s.motion < 16 ? 0.6 : 0.2),
    why: (s) => (s.motion < 16
      ? `sahne durgun (hareket ${s.motion}) — yakınlaşma dikkati tutar`
      : `sahne zaten hareketli (hareket ${s.motion}) — ek zoom karmaşa yaratır`),
  },
  {
    key: 'shake', preset: 'shake',
    label: 'Sarsıntı vuruşu',
    fits: (s) => (s.motion > 28 ? 0.8 : s.motion > 18 ? 0.5 : 0.15),
    why: (s) => (s.motion > 18
      ? `sahne hareketli (hareket ${s.motion}) — vuruş enerjiyi büyütür`
      : `sahne sakin (hareket ${s.motion}) — sarsıntı burada zorlama durur`),
  },
  {
    key: 'flash', preset: 'flash',
    label: 'Beyaz flaş kesme vurgusu',
    fits: (s, role, i) => (i > 0 ? 0.75 : 0.2),
    why: () => 'sahne başı kesim — flaş geçişi sert bağlar',
  },
  {
    key: 'colorWipe', preset: 'wipe',
    label: 'Renkli silme geçişi',
    fits: (s, role, i) => (i > 0 ? 0.6 : 0.1),
    why: () => 'sahne geçişi — renkli silme markanın rengini taşır',
  },
  {
    key: 'circle', preset: 'circle',
    label: 'Vurgu dairesi (ürün/detay)',
    fits: (s, role) => (role === 'ürün/detay' ? 0.85 : s.saturation > 0.3 && s.motion < 16 ? 0.55 : 0.15),
    why: (s, role) => (role === 'ürün/detay' || (s.saturation > 0.3 && s.motion < 16)
      ? `renk doygunluğu ${s.saturation}, az hareket — ürün detayına vurgu`
      : 'bu sahne ürün detayı değil — vurgu dairesi gereksiz'),
  },
  {
    key: 'lowerthird', preset: 'lowerthird',
    label: 'Alt bilgi şeridi (CTA / isim)',
    fits: (s, role) => (role === 'kapanış' ? 0.85 : s.duration > 2.5 ? 0.5 : 0.15),
    why: (s, role) => (role === 'kapanış' ? 'kapanış sahnesi — CTA şeridi' : `sahne ${s.duration}s, şerit için yeterli süre`),
  },
  {
    key: 'bar', preset: 'bar',
    label: 'Alt bant (yazı zemini)',
    fits: (s, role, i, ctx) => (ctx.captionBox ? 0.7 : 0.25),
    why: (s, role, i, ctx) => (ctx?.captionBox
      ? 'örneklerde yazılar kutulu/bantlı kullanılmış'
      : 'örneklerde bant yok ama yazı okunurluğu için eklenebilir'),
  },
  {
    key: 'textPop', preset: null, caption: 'pop',
    label: 'Altyazı: pop (büyüyerek giriş)',
    fits: (s) => (s.motion < 20 ? 0.8 : 0.4),
    why: () => 'okunaklı sahne — vurucu giriş',
  },
  {
    key: 'textSlide', preset: null, caption: 'slide',
    label: 'Altyazı: aşağıdan kayarak giriş',
    fits: (s) => (s.motion < 20 ? 0.7 : 0.35),
    why: () => 'yumuşak giriş, alt bantla uyumlu',
  },
  {
    key: 'textType', preset: null, caption: 'type',
    label: 'Altyazı: daktilo (harf harf)',
    fits: (s) => (s.duration > 1.6 ? 0.6 : 0.2),
    why: (s) => `sahne ${s.duration}s — harf harf yazmaya vakit var`,
  },
];

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

// Sahne için uygulanabilir tekniklerin listesi: referanslarda görülmüş olanlar öne çıkar.
function sceneProposals(scene, role, index, ctx) {
  const seen = new Map((ctx.catalog || []).map((t) => [t.type, t]));
  return TECHNIQUE_RULES.map((rule) => {
    const base = rule.fits(scene, role, index, ctx);
    const inRefs = seen.get(rule.key);
    // Referanslarda kullanılan teknik ağırlık kazanır, kullanılmayan biraz geriler.
    const fit = Math.max(0, Math.min(1, base * (inRefs ? 1.15 : 0.8)));
    return {
      technique: rule.key,
      label: rule.label,
      preset: rule.preset,
      captionAnim: rule.caption || null,
      fit: Math.round(fit * 100) / 100,
      inReferences: Boolean(inRefs),
      referenceUse: inRefs ? `${inRefs.label} — örneklerde ${inRefs.count} kez` : 'örneklerde görülmedi',
      why: rule.why(scene, role, index, ctx),
    };
  }).sort((a, b) => b.fit - a.fit);
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

  const ctx = {
    catalog: grammar?.techniques || [],
    captionBox: grammar?.caption?.bg === 'box',
  };

  scenes.forEach((s, i) => {
    const role = sceneRole(s, i, scenes.length);
    const proposals = sceneProposals(s, role, i, ctx);
    const acts = [];
    let motionsUsed = 0;

    for (const p of proposals) {
      // Yazı animasyonu önerileri altyazı katmanında değerlendirilir.
      if (!p.preset) continue;
      if (p.fit < 0.6 || motionsUsed >= 2) { p.applied = false; continue; }
      if (!canUse(p.preset)) { p.applied = false; p.skipped = 'talimatta istenmedi'; continue; }

      const len = p.preset === 'flash' ? 0.18
        : p.preset === 'wipe' ? 0.35
        : p.preset === 'lowerthird' ? Math.min(2.4, s.duration - 0.2)
        : p.preset === 'bar' ? Math.min(2, s.duration - 0.2)
        : Math.min(1.4, s.duration);
      if (len < 0.15) { p.applied = false; continue; }

      const startAt = p.preset === 'flash' || p.preset === 'wipe' ? s.start : s.start + 0.12;
      const color = p.preset === 'flash' ? '#ffffff' : gfxColor;
      layers.push(motionLayer(p.preset, startAt, Math.min(dur, startAt + len), {
        intensity, color, text: p.preset === 'lowerthird' ? (plan?.ctaText || '') : '',
        y: p.preset === 'lowerthird' ? 72 : undefined,
      }));
      p.applied = true;
      motionsUsed++;
      acts.push(p.label);
    }

    // Altyazı: sakin sahnelere, öğrenilen stille; giriş animasyonu da öneriden gelir.
    const textIdx = textScenes.findIndex((x) => x.index === s.index);
    if (textIdx >= 0) {
      const animPick = proposals.find((p) => p.captionAnim && p.fit >= 0.5);
      const anim = plan?.captionStyle?.anim || animPick?.captionAnim || capStyleBase.anim || 'pop';
      if (animPick) { animPick.applied = true; acts.push(animPick.label); }
      const texts = perScene.get(s.index) || [captionTexts[textIdx] || `(metin girin ${textIdx + 1})`];
      const slot = (s.duration - 0.25) / texts.length;
      texts.forEach((raw, k) => {
        const startAt = s.start + 0.12 + k * slot;
        const endAt = Math.min(s.end - 0.05, startAt + Math.max(0.8, Math.min(capDur, slot - 0.1)));
        if (endAt <= startAt + 0.4) return;
        const text = plan?.captionStyle?.uppercase ? raw.toLocaleUpperCase('tr-TR') : raw;
        layers.push(captionLayer(text, startAt, endAt, { style: { ...capStyleBase, anim } }));
      });
      acts.push(texts.length > 1 ? `${texts.length} altyazı` : 'altyazı');
    }

    decisions.push({
      scene: i + 1,
      start: s.start,
      end: s.end,
      duration: s.duration,
      role,
      motion: s.motion,
      saturation: s.saturation,
      actions: acts.length ? acts : ['dokunulmadı'],
      // Uygulanmayanlar da kalsın: "bu sahnede başka ne yapılabilir" listesi.
      proposals: proposals.map((p) => ({
        technique: p.technique, label: p.label, fit: p.fit,
        inReferences: p.inReferences, referenceUse: p.referenceUse,
        why: p.why, applied: Boolean(p.applied), skipped: p.skipped || null,
      })),
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
