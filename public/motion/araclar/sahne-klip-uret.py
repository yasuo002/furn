# -*- coding: utf-8 -*-
"""Her sahneyi, hareketleri konuşulan kelimelere denk gelecek şekilde
yeniden zamanlar ve render için ayrı HTML sayfaları üretir."""
import re, json, pathlib, sys

SRC = pathlib.Path("public/motion/girisim-sahneler.html").read_text()
style_block = re.search(r"<style>(.*?)</style>", SRC, re.S).group(1)
sections = [re.sub(r'\s*<span class="tc">[^<]*</span>\n?', "", s)
            for s in re.findall(r"(<section class=\"scene s\d\">.*?</section>)", SRC, re.S)]

# --- sahne planı: mutlak saniyeler konuşmadan (words.json) alındı ---
SCENES = [
 dict(id="01_para-degil", i=0, start=7.70, end=13.60,
      not_="'sadece para değildir' derken üstü çizilir, 'sistemdir, ekiptir, network'tür' derken etiketler düşer",
      d={
        ".s1 .old div:nth-child(1)": "0.20s,2.16s", ".s1 .old div:nth-child(2)": "0.50s,2.36s",
        ".s1 .old div:nth-child(3)": "0.80s,2.56s",
        ".s1 .old div:nth-child(1) i": "2.11s", ".s1 .old div:nth-child(2) i": "2.31s",
        ".s1 .old div:nth-child(3) i": "2.51s",
        ".s1 .new b:nth-child(1)": "3.00s", ".s1 .new b:nth-child(2)": "3.51s",
        ".s1 .new b:nth-child(3)": "3.96s", ".s1 .foot": "4.40s"}),
 dict(id="02_yalniz", i=1, start=18.90, end=22.85,
      not_="'Sorun yetersiz çalışmak değilmiş' küçük satırda, 'Sorun yalnız çalışmak' vurgulu",
      d={".s2 .lone": "0.20s", ".s2 .ring": "0.45s", ".s2 .small": "0.23s",
         ".s2 .big em": "3.05s", ".s2 .big .w": "3.14s"},
      extra=".s2 .big{opacity:0;animation:fade .16s linear 2.21s both}"),
 dict(id="03_uc-kosul", i=2, start=22.90, end=31.60,
      not_="üç koşul, üç cümleyle birebir: sistem 23.2 · ekip 25.9 · çevre 28.2",
      d={".s3 .rows .row:nth-child(1)": "0.29s", ".s3 .rows .row:nth-child(2)": "2.70s",
         ".s3 .rows .row:nth-child(3)": "5.33s",
         ".s3 .row:nth-child(1) .res::before": "2.08s", ".s3 .row:nth-child(2) .res::before": "4.70s",
         ".s3 .row:nth-child(3) .res::before": "7.33s",
         ".s3 .link path:nth-of-type(1)": "1.20s", ".s3 .link path:nth-of-type(2)": "3.80s",
         ".s3 .caption .a": "7.90s", ".s3 .caption .b": "8.20s"}),
 dict(id="04_bensiz", i=3, start=33.80, end=39.60,
      not_="'bensiz' derken merkez düğüm kaybolur, hemen ardından ağ kendi kendine bağlanır",
      d={".s4 .net .me": "0.15s,2.90s", ".s4 .net .melabel": "0.50s,2.90s",
         ".s4 .net .spokes": "2.90s",
         ".s4 .net .mesh:nth-of-type(1)": "3.15s", ".s4 .net .mesh:nth-of-type(2)": "3.30s",
         ".s4 .net .mesh:nth-of-type(3)": "3.45s", ".s4 .net .mesh:nth-of-type(4)": "3.60s",
         ".s4 .ask .q": "2.11s", ".s4 .ask .s": "4.20s"}),
 dict(id="05_ag", i=4, start=49.40, end=56.00,
      not_="üç eksik üç 'yok' ile: çevresi 49.6 · insanı 50.8 · ağı 52.5; sonra ağ örülür",
      d={".s5 .lacks span:nth-child(1)": "0.22s,4.00s", ".s5 .lacks span:nth-child(2)": "1.40s,4.15s",
         ".s5 .lacks span:nth-child(3)": "3.12s,4.30s", ".s5 .brand": "5.40s"},
      web=dict(circles=[4.20,4.35,4.50,4.65,4.80,5.00],
               lines=[4.30,4.40,4.50,4.60,4.70,4.80,4.90,5.00,5.10,5.20])),
 dict(id="06_sermaye", i=5, start=57.30, end=59.85,
      not_="üç satır üç sözle: network 57.5 · sistem 58.5 · ekip 59.3; kendi kapanış kartınıza değmeden biter",
      d={".s6 .three span:nth-child(1)": "0.23s", ".s6 .three span:nth-child(2)": "1.16s",
         ".s6 .three span:nth-child(3)": "2.02s"},
      extra=".s6 .sum{display:none}"),
]


