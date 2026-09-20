import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { DATA_DIR, DB_PATH } from './config.js';
import { DEFAULT_SETTINGS } from './fees.js';

let db;

export function openDb() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    command TEXT,
    demo INTEGER NOT NULL DEFAULT 0,
    category_json TEXT NOT NULL,
    config_json TEXT NOT NULL,
    settings_snapshot_json TEXT NOT NULL,
    progress_json TEXT NOT NULL DEFAULT '{}',
    current_action TEXT,
    user_notice TEXT,
    error TEXT,
    heartbeat_at TEXT,
    worker_pid INTEGER
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    asin TEXT,
    url TEXT,
    title TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    amazon_json TEXT,
    ebay_json TEXT,
    risk_json TEXT,
    overrides_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    checked_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_products_run ON products(run_id);
  CREATE TABLE IF NOT EXISTS observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    checked_at TEXT NOT NULL,
    data_json TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_obs_product ON observations(product_id);
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER REFERENCES runs(id) ON DELETE CASCADE,
    ts TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_run ON events(run_id);
  CREATE TABLE IF NOT EXISTS category_checks (
    leaf_id TEXT PRIMARY KEY,
    checked_at TEXT NOT NULL,
    ok INTEGER NOT NULL,
    result_count INTEGER,
    note TEXT
  );
  CREATE TABLE IF NOT EXISTS recheck_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    product_ids_json TEXT NOT NULL,
    demo INTEGER NOT NULL DEFAULT 0,
    message TEXT,
    heartbeat_at TEXT
  );
  `);
}

export const now = () => new Date().toISOString();
const J = (v) => JSON.stringify(v ?? null);
const P = (s, fallback = null) => { if (s == null) return fallback; try { return JSON.parse(s); } catch { return fallback; } };

// ---------- settings ----------
export function getSettings() {
  const d = openDb();
  const rows = d.prepare('SELECT key, value FROM settings').all();
  const out = structuredClone(DEFAULT_SETTINGS);
  for (const r of rows) out[r.key] = P(r.value);
  return out;
}
export function saveSettings(partial) {
  const d = openDb();
  const stmt = d.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  const tx = () => { for (const [k, v] of Object.entries(partial)) stmt.run(k, J(v)); };
  d.exec('BEGIN'); try { tx(); d.exec('COMMIT'); } catch (e) { d.exec('ROLLBACK'); throw e; }
  return getSettings();
}

// ---------- runs ----------
export function rowToRun(r) {
  if (!r) return null;
  return {
    id: r.id, createdAt: r.created_at, updatedAt: r.updated_at, startedAt: r.started_at, finishedAt: r.finished_at,
    status: r.status, command: r.command, demo: !!r.demo,
    category: P(r.category_json, {}), config: P(r.config_json, {}), settingsSnapshot: P(r.settings_snapshot_json, {}),
    progress: P(r.progress_json, {}), currentAction: r.current_action, userNotice: r.user_notice, error: r.error,
    heartbeatAt: r.heartbeat_at, workerPid: r.worker_pid,
  };
}
export function createRun({ category, config, settings, demo }) {
  const d = openDb();
  const t = now();
  const res = d.prepare(`INSERT INTO runs(created_at,updated_at,status,demo,category_json,config_json,settings_snapshot_json,progress_json)
    VALUES(?,?,?,?,?,?,?,?)`).run(t, t, 'queued', demo ? 1 : 0, J(category), J(config), J(settings), J({ found: 0, compared: 0, eligible: 0, conditional: 0, rejected: 0, missing: 0 }));
  return getRun(Number(res.lastInsertRowid));
}
export function getRun(id) {
  return rowToRun(openDb().prepare('SELECT * FROM runs WHERE id=?').get(id));
}
export function listRuns(limit = 100) {
  return openDb().prepare('SELECT * FROM runs ORDER BY id DESC LIMIT ?').all(limit).map(rowToRun);
}
export function updateRun(id, fields) {
  const d = openDb();
  const map = { status: 'status', command: 'command', progress: 'progress_json', currentAction: 'current_action', userNotice: 'user_notice',
    error: 'error', heartbeatAt: 'heartbeat_at', workerPid: 'worker_pid', startedAt: 'started_at', finishedAt: 'finished_at' };
  const sets = ['updated_at=?']; const vals = [now()];
  for (const [k, v] of Object.entries(fields)) {
    if (!map[k]) continue;
    sets.push(`${map[k]}=?`); vals.push(k === 'progress' ? J(v) : v);
  }
  vals.push(id);
  d.prepare(`UPDATE runs SET ${sets.join(',')} WHERE id=?`).run(...vals);
  return getRun(id);
}
export function setRunCommand(id, command) { return updateRun(id, { command }); }
export function deleteRun(id) { openDb().prepare('DELETE FROM runs WHERE id=?').run(id); }

// ---------- products ----------
export function rowToProduct(r) {
  if (!r) return null;
  return {
    id: r.id, runId: r.run_id, position: r.position, asin: r.asin, url: r.url, title: r.title, status: r.status, error: r.error,
    amazon: P(r.amazon_json), ebay: P(r.ebay_json), risk: P(r.risk_json), overrides: P(r.overrides_json, {}),
    createdAt: r.created_at, updatedAt: r.updated_at, checkedAt: r.checked_at,
  };
}
export function insertProduct(runId, { position, asin, url, title }) {
  const t = now();
  const res = openDb().prepare('INSERT INTO products(run_id,position,asin,url,title,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)')
    .run(runId, position, asin ?? null, url ?? null, title ?? null, 'pending', t, t);
  return Number(res.lastInsertRowid);
}
export function updateProduct(id, fields) {
  const d = openDb();
  const map = { asin: 'asin', url: 'url', title: 'title', status: 'status', error: 'error', amazon: 'amazon_json', ebay: 'ebay_json', risk: 'risk_json', overrides: 'overrides_json', checkedAt: 'checked_at' };
  const jsonKeys = new Set(['amazon', 'ebay', 'risk', 'overrides']);
  const sets = ['updated_at=?']; const vals = [now()];
  for (const [k, v] of Object.entries(fields)) {
    if (!map[k]) continue;
    sets.push(`${map[k]}=?`); vals.push(jsonKeys.has(k) ? J(v) : v);
  }
  vals.push(id);
  d.prepare(`UPDATE products SET ${sets.join(',')} WHERE id=?`).run(...vals);
  return getProduct(id);
}
export function getProduct(id) { return rowToProduct(openDb().prepare('SELECT * FROM products WHERE id=?').get(id)); }
export function listProducts(runId) { return openDb().prepare('SELECT * FROM products WHERE run_id=? ORDER BY position').all(runId).map(rowToProduct); }
export function productAsinsForRun(runId) { return openDb().prepare('SELECT asin FROM products WHERE run_id=?').all(runId).map(r => r.asin); }

// ---------- observations ----------
export function addObservation(productId, kind, data, checkedAt = now()) {
  openDb().prepare('INSERT INTO observations(product_id,kind,checked_at,data_json) VALUES(?,?,?,?)').run(productId, kind, checkedAt, J(data));
}
export function listObservations(productId) {
  return openDb().prepare('SELECT * FROM observations WHERE product_id=? ORDER BY id').all(productId)
    .map(r => ({ id: r.id, kind: r.kind, checkedAt: r.checked_at, data: P(r.data_json) }));
}

// ---------- events ----------
export function addEvent(runId, level, message) {
  openDb().prepare('INSERT INTO events(run_id,ts,level,message) VALUES(?,?,?,?)').run(runId ?? null, now(), level, message);
}
export function listEvents(runId, limit = 200) {
  return openDb().prepare('SELECT * FROM events WHERE run_id=? ORDER BY id DESC LIMIT ?').all(runId, limit).reverse();
}

// ---------- category checks ----------
export function saveCategoryCheck(leafId, ok, resultCount, note) {
  openDb().prepare(`INSERT INTO category_checks(leaf_id,checked_at,ok,result_count,note) VALUES(?,?,?,?,?)
    ON CONFLICT(leaf_id) DO UPDATE SET checked_at=excluded.checked_at, ok=excluded.ok, result_count=excluded.result_count, note=excluded.note`)
    .run(leafId, now(), ok ? 1 : 0, resultCount ?? null, note ?? null);
}
export function listCategoryChecks() {
  const out = {};
  for (const r of openDb().prepare('SELECT * FROM category_checks').all()) out[r.leaf_id] = { checkedAt: r.checked_at, ok: !!r.ok, resultCount: r.result_count, note: r.note };
  return out;
}

// ---------- recheck jobs ----------
export function createRecheckJob(productIds, demo) {
  const res = openDb().prepare('INSERT INTO recheck_jobs(created_at,status,product_ids_json,demo) VALUES(?,?,?,?)').run(now(), 'queued', J(productIds), demo ? 1 : 0);
  return getRecheckJob(Number(res.lastInsertRowid));
}
export function getRecheckJob(id) {
  const r = openDb().prepare('SELECT * FROM recheck_jobs WHERE id=?').get(id);
  return r ? { id: r.id, createdAt: r.created_at, status: r.status, productIds: P(r.product_ids_json, []), demo: !!r.demo, message: r.message, heartbeatAt: r.heartbeat_at } : null;
}
export function updateRecheckJob(id, { status, message, heartbeatAt }) {
  const sets = []; const vals = [];
  if (status !== undefined) { sets.push('status=?'); vals.push(status); }
  if (message !== undefined) { sets.push('message=?'); vals.push(message); }
  if (heartbeatAt !== undefined) { sets.push('heartbeat_at=?'); vals.push(heartbeatAt); }
  if (!sets.length) return getRecheckJob(id);
  vals.push(id);
  openDb().prepare(`UPDATE recheck_jobs SET ${sets.join(',')} WHERE id=?`).run(...vals);
  return getRecheckJob(id);
}
export function listRecheckJobs(limit = 20) {
  return openDb().prepare('SELECT id FROM recheck_jobs ORDER BY id DESC LIMIT ?').all(limit).map(r => getRecheckJob(r.id));
}
