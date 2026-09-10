// Kullanıcının yapay zekâ alanına yazdığı serbest talimatı, kurgu planına çevirir.
// API anahtarı gerekmez; anahtar varsa llm.js bu planın üstüne yazabilir.

const COLORS = {
  kırmızı: '#ff3b30', kirmizi: '#ff3b30', red: '#ff3b30',
  mavi: '#0a84ff', blue: '#0a84ff',
  yeşil: '#34c759', yesil: '#34c759', green: '#34c759',
  sarı: '#ffd60a', sari: '#ffd60a', yellow: '#ffd60a',
  beyaz: '#ffffff', white: '#ffffff',
  siyah: '#000000', black: '#000000',
  pembe: '#ff2d95', pink: '#ff2d95',
  turuncu: '#ff9f0a', orange: '#ff9f0a',
  mor: '#bf5af2', purple: '#bf5af2',
};

const has = (t, re) => re.test(t);

const NEGATION = /(istemiyorum|istemem|olmasın|olmasin|\byok\b|koyma|ekleme|kullanma|kullanmayalım|kullanmayalim|gerek yok|hayır|hayir)/i;

const EFFECT_WORDS = [
  [/zoom|yakınlaş|yakinlas/i, 'zoom'],
  [/sars|shake|titre/i, 'shake'],
  [/flaş|flas|flash|parla/i, 'flash'],
  [/wipe|silme geçiş|silme gecis/i, 'wipe'],
  [/alt bant|\bbant\b/i, 'bar'],
  [/alt bilgi|lower ?third/i, 'lowerthird'],
  [/daire|circle|çember|cember/i, 'circle'],
];

function findColor(text) {
  for (const [word, hex] of Object.entries(COLORS)) {
    if (new RegExp(`(?<!\\p{L})${word}(?!\\p{L})`, 'iu').test(text)) return hex;
  }
  return text.match(/#[0-9a-f]{3,6}\b/i)?.[0] || null;
}

// Talimatın içinde tırnaklı ya da "-" ile başlayan satırlar birebir altyazı olur.
function explicitLines(text) {
  const lines = [];
  for (const m of text.matchAll(/["“”]([^"“”]{1,120})["“”]/g)) lines.push(m[1].trim());
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(?:[-•*]|\d+[.)])\s+(.{1,120})$/);
    if (m) lines.push(m[1].trim());
  }
  return [...new Set(lines)].filter(Boolean);
}

