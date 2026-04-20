// MOCKUP DATA — Bercut Admin Dashboard
// Shared constants, design tokens, and mock data across all admin screen components.

export const C = {
  bg:         '#FAFAF8',
  surface:    '#F2F0EB',
  surface2:   '#ECEAE4',
  accent:     '#F5E200',
  accentText: '#111110',
  text:       '#111110',
  text2:      '#3A3A38',
  muted:      '#88887E',
  border:     '#DDDBD4',
  topBg:      '#111110',
  topText:    '#F5E200',
  white:      '#FFFFFF',
  danger:     '#C0272D',
};

export const FONT = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');`;

export const BERCUT_LOGO = '/assets/bercut-logo-transparent.png';

export function fmt(n) {
  if (n == null) return '—';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}
export function fmtM(n) {
  if (n == null) return '—';
  if (n >= 1000000) return 'Rp ' + (n / 1000000).toFixed(1).replace('.0', '') + ' jt';
  if (n >= 1000)    return 'Rp ' + Math.round(n / 1000) + ' rb';
  return fmt(n);
}

// ── Branches ──────────────────────────────────────────────────────────────────

export const BRANCHES = [
  { id:1,  name:'Bercut Seminyak', city:'Seminyak', address:'Jl. Kayu Aya No.7, Seminyak',          timezone:'Asia/Makassar', geofenceRadius:100, tipMethod:'individual', payPeriod:'monthly', activeBarbers:5, totalBarbers:6, queueWaiting:7,  inProgress:2, completed:8,  noShow:1, revenue:1850000, alerts:[],                          onlineBookingEnabled:true,  onlineSlug:'seminyak',  isActive:true  },
  { id:2,  name:'Bercut Canggu',   city:'Canggu',   address:'Jl. Batu Bolong No.52, Canggu',         timezone:'Asia/Makassar', geofenceRadius:100, tipMethod:'individual', payPeriod:'monthly', activeBarbers:4, totalBarbers:5, queueWaiting:2,  inProgress:1, completed:6,  noShow:0, revenue:1120000, alerts:['late_start'],              onlineBookingEnabled:true,  onlineSlug:'canggu',    isActive:true  },
  { id:3,  name:'Bercut Ubud',     city:'Ubud',     address:'Jl. Raya Ubud No.18, Ubud',             timezone:'Asia/Makassar', geofenceRadius:100, tipMethod:'individual', payPeriod:'monthly', activeBarbers:3, totalBarbers:4, queueWaiting:0,  inProgress:0, completed:4,  noShow:0, revenue:650000,  alerts:['absence'],                 onlineBookingEnabled:false, onlineSlug:'ubud',      isActive:true  },
  { id:4,  name:'Bercut Uluwatu',  city:'Uluwatu',  address:'Jl. Labuan Sait No.5, Uluwatu',         timezone:'Asia/Makassar', geofenceRadius:100, tipMethod:'individual', payPeriod:'monthly', activeBarbers:4, totalBarbers:5, queueWaiting:4,  inProgress:3, completed:9,  noShow:2, revenue:1450000, alerts:['low_stock'],               onlineBookingEnabled:true,  onlineSlug:'uluwatu',   isActive:true  },
  { id:5,  name:'Bercut Sanur',    city:'Sanur',    address:'Jl. Danau Tamblingan No.100, Sanur',    timezone:'Asia/Makassar', geofenceRadius:100, tipMethod:'individual', payPeriod:'monthly', activeBarbers:3, totalBarbers:4, queueWaiting:1,  inProgress:1, completed:5,  noShow:0, revenue:780000,  alerts:[],                          onlineBookingEnabled:false, onlineSlug:'sanur',     isActive:true  },
  { id:6,  name:'Bercut Dewi Sri', city:'Kuta',     address:'Jl. Dewi Sri No.8, Kuta',               timezone:'Asia/Makassar', geofenceRadius:100, tipMethod:'individual', payPeriod:'monthly', activeBarbers:5, totalBarbers:6, queueWaiting:5,  inProgress:3, completed:11, noShow:1, revenue:2100000, alerts:['late_start','low_stock'],  onlineBookingEnabled:true,  onlineSlug:'dewi-sri',  isActive:true  },
  { id:7,  name:'Bercut Nusa Dua', city:'Nusa Dua', address:'Jl. Nusa Dua No.12, Nusa Dua',         timezone:'Asia/Makassar', geofenceRadius:100, tipMethod:'individual', payPeriod:'monthly', activeBarbers:5, totalBarbers:6, queueWaiting:3,  inProgress:2, completed:7,  noShow:0, revenue:1680000, alerts:[],                          onlineBookingEnabled:true,  onlineSlug:'nusa-dua',  isActive:true  },
  { id:8,  name:'Bercut Legian',   city:'Legian',   address:'Jl. Legian No.99, Legian',              timezone:'Asia/Makassar', geofenceRadius:100, tipMethod:'individual', payPeriod:'monthly', activeBarbers:4, totalBarbers:5, queueWaiting:6,  inProgress:2, completed:9,  noShow:1, revenue:1320000, alerts:['absence'],                 onlineBookingEnabled:true,  onlineSlug:'legian',    isActive:true  },
  { id:9,  name:'Bercut Jimbaran', city:'Jimbaran', address:'Jl. Bukit Permai No.3, Jimbaran',       timezone:'Asia/Makassar', geofenceRadius:100, tipMethod:'individual', payPeriod:'monthly', activeBarbers:3, totalBarbers:4, queueWaiting:1,  inProgress:1, completed:5,  noShow:0, revenue:890000,  alerts:[],                          onlineBookingEnabled:false, onlineSlug:'jimbaran',  isActive:true  },
  { id:10, name:'Bercut Denpasar', city:'Denpasar', address:'Jl. Teuku Umar No.200, Denpasar',       timezone:'Asia/Makassar', geofenceRadius:100, tipMethod:'individual', payPeriod:'monthly', activeBarbers:6, totalBarbers:7, queueWaiting:8,  inProgress:4, completed:14, noShow:2, revenue:2450000, alerts:['late_start','low_stock'],  onlineBookingEnabled:true,  onlineSlug:'denpasar',  isActive:true  },
];

// ── Chairs (per branch) ───────────────────────────────────────────────────────

export const CHAIRS = [
  // Seminyak (branchId 1) — 6 chairs
  { id:1,  branchId:1, label:'A1', assignedBarber:'Guntur Wibowo',  assignedBarberId:1 },
  { id:2,  branchId:1, label:'A2', assignedBarber:'Pangestu Adi',   assignedBarberId:2 },
  { id:3,  branchId:1, label:'B1', assignedBarber:'Rifky Ramadhan', assignedBarberId:3 },
  { id:4,  branchId:1, label:'B2', assignedBarber:'Sep Agustian',   assignedBarberId:4 },
  { id:5,  branchId:1, label:'C1', assignedBarber:'Agung Pratama',  assignedBarberId:5 },
  { id:6,  branchId:1, label:'C2', assignedBarber:'Rahmat Suharto', assignedBarberId:6 },
  // Canggu (branchId 2) — 5 chairs
  { id:7,  branchId:2, label:'A1', assignedBarber:'Dion Prasetyo',  assignedBarberId:7  },
  { id:8,  branchId:2, label:'A2', assignedBarber:'Bayu Santoso',   assignedBarberId:8  },
  { id:9,  branchId:2, label:'B1', assignedBarber:'Yogi Permana',   assignedBarberId:9  },
  { id:10, branchId:2, label:'B2', assignedBarber:null,             assignedBarberId:null },
  { id:11, branchId:2, label:'C1', assignedBarber:null,             assignedBarberId:null },
  // Ubud (branchId 3) — 4 chairs
  { id:12, branchId:3, label:'A1', assignedBarber:'Kadek Swastika', assignedBarberId:10 },
  { id:13, branchId:3, label:'A2', assignedBarber:'Wayan Aditya',   assignedBarberId:11 },
  { id:14, branchId:3, label:'B1', assignedBarber:null,             assignedBarberId:null },
  { id:15, branchId:3, label:'B2', assignedBarber:null,             assignedBarberId:null },
];

// ── Barbers (scoped to Seminyak for drill-down demo) ─────────────────────────

export const BARBERS = [
  { id:1, branchId:1, name:'Guntur Wibowo',  initials:'GW', specialty:'Skin Fade & Color',  commission:35, baseSalary:2500000, payType:'salary_plus_commission', status:'available',   chair:'A1', todayCuts:8,  todayRevenue:950000  },
  { id:2, branchId:1, name:'Pangestu Adi',   initials:'PA', specialty:'Classic Cuts',       commission:35, baseSalary:2500000, payType:'salary_plus_commission', status:'busy',        chair:'A2', todayCuts:6,  todayRevenue:780000  },
  { id:3, branchId:1, name:'Rifky Ramadhan', initials:'RR', specialty:'Fade Specialist',    commission:40, baseSalary:3000000, payType:'salary_plus_commission', status:'busy',        chair:'B1', todayCuts:9,  todayRevenue:1140000 },
  { id:4, branchId:1, name:'Sep Agustian',   initials:'SA', specialty:'Beard & Styling',   commission:35, baseSalary:2000000, payType:'salary_plus_commission', status:'on_break',    chair:'B2', todayCuts:4,  todayRevenue:520000  },
  { id:5, branchId:1, name:'Agung Pratama',  initials:'AP', specialty:'Color & Treatment', commission:35, baseSalary:2500000, payType:'salary_plus_commission', status:'available',   chair:'C1', todayCuts:7,  todayRevenue:870000  },
  { id:6, branchId:1, name:'Rahmat Suharto', initials:'RS', specialty:'Classic Cuts',      commission:30, baseSalary:2000000, payType:'salary_plus_commission', status:'clocked_out', chair:'C2', todayCuts:0,  todayRevenue:0       },
];

// ── Today's bookings (Seminyak) ───────────────────────────────────────────────

export const BOOKINGS = [
  { id:'b01', number:'B099', barberId:1, barber:'Guntur',   name:'Budi Santoso',   services:'Just a Haircut',            total:130000, slot:'09:30', status:'completed',    payment:'paid'   },
  { id:'b02', number:'B100', barberId:2, barber:'Pangestu', name:'James Holden',   services:'Skin Fade + Beard Trim',    total:205000, slot:'09:45', status:'completed',    payment:'paid'   },
  { id:'b03', number:'B101', barberId:3, barber:'Rifky',    name:'Wayan Sudirta',  services:'Prestige Package',          total:215000, slot:'10:00', status:'in_progress',  payment:'unpaid' },
  { id:'b04', number:'B102', barberId:1, barber:'Guntur',   name:'Rizal Ahmad',    services:'Skin Fade',                 total:130000, slot:'10:30', status:'confirmed',    payment:'unpaid' },
  { id:'b05', number:'B103', barberId:5, barber:'Agung',    name:'David Lim',      services:'President Package',         total:555000, slot:'10:30', status:'in_progress',  payment:'unpaid' },
  { id:'b06', number:'B104', barberId:4, barber:'Sep',      name:'Tomas Varga',    services:'Hair Coloring',             total:175000, slot:'11:00', status:'confirmed',    payment:'unpaid' },
  { id:'b07', number:'B105', barberId:2, barber:'Pangestu', name:'Michael Tan',    services:'Haircut + Beard Shaving',   total:225000, slot:'11:30', status:'confirmed',    payment:'unpaid' },
  { id:'b08', number:'B106', barberId:3, barber:'Rifky',    name:'Ketut Wirawan',  services:'Luxury Package',            total:445000, slot:'11:30', status:'confirmed',    payment:'unpaid' },
  { id:'b09', number:'B107', barberId:5, barber:'Agung',    name:'Alex Johnson',   services:'Beard Trim + Face Scrub',   total:160000, slot:'12:00', status:'confirmed',    payment:'unpaid' },
  { id:'b10', number:'B108', barberId:1, barber:'Guntur',   name:'Made Subrata',   services:'Hair Tattoo',               total:150000, slot:'13:00', status:'confirmed',    payment:'unpaid' },
  { id:'b11', number:'B109', barberId:2, barber:'Pangestu', name:'Chris Walker',   services:'Skin Fade + Nose Wax',      total:225000, slot:'13:30', status:'no_show',      payment:'unpaid' },
  { id:'b12', number:'B110', barberId:1, barber:'Guntur',   name:'Nguyen Van An',  services:'Just a Haircut',            total:130000, slot:'14:00', status:'confirmed',    payment:'unpaid' },
];

