# -*- coding: utf-8 -*-
"""Referans videolardan ÖLÇÜLEBİLİR stil çıkarımı.

Çıkardıkları:
  · kesim ritmi      — ortalama plan süresi, kesim zamanları
  · palet            — baskın renkler, en sık kullanılan aksan rengi
  · parlaklık/kontrast profili
  · metin yoğunluğu  — karelerin ne kadarında yazı var (kaba kenar analizi)
  · ses onset'leri   — kesimlerin sese kilitlenip kilitlenmediği

Bunlar "stil profili"ni besler. Hangi cümlede hangi şablonun kullanılacağı
kararı dil modeline ait; burada sadece görsel parmak izi çıkarılır.
"""
import os, re, subprocess, colorsys, math
from collections import Counter
from .arac import FF, bilgi, ses_cikar, calistir


def kesimler(video, esik=0.10, min_ara=0.30):
    out = subprocess.run(
        [FF, "-hide_banner", "-i", video, "-filter:v",
         f"select='gt(scene,{esik})',showinfo", "-f", "null", "-"],
        capture_output=True, text=True).stderr
    t = [float(x) for x in re.findall(r"pts_time:([0-9.]+)", out)]
    m = []
    for x in t:
        if not m or x - m[-1] > min_ara:
            m.append(round(x, 2))
    return m


def palet(video, sure, n_kare=14):
    """Kareleri 8x8'e indirip baskın renkleri ve aksanı bulur."""
    from PIL import Image
    import tempfile
    renkler = Counter()
    parlaklik = []
    doygunluk = []
    with tempfile.TemporaryDirectory() as td:
        for i in range(n_kare):
            t = sure * (i + 0.5) / n_kare
            png = os.path.join(td, f"k{i}.png")
            try:
                calistir(["-y", "-ss", f"{t:.2f}", "-i", video, "-frames:v", "1",
                          "-vf", "scale=48:-2", png])
            except Exception:
                continue
            if not os.path.exists(png):
                continue
            im = Image.open(png).convert("RGB")
            for px in im.getdata():
                r, g, b = [c / 255 for c in px]
                h, s, v = colorsys.rgb_to_hsv(r, g, b)
                parlaklik.append(v)
                doygunluk.append(s)
                # ten rengi konuşan kafa videolarında baskın; aksan sayımından çıkar
                ten = 0.015 <= h <= 0.115 and s < 0.72
                if s > 0.35 and v > 0.35 and not ten:
                    renkler[(round(h * 24), round(s * 4), round(v * 4))] += 1
    aksan = None
    if renkler:
        (h, s, v), _ = renkler.most_common(1)[0]
        r, g, b = colorsys.hsv_to_rgb(h / 24, min(1, s / 4 + .12), min(1, v / 4 + .12))
        aksan = "#%02X%02X%02X" % (int(r * 255), int(g * 255), int(b * 255))
    return {
        "aksan": aksan,
        "parlaklik": round(sum(parlaklik) / len(parlaklik), 3) if parlaklik else 0.5,
        "doygunluk": round(sum(doygunluk) / len(doygunluk), 3) if doygunluk else 0.3,
    }


def metin_yogunlugu(video, sure, n_kare=12):
    """Karelerde yatay kenar yoğunluğu — yazı olan kareler daha yüksek çıkar.
       Mutlak bir ölçü değil, referanslar arası karşılaştırma için."""
    from PIL import Image, ImageFilter
    import tempfile
    skor = []
    with tempfile.TemporaryDirectory() as td:
        for i in range(n_kare):
            t = sure * (i + 0.5) / n_kare
            png = os.path.join(td, f"m{i}.png")
            try:
                calistir(["-y", "-ss", f"{t:.2f}", "-i", video, "-frames:v", "1",
                          "-vf", "scale=240:-2,format=gray", png])
            except Exception:
                continue
            if not os.path.exists(png):
                continue
            im = Image.open(png).convert("L")
            # alt üçte bir (altyazı bandı) kenar yoğunluğu
            w, h = im.size
            alt = im.crop((0, int(h * 0.6), w, h)).filter(ImageFilter.FIND_EDGES)
            px = list(alt.getdata())
            skor.append(sum(1 for v in px if v > 60) / max(1, len(px)))
    return round(sum(skor) / len(skor), 4) if skor else 0.0


