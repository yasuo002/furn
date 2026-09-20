import type {Section} from '../script';
export {countWords, sectionSeconds} from '../script';

/**
 * KUZEY KORE — "Dünyanın En Kapalı Ülkesi Nasıl Hâlâ Ayakta?"
 * Bolum sureleri kelime sayisindan hesaplanir; kayittan sonra overrideSeconds doldur.
 */
export const nkSections: Section[] = [
  {
    id: 'cold-open',
    narration: `Bu fotoğraf uzaydan çekildi. Gece. Sağ altta Güney Kore, ışıl ışıl. Üstte Çin, aynı şekilde. Ama ikisinin arasında simsiyah bir boşluk var. Sanki orada deniz varmış gibi. Orada deniz yok. Orada yirmi altı milyon insan yaşıyor. Karanlığın ortasındaki o tek ışık noktası, başkent Pyongyang. Bu ülke yetmiş yıldır kapalı. İnterneti yok, ama tarihin en büyük kripto soygununu yaptı. Halkı kıtlık gördü, ama nükleer bombası var. Bugün şu soruya cevap arayacağız: Kuzey Kore nasıl hâlâ ayakta?`,
    padSeconds: 5,
  },
  {
    id: 'line',
    chapter: 'Bir Çizgi',
    narration: `Her şey bir çizgiyle başlıyor. 1945, İkinci Dünya Savaşı bitiyor. Kore, otuz beş yıllık Japon işgalinden kurtuluyor. Ama kurtaranlar iki farklı ordu: kuzeyden Sovyetler, güneyden Amerikalılar. Washington'da iki genç subay, bir gece, harita üzerinde geçici bir sınır çiziyor: otuz sekizinci paralel. Otuz dakikada. Planları geçici. Ama o çizgi bugün hâlâ orada. 1950'de Kuzey, güneyi işgal ediyor. Üç yılda cephe önce güneyin ucuna, sonra Çin sınırına, sonra yeniden ortaya gidip geliyor. Milyonlarca insan ölüyor. 1953'te savaş bitmiyor, sadece duruyor. Bir ateşkes imzalanıyor, barış antlaşması asla. Yani teknik olarak bu savaş bugün de sürüyor. Ateşkes çizgisinin iki yanında dört kilometre genişliğinde bir şerit boşaltılıyor: Silahsızlandırılmış Bölge. İsmi böyle. Ama gerçekte dünyanın en ağır silahlandırılmış sınırı.`,
    padSeconds: 4,
  },
  {
    id: 'kims',
    chapter: 'Üç Kim',
    narration: `Kuzeyde iktidara Sovyetlerin seçtiği bir adam geliyor: Kim İl-sung. Bir gerilla komutanı. Ve kısa sürede sadece lider değil, bir tanrı figürüne dönüşüyor. Kendi ideolojisini yazıyor: Juche. Kabaca kendine yeterlilik demek. Kimseye muhtaç olmayacağız, her şeyi kendimiz yapacağız. 1994'te ölüyor. Ama ölmüyor: anayasa onu ebedi başkan ilan ediyor. Yerine oğlu Kim Jong-il geçiyor. 2011'de o da ölünce üçüncü kuşak: Kim Jong-un. O sırada yirmili yaşlarının sonunda. Dünya, birkaç ay dayanmaz diyor. On beş yıl geçti. Bugün her evde, her kurumda iki portre asılı: baba ve dede. Ve fotoğraf çekerken kadrajı kesmek bile suç sayılabiliyor.`,
    padSeconds: 4,
  },
  {
    id: 'songbun',
    chapter: 'Doğuştan Dosya',
    narration: `Peki bu sistem içeride nasıl tutunuyor? Cevabın adı Songbun. Herkesin, doğduğu anda ailesine göre bir sınıfı var. Üçe ayrılıyor: çekirdek, kararsız ve düşman. Deden 1950'de güneye kaçmış mı? Ailen toprak sahibi miymiş? Bir akraban Japonya'da mı yaşıyor? Bunlar senin dosyanda. Ve dosya, nerede yaşayacağını, hangi okula gideceğini, hangi işe gireceğini belirliyor. Pyongyang'da yaşamak bir hak değil, bir ayrıcalık. İzinle olur. Bir de şu var: bir kişi suç işleyince ceza tek kişiye değil, üç kuşağa gidebiliyor. Bu yüzden kimse, komşusunun önünde bile konuşmuyor. Korku dışarıdan gelen bir şey değil. Sistemin içine gömülü.`,
    padSeconds: 4,
  },
  {
    id: 'famine',
    chapter: 'Işıklar Sönüyor',
    narration: `Sonra 1991. Sovyetler Birliği dağılıyor. Kuzey Kore'nin ucuz petrolü, gübresi, yedek parçası bir gecede kesiliyor. Traktörler duruyor, fabrikalar duruyor. Üstüne 1995'te seller geliyor. Ve ülke kıtlığa giriyor. Rejim buna bir isim koyuyor: Zorlu Yürüyüş. Kaç kişi öldü? Bilmiyoruz. Tahminler yüz binlerden bir milyonun üzerine çıkıyor. Devletin erzak sistemi çöküyor. Ve işte burada ilginç bir şey oluyor: insanlar hayatta kalmak için kendi pazarlarını kuruyor. Jangmadang. Sokak tezgâhları, takas, Çin'den kaçak mal. Devlet önce yasaklıyor, sonra göz yumuyor, sonra vergilendiriyor. Bugün Kuzey Kore'de hane gelirinin büyük kısmı bu gri pazardan geliyor. Yani ülke resmen sosyalist, ama insanlar gayri resmi kapitalizmle yaşıyor. Bunu aklınızda tutun, çünkü rejimin para bulma yöntemi de aynı gri alandan geçiyor.`,
    padSeconds: 4,
  },
  {
    id: 'money',
    chapter: 'Para Nereden Geliyor?',
    narration: `Şimdi büyük soru. Yaptırım altındaki, ihracatı yok denecek kadar az bir ülke, nükleer programı ve füzeleri nasıl finanse ediyor? Cevap dört kanaldan geliyor. Birincisi: hackerlar. 2016'da Bangladeş Merkez Bankası'nın hesaplarından bir gecede yaklaşık bir milyar dolar çekilmeye çalışılıyor. Seksen bir milyon dolar gidiyor. Gerisini durduran şey ne biliyor musunuz? Bir transfer talimatındaki yazım hatası. Foundation kelimesi fandation yazılmış, bir banka çalışanı şüphelenip işlemi durdurmuş. Bu operasyonun arkasında Kuzey Kore'ye bağlı Lazarus grubu vardı. 2017'de WannaCry virüsü dünyada yüz binlerce bilgisayarı kilitledi. Ve Şubat 2025: kripto borsası Bybit'ten yaklaşık bir buçuk milyar dolar çalındı. Tarihin en büyük kripto soygunu. FBI bunu da Kuzey Kore'ye bağladı. Birleşmiş Milletler uzmanlarına göre son yıllarda çalınan kripto milyarlarca doları buldu. İkinci kanal: sahte serbest çalışanlar. Kuzey Koreli yazılımcılar, çalıntı kimliklerle Batılı şirketlerde uzaktan işe giriyor, maaşlar Pyongyang'a akıyor. Üçüncü kanal: yurt dışına gönderilen işçiler. Rusya ve Çin'de inşaat, ormancılık, tekstil. Maaşın büyük kısmı devlete. Dördüncü kanal en yenisi: 2024'ten itibaren Rusya'ya mühimmat ve on binden fazla asker. Karşılığında petrol, para ve teknoloji. Yani tablo şu: dışarıya kapalı bir ülke, dünyanın finans sisteminin tam içinde yaşıyor.`,
    padSeconds: 4,
  },
  {
    id: 'facade',
    chapter: 'Vitrin',
    narration: `Bir de rejimin dünyaya göstermek istediği yüz var. Pyongyang. Geniş bulvarlar, pastel renkli apartmanlar, dev anıtlar. Şehrin üstünde yüz beş katlı, piramit şeklinde bir bina yükseliyor: Ryugyong Oteli. İnşaatına 1987'de başlandı. Bugün hâlâ açılmadı. Dünyanın en yüksek boş binası. Şimdi sınıra gidelim. Silahsızlandırılmış Bölge'nin hemen kuzeyinde bir köy var: Kijong-dong. Güzel evler, renkli çatılar. Ama Güney'den bakanlar yıllar içinde bir şeyi fark etti: binaların içinde kat yok, pencerelerde cam yok, ışıklar hep aynı saatte yanıp sönüyor. Bu köy, sınırın diğer tarafına bakın ne kadar iyiyiz demek için var. Bir de bayrak direği: yüz altmış metre. Güney seksenlerde yaklaşık yüz metrelik bir direk dikince, Kuzey daha uzununu dikti. Uzun süre dünyanın en yüksek bayrak direğiydi.`,
    padSeconds: 4,
  },
  {
    id: 'myths',
    chapter: 'Mit ve Gerçek',
    narration: `Peki içeride hayat gerçekten nasıl? Burada dikkatli olmamız lazım, çünkü Kuzey Kore hakkında dolaşan haberlerin bir kısmı doğru değil. Mesela sadece yirmi sekiz saç modeline izin var iddiası. Kaynağı belirsiz, ülkeden kaçanlar böyle bir liste görmediklerini söylüyor. Ya da Kim'in amcası köpeklere yedirildi haberi. Çin'de bir hiciv yazısından çıkmış, dünya gerçek sanmış. Şimdi doğru olanlar. Ülkede milyonlarca cep telefonu var, ama internet yok. Kwangmyong denen kapalı bir ağ var, sadece devletin izin verdiği siteler. Radyolar devlet frekansına mühürlü. Yine de Çin'den gelen USB belleklerle Güney Kore dizileri elden ele dolaşıyor. Yakalanırsan ceza ağır. Ülkeden kaçıp Güney'e ulaşanların sayısı otuz dört bini geçti, ama sınır 2020'de tamamen kapanınca bu sayı yılda birkaç yüze düştü. Yani resim şu: propaganda posterlerindeki ülke değil, ama karikatürlerdeki ülke de değil.`,
    padSeconds: 4,
  },
  {
    id: 'today',
    chapter: 'Bugün',
    narration: `Bugün Kuzey Kore altı nükleer deneme yapmış durumda. Kıtalararası füzeleri Amerika'ya ulaşabilecek menzilde. Rusya ile karşılıklı savunma maddesi içeren bir antlaşma imzaladı. Kim Jong-un'un genç kızı Ju-ae törenlerde yanında görünüyor. Dördüncü kuşak şimdiden sahnede. Ve ülke turizme açılıyor: Rus turistler için deniz kıyısında yepyeni bir tatil köyü. Kapalı ama izole değil. Fakir ama silahlı. Çökecek deniyor, ama çökmüyor. Nedeni tek cümle: rejim, hayatta kalmayı bir sanayi hâline getirdi.`,
    padSeconds: 4,
  },
  {
    id: 'outro',
    narration: `Toparlayalım. Kuzey Kore ayakta, çünkü içeride korku bir sisteme dönüştü, dışarıda gri para akmaya devam ediyor ve nükleer silah rejime bir sigorta sağlıyor. Bir sonraki videoda o sınırın tam üstüne gideceğiz: iki askerin göz göze durduğu mavi barakalara. Görüşmek üzere.`,
    padSeconds: 6,
  },
];
