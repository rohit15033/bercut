import 'dotenv/config';
import prisma from '../src/lib/prisma.js';

async function main() {
  console.log('Cleaning existing database...');

  // Delete all data in reverse order of foreign key dependencies
  await prisma.bookingService.deleteMany({});
  await prisma.tip.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.bookingGroup.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.barberSchedule.deleteMany({});
  await prisma.barberPushSubscription.deleteMany({});
  await prisma.inventoryMovements.deleteMany({});
  await prisma.inventoryStock.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.serviceCommission.deleteMany({});
  await prisma.serviceBranchPrice.deleteMany({});
  await prisma.barber.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.branchSettings.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Database cleared. Starting seed for Seminyak Branch...');

  // 1. Seed Branch
  const branch = await prisma.branch.create({
    data: {
      id: 'branch-seminyak',
      name: 'Bercut Seminyak',
      city: 'Bali',
      timezone: 'Asia/Makassar',
      is_active: true,
      branch_settings: {
        create: {
          late_start_threshold_min: 10,
          speaker_enabled: true,
          push_enabled: true,
          tip_presets: [5000, 10000, 20000, 50000],
        },
      },
    },
  });

  // 2. Seed Admin User
  const admin = await prisma.user.create({
    data: {
      email: 'admin@bercut.com',
      password_hash: '$2b$10$Ep3v/.wP023W2A4.d3B/DuvfEIFG7a.K1m5Jz.x6tZzR5vO9jF7QO',
      name: 'Admin',
      role: 'admin',
    },
  });

  // 3. Services Data
  const services = [
    // HAIRCUTS
    { name: 'Just a Haircut', category: 'haircut', price: 120000, commission: 20 },
    { name: 'Kids Haircut', category: 'haircut', price: 120000, commission: 20 },
    { name: 'Skin Fade', category: 'haircut', price: 130000, commission: 20 },
    { name: 'Head Shaving', category: 'haircut', price: 130000, commission: 20 },
    { name: 'Hair Tattoo', category: 'haircut', price: 150000, commission: 20 },

    // BEARDS
    { name: 'Beard Coloring', category: 'beard', price: 125000, commission: 15 },
    { name: 'Beard Shaving', category: 'beard', price: 95000, commission: 20 },
    { name: 'Beard Trim', category: 'beard', price: 75000, commission: 20 },

    // TREATMENTS
    { name: 'Nose Wax', category: 'treatment', price: 95000, commission: 20 },
    { name: 'Ear Wax', category: 'treatment', price: 95000, commission: 20 },
    { name: 'Nose Black Head Remover', category: 'treatment', price: 55000, commission: 20 },
    { name: 'Face Scrub', category: 'treatment', price: 85000, commission: 20 },
    { name: 'Black Mask', category: 'treatment', price: 85000, commission: 20 },
    { name: 'Creambath', category: 'treatment', price: 95000, commission: 20 },
    { name: 'Ear Candle', category: 'treatment', price: 75000, commission: 20 },

    // PACKAGES
    { name: 'Mask Cut Package', category: 'package', price: 205000, commission: 22, description: 'Haircut/Skin Fade + Black Mask' },
    { name: 'Prestige Package', category: 'package', price: 215000, commission: 22, description: 'Haircut/Skin Fade + Beard Trim/Shaving + Wash' },
    { name: 'Luxury Package', category: 'package', price: 445000, commission: 20, description: 'Haircut/Skin Fade + Black Mask + Nose Wax + Ear Wax + Ear Candle + Creambath & Wash' },
    { name: 'President Package', category: 'package', price: 555000, commission: 20, description: 'Haircut/Skin Fade + Beard Trim/Shaving + Black Mask + Nose Wax + Ear Wax + Ear Candle + Creambath & Wash' },

    // HAIR COLORING
    { name: 'Hair Coloring (Black/Brown)', category: 'hair-coloring', price: 175000, commission: 15 },
    { name: 'Hair Bleach 1 Step', category: 'hair-coloring', price: 260000, commission: 17 },
    { name: 'Add On Color 250K (1 Step)', category: 'hair-coloring', price: 500000, commission: 20 },
    { name: 'Hair Bleach 2 Step', category: 'hair-coloring', price: 415000, commission: 17 },
    { name: 'Add On Color 250K (2 Step)', category: 'hair-coloring', price: 650000, commission: 20 },
    { name: 'Hair Bleach 3 Step', category: 'hair-coloring', price: 525000, commission: 17 },
    { name: 'Add On Color 250K (3 Step)', category: 'hair-coloring', price: 750000, commission: 20 },
    { name: 'Hair Highlight', category: 'hair-coloring', price: 625000, commission: 17 },
    { name: 'Hair CLR Bawa Sendiri', category: 'hair-coloring', price: 135000, commission: 20 },
  ];

  for (let i = 0; i < services.length; i++) {
    const s = services[i];
    await prisma.service.create({
      data: {
        name: s.name,
        category: s.category,
        base_price: s.price,
        duration_minutes: 30, // Default duration
        description: s.description || null,
        sort_order: i,
        service_branch_prices: {
          create: {
            branch_id: branch.id,
            price: s.price,
          }
        },
        commission: {
          create: {
            commission_type: 'percent',
            commission_value: s.commission,
            updated_by: admin.id,
          }
        }
      }
    });
  }

  // 4. Barbers Data
  const barbersNames = ['Guntur', 'Pangestu', 'Rifky', 'Sep', 'Agung', 'Rahmat', 'Axel', 'Rian', 'Hendra'];
  for (const name of barbersNames) {
    const barber = await prisma.barber.create({
      data: {
        name: name,
        branch_id: branch.id,
        is_active: true,
      }
    });

    // Default schedules (everyday 10am to 10pm)
    for (let day = 0; day <= 6; day++) {
      await prisma.barberSchedule.create({
        data: {
          barber_id: barber.id,
          day_of_week: day,
          start_time: '10:00',
          end_time: '22:00',
          is_off: false,
        }
      });
    }
  }

  console.log('Seed completed successfully! 🌱');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
