// İsteğe bağlı: ANTHROPIC_API_KEY varsa sohbet komutlarını ve altyazı metinlerini
// modelle üretir. Anahtar yoksa her şey yerel kurallarla çalışmaya devam eder.
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
export const LLM_ENABLED = Boolean(API_KEY);

async function ask(system, user, maxTokens = 1500) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.content?.map((c) => c.text || '').join('') || '';
}

const extractJson = (text) => {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
  return JSON.parse(raw);
};

const OPS_SYSTEM = `Sen bir video editörü asistanısın. Kullanıcının Türkçe/İngilizce talimatını,
zaman çizelgesi üzerinde çalışan JSON işlem dizisine çevirirsin. SADECE JSON dizisi döndür.

İzin verilen işlemler:
{"op":"addCaption","text":"...","start":0,"end":2.5,"style":{"color":"#ffffff","x":50,"y":78,"fontSize":6.4,"anim":"pop|fade|slide|type","bg":"none|box"}}
{"op":"addMotion","preset":"zoom|shake|flash|bar|wipe|lowerthird|circle","start":0,"end":0.6,"params":{"color":"#ffffff","text":"","intensity":1}}
{"op":"addImage","file":"<ek dosya adı>","start":0,"end":3,"x":50,"y":40,"scale":35,"opacity":1}
{"op":"addSfx","file":"<ek dosya adı>","start":0,"gain":1}
{"op":"updateLayer","id":"<katman id>","patch":{"text":"...","start":1,"end":2},"stylePatch":{"color":"#ff0000"}}
{"op":"deleteLayer","id":"<katman id>"}
{"op":"setOutput","patch":{"sourceAudioGain":0.4}}
{"op":"note","message":"..."}

Kurallar: zamanlar saniye cinsinden sayı; x/y/scale/fontSize yüzde; renkler hex.
Kullanıcı bir dosya eklediyse mutlaka o dosya için addImage/addSfx üret.`;

export async function instructionToOps(text, { timeline, attachments }) {
  const context = {
    output: timeline.output,
    layers: timeline.layers.map((l) => ({
      id: l.id, type: l.type, name: l.name, start: l.start, end: l.end,
      text: l.text, preset: l.preset, style: l.style,
    })),
    attachments: attachments.map((a) => ({ file: a.fileName, name: a.originalName, kind: a.kind })),
  };
  const out = await ask(OPS_SYSTEM, `Zaman çizelgesi:\n${JSON.stringify(context)}\n\nTalimat: ${text}`);
  const ops = extractJson(out);
  if (!Array.isArray(ops)) throw new Error('Model geçerli bir işlem dizisi döndürmedi');
  return ops;
}

// Referans videoların temposuna göre altyazı metinleri yazar.
export async function writeCaptions({ brief, count, style }) {
  const out = await ask(
    'Kısa video reklamları için vurucu altyazı metinleri yazarsın. SADECE JSON string dizisi döndür.',
    `Brief: ${brief || '(brief verilmedi)'}\nAltyazı sayısı: ${count}\nTempo: ${style?.pace || 'orta'} (ortalama plan ${style?.shotLength || 2}s)\nHer altyazı en fazla 6 kelime olsun.`
  );
  const arr = extractJson(out);
  return Array.isArray(arr) ? arr.map(String).slice(0, count) : [];
}
