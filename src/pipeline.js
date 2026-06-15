// Pipeline that mirrors the n8n workflow "test items in spaces".
//
// n8n node            -> function here
// --------------------------------------------------------------
// Set Prompts         -> PROMPTS (overridable per request)
// Set APIs Vars       -> CONFIG  (env driven)
// Upload * to imgbb   -> uploadToImgbb()
// Gemini 2.5 Flash    -> geminiEditImage()
// FAL WAN i2v *       -> wanImageToVideo()  (queue + poll loop)
// Upload Post         -> uploadPost()       (optional, stubbed)
//
// In MOCK mode (no FAL_KEY / IMGBB_API_KEY set) the network calls are
// short-circuited with deterministic fake data so the app runs end-to-end
// locally without credentials.

export const PROMPTS = {
  imageEdit:
    'Place the furniture from the first image realistically into the room from the ' +
    'second image. Match the perspective, scale, lighting and shadows so the furniture ' +
    'looks naturally and physically placed on the floor of the room. Keep the room ' +
    'background, walls and camera framing unchanged. Photorealistic result.',
  imageToVideo:
    'Camera pan right and gentle truck/dolly right for the whole clip; the painting ' +
    'stays centered and in focus; reveal the right edge and frame depth; camera height ' +
    'aligned to painting center, medium-wide shot, 35 mm lens, soft gallery lighting; ' +
    'straight vertical lines, natural slight motion blur; no zoom',
};

export const CONFIG = {
  falKey: process.env.FAL_KEY || '',
  imgbbApiKey: process.env.IMGBB_API_KEY || '',
  numberOfImages: Number(process.env.NUMBER_OF_IMAGES || 1),
  geminiModel: process.env.GEMINI_MODEL || 'fal-ai/gemini-25-flash-image/edit',
  wanModel: process.env.WAN_MODEL || 'fal-ai/wan/v2.2-a14b/image-to-video',
  // Poll settings for the WAN queue (n8n: Wait 30s, loop until COMPLETED)
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 5000),
  pollMaxAttempts: Number(process.env.POLL_MAX_ATTEMPTS || 60),
};

// LIVE mode needs only a FAL key. imgbb is optional: without it, images are
// passed to fal.ai as base64 data URIs instead of hosted URLs.
export const MOCK = !CONFIG.falKey;
export const USE_IMGBB = !!CONFIG.imgbbApiKey;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function falHeaders(extra = {}) {
  return { Authorization: `Key ${CONFIG.falKey}`, ...extra };
}

