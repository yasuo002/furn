// Resolves the bundled ffmpeg/ffprobe binaries (no system install required)
// and exposes small promise wrappers used by the editor modules.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export const FFMPEG = require('ffmpeg-static');
export const FFPROBE = require('ffprobe-static').path;

export function run(bin, args, { onLog } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args);
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => {
      const s = String(d);
      err += s;
      if (err.length > 200_000) err = err.slice(-100_000);
      onLog?.(s);
    });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve({ stdout: out, stderr: err });
      else reject(new Error(`${bin.split('/').pop()} exited ${code}\n${err.slice(-4000)}`));
    });
  });
}

export const ffmpeg = (args, opts) => run(FFMPEG, ['-hide_banner', '-y', ...args], opts);
export const ffprobe = (args) => run(FFPROBE, args);
