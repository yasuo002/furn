// Editörün tüm HTTP uçları. Her şey yerelde çalışır: dosyalar data/ altında.
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  createProject, loadProject, saveProject, listProjects, deleteProject,
  saveMedia, mediaDir, exportDir,
} from './store.js';
import { probe, probeAudio, sceneCuts, thumbnail } from './probe.js';
import { buildStyleProfile, buildTimeline, chunkText, captionLayer } from './style.js';
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

editorRouter.get('/config', (_req, res) => {
  res.json({ llm: LLM_ENABLED, maxReferences: 10, minReferences: 3 });
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

  project.brief = req.body?.brief ?? project.brief ?? '';
  project.style = buildStyleProfile(project.references);
  project.timeline = buildTimeline({
    target: project.target,
    style: project.style,
    brief: project.brief,
    sfx: project.sfx,
  });

  // Anahtar varsa altyazı metinlerini modele yazdır.
  if (LLM_ENABLED) {
    try {
      const caps = project.timeline.layers.filter((l) => l.type === 'caption');
      const texts = await writeCaptions({ brief: project.brief, count: caps.length, style: project.style });
      caps.forEach((c, i) => { if (texts[i]) { c.text = texts[i]; c.name = texts[i].slice(0, 24); } });
    } catch (e) {
      project.chat.push({ role: 'system', text: `Model altyazıları yazamadı (${e.message}); yerel metinler kullanıldı.`, at: new Date().toISOString() });
    }
  }

  await saveProject(project);
  res.json(project);
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

// Dışa aktarılan dosyayı doğrudan bilgisayara indir.
editorRouter.get('/projects/:id/download/:file', wrap(async (req, res) => {
  const abs = path.join(exportDir(req.params.id), path.basename(req.params.file));
  await fs.access(abs);
  res.download(abs, `edit-${req.params.id}.mp4`);
}));
