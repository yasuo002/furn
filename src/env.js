// Loads .env before any other module reads process.env.
// Imported first so its side effect runs ahead of pipeline config.
import process from 'node:process';
try {
  process.loadEnvFile('.env'); // Node 22+
} catch {
  /* no .env file — MOCK mode or shell-exported vars */
}
