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
  { id:1, name:'Bercut Seminyak', city:'Seminyak', activeBarbers:5, totalBarbers:6, queueWaiting:7,  inProgress:2, completed:8,  noShow:1, revenue:1850000, alerts:[]                         },
  { id:2, name:'Bercut Canggu',   city:'Canggu',   activeBarbers:4, totalBarbers:5, queueWaiting:2,  inProgress:1, completed:6,  noShow:0, revenue:1120000, alerts:['late_start']             },
  { id:3, name:'Bercut Ubud',     city:'Ubud',     activeBarbers:3, totalBarbers:4, queueWaiting:0,  inProgress:0, completed:4,  noShow:0, revenue:650000,  alerts:[]                         },
  { id:4, name:'Bercut Uluwatu',  city:'Uluwatu',  activeBarbers:4, totalBarbers:5, queueWaiting:4,  inProgress:3, completed:9,  noShow:2, revenue:1450000, alerts:['low_stock']              },
  { id:5, name:'Bercut Sanur',    city:'Sanur',    activeBarbers:3, totalBarbers:4, queueWaiting:1,  inProgress:1, completed:5,  noShow:0, revenue:780000,  alerts:[]                         },
  { id:6, name:'Bercut Dewi Sri', city:'Kuta',     activeBarbers:5, totalBarbers:6, queueWaiting:5,  inProgress:3, completed:11, noShow:1, revenue:2100000, alerts:['late_start','low_stock'] },
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
  { date:'1 Apr', branch:'Seminyak', barber:'Guntur',   service:'Just a Haircut',    method:'qris', amount:130000, tip:20000  },
  { date:'1 Apr', branch:'Seminyak', barber:'Pangestu', service:'Skin Fade',          method:'card', amount:130000, tip:0      },
  { date:'1 Apr', branch:'Canggu',   barber:'Dion',     service:'Prestige Package',   method:'qris', amount:215000, tip:50000  },
  { date:'1 Apr', branch:'Uluwatu',  barber:'Yogi',     service:'Luxury Package',     method:'card', amount:445000, tip:0      },
  { date:'1 Apr', branch:'Dewi Sri', barber:'Hendra',   service:'President Package',  method:'qris', amount:555000, tip:100000 },
  { date:'1 Apr', branch:'Seminyak', barber:'Rifky',    service:'Hair Coloring',      method:'card', amount:175000, tip:0      },
  { date:'1 Apr', branch:'Sanur',    barber:'Reza',     service:'Beard + Nose Wax',   method:'qris', amount:185000, tip:10000  },
  { date:'31 Mar',branch:'Seminyak', barber:'Agung',    service:'Luxury Package',     method:'qris', amount:445000, tip:50000  },
  { date:'31 Mar',branch:'Canggu',   barber:'Bayu',     service:'Just a Haircut',     method:'card', amount:130000, tip:20000  },
  { date:'31 Mar',branch:'Ubud',     barber:'Kadek',    service:'Prestige Package',   method:'qris', amount:215000, tip:0      },
];

export const BARBER_PERF = [
  { name:'Rifky Ramadhan',  branch:'Seminyak', cuts:9,  revenue:1140000, commRate:40, commEarned:456000  },
  { name:'Guntur Wibowo',   branch:'Seminyak', cuts:8,  revenue:950000,  commRate:35, commEarned:332500  },
  { name:'Agung Pratama',   branch:'Seminyak', cuts:7,  revenue:870000,  commRate:35, commEarned:304500  },
  { name:'Pangestu Adi',    branch:'Seminyak', cuts:6,  revenue:780000,  commRate:35, commEarned:273000  },
  { name:'Dion Prasetyo',   branch:'Canggu',   cuts:7,  revenue:890000,  commRate:35, commEarned:311500  },
  { name:'Bayu Santoso',    branch:'Canggu',   cuts:5,  revenue:780000,  commRate:40, commEarned:312000  },
];

// ── Expenses ──────────────────────────────────────────────────────────────────