// --- Upload * to imgbb (or data-URI fallback) --------------------------------
function detectMime(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif';
  if (buffer.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  return 'image/png';
}

export async function hostImage(buffer, log = () => {}) {
  if (MOCK) {
    log('imgbb: MOCK upload');
    return `https://i.ibb.co/mock/${Math.random().toString(36).slice(2)}.png`;
  }
  if (!USE_IMGBB) {
    log('imgbb: skipped — using base64 data URI');
    return `data:${detectMime(buffer)};base64,${buffer.toString('base64')}`;
  }
  const form = new FormData();
  form.append('key', CONFIG.imgbbApiKey);
  form.append('image', buffer.toString('base64')); // imgbb accepts base64 in the image field
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error(`imgbb upload failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.data.url;
}

// --- Gemini 2.5 Flash - Generate Image --------------------------------------
export async function geminiEditImage(imageUrls, prompt, log = () => {}) {
  if (MOCK) {
    log('gemini: MOCK edit');
    return 'https://fal.media/files/mock/edited-image.png';
  }
  const res = await fetch(`https://fal.run/${CONFIG.geminiModel}`, {
    method: 'POST',
    headers: falHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      prompt,
      image_urls: imageUrls,
      num_images: CONFIG.numberOfImages,
    }),
  });
  if (!res.ok) throw new Error(`gemini edit failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  // "Separate Image Outputs" -> take first image url
  const images = json.images || [];
  if (!images.length) throw new Error('gemini returned no images');
  return images[0].url;
}

// --- FAL WAN i2v (Queue + status loop + Result) -----------------------------
export async function wanImageToVideo(imageUrl, prompt, log = () => {}) {
  if (MOCK) {
    log('wan: MOCK queue + poll');
    await sleep(500);
    return 'https://fal.media/files/mock/final-video.mp4';
  }
  // Queue
  const queueRes = await fetch(`https://queue.fal.run/${CONFIG.wanModel}`, {
    method: 'POST',
    headers: falHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      image_url: imageUrl,
      prompt,
      num_frames: 96,
      frames_per_second: 24,
      resolution: '480p',
    }),
  });
  if (!queueRes.ok) throw new Error(`wan queue failed: ${queueRes.status} ${await queueRes.text()}`);
  const { request_id } = await queueRes.json();
  log(`wan: queued request ${request_id}`);

  // Poll status until COMPLETED (n8n: Wait 30s -> status -> IF -> loop)
  for (let attempt = 0; attempt < CONFIG.pollMaxAttempts; attempt++) {
    await sleep(CONFIG.pollIntervalMs);
    const statusRes = await fetch(
      `https://queue.fal.run/fal-ai/wan/requests/${request_id}/status`,
      { headers: falHeaders() }
    );
    if (!statusRes.ok) throw new Error(`wan status failed: ${statusRes.status}`);
    const status = await statusRes.json();
    log(`wan: status ${status.status} (attempt ${attempt + 1})`);
    if (status.status === 'COMPLETED') break;
    if (status.status === 'FAILED' || status.status === 'ERROR') {
      throw new Error(`wan generation failed: ${JSON.stringify(status)}`);
    }
    if (attempt === CONFIG.pollMaxAttempts - 1) throw new Error('wan polling timed out');
  }

  // Result
  const resultRes = await fetch(`https://queue.fal.run/fal-ai/wan/requests/${request_id}`, {
    headers: falHeaders(),
  });
  if (!resultRes.ok) throw new Error(`wan result failed: ${resultRes.status}`);
  const result = await resultRes.json();
  return result.video?.url || result.video;
}

// --- Upload Post (optional) --------------------------------------------------
export async function uploadPost(videoUrl, { title, caption, platforms }, log = () => {}) {
  // upload-post.com integration is optional; stubbed unless configured.
  if (!process.env.UPLOAD_POST_API_KEY) {
    log('upload-post: skipped (no UPLOAD_POST_API_KEY)');
    return { skipped: true };
  }
  log(`upload-post: would post to ${platforms.join(', ')}`);
  return { skipped: false, platforms };
}

// --- Orchestrator: runs the whole graph -------------------------------------
export async function runPipeline({
  photo1, photo2, description, prompts = {}, generateVideo = false, onLog = () => {},
}) {
  const log = (m) => onLog(m);
  const imageEditPrompt = prompts.imageEdit || PROMPTS.imageEdit;
  const i2vPrompt = prompts.imageToVideo || PROMPTS.imageToVideo;

  log('Görseller hazırlanıyor…');
  const imageUrls = [];
  imageUrls.push(await hostImage(photo1, log));
  if (photo2) imageUrls.push(await hostImage(photo2, log));

  log('Mobilya odaya yerleştiriliyor (Gemini 2.5 Flash)…');
  const editedUrl = await geminiEditImage(imageUrls, imageEditPrompt, log);

  // Gemini returns a hosted fal.media URL already; only re-host via imgbb if configured.
  let hostedEditedUrl = editedUrl;
  if (!MOCK && USE_IMGBB) {
    log('Sonuç görseli imgbb üzerinde barındırılıyor…');
    const imgRes = await fetch(editedUrl);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    hostedEditedUrl = await hostImage(buf, log);
  }

  let videoUrl = null;
  let post = { skipped: true };
  if (generateVideo) {
    log('Video oluşturuluyor (WAN i2v, kuyruk + bekleme)…');
    videoUrl = await wanImageToVideo(hostedEditedUrl, i2vPrompt, log);
    post = await uploadPost(videoUrl, {
      title: description || 'Generated ad',
      caption: description || '',
      platforms: ['tiktok', 'instagram', 'youtube'],
    }, log);
  }

  log('Tamamlandı.');
  return { sourceImageUrls: imageUrls, editedImageUrl: hostedEditedUrl, videoUrl, post, mock: MOCK };
}
