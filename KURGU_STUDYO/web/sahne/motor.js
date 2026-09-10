/* =========================================================================
   KURGU STÜDYO — sahne motoru
   Tek bir plan (JSON) alır, verilen t anında bütün katmanları çizer.
   Aynı motor hem canlı önizlemede hem export'ta kullanılır.
   ========================================================================= */

const E = {
  lin: t => t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  outQuart: t => 1 - Math.pow(1 - t, 4),
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
};
function p(t, start, dur, ease) {
  if (dur <= 0) return t >= start ? 1 : 0;
  let u = (t - start) / dur; u = Math.max(0, Math.min(1, u));
  return (ease || E.outCubic)(u);
}
function set(el, o) {
  const s = el.style, tr = [];
  if (o.x !== undefined || o.y !== undefined) tr.push(`translate3d(${(o.x || 0).toFixed(2)}px,${(o.y || 0).toFixed(2)}px,0)`);
  if (o.s !== undefined) tr.push(`scale(${o.s.toFixed(4)})`);
  if (o.r !== undefined) tr.push(`rotate(${o.r.toFixed(3)}deg)`);
  if (tr.length) s.transform = tr.join(' ');
  if (o.o !== undefined) s.opacity = Math.max(0, Math.min(1, o.o)).toFixed(4);
  if (o.blur !== undefined) s.filter = o.blur > 0.02 ? `blur(${o.blur.toFixed(2)}px)` : 'none';
  if (o.clip !== undefined) s.clipPath = `inset(0 ${(100 - o.clip * 100).toFixed(2)}% 0 0 round ${o.clipR || 0}px)`;
}
function rise(t, at, o) {
  o = o || {};
  const u = p(t, at, o.dur === undefined ? 0.42 : o.dur, o.ease || E.outQuart);
  return { o: u, y: (o.dy === undefined ? 24 : o.dy) * (1 - u), blur: (o.blur === undefined ? 8 : o.blur) * (1 - u) };
}
function drift(t, at, vy) { return Math.max(0, t - at) * (vy === undefined ? 1 : vy); }
function stroke(el, t, at, dur, ease) {
  const L = el.getTotalLength ? el.getTotalLength() : 0;
  el.style.strokeDasharray = L;
  el.style.strokeDashoffset = L * (1 - p(t, at, dur, ease || E.outCubic));
}

/* ---------------------------------------------------------------- kurulum */
const MOTOR = {
  plan: null, stage: null, W: 720, H: 1280, u: 1,
  katmanlar: [],        // {veri, kok, ciz(t)}
  mod: 'onizleme'       // 'onizleme' | 'render'
};

function kur(stage, plan, mod) {
  MOTOR.stage = stage;
  MOTOR.plan = plan;
  MOTOR.mod = mod || 'onizleme';
  MOTOR.W = plan.W; MOTOR.H = plan.H;
  MOTOR.u = plan.W / 720;                  // tipografi ölçeği
  stage.innerHTML = '';
  stage.style.width = plan.W + 'px';
  stage.style.height = plan.H + 'px';
  const S = plan.stil;
  for (const k in S.renk) stage.style.setProperty('--' + k, S.renk[k]);
  stage.style.setProperty('--font', S.font || 'Outfit');
  stage.style.setProperty('--fontVurgu', S.fontVurgu || 'LoraI');

  MOTOR.katmanlar = [];
  // altyazı zemini her zaman en altta
  const alt = plan.katmanlar.filter(k => k.tip === 'altyazi');
  if (alt.length && plan.stil.altyaziZemini !== false) {
    MOTOR.katmanlar.push(yapAltyaziZemin(alt[0]));
  }
  for (const k of plan.katmanlar) {
    if (k.gizli) continue;
    const f = SABLON[k.tip];
    if (!f) { console.warn('bilinmeyen şablon', k.tip); continue; }
    try { MOTOR.katmanlar.push(f(k)); } catch (e) { console.error(k.tip, e); }
  }
  sigdirHepsi();
  ciz(0);
}

/* Tek satırlık metinler kadraja sığmıyorsa puntoyu küçült.
   Bütün şablonlar için tek yerden çözüm — metin taşması olmaz. */
function sigdirHepsi() {
  for (const k of MOTOR.katmanlar) {
    k.kok.querySelectorAll('.el').forEach(e => {
      if (!e.textContent || getComputedStyle(e).whiteSpace !== 'nowrap') return;
      const sol = parseFloat(e.style.left) || 0;
      const enFazla = MOTOR.W - sol - X(0.055);
      let fs = parseFloat(getComputedStyle(e).fontSize);
      let sayac = 0;
      while (e.scrollWidth > enFazla && fs > 10 && sayac++ < 60) {
        fs *= 0.955;
        e.style.fontSize = fs.toFixed(2) + 'px';
      }
    });
  }
}
function ciz(t) {
  for (const k of MOTOR.katmanlar) {
    const gorunur = t >= k.veri.t0 - 0.05 && t <= k.veri.t1 + 0.05;
    k.kok.style.display = gorunur ? '' : 'none';
    if (gorunur) k.ciz(t - k.veri.t0, t);
  }
}

