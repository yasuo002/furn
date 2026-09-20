import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(__dirname, '..');
export const DATA_DIR = process.env.RESEARCH_DATA_DIR || path.join(APP_ROOT, 'data');
export const DB_PATH = path.join(DATA_DIR, 'research.db');
export const PROFILE_DIR = path.join(DATA_DIR, 'browser-profile'); // ayrı, kalıcı araştırma profili
export const PORT = Number(process.env.PORT || 3777);
export const HOST = '127.0.0.1'; // yalnızca yerel bağlantılar
export const HEADLESS = process.env.RESEARCH_HEADLESS === '1';
export const HEARTBEAT_STALE_MS = 25_000;
