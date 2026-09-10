/* Yerel video editörü — arayüz mantığı.
   Önizleme: <video> üzerine canvas ile katmanlar çizilir (altyazı, grafik, görsel),
   zoom/sarsıntı CSS transform ile, SFX ise WebAudio ile duyurulur.
   Dışa aktarma sunucuda ffmpeg ile birebir aynı katmanlardan üretilir. */

const $ = (s) => document.querySelector(s);
const api = '/api/editor';
let project = null;
let timeline = null;
let selectedId = null;
let attachments = [];
let dirty = false;

const fmt = (n) => Number(n || 0).toFixed(2);
const toast = (msg, ms = 2600) => {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
};

async function jfetch(url, opts) {
  const r = await fetch(url, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}

/* ---------------- proje ---------------- */
async function loadProjects(selectId) {
  const list = await jfetch(`${api}/projects`);
  const sel = $('#projectSelect');
  sel.innerHTML = list.map((p) => `<option value="${p.id}">${p.name} — ${new Date(p.updatedAt).toLocaleString('tr-TR')}</option>`).join('');
  const id = selectId || localStorage.getItem('projectId') || list[0]?.id;
  if (id && list.some((p) => p.id === id)) { sel.value = id; await openProject(id); }
  else if (!list.length) await newProject();
}

async function newProject() {
  const p = await jfetch(`${api}/projects`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Proje ' + new Date().toLocaleString('tr-TR') }),
  });
  await loadProjects(p.id);
}

async function openProject(id) {
  project = await jfetch(`${api}/projects/${id}`);
  localStorage.setItem('projectId', id);
  timeline = project.timeline;
  $('#instruction').value = project.instruction || project.brief || '';
  renderSetup();
  renderPlan();
  if (timeline) renderResult();
}

/* ---------------- yükleme ---------------- */
function wireDrop(dropEl, role, accept) {
  const pick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = role !== 'target'; inp.accept = accept;
    inp.onchange = () => upload(role, [...inp.files]);
    inp.click();
  };
  dropEl.addEventListener('click', pick);
  dropEl.addEventListener('dragover', (e) => { e.preventDefault(); dropEl.classList.add('over'); });
  dropEl.addEventListener('dragleave', () => dropEl.classList.remove('over'));
  dropEl.addEventListener('drop', (e) => {
    e.preventDefault(); dropEl.classList.remove('over');
    upload(role, [...e.dataTransfer.files]);
  });
}

async function upload(role, files) {
  if (!files.length || !project) return;
  const fd = new FormData();
  fd.append('role', role);
  for (const f of files) fd.append('files', f);
  toast('Yükleniyor…');
  try {
    const res = await jfetch(`${api}/projects/${project.id}/upload`, { method: 'POST', body: fd });
    project = res.project;
    renderSetup();
    toast('Yüklendi');
  } catch (e) { toast('Hata: ' + e.message, 5000); }
}

async function removeMedia(role, fileName) {
  project = await jfetch(`${api}/projects/${project.id}/remove-media`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ role, fileName }),
  });
  renderSetup();
}

function tile(item, role) {
  const dims = item.meta?.width ? `${item.meta.width}×${item.meta.height} · ${fmt(item.meta.duration)}s` : (item.meta?.duration ? `${fmt(item.meta.duration)}s` : '');
  const media = item.kind === 'video'
    ? (item.thumb ? `<img src="${item.thumb}">` : `<video src="${item.url}" muted></video>`)
    : item.kind === 'image' ? `<img src="${item.url}">`
    : `<div style="aspect-ratio:16/10;display:grid;place-items:center;font-size:26px">🔊</div>`;
  return `<div class="tile"><button class="x" data-role="${role}" data-file="${item.fileName}">×</button>${media}
    <div class="meta">${item.originalName}<br>${dims}${item.cuts?.length ? ` · ${item.cuts.length} kesim` : ''}</div></div>`;
}

