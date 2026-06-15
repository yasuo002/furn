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

## Project layout

| File                | Purpose                                             |
|---------------------|-----------------------------------------------------|
| `server.js`         | Express server, form endpoint, SSE progress stream  |
| `src/pipeline.js`   | The pipeline (one function per n8n node)            |
| `public/index.html` | The upload form + live log + result viewer          |
