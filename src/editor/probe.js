// Media inspection: dimensions, duration, fps, audio presence, scene cuts, thumbnails.
import { ffprobe, ffmpeg } from './bin.js';

export async function probe(file) {
  const { stdout } = await ffprobe([
    '-v', 'error', '-print_format', 'json',
    '-show_format', '-show_streams', file,
  ]);
  const data = JSON.parse(stdout);
  const v = data.streams.find((s) => s.codec_type === 'video');
  const a = data.streams.find((s) => s.codec_type === 'audio');
  const rot = Math.abs(Number(v?.side_data_list?.[0]?.rotation ?? v?.tags?.rotate ?? 0)) % 180;
  let width = Number(v?.width || 0);
  let height = Number(v?.height || 0);
  if (rot === 90) [width, height] = [height, width]; // portrait shot on a phone
  const [num, den] = String(v?.avg_frame_rate || '30/1').split('/').map(Number);
  return {
    width,
    height,
    fps: den ? Math.round((num / den) * 1000) / 1000 || 30 : 30,
    duration: Number(data.format?.duration || v?.duration || 0),
    hasAudio: Boolean(a),
    orientation: height > width ? 'portrait' : height === width ? 'square' : 'landscape',
    codec: v?.codec_name || null,
  };
}

export async function probeAudio(file) {
  const { stdout } = await ffprobe(['-v', 'error', '-print_format', 'json', '-show_format', file]);
  const data = JSON.parse(stdout);
  return { duration: Number(data.format?.duration || 0) };
}

// Scene-cut timestamps — the backbone of "learning" a reference video's pacing.
export async function sceneCuts(file, threshold = 0.32) {
  try {
    const { stderr } = await ffmpeg([
      '-i', file,
      '-filter_complex', `select='gt(scene,${threshold})',metadata=print:file=-`,
      '-an', '-f', 'null', '-',
    ]);
    const cuts = [];
    for (const m of stderr.matchAll(/pts_time:([0-9.]+)/g)) cuts.push(Number(m[1]));
    return cuts;
  } catch {
    return [];
  }
}

export async function thumbnail(file, out, at = 0.5) {
  await ffmpeg(['-ss', String(at), '-i', file, '-frames:v', '1', '-vf', 'scale=320:-2', out]);
  return out;
}
