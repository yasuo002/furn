# AI Ad Generator

Local web-app port of the n8n workflow **"test items in spaces"**. It turns a
product/painting photo into a short social-ready video ad:

1. **Upload** a painting/product photo (+ optional room photo) and a description.
2. **Gemini 2.5 Flash** (via [fal.ai](https://fal.ai)) places the painting on the wall of the room.
3. The edited image is hosted on **imgbb**.
4. **WAN v2.2 i2v** (via fal.ai queue) animates it into a video (queue + poll loop).
5. *(Optional)* the video is posted to TikTok / Instagram / YouTube via upload-post.

Each step maps 1:1 to a node in the original n8n graph — see `src/pipeline.js`.

## Run locally

```bash
npm install
npm start            # → http://localhost:3000
```

Open http://localhost:3000 and use the form.

### Modes

- **MOCK mode** (default, no keys): the pipeline runs end-to-end with fake URLs so
  you can see the flow and UI without spending API credits.
- **LIVE mode**: copy `.env.example` to `.env`, set `FAL_KEY` and `IMGBB_API_KEY`,
  then `npm start`. Social posting also needs `UPLOAD_POST_API_KEY`.

```bash
cp .env.example .env
# edit .env, then:
npm start
```

> The app loads `.env` automatically on startup (`src/env.js`). You can also just
> export the variables in your shell instead of using a file.

## Scene splitter (`video_pipeline.py`)

A standalone companion tool that splits a video into one clip per camera
angle / shot using [PySceneDetect](https://www.scenedetect.com/).

```bash
# system dep:
apt-get install ffmpeg            # provides ffmpeg + ffprobe
pip install -r requirements.txt

python video_pipeline.py input.mp4 --outdir clips
```

Useful flags:

| Flag                | Purpose                                                        |
|---------------------|---------------------------------------------------------------|
| `--threshold 27`    | ContentDetector sensitivity; **lower = more cuts**            |
| `--min-len 1.0`     | minimum scene length in seconds                               |
| `--copy`            | fast stream-copy split (cuts snap to keyframes)               |
| `--delogo X Y W H`  | blank a fixed logo/sub box (fractions of frame)              |
| `--drop-soft-subs`  | strip soft subtitle tracks before splitting                  |

It prints a manifest (scene #, start, end, duration, file) and writes
`<name>_scene001.mp4`, `<name>_scene002.mp4`, … into `--outdir`.

## Project layout

| File                | Purpose                                             |
|---------------------|-----------------------------------------------------|
| `server.js`         | Express server, form endpoint, SSE progress stream  |
| `src/pipeline.js`   | The pipeline (one function per n8n node)            |
| `public/index.html` | The upload form + live log + result viewer          |
