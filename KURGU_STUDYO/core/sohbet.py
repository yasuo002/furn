# -*- coding: utf-8 -*-
"""Sohbet katmanı: Türkçe komutları plana uygular.

İki kademe:
  1. Kural tabanlı yorumlayıcı — anahtarsız, anında, çevrimdışı çalışır.
     "altyazıyı büyüt", "3. katmanı sil", "12. saniyeye bu sesi ekle",
     "şu yazıyı X yap", "izleme çubuğunu kaldır", "rengi #FF0000 yap" ...
  2. Kural tutmazsa ve ANTHROPIC_API_KEY varsa Claude'a sorulur; model
     planı düzenleyen bir "yama listesi" döndürür (yapılandırılmış çıktı).

Her iki yol da aynı şeyi üretir: (yeni_plan, insan_okunur_mesaj).
"""
import os, re, json, copy

from .plan import SABLON_KATALOG

# ------------------------------------------------------------------ ortak --
SAYI = {"bir": 1, "iki": 2, "üç": 3, "dört": 4, "beş": 5, "altı": 6,
        "yedi": 7, "sekiz": 8, "dokuz": 9, "on": 10}


def _sade(s):
    return re.sub(r"[^\wçğıöşüÇĞİÖŞÜ ]", " ", (s or "")).lower()


def _zaman(metin):
    """'12. saniye', '1:05', '12 sn', 'saniye 12' → saniye (float) ya da None."""
    m = re.search(r"(\d{1,2})\s*[:.]\s*(\d{2})\b", metin)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2))
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*\.?\s*(?:sn|saniye|saniyede|saniyeye|saniyeden)", metin)
    if m:
        return float(m.group(1).replace(",", "."))
    return None


def _katman_bul(plan, metin, secili=None):
    """Metinde geçen ada/sıraya/tipe göre katman seçer; bulamazsa seçili katman."""
    s = _sade(metin)
    # "3. katman" / "katman 3"
    m = re.search(r"(\d+)\s*\.?\s*katman", s) or re.search(r"katman\s*(\d+)", s)
    if m:
        i = int(m.group(1)) - 1
        if 0 <= i < len(plan["katmanlar"]):
            return plan["katmanlar"][i]
    # ada göre
    en_iyi, skor = None, 0
    for k in plan["katmanlar"]:
        for aday in (k.get("ad", ""), k.get("id", ""), k["tip"].replace("_", " ")):
            a = _sade(aday).strip()
            if len(a) >= 3 and a in s and len(a) > skor:
                en_iyi, skor = k, len(a)
    if en_iyi:
        return en_iyi
    # tip eş anlamlıları
    es = {"altyazi": ["altyazı", "altyazi", "yazılar", "yazi"],
          "izleme_cubugu": ["ilerleme çubuğu", "izleme çubuğu", "çubuk", "bar"],
          "cta": ["cta", "çağrı", "kapanış"],
          "marka": ["marka", "logo"],
          "ses": ["ses", "sfx", "efekt sesi"]}
    for tip, kelimeler in es.items():
        if any(k in s for k in kelimeler):
            for k in plan["katmanlar"]:
                if k["tip"] == tip:
                    return k
    # kullanıcı arayüzde bir katman seçtiyse o kazanır
    if secili:
        k = next((k for k in plan["katmanlar"] if k["id"] == secili), None)
        if k:
            return k
    # zaman referansı
    t = _zaman(s)
    if t is not None:
        adaylar = [k for k in plan["katmanlar"]
                   if k["t0"] - 0.6 <= t <= k["t1"] + 0.6 and k["tip"] not in ("altyazi", "izleme_cubugu")]
        if adaylar:
            return adaylar[0]
    return None


def _yeni_id(plan, on):
    n = 1
    var = {k["id"] for k in plan["katmanlar"]}
    while f"{on}{n}" in var:
        n += 1
    return f"{on}{n}"


def _tirnak(metin):
    m = re.search(r'["“\'‘](.+?)["”\'’]', metin)
    return m.group(1).strip() if m else None


def _metinleri_degistir(kat, yeni):
    """Katmandaki ilk metin alanını değiştirir."""
    for alan in ("metin", "ust", "alt", "kicker", "eylem"):
        if kat.get(alan):
            kat[alan] = yeni
            return alan
    if kat.get("satirlar"):
        kat["satirlar"][0]["metin"] = yeni
        return "satırlar[0]"
    return None