/* ------------------------------------------------------------- yardımcılar */
function U(v) { return v * MOTOR.u; }                    // tipografi/boyut ölçeği
function X(f) { return f * MOTOR.W; }                    // yatay oran
function Y(f) { return f * MOTOR.H; }                    // dikey oran
function mk(kok, cls, html, css) {
  const e = document.createElement('div');
  e.className = 'el ' + (cls || '');
  if (html !== undefined && html !== null) e.innerHTML = html;
  if (css) Object.assign(e.style, css);
  kok.appendChild(e); return e;
}
function kokKat(veri) {
  const d = document.createElement('div');
  d.className = 'kat';
  d.dataset.id = veri.id;
  MOTOR.stage.appendChild(d);
  return d;
}
function svgIn(kok, w, h, css) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('width', w); s.setAttribute('height', h);
  s.setAttribute('viewBox', `0 0 ${w} ${h}`); s.classList.add('el');
  Object.assign(s.style, css || {}); kok.appendChild(s); return s;
}
function pathIn(sv, d, color, w) {
  const q = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  q.setAttribute('d', d); q.setAttribute('fill', 'none');
  q.setAttribute('stroke', color); q.setAttribute('stroke-width', w);
  q.setAttribute('stroke-linecap', 'round'); sv.appendChild(q); return q;
}
function renk(ad) { return MOTOR.plan.stil.renk[ad]; }

/* kâğıt kart / mürekkep kart ortak stilleri */
function kagitKart() {
  return {
    background: 'rgba(247,244,237,.955)', border: '1px solid rgba(14,19,17,.10)',
    borderRadius: U(20) + 'px', boxShadow: `0 ${U(18)}px ${U(44)}px rgba(0,0,0,.38)`,
    color: renk('ink'), padding: `${U(18)}px ${U(28)}px`, display: 'inline-flex',
    alignItems: 'center', gap: U(14) + 'px', fontWeight: 700, whiteSpace: 'nowrap'
  };
}
function mureKart() {
  return {
    background: 'rgba(14,19,17,.90)', border: '1px solid rgba(255,255,255,.15)',
    borderRadius: U(20) + 'px', boxShadow: `0 ${U(20)}px ${U(50)}px rgba(0,0,0,.5)`,
    color: renk('paper'), padding: `${U(18)}px ${U(28)}px`, display: 'inline-flex',
    alignItems: 'center', gap: U(14) + 'px', fontWeight: 700, whiteSpace: 'nowrap'
  };
}
/* buzlu cam: önizlemede backdrop-filter, export'ta kare görüntüsü gömülü */
function buzluCam(kok, x, y, w, h, r, blur, parlak) {
  const box = mk(kok, '', null, {
    left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px',
    borderRadius: (r || U(24)) + 'px', overflow: 'hidden',
    border: '1px solid rgba(255,255,255,.17)',
    boxShadow: `0 ${U(26)}px ${U(64)}px rgba(0,0,0,.46)`, transformOrigin: '50% 50%'
  });
  if (MOTOR.mod === 'onizleme') {
    box.style.backdropFilter = `blur(${blur}px) saturate(.8) brightness(${parlak})`;
    box.style.webkitBackdropFilter = box.style.backdropFilter;
  } else {
    const img = document.createElement('img');
    img.className = 'plaka';
    img.style.cssText = `position:absolute;left:${-x}px;top:${-y}px;width:${MOTOR.W}px;height:${MOTOR.H}px;` +
      `filter:blur(${blur}px) saturate(.8) brightness(${parlak});`;
    box.appendChild(img);
  }
  const tint = document.createElement('div');
  tint.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;' +
    'background:linear-gradient(180deg,rgba(9,13,11,.30),rgba(9,13,11,.46))';
  box.appendChild(tint);
  const sheen = document.createElement('div');
  sheen.style.cssText = 'position:absolute;left:0;top:0;right:0;height:1px;' +
    'background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.34),rgba(255,255,255,0))';
  box.appendChild(sheen);
  return box;
}
/* tam ekran kâğıt zemin */
function kagitZemin(kok) {
  const wrap = mk(kok, '', null, {
    left: '0px', top: '0px', width: MOTOR.W + 'px', height: MOTOR.H + 'px',
    overflow: 'hidden', transformOrigin: '50% 50%'
  });
  const add = css => { const d = document.createElement('div'); d.style.cssText = css; wrap.appendChild(d); return d; };
  add(`position:absolute;left:${-U(60)}px;top:${-U(60)}px;right:${-U(60)}px;bottom:${-U(60)}px;` +
    'background:radial-gradient(115% 75% at 50% 16%,#FFFFFF 0%,#F7F3EA 40%,#EFE8DA 74%,#E4DBC9 100%)');
  const grid = add(`position:absolute;left:${-U(80)}px;top:${-U(80)}px;right:${-U(80)}px;bottom:${-U(80)}px;opacity:.06;` +
    'background-image:linear-gradient(#0E1311 1px,transparent 1px),linear-gradient(90deg,#0E1311 1px,transparent 1px);' +
    `background-size:${U(64)}px ${U(64)}px`);
  const blob = add(`position:absolute;width:${U(760)}px;height:${U(760)}px;border-radius:50%;` +
    'background:radial-gradient(circle,rgba(255,194,75,.34),rgba(255,194,75,0) 66%)');
  add(`position:absolute;left:0;top:0;right:0;bottom:0;box-shadow:inset 0 0 ${U(200)}px rgba(24,20,14,.17)`);
  return { wrap, grid, blob };
}
function zeminCiz(z, t) {
  z.wrap.style.transform = `scale(${(1.018 - 0.018 * p(t, 0, 0.9, E.outCubic) + 0.008 * t).toFixed(4)})`;
  z.grid.style.transform = `translate(${(-t * 7).toFixed(1)}px,${(-t * 5).toFixed(1)}px)`;
  z.blob.style.left = (U(60) + Math.sin(t * 0.5) * U(46)).toFixed(1) + 'px';
  z.blob.style.top = (Y(0.20) + Math.cos(t * 0.4) * U(60)).toFixed(1) + 'px';
}
/* giriş/çıkış zarfı */
function zarf(t, dur, tin, tout) {
  return Math.min(p(t, 0, tin === undefined ? 0.12 : tin, E.outCubic),
    1 - p(t, dur - (tout === undefined ? 0.30 : tout), tout === undefined ? 0.30 : tout, E.outCubic));
}