export const EXPENSES = [
  { id:1,  date:'1 Apr',  branch:'Seminyak', category:'supplies',   desc:'Blade pack (100 pcs)',        amount:150000, by:'Admin'  },
  { id:2,  date:'31 Mar', branch:'Canggu',   category:'utilities',  desc:'Monthly electricity bill',    amount:850000, by:'Owner'  },
  { id:3,  date:'31 Mar', branch:'Seminyak', category:'petty_cash', desc:'Snacks for barbers',          amount:75000,  by:'Admin'  },
  { id:4,  date:'30 Mar', branch:'Uluwatu',  category:'equipment',  desc:'Wahl clipper replacement',    amount:350000, by:'Admin'  },
  { id:5,  date:'29 Mar', branch:'Dewi Sri', category:'supplies',   desc:'Wax strips restock (10 box)', amount:200000, by:'Admin'  },
  { id:6,  date:'28 Mar', branch:'Canggu',   category:'other',      desc:'Monthly parking permit',      amount:50000,  by:'Owner'  },
  { id:7,  date:'27 Mar', branch:'Sanur',    category:'supplies',   desc:'Shampoo + conditioner restock',amount:180000,by:'Admin'  },
  { id:8,  date:'26 Mar', branch:'Seminyak', category:'equipment',  desc:'Swivel mirror replacement',   amount:420000, by:'Owner'  },
];

// ── Inventory ─────────────────────────────────────────────────────────────────

export const INVENTORY = [
  { id:1,  name:'Mineral Water (600ml)',       cat:'beverage',          unit:'pcs',  s:48, ca:30, u:12, ul:25, sa:18, d:60, threshold:20 },
  { id:2,  name:'Iced Coffee (can)',           cat:'beverage',          unit:'pcs',  s:24, ca:18, u:8,  ul:12, sa:6,  d:30, threshold:10 },
  { id:3,  name:'Teh Kotak',                  cat:'beverage',          unit:'pcs',  s:36, ca:24, u:15, ul:20, sa:12, d:40, threshold:15 },
  { id:4,  name:'Pomade (Medium Hold)',        cat:'product',           unit:'pcs',  s:8,  ca:5,  u:3,  ul:6,  sa:4,  d:10, threshold:5  },
  { id:5,  name:'Hair Serum',                 cat:'product',           unit:'pcs',  s:12, ca:8,  u:4,  ul:7,  sa:5,  d:15, threshold:5  },
  { id:6,  name:'Beard Oil',                  cat:'product',           unit:'pcs',  s:6,  ca:4,  u:2,  ul:5,  sa:3,  d:8,  threshold:4  },
  { id:7,  name:'Foil Sheets (box)',          cat:'service_consumable',unit:'box',  s:5,  ca:3,  u:2,  ul:4,  sa:2,  d:6,  threshold:2  },
  { id:8,  name:'Disposable Blades (100pcs)', cat:'service_consumable',unit:'box',  s:8,  ca:6,  u:3,  ul:5,  sa:4,  d:10, threshold:3  },
  { id:9,  name:'Wax Strips (50pcs)',         cat:'service_consumable',unit:'box',  s:4,  ca:2,  u:1,  ul:3,  sa:2,  d:5,  threshold:2  },
  { id:10, name:'Neck Paper (roll)',           cat:'service_consumable',unit:'roll', s:12, ca:8,  u:5,  ul:9,  sa:6,  d:15, threshold:5  },
];

export const INV_BRANCH_COLS = [
  { key:'s',  label:'Seminyak' },
  { key:'ca', label:'Canggu'   },
  { key:'u',  label:'Ubud'     },
  { key:'ul', label:'Uluwatu'  },
  { key:'sa', label:'Sanur'    },
  { key:'d',  label:'Dewi Sri' },
];

// ── Payroll ───────────────────────────────────────────────────────────────────

