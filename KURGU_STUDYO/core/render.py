# -*- coding: utf-8 -*-
"""Export: planı kare kare render edip kaynak videoyla birleştirir.

Grafikler Chromium'da (aynı motor.js) alfa kanallı PNG olarak basılır,
ffmpeg ile kaynağın üstüne bindirilir, ses efektleri miksajlanır.
Çıktı kaynağın çözünürlüğünde ve yönünde (dikey girdi → dikey çıktı).
"""
import os, json, shutil, subprocess, tempfile, math
from .arac import FF, KOK, CIKTI, bilgi, calistir

WEB = os.path.join(KOK, "web")
SAHNE = os.path.join(WEB, "sahne", "sahne.html")

BUZLU_TIPLER = {"kosul_sonuc", "marka"}


def _buzlu_gerekli(plan):
    for k in plan["katmanlar"]:
        if k.get("gizli"):
            continue
        if k["tip"] in BUZLU_TIPLER:
            return True
        if k["tip"] == "karsitlik" and not k.get("tamEkran"):
            return True
        if k["tip"] == "ag_diyagram" and k.get("tamEkran") is False:
            return True
    return False


def _kromium():
    """Playwright'in indirdiği chromium; ortam değişkeni varsa onu kullan."""
    ozel = os.environ.get("KURGU_CHROME")
    if ozel and os.path.exists(ozel):
        return ozel
    return None


def render(plan, kaynak_video, cikti_yolu, ilerleme=None, on_izleme_boyu=None):
    from playwright.sync_api import sync_playwright
    W, H, fps = plan["W"], plan["H"], plan.get("fps", 30)
    dur = plan["dur"]
    kare_sayisi = int(round(dur * fps))
    tmp = tempfile.mkdtemp(prefix="kurgu_")
    kareler = os.path.join(tmp, "kare")
    os.makedirs(kareler)

    try:
        # 1) buzlu cam için kaynak kareleri
        plakalar = None
        if _buzlu_gerekli(plan):
            plakalar = os.path.join(tmp, "plaka")
            os.makedirs(plakalar)
            calistir(["-y", "-i", kaynak_video, "-vf", f"fps={fps},scale={W}:{H}",
                      "-q:v", "4", os.path.join(plakalar, "p%06d.jpg")])

        # 2) plan dosyası
        plan_yolu = os.path.join(tmp, "plan.json")
        with open(plan_yolu, "w", encoding="utf-8") as f:
            json.dump(plan, f, ensure_ascii=False)

        # 3) grafik karelerini bas
        with sync_playwright() as pw:
            baslat = {"args": ["--no-sandbox", "--disable-lcd-text",
                               "--font-render-hinting=none", "--hide-scrollbars"]}
            ch = _kromium()
            if ch:
                baslat["executable_path"] = ch
            br = pw.chromium.launch(**baslat)
            pg = br.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
            pg.goto(f"file://{SAHNE}?mod=render")
            pg.wait_for_function("typeof window.__yukle === 'function'", timeout=30000)
            # planı doğrudan enjekte et (file:// altında fetch engelli)
            pg.evaluate("(p)=>window.__yukle(p)", plan)
            pg.wait_for_function("window.__hazir === true", timeout=30000)
            pg.evaluate("document.fonts.ready")
            pg.wait_for_timeout(400)
            for i in range(kare_sayisi):
                t = i / fps
                if plakalar:
                    fp = os.path.join(plakalar, f"p{i+1:06d}.jpg")
                    if os.path.exists(fp):
                        pg.evaluate("(u)=>window.__plaka(u)", "file://" + fp)
                pg.evaluate("(t)=>window.__render(t)", t)
                pg.screenshot(path=os.path.join(kareler, f"f{i:06d}.png"),
                              omit_background=True)
                if ilerleme and i % 15 == 0:
                    ilerleme(0.05 + 0.75 * i / kare_sayisi, f"grafik {i}/{kare_sayisi} kare")
            br.close()

        if ilerleme:
            ilerleme(0.82, "video birleştiriliyor")

        # 4) ffmpeg ile birleştir
        sesler = [k for k in plan["katmanlar"] if k["tip"] == "ses" and not k.get("gizli") and k.get("kaynak")]
        args = [FF, "-y", "-hide_banner", "-loglevel", "error",
                "-i", kaynak_video,
                "-framerate", str(fps), "-i", os.path.join(kareler, "f%06d.png")]
        for s in sesler:
            args += ["-i", s["kaynak"]]

        fc = [f"[0:v]scale={W}:{H},setsar=1[bg]",
              "[1:v]format=rgba[ov]",
              "[bg][ov]overlay=0:0:format=auto:shortest=1[vout]"]

        vbil = bilgi(kaynak_video)
        if sesler and vbil["ses"]:
            parts = ["[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a0]"]
            etiket = ["[a0]"]
            for j, s in enumerate(sesler):
                gec = int(round(s["t0"] * 1000))
                sev = s.get("seviye", 0.8)
                parts.append(f"[{2+j}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,"
                             f"adelay={gec}|{gec},volume={sev}[s{j}]")
                etiket.append(f"[s{j}]")
            parts.append("".join(etiket) + f"amix=inputs={len(etiket)}:normalize=0:dropout_transition=0[aout]")
            fc += parts
            ses_map = ["-map", "[aout]"]
        elif vbil["ses"]:
            ses_map = ["-map", "0:a"]
        else:
            ses_map = []

        args += ["-filter_complex", ";".join(fc), "-map", "[vout]", *ses_map,
                 "-c:v", "libx264", "-profile:v", "high", "-preset", "medium",
                 "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(fps)]
        if ses_map:
            args += ["-c:a", "aac", "-b:a", "192k"]
        args += ["-t", f"{dur:.3f}", cikti_yolu]
        subprocess.run(args, check=True)
        if ilerleme:
            ilerleme(1.0, "bitti")
        return cikti_yolu
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def hizli_onizleme(plan, kaynak_video, cikti_yolu, saniye=6.0, baslangic=0.0, ilerleme=None):
    """Kısa bir aralığı hızlıca render eder — 'şunu değiştir' sonrası kontrol için."""
    kisa = dict(plan)
    kisa["dur"] = saniye
    kirp = []
    for k in plan["katmanlar"]:
        a, b = k["t0"] - baslangic, k["t1"] - baslangic
        if b < 0 or a > saniye:
            continue
        kk = dict(k)
        kk["t0"], kk["t1"] = a, b
        # tipe özel zaman alanları da kaysın
        for alan in ("tUst", "tAlt", "tCizgi", "cizgiT", "t"):
            if kk.get(alan) is not None:
                kk[alan] = kk[alan] - baslangic
        if kk.get("satirlar"):
            kk["satirlar"] = [dict(sa, t=sa["t"] - baslangic) if sa.get("t") is not None else sa
                              for sa in kk["satirlar"]]
        if kk["tip"] == "altyazi":
            kk["gruplar"] = [dict(g, s=g["s"] - baslangic, e=g["e"] - baslangic)
                             for g in k.get("gruplar", [])
                             if g["e"] - baslangic > 0 and g["s"] - baslangic < saniye]
        kirp.append(kk)
    kisa["katmanlar"] = kirp
    with tempfile.TemporaryDirectory() as td:
        parca = os.path.join(td, "p.mp4")
        calistir(["-y", "-ss", f"{baslangic:.3f}", "-t", f"{saniye:.3f}",
                  "-i", kaynak_video, "-c:v", "libx264", "-crf", "20",
                  "-preset", "veryfast", "-c:a", "aac", parca])
        return render(kisa, parca, cikti_yolu, ilerleme)
