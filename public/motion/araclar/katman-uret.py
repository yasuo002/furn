# -*- coding: utf-8 -*-
"""Sahneleri katmanlara böler: her yazı/grafik öğesi kendi saydam klibi olur,
animasyonu klibin 0. karesinde başlar. Premiere'de öğeler bağımsız kaydırılır."""
import re, json, pathlib, sys, importlib.util

spec = importlib.util.spec_from_file_location("sk", "public/motion/araclar/sahne-klip-uret.py")
sk = importlib.util.module_from_spec(spec); spec.loader.exec_module(sk)

SRC = pathlib.Path("public/motion/girisim-sahneler.html").read_text()
style_block = re.search(r"<style>(.*?)</style>", SRC, re.S).group(1)
sections = [re.sub(r'\s*<span class="tc">[^<]*</span>\n?', "", s)
            for s in re.findall(r"(<section class=\"scene s\d\">.*?</section>)", SRC, re.S)]

# katman = (sahne, dosya adı, görünecek seçiciler, kaydırma sn, süre sn)
KATMAN = [
 (0,"01a_liste",        [".s1 .old"],                              0.20, 5.0),
 (0,"01b_etiket-sistem",[".s1 .new b:nth-child(1)"],               3.00, 2.6),
 (0,"01c_etiket-ekip",  [".s1 .new b:nth-child(2)"],               3.51, 2.3),
 (0,"01d_etiket-network",[".s1 .new b:nth-child(3)"],              3.96, 2.0),
 (0,"01e_alt-satir",    [".s1 .foot"],                             4.40, 2.0),
 (1,"02a_figur",        [".s2 .lone",".s2 .ring"],                 0.20, 4.5),
 (1,"02b_kucuk-satir",  [".s2 .small"],                            0.23, 4.4),
 (1,"02c_buyuk-satir",  [".s2 .big"],                              2.21, 2.5),
 (2,"03a_satir-1",      [".s3 .rows .row:nth-child(1)"],           0.29, 8.0),
 (2,"03b_satir-2",      [".s3 .rows .row:nth-child(2)"],           2.70, 5.6),
 (2,"03c_satir-3",      [".s3 .rows .row:nth-child(3)"],           5.33, 3.0),
 (2,"03d_baglanti",     [".s3 .link"],                             1.20, 6.5),
 (2,"03e_alt-yazi",     [".s3 .caption"],                          7.90, 2.0),
 (3,"04a_dugumler",     [".s4 .net .node"],                        0.25, 5.5),
 (3,"04b_merkez",       [".s4 .net .me",".s4 .net .melabel",".s4 .net .spokes"], 0.15, 3.0),
 (3,"04c_bag",          [".s4 .net .mesh"],                        3.15, 3.0),
 (3,"04d_soru",         [".s4 .ask .q"],                           2.11, 4.0),
 (3,"04e_alt-satir",    [".s4 .ask .s"],                           4.20, 2.0),
 (4,"05a_etiket-1",     [".s5 .lacks span:nth-child(1)"],          0.22, 6.0),
 (4,"05b_etiket-2",     [".s5 .lacks span:nth-child(2)"],          1.40, 5.0),
 (4,"05c_etiket-3",     [".s5 .lacks span:nth-child(3)"],          3.12, 3.5),
 (4,"05d_ag",           [".s5 .web"],                              4.20, 3.5),
 (4,"05e_marka",        [".s5 .brand"],                            5.40, 2.5),
 (5,"06a_satir-1",      [".s6 .three span:nth-child(1)"],          0.23, 3.0),
 (5,"06b_satir-2",      [".s6 .three span:nth-child(2)"],          1.16, 2.5),
 (5,"06c_satir-3",      [".s6 .three span:nth-child(3)"],          2.02, 2.0),
]
# hareketsiz katmanlar (tek kare PNG): zemin ve 6. sahnenin ışığı
DURAGAN = [(0,"00_zemin", []), (5,"06d_isik", [".s6 .horizon"])]

