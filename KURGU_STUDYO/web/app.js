/* ==========================================================================
   KURGU STÜDYO — arayüz
   ========================================================================== */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let DURUM = null, PLAN = null, SECILI = null, SAHNE_HAZIR = false, EKLER = [];

const RENK = {
  altyazi: '#7FD1B9', liste_kart: '#FFC24B', uclu_vurgu: '#E2643C',
  karsitlik: '#C58BE0', kosul_sonuc: '#6FA8FF', hero_kart: '#FFD98A',
  ag_diyagram: '#8FE38F', marka: '#FF9E6B', cta: '#FFC24B',
  izleme_cubugu: '#5A6B63', gorsel: '#9FD4FF', ses: '#D9A2FF',
  tam_ekran_metin: '#FFE0A3'
};
const sn = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

/* ------------------------------------------------------------------ ağ -- */
async function api(y, o) { const r = await fetch(y, o); const j = await r.json(); if (j.hata) throw new Error(j.hata); return j; }

async function yukle(dosya, tur) {
  return api(`/api/yukle?tur=${tur}&ad=${encodeURIComponent(dosya.name)}`,
    { method: 'POST', body: dosya });
}

function perde(baslik) {
  $('#perdeBaslik').textContent = baslik;
  $('#perdeMesaj').textContent = '…'; $('#ilerleme').style.width = '0';
  $('#perde').classList.add('acik');
}
function perdeKapat() { $('#perde').classList.remove('acik'); }

async function isBekle(isId) {
  for (;;) {
    await new Promise(r => setTimeout(r, 500));
    const i = await api('/api/is?id=' + isId);
    $('#ilerleme').style.width = (i.oran * 100).toFixed(1) + '%';
    $('#perdeMesaj').textContent = i.mesaj || '';
    if (i.bitti) { perdeKapat(); if (i.hata) throw new Error(i.hata); return i.sonuc; }
  }
}

/* -------------------------------------------------------------- durum -- */
async function durumYenile() {
  DURUM = await api('/api/durum');
  cizListe('#listeRef', DURUM.referans, 'referans');
  cizListe('#listeHedef', DURUM.hedef ? [DURUM.hedef] : [], 'hedef');
  cizListe('#listeSfx', DURUM.sfx, 'sfx');
  $('#btnAnaliz').disabled = DURUM.referans.length < 1;
  $('#btnIsle').disabled = !DURUM.hedef;
  $('#btnIsle').textContent = DURUM.plan_var ? 'Yeniden kurgula' : 'Kurgula';
  cizProfil(DURUM.profil);
  const h = DURUM.hedef;
  $('#ustbilgi').textContent = h
    ? `${h.ad} · ${h.w}×${h.h} · ${h.dikey ? 'dikey' : 'yatay'} · ${sn(h.sure)}` +
      (DURUM.anahtar ? '' : '  ·  serbest komutlar için ANTHROPIC_API_KEY tanımlı değil')
    : 'Video bekleniyor';
  (DURUM.sohbet || []).forEach(m => { balon(m.ben, 'ben'); balon(m.sistem, 'sis'); });
  DURUM.sohbet = [];
  if (DURUM.plan_var && !PLAN) await planYukle();
}

