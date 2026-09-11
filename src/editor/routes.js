// Editörün tüm HTTP uçları. Her şey yerelde çalışır: dosyalar data/ altında.
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import {
  createProject, loadProject, saveProject, listProjects, deleteProject,
  saveMedia, mediaDir, exportDir,
} from './store.js';
import { probe, probeAudio, sceneCuts, thumbnail } from './probe.js';
import { analyzeReferenceVideo, analyzeScenes } from './vision.js';
import { learnFromReferences } from './learn.js';
import { directTimeline } from './director.js';
import { buildStyleProfile, buildTimeline } from './style.js';
import { parseDirective, applyPlanToStyle } from './directive.js';
import { parseInstruction, applyOps } from './ops.js';
import { renderProject } from './render.js';
import { LLM_ENABLED, instructionToOps, writeCaptions } from './llm.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 512 * 1024 * 1024 } });
export const editorRouter = express.Router();

const kindOf = (mime = '', name = '') => {
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('image/')) return 'image';
  const ext = path.extname(name).toLowerCase();
  if (['.mp4', '.mov', '.webm', '.mkv', '.m4v'].includes(ext)) return 'video';
  if (['.mp3', '.wav', '.m4a', '.aac', '.ogg'].includes(ext)) return 'audio';
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) return 'image';
  return 'other';
};

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: String(e.message || e) });
});

// Hangi sürümün çalıştığı tarayıcıdan görülebilsin (eski kopya karışıklığını önler).
let BUILD = null;
function buildStamp() {
  if (BUILD) return BUILD;
  try {
    BUILD = execSync('git rev-parse --short HEAD', { cwd: process.cwd() }).toString().trim();
  } catch {
    BUILD = 'bilinmiyor';
  }
  return BUILD;
}

editorRouter.get('/config', (_req, res) => {
  res.json({
    llm: LLM_ENABLED,
    maxReferences: 10,
    minReferences: 3,
    build: buildStamp(),
    features: ['learn', 'build', 'scene-analysis', 'vision'],
  });
});

editorRouter.get('/projects', wrap(async (_req, res) => res.json(await listProjects())));

editorRouter.post('/projects', wrap(async (req, res) => {
  res.json(await createProject(req.body?.name || 'Yeni proje'));
}));

editorRouter.get('/projects/:id', wrap(async (req, res) => res.json(await loadProject(req.params.id))));

editorRouter.delete('/projects/:id', wrap(async (req, res) => {
  await deleteProject(req.params.id);
  res.json({ ok: true });
}));

// --- yükleme: role = reference | target | sfx | asset ---
editorRouter.post('/projects/:id/upload', upload.array('files', 20), wrap(async (req, res) => {
  const project = await loadProject(req.params.id);
  const role = req.body.role;
  const saved = [];

  for (const f of req.files || []) {
    const media = await saveMedia(project.id, f.originalname, f.buffer);
    const kind = kindOf(f.mimetype, f.originalname);
    const entry = { ...media, kind };

    if (kind === 'video') {
      entry.meta = await probe(media.abs);
      const thumbName = media.fileName.replace(/\.[^.]+$/, '') + '.jpg';
      try {
        await thumbnail(media.abs, path.join(mediaDir(project.id), thumbName), Math.min(1, entry.meta.duration / 3));
        entry.thumb = `/editor-media/${project.id}/${thumbName}`;
      } catch { /* thumbnail is optional */ }
    } else if (kind === 'audio') {
      entry.meta = await probeAudio(media.abs);
    }

    if (role === 'reference') {
      if (project.references.length >= 10) throw new Error('En fazla 10 örnek video ekleyebilirsiniz.');
      entry.cuts = kind === 'video' ? await sceneCuts(media.abs) : [];
      // Kesimlerin yanı sıra görüntüyü de incele: altyazı bandı, renkler, flaş/hareket.
      if (kind === 'video') entry.vision = await analyzeReferenceVideo(media.abs, entry.meta);
      project.references.push(entry);
    } else if (role === 'target') {
      project.target = entry;
    } else if (role === 'sfx') {
      project.sfx.push(entry);
    } else {
      project.assets.push(entry);
    }
    saved.push(entry);
  }

  if (project.references.length) project.style = buildStyleProfile(project.references);
  await saveProject(project);
  res.json({ saved, project });
}));

