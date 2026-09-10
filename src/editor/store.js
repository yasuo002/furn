// Disk-backed project storage. Everything lives under data/projects/<id>/ so the
// whole editor works offline and survives restarts.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const DATA_DIR = path.resolve(process.env.EDITOR_DATA_DIR || 'data');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');

export const newId = (p = '') => p + crypto.randomBytes(6).toString('hex');

export const projectDir = (id) => path.join(PROJECTS_DIR, id);
export const mediaDir = (id) => path.join(projectDir(id), 'media');
export const exportDir = (id) => path.join(projectDir(id), 'exports');

export async function ensureProjectDirs(id) {
  await fs.mkdir(mediaDir(id), { recursive: true });
  await fs.mkdir(exportDir(id), { recursive: true });
}

export async function listProjects() {
  await fs.mkdir(PROJECTS_DIR, { recursive: true });
  const ids = await fs.readdir(PROJECTS_DIR);
  const out = [];
  for (const id of ids) {
    try {
      const p = await loadProject(id);
      out.push({ id: p.id, name: p.name, updatedAt: p.updatedAt, hasTimeline: Boolean(p.timeline) });
    } catch { /* not a project dir */ }
  }
  return out.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export async function loadProject(id) {
  const raw = await fs.readFile(path.join(projectDir(id), 'project.json'), 'utf8');
  return JSON.parse(raw);
}

export async function saveProject(project) {
  project.updatedAt = new Date().toISOString();
  await ensureProjectDirs(project.id);
  await fs.writeFile(
    path.join(projectDir(project.id), 'project.json'),
    JSON.stringify(project, null, 2)
  );
  return project;
}

export async function createProject(name = 'Yeni proje') {
  const id = newId();
  const project = {
    id,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    references: [],   // örnek alınacak videolar (3-10)
    target: null,     // editlenecek video
    sfx: [],          // isteğe bağlı ses efektleri
    assets: [],       // sohbetten eklenen resim/dosyalar
    style: null,      // referanslardan çıkarılan stil profili
    timeline: null,   // katmanlar
    chat: [],
    exports: [],
  };
  await saveProject(project);
  return project;
}

export async function deleteProject(id) {
  await fs.rm(projectDir(id), { recursive: true, force: true });
}

// Stores an uploaded buffer inside the project's media folder.
export async function saveMedia(id, originalName, buffer) {
  await ensureProjectDirs(id);
  const ext = path.extname(originalName || '').toLowerCase() || '.bin';
  const fileName = newId() + ext;
  const abs = path.join(mediaDir(id), fileName);
  await fs.writeFile(abs, buffer);
  return { fileName, abs, url: `/editor-media/${id}/${fileName}`, originalName: originalName || fileName };
}
