#!/usr/bin/env python3
"""Kurgu sesleri — hepsi sentez. Yogunluk 70 sn'de 16 olay (~4.4 sn'de bir):
duyulur ama konusmanin onune gecmez."""
import math, random, struct, sys, wave
FS = 48000; random.seed(11)

def svf(x, fc, q=1.0):
    low = band = 0.0; out = []
    for i, s in enumerate(x):
        f = 2.0 * math.sin(math.pi * min(fc(i), FS * 0.45) / FS)
        high = s - low - q * band
        band += f * high; low += f * band
        out.append(band)
    return out
def noise(n): return [random.uniform(-1, 1) for _ in range(n)]

def swell(dur=0.85, f0=260.0, f1=2400.0):
    """Kadraj degisimlerinde: tepe noktasi olmayan yumusak hava akimi."""
    n = int(dur * FS)
    b = svf(noise(n), lambda i: f0 * (f1 / f0) ** (i / n), q=0.6)
    return [b[i] * math.sin(math.pi * i / n) ** 2.0 * 1.4 for i in range(n)]

def thud(dur=0.70):
    """Kinetik kartlarda: derin, tok, tiz bileseni az — sert degil."""
    n = int(dur * FS); out = []; ph = 0.0
    for i in range(n):
        t = i / FS
        ph += 2 * math.pi * (78.0 * math.exp(-3.0 * t) + 40.0) / FS
        out.append(math.sin(ph) * math.exp(-4.0 * t) * 1.1)
    return out

def riser(dur=1.10):
    n = int(dur * FS)
    b = svf(noise(n), lambda i: 400.0 * (5200.0 / 400.0) ** (i / n), q=0.65)
    return [b[i] * (i / n) ** 2.4 * 1.3 for i in range(n)]

def tick(dur=0.05):
    n = int(dur * FS)
    b = svf(noise(n), lambda i: 3600.0, q=1.5)
    return [b[i] * math.exp(-95.0 * (i / FS)) * 1.4 for i in range(n)]

# (saniye, ses, kazanc, pan)  — riser'lar sonu hedefe gelecek sekilde hizalanir
EVENTS = [
    ( 2.34,'swell',0.20,-0.20), ( 7.72,'swell',0.24, 0.20),
    ( 9.44,'swell',0.22,-0.15), (13.14,'swell',0.20, 0.25),
    (17.88,'swell',0.20,-0.25),
    (21.44,'riser',0.26, 0.00), (21.46,'thud',0.42, 0.00),   # "SORUN YALNIZ ÇALIŞMAK"
    (23.00,'swell',0.22, 0.20),
    (29.02,'swell',0.20,-0.20), (35.86,'swell',0.26, 0.00),
    (38.66,'swell',0.20, 0.15), (43.06,'swell',0.22,-0.15),
    (47.44,'swell',0.20, 0.20),
    (54.82,'riser',0.24, 0.00), (54.84,'thud',0.40, 0.00),   # "YALNIZLIKTAN KAYBEDİYOR"
    (57.32,'swell',0.24,-0.15),
]

def main():
    out_path, total = sys.argv[1], int(float(sys.argv[2]) * FS) + FS
    L = [0.0] * total; R = [0.0] * total; cache = {}
    for at, kind, gain, pan in EVENTS:
        if kind not in cache:
            cache[kind] = {'swell': swell, 'thud': thud, 'riser': riser, 'tick': tick}[kind]()
        buf = cache[kind]
        start = int((at - len(buf) / FS) * FS) if kind == 'riser' else int(at * FS)
        gl = gain * (1 - pan) ** .5; gr = gain * (1 + pan) ** .5
        for i, s in enumerate(buf):
            j = start + i
            if 0 <= j < total: L[j] += s * gl; R[j] += s * gr
    pk = max(1e-9, max(max(map(abs, L)), max(map(abs, R))))
    nm = min(1.0, 0.80 / pk)
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(FS)
        w.writeframes(b''.join(struct.pack('<hh',
            max(-32767, min(32767, int(L[i] * nm * 32767))),
            max(-32767, min(32767, int(R[i] * nm * 32767)))) for i in range(total)))
    print(f'{out_path}: {len(EVENTS)} olay')
main()
