# -*- coding: utf-8 -*-
"""words.json (hizalanmış kelimeler) + sahneler → girisim-edit.html"""
import re, json, pathlib, sys

WORDS = json.loads(pathlib.Path(sys.argv[1]).read_text())
SRC   = pathlib.Path("public/motion/girisim-sahneler.html").read_text()
OUT   = pathlib.Path("public/motion/girisim-edit.html")

MARK = {"*": "gold", "!": "neg", "_": "italic", "#": "box", "^": "punch"}
LIMIT = {"box": 4, "italic": 5, "punch": 3, "gold": 3, "neg": 3, "plain": 3}

def split_word(w):
    for ch, style in MARK.items():
        if w.startswith(ch) and ch in w[1:]:
            return style, w.replace(ch, "")
    return "plain", w

# --- kartlara böl ---
cards, buf = [], []
def flush():
    if buf:
        cards.append({"t": round(buf[0][2] - 0.05, 2),
                      "w": [{"s": s, "t": t} for s, t, _ in buf]})
        buf.clear()

prev_style = None
for item in WORDS:
    style, text = split_word(item["w"])
    if prev_style is not None and style != prev_style:
        flush()
    buf.append((style, text, item["t"]))
    prev_style = style
    if len(buf) >= LIMIT[style]:
        flush(); prev_style = None
    elif style in ("plain", "gold", "neg") and text.endswith((".", ",", ":", "?")) and len(buf) >= 2:
        flush(); prev_style = None
flush()

for i, c in enumerate(cards):                       # kart bitişleri
    c["e"] = round(cards[i+1]["t"] if i+1 < len(cards) else c["t"] + 1.3, 2)
cards = [c for c in cards if c["e"] - c["t"] >= 0.22]

# --- grafik yerleşimi: [sahne, başlangıç sn, hız, sahne süresi ms] ---
PLACE = [
  [0,  9.60, 1.09, 5000],
  [2, 24.60, 0.75, 5200],
  [3, 33.80, 1.00, 5600],
  [4, 50.00, 1.11, 6000],
  [5, 57.20, 1.55, 5400],
]
OUTRO = 59.9

style_block = re.search(r"<style>(.*?)</style>", SRC, re.S).group(1)
sections = [re.sub(r'\s*<span class="tc">[^<]*</span>\n?', "", s)
            for s in re.findall(r"(<section class=\"scene s\d\">.*?</section>)", SRC, re.S)]

CSS = """
/* ===== kurgu katmanı ===== */
body{margin:0;background:transparent}
.stage{position:relative;width:1080px;height:1920px;overflow:hidden;background:transparent;
  border-radius:0;box-shadow:none;font-size:43.6px;aspect-ratio:auto}
.scene{transition:none}
.scene .grain{display:none}
.s6 .card{display:none}

.cap{position:absolute;left:6%;right:6%;top:66%;z-index:20;
  display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline;gap:.06em .24em}
.cap .k{display:inline-block;white-space:pre;font-family:"Archivo",sans-serif;font-weight:800;
  font-size:78px;letter-spacing:-.025em;color:#fff;line-height:1.14;
  text-shadow:0 6px 24px rgba(0,0,0,.8),0 2px 6px rgba(0,0,0,.65)}
.cap .ch{display:inline-block;will-change:transform}
.cap .k.gold{font-family:"Archivo",sans-serif;font-weight:900;font-size:92px;color:#F2B44B;
  text-shadow:0 6px 26px rgba(0,0,0,.85),0 0 30px rgba(242,180,75,.4)}
.cap .k.neg{font-family:"Bebas Neue",Impact,sans-serif;font-weight:400;font-size:104px;
  letter-spacing:.02em;color:#FF8A3D;line-height:1}
.cap .k.italic{font-family:"Playfair Display",Georgia,serif;font-style:italic;font-weight:700;
  font-size:74px;letter-spacing:0;color:#F4F2ED}
.cap .k.box{font-family:"Archivo",sans-serif;font-weight:800;font-size:74px;color:#0A0C10;
  background:#F2B44B;padding:.1em .26em;border-radius:12px;text-shadow:none;
  box-shadow:0 12px 34px rgba(0,0,0,.6)}
.cap .k.punch{font-family:"Anton",Impact,sans-serif;font-weight:400;font-size:132px;
  letter-spacing:-.01em;line-height:.94;color:#fff;
  text-shadow:0 10px 40px rgba(0,0,0,.9),0 0 40px rgba(242,180,75,.35)}
"""