editorRouter.post('/projects/:id/remove-media', wrap(async (req, res) => {
  const project = await loadProject(req.params.id);
  const { role, fileName } = req.body;
  if (role === 'target') project.target = null;
  else if (role === 'reference') project.references = project.references.filter((r) => r.fileName !== fileName);
  else if (role === 'sfx') project.sfx = project.sfx.filter((r) => r.fileName !== fileName);
  if (project.references.length) project.style = buildStyleProfile(project.references);
  await saveProject(project);
  res.json(project);
}));

// --- stil analizi + ilk zaman çizelgesi ---
editorRouter.post('/projects/:id/analyze', wrap(async (req, res) => {
  const project = await loadProject(req.params.id);
  if (!project.target) throw new Error('Önce editlenecek videoyu yükleyin.');
  if (project.references.length < 1) throw new Error('En az 1 (önerilen 3-10) örnek video yükleyin.');

  // "brief" artık serbest bir yapay zekâ talimatı: tempo, altyazı, efekt ve SFX kararlarını sürüyor.
  project.instruction = req.body?.instruction ?? req.body?.brief ?? project.instruction ?? '';
  const plan = parseDirective(project.instruction);
  project.plan = plan;
  project.style = applyPlanToStyle(buildStyleProfile(project.references), plan);
  project.timeline = buildTimeline({
    target: project.target,
    style: project.style,
    sfx: project.sfx,
    plan,
  });

  // Anahtar varsa altyazı metinlerini modele yazdır (talimatta birebir metin yoksa).
  if (LLM_ENABLED && !plan.captionTexts.length && plan.captionMode !== 'none') {
    try {
      const caps = project.timeline.layers.filter((l) => l.type === 'caption');
      const texts = await writeCaptions({ brief: project.instruction, count: caps.length, style: project.style });
      caps.forEach((c, i) => {
        if (!texts[i]) return;
        c.text = plan.captionStyle.uppercase ? texts[i].toLocaleUpperCase('tr-TR') : texts[i];
        c.name = c.text.slice(0, 24);
      });
    } catch (e) {
      project.chat.push({ role: 'system', text: `Model altyazıları yazamadı (${e.message}); yerel metinler kullanıldı.`, at: new Date().toISOString() });
    }
  }

  await saveProject(project);
  res.json(project);
}));

// --- 1) ÖĞREN: örnek videoları sahne sahne incele (SSE ilerleme) ---
editorRouter.post('/projects/:id/learn', wrap(async (req, res) => {
  const project = await loadProject(req.params.id);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  try {
    if (!project.references.length) throw new Error('Önce örnek video yükleyin (önerilen 3-10).');
    send('log', { message: `${project.references.length} örnek video inceleniyor…` });

    const { perVideo, grammar } = await learnFromReferences(project, { onLog: (m) => send('log', { message: m }) });
    project.lessons = perVideo;
    project.grammar = grammar;
    project.style = buildStyleProfile(project.references);   // vision verileri güncellendi
    project.learnedAt = new Date().toISOString();
    await saveProject(project);
    send('done', { grammar, lessons: perVideo, style: project.style });
  } catch (e) {
    send('error', { error: String(e.message || e) });
  } finally {
    res.end();
  }
}));