// ── Reports data ──────────────────────────────────────────────────────────────

export const WEEKLY_CHART = [
  { label:'Mon', revenue:2850000, bookings:18 },
  { label:'Tue', revenue:3120000, bookings:21 },
  { label:'Wed', revenue:2650000, bookings:17 },
  { label:'Thu', revenue:3450000, bookings:24 },
  { label:'Fri', revenue:4100000, bookings:28 },
  { label:'Sat', revenue:5200000, bookings:35 },
  { label:'Sun', revenue:4800000, bookings:32 },
];

export const REPORT_ROWS = [
  { date:'1 Apr', time:'09:15', client:'Budi Santoso',    branch:'Seminyak', barber:'Guntur',   service:'Just a Haircut',    method:'qris', amount:130000, tip:20000  },
  { date:'1 Apr', time:'09:40', client:'James W.',        branch:'Seminyak', barber:'Pangestu', service:'Skin Fade',          method:'card', amount:130000, tip:0      },
  { date:'1 Apr', time:'10:05', client:'Rafi',            branch:'Canggu',   barber:'Dion',     service:'Prestige Package',   method:'qris', amount:215000, tip:50000  },
  { date:'1 Apr', time:'10:30', client:'Made Arya',       branch:'Uluwatu',  barber:'Yogi',     service:'Luxury Package',     method:'card', amount:445000, tip:0      },
  { date:'1 Apr', time:'11:00', client:'Faisal H.',       branch:'Dewi Sri', barber:'Hendra',   service:'President Package',  method:'qris', amount:555000, tip:100000 },
  { date:'1 Apr', time:'11:20', client:'Alex T.',         branch:'Seminyak', barber:'Rifky',    service:'Hair Coloring',      method:'card', amount:175000, tip:0      },
  { date:'1 Apr', time:'11:45', client:'Wayan Gede',      branch:'Sanur',    barber:'Reza',     service:'Beard + Nose Wax',   method:'qris', amount:185000, tip:10000  },
  { date:'31 Mar',time:'09:10', client:'Teguh P.',        branch:'Seminyak', barber:'Agung',    service:'Luxury Package',     method:'qris', amount:445000, tip:50000  },
  { date:'31 Mar',time:'10:00', client:'Sam',             branch:'Canggu',   barber:'Bayu',     service:'Just a Haircut',     method:'card', amount:130000, tip:20000  },
  { date:'31 Mar',time:'10:25', client:'Nyoman Adi',      branch:'Ubud',     barber:'Kadek',    service:'Prestige Package',   method:'qris', amount:215000, tip:0      },
  { date:'1 Apr', time:'13:10', client:'Ryan',            branch:'Uluwatu',  barber:'Yogi',     service:'President Package',  method:'qris', amount:555000, tip:80000  },
  { date:'1 Apr', time:'13:35', client:'Denny K.',        branch:'Canggu',   barber:'Bayu',     service:'Skin Fade',          method:'card', amount:130000, tip:0      },
  { date:'1 Apr', time:'14:00', client:'Putu Eka',        branch:'Sanur',    barber:'Reza',     service:'Just a Haircut',     method:'qris', amount:130000, tip:15000  },
  { date:'1 Apr', time:'14:20', client:'Haris',           branch:'Dewi Sri', barber:'Wahyu',    service:'Luxury Package',     method:'card', amount:445000, tip:0      },
  { date:'1 Apr', time:'14:50', client:'Kadek Surya',     branch:'Ubud',     barber:'Kadek',    service:'Beard Trim',         method:'qris', amount:85000,  tip:0      },
  { date:'1 Apr', time:'15:15', client:'Marco V.',        branch:'Seminyak', barber:'Sep',      service:'Prestige Package',   method:'card', amount:215000, tip:30000  },
  { date:'31 Mar',time:'13:00', client:'Andi',            branch:'Uluwatu',  barber:'Eka',      service:'Skin Fade + Beard',  method:'qris', amount:205000, tip:25000  },
  { date:'31 Mar',time:'14:05', client:'Luca B.',         branch:'Dewi Sri', barber:'Hendra',   service:'Hair Coloring',      method:'card', amount:175000, tip:0      },
  { date:'31 Mar',time:'15:30', client:'Dimas R.',        branch:'Seminyak', barber:'Rifky',    service:'Luxury Package',     method:'qris', amount:445000, tip:100000 },
  { date:'31 Mar',time:'16:00', client:'Wira',            branch:'Canggu',   barber:'Dion',     service:'Skin Fade',          method:'card', amount:130000, tip:20000  },
  { date:'30 Mar',time:'10:10', client:'Bagas',           branch:'Sanur',    barber:'Reza',     service:'Prestige Package',   method:'qris', amount:215000, tip:0      },
  { date:'30 Mar',time:'11:30', client:'Tom H.',          branch:'Seminyak', barber:'Guntur',   service:'President Package',  method:'card', amount:555000, tip:50000  },
  { date:'30 Mar',time:'13:45', client:'Yoga P.',         branch:'Uluwatu',  barber:'Yogi',     service:'Just a Haircut',     method:'qris', amount:130000, tip:10000  },
  { date:'29 Mar',time:'09:50', client:'Irfan',           branch:'Dewi Sri', barber:'Wahyu',    service:'Prestige Package',   method:'card', amount:215000, tip:0      },
  { date:'29 Mar',time:'16:20', client:'Ketut Agus',      branch:'Ubud',     barber:'Kadek',    service:'Beard Trim + Wax',   method:'qris', amount:160000, tip:20000  },
];

export const BARBER_PERF = [
  { name:'Rifky Ramadhan',  branch:'Seminyak', cuts:9,  revenue:1140000, commRate:40, commEarned:456000  },
  { name:'Guntur Wibowo',   branch:'Seminyak', cuts:8,  revenue:950000,  commRate:35, commEarned:332500  },
  { name:'Agung Pratama',   branch:'Seminyak', cuts:7,  revenue:870000,  commRate:35, commEarned:304500  },
  { name:'Pangestu Adi',    branch:'Seminyak', cuts:6,  revenue:780000,  commRate:35, commEarned:273000  },
  { name:'Dion Prasetyo',   branch:'Canggu',   cuts:7,  revenue:890000,  commRate:35, commEarned:311500  },
  { name:'Bayu Santoso',    branch:'Canggu',   cuts:5,  revenue:780000,  commRate:40, commEarned:312000  },
  { name:'Yogi Permana',    branch:'Uluwatu',  cuts:8,  revenue:1020000, commRate:35, commEarned:357000  },
  { name:'Eka Wijaya',      branch:'Uluwatu',  cuts:7,  revenue:910000,  commRate:40, commEarned:364000  },
  { name:'Hendra Kusuma',   branch:'Dewi Sri', cuts:10, revenue:1350000, commRate:40, commEarned:540000  },
  { name:'Wahyu Setiawan',  branch:'Dewi Sri', cuts:9,  revenue:1180000, commRate:35, commEarned:413000  },
  { name:'Kadek Suarma',    branch:'Ubud',     cuts:5,  revenue:680000,  commRate:35, commEarned:238000  },
  { name:'Reza Putra',      branch:'Sanur',    cuts:6,  revenue:790000,  commRate:35, commEarned:276500  },
  { name:'Aditya Nugroho',  branch:'Nusa Dua', cuts:7,  revenue:950000,  commRate:35, commEarned:332500  },
  { name:'Bima Aryanto',    branch:'Canggu',   cuts:6,  revenue:840000,  commRate:35, commEarned:294000  },
];

// ── Expenses ──────────────────────────────────────────────────────────────────

export const EXPENSES = [
  { id:1,  type:'inventory', date:'2026-04-01', branch:'Seminyak',    category:'inventory', source:'petty_cash', desc:'Blade pack restock',                amount:150000,  barberId:null, barber:null, by:'Admin', receipt:'receipt_001.jpg', hasStock:true,  stock:{ itemId:8,  itemName:'Disposable Blades (100pcs)', unit:'box',  unitCostApprox:75000, totalQty:2,  distributions:[{ branch:'Seminyak',    qty:2,  cost:150000 }] } },
  { id:2,  type:'regular',   date:'2026-03-31', branch:'Canggu',      category:'utilities', source:'owner',      desc:'Monthly electricity bill',           amount:850000,  barberId:null, barber:null, by:'Owner', receipt:'receipt_002.pdf', hasStock:false, stock:null },
  { id:3,  type:'regular',   date:'2026-03-31', branch:'Seminyak',    category:'petty_cash',source:'petty_cash', desc:'Snacks for barbers',                 amount:75000,   barberId:null, barber:null, by:'Admin', receipt:'receipt_003.jpg', hasStock:false, stock:null },
  { id:4,  type:'regular',   date:'2026-03-30', branch:'Uluwatu',     category:'equipment', source:'owner',      desc:'Wahl clipper replacement',           amount:350000,  barberId:null, barber:null, by:'Admin', receipt:'receipt_004.jpg', hasStock:false, stock:null },
  { id:5,  type:'inventory', date:'2026-03-29', branch:'Dewi Sri',    category:'inventory', source:'petty_cash', desc:'Wax strips restock',                 amount:200000,  barberId:null, barber:null, by:'Admin', receipt:'receipt_005.jpg', hasStock:true,  stock:{ itemId:9,  itemName:'Wax Strips (50pcs)',          unit:'box',  unitCostApprox:20000, totalQty:10, distributions:[{ branch:'Dewi Sri',    qty:10, cost:200000 }] } },
  { id:6,  type:'regular',   date:'2026-03-28', branch:'Canggu',      category:'other',     source:'petty_cash', desc:'Monthly parking permit',             amount:50000,   barberId:null, barber:null, by:'Owner', receipt:'receipt_006.jpg', hasStock:false, stock:null },
  { id:7,  type:'regular',   date:'2026-03-27', branch:'Sanur',       category:'supplies',  source:'petty_cash', desc:'Shampoo + conditioner restock',      amount:180000,  barberId:null, barber:null, by:'Admin', receipt:'receipt_007.jpg', hasStock:false, stock:null },
  { id:8,  type:'regular',   date:'2026-03-26', branch:'Seminyak',    category:'equipment', source:'owner',      desc:'Swivel mirror replacement',          amount:420000,  barberId:null, barber:null, by:'Owner', receipt:'receipt_008.jpg', hasStock:false, stock:null },
  { id:9,  type:'inventory', date:'2026-04-14', branch:'Multiple',    category:'inventory', source:'owner',      desc:'Pomade stock (all branches)',        amount:750000,  barberId:null, barber:null, by:'Owner', receipt:'receipt_009.jpg', hasStock:true,  stock:{ itemId:4,  itemName:'Pomade (Medium Hold)',        unit:'pcs',  unitCostApprox:25000, totalQty:30, distributions:[{ branch:'Seminyak',    qty:10, cost:250000 }, { branch:'Canggu',      qty:8,  cost:200000 }, { branch:'Head Office', qty:12, cost:300000 }] } },
  { id:10, type:'regular',   date:'2026-04-12', branch:'Head Office', category:'equipment', source:'owner',      desc:'Barber chair upholstery repair x2',  amount:1200000, barberId:null, barber:null, by:'Owner', receipt:'receipt_010.pdf', hasStock:false, stock:null },
  { id:11, type:'kasbon',    date:'2026-04-15', branch:'Seminyak',    category:'kasbon',    source:'petty_cash', desc:'Personal emergency',                 amount:500000,  barberId:1,    barber:'Guntur Wibowo',  by:'Owner', receipt:'receipt_011.jpg', hasStock:false, stock:null },
  { id:12, type:'kasbon',    date:'2026-03-20', branch:'Seminyak',    category:'kasbon',    source:'petty_cash', desc:'',                                   amount:250000,  barberId:6,    barber:'Rahmat Suharto', by:'Owner', receipt:'receipt_012.jpg', hasStock:false, stock:null },
  // Smart rounding demo: 200,000 ÷ 75 rolls = 2,666.67/roll — LRM distributes Rp 1 remainder to Seminyak
  { id:13, type:'inventory', date:'2026-04-10', branch:'Multiple',    category:'inventory', source:'petty_cash', desc:'Neck paper restock (all branches)',  amount:200000,  barberId:null, barber:null, by:'Admin', receipt:'receipt_013.jpg', hasStock:true,  stock:{ itemId:10, itemName:'Neck Paper (roll)', unit:'roll', unitCostApprox:2667, totalQty:75, distributions:[{ branch:'Seminyak', qty:25, cost:66667 }, { branch:'Canggu', qty:20, cost:53333 }, { branch:'Ubud', qty:15, cost:40000 }, { branch:'Uluwatu', qty:15, cost:40000 }] } },

  // ── Purchase Order examples ────────────────────────────────────────────────
  // PO-001: OPEN — Pomade Q2 order. Advance paid Feb 10. Final payment + distribution pending.
  { id:14, type:'inventory', date:'2026-02-10', branch:null, category:'inventory', source:'owner',
    desc:'Pomade restock (Q2 order)', amount:3000000, barberId:null, barber:null, by:'Owner',
    receipt:'receipt_014.pdf', hasStock:false, stock:null,
    poId:'PO-001', poPaymentType:'advance', poAttribution:null },

  // PO-002: CLOSED — Hair Serum Q2 order. Advance Mar 1 + final Mar 20. 18 pcs / 4 destinations.
  // Attribution computed via LRM on each payment's share of 2,700,000 total.
  { id:15, type:'inventory', date:'2026-03-01', branch:'Multiple', category:'inventory', source:'owner',
    desc:'Hair serum restock (Q2 order)', amount:1500000, barberId:null, barber:null, by:'Owner',
    receipt:'receipt_015.pdf', hasStock:false, stock:null,
    poId:'PO-002', poPaymentType:'advance',
    poAttribution:[
      { branch:'Seminyak',    amount:666667 },
      { branch:'Canggu',      amount:416667 },
      { branch:'Ubud',        amount:250000 },
      { branch:'Head Office', amount:166666 },
    ]},
  { id:16, type:'inventory', date:'2026-03-20', branch:'Multiple', category:'inventory', source:'owner',
    desc:'Hair serum restock (Q2 order)', amount:1200000, barberId:null, barber:null, by:'Owner',
    receipt:'receipt_016.pdf', hasStock:true,
    poId:'PO-002', poPaymentType:'final',
    poAttribution:[
      { branch:'Seminyak',    amount:533334 },
      { branch:'Canggu',      amount:333333 },
      { branch:'Ubud',        amount:200000 },
      { branch:'Head Office', amount:133333 },
    ],
    stock:{ itemId:5, itemName:'Hair Serum', unit:'pcs', unitCostApprox:150000, totalQty:18,
      distributions:[
        { branch:'Seminyak',    qty:8, cost:1200000 },
        { branch:'Canggu',      qty:5, cost:750000  },
        { branch:'Ubud',        qty:3, cost:450000  },
        { branch:'Head Office', qty:2, cost:300000  },
      ]}},
];

