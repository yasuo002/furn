// Chat komutlarını zaman çizelgesi üzerinde çalışan işlemlere çevirir.
// Önce (varsa) Claude API'sine sorar, yoksa yerel kural tabanlı ayrıştırıcıya düşer.
import { captionLayer, motionLayer, MOTION_LABELS } from './style.js';
import { newId } from './store.js';

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

const PRESET_WORDS = [
  [/zoom|yakınlaş|yakinlas|büyüt vuruş/i, 'zoom'],
  [/sars|shake|titre/i, 'shake'],
  [/flaş|flas|flash|parla/i, 'flash'],
  [/wipe|silme geçiş|gecis efekt/i, 'wipe'],
  [/alt bant|bant ekle|bar/i, 'bar'],
  [/alt bilgi|lower ?third|isim şerid/i, 'lowerthird'],
  [/daire|circle|vurgu çember/i, 'circle'],
];

function parseTimes(text) {
  const range = text.match(/(\d+(?:[.,]\d+)?)\s*(?:\.|nci|ncı)?\s*(?:sn|s|sec|saniye)?\s*(?:-|ile|–|ila)\s*(\d+(?:[.,]\d+)?)\s*(?:sn|s|sec|saniye)/i);
  if (range) return { start: num(range[1]), end: num(range[2]) };
  const single = text.match(/(\d+(?:[.,]\d+)?)\s*(?:\.|nci|ncı)?\s*(?:sn|s|sec|saniye|saniyede|saniyeye)/i);
  if (single) return { start: num(single[1]), end: null };
  return { start: null, end: null };
}
const num = (s) => Number(String(s).replace(',', '.'));

function parseQuoted(text) {
  const m = text.match(/["“”'‘’]([^"“”'‘’]{1,200})["“”'‘’]/);
  if (m) return m[1].trim();
  const yaz = text.match(/(?:yaz|yazsın|yazalım|ekle)\s*:\s*(.{1,200})$/i);
  if (yaz) return yaz[1].trim();
  return null;
}

