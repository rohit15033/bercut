import prisma from './src/lib/prisma.js';
async function check() {
  const branches = await prisma.branch.findMany();
  console.log('Branches in DB:', branches.map(b => b.id));
  process.exit(0);
}
check();