def ses_onset(video, esik_kat=2.2):
    import numpy as np, wave, tempfile
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, "a.wav")
        try:
            ses_cikar(video, wav, 22050)
        except Exception:
            return []
        w = wave.open(wav)
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    sr, hop, win = 22050, 1102, 1024
    n = max(0, len(x) // hop)
    if n < 4:
        return []
    S = []
    hann = np.hanning(win)
    for i in range(n):
        seg = x[i * hop:i * hop + win]
        if len(seg) < win:
            seg = np.pad(seg, (0, win - len(seg)))
        S.append(np.abs(np.fft.rfft(seg * hann)))
    S = np.array(S)
    flux = np.maximum(0, np.diff(S, axis=0)).sum(axis=1)
    thr = flux.mean() + esik_kat * flux.std()
    on = [round((i + 1) * 0.05, 2) for i in range(len(flux)) if flux[i] > thr]
    m = []
    for t in on:
        if not m or t - m[-1] > 0.25:
            m.append(t)
    return m


def bir_video(yol):
    b = bilgi(yol)
    k = kesimler(yol)
    pl = palet(yol, b["sure"])
    on = ses_onset(yol)
    # kesimler sese kilitli mi?
    kilit = 0
    for c in k:
        if any(abs(c - o) < 0.12 for o in on):
            kilit += 1
    planlar = [round(b - a, 2) for a, b in zip(k, k[1:])] if len(k) > 1 else []
    return {
        "dosya": os.path.basename(yol),
        "sure": round(b["sure"], 2),
        "boyut": f'{b["w"]}x{b["h"]}',
        "dikey": b["dikey"],
        "kesim_sayisi": len(k),
        "ort_plan": round(sum(planlar) / len(planlar), 2) if planlar else None,
        "kesim_hizi": round(len(k) / max(1, b["sure"]) * 60, 1),   # dakikada kesim
        "sese_kilitli_oran": round(kilit / len(k), 2) if k else 0,
        "aksan": pl["aksan"],
        "parlaklik": pl["parlaklik"],
        "doygunluk": pl["doygunluk"],
        "metin_yogunlugu": metin_yogunlugu(yol, b["sure"]),
    }


def profil(yollar):
    """Birden fazla referanstan ortalama stil profili."""
    tekil = []
    for y in yollar:
        try:
            tekil.append(bir_video(y))
        except Exception as e:
            tekil.append({"dosya": os.path.basename(y), "hata": str(e)})
    ok = [t for t in tekil if "hata" not in t]
    if not ok:
        return {"videolar": tekil, "ozet": None}

    def ort(k):
        v = [t[k] for t in ok if t.get(k) is not None]
        return round(sum(v) / len(v), 3) if v else None

    aksanlar = [t["aksan"] for t in ok if t.get("aksan")]
    ozet = {
        "video_sayisi": len(ok),
        "ort_plan_sn": ort("ort_plan"),
        "kesim_hizi_dk": ort("kesim_hizi"),
        "sese_kilitli_oran": ort("sese_kilitli_oran"),
        "parlaklik": ort("parlaklik"),
        "doygunluk": ort("doygunluk"),
        "metin_yogunlugu": ort("metin_yogunlugu"),
        "aksan_adaylari": aksanlar,
        "dikey_oran": round(sum(1 for t in ok if t["dikey"]) / len(ok), 2),
    }
    # yorum
    op = ozet["ort_plan_sn"] or 3.0
    ozet["ritim"] = "çok hızlı" if op < 2 else ("hızlı" if op < 3 else ("orta" if op < 4.5 else "sakin"))
    my = ozet["metin_yogunlugu"] or 0
    ozet["metin"] = "yoğun" if my > 0.09 else ("orta" if my > 0.05 else "az")
    return {"videolar": tekil, "ozet": ozet}
