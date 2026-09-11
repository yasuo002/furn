// Kare kare istatistiklerden KURGU TEKNİKLERİNİ tanır:
// kamera/kurgu hareketi (push-in zoom, kaydırma, sarsıntı), kesim vurguları
// (flaş, renk geçişi), yazı animasyonları (pop, kayarak, daktilo, yumuşak)
// ve motion grafik girişleri (alt bant / şerit kayması).

const TECHNIQUE_LABELS = {
  zoomIn: 'Push-in zoom (yavaş yakınlaşma)',
  zoomOut: 'Pull-out zoom (uzaklaşma)',
  shake: 'Sarsıntı / titreşim vuruşu',
  pan: 'Yatay kaydırma (whip pan)',
  flash: 'Beyaz flaş kesme vurgusu',
  colorWipe: 'Renkli silme geçişi',
  textPop: 'Altyazı: pop (büyüyerek giriş)',
  textSlide: 'Altyazı: aşağıdan kayarak giriş',
  textType: 'Altyazı: daktilo (harf harf)',
  textFade: 'Altyazı: yumuşak belirme',
};

export const techniqueLabel = (k) => TECHNIQUE_LABELS[k] || k;

// İki kare arasında en iyi kayma ve ölçek: kaba arama, küçük gri haritalar üstünde.
function matchFrames(a, b, gw, gh) {
  const step = 2;
  const range = 4;
  let best = { dx: 0, dy: 0, err: Infinity };
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      let err = 0, n = 0;
      for (let y = range; y < gh - range; y += step) {
        for (let x = range; x < gw - range; x += step) {
          const va = a[y * gw + x];
          const vb = b[(y + dy) * gw + (x + dx)];
          err += Math.abs(va - vb); n++;
        }
      }
      err /= Math.max(1, n);
      if (err < best.err) best = { dx, dy, err };
    }
  }

  // Ölçek: merkezden örnekleyip 1.00 / 1.04 / 0.96 dene (zoom yönü).
  const cx = gw / 2, cy = gh / 2;
  const testScale = (sc) => {
    let err = 0, n = 0;
    for (let y = 4; y < gh - 4; y += step) {
      for (let x = 4; x < gw - 4; x += step) {
        const sx = Math.round(cx + (x - cx) * sc);
        const sy = Math.round(cy + (y - cy) * sc);
        if (sx < 0 || sy < 0 || sx >= gw || sy >= gh) continue;
        err += Math.abs(a[y * gw + x] - b[sy * gw + sx]); n++;
      }
    }
    return n ? err / n : Infinity;
  };
  // Yavaş push-in'i kaçırmamak için küçük adım (%1.5).
  const e1 = testScale(1), eIn = testScale(1.015), eOut = testScale(0.985);
  const zoom = eIn < e1 * 0.995 && eIn < eOut ? 1 : eOut < e1 * 0.995 && eOut < eIn ? -1 : 0;

  return { ...best, zoom };
}

