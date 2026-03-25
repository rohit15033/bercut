import 'dotenv/config';
import prisma from '../src/lib/prisma.js';

async function main() {
  console.log('Starting seed...');

  // 1. Seed Branch
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-seminyak' },
    update: {},
    create: {
      id: 'branch-seminyak',
      name: 'Bercut Seminyak',
      city: 'Seminyak',
      timezone: 'Asia/Makassar',
      is_active: true,
      branch_settings: {
        create: {
          late_start_threshold_min: 10,
          speaker_enabled: true,
          push_enabled: true,
          tip_presets: [10000, 20000, 50000],
        },
      },
    },
  });
  console.log('Seeded branch:', branch.id);

  // 2. Seed Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bercut.com' },
    update: {},
    create: {
      email: 'admin@bercut.com',
      password_hash: '$2b$10$Ep3v/.wP023W2A4.d3B/DuvfEIFG7a.K1m5Jz.x6tZzR5vO9jF7QO', // Dummy bcrypt hash
      name: 'Bercut Admin',
      role: 'admin',
    },
  });
  console.log('Seeded admin user:', admin.email);

  // 3. Seed Services
  const servicesData = [
    {
      id: 'srv-haircut-sig',
      name: 'Signature Haircut',
      name_id: 'Potong Rambut Signature',
      category: 'haircut',
      base_price: 150000,
      duration_minutes: 45,
      sort_order: 1,
    },
    {
      id: 'srv-haircut-classic',
      name: 'Classic Cut',
      name_id: 'Potong Klasik',
      category: 'haircut',
      base_price: 85000,
      duration_minutes: 30,
      sort_order: 2,
    },
    {
      id: 'srv-haircut-fade',
      name: 'Fade & Style',
      name_id: 'Fade & Styling',
      category: 'haircut',
      base_price: 120000,
      duration_minutes: 45,
      sort_order: 3,
    },
    {
      id: 'srv-haircut-kids',
      name: 'Kids Cut',
      name_id: 'Potong Anak',
      category: 'haircut',
      base_price: 65000,
      duration_minutes: 25,
      sort_order: 4,
    },
    {
      id: 'srv-beard-trim',
      name: 'Beard Trim',
      name_id: 'Cukur Jenggot',
      category: 'beard',
      base_price: 80000,
      duration_minutes: 30,
      sort_order: 5,
    },
    {
      id: 'srv-beard-shave',
      name: 'Hot Towel Shave',
      name_id: 'Cukur Mewah',
      category: 'beard',
      base_price: 95000,
      duration_minutes: 35,
      sort_order: 6,
    },
    {
      id: 'srv-other-color',
      name: 'Full Color',
      name_id: 'Pewarnaan Penuh',
      category: 'other',
      base_price: 250000,
      duration_minutes: 90,
      sort_order: 7,
    },
    {
      id: 'srv-other-highlights',
      name: 'Highlights',
      name_id: 'Highlight Rambut',
      category: 'other',
      base_price: 200000,
      duration_minutes: 75,
      sort_order: 8,
    },
    {
      id: 'srv-package-combo',
      name: 'Cut + Beard Combo',
      name_id: 'Potong + Jenggot',
      category: 'package',
      base_price: 165000,
      duration_minutes: 55,
      sort_order: 9,
      badge: 'TOP VALUE'
    },
    {
      id: 'srv-package-groom',
      name: 'Full Groom',
      name_id: 'Perawatan Lengkap',
      category: 'package',
      base_price: 380000,
      duration_minutes: 130,
      sort_order: 10,
      badge: 'POPULAR'
    }
  ];

  for (const srv of servicesData) {
    await prisma.service.upsert({
      where: { id: srv.id },
      update: {},
      create: srv,
    });
    
    // Create branch price
    await prisma.serviceBranchPrice.upsert({
      where: {
        service_id_branch_id: {
          service_id: srv.id,
          branch_id: branch.id,
        }
      },
      update: {},
      create: {
        service_id: srv.id,
        branch_id: branch.id,
        price: srv.base_price,
      }
    });

    // Create service commission
    await prisma.serviceCommission.upsert({
      where: { service_id: srv.id },
      update: {},
      create: {
        service_id: srv.id,
        commission_type: 'percent',
        commission_value: 30.00,
      }
    });
  }
  console.log('Seeded services, prices, and commissions');

  // 4. Seed Barbers
  const barbersData = [
    {
      id: 'barber-budi',
      branch_id: branch.id,
      name: 'Budi Santoso',
      specialty: 'Fades',
      phone: '081234567890',
      pin_hash: '1234', // In a real app, hash this
      is_active: true,
    },
    {
      id: 'barber-andi',
      branch_id: branch.id,
      name: 'Andi Pratama',
      specialty: 'Classic Cuts',
      phone: '081298765432',
      pin_hash: '1234',
      is_active: true,
    }
  ];

  for (const b of barbersData) {
    await prisma.barber.upsert({
      where: { id: b.id },
      update: {},
      create: b,
    });

    // Add schedules (e.g. working Days 1-5, Monday-Friday)
    for (let day = 1; day <= 5; day++) {
      await prisma.barberSchedule.upsert({
        where: {
          barber_id_day_of_week: {
            barber_id: b.id,
            day_of_week: day,
          }
        },
        update: {},
        create: {
          barber_id: b.id,
          day_of_week: day,
          start_time: '10:00',
          end_time: '20:00',
          is_off: false,
        }
      });
    }
    // Off weekends
    for (let day of [6, 0]) {
      await prisma.barberSchedule.upsert({
        where: {
          barber_id_day_of_week: {
            barber_id: b.id,
            day_of_week: day,
          }
        },
        update: {},
        create: {
          barber_id: b.id,
          day_of_week: day,
          is_off: true,
        }
      });
    }
  }
  console.log('Seeded barbers and schedules');

  // 5. Seed Customers
  const customer = await prisma.customer.upsert({
    where: { phone: '08111222333' },
    update: {},
    create: {
      name: 'Joko Widodo',
      phone: '08111222333',
      total_visits: 5,
      total_spend: 750000,
      first_visit: new Date('2025-01-01T00:00:00.000Z'),
      last_visit: new Date(),
    }
  });
  console.log('Seeded customer:', customer.name);

  // 6. Seed Inventory Items
  const inventoryData = [
    {
      id: 'inv-pomade-strong',
      name: 'Bercut Strong Pomade',
      category: 'retail',
      unit: 'pcs',
    },
    {
      id: 'inv-shampoo-prof',
      name: 'Professional Shampoo 1L',
      category: 'supply',
      unit: 'bottle',
    }
  ];

  for (const inv of inventoryData) {
    await prisma.inventoryItem.upsert({
      where: { id: inv.id },
      update: {},
      create: inv,
    });

    // Seed Stock for this branch
    await prisma.inventoryStock.upsert({
      where: {
        item_id_branch_id: {
          item_id: inv.id,
          branch_id: branch.id,
        }
      },
      update: {},
      create: {
        item_id: inv.id,
        branch_id: branch.id,
        current_stock: 20,
        reorder_threshold: 5,
      }
    });
  }
  console.log('Seeded inventory items and stock');

  console.log('Seed completed successfully! 🌱');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());