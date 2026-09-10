// Renders caption + vector-graphic layers into an ASS subtitle file, which
// ffmpeg burns in with libass. Keeps text crisp and animations cheap.

const hexToAss = (hex, alpha = 0) => {
  const h = String(hex || '#ffffff').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  const r = full.slice(0, 2), g = full.slice(2, 4), b = full.slice(4, 6);
  const a = Math.round(Math.min(255, Math.max(0, alpha))).toString(16).padStart(2, '0');
  return `&H${a}${b}${g}${r}`.toUpperCase();
};

const ts = (sec) => {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s - h * 3600 - m * 60;
  return `${h}:${String(m).padStart(2, '0')}:${rest.toFixed(2).padStart(5, '0')}`;
};

// Kaba genişlik tahminiyle satır kaydırma: metin kadraja sığsın.
function wrap(text, fontPx, maxPx) {
  const perChar = fontPx * 0.55;
  const maxChars = Math.max(6, Math.floor(maxPx / perChar));
  return String(text ?? '').split('\n').map((para) => {
    const words = para.split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    for (const w of words) {
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.join('\n');
  }).join('\n');
}

const esc = (t) => String(t ?? '').replace(/\\/g, '\\\\').replace(/\{/g, '(').replace(/\}/g, ')').replace(/\r?\n/g, '\\N');

function header(w, h) {
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${w}
PlayResY: ${h}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Plain,DejaVu Sans,${Math.round(h * 0.06)},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,5,20,20,20,1
Style: Box,DejaVu Sans,${Math.round(h * 0.06)},&H00FFFFFF,&H00FFFFFF,&H00000000,&H60000000,-1,0,0,0,100,100,0,0,3,6,0,5,20,20,20,1
Style: Gfx,DejaVu Sans,${Math.round(h * 0.06)},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
}

function captionEvents(layer, w, h) {
  const st = layer.style || {};
  const x = Math.round((st.x ?? 50) / 100 * w);
  const y = Math.round((st.y ?? 78) / 100 * h);
  const fs = Math.round(((st.fontSize ?? 6.4) / 100) * h);
  const style = st.bg === 'box' ? 'Box' : 'Plain';
  const base = [
    `\\an5`,
    `\\fs${fs}`,
    `\\1c${hexToAss(st.color)}`,
    `\\3c${hexToAss(st.outline)}`,
    `\\bord${st.bg === 'box' ? Math.max(4, fs * 0.25) : (st.outlineWidth ?? 3)}`,
    st.bg === 'box' ? `\\4c${hexToAss(st.bgColor)}` : '',
    st.bold === false ? `\\b0` : `\\b1`,
    st.rotation ? `\\frz${-st.rotation}` : '',
  ].filter(Boolean);

  const dur = Math.max(0.1, layer.end - layer.start);
  const events = [];

  if (st.anim === 'type') {
    // Typewriter: reveal the text one character at a time.
    const text = String(layer.text || '');
    const step = Math.min(0.06, dur / Math.max(1, text.length));
    for (let i = 1; i <= text.length; i++) {
      const s = layer.start + (i - 1) * step;
      const e = i === text.length ? layer.end : layer.start + i * step;
      events.push({ start: s, end: e, style, tags: [...base, `\\pos(${x},${y})`].join(''), text: esc(wrap(text.slice(0, i), fs, w * 0.9)) });
    }
    return events;
  }

  let anim = '';
  if (st.anim === 'pop') anim = `\\fscx55\\fscy55\\t(0,160,\\fscx100\\fscy100)\\fad(0,120)`;
  else if (st.anim === 'fade') anim = `\\fad(220,220)`;
  else if (st.anim === 'slide') anim = `\\move(${x},${y + Math.round(h * 0.06)},${x},${y},0,220)\\fad(120,120)`;
  const pos = st.anim === 'slide' ? '' : `\\pos(${x},${y})`;

  events.push({ start: layer.start, end: layer.end, style, tags: [...base, pos, anim].join(''), text: esc(wrap(layer.text, fs, w * 0.9)) });
  return events;
}

const rect = (w, h) => `m 0 0 l ${Math.round(w)} 0 l ${Math.round(w)} ${Math.round(h)} l 0 ${Math.round(h)}`;

function circlePath(r) {
  const k = (r * 0.5523).toFixed(1);
  return `m ${-r} 0 b ${-r} ${-k} ${-k} ${-r} 0 ${-r} b ${k} ${-r} ${r} ${-k} ${r} 0 b ${r} ${k} ${k} ${r} 0 ${r} b ${-k} ${r} ${-r} ${k} ${-r} 0`;
}

function motionEvents(layer, w, h) {
  const p = layer.params || {};
  const col = hexToAss(p.color || '#ffffff');
  const dur = Math.max(0.08, layer.end - layer.start);
  const ms = Math.round(dur * 1000);
  const ev = (tags, text = '') => ({ start: layer.start, end: layer.end, style: 'Gfx', tags, text });

  switch (layer.preset) {
    case 'flash':
      return [ev(`\\an7\\pos(0,0)\\1c${col}\\alpha&H40&\\t(0,${ms},\\alpha&HFF&)\\p1`, rect(w, h))];
    case 'wipe': {
      const dir = p.direction === 'right' ? 1 : -1;
      return [ev(`\\an7\\1c${col}\\move(${dir * w},0,${dir > 0 ? w : -w * 0.02},0,0,${ms})\\p1`, rect(w, h))];
    }
    case 'bar': {
      const bh = Math.round(h * 0.012 * (p.intensity || 1) * 6);
      const y = Math.round((p.y ?? 88) / 100 * h);
      return [ev(`\\an7\\1c${col}\\pos(0,${y})\\alpha&H20&\\t(0,180,\\alpha&H10&)\\p1`, rect(w, bh))];
    }
    case 'lowerthird': {
      const bw = Math.round(w * 0.62);
      const bh = Math.round(h * 0.09);
      const y = Math.round((p.y ?? 75) / 100 * h);
      const x = Math.round(w * 0.06);
      const out = [ev(`\\an7\\1c${col}\\alpha&H30&\\move(${-bw},${y},${x},${y},0,260)\\p1`, rect(bw, bh))];
      if (p.text) {
        out.push({
          start: layer.start, end: layer.end, style: 'Plain',
          tags: `\\an4\\pos(${x + Math.round(bw * 0.05)},${y + Math.round(bh / 2)})\\fs${Math.round(h * 0.045)}\\1c${hexToAss(p.textColor || '#000000')}\\bord0\\fad(160,120)`,
          text: esc(p.text),
        });
      }
      return out;
    }
    case 'circle': {
      const r = Math.round(Math.min(w, h) * 0.18 * (p.intensity || 1));
      const x = Math.round((p.x ?? 50) / 100 * w);
      const y = Math.round((p.y ?? 50) / 100 * h);
      return [ev(`\\an5\\pos(${x},${y})\\1a&HFF&\\3c${col}\\bord${Math.max(2, Math.round(h * 0.006))}\\t(0,${Math.min(400, ms)},\\fscx110\\fscy110)\\fad(80,160)\\p1`, circlePath(r))];
    }
    default:
      return []; // zoom/shake are video filters, handled in render.js
  }
}

export function buildAss(timeline) {
  const { width: w, height: h } = timeline.output;
  const events = [];
  for (const layer of timeline.layers) {
    if (layer.visible === false) continue;
    if (layer.type === 'caption') events.push(...captionEvents(layer, w, h).map((e) => ({ ...e, z: 10 })));
    else if (layer.type === 'motion') events.push(...motionEvents(layer, w, h).map((e) => ({ ...e, z: 5 })));
  }
  const lines = events.map(
    (e) => `Dialogue: ${e.z},${ts(e.start)},${ts(e.end)},${e.style},,0,0,0,,{${e.tags}}${e.text}`
  );
  return header(w, h) + lines.join('\n') + '\n';
}