TEMA = """
/* ===== açık tema: krem zemin, kesikli ızgara, koyu metin ===== */
:root{
  --kagit:#F4F2EC; --kagit2:#EAE7DF; --murekkep:#16181C; --gri:#6E7178;
  --kehribar:#C8860D; --toprak:#B4552A; --cizgi:rgba(22,24,28,.10);
}
.scene{background:radial-gradient(120% 85% at 50% 32%,#FBFAF7 0%,var(--kagit) 52%,var(--kagit2) 100%) !important}
.scene::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:0;
  background-image:
    radial-gradient(72% 55% at 50% 45%,transparent 40%,rgba(120,110,95,.18) 100%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cg stroke='%2316181C' stroke-opacity='0.17' stroke-dasharray='9 11'%3E%3Cpath d='M0 .5H180'/%3E%3Cpath d='M.5 0V180'/%3E%3C/g%3E%3C/svg%3E")}
.ember{background:radial-gradient(50% 60% at 50% 100%,rgba(200,134,13,.16),transparent 70%) !important}
.grain{background-image:radial-gradient(#16181C 1px,transparent 1px) !important;opacity:.045 !important}
.vig{display:none}

/* 01 */
.s1 .old div{color:var(--murekkep)}
.s1 .old div span{color:var(--gri)}
.s1 .old i{background:var(--toprak)}
.s1 .new{top:47%}
.s1 .new b{background:var(--murekkep);color:#F7F5F0;font-size:1.48em;
  box-shadow:0 .5em 1.6em rgba(22,24,28,.22)}
.s1 .new b:nth-child(2){align-self:center}
.s1 .new b:nth-child(3){align-self:flex-end}
.s1 .foot{color:var(--murekkep)}
@keyframes dim{to{opacity:.32;color:#9A9CA1}}

/* 02 */
.s2 .lone svg circle,.s2 .lone svg path{fill:var(--kehribar)}
.s2 .ring{border:1px dashed rgba(22,24,28,.25)}
.s2 .small{color:var(--gri)}
.s2 .big{color:var(--murekkep)}
.s2 .big em{color:var(--kehribar)}

/* 03 */
.s3 .row .n{border-color:var(--murekkep);color:var(--murekkep);box-shadow:none}
.s3 .row .cond{color:var(--murekkep)}
.s3 .row .res{color:var(--toprak)}
.s3 .row .res::before{background:var(--toprak)}
.s3 .link path{stroke:rgba(22,24,28,.32)}
.s3 .caption .a{color:var(--murekkep)}
.s3 .caption .b{color:var(--gri)}

/* 04 */
.s4 .net .spoke{stroke:rgba(22,24,28,.45)}
.s4 .net .node{fill:var(--murekkep)}
.s4 .net .me{fill:var(--kehribar)}
.s4 .net .melabel{fill:#F7F5F0}
.s4 .net .mesh{stroke:var(--kehribar)}
.s4 .ask .q{color:var(--murekkep)}
.s4 .ask .q b{color:var(--kehribar)}
.s4 .ask .s{color:var(--gri)}

/* 05 */
.s5 .lacks span{color:#3C3F45;border-color:rgba(22,24,28,.38);background:rgba(255,255,255,.82);
  box-shadow:0 .3em 1em rgba(22,24,28,.08)}
.s5 .web{left:13%;right:13%;top:33%}
.s5 .brand{bottom:9%}
.s5 .web line{stroke:var(--kehribar)}
.s5 .web circle{fill:var(--kehribar)}
.s5 .brand{color:var(--murekkep)}
.s5 .brand small{color:var(--gri)}

/* 06 */
.s6 .beam{display:none}
.s6 .horizon{background:radial-gradient(50% 60% at 50% 0%,rgba(200,134,13,.22),transparent 70%)}
.s6 .three span{color:var(--murekkep)}
.s6 .three span em{color:var(--kehribar)}
.s6 .sum{color:var(--murekkep)}
.s6 .sum u{color:var(--kehribar)}
.s6 .sum u::after{background:var(--kehribar)}
"""

