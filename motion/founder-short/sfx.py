#!/usr/bin/env python3
"""Bu kurgu icin sadece 3 yumusak gecis sesi — kaynakta zaten muzik var,
uzerine dolgu efekt binmemeli."""
import math, random, struct, sys, wave
FS = 48000; random.seed(11)

def svf_band(x, fc_of_t, q=1.0):
    low = band = 0.0; out = []
    for i, s in enumerate(x):
        f = 2.0 * math.sin(math.pi * min(fc_of_t(i), FS * 0.45) / FS)
        high = s - low - q * band
        band += f * high; low += f * band
        out.append(band)
    return out

def swell(dur=0.9, f0=260.0, f1=2600.0):
    """Yumusak, tepe noktasi olmayan bir hava akimi — 'whoosh' degil, nefes."""
    n = int(dur * FS)
    b = svf_band([random.uniform(-1, 1) for _ in range(n)],
                 lambda i: f0 * (f1 / f0) ** (i / n), q=0.6)
    return [b[i] * math.sin(math.pi * i / n) ** 2.0 * 1.4 for i in range(n)]

EVENTS = [(35.72, 0.26, 0.0), (38.42, 0.20, 0.0)]

def main():
    out_path, total = sys.argv[1], int(float(sys.argv[2]) * FS) + FS
    L = [0.0] * total; R = [0.0] * total
    buf = swell()
    for at, gain, pan in EVENTS:
        start = int(at * FS)
        for i, s in enumerate(buf):
            j = start + i
            if 0 <= j < total:
                L[j] += s * gain * (1 - pan) ** .5
                R[j] += s * gain * (1 + pan) ** .5
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(FS)
        w.writeframes(b''.join(struct.pack('<hh',
            max(-32767, min(32767, int(L[i] * 32767))),
            max(-32767, min(32767, int(R[i] * 32767)))) for i in range(total)))
    print(f'{out_path}: {len(EVENTS)} yumusak gecis')
main()
