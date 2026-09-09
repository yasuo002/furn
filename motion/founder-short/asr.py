"""Konusmayi enerji tabanli VAD ile parcalara ayirip her parcayi Whisper ile tanir.

Ortamda HuggingFace ve OpenAI CDN'i kurum politikasiyla kapali; model bu yuzden
sherpa-onnx'in GitHub release'inden aliniyor:

  pip install sherpa-onnx
  curl -L -o m.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2
  tar xjf m.tar.bz2

Uzun parcalar (18 sn) butun cumleleri, kisa parcalar (4 sn) ince zamanlamayi
verir; ikisini birlestirip altyazi metnini elde ediyoruz. Parcalar SESSIZ
noktadan bolunur, yoksa kelime ortasindan kesilip metin yarida kaliyor.
"""
import wave, struct, json, math, sys, time
import sherpa_onnx

FS = 16000
w = wave.open("audio.wav"); n = w.getnframes()
x = [v / 32768.0 for v in struct.unpack(f"<{n}h", w.readframes(n))]

# --- enerji zarfi (20 ms) ---
H = int(FS * 0.02)
env = [max(abs(v) for v in x[i:i+H]) for i in range(0, len(x) - H, H)]
srt = sorted(env)
noise = srt[int(len(srt) * 0.20)]
peak  = srt[int(len(srt) * 0.92)]
thr = noise + (peak - noise) * 0.10

# --- konusma pencereleri ---
speech = [e > thr for e in env]
# kisa bosluklari doldur (<= 0.30 s)
gap = 0
for i, s in enumerate(speech):
    if s:
        if 0 < gap <= 22:
            for j in range(i - gap, i): speech[j] = True
        gap = 0
    else:
        gap += 1

segs, cur = [], None
for i, s in enumerate(speech):
    if s and cur is None: cur = i
    elif not s and cur is not None:
        if (i - cur) * 0.02 >= 0.40: segs.append([cur * 0.02, i * 0.02])
        cur = None
if cur is not None: segs.append([cur * 0.02, len(speech) * 0.02])

# --- uzun parcalari SESSIZ noktadan bol, kelime ortasindan degil ---
def split_quiet(a, b, depth=0):
    if b - a <= 4.2 or depth > 7: return [[a, b]]
    lo, hi = int((a + (b-a)*0.35)/0.02), int((a + (b-a)*0.65)/0.02)
    q = min(range(lo, hi), key=lambda i: env[i]) * 0.02
    return split_quiet(a, q, depth+1) + split_quiet(q, b, depth+1)
out = []
for a, b in segs: out += split_quiet(a, b)
# her parcaya nefes payi
segs = [[max(0, a-0.22), min(len(x)/FS, b+0.22)] for a, b in out if b - a > 0.35]
print(f"{len(segs)} konusma parcasi, toplam {sum(b-a for a,b in segs):.1f} sn "
      f"/ {len(x)/FS:.1f} sn")

rec = sherpa_onnx.OfflineRecognizer.from_whisper(
    encoder="sherpa-onnx-whisper-small/small-encoder.int8.onnx",
    decoder="sherpa-onnx-whisper-small/small-decoder.int8.onnx",
    tokens="sherpa-onnx-whisper-small/small-tokens.txt",
    language="tr", task="transcribe", num_threads=4,
)
res, t0 = [], time.time()
for k, (a, b) in enumerate(segs):
    st = rec.create_stream()
    st.accept_waveform(FS, x[int(a*FS):int(b*FS)])
    rec.decode_stream(st)
    txt = st.result.text.strip()
    if txt:
        res.append({"a": round(a, 2), "b": round(b, 2), "t": txt})
        print(f"  {a:6.2f}-{b:6.2f}  {txt}")
    if k % 5 == 4: print(f"    [{k+1}/{len(segs)}  {time.time()-t0:.0f}s]", file=sys.stderr)
json.dump(res, open("tr_fine.json", "w"), ensure_ascii=False, indent=1)
print(f"\nbitti: {len(res)} parca, {time.time()-t0:.0f}s")