export function parseDirective(text = '') {
  const t = String(text);
  const plan = {
    raw: t,
    pace: null,                 // hızlı | orta | sakin
    captionMode: 'auto',        // auto | none | few | many
    captionTexts: explicitLines(t),
    captionStyle: {},
    effects: { allow: null, deny: [], intensity: 1 },
    useSfx: true,
    notes: [],
  };
  if (!t.trim()) return plan;

  // Tempo
  if (has(t, /(hızlı|hizli|tempolu|enerjik|fast|hareketli)/i)) plan.pace = 'hızlı';
  else if (has(t, /(yavaş|yavas|sakin|dingin|slow|ağır|agir)/i)) plan.pace = 'sakin';
  else if (has(t, /(orta tempo|normal tempo)/i)) plan.pace = 'orta';

  // Altyazı yoğunluğu
  if (t.split(/[.;,\n]+/).some((c) => /(altyazı|altyazi|yazı|yazi|caption|metin)/i.test(c) && NEGATION.test(c) && !/["“”\-•*]/.test(c))) plan.captionMode = 'none';
  else if (has(t, /(az|minimum|sade|birkaç|birkac)\s*(altyazı|altyazi|yazı|yazi|metin|caption)/i)) plan.captionMode = 'few';
  else if (has(t, /(bol|çok|cok|yoğun|yogun|her sahnede)\s*(altyazı|altyazi|yazı|yazi|metin|caption)/i)) plan.captionMode = 'many';

  // Altyazı stili
  const color = findColor(t);
  if (color) plan.captionStyle.color = color;
  if (has(t, /(büyük harf|buyuk harf|caps|uppercase)/i)) plan.captionStyle.uppercase = true;
  if (has(t, /(kutu|arka plan|background|box)/i)) plan.captionStyle.bg = 'box';
  if (has(t, /(üstte|uste|yukarıda|yukarida|top)/i)) plan.captionStyle.y = 18;
  if (has(t, /(ortada|merkezde|center)/i)) plan.captionStyle.y = 50;
  if (has(t, /(altta|aşağıda|asagida|bottom)/i)) plan.captionStyle.y = 82;
  if (has(t, /(daktilo|typewriter|harf harf)/i)) plan.captionStyle.anim = 'type';
  else if (has(t, /(kayarak|slide)/i)) plan.captionStyle.anim = 'slide';
  else if (has(t, /(yumuşak|yumusak|fade|belirsin)/i)) plan.captionStyle.anim = 'fade';
  else if (has(t, /(pop|zıpla|zipla|vurucu)/i)) plan.captionStyle.anim = 'pop';
  if (has(t, /(büyük yazı|buyuk yazi|iri yazı|iri yazi)/i)) plan.captionStyle.fontSize = 8.2;
  if (has(t, /(küçük yazı|kucuk yazi|ince yazı)/i)) plan.captionStyle.fontSize = 5;

  // Efektler — cümle cümle bakılır ki "zoom kullan, sarsıntı istemiyorum" doğru ayrışsın.
  const allow = [];
  const deny = [];
  for (const clause of t.split(/[.;,\n]+/)) {
    const negative = NEGATION.test(clause);
    for (const [re, preset] of EFFECT_WORDS) {
      if (!re.test(clause)) continue;
      (negative ? deny : allow).push(preset);
    }
    if (negative && has(clause, /(efekt|geçiş|gecis|hareket)/i) && !EFFECT_WORDS.some(([re]) => re.test(clause))) {
      plan.effects.none = true;
    }
  }
  plan.effects.deny = [...new Set(deny)];
  const finalAllow = [...new Set(allow)].filter((p) => !plan.effects.deny.includes(p));
  if (finalAllow.length) plan.effects.allow = finalAllow;
  else if (plan.effects.none || (plan.effects.deny.length && !allow.length)) plan.effects.allow = [];
  if (has(t, /(sade|minimal|abartma|az efekt)/i)) plan.effects.intensity = 0.6;
  if (has(t, /(agresif|sert|abartılı|abartili|çok efekt|cok efekt)/i)) plan.effects.intensity = 1.5;

  // SFX
  if (t.split(/[.;,\n]+/).some((c) => /(sfx|ses efekt|efekt sesi)/i.test(c) && NEGATION.test(c))) plan.useSfx = false;
  if (has(t, /(sesi kıs|sesi kis|orijinal sesi kapat|müziksiz|muziksiz)/i)) plan.sourceAudioGain = has(t, /kapat|müziksiz|muziksiz/i) ? 0 : 0.35;

  if (plan.captionTexts.length) plan.notes.push(`${plan.captionTexts.length} altyazı metni talimattan birebir alındı`);
  if (plan.pace) plan.notes.push(`tempo: ${plan.pace}`);
  if (plan.captionMode !== 'auto') plan.notes.push(`altyazı: ${plan.captionMode}`);
  if (plan.effects.allow) plan.notes.push(`efektler: ${plan.effects.allow.join(', ') || 'kapalı'}`);
  if (plan.effects.deny.length) plan.notes.push(`istenmeyen efektler: ${plan.effects.deny.join(', ')}`);
  if (!plan.useSfx) plan.notes.push('SFX kullanılmayacak');
  return plan;
}

// Talimattaki tempo/yoğunluk isteklerini referanslardan öğrenilen profile uygular.
export function applyPlanToStyle(style, plan) {
  const s = { ...style };
  if (plan.pace) {
    s.pace = plan.pace;
    s.shotLength = plan.pace === 'hızlı' ? Math.min(s.shotLength, 1.2)
      : plan.pace === 'sakin' ? Math.max(s.shotLength, 3) : s.shotLength;
    s.captionRatio = plan.pace === 'hızlı' ? 0.9 : plan.pace === 'sakin' ? 0.4 : 0.6;
    s.accentRatio = plan.pace === 'hızlı' ? 0.75 : plan.pace === 'sakin' ? 0.25 : 0.45;
  }
  if (plan.captionMode === 'none') s.captionRatio = 0;
  else if (plan.captionMode === 'few') s.captionRatio = Math.min(s.captionRatio, 0.3);
  else if (plan.captionMode === 'many') s.captionRatio = 1;
  if (plan.effects.allow) s.accentRatio = plan.effects.allow.length ? Math.max(s.accentRatio, 0.5) : 0;
  return s;
}
