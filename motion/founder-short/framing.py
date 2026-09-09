#!/usr/bin/env python3
"""Tek plan bir cekimde 'kurgu' hissi yaratan kadraj cizelgesi.

Her satir bir plan: (baslangic, zoom_bas, zoom_bit, x_kaydirma, y_kaydirma).
Planlar arasi gecis serttir — dijital bir kesme gibi calisir. Plan icinde zoom
yavasca surunur, boylece kare olu durmaz.  y negatif = pencere yukari kayar
(yuzu kadrajda tutar).  Cikti: ffmpeg icin Z / XO / YO ifadeleri.
"""
import sys

SHOTS = [                       # t      z0     z1     x    y
    (0.00, 1.12, 1.14,   0,  -40),   # kanca — orta plan
    (2.34, 1.03, 1.05,   0,    0),   # genis: liste paneli
    (7.72, 1.24, 1.26,   0,  -70),   # yakin: "sadece para değildir"
    (9.44, 1.04, 1.06,   0,    0),   # genis: düğüm diyagramı
    (13.14,1.16, 1.18,  40,  -55),   # hikâye, hafif sağdan
    (15.44,1.26, 1.28, -30,  -70),   # yakin
    (17.88,1.10, 1.12,   0,  -35),
    (21.44,1.30, 1.32,   0,  -80),   # kinetik kartın altı
    (23.00,1.02, 1.04,   0,    0),   # genis: "yoksa" paneli
    (29.02,1.14, 1.16,   0,  -45),
    (32.76,1.22, 1.24,   0,  -65),
    (35.86,1.22, 1.24,   0,  -65),   # soru kartının altı
    (38.66,1.08, 1.10,   0,  -30),
    (43.06,1.16, 1.18,   0,  -50),   # marka rozeti
    (47.44,1.03, 1.05,   0,    0),   # genis: eksikler paneli
    (54.82,1.28, 1.30,   0,  -75),   # kinetik 2
    (57.32,1.05, 1.00,   0,    0),   # kapanışa yavaş açılma
    (61.30,1.00, 1.00,   0,    0),   # kaynağın kendi outro'su — dokunulmaz
]
END = float(sys.argv[1]) if len(sys.argv) > 1 else 69.87

def expr(idx, default):
    parts = []
    for i, s in enumerate(SHOTS):
        a = s[0]
        b = SHOTS[i + 1][0] if i + 1 < len(SHOTS) else END
        if idx == 'z':
            v = f"({s[1]}+({s[2]}-{s[1]})*(t-{a})/{b-a:.4f})"
        else:
            v = f"{s[idx]}"
        parts.append(f"between(t,{a},{b})*{v}")
    return "(" + "+".join(parts) + ")"

print("Z='" + expr('z', 1.0) + "'")
print("XO='" + expr(3, 0) + "'")
print("YO='" + expr(4, 0) + "'")