function findColor(text) {
  for (const [word, hex] of Object.entries(COLORS)) {
    if (new RegExp(`(?<!\\p{L})${word}(?!\\p{L})`, 'iu').test(text)) return hex;
  }
  const hex = text.match(/#[0-9a-f]{3,6}\b/i);
  return hex ? hex[0] : null;
}

// "2. altyazı", "ilk altyazı", "son katman", ya da metne göre eşleşme.
function resolveTargets(text, timeline) {
  const layers = timeline.layers;
  const captions = layers.filter((l) => l.type === 'caption');
  const idx = text.match(/(\d+)\s*(?:\.|nci|ncı|inci|uncu)?\s*(?:altyazı|altyazi|yazı|yazi|katman|caption|layer)/i);
  if (idx) {
    const i = Number(idx[1]) - 1;
    const pool = /katman|layer/i.test(idx[0]) ? layers : captions;
    if (pool[i]) return [pool[i]];
  }
  if (/\b(ilk|first)\b/i.test(text) && captions[0]) return [captions[0]];
  if (/\b(son|last)\b/i.test(text) && captions.length) return [captions[captions.length - 1]];
  if (/(tüm|tum|bütün|butun|hepsi|all)\s*(altyazı|altyazi|yazı|caption)/i.test(text)) return captions;
  const q = parseQuoted(text);
  if (q) {
    const hit = layers.filter((l) => l.type === 'caption' && l.text?.toLowerCase().includes(q.toLowerCase()));
    if (hit.length) return hit;
  }
  const t = parseTimes(text);
  if (t.start != null) {
    const hit = layers.filter((l) => l.start <= t.start + 0.4 && (l.end ?? 1e9) >= t.start - 0.4);
    if (hit.length) return hit;
  }
  return [];
}

// Kural tabanlı ayrıştırıcı — API anahtarı gerekmez.
export function parseInstruction(text, { timeline, attachments = [] }) {
  const ops = [];
  const t = String(text || '').trim();
  const dur = timeline?.output?.duration ?? 10;
  const times = parseTimes(t);
  const quoted = parseQuoted(t);
  const color = findColor(t);

  // 1) Eklenen dosyalar her zaman bir katmana dönüşür.
  for (const a of attachments) {
    if (a.kind === 'audio') {
      ops.push({ op: 'addSfx', file: a.fileName, name: a.originalName, url: a.url, start: times.start ?? 0, gain: 1 });
    } else if (a.kind === 'image') {
      ops.push({
        op: 'addImage', file: a.fileName, name: a.originalName, url: a.url,
        start: times.start ?? 0,
        end: times.end ?? Math.min(dur, (times.start ?? 0) + 3),
        x: 50, y: 40, scale: 35, opacity: 1,
      });
    } else if (a.kind === 'video') {
      ops.push({ op: 'note', message: `${a.originalName}: video ekleri şu an katman olarak desteklenmiyor, resim/ses ekleyin.` });
    }
  }

  const targets = resolveTargets(t, timeline || { layers: [] });

  // 2) Silme
  if (/\b(sil|kaldır|kaldir|çıkar|cikar|remove|delete)\b/i.test(t) && targets.length) {
    for (const l of targets) ops.push({ op: 'deleteLayer', id: l.id });
    return ops;
  }

  // 3) Metin değiştirme
  if (targets.length && quoted && /(değiştir|degistir|yap|olsun|güncelle|guncelle|change|replace)/i.test(t)) {
    for (const l of targets.filter((l) => l.type === 'caption')) {
      ops.push({ op: 'updateLayer', id: l.id, patch: { text: quoted, name: quoted.slice(0, 24) } });
    }
    if (ops.length) return ops;
  }

  // 4) Hareket/grafik efekti ekleme (renk kelimesi stil komutuyla karışmasın diye önce)
  for (const [re, preset] of PRESET_WORDS) {
    if (re.test(t) && /(ekle|koy|uygula|add|yap)/i.test(t)) {
      const start = times.start ?? 0;
      const end = times.end ?? Math.min(dur, start + (preset === 'flash' ? 0.2 : 0.6));
      ops.push({ op: 'addMotion', preset, start, end, params: { color: color || '#ffffff', text: quoted || '' } });
      return ops;
    }
  }

  // 5) Stil değişiklikleri
  const patch = {};
  if (color) patch.color = color;
  if (/büyüt|buyut|daha büyük|bigger|larger/i.test(t)) patch.fontSize = 'x1.25';
  if (/küçült|kucult|daha küçük|smaller/i.test(t)) patch.fontSize = 'x0.8';
  if (/yukarı|yukari|üste|uste|top/i.test(t)) patch.y = 18;
  if (/aşağı|asagi|alta|bottom/i.test(t)) patch.y = 82;
  if (/orta|merkez|center/i.test(t)) { patch.y = 50; patch.x = 50; }
  if (/kutu|arka plan|background|box/i.test(t)) patch.bg = 'box';
  if (/kalın|kalin|bold/i.test(t)) patch.bold = true;
  if (/(pop|zıpla|zipla)/i.test(t)) patch.anim = 'pop';
  if (/(daktilo|typewriter|harf harf)/i.test(t)) patch.anim = 'type';
  if (/(kayarak|slide|aşağıdan)/i.test(t)) patch.anim = 'slide';
  if (Object.keys(patch).length && targets.length) {
    for (const l of targets.filter((l) => l.type === 'caption')) {
      ops.push({ op: 'updateLayer', id: l.id, stylePatch: patch });
    }
    return ops;
  }

  // 6) Ses seviyesi
  if (/(orijinal|original|videonun)\s*(ses|audio)/i.test(t)) {
    const off = /(kapat|kıs|kis|sustur|mute|azalt)/i.test(t);
    ops.push({ op: 'setOutput', patch: { sourceAudioGain: off ? (/(kapat|sustur|mute)/i.test(t) ? 0 : 0.35) : 1 } });
    return ops;
  }

  // 7) Yeni altyazı
  if (quoted || /(yaz|altyazı|altyazi|caption|metin|text)/i.test(t)) {
    const text = quoted || t.replace(/.*?(?:yaz|ekle|caption|text)\s*/i, '').trim();
    if (text) {
      const start = times.start ?? 0;
      ops.push({ op: 'addCaption', text, start, end: times.end ?? Math.min(dur, start + 2.2), color });
      return ops;
    }
  }

  if (!ops.length) ops.push({ op: 'note', message: 'Komut anlaşılamadı. Örnek: «3. saniyede "İndirim başladı" yaz», «2. altyazıyı kırmızı yap», «5-6 sn arası zoom ekle», ya da bir ses/resim dosyası ekleyin.' });
  return ops;
}

const applyStylePatch = (style, patch) => {
  const out = { ...style };
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === 'string' && v.startsWith('x')) out[k] = Math.round((out[k] ?? 6.4) * Number(v.slice(1)) * 100) / 100;
    else out[k] = v;
  }
  return out;
};