/* ========================================================================
   ŞABLONLAR
   Her şablon: (veri) => { veri, kok, ciz(yerelT, globalT) }
   ======================================================================== */
const SABLON = {};

/* --- ALTYAZI ----------------------------------------------------------- */
SABLON.altyazi = veri => {
  const kok = kokKat(veri);
  const CY = Y(veri.y === undefined ? 0.685 : veri.y);
  const boy = U(veri.punto || 46);
  const kutu = mk(kok, '', null, {
    left: X(0.055) + 'px', top: (CY - U(80)) + 'px', width: X(0.89) + 'px', height: U(160) + 'px'
  });
  const dugumler = (veri.gruplar || []).map(g => {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:0;top:50%;width:${X(0.89)}px;text-align:center;` +
      `font-weight:700;font-size:${boy}px;line-height:1.16;color:${renk('paper')};opacity:0;` +
      `text-shadow:0 ${U(2)}px ${U(10)}px rgba(0,0,0,.85),0 ${U(6)}px ${U(30)}px rgba(0,0,0,.6);`;
    d.innerHTML = (g.k || []).map(w => w.v
      ? `<span style="font-family:var(--fontVurgu);font-style:italic;color:${renk('amber')};font-size:1.04em">${w.t}</span>`
      : `<span>${w.t}</span>`).join(' ');
    kutu.appendChild(d); return d;
  });
  return {
    veri, kok, ciz: (lt, gt) => {
      (veri.gruplar || []).forEach((g, i) => {
        const n = dugumler[i];
        if (gt < g.s - 0.02 || gt > g.e + 0.02) { n.style.opacity = '0'; return; }
        const ip = p(gt, g.s, 0.15, E.outQuart);
        const op = 1 - p(gt, g.e - 0.11, 0.11, E.outCubic);
        const dy = Math.max(0, gt - g.s) * U(7);
        n.style.opacity = Math.min(ip, op).toFixed(3);
        n.style.filter = ip < 0.995 ? `blur(${(U(7) * (1 - ip)).toFixed(2)}px)` : 'none';
        n.style.transform = `translateY(calc(-50% + ${(dy + U(14) * (1 - ip)).toFixed(2)}px))`;
      });
    }
  };
};
function yapAltyaziZemin(altVeri) {
  const veri = { id: '_altyazi_zemin', tip: '_zemin', t0: altVeri.t0, t1: altVeri.t1 };
  const kok = kokKat(veri);
  const CY = Y(altVeri.y === undefined ? 0.685 : altVeri.y);
  const SH = U(224);
  const band = mk(kok, '', null, {
    left: '0px', top: (CY - SH / 2) + 'px', width: MOTOR.W + 'px', height: SH + 'px',
    background: 'linear-gradient(180deg, rgba(6,9,8,0) 0%, rgba(6,9,8,.20) 14%, rgba(6,9,8,.46) 34%,' +
      ' rgba(6,9,8,.56) 50%, rgba(6,9,8,.46) 66%, rgba(6,9,8,.20) 86%, rgba(6,9,8,0) 100%)'
  });
  return {
    veri, kok, ciz: (lt, gt) => {
      let o = 0;
      for (const g of (altVeri.gruplar || [])) {
        if (gt < g.s - 0.02 || gt > g.e + 0.02) continue;
        o = Math.max(o, Math.min(p(gt, g.s, 0.15, E.outQuart), 1 - p(gt, g.e - 0.11, 0.11, E.outCubic)));
      }
      band.style.opacity = o.toFixed(3);
    }
  };
}

/* --- LİSTE KART (kâğıt kartlar, isteğe bağlı üstü çizili) --------------- */
SABLON.liste_kart = veri => {
  const kok = kokKat(veri);
  const d = veri.t1 - veri.t0;
  const sat = veri.satirlar || [];
  const Y0 = Y(veri.y === undefined ? 0.38 : veri.y), GAP = U(112), Xl = X(0.08);
  const els = sat.map((r, i) => mk(kok, '',
    (r.ust ? `<span style="font-size:${U(26)}px;opacity:.42">${r.ust}</span>` : '') +
    `<span style="font-size:${U(r.punto || 46)}px">${r.metin}</span>`,
    Object.assign(kagitKart(), { left: Xl + 'px', top: (Y0 + i * GAP) + 'px', transformOrigin: '0% 50%' })));
  const sv = svgIn(kok, MOTOR.W, U(420), { left: '0px', top: (Y0 - U(14)) + 'px' });
  const cizgiler = sat.map(() => pathIn(sv, 'M 0 0 L 1 0', renk('clay'), U(7)));
  let olcum = false;
  const ciz0 = veri.cizgiT;                       // üstünü çizme anı (opsiyonel)
  return {
    veri, kok, ciz: (t) => {
      if (!olcum) {
        els.forEach((e, i) => {
          const w = e.offsetWidth || U(260), h = e.offsetHeight || U(88);
          cizgiler[i].setAttribute('d', `M ${Xl - U(12)} ${U(14) + i * GAP + h / 2} L ${Xl + w + U(12)} ${U(14) + i * GAP + h / 2}`);
        });
        olcum = true;
      }
      const kill = ciz0 !== undefined ? p(t, ciz0 - veri.t0, 0.70, E.outQuart) : 0;
      const out = 1 - p(t, d - 0.50, 0.50, E.outCubic);
      els.forEach((e, i) => {
        const at = (sat[i].t || veri.t0) - veri.t0;
        const a = rise(t, at, { dy: U(24), blur: U(7), dur: 0.44 });
        set(e, { o: a.o * (1 - 0.60 * kill) * out, y: a.y + drift(t, at, U(1.6)), x: -U(6) * kill, s: 1 - 0.025 * kill, blur: a.blur + U(2.2) * kill });
      });
      if (ciz0 !== undefined) {
        cizgiler.forEach((s, i) => stroke(s, t, ciz0 - veri.t0 + i * 0.10, 0.42, E.outQuart));
        sv.style.opacity = (out * Math.min(1, p(t, ciz0 - veri.t0, 0.05, E.lin))).toFixed(3);
      } else sv.style.opacity = '0';
    }
  };
};

/* --- ÜÇLÜ VURGU (mürekkep kartlar + isteğe bağlı sonuç pill'i) ---------- */
SABLON.uclu_vurgu = veri => {
  const kok = kokKat(veri);
  const d = veri.t1 - veri.t0;
  const it = veri.satirlar || [];
  const Y0 = Y(veri.y === undefined ? 0.37 : veri.y), GAP = U(98), Xl = X(0.08);
  const els = it.map((r, i) => mk(kok, '',
    `<span style="width:${U(10)}px;height:${U(10)}px;border-radius:50%;background:${renk('amber')};display:inline-block;box-shadow:0 0 ${U(14)}px rgba(255,194,75,.8)"></span>` +
    `<span style="font-size:${U(r.punto || 38)}px">${r.metin}</span>`,
    Object.assign(mureKart(), { left: Xl + 'px', top: (Y0 + i * GAP) + 'px', padding: `${U(16)}px ${U(28)}px`, transformOrigin: '0% 50%' })));
  let pill = null;
  if (veri.sonuc) {
    pill = mk(kok, '', veri.sonuc.metin, {
      left: Xl + 'px', top: (Y0 + it.length * GAP + U(20)) + 'px',
      padding: `${U(14)}px ${U(26)}px`, background: renk('amber'), borderRadius: U(18) + 'px',
      fontSize: U(42) + 'px', fontWeight: 700, color: renk('ink'), whiteSpace: 'nowrap',
      boxShadow: `0 ${U(20)}px ${U(48)}px rgba(196,140,40,.34)`, transformOrigin: '0% 50%'
    });
  }
  return {
    veri, kok, ciz: (t) => {
      const out = 1 - p(t, d - 0.55, 0.55, E.outCubic);
      els.forEach((e, i) => {
        const at = (it[i].t || veri.t0) - veri.t0;
        const a = rise(t, at, { dy: U(26), blur: U(9), dur: 0.42 });
        const pop = 1 + 0.04 * (1 - p(t, at, 0.34, E.outBack));
        set(e, { o: a.o * out, y: a.y + drift(t, at, U(0.8)), s: pop, blur: a.blur });
      });
      if (pill) {
        const at = (veri.sonuc.t || veri.t1 - 1) - veri.t0;
        const w = p(t, at, 0.44, E.outQuart);
        set(pill, { o: (w > 0 ? 1 : 0) * out, y: drift(t, at, U(0.7)) + U(12) * (1 - w), clip: w, clipR: U(18) });
      }
    }
  };
};

/* --- KARŞITLIK (üstü çizili → vurgulu) --------------------------------- */
SABLON.karsitlik = veri => {
  const kok = kokKat(veri);
  const d = veri.t1 - veri.t0;
  const tam = veri.tamEkran;
  const z = tam ? kagitZemin(kok) : null;
  const panel = tam ? null : buzluCam(kok, X(0.06), Y(0.365), X(0.878), Y(0.245), U(26), U(20), 0.42);
  const c1 = tam ? renk('ink') : renk('paper');
  const soluk = tam ? 'rgba(14,19,17,.34)' : 'rgba(247,244,237,.55)';
  const vurgu = tam ? renk('amberKoyu') : renk('amber');
  const kick = veri.kicker ? mk(kok, '', veri.kicker, {
    left: X(0.111) + 'px', top: Y(tam ? 0.345 : 0.395) + 'px', fontSize: U(22) + 'px',
    fontWeight: 700, letterSpacing: '.18em', color: tam ? 'rgba(14,19,17,.45)' : renk('amber')
  }) : null;
  const l1 = mk(kok, '', veri.ust, {
    left: X(0.111) + 'px', top: Y(tam ? 0.42 : 0.431) + 'px', fontSize: U(veri.ustPunto || 50) + 'px',
    fontWeight: 700, color: soluk, whiteSpace: 'nowrap', transformOrigin: '0% 50%'
  });
  const sv = svgIn(kok, MOTOR.W, U(140), { left: '0px', top: Y(tam ? 0.41 : 0.422) + 'px' });
  const st = pathIn(sv, 'M 0 0 L 1 0', tam ? renk('clayKoyu') : renk('clay'), U(7));
  const bloklu = !!veri.blok;
  const l2 = mk(kok, '', veri.alt, bloklu ? {
    left: X(0.08) + 'px', top: Y(0.5) + 'px', padding: `${U(10)}px ${U(22)}px`,
    background: renk('amber'), borderRadius: U(14) + 'px', fontSize: U(veri.altPunto || 76) + 'px',
    fontWeight: 700, color: renk('ink'), whiteSpace: 'nowrap', transformOrigin: '0% 50%',
    boxShadow: `0 ${U(18)}px ${U(44)}px rgba(196,140,40,.30)`
  } : {
    left: X(0.111) + 'px', top: Y(tam ? 0.5 : 0.512) + 'px', fontSize: U(veri.altPunto || 62) + 'px',
    fontWeight: 700, color: vurgu, whiteSpace: 'nowrap', transformOrigin: '0% 50%'
  });
  const l3 = veri.son ? mk(kok, '', veri.son, {
    left: X(0.111) + 'px', top: Y(0.617) + 'px', fontSize: U(veri.sonPunto || 62) + 'px',
    fontWeight: 700, color: c1, whiteSpace: 'nowrap'
  }) : null;
  let olcum = false;
  const tUst = (veri.tUst || veri.t0 + 0.2) - veri.t0;
  const tCizgi = (veri.tCizgi || veri.t0 + 0.55) - veri.t0;
  const tAlt = (veri.tAlt || veri.t0 + 0.85) - veri.t0;
  const tSon = (veri.tSon || veri.t0 + 1.5) - veri.t0;
  return {
    veri, kok, ciz: (t) => {
      if (!olcum) { const w = l1.offsetWidth || U(480); st.setAttribute('d', `M ${X(0.10)} ${U(44)} L ${X(0.111) + w + U(8)} ${U(44)}`); olcum = true; }
      const zf = zarf(t, d, 0.12, 0.30);
      if (z) { z.wrap.style.opacity = zf.toFixed(3); zeminCiz(z, t); }
      if (panel) { const ip = p(t, 0.06, 0.42, E.outQuart); set(panel, { o: ip * (1 - p(t, d - 0.50, 0.50, E.outCubic)), y: U(16) * (1 - ip), s: 0.985 + 0.015 * ip }); }
      const out = z ? zf : 1 - p(t, d - 0.50, 0.50, E.outCubic);
      if (kick) { const a = rise(t, 0.16, { dy: U(10), blur: U(4), dur: 0.36 }); set(kick, { o: a.o * out * (tam ? 0.45 : 1), y: a.y, blur: a.blur }); }
      const b = rise(t, tUst, { dy: U(20), blur: U(8), dur: 0.44 });
      set(l1, { o: b.o * out, y: b.y + drift(t, tUst, U(0.9)), blur: b.blur });
      stroke(st, t, tCizgi, 0.36, E.outQuart);
      sv.style.opacity = (out * Math.min(1, p(t, tCizgi, 0.04, E.lin))).toFixed(3);
      if (bloklu) {
        const w = p(t, tAlt, 0.46, E.outQuart);
        set(l2, { o: (w > 0 ? 1 : 0) * out, y: drift(t, tAlt, U(0.9)) + U(10) * (1 - w), clip: w, clipR: U(14) });
      } else {
        const c = rise(t, tAlt, { dy: U(30), blur: U(11), dur: 0.46 });
        const pop = 1 + 0.045 * (1 - p(t, tAlt, 0.40, E.outBack));
        set(l2, { o: c.o * out, y: c.y + drift(t, tAlt, U(1.2)), s: pop, blur: c.blur });
      }
      if (l3) { const c = rise(t, tSon, { dy: U(20), blur: U(8), dur: 0.38 }); set(l3, { o: c.o * out, y: c.y, blur: c.blur }); }
    }
  };
};

/* --- KOŞUL → SONUÇ (satır başına buzlu cam panel) ---------------------- */
SABLON.kosul_sonuc = veri => {
  const kok = kokKat(veri);
  const d = veri.t1 - veri.t0;
  const rows = veri.satirlar || [];
  const PX = X(0.067), PW = X(0.867), PH = U(86), Y0 = Y(0.369), GAP = U(104);
  const paneller = rows.map((r, i) => buzluCam(kok, PX, Y0 + i * GAP, PW, PH, U(20), U(18), 0.40));
  const L = rows.map((r, i) => mk(kok, '', r.sol, {
    left: (PX + U(28)) + 'px', top: (Y0 + i * GAP + U(27)) + 'px', fontSize: U(29) + 'px',
    fontWeight: 700, color: 'rgba(247,244,237,.68)', whiteSpace: 'nowrap'
  }));
  const R = rows.map((r, i) => mk(kok, '', r.sag, {
    left: '0px', top: (Y0 + i * GAP + U(24)) + 'px', fontSize: U(33) + 'px',
    fontWeight: 700, color: renk('amber'), whiteSpace: 'nowrap'
  }));
  const sv = svgIn(kok, MOTOR.W, U(380), { left: '0px', top: Y0 + 'px' });
  const oklar = rows.map(() => pathIn(sv, 'M 0 0 L 1 0', renk('amber'), U(4)));
  let olcum = false;
  return {
    veri, kok, ciz: (t) => {
      if (!olcum) {
        rows.forEach((r, i) => {
          const rw = R[i].offsetWidth || U(190);
          R[i].style.left = (PX + PW - U(28) - rw) + 'px';
          const x0 = PX + U(28) + (L[i].offsetWidth || U(190)) + U(22), x1 = PX + PW - U(28) - rw - U(22), cy = i * GAP + PH / 2;
          oklar[i].setAttribute('d', `M ${x0} ${cy} L ${x1} ${cy} M ${x1 - U(13)} ${cy - U(8)} L ${x1} ${cy} L ${x1 - U(13)} ${cy + U(8)}`);
        });
        olcum = true;
      }
      const out = 1 - p(t, d - 0.50, 0.50, E.outCubic);
      rows.forEach((r, i) => {
        const at = (r.t || veri.t0) - veri.t0;
        const ip = p(t, at, 0.40, E.outQuart), dy = drift(t, at, U(0.7));
        set(paneller[i], { o: ip * out, y: U(18) * (1 - ip) + dy, x: -U(10) * (1 - ip) });
        const a = rise(t, at + 0.10, { dy: U(12), blur: U(6), dur: 0.38 });
        set(L[i], { o: a.o * out * 0.68 / (a.o ? 1 : 1), y: a.y + dy, blur: a.blur });
        L[i].style.opacity = (a.o * out * 0.68).toFixed(3);
        const b = rise(t, at + 0.34, { dy: U(12), blur: U(6), dur: 0.38 });
        set(R[i], { o: b.o * out, y: b.y + dy, blur: b.blur });
        stroke(oklar[i], t, at + 0.26, 0.34, E.outQuart);
        oklar[i].style.transform = `translateY(${(U(18) * (1 - ip) + dy).toFixed(2)}px)`;
        oklar[i].style.opacity = (ip * out).toFixed(3);
      });
      sv.style.opacity = out.toFixed(3);
    }
  };
};

/* --- HERO KART (tam ekran kâğıt, satır satır) -------------------------- */
SABLON.hero_kart = veri => {
  const kok = kokKat(veri);
  const d = veri.t1 - veri.t0;
  const z = kagitZemin(kok);
  const kick = veri.kicker ? mk(kok, '', veri.kicker, {
    left: X(0.111) + 'px', top: Y(0.327) + 'px', fontSize: U(23) + 'px',
    fontWeight: 700, letterSpacing: '.20em', color: 'rgba(14,19,17,.45)'
  }) : null;
  const sat = veri.satirlar || [];
  const els = sat.map((s, i) => mk(kok, '', s.metin, {
    left: X(0.111) + 'px', top: (Y(0.370) + i * U(98)) + 'px', fontSize: U(s.punto || 80) + 'px',
    fontWeight: 700, color: s.vurgu ? renk('amberKoyu') : renk('ink'),
    letterSpacing: '-.02em', whiteSpace: 'nowrap', transformOrigin: '0% 50%'
  }));
  const sv = svgIn(kok, MOTOR.W, U(300), { left: '0px', top: Y(0.586) + 'px' });
  const ul = pathIn(sv, 'M 0 0 L 1 0', renk('amber'), U(6));
  const alt = veri.alt ? mk(kok, '', veri.alt, {
    left: X(0.111) + 'px', top: Y(0.70) + 'px', width: X(0.79) + 'px', fontSize: U(36) + 'px',
    fontWeight: 400, color: 'rgba(14,19,17,.62)', lineHeight: '1.24'
  }) : null;
  let olcum = false;
  const tUl = (veri.tCizgi || veri.t0 + 1.2) - veri.t0;
  const tAlt = (veri.tAlt || veri.t0 + 1.7) - veri.t0;
  return {
    veri, kok, ciz: (t) => {
      if (!olcum && els.length) { const w = els[els.length - 1].offsetWidth || X(0.7); ul.setAttribute('d', `M ${X(0.111)} ${U(22)} L ${X(0.111) + w} ${U(22)}`); olcum = true; }
      const zf = zarf(t, d, 0.12, 0.30);
      z.wrap.style.opacity = zf.toFixed(3); zeminCiz(z, t);
      if (kick) { const a = rise(t, 0.05, { dy: U(12), blur: U(4), dur: 0.38 }); set(kick, { o: a.o * zf * 0.45, y: a.y, blur: a.blur }); }
      els.forEach((e, i) => {
        const at = (sat[i].t || veri.t0) - veri.t0;
        const a = rise(t, at, { dy: U(26), blur: U(9), dur: 0.40 });
        set(e, { o: a.o * zf, y: a.y + drift(t, at, U(0.9)), blur: a.blur });
      });
      stroke(ul, t, tUl, 0.44, E.outQuart);
      sv.style.opacity = (zf * p(t, tUl, 0.05, E.lin)).toFixed(3);
      if (alt) { const b = rise(t, tAlt, { dy: U(18), blur: U(7), dur: 0.44 }); alt.style.opacity = (b.o * zf * 0.62).toFixed(3); set(alt, { y: b.y, blur: b.blur }); }
    }
  };
};

/* --- AĞ DİYAGRAMI ------------------------------------------------------ */
SABLON.ag_diyagram = veri => {
  const kok = kokKat(veri);
  const d = veri.t1 - veri.t0;
  const tam = veri.tamEkran !== false;
  const z = tam ? kagitZemin(kok) : null;
  const kick = veri.kicker ? mk(kok, '', veri.kicker, {
    left: X(0.111) + 'px', top: Y(0.305) + 'px', fontSize: U(23) + 'px',
    fontWeight: 700, letterSpacing: '.20em', color: 'rgba(14,19,17,.45)'
  }) : null;
  const wrap = mk(kok, '', null, { left: '0px', top: '0px', width: MOTOR.W + 'px', height: MOTOR.H + 'px', transformOrigin: '50% 50%' });
  const sv = svgIn(wrap, MOTOR.W, MOTOR.H, { left: '0px', top: '0px' });
  const N = veri.dugumler || [];
  const bagl = [];
  for (let i = 0; i < N.length; i++) {
    const a = N[i], b = N[(i + 1) % N.length];
    const mx = (X(a.x) + X(b.x)) / 2, my = (Y(a.y) + Y(b.y)) / 2;
    const nx = -(Y(b.y) - Y(a.y)), ny = (X(b.x) - X(a.x)), len = Math.hypot(nx, ny) || 1, bow = U(i === 1 ? 50 : -46);
    bagl.push({ p: pathIn(sv, `M ${X(a.x)} ${Y(a.y)} Q ${mx + nx / len * bow} ${my + ny / len * bow} ${X(b.x)} ${Y(b.y)}`, tam ? renk('amberKoyu') : renk('amber'), U(4)), at: (b.t || veri.t0) - veri.t0 - 0.15 });
  }
  const els = N.map(n => {
    const e = document.createElement('div'); e.className = 'el';
    e.innerHTML = `<span style="width:${U(11)}px;height:${U(11)}px;border-radius:50%;background:${renk('amber')};display:inline-block"></span><span style="font-size:${U(38)}px">${n.metin}</span>`;
    Object.assign(e.style, mureKart(), { padding: `${U(17)}px ${U(30)}px`, gap: U(15) + 'px', transformOrigin: '50% 50%' });
    wrap.appendChild(e); return e;
  });
  const alt = veri.alt ? mk(kok, '', veri.alt, {
    left: X(0.111) + 'px', top: Y(0.733) + 'px', width: X(0.79) + 'px', fontSize: U(34) + 'px',
    fontWeight: 400, color: tam ? 'rgba(14,19,17,.62)' : 'rgba(247,244,237,.8)', lineHeight: '1.26'
  }) : null;
  let olcum = false;
  return {
    veri, kok, ciz: (t) => {
      if (!olcum) { els.forEach((e, i) => { e.style.left = (X(N[i].x) - (e.offsetWidth || U(200)) / 2) + 'px'; e.style.top = (Y(N[i].y) - (e.offsetHeight || U(70)) / 2) + 'px'; }); olcum = true; }
      const zf = z ? zarf(t, d, 0.12, 0.30) : 1 - p(t, d - 0.50, 0.50, E.outCubic);
      if (z) { z.wrap.style.opacity = zf.toFixed(3); zeminCiz(z, t); }
      if (kick) { const a = rise(t, 0.02, { dy: U(12), blur: U(4), dur: 0.38 }); set(kick, { o: a.o * zf * 0.45, y: a.y, blur: a.blur }); }
      wrap.style.opacity = zf.toFixed(3);
      wrap.style.transform = `rotate(${(Math.sin(t * 0.6) * 0.8).toFixed(3)}deg) scale(${(1 + 0.010 * t).toFixed(4)})`;
      bagl.forEach(l => stroke(l.p, t, l.at, 0.55, E.outCubic));
      els.forEach((e, i) => {
        const at = (N[i].t || veri.t0) - veri.t0;
        const a = rise(t, at, { dy: U(20), blur: U(8), dur: 0.40 });
        const pop = 1 + 0.06 * (1 - p(t, at, 0.36, E.outBack));
        set(e, { o: a.o, y: a.y, s: pop, blur: a.blur });
      });
      if (alt) { const b = rise(t, (veri.tAlt || veri.t1 - 1.2) - veri.t0, { dy: U(18), blur: U(7), dur: 0.44 }); alt.style.opacity = (b.o * zf * 0.62).toFixed(3); set(alt, { y: b.y, blur: b.blur }); }
    }
  };
};

/* --- MARKA (buzlu cam üzerinde lockup) --------------------------------- */
SABLON.marka = veri => {
  const kok = kokKat(veri);
  const d = veri.t1 - veri.t0;
  const panel = buzluCam(kok, X(0.067), Y(0.364), X(0.819), Y(0.234), U(26), U(20), 0.40);
  const kick = veri.kicker ? mk(kok, '', veri.kicker, {
    left: X(0.114) + 'px', top: Y(0.392) + 'px', fontSize: U(22) + 'px',
    fontWeight: 700, letterSpacing: '.18em', color: renk('amber')
  }) : null;
  const t1 = mk(kok, '', veri.ust || '', { left: X(0.111) + 'px', top: Y(0.427) + 'px', fontSize: U(56) + 'px', fontWeight: 700, color: renk('paper'), whiteSpace: 'nowrap' });
  const t2 = mk(kok, '', veri.alt || '', { left: X(0.111) + 'px', top: Y(0.478) + 'px', fontSize: U(56) + 'px', fontWeight: 700, color: renk('amber'), whiteSpace: 'nowrap' });
  const sv = svgIn(kok, MOTOR.W, U(40), { left: '0px', top: Y(0.539) + 'px' });
  const ul = pathIn(sv, 'M 0 0 L 1 0', renk('amber'), U(5));
  const sub = veri.aciklama ? mk(kok, '', veri.aciklama, { left: X(0.114) + 'px', top: Y(0.558) + 'px', fontSize: U(29) + 'px', fontWeight: 400, color: 'rgba(247,244,237,.78)' }) : null;
  let olcum = false;
  return {
    veri, kok, ciz: (t) => {
      if (!olcum) { const w = Math.max(t1.offsetWidth || 0, t2.offsetWidth || 0) || X(0.5); ul.setAttribute('d', `M ${X(0.114)} ${U(16)} L ${X(0.114) + w} ${U(16)}`); olcum = true; }
      const ip = p(t, 0.02, 0.42, E.outQuart), out = 1 - p(t, d - 0.50, 0.50, E.outCubic);
      set(panel, { o: ip * out, y: U(16) * (1 - ip), s: 0.985 + 0.015 * ip });
      if (kick) { const a = rise(t, 0.14, { dy: U(10), blur: U(4), dur: 0.36 }); set(kick, { o: a.o * out, y: a.y, blur: a.blur }); }
      [[t1, 0.24], [t2, 0.42]].forEach(([el, at]) => { const r = rise(t, at, { dy: U(22), blur: U(9), dur: 0.44 }); set(el, { o: r.o * out, y: r.y + drift(t, at, U(0.6)), blur: r.blur }); });
      stroke(ul, t, 0.92, 0.50, E.outQuart); sv.style.opacity = (out * p(t, 0.92, 0.05, E.lin)).toFixed(3);
      if (sub) { const s = rise(t, 1.60, { dy: U(14), blur: U(5), dur: 0.40 }); sub.style.opacity = (s.o * out * 0.78).toFixed(3); set(sub, { y: s.y, blur: s.blur }); }
    }
  };
};

/* --- CTA ÇİPİ ---------------------------------------------------------- */
SABLON.cta = veri => {
  const kok = kokKat(veri);
  const d = veri.t1 - veri.t0;
  const chip = mk(kok, '',
    `<span style="width:${U(10)}px;height:${U(10)}px;border-radius:50%;background:${renk('amber')};display:inline-block"></span>` +
    `<span style="font-size:${U(30)}px">${veri.metin || ''}</span>` +
    (veri.eylem ? `<span style="font-size:${U(26)}px;color:${renk('amber')}">${veri.eylem}</span>` : ''),
    Object.assign(mureKart(), { top: Y(veri.y === undefined ? 0.766 : veri.y) + 'px', padding: `${U(16)}px ${U(26)}px`, gap: U(16) + 'px', transformOrigin: '50% 50%' }));
  let olcum = false;
  return {
    veri, kok, ciz: (t) => {
      if (!olcum) { chip.style.left = Math.round((MOTOR.W - (chip.offsetWidth || X(0.6))) / 2) + 'px'; olcum = true; }
      const a = rise(t, 0.30, { dy: U(22), blur: U(8), dur: 0.55 });
      set(chip, { o: a.o * (1 - p(t, d - 0.37, 0.37, E.outCubic)), y: a.y, s: 1 + 0.012 * Math.sin((t - 0.3) * 2.1) });
    }
  };
};

/* --- İZLEME ÇUBUĞU ----------------------------------------------------- */
SABLON.izleme_cubugu = veri => {
  const kok = kokKat(veri);
  const h = U(8), top = MOTOR.H - h;
  mk(kok, '', null, { left: '0px', top: top + 'px', width: MOTOR.W + 'px', height: h + 'px', background: 'rgba(0,0,0,.22)' });
  const bar = mk(kok, '', null, {
    left: '0px', top: top + 'px', height: h + 'px', width: '1px',
    background: `linear-gradient(90deg,${renk('amberKoyu')},${renk('amber')})`,
    boxShadow: `0 0 ${U(12)}px rgba(255,194,75,.5)`
  });
  return { veri, kok, ciz: (t) => { bar.style.width = Math.max(1, MOTOR.W * Math.min(1, t / (veri.t1 - veri.t0))).toFixed(2) + 'px'; } };
};

/* --- KULLANICI GÖRSELİ / VİDEOSU --------------------------------------- */
SABLON.gorsel = veri => {
  const kok = kokKat(veri);
  const d = veri.t1 - veri.t0;
  const w = X(veri.w === undefined ? 0.5 : veri.w);
  const el = document.createElement(veri.video ? 'video' : 'img');
  el.className = 'el';
  el.src = veri.kaynak;
  if (veri.video) { el.muted = true; el.preload = 'auto'; }
  Object.assign(el.style, {
    position: 'absolute', left: X(veri.x === undefined ? 0.25 : veri.x) + 'px',
    top: Y(veri.y === undefined ? 0.4 : veri.y) + 'px', width: w + 'px', height: 'auto',
    borderRadius: U(veri.radius === undefined ? 18 : veri.radius) + 'px',
    boxShadow: `0 ${U(20)}px ${U(50)}px rgba(0,0,0,.45)`, transformOrigin: '50% 50%'
  });
  kok.appendChild(el);
  return {
    veri, kok, ciz: (t) => {
      const a = rise(t, 0.02, { dy: U(20), blur: U(8), dur: 0.42 });
      set(el, { o: a.o * (1 - p(t, d - 0.40, 0.40, E.outCubic)), y: a.y + drift(t, 0.02, U(0.8)), blur: a.blur, s: 1 + 0.02 * t / Math.max(1, d) });
    }
  };
};

/* --- TAM EKRAN METİN (genel amaçlı) ------------------------------------ */
SABLON.tam_ekran_metin = veri => {
  const kok = kokKat(veri);
  const d = veri.t1 - veri.t0;
  const z = kagitZemin(kok);
  const sat = veri.satirlar || [];
  const els = sat.map((s, i) => mk(kok, '', s.metin, {
    left: X(0.111) + 'px', top: (Y(veri.y === undefined ? 0.384 : veri.y) + i * U(s.gap || 130)) + 'px',
    fontSize: U(s.punto || 88) + 'px', fontWeight: 700,
    color: s.vurgu ? renk('amberKoyu') : renk('ink'), whiteSpace: 'nowrap', transformOrigin: '0% 50%'
  }));
  const alt = veri.alt ? mk(kok, '', veri.alt, {
    left: X(0.111) + 'px', top: Y(0.714) + 'px', width: X(0.79) + 'px',
    fontSize: U(36) + 'px', fontWeight: 400, color: 'rgba(14,19,17,.62)', lineHeight: '1.24'
  }) : null;
  return {
    veri, kok, ciz: (t) => {
      const zf = zarf(t, d, 0.12, 0.30);
      z.wrap.style.opacity = zf.toFixed(3); zeminCiz(z, t);
      els.forEach((e, i) => {
        const at = (sat[i].t || veri.t0) - veri.t0;
        const a = rise(t, at, { dy: U(34), blur: U(10), dur: 0.42 });
        set(e, { o: a.o * zf, y: a.y + drift(t, at, U(1.1)), blur: a.blur });
      });
      if (alt) { const b = rise(t, (veri.tAlt || veri.t1 - 1.5) - veri.t0, { dy: U(18), blur: U(6), dur: 0.44 }); alt.style.opacity = (b.o * zf * 0.62).toFixed(3); set(alt, { y: b.y, blur: b.blur }); }
    }
  };
};

/* --- SES (görsel yok, sadece zaman çizelgesinde durur) ----------------- */
SABLON.ses = veri => {
  const kok = kokKat(veri);
  kok.style.display = 'none';
  return { veri, kok, ciz: () => { } };
};

window.MOTOR = MOTOR;
window.kurSahne = kur;
window.cizSahne = ciz;
window.SABLONLAR = SABLON;
