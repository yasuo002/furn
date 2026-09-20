// ELLE TANIMLANMIŞ güvenli kategori listesi. Amazon'un canlı/eksiksiz kategori ağacı DEĞİLDİR.
// Her yaprak kategori bir Amazon arama sorgusuna (k) ve bölüm takma adına (i) karşılık gelir.
// Geçerlilik doğrulaması "Kategori adresini doğrula" işlemiyle kullanıcının makinesinde yapılır.
export const CATEGORY_LIST_NOTE = 'Bu liste elle tanımlanmış güvenli kategorilerden oluşur; Amazon\'un canlı kategori ağacı değildir. Her alt kategori bir arama sorgusuna karşılık gelir.';

const AMZ = 'https://www.amazon.com/s';
const q = (k, i, extra = '') => `${AMZ}?k=${encodeURIComponent(k)}&i=${i}${extra}`;

export const CATEGORIES = [
  {
    id: 'office', label: 'Ofis Ürünleri (elektriksiz)',
    subs: [
      { id: 'desk-org', label: 'Masa Düzenleyiciler', leaves: [
        { id: 'pen-holders', label: 'Kalemlikler', url: q('pen holder desk organizer', 'office-products') },
        { id: 'desktop-trays', label: 'Masa Üstü Evrak Tepsileri', url: q('desktop letter tray paper organizer', 'office-products') },
        { id: 'drawer-org', label: 'Çekmece Düzenleyiciler', url: q('desk drawer organizer tray', 'office-products') },
        { id: 'monitor-stand', label: 'Monitör Yükselticiler (ahşap/metal, elektriksiz)', url: q('monitor stand riser wood', 'office-products') },
        { id: 'desk-shelf', label: 'Masa Üstü Raflar', url: q('desktop shelf organizer', 'office-products') },
      ]},
      { id: 'filing', label: 'Dosyalama ve Arşiv', leaves: [
        { id: 'file-boxes', label: 'Dosya Kutuları', url: q('file box document storage', 'office-products') },
        { id: 'magazine-holders', label: 'Dergilikler', url: q('magazine file holder', 'office-products') },
        { id: 'binders', label: 'Klasörler', url: q('3 ring binder', 'office-products') },
        { id: 'clipboards', label: 'Sekreterlikler (Clipboard)', url: q('clipboard', 'office-products') },
      ]},
      { id: 'paper', label: 'Defter ve Planlayıcı', leaves: [
        { id: 'notebooks', label: 'Not Defterleri', url: q('hardcover notebook journal', 'office-products') },
        { id: 'planners', label: 'Planlayıcılar', url: q('undated planner', 'office-products') },
        { id: 'desk-pads', label: 'Masa Pedleri', url: q('desk pad mat', 'office-products') },
        { id: 'bookends', label: 'Kitap Tutucular', url: q('bookends', 'office-products') },
      ]},
    ],
  },
  {
    id: 'home-org', label: 'Ev Düzenleme (gıda ile temas etmeyen)',
    subs: [
      { id: 'closet', label: 'Dolap ve Giysi Düzenleme', leaves: [
        { id: 'hangers', label: 'Askı Setleri', url: q('velvet hangers set', 'garden') },
        { id: 'drawer-dividers', label: 'Çekmece Bölücüler', url: q('drawer dividers organizer clothes', 'garden') },
        { id: 'fabric-bins', label: 'Kumaş Saklama Kutuları', url: q('fabric storage bins foldable', 'garden') },
        { id: 'shoe-org', label: 'Ayakkabı Düzenleyiciler', url: q('shoe organizer rack', 'garden') },
        { id: 'closet-shelf-dividers', label: 'Raf Bölücüler', url: q('closet shelf dividers', 'garden') },
      ]},
      { id: 'bath-org', label: 'Banyo Düzenleme (ürün değil, düzenleyici)', leaves: [
        { id: 'shower-caddy', label: 'Duş Rafları', url: q('shower caddy rustproof', 'garden') },
        { id: 'towel-racks', label: 'Havlu Askıları', url: q('towel rack wall mounted', 'garden') },
        { id: 'makeup-org', label: 'Makyaj Düzenleyiciler (boş organizer)', url: q('makeup organizer acrylic', 'garden') },
      ]},
      { id: 'living', label: 'Oturma Odası ve Antre', leaves: [
        { id: 'remote-org', label: 'Kumanda Düzenleyiciler', url: q('remote control holder organizer', 'garden') },
        { id: 'cable-org', label: 'Kablo Düzenleyiciler (pasif)', url: q('cable management box', 'garden') },
        { id: 'key-holders', label: 'Anahtar Askıları', url: q('key holder wall mount', 'garden') },
        { id: 'entry-shoe-rack', label: 'Antre Ayakkabılıkları', url: q('entryway shoe rack', 'garden') },
      ]},
    ],
  },
  {
    id: 'hobby', label: 'Hobi Aksesuarları (basit)',
    subs: [
      { id: 'art', label: 'Resim ve Çizim', leaves: [
        { id: 'sketchbooks', label: 'Eskiz Defterleri', url: q('sketchbook', 'arts-crafts') },
        { id: 'easels', label: 'Masa Üstü Şövaleler', url: q('tabletop easel', 'arts-crafts') },
        { id: 'brush-holders', label: 'Fırça Düzenleyiciler', url: q('paint brush holder organizer', 'arts-crafts') },
      ]},
      { id: 'craft', label: 'El İşi Düzenleme', leaves: [
        { id: 'yarn-org', label: 'İplik Düzenleyiciler', url: q('yarn storage organizer', 'arts-crafts') },
        { id: 'bead-org', label: 'Boncuk Saklama Kutuları', url: q('bead organizer box', 'arts-crafts') },
        { id: 'thread-org', label: 'Makara Düzenleyiciler', url: q('thread spool organizer', 'arts-crafts') },
      ]},
      { id: 'games', label: 'Puzzle ve Masa Oyunu Aksesuarları', leaves: [
        { id: 'puzzle-mats', label: 'Puzzle Matları', url: q('puzzle roll up mat', 'toys-and-games') },
        { id: 'puzzle-trays', label: 'Puzzle Sıralama Tepsileri', url: q('puzzle sorting trays', 'toys-and-games') },
        { id: 'card-holders', label: 'Oyun Kartı Tutucular', url: q('playing card holder', 'toys-and-games') },
        { id: 'dice-trays', label: 'Zar Tepsileri', url: q('dice tray', 'toys-and-games') },
      ]},
      { id: 'collect', label: 'Koleksiyon ve Sergileme', leaves: [
        { id: 'display-cases', label: 'Vitrin Kutuları (akrilik)', url: q('acrylic display case', 'garden') },
        { id: 'figure-stands', label: 'Figür Standları', url: q('figure display stand riser', 'garden') },
        { id: 'plant-stands', label: 'İç Mekân Saksı Standları', url: q('indoor plant stand', 'garden') },
      ]},
    ],
  },
];

export function findLeaf(mainId, subId, leafId) {
  const main = CATEGORIES.find(c => c.id === mainId); if (!main) return null;
  const sub = main.subs.find(s => s.id === subId); if (!sub) return null;
  const leaf = sub.leaves.find(l => l.id === leafId); if (!leaf) return null;
  return { mainId, subId, leafId, mainLabel: main.label, subLabel: sub.label, leafLabel: leaf.label, url: leaf.url };
}
export function allLeaves() {
  const out = [];
  for (const c of CATEGORIES) for (const s of c.subs) for (const l of s.leaves) out.push({ ...l, mainId: c.id, subId: s.id, path: `${c.label} › ${s.label} › ${l.label}` });
  return out;
}
