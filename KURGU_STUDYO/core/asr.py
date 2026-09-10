# -*- coding: utf-8 -*-
"""Deşifre + kelime hizalama.

Whisper (sherpa-onnx) ile sessizlik tabanlı parçalara ayırıp deşifre eder,
sonra her kelimeyi hece ağırlığı + ses enerjisiyle zaman koduna oturtur.
Model yoksa boş döner; kullanıcı metni elle girebilir.
"""
import os, re, wave, json
import numpy as np
from .arac import KOK, ses_cikar, json_yaz

MODEL_DIZIN = os.path.join(KOK, "varliklar", "whisper")
MODEL_URL = ("https://github.com/k2-fsa/sherpa-onnx/releases/download/"
             "asr-models/sherpa-onnx-whisper-small.tar.bz2")


def model_var():
    return os.path.exists(os.path.join(MODEL_DIZIN, "small-encoder.int8.onnx"))


def model_indir(ilerleme=None):
    """~640 MB. Kurulumda bir kez çalışır."""
    import urllib.request, tarfile, tempfile, shutil
    os.makedirs(MODEL_DIZIN, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        arsiv = os.path.join(td, "m.tar.bz2")

        def kanca(blok, boy, toplam):
            if ilerleme and toplam > 0:
                ilerleme(min(1.0, blok * boy / toplam))
        urllib.request.urlretrieve(MODEL_URL, arsiv, kanca)
        with tarfile.open(arsiv) as tf:
            tf.extractall(td)
        ic = os.path.join(td, "sherpa-onnx-whisper-small")
        for f in os.listdir(ic):
            shutil.move(os.path.join(ic, f), os.path.join(MODEL_DIZIN, f))
    return model_var()


def _wav_oku(p):
    w = wave.open(p)
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return x, w.getframerate()


def _parcala(x, sr, hedef=5.0, azami=8.5):
    """Sessizliklerden bölerek ~5 saniyelik parçalar üretir."""
    H = 0.01
    hop = int(sr * H)
    nf = len(x) // hop
    rms = np.sqrt(np.array([np.mean(x[i * hop:(i + 1) * hop] ** 2) for i in range(nf)]) + 1e-12)
    db = 20 * np.log10(rms + 1e-9)
    sessiz = db < (np.percentile(db, 15) + 4)
    bosluk, st = [], None
    for i, s in enumerate(sessiz):
        if s and st is None:
            st = i
        if not s and st is not None:
            if i - st >= 12:
                bosluk.append((st + i) / 2 * H)
            st = None
    kesim, son = [0.0], 0.0
    for t in bosluk:
        if t - son >= hedef * 0.7:
            kesim.append(t)
            son = t
    kesim.append(len(x) / sr)
    parca = []
    for a, b in zip(kesim, kesim[1:]):
        while b - a > azami:
            parca.append((a, a + hedef + 2))
            a += hedef + 2
        if b - a > 0.3:
            parca.append((a, b))
    return parca


def desifre(video, dil="tr", ilerleme=None):
    """[{s,e,metin}] döner."""
    if not model_var():
        return []
    import sherpa_onnx, tempfile
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, "a.wav")
        ses_cikar(video, wav, 16000)
        x, sr = _wav_oku(wav)
    parca = _parcala(x, sr)
    rec = sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=os.path.join(MODEL_DIZIN, "small-encoder.int8.onnx"),
        decoder=os.path.join(MODEL_DIZIN, "small-decoder.int8.onnx"),
        tokens=os.path.join(MODEL_DIZIN, "small-tokens.txt"),
        language=dil, task="transcribe", num_threads=max(2, (os.cpu_count() or 4) // 2))
    sonuc = []
    for i, (a, b) in enumerate(parca):
        seg = x[int(a * sr):int(min(b + 0.15, len(x) / sr) * sr)]
        if len(seg) < sr * 0.25:
            continue
        st = rec.create_stream()
        st.accept_waveform(sr, seg)
        rec.decode_stream(st)
        m = st.result.text.strip()
        m = _temizle(m)
        if m:
            sonuc.append({"s": round(a, 2), "e": round(b, 2), "metin": m})
        if ilerleme:
            ilerleme((i + 1) / len(parca))
    return sonuc


# Whisper konuşma dışı sesleri "(Müzik çalıyor)", "[Alkış]" diye yazar
_GURULTU = re.compile(r"[\(\[][^)\]]*[\)\]]|♪|Altyazı M\.K\.|abone ol", re.I)


def _temizle(m):
    m = _GURULTU.sub(" ", m)
    return re.sub(r"\s{2,}", " ", m).strip(" ,-")


SESLI = "aeıioöuüAEIİOÖUÜ"


def _agirlik(k):
    c = re.sub(r"[^\wçğıöşüÇĞİÖŞÜ']", "", k)
    hece = sum(1 for ch in c if ch in SESLI)
    return max(1.0, hece) + 0.25 * max(0, len(c) - 4) / 4


def hizala(video, segmentler):
    """Segment metinlerini kelime kelime zamana oturtur → [{k,s,e}]"""
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, "a.wav")
        ses_cikar(video, wav, 16000)
        x, sr = _wav_oku(wav)
    H = 0.01
    hop = int(sr * H)
    nf = len(x) // hop
    rms = np.sqrt(np.array([np.mean(x[i * hop:(i + 1) * hop] ** 2) for i in range(nf)]) + 1e-12)
    db = 20 * np.log10(rms + 1e-9)
    sesli = db > (np.percentile(db, 15) + 5)
    k = 4
    yumusak = np.convolve(sesli.astype(float), np.ones(2 * k + 1) / (2 * k + 1), mode="same") > 0.35

    kelimeler = []
    for seg in segmentler:
        ks = seg["metin"].split()
        if not ks:
            continue
        i0, i1 = int(seg["s"] / H), min(nf, int(seg["e"] / H))
        mask = yumusak[i0:i1]
        toplam = mask.sum() or len(mask)
        w = np.array([_agirlik(q) for q in ks])
        kota = w / w.sum() * toplam
        idx = i0
        for q, kq in zip(ks, kota):
            while idx < i1 and not yumusak[idx]:
                idx += 1
            if idx >= i1:
                idx = max(i0, i1 - 1)
            bas = idx
            alinan = 0.0
            while idx < i1 and alinan < kq:
                if yumusak[idx]:
                    alinan += 1
                idx += 1
            kelimeler.append({"k": q, "s": round(bas * H, 3),
                              "e": round(max(idx * H, bas * H + 0.10), 3)})
    return kelimeler