function renderSetup() {
  $('#refGrid').innerHTML = project.references.map((r) => tile(r, 'reference')).join('');
  $('#targetGrid').innerHTML = project.target ? tile(project.target, 'target') : '';
  $('#sfxGrid').innerHTML = project.sfx.map((s) => tile(s, 'sfx')).join('');
  const s = project.style;
  $('#styleStat').innerHTML = s
    ? `<span>Örnek: <b>${s.sampleCount}</b></span><span>Ortalama plan: <b>${s.shotLength}s</b></span>
       <span>Tempo: <b>${s.pace}</b></span><span>Altyazı yoğunluğu: <b>%${Math.round(s.captionRatio * 100)}</b></span>
       <span>Efekt yoğunluğu: <b>%${Math.round(s.accentRatio * 100)}</b></span>`
    : '<span>Örnek video ekleyin (önerilen 3–10).</span>';
  document.querySelectorAll('.tile .x').forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); removeMedia(b.dataset.role, b.dataset.file); };
  });
  $('#analyzeBtn').disabled = !project.target || project.references.length === 0;
}

/* ---------------- analiz ---------------- */
$('#analyzeBtn').onclick = async () => {
  $('#analyzeState').textContent = 'analiz ediliyor…';
  try {
    project = await jfetch(`${api}/projects/${project.id}/analyze`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ instruction: $('#instruction').value }),
    });
    timeline = project.timeline;
    $('#analyzeState').textContent = 'hazır';
    renderPlan();
    renderResult();
    $('#resultCard').scrollIntoView({ behavior: 'smooth' });
  } catch (e) { $('#analyzeState').textContent = ''; toast('Hata: ' + e.message, 6000); }
};

// Talimattan ne anlaşıldığını kullanıcıya göster.
function renderPlan() {
  const p = project.plan;
  const el = $('#planStat');
  if (!p) { el.innerHTML = ''; return; }
  const bits = [];
  bits.push(`Tempo: <b>${p.pace || project.style?.pace || 'referanslardan'}</b>`);
  bits.push(`Altyazı: <b>${p.captionMode === 'none' ? 'kapalı' : p.captionTexts?.length ? p.captionTexts.length + ' metin (talimattan)' : p.captionMode}</b>`);
  bits.push(`Efektler: <b>${p.effects?.allow ? (p.effects.allow.join(', ') || 'kapalı') : 'otomatik'}</b>`);
  bits.push(`SFX: <b>${p.useSfx === false ? 'kullanılmayacak' : 'kullanılacak'}</b>`);
  if (p.captionStyle && Object.keys(p.captionStyle).length) {
    bits.push(`Yazı stili: <b>${Object.entries(p.captionStyle).map(([k, v]) => `${k}=${v}`).join(', ')}</b>`);
  }
  el.innerHTML = bits.map((b) => `<span>${b}</span>`).join('');
}

function renderResult() {
  $('#resultCard').style.display = '';
  $('#resultVideo').src = project.target.url;
  const o = timeline.output;
  const c = timeline.layers.filter((l) => l.type === 'caption').length;
  const m = timeline.layers.filter((l) => l.type === 'motion').length;
  const sx = timeline.layers.filter((l) => l.type === 'sfx').length;
  $('#timelineStat').innerHTML = `<span>Çıktı: <b>${o.width}×${o.height}</b> (${o.orientation})</span>
    <span>Süre: <b>${fmt(o.duration)}s</b></span><span>Altyazı: <b>${c}</b></span>
    <span>Grafik/hareket: <b>${m}</b></span><span>SFX: <b>${sx}</b></span>`;
  $('#exportGrid').innerHTML = (project.exports || []).map((e) => `
    <div class="tile"><video src="${e.url}" controls></video>
    <div class="meta">${e.width}×${e.height}<br><a href="${api}/projects/${project.id}/download/${e.file}">⬇ Bilgisayara indir</a></div></div>`).join('');
}

$('#openEditor').onclick = openEditor;
$('#openEditorBtn').onclick = openEditor;
$('#closeEditor').onclick = () => { pause(); $('#editor').classList.remove('open'); renderResult(); };

/* ---------------- editör ---------------- */
const video = $('#editVideo');
const canvas = $('#overlay');
const ctx = canvas.getContext('2d');
const imgCache = new Map();
let audioEls = new Map();