export function applyOps(timeline, ops) {
  const notes = [];
  for (const op of ops) {
    switch (op.op) {
      case 'addCaption': {
        const l = captionLayer(op.text, op.start, op.end);
        if (op.color) l.style.color = op.color;
        if (op.style) l.style = { ...l.style, ...op.style };
        timeline.layers.push(l);
        notes.push(`Altyazı eklendi: “${op.text}” (${op.start}s–${op.end}s)`);
        break;
      }
      case 'addMotion': {
        timeline.layers.push(motionLayer(op.preset, op.start, op.end, op.params || {}));
        notes.push(`${MOTION_LABELS[op.preset] || op.preset} eklendi (${op.start}s–${op.end}s)`);
        break;
      }
      case 'addImage': {
        timeline.layers.push({
          id: newId('img_'), type: 'image', name: op.name || 'Görsel', visible: true,
          file: op.file, url: op.url, start: op.start ?? 0, end: op.end ?? (op.start ?? 0) + 3,
          x: op.x ?? 50, y: op.y ?? 40, scale: op.scale ?? 35, opacity: op.opacity ?? 1, rotation: 0,
        });
        notes.push(`Görsel eklendi: ${op.name || op.file}`);
        break;
      }
      case 'addSfx': {
        timeline.layers.push({
          id: newId('sfx_'), type: 'sfx', name: op.name || 'SFX', visible: true,
          file: op.file, url: op.url, start: op.start ?? 0, gain: op.gain ?? 1,
        });
        notes.push(`Ses eklendi: ${op.name || op.file} (${op.start ?? 0}s)`);
        break;
      }
      case 'updateLayer': {
        const l = timeline.layers.find((x) => x.id === op.id);
        if (!l) break;
        if (op.patch) Object.assign(l, op.patch);
        if (op.stylePatch) l.style = applyStylePatch(l.style || {}, op.stylePatch);
        if (op.paramsPatch) l.params = { ...(l.params || {}), ...op.paramsPatch };
        notes.push(`Katman güncellendi: ${l.name}`);
        break;
      }
      case 'deleteLayer': {
        const i = timeline.layers.findIndex((x) => x.id === op.id);
        if (i >= 0) notes.push(`Katman silindi: ${timeline.layers[i].name}`);
        if (i >= 0) timeline.layers.splice(i, 1);
        break;
      }
      case 'setOutput':
        Object.assign(timeline.output, op.patch || {});
        notes.push('Çıktı ayarları güncellendi.');
        break;
      case 'note':
        notes.push(op.message);
        break;
      default:
        notes.push(`Bilinmeyen işlem: ${op.op}`);
    }
  }
  timeline.layers.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  return notes;
}
