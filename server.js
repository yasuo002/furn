import './src/env.js'; // must be first — loads .env before pipeline reads process.env
import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runPipeline, PROMPTS, MOCK } from './src/pipeline.js';
import { editorRouter } from './src/editor/routes.js';
import { DATA_DIR } from './src/editor/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.get('/favicon.ico', (_req, res) => res.status(204).end());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '25mb' }));

// --- Yerel video editörü ---
app.use('/api/editor', editorRouter);
// Proje medyası ve dışa aktarılan videolar (yerelden doğrudan erişim)
app.use('/editor-media/:id', (req, res, next) =>
  express.static(path.join(DATA_DIR, 'projects', path.basename(req.params.id), 'media'))(req, res, next));
app.use('/editor-exports/:id', (req, res, next) =>
  express.static(path.join(DATA_DIR, 'projects', path.basename(req.params.id), 'exports'))(req, res, next));

// Defaults for the form (mirrors n8n "Set Prompts")
app.get('/api/config', (_req, res) => {
  res.json({ prompts: PROMPTS, mock: MOCK });
});

// Main endpoint — mirrors the n8n "Photo Upload Form" trigger + whole graph.
app.post(
  '/api/generate',
  upload.fields([{ name: 'photo1', maxCount: 1 }, { name: 'photo2', maxCount: 1 }]),
  async (req, res) => {
    const photo1 = req.files?.photo1?.[0]?.buffer;
    const photo2 = req.files?.photo2?.[0]?.buffer;
    if (!photo1) return res.status(400).json({ error: 'photo1 is required' });

    // Stream progress logs to the client via Server-Sent Events.
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    try {
      const result = await runPipeline({
        photo1,
        photo2,
        description: req.body['product description'] || req.body.description || '',
        generateVideo: req.body.generateVideo === 'true' || req.body.generateVideo === 'on',
        prompts: {
          imageEdit: req.body.promptImageEdit,
          imageToVideo: req.body.promptImageToVideo,
        },
        onLog: (m) => send('log', { message: m }),
      });
      send('done', result);
    } catch (err) {
      send('error', { error: String(err.message || err) });
    } finally {
      res.end();
    }
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  Ad Generator running → http://localhost:${PORT}`);
  console.log(`  Editör       → http://localhost:${PORT}/editor.html`);
  console.log(`  Mode: ${MOCK ? 'MOCK (no API keys — set FAL_KEY & IMGBB_API_KEY for real runs)' : 'LIVE'}\n`);
});