// ── Purchase Orders ───────────────────────────────────────────────────────────
// status 'open'   → advance paid, awaiting final payment + distribution
// status 'closed' → fully paid, stock received, branch attribution applied to all linked expense entries
export const PURCHASE_ORDERS = [
  { id:'PO-001', status:'open',   itemId:4, itemName:'Pomade (Medium Hold)', unit:'pcs',
    totalOrderAmount:6000000, paidAmount:3000000,
    createdDate:'2026-02-10', closedDate:null, distributions:null,
    paymentExpenseIds:[14] },
  { id:'PO-002', status:'closed', itemId:5, itemName:'Hair Serum',           unit:'pcs',
    totalOrderAmount:2700000, paidAmount:2700000,
    createdDate:'2026-03-01', closedDate:'2026-03-20',
    distributions:[
      { branch:'Seminyak',    qty:8, cost:1200000 },
      { branch:'Canggu',      qty:5, cost:750000  },
      { branch:'Ubud',        qty:3, cost:450000  },
      { branch:'Head Office', qty:2, cost:300000  },
    ],
    paymentExpenseIds:[15,16] },
];

// ── Inventory ─────────────────────────────────────────────────────────────────

export const INVENTORY = [
  { id:1,  name:'Mineral Water (600ml)',       cat:'beverage',          unit:'pcs',  s:48, ca:30, u:12, ul:25, sa:18, d:60, ho:200, threshold:20, isActive:true },
  { id:2,  name:'Iced Coffee (can)',           cat:'beverage',          unit:'pcs',  s:24, ca:18, u:8,  ul:12, sa:6,  d:30, ho:120, threshold:10, isActive:true },
  { id:3,  name:'Teh Kotak',                  cat:'beverage',          unit:'pcs',  s:36, ca:24, u:15, ul:20, sa:12, d:40, ho:150, threshold:15, isActive:true },
  { id:4,  name:'Pomade (Medium Hold)',        cat:'product',           unit:'pcs',  s:8,  ca:5,  u:3,  ul:6,  sa:4,  d:10, ho:25,  threshold:5,  isActive:true },
  { id:5,  name:'Hair Serum',                 cat:'product',           unit:'pcs',  s:12, ca:8,  u:4,  ul:7,  sa:5,  d:15, ho:18,  threshold:5,  isActive:true },
  { id:6,  name:'Beard Oil',                  cat:'product',           unit:'pcs',  s:6,  ca:4,  u:2,  ul:5,  sa:3,  d:8,  ho:12,  threshold:4,  isActive:true },
  { id:7,  name:'Foil Sheets (box)',          cat:'service_consumable',unit:'box',  s:5,  ca:3,  u:2,  ul:4,  sa:2,  d:6,  ho:15,  threshold:2,  isActive:true },
  { id:8,  name:'Disposable Blades (100pcs)', cat:'service_consumable',unit:'box',  s:8,  ca:6,  u:3,  ul:5,  sa:4,  d:10, ho:30,  threshold:3,  isActive:true },
  { id:9,  name:'Wax Strips (50pcs)',         cat:'service_consumable',unit:'box',  s:4,  ca:2,  u:1,  ul:3,  sa:2,  d:5,  ho:20,  threshold:2,  isActive:true },
  { id:10, name:'Neck Paper (roll)',           cat:'service_consumable',unit:'roll', s:12, ca:8,  u:5,  ul:9,  sa:6,  d:15, ho:40,  threshold:5,  isActive:true },
];

export const INV_BRANCH_COLS = [
  { key:'s',  label:'Seminyak'    },
  { key:'ca', label:'Canggu'      },
  { key:'u',  label:'Ubud'        },
  { key:'ul', label:'Uluwatu'     },
  { key:'sa', label:'Sanur'       },
  { key:'d',  label:'Dewi Sri'    },
  { key:'ho', label:'Head Office', isHO:true },
];

// ── Payroll ───────────────────────────────────────────────────────────────────

export const PAYROLL = {
  branch: 'Bercut Seminyak',
  period: 'April 2026',
  status: 'draft',
  entries: [
    { id:1, barber:'Guntur Wibowo',  initials:'GW', payType:'salary_plus_commission', baseSalary:2500000, commRate:35, grossRevenue:5800000, commEarned:2030000, tips:450000, days:24, additions:200000, kasbon:500000, deductions:0,      netPay:4680000,
      adjustments:[
        { id:'a1', direction:'addition',  category:'Uang Rajin', keterangan:'Full Month Attendance', amount:200000, by:'Owner', date:'28 Mar' },
        { id:'a2', direction:'deduction', category:'Kasbon',     keterangan:'Salary Advance',        amount:500000, by:'Owner', date:'15 Mar', isKasbon:true, deductNext:'May 2026' },
      ],
    },
    { id:2, barber:'Pangestu Adi',   initials:'PA', payType:'salary_plus_commission', baseSalary:2500000, commRate:35, grossRevenue:4900000, commEarned:1715000, tips:320000, days:22, additions:300000, kasbon:0,      deductions:0,      netPay:4835000,
      adjustments:[
        { id:'a3', direction:'addition', category:'Bonus', keterangan:'Top Barber of the Month', amount:300000, by:'Owner', date:'28 Mar' },
      ],
    },
    { id:3, barber:'Rifky Ramadhan', initials:'RR', payType:'salary_plus_commission', baseSalary:3000000, commRate:40, grossRevenue:6200000, commEarned:2480000, tips:510000, days:25, additions:200000, kasbon:0,      deductions:0,      netPay:6190000,
      adjustments:[
        { id:'a4', direction:'addition', category:'Uang Rajin', keterangan:'Zero Late Arrivals', amount:200000, by:'Owner', date:'28 Mar' },
      ],
    },
    { id:4, barber:'Sep Agustian',   initials:'SA', payType:'salary_plus_commission', baseSalary:2000000, commRate:35, grossRevenue:3400000, commEarned:1190000, tips:180000, days:20, additions:0,      kasbon:0,      deductions:150000, netPay:3220000,
      adjustments:[
        { id:'a5', direction:'deduction', category:'Late Arrival', keterangan:'3× late this month — 15 mins avg', amount:150000, by:'Owner', date:'28 Mar' },
      ],
    },
    { id:5, barber:'Agung Pratama',  initials:'AP', payType:'salary_plus_commission', baseSalary:2500000, commRate:35, grossRevenue:5100000, commEarned:1785000, tips:390000, days:23, additions:0,      kasbon:0,      deductions:0,      netPay:4675000,
      adjustments:[],
    },
    { id:6, barber:'Rahmat Suharto', initials:'RS', payType:'salary_plus_commission', baseSalary:2000000, commRate:30, grossRevenue:2800000, commEarned:840000,  tips:120000, days:18, additions:0,      kasbon:250000, deductions:0,      netPay:2710000,
      adjustments:[
        { id:'a6', direction:'deduction', category:'Kasbon', keterangan:'Salary Advance', amount:250000, by:'Owner', date:'20 Mar', isKasbon:true, deductNext:'May 2026' },
      ],
    },
  ],
};

// Adjustment category lists — admin-configurable in production
export const ADJ_ADDITION_CATS = [
  { key: 'uang_rajin', label: 'Uang Rajin'  },
  { key: 'bonus',      label: 'Bonus'        },
];

export const ADJ_DEDUCTION_CATS = [
  { key: 'kasbon',           label: 'Kasbon',                  isKasbon: true },
  { key: 'late_arrival',     label: 'Late Arrival'                            },
  { key: 'equipment_damage', label: 'Equipment Damage'                        },
  { key: 'uniform',          label: 'Uniform Deduction'                       },
  { key: 'absence',          label: 'Absence Without Notice'                  },
];

// ── Status metadata ───────────────────────────────────────────────────────────