# --------------------------------------------------------- kural tabanlı --
def kural(plan, metin, ekler=None, secili=None):
    """Anlaşıldıysa (plan, mesaj) döner; anlaşılmadıysa None."""
    ekler = ekler or []
    p = copy.deepcopy(plan)
    s = _sade(metin)
    sure = p["dur"]

    # --- eklenen dosya varsa: görsel / ses katmanı ---------------------
    if ekler:
        t = _zaman(s)
        eklendi = []
        for e in ekler:
            uz = os.path.splitext(e["yol"])[1].lower()
            t0 = t if t is not None else 0.0
            if uz in (".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"):
                k = {"id": _yeni_id(p, "s"), "tip": "ses", "ad": e["ad"],
                     "t0": round(t0, 2), "t1": round(min(sure, t0 + 3), 2),
                     "kaynak": e["yol"], "seviye": 0.8}
            else:
                video = uz in (".mp4", ".mov", ".webm", ".m4v")
                sur = 3.0
                k = {"id": _yeni_id(p, "g"), "tip": "gorsel", "ad": e["ad"],
                     "t0": round(t0, 2), "t1": round(min(sure, t0 + sur), 2),
                     "kaynak": e["yol"], "video": video,
                     "x": 0.22, "y": 0.40, "w": 0.56, "radius": 20}
            p["katmanlar"].append(k)
            eklendi.append(f'{e["ad"]} → {k["t0"]:.1f}s')
        p["katmanlar"].sort(key=lambda k: (0 if k["tip"] == "altyazi" else 1, k["t0"]))
        return p, "Eklendi: " + ", ".join(eklendi) + \
            ("" if t is not None else "  (zaman belirtmedin, 0. saniyeye koydum — 'X. saniyeye taşı' diyebilirsin)")

    # --- silme ---------------------------------------------------------
    if re.search(r"\b(sil|kaldır|çıkar|kapat|gizle|istemiyorum|olmasın)\b", s):
        kat = _katman_bul(p, metin, secili)
        if kat:
            gizle = bool(re.search(r"\b(kapat|gizle)\b", s))
            if gizle:
                kat["gizli"] = True
                return p, f'"{kat.get("ad", kat["id"])}" gizlendi (silinmedi, geri açılabilir).'
            p["katmanlar"] = [k for k in p["katmanlar"] if k["id"] != kat["id"]]
            return p, f'"{kat.get("ad", kat["id"])}" silindi.'

    # --- geri aç -------------------------------------------------------
    if re.search(r"\b(geri aç|aç|göster|geri getir)\b", s):
        kat = _katman_bul(p, metin, secili)
        if kat and kat.get("gizli"):
            kat["gizli"] = False
            return p, f'"{kat.get("ad", kat["id"])}" tekrar görünür.'

    # --- altyazı puntosu ------------------------------------------------
    if "altyaz" in s:
        alt = next((k for k in p["katmanlar"] if k["tip"] == "altyazi"), None)
        if alt:
            m = re.search(r"(\d{2,3})\s*(?:punto|px|pt)?", s)
            if re.search(r"\b(büyüt|büyük|iri)\b", s):
                alt["punto"] = int(alt.get("punto", 46) * 1.15)
                p["stil"]["altyaziPunto"] = alt["punto"]
                return p, f'Altyazı puntosu {alt["punto"]}.'
            if re.search(r"\b(küçült|küçük|ufalt)\b", s):
                alt["punto"] = int(alt.get("punto", 46) * 0.87)
                p["stil"]["altyaziPunto"] = alt["punto"]
                return p, f'Altyazı puntosu {alt["punto"]}.'
            if m and re.search(r"punto|px|pt|boyut", s):
                alt["punto"] = int(m.group(1))
                p["stil"]["altyaziPunto"] = alt["punto"]
                return p, f'Altyazı puntosu {alt["punto"]}.'
            if re.search(r"\b(yukarı)\b", s):
                alt["y"] = round(max(0.45, alt.get("y", 0.685) - 0.04), 3)
                return p, f'Altyazı yukarı alındı (y={alt["y"]}).'
            if re.search(r"\b(aşağı)\b", s):
                alt["y"] = round(min(0.90, alt.get("y", 0.685) + 0.04), 3)
                return p, f'Altyazı aşağı alındı (y={alt["y"]}).'
            if re.search(r"zemin|arka plan|blur|bulan", s):
                p["stil"]["altyaziZemini"] = not p["stil"].get("altyaziZemini", True)
                return p, "Altyazı zemini " + ("açık." if p["stil"]["altyaziZemini"] else "kapalı.")

    # --- renk -----------------------------------------------------------
    m = re.search(r"#([0-9a-fA-F]{6})", metin)
    if m and re.search(r"reng|renk|aksan|vurgu", s):
        p["stil"]["renk"]["amber"] = "#" + m.group(1).upper()
        return p, f'Aksan rengi #{m.group(1).upper()} oldu.'

    # --- zaman kaydırma --------------------------------------------------
    if re.search(r"\b(taşı|kaydır|geciktir|erkene|geç|erken)\b", s):
        kat = _katman_bul(p, metin, secili)
        t = _zaman(s)
        if kat and t is not None:
            if re.search(r"\b(geciktir|geç)\b", s) and not re.search(r"saniyeye", s):
                d = kat["t1"] - kat["t0"]
                kat["t0"] = round(max(0, kat["t0"] + t), 2)
                kat["t1"] = round(min(sure, kat["t0"] + d), 2)
            else:
                d = kat["t1"] - kat["t0"]
                kat["t0"] = round(max(0, t), 2)
                kat["t1"] = round(min(sure, t + d), 2)
            for alan in ("tUst", "tAlt", "tCizgi", "cizgiT"):
                if kat.get(alan) is not None:
                    kat[alan] = round(min(kat["t1"], max(kat["t0"], kat[alan])), 2)
            return p, f'"{kat.get("ad", kat["id"])}" {kat["t0"]:.1f}–{kat["t1"]:.1f}s aralığına alındı.'

    # --- süre ------------------------------------------------------------
    if re.search(r"\b(uzat|kısalt)\b", s):
        kat = _katman_bul(p, metin, secili)
        if kat:
            d = _zaman(s) or 0.7
            if "kısalt" in s:
                d = -d
            kat["t1"] = round(min(sure, max(kat["t0"] + 0.5, kat["t1"] + d)), 2)
            return p, f'"{kat.get("ad", kat["id"])}" bitişi {kat["t1"]:.1f}s.'

    # --- metin değiştirme -------------------------------------------------
    yeni = _tirnak(metin)
    if yeni and re.search(r"\b(yaz|değiştir|yap|olsun|düzelt)\b", s):
        kat = _katman_bul(p, metin, secili)
        if kat:
            alan = _metinleri_degistir(kat, yeni)
            if alan:
                return p, f'"{kat.get("ad", kat["id"])}" → {alan}: “{yeni}”.'
    # tırnaksız: "X yazısını Y yap"
    m = re.search(r"([\wçğıöşüÇĞİÖŞÜ ]{3,30})\s*(?:yazısını|yazıyı|metnini)\s*([\wçğıöşüÇĞİÖŞÜ ]{2,40})\s*(?:yap|olsun|değiştir)", metin, re.I)
    if m:
        eski, yen = m.group(1).strip(), m.group(2).strip()
        for k in p["katmanlar"]:
            for alan in ("metin", "ust", "alt", "kicker"):
                if k.get(alan) and _sade(eski) in _sade(k[alan]):
                    k[alan] = yen.upper()
                    return p, f'“{eski}” → “{yen}”.'
            for sat in k.get("satirlar", []):
                if _sade(eski) in _sade(sat.get("metin", "")):
                    sat["metin"] = yen.upper()
                    return p, f'“{eski}” → “{yen}”.'

    # --- ses seviyesi -----------------------------------------------------
    if re.search(r"\bses(i|ini)?\b", s) and re.search(r"\b(kıs|aç|yükselt|azalt)\b", s):
        kat = _katman_bul(p, metin, secili) or next((k for k in p["katmanlar"] if k["tip"] == "ses"), None)
        if kat and kat["tip"] == "ses":
            kat["seviye"] = round(min(1.5, max(0.05, kat.get("seviye", 0.8) *
                                               (1.3 if re.search(r"aç|yükselt", s) else 0.7))), 2)
            return p, f'Ses seviyesi {kat["seviye"]}.'

    return None