def gecikme_kaydir(sahne_delays, offset):
    """sahnenin gecikmelerini katmanın başlangıcına göre sıfırla"""
    out = {}
    for sel, d in sahne_delays.items():
        yeni = []
        for part in d.split(","):
            v = float(part.strip().rstrip("s")) - offset
            yeni.append(f"{max(0.0, v):.2f}s")
        out[sel] = ",".join(yeni)
    return out

def sayfa(sahne_i, shows, delays, fonts, saydam, web=None):
    css = [f"{sel}{{animation-delay:{d} !important}}" for sel, d in delays.items()]
    if web:
        for k, dl in (("circle", web["circles"]), ("line", web["lines"])):
            for n, t in enumerate(dl, 1):
                css.append(f".s5 .web {k}:nth-of-type({n}){{animation-delay:{t}s !important}}")
    gorunur = ""
    if shows is not None:
        if shows:
            # kapsayıcı seçiciler (başka bir seçicinin atası olanlar) alt ağacı açmaz
            yaprak = [x for x in shows if not any(y != x and y.startswith(x + " ") for y in shows)]
            sel = ", ".join(shows + [x + " *" for x in yaprak])
            gorunur = f".scene *{{visibility:hidden}}\n{sel}{{visibility:visible}}"
        else:
            gorunur = ".scene *{visibility:hidden}"
    return f"""<style>{sk.FACE.replace('FDIR','file://'+fonts.rstrip('/'))}</style>
<style>
{style_block}
body{{margin:0;background:transparent}}
.stage{{position:relative;width:1080px;height:1920px;overflow:hidden;border-radius:0;box-shadow:none;
  font-size:43.6px;aspect-ratio:auto;background:{'transparent' if saydam else 'var(--kagit)'}}}
.scene{{opacity:1;transition:none;display:block}}
{sk.TEMA}
{'.scene,.scene::before,.scene::after{background:none !important}' if saydam else ''}
.scene .grain{{display:none}}
.s6 .card{{display:none}}
{gorunur}
{chr(10).join(css)}
</style>
<div class="stage" id="stage">
{sections[sahne_i]}
</div>
<script>
window.__clip={{time(s){{document.querySelector(".scene").getAnimations({{subtree:true}})
  .forEach(a=>{{try{{a.pause();a.currentTime=s*1000;}}catch(e){{}}}});}}}};
window.__clip.time(0);
</script>
"""

if __name__ == "__main__":
    fonts, out = sys.argv[1], pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
    sahneler = {s["i"]: s for s in sk.SCENES}
    man = []
    for i, ad, shows, offset, dur in KATMAN:
        sc = sahneler[i]
        d = gecikme_kaydir(sc["d"], offset)
        web = None
        if "web" in sc:
            web = dict(circles=[max(0, x-offset) for x in sc["web"]["circles"]],
                       lines=[max(0, x-offset) for x in sc["web"]["lines"]])
        (out / f"{ad}.html").write_text(sayfa(i, shows, d, fonts, True, web))
        man.append(dict(id=ad, sahne=sc["id"], mutlak=round(sc["start"]+offset, 2), dur=dur, tip="klip"))
    for i, ad, shows in DURAGAN:
        sc = sahneler[i]
        (out / f"{ad}.html").write_text(sayfa(i, shows, gecikme_kaydir(sc["d"], 0), fonts, ad == "00_zemin"))
        man.append(dict(id=ad, sahne=sc["id"], mutlak=sc["start"], dur=0, tip="png"))
    (out / "manifest.json").write_text(json.dumps(man, ensure_ascii=False, indent=1))
    print(f"{len(KATMAN)} hareketli katman + {len(DURAGAN)} duragan")
    for m in man[:6]:
        print(f'  {m["id"]:<20} {m["mutlak"]:6.2f} sn  {m["dur"]:.1f} sn')
