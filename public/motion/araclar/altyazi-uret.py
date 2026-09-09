# -*- coding: utf-8 -*-
"""Hizalanmış kelimelerden, görüntünün üstüne binen tipografik altyazı katmanı üretir.
Grafik sahnelerin açık olduğu aralıklarda altyazı gizlenir."""
import json, pathlib, sys

WORDS = json.loads(pathlib.Path(sys.argv[1]).read_text())
FONTS = sys.argv[2]
OUT   = pathlib.Path(sys.argv[3])

# sahne pencereleri (altyazı bu aralıklarda susar) ve kendi kapanış kartı
SAHNE = [(7.70,13.60),(18.90,22.85),(22.90,31.60),(33.80,39.60),(49.40,56.00),(57.30,59.85)]
OUTRO = 59.90

MARK  = {"*":"gold", "!":"neg", "_":"italic", "#":"box", "^":"punch"}
LIMIT = {"box":4, "italic":5, "punch":3, "gold":3, "neg":3, "plain":3}

def bicim(w):
    for ch, st in MARK.items():
        if w.startswith(ch) and ch in w[1:]:
            return st, w.replace(ch, "")
    return "plain", w

kartlar, buf, onceki = [], [], None
def bosalt():
    if buf:
        kartlar.append({"t": round(buf[0][2]-0.05, 2), "w": [{"s":s,"t":t} for s,t,_ in buf]})
        buf.clear()
for it in WORDS:
    st, tx = bicim(it["w"])
    if onceki is not None and st != onceki: bosalt()
    buf.append((st, tx, it["t"])); onceki = st
    if len(buf) >= LIMIT[st]: bosalt(); onceki = None
    elif st in ("plain","gold","neg") and tx.endswith((".",",",":","?")) and len(buf) >= 2:
        bosalt(); onceki = None
bosalt()
for i, c in enumerate(kartlar):
    c["e"] = round(kartlar[i+1]["t"] if i+1 < len(kartlar) else c["t"]+1.3, 2)
kartlar = [c for c in kartlar if c["e"]-c["t"] >= 0.22]

FACE = """
@font-face{font-family:'Anton';src:url('FDIR/Anton-Regular.ttf')}
@font-face{font-family:'Bebas Neue';src:url('FDIR/BebasNeue-Regular.ttf')}
@font-face{font-family:'Archivo';src:url('FDIR/Archivo%5Bwdth,wght%5D.ttf');font-weight:100 900}
@font-face{font-family:'Playfair Display';src:url('FDIR/PlayfairDisplay-Italic%5Bwght%5D.ttf');font-weight:400 900;font-style:italic}
""".replace("FDIR", "file://" + FONTS.rstrip("/"))

CSS = """
*{box-sizing:border-box}
body{margin:0;background:transparent}
.stage{position:relative;width:1080px;height:1920px;overflow:hidden;background:transparent}
.cap{position:absolute;left:6%;right:6%;top:67%;display:flex;flex-wrap:wrap;
  justify-content:center;align-items:baseline;gap:.08em .24em}
.cap .k{display:inline-block;white-space:pre;font-family:'Archivo',sans-serif;font-weight:800;
  font-size:78px;letter-spacing:-.025em;color:#fff;line-height:1.14;
  text-shadow:0 6px 26px rgba(0,0,0,.85),0 2px 7px rgba(0,0,0,.7)}
.cap .ch{display:inline-block;will-change:transform}
/* vurgular: her biri ayrı yazı tipi ve renk */
.cap .k.gold{font-weight:900;font-size:92px;color:#F5C24B;
  text-shadow:0 6px 28px rgba(0,0,0,.9),0 0 34px rgba(245,194,75,.45)}
.cap .k.neg{font-family:'Bebas Neue',Impact,sans-serif;font-weight:400;font-size:106px;
  letter-spacing:.02em;line-height:1;color:#FF8A3D}
.cap .k.italic{font-family:'Playfair Display',Georgia,serif;font-style:italic;font-weight:700;
  font-size:74px;letter-spacing:0;color:#F6F3EC}
.cap .k.box{font-family:'Archivo',sans-serif;font-weight:800;font-size:74px;color:#16181C;
  background:#F4F2EC;padding:.1em .28em;border-radius:12px;text-shadow:none;
  box-shadow:0 14px 38px rgba(0,0,0,.55)}
.cap .k.punch{font-family:'Anton',Impact,sans-serif;font-weight:400;font-size:134px;
  letter-spacing:-.01em;line-height:.94;color:#fff;
  text-shadow:0 10px 44px rgba(0,0,0,.92),0 0 44px rgba(245,194,75,.4)}
"""

