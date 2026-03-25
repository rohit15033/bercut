export const SERVICES = [
  { id:1, cat:"Haircut", name:"Classic Cut", nameId:"Potong Klasik", dur:30, price:85000 },
  { id:2, cat:"Haircut", name:"Fade & Style", nameId:"Fade & Styling", dur:45, price:120000 },
  { id:3, cat:"Haircut", name:"Kids Cut", nameId:"Potong Anak", dur:25, price:65000 },
  { id:4, cat:"Beard", name:"Beard Trim", nameId:"Rapikan Jenggot", dur:20, price:60000 },
  { id:5, cat:"Beard", name:"Hot Towel Shave", nameId:"Cukur Mewah", dur:35, price:95000 },
  { id:6, cat:"Color", name:"Full Color", nameId:"Pewarnaan Penuh", dur:90, price:250000 },
  { id:7, cat:"Color", name:"Highlights", nameId:"Highlight Rambut", dur:75, price:200000 },
  { id:8, cat:"Package", name:"Cut + Beard", nameId:"Potong + Jenggot", dur:55, price:165000, badge:"Hemat 10%" },
  { id:9, cat:"Package", name:"Full Groom", nameId:"Perawatan Lengkap", dur:130, price:380000, badge:"Terbaik" },
];

export const BARBERS = [
  { id:1, name:"Kadek", spec:"Fades & Texture", specId:"Fade & Tekstur", slots:["09:00","09:30","10:30","11:00","14:00","15:30"], rating:4.9, cuts:1240 },
  { id:2, name:"Wayan", spec:"Classic & Beard", specId:"Klasik & Jenggot", slots:["09:30","10:00","11:30","13:00","14:30","16:00"], rating:4.8, cuts:980 },
  { id:3, name:"Made", spec:"Color Specialist", specId:"Spesialis Warna", slots:["10:00","10:30","12:00","13:30","15:00"], rating:4.9, cuts:760 },
  { id:4, name:"Nyoman", spec:"Hot Towel Shave", specId:"Cukur Mewah", slots:["09:00","10:30","12:30","14:00","15:00"], rating:4.7, cuts:890 },
];

export const TIPS = [10000, 20000, 50000];
export const CATS = ["Semua","Haircut","Beard","Color","Package"];
