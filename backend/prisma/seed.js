import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.upsert({
    where:  { id: 'seed-branch-seminyak' },
    update: {},
    create: {
      id:       'seed-branch-seminyak',
      name:     'Bercut Seminyak',
      city:     'Seminyak',
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
}

main().catch(console.error).finally(() => prisma.$disconnect());