export const PAYROLL = {
  branch: 'Bercut Seminyak',
  period: 'April 2026',
  status: 'draft',
  entries: [
    { id:1, barber:'Guntur Wibowo',  initials:'GW', payType:'salary_plus_commission', baseSalary:2500000, commRate:35, grossRevenue:5800000, commEarned:2030000, tips:450000, days:24, uangRajin:200000, bonus:0,      kasbon:500000, deductions:0,      netPay:4680000,
      adjustments:[
        { id:'a1', type:'uang_rajin', reason:'Full Month Attendance', amount:200000, by:'Owner', date:'28 Mar' },
        { id:'a2', type:'kasbon',     reason:'Salary Advance',        amount:500000, by:'Owner', date:'15 Mar', deductIn:'current' },
      ],
    },
    { id:2, barber:'Pangestu Adi',   initials:'PA', payType:'salary_plus_commission', baseSalary:2500000, commRate:35, grossRevenue:4900000, commEarned:1715000, tips:320000, days:22, uangRajin:0,      bonus:300000, kasbon:0,      deductions:0,      netPay:4835000,
      adjustments:[
        { id:'a3', type:'bonus', reason:'Top Barber of the Month', amount:300000, by:'Owner', date:'28 Mar' },
      ],
    },
    { id:3, barber:'Rifky Ramadhan', initials:'RR', payType:'salary_plus_commission', baseSalary:3000000, commRate:40, grossRevenue:6200000, commEarned:2480000, tips:510000, days:25, uangRajin:200000, bonus:0,      kasbon:0,      deductions:0,      netPay:6190000,
      adjustments:[
        { id:'a4', type:'uang_rajin', reason:'Zero Late Arrivals', amount:200000, by:'Owner', date:'28 Mar' },
      ],
    },
    { id:4, barber:'Sep Agustian',   initials:'SA', payType:'salary_plus_commission', baseSalary:2000000, commRate:35, grossRevenue:3400000, commEarned:1190000, tips:180000, days:20, uangRajin:0,      bonus:0,      kasbon:0,      deductions:150000, netPay:3220000,
      adjustments:[
        { id:'a5', type:'deduction', reason:'Late Arrivals', amount:150000, by:'Owner', date:'28 Mar' },
      ],
    },
    { id:5, barber:'Agung Pratama',  initials:'AP', payType:'salary_plus_commission', baseSalary:2500000, commRate:35, grossRevenue:5100000, commEarned:1785000, tips:390000, days:23, uangRajin:0,      bonus:0,      kasbon:0,      deductions:0,      netPay:4675000,
      adjustments:[],
    },
    { id:6, barber:'Rahmat Suharto', initials:'RS', payType:'salary_plus_commission', baseSalary:2000000, commRate:30, grossRevenue:2800000, commEarned:840000,  tips:120000, days:18, uangRajin:0,      bonus:0,      kasbon:250000, deductions:0,      netPay:2710000,
      adjustments:[
        { id:'a6', type:'kasbon', reason:'Salary Advance', amount:250000, by:'Owner', date:'20 Mar', deductIn:'current' },
      ],
    },
  ],
};

export const ADJ_REASONS = {
  uang_rajin: ['Full Month Attendance', 'Zero Late Arrivals', 'Top Barber of the Month', 'Customer Compliment'],
  bonus:      ['Holiday Bonus', 'Performance Bonus'],
  deduction:  ['Late Arrivals', 'Equipment Damage', 'Uniform Deduction'],
  kasbon:     ['Salary Advance'],
};

// ── Status metadata ───────────────────────────────────────────────────────────

export const STATUS_META = {
  confirmed:       { label:'Waiting',     color:'#2563EB', bg:'#EFF6FF', border:'#BFDBFE' },
  in_progress:     { label:'In Progress', color:'#16A34A', bg:'#F0FDF4', border:'#BBF7D0' },
  pending_payment: { label:'Paying',      color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
  completed:       { label:'Done',        color:'#059669', bg:'#ECFDF5', border:'#A7F3D0' },
  no_show:         { label:'No-show',     color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
  cancelled:       { label:'Cancelled',   color:'#6B7280', bg:'#F9FAFB', border:'#E5E7EB' },
};

export const CAT_META = {
  petty_cash: { label:'Petty Cash', color:'#7C3AED', bg:'#EDE9FE' },
  supplies:   { label:'Supplies',   color:'#2563EB', bg:'#EFF6FF' },
  utilities:  { label:'Utilities',  color:'#D97706', bg:'#FFFBEB' },
  equipment:  { label:'Equipment',  color:'#DC2626', bg:'#FEF2F2' },
  other:      { label:'Other',      color:'#6B7280', bg:'#F9FAFB' },
};

export const BARBER_STATUS_META = {
  available:   { dot:'#16A34A', label:'Available'   },
  busy:        { dot:'#D97706', label:'In Service'  },
  on_break:    { dot:'#F5E200', label:'On Break'    },
  clocked_out: { dot:'#DDDBD4', label:'Not In'      },
};