function openEditor() {
  if (!timeline) return;
  $('#editor').classList.add('open');
  $('#editorTitle').textContent = project.name;
  $('#outBadge').textContent = `${timeline.output.width}×${timeline.output.height} · ${timeline.output.orientation} · ${fmt(timeline.output.duration)}s`;
  video.src = project.target.url;
  canvas.width = timeline.output.width;
  canvas.height = timeline.output.height;
  $('#srcGain').value = Math.round((timeline.output.sourceAudioGain ?? 1) * 100);
  video.volume = Math.min(1, timeline.output.sourceAudioGain ?? 1);
  prepareAudio();
  renderLayers(); renderTimeline(); renderProps(); renderChat();
  requestAnimationFrame(loop);
}

function prepareAudio() {
  audioEls.forEach((a) => a.pause());
  audioEls = new Map();
  for (const l of timeline.layers.filter((x) => x.type === 'sfx')) {
    const a = new Audio(l.url);
    a.preload = 'auto';
    audioEls.set(l.id, a);
  }
}

/* --- katman listesi --- */
const TYPE_LABEL = { caption: 'yazı', motion: 'grafik', image: 'görsel', sfx: 'ses' };
function renderLayers() {
  $('#layerList').innerHTML = timeline.layers.map((l) => `
    <div class="layer ${l.id === selectedId ? 'sel' : ''}" data-id="${l.id}">
      <button class="eye" data-eye="${l.id}">${l.visible === false ? '🚫' : '👁'}</button>
      <span class="nm">${l.name || l.text || l.preset}</span>
      <span class="tp ${l.type}">${TYPE_LABEL[l.type]}</span>
    </div>`).join('') || '<p class="hint">Katman yok.</p>';
  $('#layerList').querySelectorAll('.layer').forEach((el) => {
    el.onclick = () => { selectedId = el.dataset.id; renderLayers(); renderProps(); renderTimeline(); };
  });
  $('#layerList').querySelectorAll('.eye').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const l = timeline.layers.find((x) => x.id === b.dataset.eye);
      l.visible = l.visible === false;
      markDirty(); renderLayers();
    };
  });
}

function markDirty() { dirty = true; $('#saveBtn').textContent = 'Kaydet *'; }

/* --- özellik paneli --- */
function field(label, input) { return `<div class="field"><label>${label}</label>${input}</div>`; }