export const STATUS_META = {
  confirmed:       { label:'Waiting',     color:'#2563EB', bg:'#EFF6FF', border:'#BFDBFE' },
  in_progress:     { label:'In Progress', color:'#16A34A', bg:'#F0FDF4', border:'#BBF7D0' },
  pending_payment: { label:'Paying',      color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
  completed:       { label:'Done',        color:'#059669', bg:'#ECFDF5', border:'#A7F3D0' },
  no_show:         { label:'No-show',     color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
  cancelled:       { label:'Cancelled',   color:'#6B7280', bg:'#F9FAFB', border:'#E5E7EB' },
};

// Expense categories — admin-configurable (stored in expense_categories table in production)
export const EXPENSE_CATEGORIES = [
  { id:1, key:'petty_cash', label:'Petty Cash', color:'#7C3AED', bg:'#EDE9FE', isActive:true  },
  { id:2, key:'supplies',   label:'Supplies',   color:'#2563EB', bg:'#EFF6FF', isActive:true  },
  { id:3, key:'utilities',  label:'Utilities',  color:'#D97706', bg:'#FFFBEB', isActive:true  },
  { id:4, key:'equipment',  label:'Equipment',  color:'#DC2626', bg:'#FEF2F2', isActive:true  },
  { id:5, key:'other',      label:'Other',      color:'#6B7280', bg:'#F9FAFB', isActive:true  },
];

// Derived object for backward-compat with existing screens that import CAT_META
export const CAT_META = Object.fromEntries(
  EXPENSE_CATEGORIES.map(c => [c.key, { label: c.label, color: c.color, bg: c.bg }])
);

// Inventory item types — fixed set (beverage, product, service_consumable); items within each type are admin-configurable
export const INV_ITEM_TYPES = [
  { key:'beverage',           label:'Beverage',    color:'#2563EB', bg:'#EFF6FF' },
  { key:'product',            label:'Product',     color:'#9333EA', bg:'#F3E8FF' },
  { key:'service_consumable', label:'Consumable',  color:'#D97706', bg:'#FFFBEB' },
];

export const BARBER_STATUS_META = {
  available:   { dot:'#16A34A', label:'Available'   },
  busy:        { dot:'#D97706', label:'In Service'  },
  on_break:    { dot:'#F5E200', label:'On Break'    },
  clocked_out: { dot:'#DDDBD4', label:'Not In'      },
};

// ── All-branch barbers (Barber Management screen) ─────────────────────────────

export const ALL_BARBERS = [
  { id:1,  branchId:1, branch:'Seminyak', name:'Guntur Wibowo',   initials:'GW', specialty:'Skin Fade & Color',  phone:'+6281234560001', commission:35, baseSalary:2500000, payType:'salary_plus_commission', status:'available',   isActive:true,  monthCuts:142, monthRevenue:16800000 },
  { id:2,  branchId:1, branch:'Seminyak', name:'Pangestu Adi',    initials:'PA', specialty:'Classic Cuts',        phone:'+6281234560002', commission:35, baseSalary:2500000, payType:'salary_plus_commission', status:'busy',        isActive:true,  monthCuts:118, monthRevenue:14200000 },
  { id:3,  branchId:1, branch:'Seminyak', name:'Rifky Ramadhan',  initials:'RR', specialty:'Fade Specialist',     phone:'+6281234560003', commission:40, baseSalary:3000000, payType:'salary_plus_commission', status:'busy',        isActive:true,  monthCuts:161, monthRevenue:19400000 },
  { id:4,  branchId:1, branch:'Seminyak', name:'Sep Agustian',    initials:'SA', specialty:'Beard & Styling',     phone:'+6281234560004', commission:35, baseSalary:2000000, payType:'salary_plus_commission', status:'on_break',    isActive:true,  monthCuts:95,  monthRevenue:10200000 },
  { id:5,  branchId:1, branch:'Seminyak', name:'Agung Pratama',   initials:'AP', specialty:'Color & Treatment',   phone:'+6281234560005', commission:35, baseSalary:2500000, payType:'salary_plus_commission', status:'available',   isActive:true,  monthCuts:128, monthRevenue:15600000 },
  { id:6,  branchId:1, branch:'Seminyak', name:'Rahmat Suharto',  initials:'RS', specialty:'Classic Cuts',        phone:'+6281234560006', commission:30, baseSalary:2000000, payType:'salary_plus_commission', status:'clocked_out', isActive:true,  monthCuts:88,  monthRevenue:9800000  },
  { id:7,  branchId:2, branch:'Canggu',   name:'Dion Prasetyo',   initials:'DP', specialty:'Skin Fade',           phone:'+6281234560007', commission:35, baseSalary:2500000, payType:'salary_plus_commission', status:'available',   isActive:true,  monthCuts:134, monthRevenue:15400000 },
  { id:8,  branchId:2, branch:'Canggu',   name:'Bayu Santoso',    initials:'BS', specialty:'Classic & Beard',     phone:'+6281234560008', commission:40, baseSalary:3000000, payType:'salary_plus_commission', status:'available',   isActive:true,  monthCuts:149, monthRevenue:17600000 },
  { id:9,  branchId:2, branch:'Canggu',   name:'Yogi Permana',    initials:'YP', specialty:'Hair Color',          phone:'+6281234560009', commission:35, baseSalary:2000000, payType:'salary_plus_commission', status:'busy',        isActive:true,  monthCuts:102, monthRevenue:13200000 },
  { id:10, branchId:3, branch:'Ubud',     name:'Kadek Swastika',  initials:'KS', specialty:'Classic Cuts',        phone:'+6281234560010', commission:30, baseSalary:2000000, payType:'salary_plus_commission', status:'available',   isActive:true,  monthCuts:87,  monthRevenue:9600000  },
  { id:11, branchId:3, branch:'Ubud',     name:'Wayan Aditya',    initials:'WA', specialty:'Fade & Treatment',    phone:'+6281234560011', commission:35, baseSalary:2500000, payType:'salary_plus_commission', status:'available',   isActive:true,  monthCuts:96,  monthRevenue:11200000 },
  { id:12, branchId:4, branch:'Uluwatu',  name:'Yogi Firmansyah', initials:'YF', specialty:'Skin Fade',           phone:'+6281234560012', commission:40, baseSalary:3000000, payType:'salary_plus_commission', status:'busy',        isActive:true,  monthCuts:155, monthRevenue:18800000 },
  { id:13, branchId:5, branch:'Sanur',    name:'Reza Kurniawan',  initials:'RK', specialty:'Beard & Styling',     phone:'+6281234560013', commission:35, baseSalary:2500000, payType:'salary_plus_commission', status:'available',   isActive:true,  monthCuts:112, monthRevenue:13000000 },
  { id:14, branchId:6, branch:'Dewi Sri', name:'Hendra Wijaya',   initials:'HW', specialty:'Classic Cuts',        phone:'+6281234560014', commission:35, baseSalary:2500000, payType:'salary_plus_commission', status:'available',   isActive:true,  monthCuts:138, monthRevenue:16200000 },
  { id:15, branchId:6, branch:'Dewi Sri', name:'Axel Marcelino',  initials:'AM', specialty:'Fade & Style',        phone:'+6281234560015', commission:40, baseSalary:3000000, payType:'salary_plus_commission', status:'busy',        isActive:true,  monthCuts:168, monthRevenue:21000000 },
  { id:16, branchId:1, branch:'Seminyak', name:'Rian Prabowo',    initials:'RP', specialty:'Classic Cuts',        phone:'+6281234560016', commission:30, baseSalary:2000000, payType:'salary_plus_commission', status:'clocked_out', isActive:false, monthCuts:0,   monthRevenue:0        },
];

export const ATTENDANCE_LOG = [
  { date:'1 Apr',  barber:'Guntur Wibowo',   branch:'Seminyak', clockIn:'08:55', clockOut:'18:02', geofence:true,  hours:'9h 07m' },
  { date:'1 Apr',  barber:'Rifky Ramadhan',  branch:'Seminyak', clockIn:'09:01', clockOut:null,    geofence:true,  hours:'—'      },
  { date:'1 Apr',  barber:'Dion Prasetyo',   branch:'Canggu',   clockIn:'09:12', clockOut:null,    geofence:true,  hours:'—'      },
  { date:'1 Apr',  barber:'Bayu Santoso',    branch:'Canggu',   clockIn:'09:08', clockOut:null,    geofence:true,  hours:'—'      },
  { date:'1 Apr',  barber:'Axel Marcelino',  branch:'Dewi Sri', clockIn:'09:00', clockOut:null,    geofence:true,  hours:'—'      },
  { date:'1 Apr',  barber:'Wayan Aditya',    branch:'Ubud',     clockIn:'09:25', clockOut:null,    geofence:false, hours:'—'      },
  { date:'31 Mar', barber:'Guntur Wibowo',   branch:'Seminyak', clockIn:'08:58', clockOut:'18:05', geofence:true,  hours:'9h 07m' },
  { date:'31 Mar', barber:'Rifky Ramadhan',  branch:'Seminyak', clockIn:'09:03', clockOut:'18:10', geofence:true,  hours:'9h 07m' },
  { date:'31 Mar', barber:'Hendra Wijaya',   branch:'Dewi Sri', clockIn:'09:30', clockOut:'18:00', geofence:true,  hours:'8h 30m' },
  { date:'31 Mar', barber:'Reza Kurniawan',  branch:'Sanur',    clockIn:'09:00', clockOut:'17:55', geofence:true,  hours:'8h 55m' },
];

// ── Barber service capability ─────────────────────────────────────────────────
// Which services each barber is capable of performing (global, not per-branch).
// false = barber is not trained for this service → hidden from kiosk barber selection
// when that service is in the customer's cart. Branch-level disable is in SERVICE_CATALOGUE.branchConfig.
// Default: all true unless explicitly false here.
// Service IDs mapped: hair_color (20=Coloring,21=Bleach,22=Highlight), treatment specials (15=EarCandle,14=Creambath,8=BeardColoring)
export const BARBER_SERVICES = {
  1:  { 1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:false,9:true,10:true,11:true,12:true,13:true,14:false,15:true,16:true,17:true,18:true,19:true,20:true,21:true,22:false },  // Guntur — no highlight, no beard color, no creambath
  2:  { 1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:false,9:true,10:true,11:true,12:true,13:true,14:false,15:false,15:true,16:true,17:true,18:false,19:false,20:false,21:false,22:false }, // Pangestu — basic only
  3:  { 1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:true,9:true,10:true,11:true,12:true,13:true,14:true,15:true,16:true,17:true,18:true,19:true,20:true,21:true,22:true },     // Rifky — full capability
  4:  { 1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:true,9:true,10:true,11:true,12:true,13:true,14:true,15:true,16:true,17:true,18:true,19:true,20:false,21:false,22:false },  // Sep — no color services
  5:  { 1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:true,9:true,10:true,11:true,12:true,13:true,14:true,15:true,16:true,17:true,18:true,19:true,20:true,21:true,22:true },     // Agung — full capability
  7:  { 1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:false,9:true,10:true,11:true,12:true,13:true,14:false,15:true,16:true,17:true,18:true,19:true,20:true,21:false,22:false }, // Dion — no highlight/bleach
  8:  { 1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:true,9:true,10:true,11:true,12:true,13:true,14:true,15:true,16:true,17:true,18:true,19:true,20:true,21:true,22:true },     // Bayu — full
  15: { 1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:true,9:true,10:true,11:true,12:true,13:true,14:true,15:true,16:true,17:true,18:true,19:true,20:true,21:true,22:true },     // Axel — full
};

// ── Service catalogue (Service Catalogue screen) ──────────────────────────────

// consumables: [{ itemId, qty }] — itemId refs INVENTORY id where cat='service_consumable'
// item 7=Foil Sheets(box), 8=Disposable Blades(100pcs box), 9=Wax Strips(50pcs box), 10=Neck Paper(roll)
// branchConfig: { [branchId]: { available: boolean, price?: number, commissionRate?: number } }
// Absence of a branch key = available at base price, commission falls back to barbers.commission_rate.
export const SERVICE_CATALOGUE = [
  { id:1,  cat:'haircut',    name:'Just a Haircut',        nameId:'Potong Rambut',       dur:30,  basePrice:130000, badge:null,         isActive:true,  branchConfig:{ 4:{ available:true, price:150000 }, 7:{ available:true, price:150000 } },                consumables:[{ itemId:10, qty:1 }] },
  { id:2,  cat:'haircut',    name:'Kids Haircut',           nameId:'Potong Anak',         dur:25,  basePrice:130000, badge:null,         isActive:true,  branchConfig:{},                                                                                                                                              consumables:[{ itemId:10, qty:1 }] },
  { id:3,  cat:'haircut',    name:'Skin Fade',              nameId:'Skin Fade',           dur:45,  basePrice:130000, badge:null,         isActive:true,  branchConfig:{ 4:{ available:true, price:150000 }, 7:{ available:true, price:150000 } },                consumables:[{ itemId:10, qty:1 }] },
  { id:4,  cat:'haircut',    name:'Head Shaving',           nameId:'Cukur Botak',         dur:30,  basePrice:130000, badge:null,         isActive:true,  branchConfig:{},                                                                                                              consumables:[{ itemId:8, qty:2 }, { itemId:10, qty:1 }] },
  { id:5,  cat:'haircut',    name:'Hair Tattoo',            nameId:'Tato Rambut',         dur:45,  basePrice:150000, badge:null,         isActive:true,  branchConfig:{ 3:{ available:false }, 5:{ available:false } },                                                             consumables:[{ itemId:10, qty:1 }] },
  { id:6,  cat:'beard',      name:'Beard Trim',             nameId:'Rapikan Jenggot',     dur:20,  basePrice:75000,  badge:null,         isActive:true,  branchConfig:{},                                                                                                              consumables:[] },
  { id:7,  cat:'beard',      name:'Beard Shaving',          nameId:'Cukur Jenggot',       dur:25,  basePrice:95000,  badge:null,         isActive:true,  branchConfig:{},                                                                                                              consumables:[{ itemId:8, qty:2 }] },
  { id:8,  cat:'beard',      name:'Beard Coloring',         nameId:'Warna Jenggot',       dur:40,  basePrice:125000, badge:null,         isActive:true,  branchConfig:{ 3:{ available:false }, 5:{ available:false } },                                                             consumables:[] },
  { id:9,  cat:'treatment',  name:'Nose Wax',               nameId:'Wax Hidung',          dur:15,  basePrice:95000,  badge:null,         isActive:true,  branchConfig:{},                                                                                                              consumables:[{ itemId:9, qty:2 }] },
  { id:10, cat:'treatment',  name:'Ear Wax',                nameId:'Wax Telinga',         dur:15,  basePrice:95000,  badge:null,         isActive:true,  branchConfig:{},                                                                                                              consumables:[{ itemId:9, qty:1 }] },
  { id:11, cat:'treatment',  name:'Nose Blackhead Remover', nameId:'Komedo Hidung',       dur:20,  basePrice:55000,  badge:null,         isActive:true,  branchConfig:{},                                                                                                              consumables:[] },
  { id:12, cat:'treatment',  name:'Face Scrub',             nameId:'Scrub Wajah',         dur:20,  basePrice:85000,  badge:null,         isActive:true,  branchConfig:{},                                                                                                              consumables:[] },
  { id:13, cat:'treatment',  name:'Black Mask',             nameId:'Masker Hitam',        dur:25,  basePrice:85000,  badge:null,         isActive:true,  branchConfig:{},                                                                                                              consumables:[] },
  { id:14, cat:'treatment',  name:'Creambath',              nameId:'Creambath',           dur:30,  basePrice:95000,  badge:null,         isActive:true,  branchConfig:{ 5:{ available:false } },                                                                                     consumables:[] },
  { id:15, cat:'treatment',  name:'Ear Candle',             nameId:'Lilin Telinga',       dur:20,  basePrice:75000,  badge:null,         isActive:true,  branchConfig:{ 4:{ available:false } },                                                                                     consumables:[] },
  { id:16, cat:'package',    name:'Mask Cut Package',       nameId:'Paket Masker Potong', dur:60,  basePrice:205000, badge:'Save 10%',   isActive:true,  branchConfig:{},                                                                                                              consumables:[{ itemId:9, qty:2 }, { itemId:10, qty:1 }] },
  { id:17, cat:'package',    name:'Prestige Package',       nameId:'Paket Prestige',      dur:75,  basePrice:215000, badge:'Popular',    isActive:true,  branchConfig:{},                                                                                                              consumables:[{ itemId:8, qty:2 }, { itemId:10, qty:1 }] },
  { id:18, cat:'package',    name:'Luxury Package',         nameId:'Paket Luxury',        dur:120, basePrice:445000, badge:'Best Value', isActive:true,  branchConfig:{},                                                                                                              consumables:[{ itemId:9, qty:2 }, { itemId:8, qty:2 }, { itemId:10, qty:1 }] },
  { id:19, cat:'package',    name:'President Package',      nameId:'Paket President',     dur:150, basePrice:555000, badge:'All-In',     isActive:true,  branchConfig:{},                                                                                                              consumables:[{ itemId:7, qty:0.2 }, { itemId:9, qty:2 }, { itemId:8, qty:2 }, { itemId:10, qty:1 }] },
  { id:20, cat:'hair_color', name:'Hair Coloring',          nameId:'Pewarnaan Rambut',    dur:60,  basePrice:175000, badge:null,         isActive:true,  branchConfig:{},                                                                                                              consumables:[{ itemId:7, qty:0.2 }] },
  { id:21, cat:'hair_color', name:'Hair Bleach',            nameId:'Bleaching Rambut',    dur:90,  basePrice:260000, badge:null,         isActive:true,  branchConfig:{ 3:{ available:false }, 5:{ available:false } },                                                             consumables:[{ itemId:7, qty:0.3 }] },
  { id:22, cat:'hair_color', name:'Hair Highlight',         nameId:'Highlight Rambut',    dur:90,  basePrice:625000, badge:null,         isActive:true,  branchConfig:{ 1:{ available:false }, 3:{ available:false }, 5:{ available:false }, 7:{ available:false }, 8:{ available:false } },               consumables:[{ itemId:7, qty:0.4 }] },
];

export const SVC_CAT_META = {
  haircut:    { label:'Haircut',     color:'#2563EB', bg:'#EFF6FF' },
  beard:      { label:'Beard',       color:'#7C3AED', bg:'#EDE9FE' },
  treatment:  { label:'Treatment',   color:'#16A34A', bg:'#F0FDF4' },
  package:    { label:'Package',     color:'#D97706', bg:'#FFFBEB' },
  hair_color: { label:'Hair Color',  color:'#DC2626', bg:'#FEF2F2' },
};

// ── Customers (Customer Data screen) ─────────────────────────────────────────

// pointsLastActivity: date of last completed booking (resets the 12-month expiry clock)
export const CUSTOMERS = [
  { id:1,  name:'Budi Santoso',   phone:'+6281234560101', visits:18, totalSpend:2850000, points:142, preferredBarber:'Guntur',   lastVisit:'1 Apr 2026',  branch:'Seminyak', pointsLastActivity:'2026-04-01' },
  { id:2,  name:'James Holden',   phone:'+6189234560102', visits:12, totalSpend:3120000, points:98,  preferredBarber:'Rifky',    lastVisit:'1 Apr 2026',  branch:'Seminyak', pointsLastActivity:'2026-04-01' },
  { id:3,  name:'Wayan Sudirta',  phone:'+6281234560103', visits:31, totalSpend:5800000, points:280, preferredBarber:'Guntur',   lastVisit:'1 Apr 2026',  branch:'Seminyak', pointsLastActivity:'2026-04-01' },
  { id:4,  name:'David Lim',      phone:'+6581234560104', visits:8,  totalSpend:2440000, points:44,  preferredBarber:'Pangestu', lastVisit:'1 Apr 2026',  branch:'Seminyak', pointsLastActivity:'2025-04-20' },
  { id:5,  name:'Tomas Varga',    phone:'+3661234560105', visits:3,  totalSpend:520000,  points:12,  preferredBarber:'Sep',      lastVisit:'1 Apr 2026',  branch:'Seminyak', pointsLastActivity:'2026-04-01' },
  { id:6,  name:'Made Subrata',   phone:'+6281234560106', visits:24, totalSpend:3900000, points:195, preferredBarber:'Rifky',    lastVisit:'31 Mar 2026', branch:'Seminyak', pointsLastActivity:'2026-03-31' },
  { id:7,  name:'Chris Walker',   phone:'+6181234560107', visits:6,  totalSpend:1350000, points:35,  preferredBarber:'Agung',    lastVisit:'31 Mar 2026', branch:'Canggu',   pointsLastActivity:'2026-03-31' },
  { id:8,  name:'Nguyen Van An',  phone:'+8491234560108', visits:9,  totalSpend:1250000, points:62,  preferredBarber:'Dion',     lastVisit:'1 Apr 2026',  branch:'Canggu',   pointsLastActivity:'2026-04-01' },
  { id:9,  name:'Alex Johnson',   phone:'+6181234560109', visits:15, totalSpend:4500000, points:215, preferredBarber:'Axel',     lastVisit:'31 Mar 2026', branch:'Dewi Sri', pointsLastActivity:'2025-04-16' },
  { id:10, name:'Ketut Wirawan',  phone:'+6281234560110', visits:42, totalSpend:8200000, points:410, preferredBarber:'Bayu',     lastVisit:'1 Apr 2026',  branch:'Canggu',   pointsLastActivity:'2026-04-01' },
  { id:11, name:'Rizal Ahmad',    phone:'+6281234560111', visits:11, totalSpend:1650000, points:55,  preferredBarber:'Guntur',   lastVisit:'1 Apr 2026',  branch:'Seminyak', pointsLastActivity:'2026-04-01' },
  { id:12, name:'Michael Tan',    phone:'+6591234560112', visits:7,  totalSpend:1890000, points:89,  preferredBarber:'Hendra',   lastVisit:'30 Mar 2026', branch:'Dewi Sri', pointsLastActivity:'2025-04-25' },
];

export const CUSTOMER_HISTORY = [
  { booking:'B099', date:'1 Apr 2026',  services:'Just a Haircut',            barber:'Guntur',   total:130000, tip:20000, rating:5 },
  { booking:'B071', date:'25 Mar 2026', services:'Skin Fade',                  barber:'Guntur',   total:130000, tip:0,     rating:4 },
  { booking:'B044', date:'18 Mar 2026', services:'Prestige Package',           barber:'Rifky',    total:215000, tip:50000, rating:5 },
  { booking:'B022', date:'10 Mar 2026', services:'Just a Haircut + Nose Wax',  barber:'Guntur',   total:225000, tip:20000, rating:5 },
  { booking:'B008', date:'3 Mar 2026',  services:'Skin Fade + Beard Trim',     barber:'Guntur',   total:205000, tip:0,     rating:4 },
];

// ── Barber transaction log (individual barber drill-down in Reports) ─────────
// Used when clicking a barber row in Barber Performance table.
export const BARBER_TX_LOG = {
  'Rifky Ramadhan': [
    { date:'14 Apr 2026', time:'09:15', booking:'B201', customer:'Budi Santoso',   service:'Prestige Package',   amount:215000, commission:86000,  commPct:40, method:'qris', tip:50000 },
    { date:'14 Apr 2026', time:'10:45', booking:'B202', customer:'Walk-in',        service:'Skin Fade',          amount:130000, commission:52000,  commPct:40, method:'card', tip:0     },
    { date:'14 Apr 2026', time:'12:00', booking:'B203', customer:'Wayan Sudirta',  service:'Hair Coloring',      amount:175000, commission:70000,  commPct:40, method:'qris', tip:20000 },
    { date:'14 Apr 2026', time:'13:30', booking:'B204', customer:'Walk-in',        service:'Luxury Package',     amount:445000, commission:178000, commPct:40, method:'qris', tip:100000},
    { date:'13 Apr 2026', time:'09:00', booking:'B190', customer:'James Holden',   service:'Just a Haircut',     amount:130000, commission:52000,  commPct:40, method:'card', tip:0     },
    { date:'13 Apr 2026', time:'10:30', booking:'B192', customer:'David Lim',      service:'Skin Fade',          amount:130000, commission:52000,  commPct:40, method:'qris', tip:20000 },
    { date:'13 Apr 2026', time:'11:45', booking:'B193', customer:'Made Subrata',   service:'President Package',  amount:555000, commission:222000, commPct:40, method:'qris', tip:50000 },
    { date:'12 Apr 2026', time:'09:30', booking:'B181', customer:'Walk-in',        service:'Skin Fade',          amount:130000, commission:52000,  commPct:40, method:'card', tip:0     },
    { date:'12 Apr 2026', time:'11:00', booking:'B182', customer:'Chris Walker',   service:'Beard Trim',         amount:75000,  commission:30000,  commPct:40, method:'qris', tip:10000 },
    { date:'12 Apr 2026', time:'13:15', booking:'B183', customer:'Nguyen Van An',  service:'Hair Bleach',        amount:260000, commission:104000, commPct:40, method:'qris', tip:0     },
    { date:'11 Apr 2026', time:'10:00', booking:'B172', customer:'Alex Johnson',   service:'Luxury Package',     amount:445000, commission:178000, commPct:40, method:'card', tip:80000 },
    { date:'11 Apr 2026', time:'14:00', booking:'B174', customer:'Walk-in',        service:'Prestige Package',   amount:215000, commission:86000,  commPct:40, method:'qris', tip:20000 },
  ],
  'Guntur Wibowo': [
    { date:'14 Apr 2026', time:'09:00', booking:'B211', customer:'Ketut Wirawan',  service:'Just a Haircut',     amount:130000, commission:45500,  commPct:35, method:'qris', tip:20000 },
    { date:'14 Apr 2026', time:'10:30', booking:'B212', customer:'Rizal Ahmad',    service:'Skin Fade',          amount:130000, commission:45500,  commPct:35, method:'card', tip:0     },
    { date:'14 Apr 2026', time:'12:15', booking:'B213', customer:'Walk-in',        service:'Prestige Package',   amount:215000, commission:75250,  commPct:35, method:'qris', tip:50000 },
    { date:'13 Apr 2026', time:'09:30', booking:'B198', customer:'Michael Tan',    service:'Just a Haircut',     amount:130000, commission:45500,  commPct:35, method:'qris', tip:10000 },
    { date:'13 Apr 2026', time:'11:00', booking:'B199', customer:'Walk-in',        service:'Hair Tattoo',        amount:150000, commission:52500,  commPct:35, method:'card', tip:0     },
    { date:'12 Apr 2026', time:'10:00', booking:'B186', customer:'Tomas Varga',    service:'Beard Trim',         amount:75000,  commission:26250,  commPct:35, method:'qris', tip:0     },
    { date:'12 Apr 2026', time:'13:00', booking:'B188', customer:'Budi Santoso',   service:'Skin Fade',          amount:130000, commission:45500,  commPct:35, method:'qris', tip:20000 },
  ],
};

// ── Service Delay Log (Delay Report screen) ───────────────────────────────────

export const DELAY_LOG = [
  { date:'1 Apr 2026',  branch:'Seminyak', barber:'Guntur',   booking:'B101', scheduled:'09:00', actualStart:'09:14', delayMin:14, status:'flagged'  },
  { date:'1 Apr 2026',  branch:'Canggu',   barber:'Dion',     booking:'B088', scheduled:'10:30', actualStart:'10:48', delayMin:18, status:'flagged'  },
  { date:'1 Apr 2026',  branch:'Seminyak', barber:'Rifky',    booking:'B095', scheduled:'11:00', actualStart:'11:08', delayMin:8,  status:'resolved' },
  { date:'31 Mar 2026', branch:'Uluwatu',  barber:'Hendra',   booking:'B077', scheduled:'14:00', actualStart:'14:22', delayMin:22, status:'flagged'  },
  { date:'31 Mar 2026', branch:'Dewi Sri', barber:'Axel',     booking:'B064', scheduled:'15:30', actualStart:'15:41', delayMin:11, status:'resolved' },
  { date:'30 Mar 2026', branch:'Canggu',   barber:'Agung',    booking:'B055', scheduled:'09:00', actualStart:'09:19', delayMin:19, status:'flagged'  },
  { date:'30 Mar 2026', branch:'Seminyak', barber:'Pangestu', booking:'B049', scheduled:'13:00', actualStart:'13:11', delayMin:11, status:'resolved' },
  { date:'29 Mar 2026', branch:'Ubud',     barber:'Yogi',     booking:'B038', scheduled:'10:00', actualStart:'10:27', delayMin:27, status:'flagged'  },
  { date:'28 Mar 2026', branch:'Sanur',    barber:'Komang',   booking:'B031', scheduled:'11:00', actualStart:'11:06', delayMin:6,  status:'resolved' },
  { date:'28 Mar 2026', branch:'Dewi Sri', barber:'Bayu',     booking:'B027', scheduled:'16:00', actualStart:'16:33', delayMin:33, status:'flagged'  },
];

// ── Payroll Settings (global deduction rates) ────────────────────────────────

export const PAYROLL_SETTINGS = {
  offQuotaPerMonth:                4,   // excused offs before over-quota kicks in
  lateDeductionPerMinute:          2000, // IDR per minute late
  inexcusedOffFlatDeduction:       150000, // IDR per inexcused day
  overlimitExcusedOffFlat:         75000,  // IDR per excused day beyond quota
};

// ── Monthly Attendance Grid (April 2026) ─────────────────────────────────────
// status codes: P=present on-time, L=late, OE=off excused, OI=off inexcused,
//               OS=off sick (surat dokter), DO=scheduled day off
// April 1 = Wednesday. Weekends (Apr 4,5,11,12) shown as 'DO' when barber is off.
// lateMin only present when status = 'L'

// April 2026: Apr 1 = Wed. Weekends: 4,5,11,12,18,19,25,26. 30 days total.
export const MONTHLY_ATTENDANCE = {
  period: 'April 2026', year: 2026, month: 4,
  weekends: [4, 5, 11, 12, 18, 19, 25, 26],
  // barber name → { [day]: { s: status, lateMin?: number, branch?: string } }
  records: {
    'Guntur Wibowo': {
      1:{s:'P',branch:'Seminyak'}, 2:{s:'P',branch:'Seminyak'}, 3:{s:'P',branch:'Seminyak'}, 4:{s:'DO'}, 5:{s:'DO'},
      6:{s:'P',branch:'Seminyak'}, 7:{s:'L',lateMin:7,branch:'Seminyak'}, 8:{s:'P',branch:'Seminyak'}, 9:{s:'P',branch:'Seminyak'}, 10:{s:'P',branch:'Seminyak'}, 11:{s:'DO'}, 12:{s:'DO'},
      13:{s:'P',branch:'Seminyak'}, 14:{s:'P',branch:'Seminyak'}, 15:{s:'P',branch:'Seminyak'}, 16:{s:'P',branch:'Seminyak'}, 17:{s:'P',branch:'Seminyak'}, 18:{s:'DO'}, 19:{s:'DO'},
      20:{s:'P',branch:'Seminyak'}, 21:{s:'P',branch:'Seminyak'}, 22:{s:'P',branch:'Seminyak'}, 23:{s:'P',branch:'Seminyak'}, 24:{s:'P',branch:'Seminyak'}, 25:{s:'DO'}, 26:{s:'DO'},
      27:{s:'P',branch:'Seminyak'}, 28:{s:'P',branch:'Seminyak'}, 29:{s:'P',branch:'Seminyak'}, 30:{s:'P',branch:'Seminyak'},
    },
    'Pangestu Adi': {
      1:{s:'P',branch:'Seminyak'}, 2:{s:'P',branch:'Seminyak'}, 3:{s:'OE',branch:'Seminyak'}, 4:{s:'DO'}, 5:{s:'DO'},
      6:{s:'P',branch:'Seminyak'}, 7:{s:'P',branch:'Seminyak'}, 8:{s:'P',branch:'Seminyak'}, 9:{s:'P',branch:'Seminyak'}, 10:{s:'L',lateMin:12,branch:'Seminyak'}, 11:{s:'DO'}, 12:{s:'DO'},
      13:{s:'P',branch:'Seminyak'}, 14:{s:'P',branch:'Seminyak'}, 15:{s:'P',branch:'Seminyak'}, 16:{s:'P',branch:'Seminyak'}, 17:{s:'P',branch:'Seminyak'}, 18:{s:'DO'}, 19:{s:'DO'},
      20:{s:'P',branch:'Seminyak'}, 21:{s:'P',branch:'Seminyak'}, 22:{s:'P',branch:'Seminyak'}, 23:{s:'P',branch:'Seminyak'}, 24:{s:'P',branch:'Seminyak'}, 25:{s:'DO'}, 26:{s:'DO'},
      27:{s:'P',branch:'Seminyak'}, 28:{s:'P',branch:'Seminyak'}, 29:{s:'P',branch:'Seminyak'}, 30:{s:'P',branch:'Seminyak'},
    },
    'Rifky Ramadhan': {
      1:{s:'P',branch:'Seminyak'}, 2:{s:'P',branch:'Seminyak'}, 3:{s:'P',branch:'Seminyak'}, 4:{s:'DO'}, 5:{s:'DO'},
      6:{s:'P',branch:'Seminyak'}, 7:{s:'P',branch:'Seminyak'}, 8:{s:'P',branch:'Seminyak'}, 9:{s:'P',branch:'Seminyak'}, 10:{s:'P',branch:'Seminyak'}, 11:{s:'DO'}, 12:{s:'DO'},
      13:{s:'P',branch:'Seminyak'}, 14:{s:'P',branch:'Seminyak'}, 15:{s:'P',branch:'Seminyak'}, 16:{s:'P',branch:'Seminyak'}, 17:{s:'P',branch:'Seminyak'}, 18:{s:'DO'}, 19:{s:'DO'},
      20:{s:'P',branch:'Seminyak'}, 21:{s:'P',branch:'Seminyak'}, 22:{s:'P',branch:'Seminyak'}, 23:{s:'P',branch:'Seminyak'}, 24:{s:'P',branch:'Seminyak'}, 25:{s:'DO'}, 26:{s:'DO'},
      27:{s:'P',branch:'Seminyak'}, 28:{s:'P',branch:'Seminyak'}, 29:{s:'P',branch:'Seminyak'}, 30:{s:'P',branch:'Seminyak'},
    },
    'Sep Agustian': {
      1:{s:'P',branch:'Seminyak'}, 2:{s:'OI',branch:'Seminyak'}, 3:{s:'P',branch:'Seminyak'}, 4:{s:'DO'}, 5:{s:'DO'},
      6:{s:'P',branch:'Seminyak'}, 7:{s:'P',branch:'Seminyak'}, 8:{s:'L',lateMin:18,branch:'Seminyak'}, 9:{s:'L',lateMin:9,branch:'Seminyak'}, 10:{s:'P',branch:'Seminyak'}, 11:{s:'DO'}, 12:{s:'DO'},
      13:{s:'OE',branch:'Seminyak'}, 14:{s:'P',branch:'Seminyak'}, 15:{s:'P',branch:'Seminyak'}, 16:{s:'P',branch:'Seminyak'}, 17:{s:'P',branch:'Seminyak'}, 18:{s:'DO'}, 19:{s:'DO'},
      20:{s:'P',branch:'Seminyak'}, 21:{s:'P',branch:'Seminyak'}, 22:{s:'P',branch:'Seminyak'}, 23:{s:'P',branch:'Seminyak'}, 24:{s:'P',branch:'Seminyak'}, 25:{s:'DO'}, 26:{s:'DO'},
      27:{s:'P',branch:'Seminyak'}, 28:{s:'P',branch:'Seminyak'}, 29:{s:'P',branch:'Seminyak'}, 30:{s:'P',branch:'Seminyak'},
    },
    'Agung Pratama': {
      1:{s:'P',branch:'Seminyak'}, 2:{s:'P',branch:'Seminyak'}, 3:{s:'P',branch:'Seminyak'}, 4:{s:'DO'}, 5:{s:'DO'},
      6:{s:'P',branch:'Seminyak'}, 7:{s:'P',branch:'Seminyak'}, 8:{s:'P',branch:'Seminyak'}, 9:{s:'P',branch:'Canggu'}, 10:{s:'P',branch:'Canggu'}, 11:{s:'DO'}, 12:{s:'DO'},
      13:{s:'P',branch:'Seminyak'}, 14:{s:'P',branch:'Seminyak'}, 15:{s:'P',branch:'Seminyak'}, 16:{s:'P',branch:'Seminyak'}, 17:{s:'P',branch:'Seminyak'}, 18:{s:'DO'}, 19:{s:'DO'},
      20:{s:'P',branch:'Seminyak'}, 21:{s:'P',branch:'Seminyak'}, 22:{s:'P',branch:'Seminyak'}, 23:{s:'P',branch:'Seminyak'}, 24:{s:'P',branch:'Seminyak'}, 25:{s:'DO'}, 26:{s:'DO'},
      27:{s:'P',branch:'Seminyak'}, 28:{s:'P',branch:'Seminyak'}, 29:{s:'P',branch:'Seminyak'}, 30:{s:'P',branch:'Seminyak'},
    },
    'Rahmat Suharto': {
      1:{s:'P',branch:'Seminyak'}, 2:{s:'P',branch:'Seminyak'}, 3:{s:'OS',branch:'Seminyak'}, 4:{s:'DO'}, 5:{s:'DO'},
      6:{s:'OS',branch:'Seminyak'}, 7:{s:'P',branch:'Seminyak'}, 8:{s:'P',branch:'Seminyak'}, 9:{s:'OI',branch:'Seminyak'}, 10:{s:'P',branch:'Seminyak'}, 11:{s:'DO'}, 12:{s:'DO'},
      13:{s:'P',branch:'Seminyak'}, 14:{s:'L',lateMin:22,branch:'Seminyak'}, 15:{s:'P',branch:'Seminyak'}, 16:{s:'P',branch:'Seminyak'}, 17:{s:'P',branch:'Seminyak'}, 18:{s:'DO'}, 19:{s:'DO'},
      20:{s:'P',branch:'Seminyak'}, 21:{s:'P',branch:'Seminyak'}, 22:{s:'P',branch:'Seminyak'}, 23:{s:'P',branch:'Seminyak'}, 24:{s:'P',branch:'Seminyak'}, 25:{s:'DO'}, 26:{s:'DO'},
      27:{s:'P',branch:'Seminyak'}, 28:{s:'P',branch:'Seminyak'}, 29:{s:'P',branch:'Seminyak'}, 30:{s:'P',branch:'Seminyak'},
    },
    'Dion Prasetyo': {
      1:{s:'P',branch:'Canggu'}, 2:{s:'P',branch:'Canggu'}, 3:{s:'P',branch:'Canggu'}, 4:{s:'DO'}, 5:{s:'DO'},
      6:{s:'P',branch:'Canggu'}, 7:{s:'P',branch:'Canggu'}, 8:{s:'L',lateMin:5,branch:'Canggu'}, 9:{s:'P',branch:'Canggu'}, 10:{s:'P',branch:'Canggu'}, 11:{s:'DO'}, 12:{s:'DO'},
      13:{s:'P',branch:'Canggu'}, 14:{s:'P',branch:'Canggu'}, 15:{s:'OE',branch:'Canggu'}, 16:{s:'P',branch:'Canggu'}, 17:{s:'P',branch:'Canggu'}, 18:{s:'DO'}, 19:{s:'DO'},
      20:{s:'P',branch:'Canggu'}, 21:{s:'P',branch:'Canggu'}, 22:{s:'P',branch:'Canggu'}, 23:{s:'L',lateMin:9,branch:'Canggu'}, 24:{s:'P',branch:'Canggu'}, 25:{s:'DO'}, 26:{s:'DO'},
      27:{s:'P',branch:'Canggu'}, 28:{s:'P',branch:'Canggu'}, 29:{s:'P',branch:'Canggu'}, 30:{s:'P',branch:'Canggu'},
    },
    'Axel Marcelino': {
      1:{s:'P',branch:'Dewi Sri'}, 2:{s:'P',branch:'Dewi Sri'}, 3:{s:'P',branch:'Dewi Sri'}, 4:{s:'DO'}, 5:{s:'DO'},
      6:{s:'OE',branch:'Dewi Sri'}, 7:{s:'OE',branch:'Dewi Sri'}, 8:{s:'P',branch:'Dewi Sri'}, 9:{s:'P',branch:'Dewi Sri'}, 10:{s:'P',branch:'Dewi Sri'}, 11:{s:'DO'}, 12:{s:'DO'},
      13:{s:'P',branch:'Dewi Sri'}, 14:{s:'P',branch:'Dewi Sri'}, 15:{s:'P',branch:'Dewi Sri'}, 16:{s:'P',branch:'Dewi Sri'}, 17:{s:'P',branch:'Dewi Sri'}, 18:{s:'DO'}, 19:{s:'DO'},
      20:{s:'P',branch:'Dewi Sri'}, 21:{s:'L',lateMin:14,branch:'Dewi Sri'}, 22:{s:'P',branch:'Dewi Sri'}, 23:{s:'P',branch:'Dewi Sri'}, 24:{s:'P',branch:'Dewi Sri'}, 25:{s:'DO'}, 26:{s:'DO'},
      27:{s:'P',branch:'Dewi Sri'}, 28:{s:'P',branch:'Dewi Sri'}, 29:{s:'OI',branch:'Dewi Sri'}, 30:{s:'P',branch:'Dewi Sri'},
    },
  },
};

// ── Overtime Commission Config ────────────────────────────────────────────────
// Services booked at/after threshold earn bonusPct% extra on top of barber's commRate.
// excludedServiceIds: these services earn standard rate only (no OT bonus).
export const OVERTIME_COMM_CONFIG = {
  enabled:            true,
  threshold:          '19:30',  // HH:MM — 24h
  bonusPct:           10,       // additional % on top of barber's commission rate
  excludedServiceIds: [1],      // id:1 = 'Just a Haircut'
};

// ── Payroll Entries V2 (new simplified model — April 2026) ────────────────────
// calc columns = auto-computed; override = admin-editable (null → use calc)
// effective = override ?? calc
// commEarned = commRegular + commOT
//   commOT = bonus portion only (OT_revenue × bonusPct%) — base commission on OT services is in commRegular

export const PAYROLL_ENTRIES_V2 = [
  {
    id:1, barber:'Guntur Wibowo',  initials:'GW', branch:'Seminyak',
    baseSalary:2500000, commRate:35, grossRevenue:5800000,
    commRegular:1960000, commOT:70000, commEarned:2030000, tips:450000,
    presentDays:12, lateDays:1, lateMinutesTotal:7,
    inexcusedDays:0, excusedDays:0,
    lateDedCalc:14000,    lateDedOverride:null,
    inexcusedDedCalc:0,   inexcusedDedOverride:null,
    excusedOverQuotaDedCalc:0, excusedOverQuotaDedOverride:null,
    adjustments: [
      { id:'adj_1a', type:'addition',  category:'uang_rajin',  categoryLabel:'Uang Rajin', remarks:'Full month attendance', amount:200000, by:'Owner', date:'10 Apr', isKasbon:false, deductPeriod:'current' },
      { id:'adj_1b', type:'deduction', category:'kasbon',      categoryLabel:'Kasbon',     remarks:'Personal emergency',   amount:500000, by:'Owner', date:'15 Apr', isKasbon:true,  deductPeriod:'current', expenseId:11 },
    ],
  },
  {
    id:2, barber:'Pangestu Adi',   initials:'PA', branch:'Seminyak',
    baseSalary:2500000, commRate:35, grossRevenue:4900000,
    commRegular:1715000, commOT:0, commEarned:1715000, tips:320000,
    presentDays:11, lateDays:1, lateMinutesTotal:12,
    inexcusedDays:0, excusedDays:1,
    lateDedCalc:24000,    lateDedOverride:null,
    inexcusedDedCalc:0,   inexcusedDedOverride:null,
    excusedOverQuotaDedCalc:0, excusedOverQuotaDedOverride:null,
    adjustments: [
      { id:'adj_2a', type:'addition',  category:'bonus',       categoryLabel:'Bonus',      remarks:'Top Barber of the Month', amount:300000, by:'Owner', date:'28 Mar', isKasbon:false, deductPeriod:'current' },
    ],
  },
  {
    id:3, barber:'Rifky Ramadhan', initials:'RR', branch:'Seminyak',
    baseSalary:3000000, commRate:40, grossRevenue:6200000,
    commRegular:2360000, commOT:120000, commEarned:2480000, tips:510000,
    presentDays:12, lateDays:0, lateMinutesTotal:0,
    inexcusedDays:0, excusedDays:0,
    lateDedCalc:0,        lateDedOverride:null,
    inexcusedDedCalc:0,   inexcusedDedOverride:null,
    excusedOverQuotaDedCalc:0, excusedOverQuotaDedOverride:null,
    adjustments: [
      { id:'adj_3a', type:'addition',  category:'uang_rajin',  categoryLabel:'Uang Rajin', remarks:'Zero late arrivals', amount:200000, by:'Owner', date:'28 Mar', isKasbon:false, deductPeriod:'current' },
    ],
  },
  {
    id:4, barber:'Sep Agustian',   initials:'SA', branch:'Seminyak',
    baseSalary:2000000, commRate:35, grossRevenue:3400000,
    commRegular:1190000, commOT:0, commEarned:1190000, tips:180000,
    presentDays:9, lateDays:2, lateMinutesTotal:27,
    inexcusedDays:1, excusedDays:1,
    lateDedCalc:54000,    lateDedOverride:null,
    inexcusedDedCalc:150000, inexcusedDedOverride:null,
    excusedOverQuotaDedCalc:0, excusedOverQuotaDedOverride:null,
    adjustments: [],
  },
  {
    id:5, barber:'Agung Pratama',  initials:'AP', branch:'Seminyak',
    baseSalary:2500000, commRate:35, grossRevenue:5100000,
    commRegular:1695000, commOT:90000, commEarned:1785000, tips:390000,
    presentDays:12, lateDays:0, lateMinutesTotal:0,
    inexcusedDays:0, excusedDays:0,
    lateDedCalc:0,        lateDedOverride:null,
    inexcusedDedCalc:0,   inexcusedDedOverride:null,
    excusedOverQuotaDedCalc:0, excusedOverQuotaDedOverride:null,
    adjustments: [],
  },
  {
    id:6, barber:'Rahmat Suharto', initials:'RS', branch:'Seminyak',
    baseSalary:2000000, commRate:30, grossRevenue:2800000,
    commRegular:840000, commOT:0, commEarned:840000, tips:120000,
    presentDays:9, lateDays:1, lateMinutesTotal:22,
    inexcusedDays:1, excusedDays:2,
    lateDedCalc:44000,    lateDedOverride:null,
    inexcusedDedCalc:150000, inexcusedDedOverride:null,
    excusedOverQuotaDedCalc:0, excusedOverQuotaDedOverride:null,
    // note: 2 sick days (surat dokter) → not counted as deduction, only inexcused day counts
    adjustments: [
      { id:'adj_6a', type:'deduction', category:'kasbon',      categoryLabel:'Kasbon',     remarks:'Salary advance', amount:250000, by:'Owner', date:'20 Apr', isKasbon:true, deductPeriod:'current', expenseId:12 },
    ],
  },
];

// ── Live Monitor data (simulated real-time state) ─────────────────────────────
// elapsedMin = minutes since service started (static in mockup; in prod this counts live)
// estDurationMin = expected total service duration

export const LIVE_BARBERS = [
  // ── Seminyak ──
  { id:1,  branchId:1, branch:'Seminyak', name:'Guntur Wibowo',  initials:'GW', status:'busy',
    current:{ booking:'B104', customer:'Rizal Ahmad',   service:'Skin Fade',          elapsedMin:12, estDurationMin:45 },
    next:{ booking:'B110', customer:'Made Subrata',  service:'Hair Tattoo',        scheduledAt:'13:00' } },
  { id:2,  branchId:1, branch:'Seminyak', name:'Pangestu Adi',   initials:'PA', status:'busy',
    current:{ booking:'B107', customer:'Michael Tan',   service:'Prestige Package',   elapsedMin:25, estDurationMin:75 },
    next:{ booking:'B111', customer:'Chris Walker',  service:'Skin Fade + Nose Wax',scheduledAt:'13:30' } },
  { id:3,  branchId:1, branch:'Seminyak', name:'Rifky Ramadhan', initials:'RR', status:'busy',
    current:{ booking:'B101', customer:'Wayan Sudirta', service:'Prestige Package',   elapsedMin:8,  estDurationMin:75 },
    next:{ booking:'B108', customer:'Ketut Wirawan', service:'Luxury Package',      scheduledAt:'11:30' } },
  { id:4,  branchId:1, branch:'Seminyak', name:'Sep Agustian',   initials:'SA', status:'on_break',
    current:null,
    next:{ booking:'B106', customer:'Tomas Varga',   service:'Hair Coloring',       scheduledAt:'11:00' } },
  { id:5,  branchId:1, branch:'Seminyak', name:'Agung Pratama',  initials:'AP', status:'busy',
    current:{ booking:'B105', customer:'David Lim',     service:'President Package',  elapsedMin:45, estDurationMin:150 },
    next:{ booking:'B109', customer:'Alex Johnson',  service:'Beard + Face Scrub',  scheduledAt:'12:00' } },
  { id:6,  branchId:1, branch:'Seminyak', name:'Rahmat Suharto', initials:'RS', status:'clocked_out',
    current:null, next:null },
  // ── Canggu ──
  { id:7,  branchId:2, branch:'Canggu', name:'Dion Prasetyo',   initials:'DP', status:'busy',
    current:{ booking:'B088', customer:'Walk-in',       service:'Skin Fade',          elapsedMin:18, estDurationMin:45 },
    next:{ booking:'B092', customer:'Nguyen Van An', service:'Just a Haircut',      scheduledAt:'11:00' } },
  { id:8,  branchId:2, branch:'Canggu', name:'Bayu Santoso',    initials:'BS', status:'available',
    current:null,
    next:{ booking:'B093', customer:'Ketut Wirawan', service:'Luxury Package',      scheduledAt:'11:30' } },
  { id:9,  branchId:2, branch:'Canggu', name:'Yogi Permana',    initials:'YP', status:'available',
    current:null, next:null },
  // ── Dewi Sri ──
  { id:14, branchId:6, branch:'Dewi Sri', name:'Hendra Wijaya',  initials:'HW', status:'busy',
    current:{ booking:'B064', customer:'Budi Santoso',  service:'Luxury Package',     elapsedMin:55, estDurationMin:120 },
    next:null },
  { id:15, branchId:6, branch:'Dewi Sri', name:'Axel Marcelino', initials:'AM', status:'available',
    current:null,
    next:{ booking:'B071', customer:'James Holden',  service:'Skin Fade',           scheduledAt:'12:00' } },
  { id:16, branchId:6, branch:'Dewi Sri', name:'Wahyu Setiawan', initials:'WS', status:'busy',
    current:{ booking:'B060', customer:'Alex Johnson',  service:'Prestige Package',   elapsedMin:30, estDurationMin:75 },
    next:{ booking:'B072', customer:'Walk-in',       service:'Beard Trim',          scheduledAt:'12:30' } },
  // ── Ubud ──
  { id:10, branchId:3, branch:'Ubud', name:'Kadek Swastika',  initials:'KS', status:'available',
    current:null, next:null },
  { id:11, branchId:3, branch:'Ubud', name:'Wayan Aditya',    initials:'WA', status:'busy',
    current:{ booking:'B040', customer:'Walk-in',       service:'Just a Haircut',     elapsedMin:10, estDurationMin:30 },
    next:null },
];

// ── Live Queue Management data ────────────────────────────────────────────────
// Full barber queue for LiveMonitor redesign. Only active statuses (in_progress + confirmed).
// clientNotArrived: true = barber tapped "Belum Datang"; SSE emits client_not_arrived event.

export const LIVE_QUEUE_BARBERS = [
  // Seminyak (branchId 1)
  { id:1,  branchId:1, name:'Guntur Wibowo',  initials:'GW', status:'busy',       queue:[
    { id:'b04', number:'B102', customer:'Rizal Ahmad',    services:'Skin Fade',            slot:'10:30', status:'in_progress', total:130000, clientNotArrived:false, elapsedMin:12, estDurationMin:45  },
    { id:'b10', number:'B108', customer:'Made Subrata',   services:'Hair Tattoo',          slot:'13:00', status:'confirmed',   total:150000, clientNotArrived:true  },
    { id:'b12', number:'B110', customer:'Nguyen Van An',  services:'Just a Haircut',       slot:'14:00', status:'confirmed',   total:130000, clientNotArrived:false },
  ]},
  { id:2,  branchId:1, name:'Pangestu Adi',   initials:'PA', status:'busy',       queue:[
    { id:'b07', number:'B105', customer:'Michael Tan',    services:'Prestige Package',     slot:'11:30', status:'in_progress', total:215000, clientNotArrived:false, elapsedMin:25, estDurationMin:75  },
    { id:'b11', number:'B109', customer:'Chris Walker',   services:'Skin Fade + Nose Wax', slot:'13:30', status:'confirmed',   total:225000, clientNotArrived:true  },
  ]},
  { id:3,  branchId:1, name:'Rifky Ramadhan', initials:'RR', status:'busy',       queue:[
    { id:'b03', number:'B101', customer:'Wayan Sudirta',  services:'Prestige Package',     slot:'10:00', status:'in_progress', total:215000, clientNotArrived:false, elapsedMin:8,  estDurationMin:75  },
    { id:'b08', number:'B106', customer:'Ketut Wirawan',  services:'Luxury Package',       slot:'11:30', status:'confirmed',   total:445000, clientNotArrived:false },
  ]},
  { id:4,  branchId:1, name:'Sep Agustian',   initials:'SA', status:'on_break',   queue:[
    { id:'b06', number:'B104', customer:'Tomas Varga',    services:'Hair Coloring',        slot:'11:00', status:'confirmed',   total:175000, clientNotArrived:false },
  ]},
  { id:5,  branchId:1, name:'Agung Pratama',  initials:'AP', status:'busy',       queue:[
    { id:'b05', number:'B103', customer:'David Lim',      services:'President Package',    slot:'10:30', status:'in_progress', total:555000, clientNotArrived:false, elapsedMin:45, estDurationMin:150 },
    { id:'b09', number:'B107', customer:'Alex Johnson',   services:'Beard + Face Scrub',   slot:'12:00', status:'confirmed',   total:160000, clientNotArrived:false },
  ]},
  { id:6,  branchId:1, name:'Rahmat Suharto', initials:'RS', status:'clocked_out',queue:[] },
  // Canggu (branchId 2)
  { id:7,  branchId:2, name:'Dion Prasetyo',  initials:'DP', status:'busy',       queue:[
    { id:'c01', number:'B088', customer:'Walk-in',        services:'Skin Fade',            slot:'10:30', status:'in_progress', total:130000, clientNotArrived:false, elapsedMin:18, estDurationMin:45  },
    { id:'c02', number:'B092', customer:'Nguyen Van An',  services:'Just a Haircut',       slot:'11:00', status:'confirmed',   total:130000, clientNotArrived:false },
  ]},
  { id:8,  branchId:2, name:'Bayu Santoso',   initials:'BS', status:'available',  queue:[
    { id:'c03', number:'B093', customer:'Ketut Wirawan',  services:'Luxury Package',       slot:'11:30', status:'confirmed',   total:445000, clientNotArrived:false },
  ]},
  { id:9,  branchId:2, name:'Yogi Permana',   initials:'YP', status:'available',  queue:[] },
  // Dewi Sri (branchId 6)
  { id:14, branchId:6, name:'Hendra Wijaya',  initials:'HW', status:'busy',       queue:[
    { id:'d01', number:'B064', customer:'Budi Santoso',   services:'Luxury Package',       slot:'09:30', status:'in_progress', total:445000, clientNotArrived:false, elapsedMin:55, estDurationMin:120 },
  ]},
  { id:15, branchId:6, name:'Axel Marcelino', initials:'AM', status:'available',  queue:[
    { id:'d02', number:'B071', customer:'James Holden',   services:'Skin Fade',            slot:'12:00', status:'confirmed',   total:130000, clientNotArrived:false },
  ]},
  { id:16, branchId:6, name:'Wahyu Setiawan', initials:'WS', status:'busy',       queue:[
    { id:'d03', number:'B060', customer:'Alex Johnson',   services:'Prestige Package',     slot:'10:00', status:'in_progress', total:215000, clientNotArrived:false, elapsedMin:30, estDurationMin:75  },
    { id:'d04', number:'B072', customer:'Walk-in',        services:'Beard Trim',           slot:'12:30', status:'confirmed',   total:85000,  clientNotArrived:false },
  ]},
  // Ubud (branchId 3)
  { id:10, branchId:3, name:'Kadek Swastika', initials:'KS', status:'available',  queue:[] },
  { id:11, branchId:3, name:'Wayan Aditya',   initials:'WA', status:'busy',       queue:[
    { id:'u01', number:'B040', customer:'Walk-in',        services:'Just a Haircut',       slot:'10:30', status:'in_progress', total:130000, clientNotArrived:false, elapsedMin:10, estDurationMin:30  },
  ]},
];

// ── Barber Schedules (Schedules tab) ─────────────────────────────────────────

export const BARBER_SCHEDULES = [
  { id:1, name:'Guntur',    initials:'GN', branch:'Seminyak', schedule:[
    {day:'Mon',start:'09:00',end:'18:00',off:false}, {day:'Tue',start:'09:00',end:'18:00',off:false},
    {day:'Wed',start:'09:00',end:'18:00',off:false}, {day:'Thu',start:'09:00',end:'18:00',off:false},
    {day:'Fri',start:'09:00',end:'18:00',off:false}, {day:'Sat',start:'09:00',end:'18:00',off:false},
    {day:'Sun',start:null,   end:null,   off:true } ]},
  { id:2, name:'Rifky',     initials:'RF', branch:'Seminyak', schedule:[
    {day:'Mon',start:'09:00',end:'18:00',off:false}, {day:'Tue',start:'09:00',end:'18:00',off:false},
    {day:'Wed',start:null,   end:null,   off:true }, {day:'Thu',start:'09:00',end:'18:00',off:false},
    {day:'Fri',start:'09:00',end:'18:00',off:false}, {day:'Sat',start:'09:00',end:'18:00',off:false},
    {day:'Sun',start:'09:00',end:'18:00',off:false} ]},
  { id:3, name:'Pangestu',  initials:'PG', branch:'Seminyak', schedule:[
    {day:'Mon',start:'09:00',end:'18:00',off:false}, {day:'Tue',start:'09:00',end:'18:00',off:false},
    {day:'Wed',start:'09:00',end:'18:00',off:false}, {day:'Thu',start:null,   end:null,   off:true },
    {day:'Fri',start:'09:00',end:'18:00',off:false}, {day:'Sat',start:'10:00',end:'19:00',off:false},
    {day:'Sun',start:'10:00',end:'19:00',off:false} ]},
  { id:4, name:'Agung',     initials:'AG', branch:'Canggu',   schedule:[
    {day:'Mon',start:'10:00',end:'19:00',off:false}, {day:'Tue',start:'10:00',end:'19:00',off:false},
    {day:'Wed',start:'10:00',end:'19:00',off:false}, {day:'Thu',start:'10:00',end:'19:00',off:false},
    {day:'Fri',start:'10:00',end:'19:00',off:false}, {day:'Sat',start:'09:00',end:'20:00',off:false},
    {day:'Sun',start:null,   end:null,   off:true } ]},
  { id:5, name:'Dion',      initials:'DN', branch:'Canggu',   schedule:[
    {day:'Mon',start:'10:00',end:'19:00',off:false}, {day:'Tue',start:null,   end:null,   off:true },
    {day:'Wed',start:'10:00',end:'19:00',off:false}, {day:'Thu',start:'10:00',end:'19:00',off:false},
    {day:'Fri',start:'10:00',end:'19:00',off:false}, {day:'Sat',start:'09:00',end:'20:00',off:false},
    {day:'Sun',start:'09:00',end:'20:00',off:false} ]},
  { id:6, name:'Hendra',    initials:'HD', branch:'Dewi Sri', schedule:[
    {day:'Mon',start:'09:00',end:'18:00',off:false}, {day:'Tue',start:'09:00',end:'18:00',off:false},
    {day:'Wed',start:'09:00',end:'18:00',off:false}, {day:'Thu',start:'09:00',end:'18:00',off:false},
    {day:'Fri',start:null,   end:null,   off:true }, {day:'Sat',start:'09:00',end:'18:00',off:false},
    {day:'Sun',start:'09:00',end:'18:00',off:false} ]},
  { id:7, name:'Axel',      initials:'AX', branch:'Dewi Sri', schedule:[
    {day:'Mon',start:'09:00',end:'18:00',off:false}, {day:'Tue',start:'09:00',end:'18:00',off:false},
    {day:'Wed',start:'09:00',end:'18:00',off:false}, {day:'Thu',start:'09:00',end:'18:00',off:false},
    {day:'Fri',start:'09:00',end:'18:00',off:false}, {day:'Sat',start:'09:00',end:'18:00',off:false},
    {day:'Sun',start:null,   end:null,   off:true } ]},
  { id:8, name:'Yogi',      initials:'YG', branch:'Ubud',     schedule:[
    {day:'Mon',start:'09:00',end:'17:00',off:false}, {day:'Tue',start:'09:00',end:'17:00',off:false},
    {day:'Wed',start:'09:00',end:'17:00',off:false}, {day:'Thu',start:null,   end:null,   off:true },
    {day:'Fri',start:'09:00',end:'17:00',off:false}, {day:'Sat',start:'09:00',end:'17:00',off:false},
    {day:'Sun',start:'09:00',end:'17:00',off:false} ]},
  { id:9, name:'Komang',    initials:'KM', branch:'Sanur',    schedule:[
    {day:'Mon',start:'09:00',end:'18:00',off:false}, {day:'Tue',start:'09:00',end:'18:00',off:false},
    {day:'Wed',start:null,   end:null,   off:true }, {day:'Thu',start:'09:00',end:'18:00',off:false},
    {day:'Fri',start:'09:00',end:'18:00',off:false}, {day:'Sat',start:'09:00',end:'18:00',off:false},
    {day:'Sun',start:'09:00',end:'18:00',off:false} ]},
  { id:10, name:'Bayu',     initials:'BY', branch:'Canggu',   schedule:[
    {day:'Mon',start:'10:00',end:'19:00',off:false}, {day:'Tue',start:'10:00',end:'19:00',off:false},
    {day:'Wed',start:'10:00',end:'19:00',off:false}, {day:'Thu',start:'10:00',end:'19:00',off:false},
    {day:'Fri',start:null,   end:null,   off:true }, {day:'Sat',start:'10:00',end:'20:00',off:false},
    {day:'Sun',start:'10:00',end:'20:00',off:false} ]},
];
