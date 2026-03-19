import prisma from './src/lib/prisma.js';

async function main() {
  try {
    await prisma.$connect();
    console.log('Connected to DB successfully!');
  } catch (err) {
    console.error('Failed to connect:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
