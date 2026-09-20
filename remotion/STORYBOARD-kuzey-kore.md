# Storyboard — Kuzey Kore (kompozisyon `KuzeyKore`)

1920×1080 · 30 fps · ~8 dk 37 sn. Görsel dil: "istihbarat dosyası" (köşe parantezleri, DOSYA 0X bandı, tarama çizgileri, kırmızı damgalar, sinyal bozulması geçişleri). Bölüm içi geçişler `@remotion/transitions` (fade / wipe / slide), vurgular `Glitch` ile kesme.

| # | Bölüm | Alt sahneler | Animasyon / grafik | Gerçek görsel (public/images/nk) |
|---|---|---|---|---|
| 00 | Açılış | gece haritası (ışıklar tek tek yanar, Kuzey karanlık, Pyongyang tek nokta) → 3 satır ifade (glitch) → başlık (slam + daktilo) | KoreaMap nightLights, Statement, SlamTitle | pyongyang-skyline |
| 01 | Bir Çizgi | damgalı bölüm kartı → 1945 arşiv → 38. paralel çizilir → **cephe animasyonu** (Haz 1950 → Eyl 1950 Busan → Kas 1950 Yalu → 1953) → DMZ haritası → JSA fotoğrafı | KoreaMap parallel/front/dmz | korea-1945-liberation, dmz-jsa |
| 02 | Üç Kim | CRT çerçevede anıt → JUCHE afişi (kayan şeritler) → **hanedan kartları** (altın çerçeve, zaman çizelgesi) → portreler | Dynasty, Stripes, CRT | kim-il-sung-statue, kim-1/2/3, portraits-home |
| 03 | Doğuştan Dosya | **Songbun piramidi** (kat kat, insan glifleri) + kişisel dosya kartı → Pyongyang → ifade (glitch) | SongbunPyramid | pyongyang-apartments |
| 04 | Işıklar Sönüyor | **ışık ızgarası** sönüyor (%100→%0) → pazar tezgâhları beliriyor → pazar fotoğrafı → ifade | LightsOut | jangmadang-market |
| 05 | Para | **odometre 951.000.000** → "FANDATION" daktilo + DURDURULDU damgası → **dünya haritası yayları** (Sony, Bangladeş, WannaCry, Bybit) → **1.500.000.000 odometre** (glitch) → **para akış diyagramı** (4 kaynak → Rejim → nükleer) → asker fotoğrafı | Odometer, WorldArcs, MoneyFlow | bangladesh-bank, nk-soldiers |
| 06 | Vitrin | bulvar → **Ryugyong kat kat yükselir, yıl sayacı 1987→2026, "HÂLÂ AÇILMADI"** → otel fotoğrafı → **DMZ kesiti** (4 km şerit, mavi barakalar, hoparlör dalgaları, 98 m vs 160 m direk yarışı) → Kijong-dong | Ryugyong, DMZSection | pyongyang-boulevard, ryugyong, kijong-dong |
| 07 | Mit ve Gerçek | 3 kâğıt kart + damga (YANLIŞ/YANLIŞ/DOĞRU) → **Kwangmyong kapalı ağ diyagramı** → USB → 34.000 odometre | MythCard, Intranet, Odometer | usb-smuggling |
| 08 | Bugün | Punggye-ri haritası → geçit töreni → Ju-ae → Wonsan → ifade (glitch) | KoreaMap | missile-parade, kim-ju-ae, wonsan-kalma |
| 09 | Kapanış | "Toparlayalım" + 3 daktilo satır → JSA → son kart | SlamTitle, Typewriter | dmz-jsa |

Bileşenler `src/nk/components/` altında; hepsi başka videolarda yeniden kullanılabilir (harita, odometre, damga, CRT, glitch, akış diyagramı).