FACE = """
@font-face{font-family:'Anton';src:url('FDIR/Anton-Regular.ttf')}
@font-face{font-family:'Bebas Neue';src:url('FDIR/BebasNeue-Regular.ttf')}
@font-face{font-family:'Archivo';src:url('FDIR/Archivo%5Bwdth,wght%5D.ttf');font-weight:100 900}
@font-face{font-family:'Playfair Display';src:url('FDIR/PlayfairDisplay-Italic%5Bwght%5D.ttf');font-weight:400 900;font-style:italic}
@font-face{font-family:'IBM Plex Mono';src:url('FDIR/IBMPlexMono-Regular.ttf');font-weight:400}
@font-face{font-family:'IBM Plex Mono';src:url('FDIR/IBMPlexMono-Medium.ttf');font-weight:500}
"""

def build(sc, fonts_dir, out_dir, alpha):
    css = [f"{sel}{{animation-delay:{d} !important}}" for sel, d in sc["d"].items()]
    if "web" in sc:
        for k, delays in (("circle", sc["web"]["circles"]), ("line", sc["web"]["lines"])):
            for n, t in enumerate(delays, 1):
                css.append(f".s5 .web {k}:nth-of-type({n}){{animation-delay:{t}s !important}}")
    css.append(sc.get("extra", ""))
    body = f"""<style>{FACE.replace('FDIR', 'file://' + fonts_dir.rstrip('/'))}</style>
<style>
{style_block}
body{{margin:0;background:transparent}}
.stage{{position:relative;width:1080px;height:1920px;overflow:hidden;border-radius:0;box-shadow:none;
  font-size:43.6px;aspect-ratio:auto;background:{'transparent' if alpha else 'var(--ink)'}}}
.scene{{opacity:1;transition:none;display:block}}
{TEMA}
{'.scene,.scene::before,.scene::after{background:none !important}.scene .grain{display:none}' if alpha else ''}
.s6 .card{{display:none}}
{chr(10).join(css)}
</style>
<div class="stage" id="stage">
{sections[sc['i']]}
</div>
<script>
window.__clip = {{
  time(sec){{
    document.querySelector(".scene").getAnimations({{subtree:true}}).forEach(a=>{{
      try{{ a.pause(); a.currentTime = sec*1000; }}catch(e){{}}
    }});
  }}
}};
window.__clip.time(0);
</script>
"""
    p = pathlib.Path(out_dir) / f"{sc['id']}{'_alfa' if alpha else '_tam'}.html"
    p.write_text(body)
    return p

if __name__ == "__main__":
    fonts_dir, out_dir = sys.argv[1], sys.argv[2]
    pathlib.Path(out_dir).mkdir(parents=True, exist_ok=True)
    manifest = []
    for sc in SCENES:
        for alpha in (True, False):
            build(sc, fonts_dir, out_dir, alpha)
        manifest.append(dict(id=sc["id"], start=sc["start"], end=sc["end"],
                             dur=round(sc["end"] - sc["start"], 2), note=sc["not_"]))
    (pathlib.Path(out_dir) / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    for m in manifest:
        print(f'{m["id"]:<16} {m["start"]:6.2f} → {m["end"]:6.2f}  ({m["dur"]:.2f} sn)  {m["note"][:58]}')
