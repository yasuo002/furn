/**
 * SESLENDIRME METNI + ZAMANLAMA
 *
 * Her bolumun suresi, kelime sayisindan otomatik hesaplanir (WPM ile).
 * Seslendirmeyi kaydettikten sonra her bolumun gercek suresini
 * `overrideSeconds` alanina saniye olarak yazarsan video kayda birebir oturur.
 */

export type Section = {
  id: string;
  chapter?: string; // ekranda gorunecek bolum basligi
  narration: string; // seslendirme metni
  overrideSeconds?: number; // kayittan sonra doldur
  padSeconds?: number; // nefes / gorsel pay
};

/** Turkce belgesel anlatimi icin rahat tempo. Kayittan sonra degistir. */
export const WORDS_PER_MINUTE = 128;

export const sections: Section[] = [
  {
    id: 'cold-open',
    narration: `1963 yılı. Nevşehir'in Derinkuyu ilçesinde bir adam evini genişletmek istiyor. Kazmayı alıyor, bodrumundaki duvarı yıkmaya başlıyor. Duvar yıkılıyor ve arkasından bir oda çıkıyor. Sonra bir koridor. Sonra bir oda daha. Adam farkında değil ama az önce, yüzeyin seksen metre altına kadar inen, binlerce insanı ve hayvanı barındıracak büyüklükte bir şehrin kapısını açtı. Bu şehrin bir adı yok. Kim kazdığı kesin bilinmiyor. Ne zaman kazıldığı tartışmalı. Ama bir şey kesin: burası, tarihin en büyük saklanma projelerinden biri. Bugün bu şehre birlikte ineceğiz. Kat kat. Ve her katta aynı soruyu soracağız: bunu kim, neden yaptı?`,
    padSeconds: 4,
  },
  {
    id: 'discovery',
    chapter: 'Duvarın Arkası',
    narration: `Önce sahneyi kuralım. Kapadokya. Peri bacaları, balonlar, kartpostal manzaraları. Ama bu manzaranın altında başka bir Kapadokya var. Bölgede bugüne kadar yüzlerce yeraltı yerleşimi tespit edildi. Bunların en derini Derinkuyu. Aslında yöre halkı bu tünellerin varlığını hep biliyordu. Kimi evin altında bir kiler vardı, kimi ahır olarak kullanılan bir mağara. 1963'teki o duvar, bu parçaları birbirine bağlayan büyük resmi ortaya çıkardı. Arkeologlar geldi, koridorlar temizlendi ve 1969'da şehir ziyarete açıldı. Bugün sekiz katını gezebiliyorsunuz. Ama tahminlere göre toplam on sekiz kata kadar iniyor. Ve şimdi, ilk adımı atıyoruz.`,
    padSeconds: 3,
  },
  {
    id: 'structure',
    chapter: 'Kat Kat Aşağı',
    narration: `Girişte ilk fark ettiğiniz şey, koridorların dar ve alçak olması. Eğilerek yürüyorsunuz. Bu bir hata değil, tasarım. Dar bir koridorda düşman tek sıra halinde, eğilerek ilerlemek zorunda. Ve tam o anda karşısında şunu buluyor: devasa bir taş tekerlek. Yaklaşık bir buçuk metre çapında, yarım tona yakın ağırlıkta, kocaman bir değirmen taşı gibi. Bu taşlar koridorun içindeki bir yuvaya oturuyor ve sadece içeriden itilerek kapatılabiliyor. Dışarıdan açmak neredeyse imkânsız. Ortasındaki delik ise düşmanı gözetlemek, hatta mızrakla vurmak için. Bu kapılardan her katta var. Yani düşman bir katı ele geçirse bile, altındaki katlar hâlâ güvende. Peki bu kadar derinde nasıl nefes alıyorsunuz? İşte şehrin dehası burada. Yüzeyden en alt katlara kadar inen elliden fazla havalandırma bacası var. Bazıları aynı zamanda su kuyusu. Sıcak hava yükselip bacadan çıkıyor, taze hava yerine çekiliyor. Elektrik yok, fan yok, ama en alt katta bile hava temiz. Sıcaklık yıl boyunca aşağı yukarı sabit, on üç derece civarı. Yazın serin, kışın ılık. Ve en ilginci: bu bacaların bazıları yüzeyde öyle gizlenmiş ki, düşman şehrin tam üstünde dururken, ayaklarının altında binlerce insan olduğunu anlayamıyor.`,
    padSeconds: 4,
  },
  {
    id: 'geology',
    chapter: 'Kaya Neden İzin Verdi?',
    narration: `Burada bir soru sormamız lazım. Bir kazma alıp seksen metre aşağı bir şehir kazmaya kalksanız olur mu? Olmaz. Çoğu yerde ya kaya çok sert, ya toprak çökerdi. Kapadokya'nın sırrı, ayağının altındaki taşta. Milyonlarca yıl önce Erciyes, Hasan Dağı ve Göllüdağ gibi volkanlar bölgeyi kalın bir kül tabakasıyla örttü. Bu kül zamanla sıkışıp tüf dediğimiz kayaya dönüştü. Tüfün bir özelliği var: taze kesildiğinde şaşırtıcı derecede yumuşak. Basit demir aletlerle oyabiliyorsunuz. Ama havayla temas ettikçe sertleşiyor. Yani oyduğunuz oda, zamanla kendi kendine sağlamlaşıyor. Peri bacalarını yapan da aynı şey: yağmur ve rüzgâr yumuşak tüfü aşındırıyor, üstteki sert bazalt şapka kalıyor. Kısacası doğa, Kapadokya'ya dev bir kazılabilir malzeme bıraktı. İnsanlar da bunu fark etti.`,
    padSeconds: 3,
  },
  {
    id: 'who',
    chapter: 'Kim Kazdı?',
    narration: `Şimdi büyük soruya geliyoruz. Kim? Dürüst cevap: kesin bilmiyoruz. Ve nedeni ilginç. Bir yapıyı tarihlemek için genelde harcına, tuğlasına, içinde bulunan eşyalara bakarsınız. Ama burada harç yok, tuğla yok. Kayadan bir şey eksiltilerek yapılmış. Bir boşluğu karbon testine sokamazsınız. Elimizde üç ana ipucu var. Birincisi: Kültür Bakanlığı arkeologlarına göre ilk galeriler milattan önce sekizinci ve yedinci yüzyılda Frigler tarafından açıldı. Frigler bu bölgede yaşıyordu ve büyük kaya işçiliğiyle tanınıyorlardı. İkincisi: bazı araştırmacılar daha da geriye gidip Hititleri işaret ediyor. Bölgede Hitit izleri var, ama bu şehir için kanıt zayıf. Üçüncü ipucu bir yazılı kaynak. Milattan önce dördüncü yüzyılda Atinalı Ksenophon, Anabasis adlı eserinde Anadolu'da insanların evlerini yerin altına kazdığını, hayvanlarıyla birlikte orada yaşadıklarını anlatıyor. Ksenophon'un anlattığı yer Derinkuyu değil, daha doğuda. Ama bize şunu söylüyor: en az iki bin dört yüz yıl önce Anadolu'da yeraltında yaşama fikri sıradan bir şeydi. Sonuç: en makul tahmin, şehrin tek seferde değil, katman katman, yüzyıllar içinde büyüdüğü. Küçük bir kiler açan ilk insanlardan, on sekiz katlı bir şehre.`,
    padSeconds: 4,
  },
  {
    id: 'why',
    chapter: 'Neden Yerin Altı?',
    narration: `Peki neden? Kim bu kadar emeği yerin altına gömer? Cevap için Derinkuyu'nun en büyük genişleme dönemine bakmamız lazım: Bizans dönemi. Yedinci yüzyıldan itibaren Anadolu bir sınır bölgesi hâline geldi. Güneydoğuda Arap orduları, kuzeybatıda Bizans. Ve Kapadokya tam ortada. Yüzyıllar boyunca neredeyse her yaz Toroslardaki geçitlerden akınlar geliyor. Köyler yağmalanıyor, insanlar esir alınıyor. Yerel halkın iki seçeneği var: ya kaçmak ya da saklanmak. Kaçacak yer yok. Ama saklanacak bir taş var. İşte bu dönemde Derinkuyu, asıl Derinkuyu oluyor. Kiliseler oyuluyor, erzak odaları, şarap presleri, ahırlar, hatta bir çeşit okul. Şehir, kısa süreli bir sığınak olmaktan çıkıp haftalarca kapalı kalabilecek bir yerleşime dönüşüyor. Şuna dikkat edin: burası bir mezar ya da tapınak değil. İnsanlar burada yaşamak için değil, hayatta kalmak için var. Yüzeyde evleri var, tarlaları var. Tehlike gelince aşağı iniyor, tehlike geçince yukarı çıkıyorlar. Tıpkı bir sığınak gibi. Ve bu yalnızca Arap akınlarıyla bitmiyor. Yüzyıllar sonra Moğol akınları döneminde de aynı şehir yine devreye giriyor.`,
    padSeconds: 4,
  },
  {
    id: 'life',
    chapter: 'Yeraltında Hayat',
    narration: `Şimdi bir an durup içeride yaşamanın nasıl bir şey olduğunu düşünelim. Üst katlar hayvanlara ayrılmış. Neden? Çünkü hayvan kokusu ve ısısı aşağı inmesin, ve saldırı anında en değerli şey olan insanlar en derinde kalsın. Hemen altında mutfaklar. Duvarlarında hâlâ is izleri var. Tavanı tonozlu geniş bir oda ikinci katta. Buranın bir eğitim yeri, bir misyoner okulu olduğu düşünülüyor. Şarap ve yağ presleri, tahıl kuyuları, ambarlar. Ve en aşağıda, haç planlı bir kilise. En derin noktada, en kutsal yer. Bir de küçücük bir hücre var. Bazı rehberler burayı hapishane diye anlatıyor. Kesin mi? Değil. Ama şehrin bir düzeni olduğuna işaret ediyor. Bir de meşhur bir iddia var: Derinkuyu ile yaklaşık dokuz kilometre uzaktaki Kaymaklı yeraltı şehrini bağlayan bir tünel. Bu tünelin bir kısmı gerçekten var. Ama iki şehir arasında kesintisiz bir yol henüz kanıtlanmadı. Bu yüzden ben size gizli dokuz kilometrelik tünel demeyeceğim. Elimizde var olanlar bile yeterince etkileyici.`,
    padSeconds: 3,
  },
  {
    id: 'last-residents',
    chapter: 'Son Sakinler',
    narration: `Bu şehrin en şaşırtıcı yanı ne biliyor musunuz? Terk edilmiş bir antik kalıntı olmaması. Derinkuyu, yirminci yüzyıla kadar kullanıldı. Bu bölgede yaşayan Kapadokyalı Rumlar, kasabanın eski adıyla Malakopi'nin altındaki bu tünelleri kiler, ahır ve sığınak olarak kullanmaya devam etti. Ta ki 1923'e kadar. Lozan Antlaşması'nın ardından yapılan nüfus mübadelesiyle bu insanlar Yunanistan'a gönderildi. Onlarla birlikte şehrin hafızası da gitti. Kırk yıl sonra bir adam bodrumundaki duvarı yıkınca, unutulmuş olan yeniden hatırlandı. Yani kayıp şehir hikâyesinin gerçek versiyonu şu: şehir kaybolmadı, sadece anlatacak kimse kalmadı.`,
    padSeconds: 4,
  },
  {
    id: 'kayasehir',
    chapter: 'Hikâye Bitmedi',
    narration: `Ve hikâye burada bitmiyor. 2013 yılında Nevşehir'in merkezinde, kalenin eteklerinde bir toplu konut projesi için kazı yapılıyor. İş makineleri tünellere rastlıyor. Ortaya çıkan yerin adı Kayaşehir. Yapılan ölçümlere göre, yayıldığı alan bakımından Derinkuyu'yu bile geride bırakabilecek, yüzlerce oda ve kilise barındıran yepyeni bir yeraltı şehri. Düşünün: 2013'te, bir şehrin göbeğinde, insanların tam altında. Bu bize şunu söylüyor: Kapadokya'nın altını hâlâ tam olarak bilmiyoruz. Her yeni inşaat, her yeni kazı, yeni bir kapı açabilir. 1985'ten beri UNESCO Dünya Mirası listesinde olan bu bölge, hâlâ yarısı yazılmamış bir kitap.`,
    padSeconds: 3,
  },
  {
    id: 'outro',
    narration: `Toparlayalım. Kim kazdı? Muhtemelen Frigler başlattı, Bizanslılar büyüttü, Rumlar son kullanan oldu. Neden? Çünkü kaçacak yer yoktu ama kazılabilir bir taş vardı. Ve sonuç: elektrik yok, makine yok, ama havalandırması, kapı sistemi ve şehir planı olan on sekiz katlı bir yapı. Biz bugün hayatta kalma deyince sığınak filmleri düşünüyoruz. Bin yıl önce Kapadokya'da insanlar bunu gerçekten yaptı. Bir sonraki videoda aynı sorunun çok daha modern bir versiyonunu konuşacağız: bin yıl değil, yüz bin yıl dayanması gereken bir yeraltı yapısı. Nerede? Finlandiya'da. İçinde ne var? Onu o zaman anlatacağım. Görüşmek üzere.`,
    padSeconds: 6,
  },
];

export const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export const sectionSeconds = (s: Section): number => {
  if (s.overrideSeconds) return s.overrideSeconds;
  const words = countWords(s.narration);
  return (words / WORDS_PER_MINUTE) * 60 + (s.padSeconds ?? 2);
};

export const totalSeconds = () => sections.reduce((a, s) => a + sectionSeconds(s), 0);