JS = """
const CAPS=__CAPS__, SAHNE=__SAHNE__, OUTRO=__OUTRO__;
const HARF={punch:0.030, gold:0.024, box:0.018, neg:0.026};
const capEl=document.getElementById("cap");
let idx=-1, harfler=[];
const sahnede=t=>SAHNE.some(([a,b])=>t>=a&&t<b);
const kartAt=t=>{for(let i=0;i<CAPS.length;i++) if(t>=CAPS[i].t&&t<CAPS[i].e) return i; return -1;};
function kur(i){
  capEl.textContent=""; harfler=[];
  if(i<0) return;
  const ws=CAPS[i].w;
  const ekle=(el,txt,step,off)=>{
    if(step){ [...txt].forEach((ch,ci)=>{ const c=document.createElement("span");
      c.className="ch"; c.textContent=ch; c.dataset.d=(off+ci*step).toFixed(3);
      el.appendChild(c); harfler.push(c); }); }
    else { el.textContent=txt; el.dataset.d=off.toFixed(3); harfler.push(el); }
  };
  if(ws.length && ws.every(w=>w.s==="box")){                 // kutu grubu tek plaka
    const s=document.createElement("span"); s.className="k box";
    ekle(s, ws.map(w=>w.t).join(" "), HARF.box, 0); capEl.appendChild(s); return;
  }
  ws.forEach((w,wi)=>{ const s=document.createElement("span");
    s.className="k"+(w.s==="plain"?"":" "+w.s);
    ekle(s, w.t, HARF[w.s], wi*0.06); capEl.appendChild(s); });
}
const ease=p=>1-Math.pow(1-p,3);
window.__cap={ time(sec){
  const i=(sahnede(sec)||sec>=OUTRO)?-1:kartAt(sec);
  if(i!==idx){ kur(i); idx=i; }
  if(i<0){ capEl.style.opacity="0"; return; }
  const c=CAPS[i], yerel=sec-c.t;
  capEl.style.opacity=String(Math.max(0,Math.min(1,(c.e-sec)/0.12)));
  harfler.forEach(el=>{
    const p=Math.max(0,Math.min(1,(yerel-(+el.dataset.d))/0.20)), e=ease(p);
    el.style.opacity=String(e);
    el.style.transform=`translateY(${(1-e)*34}px) scale(${0.86+e*0.14})`;
  });
}};
window.__cap.time(0);
""".replace("__CAPS__", json.dumps(kartlar, ensure_ascii=False)) \
   .replace("__SAHNE__", json.dumps(SAHNE)).replace("__OUTRO__", str(OUTRO))

OUT.write_text(f"<title>Altyazı katmanı</title>\n<style>{FACE}{CSS}</style>\n"
               f'<div class="stage" id="stage"><div class="cap" id="cap"></div></div>\n'
               f"<script>{JS}</script>\n")
gorunen = [c for c in kartlar if not any(a <= c["t"] < b for a, b in SAHNE) and c["t"] < OUTRO]
print(f"{len(kartlar)} kart üretildi, {len(gorunen)} tanesi ekranda görünüyor")
for c in gorunen[:6]:
    print(f'  {c["t"]:6.2f}  ' + " ".join(f'{w["t"]}[{w["s"]}]' for w in c["w"]))
