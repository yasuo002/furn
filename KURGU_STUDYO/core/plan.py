# -*- coding: utf-8 -*-
"""Konuşmadan otomatik kurgu planı üretir.

İki kademe:
  1. Kural tabanlı planlayıcı (anahtarsız çalışır) — Türkçe cümle yapılarını
     tanır: üçlü sayımlar, "X değil Y" karşıtlıkları, sorular, "yok" listeleri,
     marka anışları, kapanış cümlesi.
  2. Claude API anahtarı varsa sohbet.py aynı planı dil modeline yeniden
     yazdırabilir; şablon kataloğu ve zaman kodları burada tanımlıdır.
"""
import re, json

VARSAYILAN_STIL = {
    "renk": {
        "amber": "#FFC24B", "amberKoyu": "#C2761B",
        "clay": "#E2643C", "clayKoyu": "#D2532A",
        "paper": "#F7F4ED", "ink": "#0E1311",
    },
    "font": "Outfit", "fontVurgu": "LoraI",
    "altyaziZemini": True,
    "altyaziPunto": 46,
    "altyaziY": 0.685,
}

SABLON_KATALOG = {
    "altyazi": "kelime hizalı altyazı katmanı (otomatik)",
    "liste_kart": "açık kartlarda madde listesi, isteğe bağlı üstü çizili",
    "uclu_vurgu": "koyu kartlarda 2-4 maddelik vurgu + isteğe bağlı sonuç pill'i",
    "karsitlik": "üstü çizili yanlış → vurgulu doğru (tamEkran seçeneği var)",
    "kosul_sonuc": "her satır buzlu cam panelde: koşul → sonuç",
    "hero_kart": "tam ekran açık kart, satır satır büyük tipografi",
    "ag_diyagram": "düğümler + aralarında çizilen bağlantılar",
    "marka": "buzlu cam üzerinde marka lockup + alt çizgi",
    "cta": "alt kısımda çağrı çipi",
    "izleme_cubugu": "alt kenarda ilerleme çubuğu",
    "tam_ekran_metin": "tam ekran açık zeminde büyük satırlar",
    "gorsel": "kullanıcının eklediği resim/video",
    "ses": "ses efekti (görsel yok)",
}

SESLI = "aeıioöuüAEIİOÖUÜ"


def _sade(s):
    return re.sub(r"[^\wçğıöşüÇĞİÖŞÜ ]", "", s or "").strip().lower()


def cumleler(kelimeler):
    """Kelime listesini cümlelere böler; her cümle {s,e,metin,kelimeler}."""
    out, cur = [], []
    for k in kelimeler:
        cur.append(k)
        if re.search(r"[.!?]$", k["k"]):
            out.append(cur); cur = []
    if cur:
        out.append(cur)
    return [{"s": c[0]["s"], "e": c[-1]["e"],
             "metin": " ".join(x["k"] for x in c), "kelimeler": c} for c in out]


def kirp(metin, n):
    """Kelimeyi ortadan bölmeden n karaktere kısaltır."""
    metin = (metin or "").strip()
    if len(metin) <= n:
        return metin
    kes = metin[:n]
    if " " in kes:
        kes = kes[:kes.rfind(" ")]
    return kes.rstrip(" ,.;:")


def _kelime_zamani(cum, ara):
    """Cümle içinde bir kelimeyi bulup başlangıç anını döndürür."""
    a = _sade(ara)
    for k in cum["kelimeler"]:
        if _sade(k["k"]).startswith(a[:6]):
            return k["s"]
    return cum["s"]


# --------------------------------------------------------------- desenler --
def _uclu(cum):
    """'Sistemdir, ekiptir, network'tür' / 'a, b ve c' → 3 madde."""
    m = cum["metin"].rstrip(".!?")
    parca = [p.strip() for p in re.split(r",| ve ", m) if p.strip()]
    if 3 <= len(parca) <= 4 and all(len(p.split()) <= 3 for p in parca):
        return parca
    return None