function cizListe(sel, ogeler, tur) {
  const el = $(sel); el.innerHTML = '';
  ogeler.forEach(o => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="ad">${o.ad}</span>` +
      `<span class="et">${o.sure ? sn(o.sure) : ''}${o.dikey === true ? ' ↕' : (o.dikey === false ? ' ↔' : '')}</span>` +
      `<span class="x">✕</span>`;
    li.querySelector('.x').onclick = async () => {
      await api(`/api/sil?tur=${tur}&ad=${encodeURIComponent(o.ad)}`, { method: 'POST' });
      durumYenile();
    };
    el.appendChild(li);
  });
}

function cizProfil(pr) {
  const el = $('#profil');
  if (!pr || !pr.ozet) { el.innerHTML = ''; return; }
  const o = pr.ozet;
  el.innerHTML =
    `<b>${o.video_sayisi} video incelendi.</b><br>` +
    `Ritim: <b>${o.ritim}</b> (ort. plan ${o.ort_plan_sn ?? '–'} sn)<br>` +
    `Yazı yoğunluğu: <b>${o.metin}</b><br>` +
    `Kesimlerin %${Math.round((o.sese_kilitli_oran || 0) * 100)}'i sese kilitli<br>` +
    (o.aksan_adaylari || []).slice(0, 5).map(c =>
      `<span class="rozet"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c};margin-right:5px"></span>${c}</span>`).join('');
}

/* --------------------------------------------------------------- plan -- */
async function planYukle() {
  PLAN = await api('/api/plan');
  sahneKur();
  cizZaman();
  $('#btnExport').disabled = false;
  $('#btnOnizle').disabled = false;
}

async function planKaydet() {
  await fetch('/api/plan', { method: 'POST', body: JSON.stringify(PLAN) });
  sahnePlan(); cizZaman();
}

/* katmanlardaki yerel dosya yollarını tarayıcının görebileceği URL'e çevir */
function planWeb() {
  const p = JSON.parse(JSON.stringify(PLAN));
  p.katmanlar.forEach(k => {
    if (k.kaynak && !/^\/medya\?/.test(k.kaynak))
      k.kaynak = '/medya?yol=' + encodeURIComponent(k.kaynak);
  });
  return p;
}

/* -------------------------------------------------------------- sahne -- */
const vid = $('#vid'), kat = $('#kat');

function sahneKur() {
  const h = DURUM.hedef;
  vid.src = '/medya?yol=' + encodeURIComponent(h.yol);
  $('#cerceve').style.display = 'block';
  $('#bosperde').style.display = 'none';
  $('#cerceve').style.width = PLAN.W + 'px';
  $('#cerceve').style.height = PLAN.H + 'px';
  olcekle();
  vid.onloadedmetadata = () => { $('#tkToplam').textContent = sn(vid.duration); $('#cubuk').max = vid.duration; };
  if (SAHNE_HAZIR) sahnePlan();
}

function olcekle() {
  if (!PLAN) return;
  const alan = $('#sahnealan').getBoundingClientRect();
  const s = Math.min((alan.width - 28) / PLAN.W, (alan.height - 28) / PLAN.H);
  $('#cerceve').style.transform = `scale(${s})`;
}
window.addEventListener('resize', olcekle);

window.addEventListener('message', e => {
  if (e.data && e.data.tur === 'sahne_hazir') { SAHNE_HAZIR = true; if (PLAN) sahnePlan(); }
});
function sahnePlan() { if (SAHNE_HAZIR && PLAN) kat.contentWindow.postMessage({ tur: 'plan', plan: planWeb() }, '*'); }
function sahneZaman(t) { if (SAHNE_HAZIR) kat.contentWindow.postMessage({ tur: 'zaman', t }, '*'); }

$('#katGoster').onchange = e => { kat.style.display = e.target.checked ? '' : 'none'; };
$('#btnOynat').onclick = () => vid.paused ? vid.play() : vid.pause();
vid.onplay = () => $('#btnOynat').textContent = '❚❚';
vid.onpause = () => $('#btnOynat').textContent = '▶';
$('#cubuk').oninput = e => { vid.currentTime = +e.target.value; };

(function dongu() {
  if (PLAN && !isNaN(vid.currentTime)) {
    const t = vid.currentTime;
    sahneZaman(t);
    $('#tkSimdi').textContent = sn(t);
    if (!$('#cubuk').matches(':active')) $('#cubuk').value = t;
    const im = $('#imlec');
    if (im) im.style.left = (t / PLAN.dur * 100) + '%';
  }
  requestAnimationFrame(dongu);
})();

/* ------------------------------------------------------ zaman çizelgesi */
function cizZaman() {
  const el = $('#zaman'); el.innerHTML = '';
  if (!PLAN) return;
  PLAN.katmanlar.forEach((k, i) => {
    const s = document.createElement('div'); s.className = 'satir';
    s.innerHTML = `<div class="etiket" title="${k.ad || k.tip}">${i + 1}. ${k.ad || k.tip}</div>`;
    const ray = document.createElement('div'); ray.className = 'ray';
    const b = document.createElement('div');
    b.className = 'blok' + (SECILI === k.id ? ' secili' : '') + (k.gizli ? ' gizli' : '');
    b.style.left = (k.t0 / PLAN.dur * 100) + '%';
    b.style.width = Math.max(0.4, (k.t1 - k.t0) / PLAN.dur * 100) + '%';
    b.style.background = RENK[k.tip] || '#8d968f';
    b.textContent = k.tip.replace(/_/g, ' ');
    b.onclick = () => { SECILI = k.id; vid.currentTime = k.t0 + .05; cizZaman(); cizOzellik(); };
    ray.appendChild(b);
    if (i === 0) { const im = document.createElement('div'); im.className = 'imlec'; im.id = 'imlec'; ray.appendChild(im); }
    ray.onclick = e => { if (e.target === ray) vid.currentTime = (e.offsetX / ray.clientWidth) * PLAN.dur; };
    s.appendChild(ray); el.appendChild(s);
  });
}

/* ------------------------------------------------------------- özellik */
function cizOzellik() {
  const el = $('#ozellik');
  const k = PLAN && PLAN.katmanlar.find(x => x.id === SECILI);
  if (!k) { el.innerHTML = '<h2>Katman</h2><p class="ipucu">Zaman çizelgesinden bir katman seç.</p>'; return; }
  const alanlar = [];
  const metinAlan = (ad, etiket) => k[ad] !== undefined && k[ad] !== null ?
    `<div class="alan"><label>${etiket}</label><input data-a="${ad}" value="${String(k[ad]).replace(/"/g, '&quot;')}"></div>` : '';

  alanlar.push(`<div class="alan"><label>Ad</label><input data-a="ad" value="${k.ad || ''}"></div>`);
  alanlar.push(`<div class="alan ikili">
    <div style="flex:1"><label>Başlangıç (sn)</label><input data-a="t0" type="number" step="0.05" value="${k.t0}"></div>
    <div style="flex:1"><label>Bitiş (sn)</label><input data-a="t1" type="number" step="0.05" value="${k.t1}"></div></div>`);
  alanlar.push(metinAlan('kicker', 'Üst etiket'));
  alanlar.push(metinAlan('ust', 'Üst metin'));
  alanlar.push(metinAlan('alt', 'Alt metin'));
  alanlar.push(metinAlan('metin', 'Metin'));
  alanlar.push(metinAlan('eylem', 'Eylem'));
  alanlar.push(metinAlan('seviye', 'Ses seviyesi (0–1.5)'));
  if (k.tip === 'gorsel') {
    alanlar.push(`<div class="alan ikili">
      <div style="flex:1"><label>X (0–1)</label><input data-a="x" type="number" step="0.01" value="${k.x ?? .25}"></div>
      <div style="flex:1"><label>Y (0–1)</label><input data-a="y" type="number" step="0.01" value="${k.y ?? .4}"></div></div>
      <div class="alan"><label>Genişlik (0–1)</label><input data-a="w" type="number" step="0.01" value="${k.w ?? .5}"></div>`);
  }
  if (k.tip === 'altyazi') {
    alanlar.push(`<div class="alan ikili">
      <div style="flex:1"><label>Punto</label><input data-a="punto" type="number" value="${k.punto || 46}"></div>
      <div style="flex:1"><label>Y (0–1)</label><input data-a="y" type="number" step="0.005" value="${k.y || .685}"></div></div>`);
  }
  if (k.satirlar) {
    alanlar.push('<div class="alan"><label>Satırlar (her satır ayrı)</label><textarea data-satir>' +
      k.satirlar.map(s => s.metin).join('\n') + '</textarea></div>');
  }
  if (k.gruplar) {
    alanlar.push(`<p class="ipucu">${k.gruplar.length} altyazı grubu. Metni düzeltmek için sohbete
      “<i>filanca</i> yazısını <i>falanca</i> yap” yaz.</p>`);
  }
  el.innerHTML = `<h2>${k.tip.replace(/_/g, ' ')}</h2>` + alanlar.join('') +
    `<div class="dugmeler">
       <button class="mini" id="ozUygula">Uygula</button>
       <button class="mini ikincil" id="ozGizle">${k.gizli ? 'Göster' : 'Gizle'}</button>
       <button class="mini ikincil" id="ozSil">Sil</button>
     </div>`;

  $('#ozUygula').onclick = () => {
    el.querySelectorAll('[data-a]').forEach(i => {
      const a = i.dataset.a;
      k[a] = i.type === 'number' ? parseFloat(i.value) : i.value;
    });
    const ta = el.querySelector('[data-satir]');
    if (ta) {
      const yeni = ta.value.split('\n').filter(x => x.trim());
      k.satirlar = yeni.map((m, i) => Object.assign({}, k.satirlar[i] || k.satirlar[0], { metin: m }));
    }
    planKaydet();
  };
  $('#ozGizle').onclick = () => { k.gizli = !k.gizli; planKaydet(); cizOzellik(); };
  $('#ozSil').onclick = () => {
    PLAN.katmanlar = PLAN.katmanlar.filter(x => x.id !== k.id);
    SECILI = null; planKaydet(); cizOzellik();
  };
}

/* ------------------------------------------------------------ yüklemeler */
function birakBagla(kutuSel, girdiSel, tur, coklu) {
  const kutu = $(kutuSel), girdi = $(girdiSel);
  kutu.onclick = () => girdi.click();
  girdi.onchange = () => gonderDosyalar([...girdi.files], tur);
  ['dragover', 'dragenter'].forEach(e => kutu.addEventListener(e, ev => {
    ev.preventDefault(); kutu.classList.add('uzerinde');
  }));
  ['dragleave', 'drop'].forEach(e => kutu.addEventListener(e, ev => {
    ev.preventDefault(); kutu.classList.remove('uzerinde');
  }));
  kutu.addEventListener('drop', ev => gonderDosyalar([...ev.dataTransfer.files], tur));
}

async function gonderDosyalar(dosyalar, tur) {
  if (!dosyalar.length) return;
  if (tur === 'referans' && DURUM.referans.length + dosyalar.length > 10)
    dosyalar = dosyalar.slice(0, 10 - DURUM.referans.length);
  if (tur === 'hedef') dosyalar = dosyalar.slice(0, 1);
  perde('Dosya yükleniyor');
  try {
    for (let i = 0; i < dosyalar.length; i++) {
      $('#perdeMesaj').textContent = dosyalar[i].name;
      $('#ilerleme').style.width = (i / dosyalar.length * 100) + '%';
      await yukle(dosyalar[i], tur);
    }
  } catch (e) { alert('Yükleme hatası: ' + e.message); }
  perdeKapat();
  await durumYenile();
}

birakBagla('#birakRef', '#dosRef', 'referans', true);
birakBagla('#birakHedef', '#dosHedef', 'hedef', false);
birakBagla('#birakSfx', '#dosSfx', 'sfx', true);

/* ------------------------------------------------------------- eylemler */
$('#btnAnaliz').onclick = async () => {
  perde('Örnek videoların tarzı çıkarılıyor');
  try { await isBekle((await api('/api/analiz', { method: 'POST' })).is); await durumYenile(); }
  catch (e) { perdeKapat(); alert(e.message); }
};

$('#btnIsle').onclick = async () => {
  perde('Video kurgulanıyor');
  try {
    await isBekle((await api('/api/isle', { method: 'POST' })).is);
    PLAN = null; await durumYenile(); await planYukle();
    balon('Kurgu hazır: ' + PLAN.katmanlar.length + ' katman. Aşağıdan istediğini değiştirebilirsin.', 'sis');
  } catch (e) { perdeKapat(); alert(e.message); }
};

$('#btnOnizle').onclick = async () => {
  const t = Math.max(0, vid.currentTime - 1);
  perde('6 saniyelik önizleme basılıyor');
  try {
    const r = await isBekle((await api('/api/render?hizli=1&t=' + t.toFixed(2), { method: 'POST' })).is);
    window.open('/medya?yol=' + encodeURIComponent(r.yol), '_blank');
  } catch (e) { perdeKapat(); alert(e.message); }
};

$('#btnExport').onclick = async () => {
  perde('Video basılıyor (bu biraz sürer)');
  try {
    const r = await isBekle((await api('/api/render', { method: 'POST' })).is);
    balon('Hazır: ' + r.ad, 'sis');
    const a = document.createElement('a');
    a.href = '/indir?yol=' + encodeURIComponent(r.yol);
    a.download = r.ad; a.click();
  } catch (e) { perdeKapat(); alert(e.message); }
};

/* -------------------------------------------------------------- sohbet */
function balon(metin, sinif) {
  if (!metin) return;
  const d = document.createElement('div');
  d.className = 'balon ' + sinif; d.textContent = metin;
  $('#sohbet').appendChild(d);
  $('#sohbet').scrollTop = 1e9;
}

$('#btnEk').onclick = () => $('#dosEk').click();
$('#dosEk').onchange = async () => {
  const ds = [...$('#dosEk').files];
  for (const f of ds) {
    await yukle(f, 'ek');
    EKLER.push(f.name);
  }
  cizEkler();
};
function cizEkler() {
  $('#ekler').innerHTML = EKLER.map((a, i) =>
    `<span class="cip">${a}<i data-i="${i}">✕</i></span>`).join('');
  $$('#ekler i').forEach(i => i.onclick = () => { EKLER.splice(+i.dataset.i, 1); cizEkler(); });
}

const metin = $('#metin');
metin.addEventListener('input', () => {
  metin.style.height = 'auto'; metin.style.height = Math.min(110, metin.scrollHeight) + 'px';
});
metin.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gonder(); }
});
$('#btnGonder').onclick = gonder;

async function gonder() {
  const m = metin.value.trim();
  if (!m && !EKLER.length) return;
  if (!PLAN) { balon('Önce videoyu kurgula.', 'sis hata'); return; }
  balon(m + (EKLER.length ? '  [' + EKLER.join(', ') + ']' : ''), 'ben');
  metin.value = ''; metin.style.height = 'auto';
  const ekler = EKLER.slice(); EKLER = []; cizEkler();
  try {
    const r = await api('/api/sohbet', { method: 'POST', body: JSON.stringify({ metin: m, ekler, secili: SECILI }) });
    balon(r.mesaj, r.degisti ? 'sis' : 'sis hata');
    if (r.plan) { PLAN = r.plan; sahnePlan(); cizZaman(); cizOzellik(); }
  } catch (e) { balon(e.message, 'sis hata'); }
}

/* ------------------------------------------------------------------ açılış */
durumYenile().catch(e => console.error(e));