function renderProps() {
  const l = timeline.layers.find((x) => x.id === selectedId);
  const box = $('#props');
  if (!l) { box.innerHTML = '<p class="hint">Bir katman seçin.</p>'; return; }
  const st = l.style || {};
  const p = l.params || {};
  let html = field('Ad', `<input data-k="name" value="${(l.name || '').replace(/"/g, '&quot;')}">`);
  html += `<div class="field two"><div><label>Başlangıç (s)</label><input type="number" step="0.05" data-k="start" value="${l.start ?? 0}"></div>
    ${l.type === 'sfx' ? '' : `<div><label>Bitiş (s)</label><input type="number" step="0.05" data-k="end" value="${l.end ?? 0}"></div>`}</div>`;

  if (l.type === 'caption') {
    html += field('Metin', `<textarea data-k="text" rows="2">${l.text || ''}</textarea>`);
    html += `<div class="field two"><div><label>Renk</label><input type="color" data-s="color" value="${st.color || '#ffffff'}"></div>
      <div><label>Kontur</label><input type="color" data-s="outline" value="${st.outline || '#000000'}"></div></div>`;
    html += field(`Punto (%${st.fontSize})`, `<input type="range" min="2" max="18" step="0.2" data-s="fontSize" value="${st.fontSize}">`);
    html += `<div class="field two"><div><label>X %</label><input type="number" data-s="x" value="${st.x}"></div>
      <div><label>Y %</label><input type="number" data-s="y" value="${st.y}"></div></div>`;
    html += field('Animasyon', `<select data-s="anim">${['pop', 'fade', 'slide', 'type'].map((a) => `<option ${st.anim === a ? 'selected' : ''}>${a}</option>`).join('')}</select>`);
    html += field('Arka plan', `<select data-s="bg"><option value="none" ${st.bg === 'none' ? 'selected' : ''}>yok</option><option value="box" ${st.bg === 'box' ? 'selected' : ''}>kutu</option></select>`);
  } else if (l.type === 'motion') {
    html += field('Efekt', `<select data-k="preset">${['zoom', 'shake', 'flash', 'bar', 'wipe', 'lowerthird', 'circle'].map((a) => `<option ${l.preset === a ? 'selected' : ''}>${a}</option>`).join('')}</select>`);
    html += field('Renk', `<input type="color" data-p="color" value="${p.color || '#ffffff'}">`);
    html += field(`Şiddet (${p.intensity ?? 1})`, `<input type="range" min="0.2" max="2" step="0.1" data-p="intensity" value="${p.intensity ?? 1}">`);
    if (['lowerthird'].includes(l.preset)) html += field('Şerit yazısı', `<input data-p="text" value="${p.text || ''}">`);
    if (['bar', 'circle', 'lowerthird'].includes(l.preset)) {
      html += `<div class="field two"><div><label>X %</label><input type="number" data-p="x" value="${p.x ?? 50}"></div>
        <div><label>Y %</label><input type="number" data-p="y" value="${p.y ?? 75}"></div></div>`;
    }
  } else if (l.type === 'image') {
    html += `<div class="field two"><div><label>X %</label><input type="number" data-k="x" value="${l.x}"></div>
      <div><label>Y %</label><input type="number" data-k="y" value="${l.y}"></div></div>`;
    html += field(`Boyut (%${l.scale})`, `<input type="range" min="5" max="120" data-k="scale" value="${l.scale}">`);
    html += field(`Opaklık (${l.opacity})`, `<input type="range" min="0" max="1" step="0.05" data-k="opacity" value="${l.opacity}">`);
    html += field('Döndürme (°)', `<input type="number" data-k="rotation" value="${l.rotation || 0}">`);
  } else if (l.type === 'sfx') {
    html += field(`Ses (${l.gain})`, `<input type="range" min="0" max="2" step="0.05" data-k="gain" value="${l.gain}">`);
    html += `<audio controls src="${l.url}" style="width:100%"></audio>`;
  }
  html += `<button class="danger ghost" id="delLayer" style="width:100%;margin-top:8px">Katmanı sil</button>`;
  box.innerHTML = html;

  box.querySelectorAll('[data-k],[data-s],[data-p]').forEach((inp) => {
    const handler = () => {
      const v = inp.type === 'number' || inp.type === 'range' ? Number(inp.value) : inp.value;
      if (inp.dataset.k) l[inp.dataset.k] = v;
      else if (inp.dataset.s) (l.style ||= {})[inp.dataset.s] = v;
      else (l.params ||= {})[inp.dataset.p] = v;
      if (inp.dataset.k === 'text' || inp.dataset.k === 'preset') l.name = l.text?.slice(0, 24) || l.preset || l.name;
      markDirty(); renderLayers(); renderTimeline();
      if (inp.type === 'range') renderPropsLabelOnly(inp);
    };
    inp.oninput = handler;
  });
  $('#delLayer').onclick = () => {
    timeline.layers = timeline.layers.filter((x) => x.id !== l.id);
    selectedId = null; markDirty(); renderLayers(); renderTimeline(); renderProps();
  };
}
function renderPropsLabelOnly(inp) {
  const lab = inp.parentElement.querySelector('label');
  if (lab && /\(|%/.test(lab.textContent)) lab.textContent = lab.textContent.replace(/[(%][^)]*\)?$/, '').trim() + ` (${inp.value})`;
}

