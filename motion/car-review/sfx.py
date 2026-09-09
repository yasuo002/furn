#!/usr/bin/env python3
"""Kurgu SFX'lerini sentezler ve hepsini tek bir stereo WAV parcasina yerlestirir.

Hazir ses kutuphanesi yok; whoosh / impact / pop / riser / ding sesleri
gurultu + sinus osilatorlerinden ve bir state-variable bant filtresinden uretilir.

  python3 sfx.py <cikis.wav> <sure_sn>
"""
import math, random, struct, sys, wave

FS = 48000
random.seed(7)

def svf_band(x, fc_of_t, q=1.1):
    """Chamberlin state-variable filtresi; bant cikisi. fc_of_t(i) -> Hz."""
    low = band = 0.0
    out = []
    for i, s in enumerate(x):
        f = 2.0 * math.sin(math.pi * min(fc_of_t(i), FS * 0.45) / FS)
        high = s - low - q * band
        band += f * high
        low += f * band
        out.append(band)
    return out

def noise(n):
    return [random.uniform(-1, 1) for _ in range(n)]

def whoosh(dur=0.50, f0=320.0, f1=5200.0):
    n = int(dur * FS)
    fc = lambda i: f0 * (f1 / f0) ** (i / n)
    b = svf_band(noise(n), fc, q=0.85)
    return [b[i] * math.sin(math.pi * i / n) ** 1.4 * 1.7 for i in range(n)]

def impact(dur=0.75):
    n = int(dur * FS)
    out = []
    ph = 0.0
    nz = svf_band(noise(n), lambda i: 1400.0 * math.exp(-9.0 * i / FS), q=1.4)
    for i in range(n):
        t = i / FS
        f = 105.0 * math.exp(-3.4 * t) + 34.0
        ph += 2 * math.pi * f / FS
        body = math.sin(ph) * math.exp(-4.6 * t)
        click = nz[i] * math.exp(-30.0 * t) * 0.55
        out.append(body * 1.05 + click)
    return out

def pop(dur=0.16):
    n = int(dur * FS)
    out, ph = [], 0.0
    for i in range(n):
        t = i / FS
        ph += 2 * math.pi * (1500.0 * math.exp(-16.0 * t) + 260.0) / FS
        out.append(math.sin(ph) * math.exp(-26.0 * t) * 0.9)
    return out

def riser(dur=1.30):
    n = int(dur * FS)
    fc = lambda i: 480.0 * (7600.0 / 480.0) ** (i / n)
    b = svf_band(noise(n), fc, q=0.7)
    out, ph = [], 0.0
    for i in range(n):
        t, p = i / FS, i / n
        ph += 2 * math.pi * (190.0 * (5.2 ** p)) / FS
        out.append((b[i] * 1.5 + math.sin(ph) * 0.30) * (p ** 2.1))
    return out

def tick(dur=0.055):
    """Altyazi obegi degisiminde calan kisa tiz tik — dokusal, vurucu degil."""
    n = int(dur * FS)
    b = svf_band(noise(n), lambda i: 4200.0, q=1.6)
    out, ph = [], 0.0
    for i in range(n):
        t = i / FS
        ph += 2 * math.pi * 2600.0 / FS
        out.append((b[i] * 1.6 + math.sin(ph) * 0.35) * math.exp(-95.0 * t))
    return out

def ding(dur=0.80):
    n = int(dur * FS)
    out = []
    parts = [(1760.0, 4.2, 1.0), (2640.0, 6.5, 0.5), (3520.0, 9.0, 0.28)]
    for i in range(n):
        t = i / FS
        out.append(sum(math.sin(2 * math.pi * f * t) * math.exp(-d * t) * a
                       for f, d, a in parts) * 0.55)
    return out

# --- olay listesi: (saniye, ses, kazanc, stereo_pan[-1..1]) ---
EVENTS = [
    # Az ve yerinde: her ses bir grafik ya da kesimle eslesir, dolgu yok.
    (0.02,  'whoosh', 0.36, -0.20),   # acilis
    (0.90,  'pop',    0.32,  0.00),   # denklem grafigi
    (5.44,  'riser',  0.30,  0.00),   # "BMW!" oncesi (sonu 5.57'ye varir)
    (5.60,  'impact', 0.72,  0.00),   # "BMW!" vurusu
    (6.46,  'whoosh', 0.30,  0.30),   # sorulmayanlar paneli
    (9.81,  'whoosh', 0.32, -0.20),   # kaynak kamera kesimi
    (15.06, 'impact', 0.55,  0.00),   # "Golf alirsin"
    (16.28, 'impact', 0.48,  0.00),   # ozet karti
]

def main():
    out_path = sys.argv[1]
    total = int(float(sys.argv[2]) * FS) + FS // 2
    L = [0.0] * total
    R = [0.0] * total
    cache = {}
    for at, kind, gain, pan in EVENTS:
        if kind not in cache:
            cache[kind] = {'whoosh': whoosh, 'impact': impact, 'pop': pop,
                           'riser': riser, 'ding': ding, 'tick': tick}[kind]()
        buf = cache[kind]
        # riser hedefe VARMALI, o yuzden basi degil sonu hizalanir
        start = int((at - len(buf) / FS) * FS) if kind == 'riser' else int(at * FS)
        gl = gain * min(1.0, 1.0 - pan) ** 0.5
        gr = gain * min(1.0, 1.0 + pan) ** 0.5
        for i, s in enumerate(buf):
            j = start + i
            if 0 <= j < total:
                L[j] += s * gl
                R[j] += s * gr

    peak = max(1e-9, max(max(map(abs, L)), max(map(abs, R))))
    norm = min(1.0, 0.89 / peak)
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(FS)
        w.writeframes(b''.join(
            struct.pack('<hh',
                        max(-32767, min(32767, int(L[i] * norm * 32767))),
                        max(-32767, min(32767, int(R[i] * norm * 32767))))
            for i in range(total)))
    print(f'{out_path}: {total/FS:.2f}s, {len(EVENTS)} olay, tepe x{norm:.2f}')

main()