// --- 2) KURGULA: hedef videoyu sahne sahne incele, öğrenileni uygula, videoyu üret ---
editorRouter.post('/projects/:id/build', wrap(async (req, res) => {
  const project = await loadProject(req.params.id);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  try {
    if (!project.target) throw new Error('Önce editlenecek videoyu yükleyin.');
    if (!project.grammar) throw new Error('Önce "Örnekleri incele ve öğren" adımını çalıştırın.');

    project.instruction = req.body?.instruction ?? project.instruction ?? '';
    const plan = parseDirective(project.instruction);
    project.plan = plan;

    send('log', { message: 'Hedef video sahne sahne inceleniyor…' });
    const file = path.join(mediaDir(project.id), project.target.fileName);
    if (!project.target.cuts) {
      project.target.cuts = await sceneCuts(file);
      send('log', { message: `${project.target.cuts.length} kesim bulundu` });
    }
    const scenes = await analyzeScenes(
      file,
      { duration: project.target.meta.duration, cuts: project.target.cuts },
      // Örneklerdeki ortalama sahne süresi kadar alt sahnelere böl (kesimsiz çekimler için).
      { maxSceneLen: Math.min(4, Math.max(1.2, project.grammar.avgSceneDuration || 2.5)) }
    );
    project.targetScenes = scenes;
    send('log', { message: `${scenes.length} sahne çıkarıldı` });

    // Talimatta metin verilmişse birebir kullan.
    let captionTexts = plan.captionTexts || [];
    if (LLM_ENABLED && !captionTexts.length && plan.captionMode !== 'none') {
      try {
        const want = Math.max(1, Math.round(scenes.length * (project.grammar.textSceneRatio ?? 0.6)));
        captionTexts = await writeCaptions({ brief: project.instruction, count: want, style: project.style });
        send('log', { message: `Model ${captionTexts.length} altyazı metni yazdı` });
      } catch (e) {
        send('log', { message: `Model altyazı yazamadı (${e.message}); yer tutucu kullanılacak` });
      }
    }

    send('log', { message: 'Öğrenilen kurgu sahnelere uygulanıyor…' });
    const { timeline, decisions } = directTimeline({
      target: project.target,
      scenes,
      grammar: project.grammar,
      plan,
      sfx: project.sfx,
      captionTexts,
    });
    project.timeline = timeline;
    project.decisions = decisions;
    for (const d of decisions) {
      send('log', { message: `Sahne ${d.scene} (${d.start}-${d.end}s, ${d.role}): ${d.actions.join(', ')}` });
    }
    await saveProject(project);

    send('log', { message: 'Video render ediliyor…' });
    const out = await renderProject(project, { onLog: (m) => send('log', { message: m }) });
    project.exports.unshift(out);
    await saveProject(project);
    send('done', { export: out, decisions, timeline, plan });
  } catch (e) {
    send('error', { error: String(e.message || e) });
  } finally {
    res.end();
  }
}));

editorRouter.put('/projects/:id/timeline', wrap(async (req, res) => {
  const project = await loadProject(req.params.id);
  project.timeline = req.body.timeline;
  await saveProject(project);
  res.json({ ok: true, updatedAt: project.updatedAt });
}));

// --- sohbet: talimat + isteğe bağlı dosya eki ---
editorRouter.post('/projects/:id/chat', upload.array('files', 10), wrap(async (req, res) => {
  const project = await loadProject(req.params.id);
  const text = req.body.message || '';
  if (!project.timeline) throw new Error('Önce "Stili öğren ve kurgula" adımını çalıştırın.');

  const attachments = [];
  for (const f of req.files || []) {
    const media = await saveMedia(project.id, f.originalname, f.buffer);
    const kind = kindOf(f.mimetype, f.originalname);
    const entry = { ...media, kind };
    if (kind === 'audio') entry.meta = await probeAudio(media.abs);
    project.assets.push(entry);
    attachments.push(entry);
  }

  let ops;
  let via = 'kural';
  if (LLM_ENABLED) {
    try {
      ops = await instructionToOps(text, { timeline: project.timeline, attachments });
      via = 'model';
    } catch { /* modele ulaşılamadı → kurallara düş */ }
  }
  if (!ops) ops = parseInstruction(text, { timeline: project.timeline, attachments });

  const notes = applyOps(project.timeline, ops);
  project.chat.push({ role: 'user', text, attachments: attachments.map((a) => a.originalName), at: new Date().toISOString() });
  project.chat.push({ role: 'assistant', text: notes.join('\n'), via, at: new Date().toISOString() });
  await saveProject(project);
  res.json({ ops, notes, via, timeline: project.timeline, chat: project.chat });
}));

