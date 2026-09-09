# -*- coding: utf-8 -*-
import json, re

# ASR çıktısı elle düzeltildi. İşaretler:  *altın anahtar*  !turuncu olumsuz!  _serif italik_  [kutu]
CHUNKS = [
 (0.10, 6.80,  "Girişimcilikte çoğu insan odağı !yanlış! yerde. Herkes daha fazla *satışın*, daha fazla *reklamın* ve daha fazla *sermayenin* peşinde."),
 (7.08,13.98,  "Ama hiç kimse şunu konuşmuyor. [Bir şirketi büyüten sadece para değildir.] *Sistemdir*, *ekiptir*, *network'tür*."),
 (14.10,20.98, "Çünkü girişimcilik tek başına yapılacak bir iş değil. İlk girişimimde bunu çok sert yaşadım. Durmadan çalışıyordum. _Ve bir noktadan sonra şunu fark ettim._"),
 (21.10,27.98, "Sorun yetersiz çalışmak !değilmiş!. [Sorun yalnız çalışmak.] Çünkü doğru *sistem* yoksa işler büyüdükçe karmaşıklaşır."),
 (28.00,34.92, "Doğru *ekip* yoksa en iyi fikir bile !ilerlemez!. Doğru *çevre* yoksa aynı hatayı tekrar tekrar yaparsınız."),
 (35.04,41.98, "Artık bir işe başlarken ilk baktığım şey şu: [Bu yapı bensiz çalışabilir mi?] Çünkü gerçek girişimcilik her işi kendin yapmak !değil!."),
 (42.02,48.98, "Doğru *sistemi*, doğru *insanları* ve doğru *ağı* kurabilmek. Zaten bu yüzden [Anadolu Girişim Ağı'nı] kurdum."),
 (49.00,55.78, "Çünkü Anadolu'da çok iyi fikirler var. Ama çoğu insanın çevresi !yok!, yol gösterecek insanı !yok!, tecrübe paylaşabileceği ağı !yok!. _İnsanlar çoğu zaman fikirden değil, yalnızlıktan kaybediyor._"),
 (56.24,61.24, "Ben artık şuna inanıyorum. Doğru *network*, doğru *sistem* ve doğru *ekip*, [bir girişimcinin en büyük sermayesidir.]"),
]

def parse(text):
    """işaretli metni (kelime, stil) listesine çevirir; kutu grupları tek kart olur"""
    tokens, i = [], 0
    for m in re.finditer(r"\[([^\]]+)\]|_([^_]+)_|\*([^*]+)\*|!([^!]+)!|([^\s\[\]_*!]+)", text):
        box, ital, gold, neg, plain = m.groups()
        if box:   tokens.append(("box", box))
        elif ital:tokens.append(("italic", ital))
        elif gold:tokens.append(("gold", gold))
        elif neg: tokens.append(("neg", neg))
        else:
            # tek başına noktalama önceki kelimeye yapışsın
            if tokens and re.fullmatch(r"[.,:;?!]+", plain):
                st, tx = tokens[-1]; tokens[-1] = (st, tx + plain)
            else:
                tokens.append(("plain", plain))
    return tokens

def group(tokens):
    """2-3 kelimelik kartlar; kutu ve italik bloklar kendi kartında (uzunsa bölünür)"""
    cards, buf = [], []
    def flush():
        if buf: cards.append(list(buf)); buf.clear()
    for style, txt in tokens:
        if style in ("box","italic"):
            flush()
            words = txt.split()
            size = 4 if style == "box" else 5
            for j in range(0, len(words), size):
                cards.append([(style, " ".join(words[j:j+size]))])
        else:
            buf.append((style, txt))
            end_punct = txt.endswith((".", ",", ":", "?"))
            if len(buf) >= 3 or (end_punct and len(buf) >= 2):
                flush()
    flush()
    return cards

out = []
for start, end, text in CHUNKS:
    cards = group(parse(text))
    weights = [sum(len(w) for _, w in c) + 3 for c in cards]
    total = sum(weights)
    span = end - start
    t = start
    for c, w in zip(cards, weights):
        d = span * w / total
        out.append({"t": round(t, 2), "d": round(d, 2),
                    "w": [{"s": s, "t": txt} for s, txt in c]})
        t += d
json.dump(out, open("captions.json", "w"), ensure_ascii=False, indent=0)
print(len(out), "altyazı kartı")
for c in out[:6]:
    print(f'{c["t"]:5.2f} +{c["d"]:.2f}  ' + " ".join(f'{w["t"]}({w["s"]})' for w in c["w"]))
