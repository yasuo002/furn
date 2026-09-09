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
    (0.02, 'whoosh', 0.55, -0.25),
    (0.80, 'impact', 0.70,  0.00),
    (2.50, 'whoosh', 0.50,  0.30),
    (4.32, 'pop',    0.55, -0.20),
    (5.50, 'riser',  0.42,  0.00),   # "BMW!" oncesi yukselis
    (5.60, 'impact', 0.95,  0.00),
    (6.34, 'whoosh', 0.48,  0.35),
    (6.86, 'pop',    0.50,  0.40),
    (8.02, 'whoosh', 0.44, -0.35),
    (8.48, 'pop',    0.50, -0.40),
    (9.82, 'whoosh', 0.46,  0.20),
    (11.76,'pop',    0.55,  0.00),
    (12.92,'riser',  0.40,  0.00),   # blurlu liste anina yukselis
    (15.05,'impact', 0.85,  0.00),
    (15.80,'whoosh', 0.55, -0.20),
    (16.28,'impact', 0.70,  0.00),
    (16.95,'ding',   0.45,  0.15),
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
                           'riser': riser, 'ding': ding}[kind]()
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