// --- dışa aktarma (SSE ilerleme) ---
editorRouter.post('/projects/:id/export', wrap(async (req, res) => {
  const project = await loadProject(req.params.id);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  try {
    if (req.body?.timeline) {
      project.timeline = req.body.timeline;
      await saveProject(project);
    }
    const out = await renderProject(project, { onLog: (m) => send('log', { message: m }) });
    project.exports.unshift(out);
    await saveProject(project);
    send('done', out);
  } catch (e) {
    send('error', { error: String(e.message || e) });
  } finally {
    res.end();
  }
}));

// Animasyon / motion grafik raporu: öğrenilen teknikler + sahne sahne öneriler.
editorRouter.get('/projects/:id/report', wrap(async (req, res) => {
  const project = await loadProject(req.params.id);
  const g = project.grammar;
  const d = project.decisions || [];
  const L = [];

  L.push(`# ${project.name} — animasyon ve motion grafik raporu`, '');
  L.push(`Oluşturma: ${new Date().toLocaleString('tr-TR')}`, '');

  L.push('## 1) Örnek videolardan öğrenilenler', '');
  if (!g) L.push('_Henüz öğrenme çalıştırılmadı._', '');
  else {
    L.push(`- İncelenen: **${g.videosStudied} video / ${g.scenesStudied} sahne**`);
    L.push(`- Ortalama sahne süresi: **${g.avgSceneDuration}s**`);
    L.push(`- Yazılı sahne oranı: **%${Math.round(g.textSceneRatio * 100)}**`);
    L.push(`- Kesimde flaş oranı: **%${Math.round(g.flashOnCutRatio * 100)}**`);
    L.push(`- Hareketli sahne oranı: **%${Math.round(g.highMotionRatio * 100)}**`);
    if (g.caption) {
      L.push(`- Öğrenilen yazı stili: konum y%${g.caption.y}, punto %${g.caption.fontSize}, renk ${g.caption.color}, ekranda ${g.caption.avgDuration}s, ${g.caption.bg === 'box' ? 'kutulu' : 'konturlu'}`);
    }
    L.push('', '### Örneklerde tespit edilen teknikler', '');
    if (g.techniques?.length) {
      L.push('| Teknik | Toplam | Kaç videoda | Dakikada | Örnek anlar |', '|---|---|---|---|---|');
      for (const t of g.techniques) {
        L.push(`| ${t.label} | ${t.count} | ${t.videos} | ${t.perMinute} | ${t.examples.join(' · ')} |`);
      }
    } else L.push('_Belirgin bir teknik tespit edilmedi._');
    L.push('');
  }

  L.push('## 2) Hedef videoda kullanılabilecek animasyon / motion grafikler', '');
  if (!d.length) L.push('_Henüz kurgulama çalıştırılmadı._', '');
  for (const sc of d) {
    L.push(`### Sahne ${sc.scene} — ${sc.start}–${sc.end}s (${sc.role}, hareket ${sc.motion}, doygunluk ${sc.saturation ?? '-'})`, '');
    L.push(`**Uygulandı:** ${sc.actions.join(', ')}`, '');
    if (sc.proposals?.length) {
      L.push('| Uygulanabilir teknik | Uygunluk | Örneklerde | Gerekçe | Durum |', '|---|---|---|---|---|');
      for (const p of sc.proposals) {
        L.push(`| ${p.label} | ${Math.round(p.fit * 100)}% | ${p.inReferences ? 'var' : 'yok'} | ${p.why} | ${p.applied ? '✅ uygulandı' : p.skipped ? '⛔ ' + p.skipped : '○ öneri'} |`);
      }
      L.push('');
    }
  }

  const md = L.join('\n');
  if (req.query.download) {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="animasyon-raporu-${project.id}.md"`);
    return res.send(md);
  }
  res.json({ markdown: md, grammar: g, decisions: d });
}));

// Dışa aktarılan dosyayı doğrudan bilgisayara indir.
editorRouter.get('/projects/:id/download/:file', wrap(async (req, res) => {
  const abs = path.join(exportDir(req.params.id), path.basename(req.params.file));
  await fs.access(abs);
  res.download(abs, `edit-${req.params.id}.mp4`);
}));