# ------------------------------------------------------------ Claude yolu --
YAMA_SEMASI = {
    "type": "json_schema",
    "name": "kurgu_yamasi",
    "schema": {
        "type": "object",
        "properties": {
            "mesaj": {"type": "string", "description": "Kullanıcıya Türkçe tek cümlelik özet."},
            "yamalar": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "islem": {"type": "string", "enum": ["guncelle", "ekle", "sil"]},
                        "id": {"type": "string", "description": "guncelle/sil için katman id'si."},
                        "alanlar": {"type": "object", "additionalProperties": True,
                                    "description": "guncelle/ekle için katman alanları."}
                    },
                    "required": ["islem"],
                    "additionalProperties": False
                }
            }
        },
        "required": ["mesaj", "yamalar"],
        "additionalProperties": False
    }
}

SISTEM = """Sen dikey kısa video kurgusu yapan bir editörsün. Elinde bir kurgu planı var:
katmanlar listesi, her katmanın id, tip, ad, t0, t1 ve tipe özel alanları var.

Kullanılabilir katman tipleri ve ne işe yaradıkları:
{katalog}

Kurallar:
- Yüz bölgesi: hiçbir grafik y=0.36'nın üstüne çıkmaz.
- Altyazı ile grafik aynı anda aynı şeyi söylemez.
- Metinler kısa ve büyük harf olur; satır başına en fazla ~22 karakter.
- Zamanlar saniye cinsinden, videonun süresi {sure} saniye.
- Sadece kullanıcının istediği değişikliği yap; başka hiçbir şeye dokunma.
- "ekle" işleminde id'yi sen uydur (ör. "k12"), tip ve t0/t1 zorunlu.
"""