# ---------------------------------------------------------------- altyazı --
def altyazi_gruplari(kelimeler, kapali_pencereler=(), azami_kelime=3, azami_karakter=24,
                     vurgular=()):
    """Kelimeleri 2–3'lük gruplara böler, kapalı pencerelerde atlar."""
    vs = {re.sub(r"[^\wçğıöşüÇĞİÖŞÜ']", "", v).lower() for v in vurgular}

    def kapali(t):
        return any(a - 0.02 <= t < b for a, b in kapali_pencereler)

    gruplar, cur = [], []

    def bosalt():
        nonlocal cur
        if not cur:
            return
        gruplar.append({
            "s": cur[0]["s"], "e": cur[-1]["e"],
            "k": [{"t": q["k"],
                   "v": re.sub(r"[^\wçğıöşüÇĞİÖŞÜ']", "", q["k"]).lower() in vs}
                  for q in cur]})
        cur = []

    for q in kelimeler:
        if kapali(q["s"]):
            bosalt()
            continue
        if cur and q["s"] - cur[-1]["e"] > 0.55:
            bosalt()
        cur.append(q)
        metin = " ".join(z["k"] for z in cur)
        if len(cur) >= azami_kelime or len(metin) >= azami_karakter or re.search(r"[.!?:]$", q["k"]):
            bosalt()
    bosalt()

    for i, g in enumerate(gruplar):
        sonraki = gruplar[i + 1]["s"] if i + 1 < len(gruplar) else 1e9
        kuyruk = min(g["e"] + 0.22, sonraki - 0.02)
        for a, b in kapali_pencereler:
            if g["e"] < a <= kuyruk:
                kuyruk = a - 0.02
        g["e"] = round(max(kuyruk, g["s"] + 0.30), 3)
        g["s"] = round(g["s"], 3)
    # çok kısa yetimleri komşuya kat
    temiz = []
    for g in gruplar:
        if temiz and (g["e"] - g["s"]) < 0.42 and (g["s"] - temiz[-1]["e"]) < 0.5 and len(temiz[-1]["k"]) < 4:
            temiz[-1]["k"] += g["k"]
            temiz[-1]["e"] = g["e"]
        else:
            temiz.append(g)
    return temiz


def srt_yaz(gruplar, yol):
    def tc(t):
        h = int(t // 3600); m = int(t % 3600 // 60); s = int(t % 60)
        ms = int(round((t - int(t)) * 1000))
        if ms == 1000:
            s += 1; ms = 0
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
    with open(yol, "w", encoding="utf-8") as f:
        for i, g in enumerate(gruplar, 1):
            f.write(f"{i}\n{tc(g['s'])} --> {tc(g['e'])}\n" +
                    " ".join(w["t"] for w in g["k"]) + "\n\n")
    return yol
