# -*- coding: utf-8 -*-
"""KURGU STÜDYO — yerel sunucu.

Ek bağımlılık yok: Python'un kendi http.server'ı üzerine kurulu.
Tarayıcı arayüzü web/ klasöründen servis edilir.

    python app.py            → http://127.0.0.1:8765
"""
import os, sys, json, re, time, threading, mimetypes, webbrowser, traceback
import urllib.parse as up
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core.arac import KOK, PROJE, CIKTI, bilgi, json_yaz, json_oku, guvenli_ad

WEB = os.path.join(KOK, "web")
AKTIF = os.path.join(PROJE, "aktif")
for d in ("referans", "hedef", "sfx", "ek"):
    os.makedirs(os.path.join(AKTIF, d), exist_ok=True)

DURUM_YOLU = os.path.join(AKTIF, "durum.json")
PLAN_YOLU = os.path.join(AKTIF, "plan.json")

KILIT = threading.Lock()
ISLER = {}          # is_id → {ad, oran, mesaj, bitti, hata, sonuc}


# ------------------------------------------------------------------ durum --
def durum_oku():
    return json_oku(DURUM_YOLU, {"referans": [], "hedef": None, "sfx": [],
                                 "profil": None, "sohbet": [], "cikti": None})


def durum_yaz(d):
    json_yaz(DURUM_YOLU, d)
    return d


def plan_oku():
    return json_oku(PLAN_YOLU)


# --------------------------------------------------------------- işler --
def is_baslat(ad, fn):
    iid = f"{int(time.time()*1000)}"
    ISLER[iid] = {"ad": ad, "oran": 0.0, "mesaj": "başlıyor", "bitti": False,
                  "hata": None, "sonuc": None}

    def ilerleme(oran, mesaj=""):
        ISLER[iid]["oran"] = float(oran)
        if mesaj:
            ISLER[iid]["mesaj"] = mesaj

    def sar():
        try:
            ISLER[iid]["sonuc"] = fn(ilerleme)
            ISLER[iid]["oran"] = 1.0
            ISLER[iid]["mesaj"] = "bitti"
        except Exception as e:
            ISLER[iid]["hata"] = f"{e}"
            traceback.print_exc()
        finally:
            ISLER[iid]["bitti"] = True
    threading.Thread(target=sar, daemon=True).start()
    return iid


# ------------------------------------------------------------- iş gövdeleri
def is_analiz(ilerleme):
    from core import analiz
    d = durum_oku()
    yollar = [r["yol"] for r in d["referans"]]
    if not yollar:
        raise RuntimeError("Referans video yok.")
    ilerleme(0.05, "referanslar inceleniyor")
    pr = analiz.profil(yollar)
    d["profil"] = pr
    durum_yaz(d)
    return pr


def is_isle(ilerleme):
    """Hedef videoyu deşifre et, hizala, otomatik plan üret."""
    from core import asr, plan as planlayici
    d = durum_oku()
    if not d.get("hedef"):
        raise RuntimeError("Önce editlenecek videoyu ekle.")
    video = d["hedef"]["yol"]
    vb = bilgi(video)

    ilerleme(0.03, "konuşma çözümleniyor")
    if not asr.model_var():
        ilerleme(0.05, "konuşma modeli indiriliyor (~640 MB, tek seferlik)")
        asr.model_indir(lambda o: ilerleme(0.05 + 0.35 * o, "model indiriliyor %d%%" % (o * 100)))
    segmentler = asr.desifre(video, ilerleme=lambda o: ilerleme(0.42 + 0.28 * o, "deşifre"))
    if not segmentler:
        raise RuntimeError("Konuşma çözümlenemedi.")
    ilerleme(0.74, "kelimeler zamana oturtuluyor")
    kelimeler = asr.hizala(video, segmentler)
    json_yaz(os.path.join(AKTIF, "kelimeler.json"), kelimeler)

    ilerleme(0.86, "kurgu planı çıkarılıyor")
    stil = None
    pr = (d.get("profil") or {}).get("ozet")
    if pr:
        import copy
        stil = copy.deepcopy(planlayici.VARSAYILAN_STIL)
        for c in (pr.get("aksan_adaylari") or []):
            r, g, b = (int(c[i:i + 2], 16) for i in (1, 3, 5))
            # yeterince canlı ve yeterince parlak bir aksan bulursak onu kullan
            if max(r, g, b) - min(r, g, b) > 70 and max(r, g, b) > 150:
                stil["renk"]["amber"] = c
                break
        if pr.get("metin") == "az":
            stil["altyaziPunto"] = 42
    p = planlayici.otomatik_plan(vb, kelimeler, stil=stil)
    json_yaz(PLAN_YOLU, p)
    ilerleme(1.0, "hazır")
    return {"katman_sayisi": len(p["katmanlar"]), "sure": p["dur"]}


