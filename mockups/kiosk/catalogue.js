// Bercut service catalogue — shared between kiosk components and admin KioskConfig.
// Kept separate from data.js so admin can import just the service definitions
// without pulling in the large base64 logo asset embedded in data.js.

export const SERVICES = [
  // HAIRCUT — washAddon means customer can toggle +Wash for +Rp10k
  { id: 1,  cat: 'Haircut',   name: 'Just a Haircut',          nameId: 'Potong Rambut',    dur: 30,  price: 130000, washAddon: true, img: '/assets/haircut.png' },
  { id: 2,  cat: 'Haircut',   name: 'Kids Haircut',             nameId: 'Potong Anak',       dur: 25,  price: 130000, washAddon: true, img: '/assets/kidshaircut.png' },
  { id: 3,  cat: 'Haircut',   name: 'Skin Fade',                nameId: 'Skin Fade',         dur: 45,  price: 130000, washAddon: true, img: '/assets/skinfade.png' },
  { id: 4,  cat: 'Haircut',   name: 'Head Shaving',             nameId: 'Cukur Botak',       dur: 30,  price: 130000, img: '/assets/headshaving.png' },
  { id: 5,  cat: 'Haircut',   name: 'Hair Tattoo',              nameId: 'Tato Rambut',       dur: 45,  price: 150000, img: '/assets/hairtattoo.png' },
  // BEARD
  { id: 6,  cat: 'Beard',     name: 'Beard Trim',               nameId: 'Rapikan Jenggot',   dur: 20,  price: 75000,  mutex_group: 'beard_service', img: '/assets/beardtrimming.png' },
  { id: 7,  cat: 'Beard',     name: 'Beard Shaving',            nameId: 'Cukur Jenggot',     dur: 25,  price: 95000,  mutex_group: 'beard_service', img: '/assets/beardshaving.png' },
  { id: 8,  cat: 'Beard',     name: 'Beard Coloring',           nameId: 'Warna Jenggot',     dur: 40,  price: 125000, img: '/assets/beardcolor.png' },
  // TREATMENT
  { id: 9,  cat: 'Treatment', name: 'Nose Wax',                 nameId: 'Wax Hidung',        dur: 15,  price: 95000,  img: '/assets/nosewax.png' },
  { id: 10, cat: 'Treatment', name: 'Ear Wax',                  nameId: 'Wax Telinga',       dur: 15,  price: 95000,  mutex_group: 'ear_treatment', img: '/assets/earwax.png' },
  { id: 11, cat: 'Treatment', name: 'Nose Blackhead Remover',   nameId: 'Komedo Hidung',     dur: 20,  price: 55000,  img: '/assets/noseblackheadremover.png' },
  { id: 12, cat: 'Treatment', name: 'Face Scrub',               nameId: 'Scrub Wajah',       dur: 20,  price: 85000,  img: '/assets/facescrub.png' },
  { id: 13, cat: 'Treatment', name: 'Black Mask',               nameId: 'Masker Hitam',      dur: 25,  price: 85000,  img: '/assets/blackmask.png' },
  { id: 14, cat: 'Treatment', name: 'Creambath',                nameId: 'Creambath',         dur: 30,  price: 95000,  img: '/assets/creambath.png' },
  { id: 15, cat: 'Treatment', name: 'Ear Candle',               nameId: 'Lilin Telinga',     dur: 20,  price: 75000,  mutex_group: 'ear_treatment', img: '/assets/earcandle.png' },
  // PACKAGE — treatmentImgs: photos of included treatments shown in the card mosaic
  {
    id: 16, cat: 'Package', name: 'Mask Cut Package', nameId: 'Paket Masker Potong',
    dur: 60, price: 205000, badge: 'Save 10%',
    desc: '✂ Haircut or Skin Fade  ·  🖤 Black Mask',
    treatmentImgs: ['/assets/haircut.png', '/assets/blackmask.png'],
  },
  {
    id: 17, cat: 'Package', name: 'Prestige Package', nameId: 'Paket Prestige',
    dur: 75, price: 215000, badge: 'Popular',
    desc: '✂ Haircut or Skin Fade  ·  🪒 Beard Trim or Shaving  ·  🚿 Wash',
    treatmentImgs: ['/assets/haircut.png', '/assets/beardtrimming.png'],
  },
  {
    id: 18, cat: 'Package', name: 'Luxury Package', nameId: 'Paket Luxury',
    dur: 120, price: 445000, badge: 'Best Value',
    desc: '✂ Haircut  ·  🖤 Black Mask  ·  👃 Nose Wax  ·  👂 Ear Wax or Candle  ·  💆 Creambath  ·  🚿 Wash',
    treatmentImgs: ['/assets/haircut.png', '/assets/blackmask.png', '/assets/nosewax.png', '/assets/earwax.png', '/assets/creambath.png'],
  },
  {
    id: 19, cat: 'Package', name: 'President Package', nameId: 'Paket President',
    dur: 150, price: 555000, badge: 'All-In',
    desc: '✂ Haircut  ·  🖤 Black Mask  ·  🪒 Beard Trim or Shaving  ·  👃 Nose Wax  ·  👂 Ear Wax or Candle  ·  💆 Creambath  ·  🚿 Wash',
    treatmentImgs: ['/assets/haircut.png', '/assets/blackmask.png', '/assets/beardtrimming.png', '/assets/nosewax.png', '/assets/earwax.png', '/assets/creambath.png'],
  },
  // HAIR COLOR — bleach uses step-selector modal
  { id: 20, cat: 'HairColor', name: 'Hair Coloring',  nameId: 'Pewarnaan Rambut',  dur: 60, price: 175000, ownColorPrice: 135000, desc: 'Basic Color Black/Brown', img: '/assets/haircoloring.png' },
  { id: 21, cat: 'HairColor', name: 'Hair Bleach',    nameId: 'Bleaching Rambut',  dur: 90, price: 260000, bleach: true, img: '/assets/Hairbleach.png' },
  { id: 22, cat: 'HairColor', name: 'Hair Highlight', nameId: 'Highlight Rambut',  dur: 90, price: 625000, img: '/assets/hairhighlight.png' },
];

export const CATEGORIES = [
  { key: 'Haircut',   labelEn: 'Haircut',       labelId: 'Potong Rambut', icon: '✂'  },
  { key: 'Beard',     labelEn: 'Beard',          labelId: 'Jenggot',       icon: '🪒' },
  { key: 'Treatment', labelEn: 'Treatment',      labelId: 'Perawatan',     icon: '✨' },
  { key: 'Package',   labelEn: 'Package',        labelId: 'Paket',         icon: '⭐' },
  { key: 'HairColor', labelEn: 'Hair Coloring',  labelId: 'Warna Rambut',  icon: '🎨' },
];