def _karsitlik(cum, sonraki):
    """'Sorun X değildi. Sorun Y.' veya 'X değil, Y'."""
    m = cum["metin"]
    q = re.search(r"^(.*?)\s+değil(?:dir|dır|di|dı)?[,.]?\s*(.*)$", m, re.I)
    if q:
        sol, sag = q.group(1).strip(), q.group(2).strip()
        # deşifre "değildir"i bölmüş olabilir: baştaki öksüz eki at
        sag = re.sub(r"^(?:dir|dır|ir|di|dı|d|r)[,.]?\s+", "", sag, flags=re.I)
        if sag and len(sag.split()) <= 5:
            return sol, sag
        if sonraki and len(sonraki["metin"].split()) <= 6:
            return sol, sonraki["metin"].rstrip(".!?")
    return None


def _soru(cum):
    return bool(re.search(r"\b(mi|mı|mu|mü)\??$", cum["metin"].strip().rstrip("?.")) or
                cum["metin"].strip().endswith("?"))


def _yok_listesi(cum):
    """'çevresi yok, yol gösterecek insanı yok, ağı yok' → 3 madde."""
    if cum["metin"].lower().count("yok") < 2:
        return None
    parca = re.split(r",", cum["metin"])
    maddeler = []
    for p in parca:
        p = p.strip()
        if "yok" not in p.lower():
            continue
        etiket = re.sub(r"\byok\w*\b", "", p, flags=re.I).strip(" ,.")
        etiket = re.sub(r"^(ama|ve|de|da)\s+", "", etiket, flags=re.I).strip()
        if etiket:
            maddeler.append(etiket)
    return maddeler if len(maddeler) >= 2 else None


def _marka(cum):
    """Ardışık 2-4 büyük harfle başlayan kelime = özel isim."""
    ks = cum["metin"].split()
    en_iyi = []
    cur = []
    for i, k in enumerate(ks):
        temiz = k.strip(".,!?'\"")
        # cümle başındaki büyük harf özel isim değildir
        if i == 0 or _sade(temiz) in DUR_KELIMELER:
            if len(cur) > len(en_iyi):
                en_iyi = cur
            cur = []
            continue
        if temiz[:1].isupper() and len(temiz) >= 4 and not temiz.isupper():
            cur.append(temiz)
        else:
            if len(cur) > len(en_iyi):
                en_iyi = cur
            cur = []
    if len(cur) > len(en_iyi):
        en_iyi = cur
    return en_iyi if 2 <= len(en_iyi) <= 4 and len(" ".join(en_iyi)) >= 10 else None


DUR_KELIMELER = {
    "ama", "ve", "veya", "çünkü", "yani", "ancak", "fakat", "eğer", "bir", "bu",
    "şu", "o", "çok", "daha", "en", "ben", "sen", "biz", "siz", "onlar", "her",
    "hiç", "için", "gibi", "kadar", "sonra", "önce", "şimdi", "yine", "de", "da",
    "ki", "mi", "mı", "ise", "diye", "böyle", "öyle", "peki", "tabii", "işte",
}


def _daha_fazla(cum):
    """'daha fazla X, daha fazla Y ve daha fazla Z'"""
    bul = re.findall(r"daha fazla ([\wçğıöşüÇĞİÖŞÜ]+)", cum["metin"], re.I)
    return bul if len(bul) >= 2 else None