/* --- zaman çizelgesi --- */
function renderTimeline() {
  const dur = timeline.output.duration || 1;
  const rows = timeline.layers.map((l) => {
    const s = (l.start ?? 0) / dur * 100;
    const w = l.type === 'sfx' ? 1.5 : Math.max(0.8, ((l.end ?? l.start) - l.start) / dur * 100);
    return `<div class="tlrow"><div class="lbl">${l.name || l.type}</div>
      <div class="track" data-track="${l.id}">
        <div class="clip ${l.type} ${l.id === selectedId ? 'sel' : ''}" data-clip="${l.id}" style="left:${s}%;width:${w}%">
          ${l.type === 'sfx' ? '' : '<div class="h l"></div><div class="h r"></div>'}
        </div></div></div>`;
  }).join('');
  $('#timelineEl').innerHTML = rows + `<div class="tlrow"><div class="lbl">süre</div><div class="track" id="ruler"><div class="playhead" id="playhead"></div></div></div>`;
  wireClips();
}

function wireClips() {
  const dur = timeline.output.duration || 1;
  $('#timelineEl').querySelectorAll('.clip').forEach((clip) => {
    const l = timeline.layers.find((x) => x.id === clip.dataset.clip);
    clip.onmousedown = (e) => {
      e.preventDefault();
      selectedId = l.id; renderLayers(); renderProps();
      const track = clip.parentElement;
      const rect = track.getBoundingClientRect();
      const mode = e.target.classList.contains('h') ? (e.target.classList.contains('l') ? 'l' : 'r') : 'move';
      const startX = e.clientX;
      const s0 = l.start ?? 0, e0 = l.end ?? s0;
      const move = (ev) => {
        const d = (ev.clientX - startX) / rect.width * dur;
        if (mode === 'move') {
          const len = e0 - s0;
          l.start = Math.max(0, Math.min(dur - (l.type === 'sfx' ? 0 : len), s0 + d));
          if (l.end != null) l.end = l.start + len;
        } else if (mode === 'l') l.start = Math.max(0, Math.min(e0 - 0.1, s0 + d));
        else l.end = Math.min(dur, Math.max(s0 + 0.1, e0 + d));
        l.start = Math.round(l.start * 100) / 100;
        if (l.end != null) l.end = Math.round(l.end * 100) / 100;
        markDirty(); renderTimeline(); renderProps();
      };
      const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
      window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    };
  });
  const ruler = $('#ruler');
  if (ruler) ruler.onclick = (e) => {
    const r = ruler.getBoundingClientRect();
    video.currentTime = (e.clientX - r.left) / r.width * (timeline.output.duration || 1);
  };
}

/* --- önizleme çizimi --- */
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// Önizlemede de export'takiyle aynı satır kaydırma.
function wrapLines(text, maxPx) {
  const out = [];
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w;
      if (ctx.measureText(next).width <= maxPx || !cur) cur = next;
      else { out.push(cur); cur = w; }
    }
    out.push(cur);
  }
  return out.filter((l) => l !== undefined);
}