// captionY verilmezse (videoda altyazı bandı yoksa) yazı animasyonu aranmaz;
// dokulu görüntüler yanlış "yazı" sinyali üretmesin.
export function detectTechniques(stats, fps = 4, { captionY = null } = {}) {
  const events = [];
  const motions = [];

  for (let i = 1; i < stats.length; i++) {
    const p = stats[i - 1], c = stats[i];
    if (!p.gray || !c.gray || p.gw !== c.gw) { motions.push(null); continue; }
    motions.push({ t: c.t, ...matchFrames(p.gray, c.gray, c.gw, c.gh) });
  }

  // --- kamera/kurgu hareketi ---
  const win = Math.max(3, Math.round(fps * 1));
  for (let i = 0; i < motions.length; i++) {
    const seg = motions.slice(i, i + win).filter(Boolean);
    if (seg.length < win) continue;
    const zoomSum = seg.reduce((a, m) => a + m.zoom, 0);
    if (zoomSum >= Math.ceil(win * 0.7)) pushEvent(events, 'zoomIn', seg[0].t, seg.length / fps, zoomSum / win);
    else if (zoomSum <= -Math.ceil(win * 0.7)) pushEvent(events, 'zoomOut', seg[0].t, seg.length / fps, -zoomSum / win);

    const shakeSeg = seg.slice(0, Math.max(2, Math.round(fps * 0.5)));
    const dxs = shakeSeg.map((m) => m.dx);
    const signFlips = dxs.slice(1).filter((v, k) => Math.sign(v) && Math.sign(v) !== Math.sign(dxs[k])).length;
    const amp = Math.max(...shakeSeg.map((m) => Math.abs(m.dx) + Math.abs(m.dy)));
    if (signFlips >= shakeSeg.length - 1 && amp >= 2) pushEvent(events, 'shake', seg[0].t, shakeSeg.length / fps, amp);
    else if (Math.abs(dxs.reduce((a, b) => a + b, 0)) >= win * 2) pushEvent(events, 'pan', seg[0].t, seg.length / fps, amp);
  }

  // --- flaş ve renkli geçişler ---
  for (let i = 1; i < stats.length - 1; i++) {
    const jump = stats[i].meanL - stats[i - 1].meanL;
    const back = stats[i].meanL - stats[i + 1].meanL;
    if (jump > 22 && back > 10) {
      const white = stats[i].sat < 0.25;
      pushEvent(events, white ? 'flash' : 'colorWipe', stats[i].t, 1 / fps, jump);
    }
  }

  // --- yazı animasyonları: metnin ilk göründüğü karelerdeki davranış ---
  for (let i = 1; captionY != null && i < stats.length; i++) {
    const prev = stats[i - 1].textBox, cur = stats[i].textBox;
    // Yalnızca öğrenilen altyazı bandına denk gelen yazılar sayılır.
    if (cur && Math.abs(cur.cy * 100 - captionY) > 12) continue;
    if (cur && !prev) {
      const f = [stats[i], stats[i + 1], stats[i + 2], stats[i + 3]].filter((x) => x?.textBox).map((x) => x.textBox);
      if (f.length < 2) continue;
      const hGrow = f[f.length - 1].h / Math.max(0.001, f[0].h);
      const wGrow = f[f.length - 1].w / Math.max(0.001, f[0].w);
      const yMove = Math.abs(f[f.length - 1].cy - f[0].cy);

      if (wGrow > 1.6 && hGrow < 1.25) pushEvent(events, 'textType', stats[i].t, f.length / fps, wGrow);
      else if (hGrow > 1.25 && wGrow > 1.25) pushEvent(events, 'textPop', stats[i].t, f.length / fps, hGrow);
      else if (yMove > 0.02) pushEvent(events, 'textSlide', stats[i].t, f.length / fps, yMove * 100);
      else pushEvent(events, 'textFade', stats[i].t, f.length / fps, 1);
    }
  }

  return summarize(events, stats.length / fps);
}

// Aynı tekniğin arka arkaya tekrarlarını tek olaya indir.
function pushEvent(events, type, t, duration, strength) {
  const last = [...events].reverse().find((e) => e.type === type);
  if (last && t - (last.t + last.duration) < 0.35) {
    last.duration = Math.round((t + duration - last.t) * 100) / 100;
    last.strength = Math.max(last.strength, Math.round(strength * 10) / 10);
    return;
  }
  events.push({
    type,
    t: Math.round(t * 100) / 100,
    duration: Math.round(duration * 100) / 100,
    strength: Math.round(strength * 10) / 10,
  });
}

function summarize(events, duration) {
  const byType = new Map();
  for (const e of events) {
    if (!byType.has(e.type)) byType.set(e.type, []);
    byType.get(e.type).push(e);
  }
  const catalog = [...byType.entries()]
    .map(([type, list]) => ({
      type,
      label: techniqueLabel(type),
      count: list.length,
      perMinute: duration ? Math.round((list.length / duration) * 60) : 0,
      avgDuration: Math.round((list.reduce((a, e) => a + e.duration, 0) / list.length) * 100) / 100,
      examples: list.slice(0, 4).map((e) => `${e.t}s`),
    }))
    .sort((a, b) => b.count - a.count);
  return { events, catalog };
}