JS = """
const CAPS  = __CAPS__;
const PLACE = __PLACE__;
const OUTRO = __OUTRO__;
const LETTER = {punch:0.030, gold:0.024, box:0.020, neg:0.026};   // harf gecikmeleri

const stage = document.getElementById("stage");
const scenes = [...stage.querySelectorAll(".scene")];
const capEl = document.getElementById("cap");
let capIndex = -1, letters = [];

function sceneAt(t){
  for(let i = 0; i < PLACE.length; i++){
    const [idx, start, speed, dur] = PLACE[i];
    if(t >= start && t < Math.min(start + dur/1000/speed, OUTRO)) return i;
  }
  return -1;
}
function capAt(t){
  for(let i = 0; i < CAPS.length; i++) if(t >= CAPS[i].t && t < CAPS[i].e) return i;
  return -1;
}
function build(i){
  capEl.textContent = ""; letters = [];
  if(i < 0) return;
  CAPS[i].w.forEach((w, wi)=>{
    const span = document.createElement("span");
    span.className = "k" + (w.s === "plain" ? "" : " " + w.s);
    const step = LETTER[w.s];
    if(step){                                   // harf harf gelen biçimler
      [...w.t].forEach((ch, ci)=>{
        const c = document.createElement("span");
        c.className = "ch"; c.textContent = ch;
        c.dataset.d = (wi * 0.06 + ci * step).toFixed(3);
        span.appendChild(c); letters.push(c);
      });
    } else {
      span.textContent = w.t;
      span.dataset.d = (wi * 0.05).toFixed(3);
      letters.push(span);
    }
    capEl.appendChild(span);
  });
}
const ease = p => 1 - Math.pow(1 - p, 3);

window.__edit = {
  time(sec){
    const si = sceneAt(sec);
    scenes.forEach(s=>{ s.style.display = "none"; s.style.opacity = "0"; });
    if(si >= 0){
      const [idx, start, speed, dur] = PLACE[si];
      const sc = scenes[idx];
      sc.style.display = "block";
      const endAt = Math.min(start + dur/1000/speed, OUTRO);
      sc.style.opacity = String(Math.max(0, Math.min(1, (sec-start)/0.3, (endAt-sec)/0.32)));
      sc.getAnimations({subtree:true}).forEach(a=>{
        try{ a.pause(); a.currentTime = (sec - start) * speed * 1000; }catch(e){}
      });
    }
    const ci = (si >= 0 || sec >= OUTRO) ? -1 : capAt(sec);
    if(ci !== capIndex){ build(ci); capIndex = ci; }
    if(ci < 0){ capEl.style.opacity = "0"; return; }
    const c = CAPS[ci], local = sec - c.t, out = Math.min(1, (c.e - sec)/0.12);
    capEl.style.opacity = String(Math.max(0, out));
    letters.forEach(el=>{
      const p = Math.max(0, Math.min(1, (local - (+el.dataset.d)) / 0.20));
      const e = ease(p);
      el.style.opacity = String(e);
      el.style.transform = `translateY(${(1-e)*34}px) scale(${0.86 + e*0.14})`;
    });
  }
};
window.__edit.time(0);
"""
JS = (JS.replace("__CAPS__", json.dumps(cards, ensure_ascii=False))
        .replace("__PLACE__", json.dumps(PLACE))
        .replace("__OUTRO__", str(OUTRO)))

FACE = """
@font-face{font-family:'Anton';src:url('FDIR/Anton-Regular.ttf');font-weight:400;font-style:normal}
@font-face{font-family:'Bebas Neue';src:url('FDIR/BebasNeue-Regular.ttf');font-weight:400;font-style:normal}
@font-face{font-family:'Archivo';src:url('FDIR/Archivo%5Bwdth,wght%5D.ttf');font-weight:100 900;font-style:normal}
@font-face{font-family:'Playfair Display';src:url('FDIR/PlayfairDisplay-Italic%5Bwght%5D.ttf');font-weight:400 900;font-style:italic}
@font-face{font-family:'IBM Plex Mono';src:url('FDIR/IBMPlexMono-Regular.ttf');font-weight:400}
@font-face{font-family:'IBM Plex Mono';src:url('FDIR/IBMPlexMono-Medium.ttf');font-weight:500}
"""

def page(head):
    return f"""<title>Girişim Senaryosu — Kurgu Katmanı</title>
{head}
<style>
{style_block}
{CSS}
</style>

<div class="stage" id="stage">
{chr(10).join(sections)}
  <div class="cap" id="cap"></div>
</div>

<script>
{JS}
</script>
"""

LINK = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton'
        '&family=Archivo:ital,wght@0,400;0,600;0,700;0,800;0,900;1,800;1,900'
        '&family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500'
        '&family=Playfair+Display:ital,wght@1,700&display=swap">')

OUT.write_text(page(LINK))

# render kopyası: yazı tipleri dosyadan gömülür (tarayıcı Google Fonts'a erişemiyor)
if len(sys.argv) > 3:
    fonts_dir, render_out = sys.argv[2], sys.argv[3]
    faces = "<style>" + FACE.replace("FDIR", "file://" + fonts_dir.rstrip("/")) + "</style>"
    pathlib.Path(render_out).write_text(page(faces))
    print("render kopyası:", render_out)


print(f"{len(cards)} altyazı kartı, {len(PLACE)} grafik")
for c in cards[:8]:
    print(f'  {c["t"]:6.2f}-{c["e"]:6.2f}  ' + " ".join(f'{w["t"]}[{w["s"]}]' for w in c["w"]))
