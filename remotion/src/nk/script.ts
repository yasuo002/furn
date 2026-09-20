import type {Section} from '../script';
export {countWords, sectionSeconds} from '../script';

/**
 * KUZEY KORE — "Dünyanın En Kapalı Ülkesi Nasıl Hâlâ Ayakta?"
 * Bolum sureleri kelime sayisindan hesaplanir; kayittan sonra overrideSeconds doldur.
 */
export const nkSections: Section[] = [
  {
    id: 'cold-open',
    narration: `Şu fotoğrafa bir bak. Uzaydan çekilmiş, gece vakti. Sağ altta Güney Kore, resmen Noel ağacı gibi ışıl ışıl. Üstte Çin, o da öyle. Peki ikisinin arasındaki bu simsiyah boşluk ne? İlk bakışta deniz sanıyorsun. Değil. Orada yirmi altı milyon insan yaşıyor. Yani İstanbul'un neredeyse iki katı nüfus, ve geceleyin tek bir ışık noktası: başkent Pyongyang. Şimdi şöyle düşün. Bu ülke yetmiş yıldır kapalı. İnterneti yok, ama tarihin en büyük kripto soygununu yapmış. Halkı kıtlık görmüş, ama elinde nükleer bomba var. Ben de bugün şunu merak ediyorum, seninle beraber cevabını arayalım: Kuzey Kore nasıl hâlâ ayakta?`,
    padSeconds: 5,
  },
  {
    id: 'line',
    chapter: 'Bir Çizgi',
    narration: `Bak, her şey aslında bir çizgiyle başlıyor. 1945, savaş bitmiş. Kore otuz beş yıldır Japon işgali altında, nihayet kurtuluyor. Ama kurtaranlar iki farklı ordu: kuzeyden Sovyetler geliyor, güneyden Amerikalılar. Ve Washington'da bir gece, iki genç subay masaya bir harita açıyor. Ellerinde düzgün bir harita bile yok, bir dergi haritası. Diyorlar ki, şuradan bölelim: otuz sekizinci paralel. Bütün iş otuz dakika sürüyor. Geçici olsun diye çiziyorlar. Geçici. O çizgi seksen yıldır orada duruyor. Sonra 1950. Kuzey güneye saldırıyor. Üç yıl boyunca cephe bir aşağı bir yukarı gidip geliyor: önce ta güneyin ucuna kadar iniyor, sonra Çin sınırına dayanıyor, sonra yine ortada kalıyor. Bu arada milyonlarca insan ölüyor. Ve 1953'te ilginç bir şey oluyor: savaş bitmiyor. Sadece duruyor. Ateşkes imzalanıyor ama barış antlaşması hiç imzalanmıyor. Yani kâğıt üstünde bu savaş bugün de devam ediyor. Ateşkes çizgisinin iki yanında dört kilometrelik bir şerit boşaltıyorlar. Adı Silahsızlandırılmış Bölge. Adı böyle ama gerçekte dünyanın en ağır silahlı sınırı orası.`,
    padSeconds: 4,
  },
  {
    id: 'kims',
    chapter: 'Üç Kim',
    narration: `Kuzey tarafında başa Sovyetlerin seçtiği bir adam geçiyor: Kim İl-sung. Eski bir gerilla komutanı. Ama kısa sürede lider olmaktan çıkıyor, resmen tanrı figürüne dönüşüyor. Kendi ideolojisini bile yazıyor: Juche. Türkçesi kabaca "kendi kendine yeterlilik". Yani kimseye muhtaç olmayacağız, her şeyi kendimiz yapacağız. 1994'te ölüyor. Ama şöyle bir şey var, ölünce de ölmüyor: anayasaya onu "ebedi başkan" diye yazıyorlar. Ülkenin başkanı hâlâ o, ölü bir adam. Yerine oğlu Kim Jong-il geçiyor. 2011'de o da ölüyor, sıra toruna geliyor: Kim Jong-un. Düşünsene, adam o sırada yirmi yedi yaşında. Herkes "birkaç ay dayanmaz" diyor. On beş yıl oldu, hâlâ orada. Bugün ülkede her evde, her okulda, her ofiste duvarda iki portre var: dede ve baba. Ve mesela fotoğraf çekerken portrenin yarısını kadraj dışında bırakmak bile başına iş açabiliyor.`,
    padSeconds: 4,
  },
  {
    id: 'songbun',
    chapter: 'Doğuştan Dosya',
    narration: `Peki bu düzen içeride nasıl ayakta kalıyor? Cevabın adı Songbun. Şöyle anlatayım: doğduğun an, daha adın konmadan, ailene göre bir sınıfa yazılıyorsun. Üç sınıf var: çekirdek, kararsız ve düşman. Deden 1950'de güneye kaçmış mı? Ailenin eskiden toprağı var mıymış? Japonya'da bir akraban mı var? Hepsi dosyanda yazıyor. Ve o dosya senin hayatını belirliyor: hangi şehirde yaşayacaksın, hangi okula gideceksin, hangi işe gireceksin. Mesela Pyongyang'da yaşamak bir hak değil, ayrıcalık. İzin almadan başkente taşınamıyorsun. Bir de şu var, bence en ürkütücü kısmı bu: biri suç işlediğinde ceza sadece ona gitmiyor. Anne babasına, çocuklarına, üç kuşağa gidebiliyor. O yüzden kimse komşusunun yanında bile ağzını açmıyor. Yani korku dışarıdan gelen bir şey değil orada. Sistemin ta kendisi.`,
    padSeconds: 4,
  },
  {
    id: 'famine',
    chapter: 'Işıklar Sönüyor',
    narration: `Sonra 1991 geliyor. Sovyetler Birliği dağılıyor. Kuzey Kore'nin bedavaya yakın petrolü, gübresi, yedek parçası bir gecede kesiliyor. Traktörler duruyor, fabrikalar duruyor. Üstüne 1995'te büyük seller. Ve ülke kıtlığa giriyor. Rejim buna bir de isim buluyor: "Zorlu Yürüyüş". Kaç kişi öldü? Kimse tam bilmiyor. Tahminler yüz binlerden başlıyor, bir milyonun üstüne çıkıyor. Devletin herkese yemek dağıttığı sistem çöküyor. Ve işte tam burada ilginç bir şey oluyor. İnsanlar aç kalınca ne yapıyor? Kendi pazarlarını kuruyor. Jangmadang deniyor bunlara. Sokakta tezgâh açıyorlar, takas yapıyorlar, Çin'den kaçak mal getiriyorlar. Devlet önce yasaklıyor. Sonra bakıyor olmuyor, göz yumuyor. Sonra da vergisini almaya başlıyor. Bugün Kuzey Kore'de bir ailenin gelirinin büyük kısmı bu gri pazardan geliyor. Yani ülke kâğıt üstünde sosyalist, ama insanlar aslında el altından kapitalizmle geçiniyor. Bunu aklında tut, çünkü rejimin kendi parası da aynı gri yollardan geliyor.`,
    padSeconds: 4,
  },
  {
    id: 'money',
    chapter: 'Para Nereden Geliyor?',
    narration: `Şimdi asıl büyük soru. Yaptırım altındasın, doğru düzgün ihracatın yok. Nükleer programı, füzeleri nasıl ödüyorsun? Cevap dört kanaldan geliyor. Birincisi: hackerlar. 2016'da bir gece, Bangladeş Merkez Bankası'nın hesabından yaklaşık bir milyar dolar çekilmeye çalışılıyor. Seksen bir milyonu gerçekten gidiyor. Peki gerisini ne durduruyor biliyor musun? Bir yazım hatası. Transfer talimatında "foundation" yazılacak, "fandation" yazılmış. Bankadaki bir çalışan "bu ne ya" diyor, işlemi durduruyor. O operasyonun arkasında Kuzey Kore'ye bağlı Lazarus grubu var. 2017'de WannaCry diye bir virüs dünyada yüz binlerce bilgisayarı kilitliyor, İngiltere'de hastaneler bile duruyor. Ve Şubat 2025: Bybit adlı kripto borsasından yaklaşık bir buçuk milyar dolar çalınıyor. Tarihin en büyük kripto soygunu. FBI bunu da Kuzey Kore'ye bağlıyor. Birleşmiş Milletler uzmanları son yıllarda çalınan kriptonun milyarlarca doları bulduğunu söylüyor. İkinci kanal daha sinsi: sahte serbest çalışanlar. Kuzey Koreli yazılımcılar çalıntı kimliklerle Batılı şirketlerde uzaktan işe giriyor. Belki senin şirketinde de biri var, kim bilir. Maaşlar Pyongyang'a akıyor. Üçüncüsü: yurt dışına gönderilen işçiler. Rusya'da, Çin'de inşaatta, ormanda, tekstilde çalışıyorlar, maaşın büyük kısmını devlet alıyor. Dördüncüsü en yenisi: 2024'ten beri Rusya'ya mühimmat ve on binden fazla asker gönderdiler. Karşılığında petrol, para, teknoloji. Yani şöyle bir tablo var: dünyaya kapalı bir ülke, ama dünyanın finans sisteminin tam göbeğinde yaşıyor.`,
    padSeconds: 4,
  },
  {
    id: 'facade',
    chapter: 'Vitrin',
    narration: `Bir de rejimin dışarıya göstermek istediği yüz var. Pyongyang. Geniş bulvarlar, pastel renkli apartmanlar, dev anıtlar. Ve şehrin tepesinde yüz beş katlı, piramit gibi bir bina: Ryugyong Oteli. 1987'de başlamışlar yapmaya. Bugün hâlâ açılmadı. Dünyanın en yüksek boş binası. Düşünsene, otuz dokuz yıldır misafir bekleyen bir otel. Şimdi sınıra gidelim. Silahsızlandırılmış Bölge'nin hemen kuzeyinde şirin bir köy var: Kijong-dong. Güzel evler, renkli çatılar. Ama Güney tarafından dürbünle bakanlar yıllar içinde bir şey fark ediyor: binaların içinde kat yok. Pencerelerde cam yok. Işıklar her akşam aynı saatte yanıp aynı saatte sönüyor. Yani köy, karşı tarafa "bakın biz ne güzel yaşıyoruz" demek için var. Bir de bayrak direği hikâyesi var, çok hoşuma gidiyor. Güney seksenlerde yaklaşık yüz metrelik bir direk dikiyor. Kuzey buna dayanamıyor, yüz altmış metrelik direk dikiyor. Uzun süre dünyanın en yüksek bayrak direği oydu. Komşuyla balkon yarışının devlet versiyonu.`,
    padSeconds: 4,
  },
  {
    id: 'myths',
    chapter: 'Mit ve Gerçek',
    narration: `Peki içeride hayat gerçekten nasıl? Burada biraz dikkatli olalım, çünkü Kuzey Kore hakkında internette dolaşan haberlerin bir kısmı düpedüz uydurma. Mesela şunu duymuşsundur: "sadece yirmi sekiz saç modeline izin var." Kaynağı belli değil, ülkeden kaçanlar böyle bir liste görmediklerini söylüyor. Ya da "Kim amcasını köpeklere yedirdi" haberi. O da Çin'de bir mizah yazısından çıkmış, bütün dünya gerçek sanmış. Şimdi doğru olanlara gelelim. Ülkede milyonlarca cep telefonu var. Ama internet yok. Kwangmyong diye kapalı bir ağ var, sadece devletin izin verdiği siteler açılıyor. Radyolar fabrikadan devlet frekansına mühürlü geliyor, kanal değiştiremiyorsun. Yine de Çin'den gelen USB belleklerle Güney Kore dizileri elden ele dolaşıyor. Yakalanırsan ceza çok ağır ama insanlar yine de izliyor. Ülkeden kaçıp Güney'e ulaşanların sayısı otuz dört bini geçmiş. Ama 2020'de sınır tamamen kapanınca bu sayı yılda birkaç yüze düşmüş. Yani şöyle özetleyeyim: propaganda posterlerindeki ülke değil orası. Ama karikatürlerdeki ülke de değil.`,
    padSeconds: 4,
  },
  {
    id: 'today',
    chapter: 'Bugün',
    narration: `Bugüne gelelim. Kuzey Kore altı kere nükleer deneme yaptı. Füzeleri Amerika'ya ulaşabilecek menzilde. Rusya'yla "sana saldırırlarsa ben gelirim" maddesi olan bir antlaşma imzaladılar. Kim Jong-un'un küçük kızı Ju-ae törenlerde babasının yanında boy gösteriyor, yani dördüncü kuşak şimdiden sahnede. Ve ülke turizme açılıyor: Rus turistler için deniz kenarında yepyeni bir tatil köyü yaptılar. Yani tablo şu: kapalı ama izole değil. Fakir ama silahlı. Otuz yıldır "yakında çöker" deniyor ama çökmüyor. Nedeni bence tek cümle: bu rejim hayatta kalmayı bir meslek hâline getirdi.`,
    padSeconds: 4,
  },
  {
    id: 'outro',
    narration: `Toparlayalım. Kuzey Kore neden ayakta? Çünkü içeride korku bir sisteme dönüşmüş. Dışarıda gri para akmaya devam ediyor. Ve elindeki nükleer silah rejime bir nevi sigorta sağlıyor. Bir sonraki videoda o sınırın tam üstüne gideceğiz: iki askerin birbirinin gözünün içine baktığı o mavi barakalara. Görüşmek üzere.`,
    padSeconds: 6,
  },
];
