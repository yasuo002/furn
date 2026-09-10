# -*- coding: utf-8 -*-
"""Ortak yardımcılar: ffmpeg yolu, video bilgisi, ses çıkarma."""
import os, re, json, subprocess, shutil

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJE = os.path.join(KOK, "proje")
CIKTI = os.path.join(KOK, "cikti")
VARLIK = os.path.join(KOK, "varliklar")
for d in (PROJE, CIKTI, VARLIK):
    os.makedirs(d, exist_ok=True)


def ffmpeg():
    """Sistemde ffmpeg varsa onu, yoksa pip ile gelen imageio-ffmpeg'i kullan."""
    p = shutil.which("ffmpeg")
    if p:
        return p
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


FF = ffmpeg()


def calistir(args, **kw):
    return subprocess.run([FF, "-hide_banner", "-loglevel", "error", *args],
                          check=True, **kw)


def bilgi(yol):
    """Video/ses dosyasının süresi, boyutu, fps'i."""
    out = subprocess.run([FF, "-hide_banner", "-i", yol],
                         capture_output=True, text=True).stderr
    d = {"sure": 0.0, "w": 0, "h": 0, "fps": 30.0, "ses": False}
    m = re.search(r"Duration: (\d+):(\d+):(\d+)\.(\d+)", out)
    if m:
        h, mn, s, cs = (int(x) for x in m.groups())
        d["sure"] = h * 3600 + mn * 60 + s + cs / 100
    m = re.search(r"Video:.*?, (\d{2,5})x(\d{2,5})", out)
    if m:
        d["w"], d["h"] = int(m.group(1)), int(m.group(2))
    m = re.search(r"(\d+(?:\.\d+)?) fps", out)
    if m:
        d["fps"] = float(m.group(1))
    # döndürülmüş telefon videoları
    if re.search(r"rotate\s*:\s*(90|270)", out) or "displaymatrix" in out.lower():
        m2 = re.search(r"rotation of (-?\d+)", out)
        if m2 and abs(int(m2.group(1))) in (90, 270):
            d["w"], d["h"] = d["h"], d["w"]
    d["ses"] = "Audio:" in out
    d["dikey"] = d["h"] >= d["w"]
    return d


def ses_cikar(video, wav, sr=16000):
    calistir(["-y", "-i", video, "-ac", "1", "-ar", str(sr), "-vn", wav])
    return wav


def kare_cikar(video, t, png, genislik=None):
    vf = f"scale={genislik}:-2" if genislik else None
    args = ["-y", "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1"]
    if vf:
        args += ["-vf", vf]
    args += [png]
    calistir(args)
    return png


def json_yaz(yol, veri):
    os.makedirs(os.path.dirname(yol), exist_ok=True)
    with open(yol, "w", encoding="utf-8") as f:
        json.dump(veri, f, ensure_ascii=False, indent=1)


def json_oku(yol, varsayilan=None):
    if not os.path.exists(yol):
        return varsayilan
    with open(yol, encoding="utf-8") as f:
        return json.load(f)


def guvenli_ad(s):
    s = re.sub(r"[^\w\-. ]", "_", s or "")
    return s.strip().replace(" ", "_")[:80] or "dosya"