def claude(plan, metin, ekler=None):
    """Anahtar varsa modele sorar. (plan, mesaj) ya da None döner."""
    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        return None
    try:
        from anthropic import Anthropic
    except ImportError:
        return None
    try:
        istemci = Anthropic()
        ozet = [{kk: v for kk, v in k.items() if kk != "gruplar"} for k in plan["katmanlar"]]
        ek_metin = ""
        if ekler:
            ek_metin = "\n\nKullanıcının eklediği dosyalar (kaynak yolu olarak kullan):\n" + \
                "\n".join(f'- {e["ad"]}: {e["yol"]}' for e in ekler)
        y = istemci.messages.create(
            model="claude-opus-5",
            max_tokens=4000,
            thinking={"type": "adaptive"},
            system=SISTEM.format(katalog="\n".join(f"- {k}: {v}" for k, v in SABLON_KATALOG.items()),
                                 sure=plan["dur"]),
            output_config={"format": YAMA_SEMASI},
            messages=[{"role": "user", "content":
                       "Plandaki katmanlar:\n" + json.dumps(ozet, ensure_ascii=False, indent=1) +
                       ek_metin + "\n\nİstek: " + metin}],
        )
        veri = json.loads("".join(b.text for b in y.content if getattr(b, "type", "") == "text"))
    except Exception as e:
        return None, f"Model çağrısı başarısız: {e}"

    p = copy.deepcopy(plan)
    idx = {k["id"]: k for k in p["katmanlar"]}
    for ym in veri.get("yamalar", []):
        islem = ym.get("islem")
        if islem == "sil" and ym.get("id") in idx:
            p["katmanlar"] = [k for k in p["katmanlar"] if k["id"] != ym["id"]]
            idx.pop(ym["id"], None)
        elif islem == "guncelle" and ym.get("id") in idx:
            idx[ym["id"]].update(ym.get("alanlar") or {})
        elif islem == "ekle":
            k = dict(ym.get("alanlar") or {})
            k.setdefault("id", ym.get("id") or _yeni_id(p, "k"))
            k.setdefault("ad", k.get("tip", "Katman"))
            if k.get("tip") in SABLON_KATALOG:
                p["katmanlar"].append(k)
                idx[k["id"]] = k
    p["katmanlar"].sort(key=lambda k: (0 if k["tip"] == "altyazi" else 1, k.get("t0", 0)))
    return p, veri.get("mesaj", "Uygulandı.")


# --------------------------------------------------------------- giriş --
def uygula(plan, metin, ekler=None, secili=None):
    """(yeni_plan | None, mesaj) döner."""
    metin = (metin or "").strip()
    if not metin and not ekler:
        return None, "Bir şey yazmadın."
    sonuc = kural(plan, metin, ekler, secili)
    if sonuc:
        return sonuc
    sonuc = claude(plan, metin, ekler)
    if sonuc:
        p, msj = sonuc
        if p is None:
            return None, msj
        return p, msj
    return None, ("Bunu anlayamadım. Örnekler: “altyazıyı büyüt”, “Marka katmanını sil”, "
                  "“12. saniyeye taşı”, “üst yazıyı \"YENİ METİN\" yap”, ya da dosya ekleyip "
                  "“8. saniyeye ekle” de. Daha serbest cümleler için ANTHROPIC_API_KEY tanımla.")