def is_render(ilerleme, hizli=False, baslangic=0.0):
    from core import render as rnd
    d = durum_oku()
    p = plan_oku()
    if not p:
        raise RuntimeError("Plan yok.")
    video = d["hedef"]["yol"]
    ad = ("onizleme" if hizli else "kurgu_" + time.strftime("%H%M%S")) + ".mp4"
    cikti = os.path.join(CIKTI, ad)
    if hizli:
        rnd.hizli_onizleme(p, video, cikti, saniye=6.0, baslangic=baslangic, ilerleme=ilerleme)
    else:
        rnd.render(p, video, cikti, ilerleme=ilerleme)
    if not hizli:
        d["cikti"] = cikti
        durum_yaz(d)
    return {"yol": cikti, "ad": ad}


# ------------------------------------------------------------------ HTTP --
class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    # -------------------------------------------------------- yardımcılar
    def json_don(self, veri, kod=200):
        g = json.dumps(veri, ensure_ascii=False).encode("utf-8")
        self.send_response(kod)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(g)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(g)

    def hata(self, msj, kod=400):
        self.json_don({"hata": msj}, kod)

    def govde(self):
        n = int(self.headers.get("Content-Length") or 0)
        veri = b""
        while len(veri) < n:
            parca = self.rfile.read(min(1 << 20, n - len(veri)))
            if not parca:
                break
            veri += parca
        return veri

    def dosya_don(self, yol, indir=False):
        if not os.path.exists(yol) or not os.path.isfile(yol):
            return self.hata("dosya yok", 404)
        boy = os.path.getsize(yol)
        tip = mimetypes.guess_type(yol)[0] or "application/octet-stream"
        aralik = self.headers.get("Range")
        a, b = 0, boy - 1
        kod = 200
        if aralik:
            m = re.match(r"bytes=(\d*)-(\d*)", aralik)
            if m:
                if m.group(1):
                    a = int(m.group(1))
                if m.group(2):
                    b = min(int(m.group(2)), boy - 1)
                kod = 206
        n = max(0, b - a + 1)
        self.send_response(kod)
        self.send_header("Content-Type", tip)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(n))
        if kod == 206:
            self.send_header("Content-Range", f"bytes {a}-{b}/{boy}")
        if indir:
            self.send_header("Content-Disposition",
                             'attachment; filename="%s"' % os.path.basename(yol))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        with open(yol, "rb") as f:
            f.seek(a)
            kalan = n
            while kalan > 0:
                blok = f.read(min(1 << 20, kalan))
                if not blok:
                    break
                try:
                    self.wfile.write(blok)
                except (BrokenPipeError, ConnectionResetError):
                    return
                kalan -= len(blok)

    # --------------------------------------------------------------- GET
    def do_GET(self):
        u = up.urlparse(self.path)
        q = dict(up.parse_qsl(u.query))
        yol = u.path

        if yol == "/":
            return self.dosya_don(os.path.join(WEB, "index.html"))
        if yol.startswith("/web/"):
            hedef = os.path.normpath(os.path.join(WEB, yol[5:]))
            if not hedef.startswith(WEB):
                return self.hata("izin yok", 403)
            return self.dosya_don(hedef)

        if yol == "/api/durum":
            d = durum_oku()
            d["plan_var"] = os.path.exists(PLAN_YOLU)
            d["anahtar"] = bool(os.environ.get("ANTHROPIC_API_KEY") or
                                os.environ.get("ANTHROPIC_AUTH_TOKEN"))
            return self.json_don(d)
        if yol == "/api/plan":
            p = plan_oku()
            return self.json_don(p) if p else self.hata("plan yok", 404)
        if yol == "/api/is":
            i = ISLER.get(q.get("id"))
            return self.json_don(i) if i else self.hata("iş yok", 404)
        if yol == "/medya":
            return self.dosya_don(self._guvenli(q.get("yol", "")))
        if yol == "/indir":
            return self.dosya_don(self._guvenli(q.get("yol", "")), indir=True)
        return self.hata("yok", 404)

    def _guvenli(self, yol):
        """Sadece proje/ ve cikti/ altındaki dosyalara izin ver."""
        y = os.path.normpath(os.path.abspath(yol))
        if y.startswith(PROJE) or y.startswith(CIKTI):
            return y
        return ""

    # -------------------------------------------------------------- POST
    def do_POST(self):
        u = up.urlparse(self.path)
        q = dict(up.parse_qsl(u.query))
        yol = u.path
        try:
            if yol == "/api/yukle":
                return self.yukle(q)
            if yol == "/api/analiz":
                return self.json_don({"is": is_baslat("analiz", is_analiz)})
            if yol == "/api/isle":
                return self.json_don({"is": is_baslat("isle", is_isle)})
            if yol == "/api/render":
                hizli = q.get("hizli") == "1"
                bas = float(q.get("t") or 0)
                return self.json_don({"is": is_baslat(
                    "render", lambda il: is_render(il, hizli, bas))})
            if yol == "/api/plan":
                p = json.loads(self.govde().decode("utf-8"))
                json_yaz(PLAN_YOLU, p)
                return self.json_don({"tamam": True})
            if yol == "/api/sohbet":
                return self.sohbet()
            if yol == "/api/sil":
                return self.sil(q)
            return self.hata("yok", 404)
        except Exception as e:
            traceback.print_exc()
            return self.hata(str(e), 500)

    def yukle(self, q):
        tur = q.get("tur", "ek")
        if tur not in ("referans", "hedef", "sfx", "ek"):
            return self.hata("geçersiz tür")
        ad = guvenli_ad(q.get("ad", "dosya"))
        klasor = os.path.join(AKTIF, tur)
        os.makedirs(klasor, exist_ok=True)
        hedef = os.path.join(klasor, ad)
        n = 1
        kok, uz = os.path.splitext(hedef)
        while os.path.exists(hedef):
            hedef = f"{kok}_{n}{uz}"
            n += 1
        with open(hedef, "wb") as f:
            f.write(self.govde())
        kayit = {"ad": os.path.basename(hedef), "yol": hedef}
        try:
            b = bilgi(hedef)
            kayit.update({"sure": round(b["sure"], 2), "w": b["w"], "h": b["h"],
                          "dikey": b["dikey"], "ses": b["ses"]})
        except Exception:
            pass
        with KILIT:
            d = durum_oku()
            if tur == "hedef":
                d["hedef"] = kayit
            elif tur in ("referans", "sfx"):
                d[tur].append(kayit)
            durum_yaz(d)
        return self.json_don(kayit)

    def sil(self, q):
        tur, ad = q.get("tur"), q.get("ad")
        with KILIT:
            d = durum_oku()
            if tur == "hedef":
                d["hedef"] = None
            elif tur in ("referans", "sfx"):
                d[tur] = [x for x in d[tur] if x["ad"] != ad]
            durum_yaz(d)
        return self.json_don({"tamam": True})

    def sohbet(self):
        from core import sohbet as sh
        istek = json.loads(self.govde().decode("utf-8"))
        p = plan_oku()
        if not p:
            return self.hata("Önce videoyu işle.")
        ekler = []
        for a in istek.get("ekler", []):
            y = os.path.join(AKTIF, "ek", guvenli_ad(a))
            if os.path.exists(y):
                ekler.append({"ad": a, "yol": y})
        yeni, mesaj = sh.uygula(p, istek.get("metin", ""), ekler, istek.get("secili"))
        if yeni:
            json_yaz(PLAN_YOLU, yeni)
        with KILIT:
            d = durum_oku()
            d.setdefault("sohbet", []).append({"ben": istek.get("metin", ""), "sistem": mesaj})
            durum_yaz(d)
        return self.json_don({"mesaj": mesaj, "plan": yeni, "degisti": bool(yeni)})


def calistir(port=8765, ac=True):
    s = ThreadingHTTPServer(("127.0.0.1", port), H)
    url = f"http://127.0.0.1:{port}"
    print(f"\n  KURGU STÜDYO çalışıyor →  {url}\n  (kapatmak için Ctrl+C)\n")
    if ac:
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        s.serve_forever()
    except KeyboardInterrupt:
        print("\n  kapatıldı.")


if __name__ == "__main__":
    p = 8765
    for a in sys.argv[1:]:
        if a.isdigit():
            p = int(a)
    calistir(p, ac="--sessiz" not in sys.argv)