function drawCaption(l, t) {
  const st = l.style || {};
  const W = canvas.width, H = canvas.height;
  const x = (st.x ?? 50) / 100 * W;
  let y = (st.y ?? 78) / 100 * H;
  const fs = (st.fontSize ?? 6.4) / 100 * H;
  const life = t - l.start, dur = Math.max(0.1, l.end - l.start);
  let scale = 1, alpha = 1;
  let text = l.text || '';
  if (st.anim === 'pop') scale = 0.55 + 0.45 * easeOut(Math.min(1, life / 0.16));
  else if (st.anim === 'fade') alpha = Math.min(1, life / 0.22) * Math.min(1, (dur - life) / 0.22 + 0.0001);
  else if (st.anim === 'slide') y += (1 - easeOut(Math.min(1, life / 0.22))) * H * 0.06;
  else if (st.anim === 'type') text = text.slice(0, Math.max(1, Math.ceil(life / Math.min(0.06, dur / Math.max(1, text.length)))));

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x, y); ctx.scale(scale, scale);
  if (st.rotation) ctx.rotate(st.rotation * Math.PI / 180);
  ctx.font = `${st.bold === false ? '' : 'bold '}${fs}px "DejaVu Sans", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lines = wrapLines(String(text), W * 0.9);
  lines.forEach((line, i) => {
    const ly = (i - (lines.length - 1) / 2) * fs * 1.2;
    if (st.bg === 'box') {
      const w = ctx.measureText(line).width + fs * 0.6;
      ctx.fillStyle = st.bgColor || '#000000';
      ctx.globalAlpha *= 0.75;
      ctx.fillRect(-w / 2, ly - fs * 0.68, w, fs * 1.36);
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    } else {
      ctx.lineWidth = (st.outlineWidth ?? 3) * (fs / 40);
      ctx.strokeStyle = st.outline || '#000';
      ctx.lineJoin = 'round';
      ctx.strokeText(line, 0, ly);
    }
    ctx.fillStyle = st.color || '#fff';
    ctx.fillText(line, 0, ly);
  });
  ctx.restore();
}

function drawMotion(l, t) {
  const W = canvas.width, H = canvas.height;
  const p = l.params || {};
  const life = t - l.start, dur = Math.max(0.08, l.end - l.start);
  const k = Math.min(1, life / dur);
  ctx.save();
  ctx.fillStyle = p.color || '#fff';
  if (l.preset === 'flash') { ctx.globalAlpha = 0.75 * (1 - k); ctx.fillRect(0, 0, W, H); }
  else if (l.preset === 'wipe') { const dx = (p.direction === 'right' ? 1 : -1); ctx.fillRect(dx > 0 ? W * (1 - easeOut(k)) : -W + W * easeOut(k), 0, W, H); }
  else if (l.preset === 'bar') { ctx.globalAlpha = 0.85; ctx.fillRect(0, (p.y ?? 88) / 100 * H, W, H * 0.012 * (p.intensity || 1) * 6); }
  else if (l.preset === 'lowerthird') {
    const bw = W * 0.62, bh = H * 0.09, y = (p.y ?? 75) / 100 * H;
    const x = -bw + (W * 0.06 + bw) * easeOut(Math.min(1, life / 0.26));
    ctx.globalAlpha = 0.8; ctx.fillRect(x, y, bw, bh);
    if (p.text) {
      ctx.globalAlpha = 1; ctx.fillStyle = p.textColor || '#000';
      ctx.font = `bold ${H * 0.045}px "DejaVu Sans", sans-serif`;
      ctx.textBaseline = 'middle'; ctx.fillText(p.text, x + bw * 0.05, y + bh / 2);
    }
  } else if (l.preset === 'circle') {
    const r = Math.min(W, H) * 0.18 * (p.intensity || 1) * (1 + 0.1 * easeOut(Math.min(1, life / 0.4)));
    ctx.strokeStyle = p.color || '#fff'; ctx.lineWidth = Math.max(2, H * 0.006);
    ctx.beginPath(); ctx.arc((p.x ?? 50) / 100 * W, (p.y ?? 50) / 100 * H, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawImage(l, t) {
  let img = imgCache.get(l.url);
  if (!img) { img = new Image(); img.src = l.url; imgCache.set(l.url, img); }
  if (!img.complete || !img.naturalWidth) return;
  const W = canvas.width, H = canvas.height;
  const w = (l.scale ?? 30) / 100 * W;
  const h = w * (img.naturalHeight / img.naturalWidth);
  ctx.save();
  ctx.globalAlpha = l.opacity ?? 1;
  ctx.translate((l.x ?? 50) / 100 * W, (l.y ?? 50) / 100 * H);
  if (l.rotation) ctx.rotate(l.rotation * Math.PI / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function videoTransform(t) {
  let zoom = 1, dx = 0, dy = 0;
  for (const l of timeline.layers) {
    if (l.visible === false || l.type !== 'motion') continue;
    if (t < l.start || t > l.end) continue;
    const k = (t - l.start) / Math.max(0.1, l.end - l.start);
    if (l.preset === 'zoom') zoom += 0.16 * (l.params?.intensity ?? 1) * Math.sin(Math.PI * k);
    if (l.preset === 'shake') {
      const a = (l.params?.intensity ?? 1);
      dx += a * 9 * Math.sin(47 * t); dy += a * 7 * Math.sin(39 * t); zoom = Math.max(zoom, 1.03);
    }
  }
  return { zoom, dx, dy };
}

let lastT = -1;
function loop() {
  if ($('#editor').classList.contains('open')) {
    const t = video.currentTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const l of timeline.layers) {
      if (l.visible === false) continue;
      if (l.type === 'sfx') continue;
      if (t < (l.start ?? 0) || t > (l.end ?? 1e9)) continue;
      if (l.type === 'caption') drawCaption(l, t);
      else if (l.type === 'motion') drawMotion(l, t);
      else if (l.type === 'image') drawImage(l, t);
    }
    const { zoom, dx, dy } = videoTransform(t);
    video.style.transform = `scale(${zoom}) translate(${dx / canvas.width * 100}%, ${dy / canvas.height * 100}%)`;
    canvas.style.transform = video.style.transform;

    // SFX tetikleme
    if (!video.paused) {
      for (const l of timeline.layers.filter((x) => x.type === 'sfx' && x.visible !== false)) {
        const a = audioEls.get(l.id);
        if (a && lastT <= l.start && t > l.start) { a.volume = Math.min(1, l.gain ?? 1); a.currentTime = 0; a.play().catch(() => {}); }
      }
    }
    lastT = t;
    $('#timeLabel').textContent = `${fmt(t)} / ${fmt(timeline.output.duration)}`;
    $('#scrub').value = Math.round(t / (timeline.output.duration || 1) * 1000);
    const ph = $('#playhead');
    if (ph) ph.style.left = `${t / (timeline.output.duration || 1) * 100}%`;
  }
  requestAnimationFrame(loop);
}

function pause() { video.pause(); audioEls.forEach((a) => a.pause()); $('#playBtn').textContent = '▶'; }
$('#playBtn').onclick = () => {
  if (video.paused) { video.play(); $('#playBtn').textContent = '⏸'; } else pause();
};
$('#scrub').oninput = (e) => { video.currentTime = e.target.value / 1000 * (timeline.output.duration || 1); lastT = video.currentTime; };
$('#srcGain').oninput = (e) => {
  timeline.output.sourceAudioGain = Number(e.target.value) / 100;
  video.volume = Math.min(1, timeline.output.sourceAudioGain);
  markDirty();
};
canvas.addEventListener('mousedown', (e) => {
  const l = timeline.layers.find((x) => x.id === selectedId);
  if (!l || (l.type !== 'caption' && l.type !== 'image')) return;
  const r = canvas.getBoundingClientRect();
  const move = (ev) => {
    const x = Math.round((ev.clientX - r.left) / r.width * 100);
    const y = Math.round((ev.clientY - r.top) / r.height * 100);
    if (l.type === 'caption') { l.style.x = x; l.style.y = y; } else { l.x = x; l.y = y; }
    markDirty(); renderProps();
  };
  move(e);
  const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
});

/* --- katman ekleme --- */
$('#addCaptionBtn').onclick = () => {
  const t = Math.round(video.currentTime * 100) / 100;
  const l = {
    id: 'cap_' + Math.random().toString(16).slice(2, 10), type: 'caption', name: 'Yeni altyazı', visible: true,
    start: t, end: Math.min(timeline.output.duration, t + 2), text: 'Yeni altyazı',
    style: { fontSize: 6.4, color: '#ffffff', outline: '#000000', outlineWidth: 3, bg: 'none', bgColor: '#000000', bold: true, x: 50, y: 78, anim: 'pop' },
  };
  timeline.layers.push(l); selectedId = l.id; markDirty(); renderLayers(); renderTimeline(); renderProps();
};
$('#addMotionSel').onchange = (e) => {
  const preset = e.target.value; if (!preset) return;
  e.target.value = '';
  const t = Math.round(video.currentTime * 100) / 100;
  const len = preset === 'flash' ? 0.2 : preset === 'lowerthird' ? 2.5 : 0.6;
  const l = {
    id: 'mot_' + Math.random().toString(16).slice(2, 10), type: 'motion', name: preset, visible: true,
    preset, start: t, end: Math.min(timeline.output.duration, t + len), params: { color: '#ffffff', intensity: 1, text: '' },
  };
  timeline.layers.push(l); selectedId = l.id; markDirty(); renderLayers(); renderTimeline(); renderProps();
};

/* --- kaydet / dışa aktar --- */
async function save() {
  await jfetch(`${api}/projects/${project.id}/timeline`, {
    method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ timeline }),
  });
  dirty = false; $('#saveBtn').textContent = 'Kaydet';
}
$('#saveBtn').onclick = () => save().then(() => toast('Kaydedildi'));

$('#exportBtn').onclick = async () => {
  pause();
  await save();
  const log = $('#exportLog');
  log.textContent = 'Render başlıyor…\n';
  $('#exportBtn').disabled = true;
  const res = await fetch(`${api}/projects/${project.id}/export`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ timeline }),
  });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split('\n\n'); buf = parts.pop();
    for (const p of parts) {
      const ev = p.match(/^event: (.+)$/m)?.[1];
      const data = JSON.parse(p.match(/^data: (.+)$/m)?.[1] || '{}');
      if (ev === 'log') { log.textContent += data.message + '\n'; log.scrollTop = log.scrollHeight; }
      else if (ev === 'error') { toast('Render hatası: ' + data.error, 8000); log.textContent += 'HATA: ' + data.error; }
      else if (ev === 'done') {
        log.textContent += 'Bitti ✔\n';
        project = await jfetch(`${api}/projects/${project.id}`);
        toast('Video hazır — indiriliyor');
        window.location.href = `${api}/projects/${project.id}/download/${data.file}`;
      }
    }
  }
  $('#exportBtn').disabled = false;
};

/* --- sohbet --- */
function renderChat() {
  $('#chatLog').innerHTML = (project.chat || []).slice(-20).map((m) =>
    `<div class="msg ${m.role}">${m.role === 'user' ? '🧑 ' : '🤖 '}${(m.text || '').replace(/</g, '&lt;')}${m.attachments?.length ? `<br><span class="chip">${m.attachments.join(', ')}</span>` : ''}</div>`).join('');
  $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
}
$('#attachBtn').onclick = () => {
  const inp = $('#filePicker');
  inp.onchange = () => {
    attachments = [...inp.files];
    $('#attachList').innerHTML = attachments.map((f) => `<span class="chip">📎 ${f.name}</span>`).join('');
    inp.value = '';
  };
  inp.click();
};
async function sendChat() {
  const text = $('#chatInput').value.trim();
  if (!text && !attachments.length) return;
  const fd = new FormData();
  fd.append('message', text);
  for (const f of attachments) fd.append('files', f);
  $('#sendBtn').disabled = true;
  try {
    const res = await jfetch(`${api}/projects/${project.id}/chat`, { method: 'POST', body: fd });
    timeline = res.timeline;
    project.chat = res.chat;
    attachments = []; $('#attachList').innerHTML = ''; $('#chatInput').value = '';
    prepareAudio(); renderLayers(); renderTimeline(); renderProps(); renderChat();
    dirty = false; $('#saveBtn').textContent = 'Kaydet';
  } catch (e) { toast('Hata: ' + e.message, 6000); }
  $('#sendBtn').disabled = false;
}
$('#sendBtn').onclick = sendChat;
$('#chatInput').onkeydown = (e) => { if (e.key === 'Enter') sendChat(); };
document.querySelectorAll('.chips .chip').forEach((c) => {
  if (!c.textContent.startsWith('📎')) c.onclick = () => { $('#chatInput').value = c.textContent.replace(/^dosya ekleyip /, ''); };
});

/* --- açılış --- */
wireDrop($('#dropRef'), 'reference', 'video/*');
wireDrop($('#dropTarget'), 'target', 'video/*');
wireDrop($('#dropSfx'), 'sfx', 'audio/*');
$('#newProject').onclick = newProject;
$('#projectSelect').onchange = (e) => openProject(e.target.value);
document.querySelectorAll('#instrChips .chip').forEach((c) => {
  c.onclick = () => {
    const ta = $('#instruction');
    ta.value = (ta.value.trim() + '\n' + c.textContent).trim();
    ta.focus();
  };
});
window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
jfetch(`${api}/config`).then((c) => { $('#modeBadge').textContent = c.llm ? 'yerel + Claude API' : 'yerel (kural tabanlı)'; });
loadProjects();