# ------------------------------------------------------------ planlayıcı ---
def otomatik_plan(vbilgi, kelimeler, stil=None, marka_adi=None):
    stil = stil or dict(VARSAYILAN_STIL)
    W, H = vbilgi["w"], vbilgi["h"]
    sure = vbilgi["sure"]
    cum = cumleler(kelimeler)
    katmanlar = []
    kapali = []          # altyazının susacağı pencereler
    sid = [0]

    def yid(on):
        sid[0] += 1
        return f"{on}{sid[0]}"

    def ekle(k, kapat=True):
        k["_kapat"] = kapat
        katmanlar.append(k)

    kullanilan = set()
    for i, c in enumerate(cum):
        if c["s"] in kullanilan:
            continue
        sonraki = cum[i + 1] if i + 1 < len(cum) else None
        d = c["e"] - c["s"]
        if d < 0.8:
            continue

        # 1) "daha fazla X / Y / Z" → üstü çizilen kâğıt liste
        df = _daha_fazla(c)
        if df and len(df) >= 3:
            t0 = max(0, c["s"] - 0.35)
            t1 = min(sure, (sonraki["e"] if sonraki and sonraki["e"] - c["e"] < 2.5 else c["e"]) + 0.4)
            sat = []
            for j, kelime in enumerate(df[:3]):
                sat.append({"ust": "DAHA FAZLA", "metin": kelime.upper(),
                            "t": _kelime_zamani(c, kelime)})
            ekle({"id": yid("k"), "tip": "liste_kart", "ad": "Yanlış odak",
                  "t0": round(t0, 2), "t1": round(t1, 2), "satirlar": sat,
                  "cizgiT": round(min(t1 - 1.1, c["e"] + 0.2), 2)})
            kullanilan.add(c["s"])
            if sonraki:
                kullanilan.add(sonraki["s"])
            continue

        # 2) üçlü sayım → koyu kartlar
        u = _uclu(c)
        if u:
            t0 = max(0, c["s"] - 0.25)
            t1 = min(sure, c["e"] + 1.4)
            sat = [{"metin": p.upper().rstrip(".,"), "t": _kelime_zamani(c, p.split()[0])}
                   for p in u[:3]]
            ekle({"id": yid("k"), "tip": "uclu_vurgu", "ad": "Üçlü vurgu",
                  "t0": round(t0, 2), "t1": round(t1, 2), "satirlar": sat})
            kullanilan.add(c["s"])
            continue

        # 3) "yok" listesi → kâğıt kart + ✕
        yl = _yok_listesi(c)
        if yl:
            t0 = max(0, c["s"] - 0.25)
            t1 = min(sure, c["e"] + 0.7)
            sat = [{"metin": kirp(p, 22).upper(), "t": _kelime_zamani(c, p.split()[0])} for p in yl[:3]]
            ekle({"id": yid("k"), "tip": "liste_kart", "ad": "Eksikler",
                  "t0": round(t0, 2), "t1": round(t1, 2), "satirlar": sat,
                  "cizgiT": round(c["e"] - 0.5, 2)})
            kullanilan.add(c["s"])
            continue

        # 4) karşıtlık
        ka = _karsitlik(c, sonraki)
        if ka:
            sol, sag = ka
            t0 = max(0, c["s"] - 0.3)
            bitis = sonraki["e"] if (sonraki and sag == sonraki["metin"].rstrip(".!?")) else c["e"]
            t1 = min(sure, bitis + 0.6)
            ekle({"id": yid("k"), "tip": "karsitlik", "ad": "Karşıtlık",
                  "t0": round(t0, 2), "t1": round(t1, 2),
                  "kicker": "GERÇEK SORUN", "ust": kirp(sol, 26).upper(), "alt": kirp(sag, 22).upper(),
                  "tUst": round(c["s"] + 0.2, 2),
                  "tCizgi": round(c["s"] + 0.2 + (c["e"] - c["s"]) * 0.55, 2),
                  "tAlt": round((sonraki["s"] if bitis != c["e"] else c["s"] + (c["e"] - c["s"]) * 0.7) + 0.1, 2)})
            kullanilan.add(c["s"])
            if bitis != c["e"] and sonraki:
                kullanilan.add(sonraki["s"])
            continue

        # 5) soru → tam ekran hero kart
        if _soru(c) and len(c["metin"].split()) <= 8:
            t0 = max(0, c["s"] - 0.3)
            t1 = min(sure, c["e"] + 0.8)
            ks = c["metin"].rstrip("?.").split()
            n = max(1, len(ks) // 3)
            satir, buf = [], []
            for k in ks:
                buf.append(k)
                if len(buf) >= n:
                    satir.append(" ".join(buf)); buf = []
            if buf:
                satir.append(" ".join(buf))
            sat = [{"metin": s.upper(), "t": _kelime_zamani(c, s.split()[0]),
                    "vurgu": (j == len(satir) - 1)} for j, s in enumerate(satir[:3])]
            sat[-1]["metin"] += "?"
            ekle({"id": yid("k"), "tip": "hero_kart", "ad": "Hero soru",
                  "t0": round(t0, 2), "t1": round(t1, 2),
                  "kicker": "", "satirlar": sat,
                  "tCizgi": round(c["e"] - 0.15, 2)})
            kullanilan.add(c["s"])
            continue

        # 6) marka anışı
        mk = _marka(c)
        if mk and marka_adi is None:
            marka_adi = " ".join(mk)
        if mk and len(" ".join(mk)) > 8:
            t0 = max(0, c["s"] - 0.2)
            t1 = min(sure, c["e"] + 1.6)
            yarim = len(mk) // 2 or 1
            ekle({"id": yid("k"), "tip": "marka", "ad": "Marka",
                  "t0": round(t0, 2), "t1": round(t1, 2),
                  "kicker": "", "ust": " ".join(mk[:yarim]).upper(),
                  "alt": " ".join(mk[yarim:]).upper()}, kapat=False)
            kullanilan.add(c["s"])
            continue

    # çakışan grafikleri ayır — aynı anda iki motion grafik olmaz
    graf = sorted([k for k in katmanlar
                   if k["tip"] not in ("altyazi", "izleme_cubugu", "ses")],
                  key=lambda k: k["t0"])
    for a, b in zip(graf, graf[1:]):
        if a["t1"] > b["t0"] - 0.15:
            a["t1"] = round(max(a["t0"] + 0.6, b["t0"] - 0.15), 2)
            for alan in ("tUst", "tAlt", "tCizgi", "cizgiT"):
                if a.get(alan) is not None:
                    a[alan] = round(min(a[alan], a["t1"] - 0.25), 2)

    # kapalı pencereler kırpılmış sürelere göre yenilensin
    kapali = [(k["t0"], k["t1"]) for k in graf if k.pop("_kapat", False)]

    # kapanış CTA
    if marka_adi:
        katmanlar.append({"id": yid("k"), "tip": "cta", "ad": "CTA",
                          "t0": round(max(0, sure - 6.5), 2), "t1": round(sure, 2),
                          "metin": marka_adi.upper(), "eylem": "takip et →"})

    # altyazı + izleme çubuğu
    son_soz = max((k["e"] for k in kelimeler), default=sure)
    kapali.sort()
    birlesik = []
    for a, b in kapali:
        if birlesik and a <= birlesik[-1][1] + 0.05:
            birlesik[-1][1] = max(birlesik[-1][1], b)
        else:
            birlesik.append([a, b])
    from .asr import altyazi_gruplari
    gruplar = altyazi_gruplari(kelimeler, [(a, b) for a, b in birlesik],
                               vurgular=VURGU_KELIMELER)
    katmanlar.insert(0, {"id": "altyazi", "tip": "altyazi", "ad": "Altyazı",
                         "t0": 0, "t1": round(min(sure, son_soz + 0.3), 2),
                         "punto": stil["altyaziPunto"], "y": stil["altyaziY"],
                         "gruplar": gruplar})
    katmanlar.append({"id": "cubuk", "tip": "izleme_cubugu", "ad": "İzleme çubuğu",
                      "t0": 0, "t1": round(sure, 2)})

    for k in katmanlar:
        k.pop("_kapat", None)
    katmanlar.sort(key=lambda k: (0 if k["tip"] == "altyazi" else 1, k["t0"]))
    return {
        "W": W, "H": H, "fps": 30, "dur": round(sure, 2),
        "dikey": vbilgi["dikey"],
        "stil": stil,
        "katmanlar": katmanlar,
    }


VURGU_KELIMELER = [
    "sadece", "asla", "hiç", "gerçek", "doğru", "yanlış", "tek", "yalnız", "en",
    "değil", "yok", "her", "sıfırdan", "hemen", "şimdi", "büyük", "küçük",
    "önemli", "kritik", "asıl", "ilk", "son", "başarı", "hata", "para", "zaman",
]
