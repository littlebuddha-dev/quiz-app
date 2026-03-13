
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
console.log('--- Prisma Property Check ---');
console.log('prisma.category check:', typeof prisma.category);
if (prisma.category) {
  console.log('prisma.category is defined!');
} else {
  console.log('prisma.category is UNDEFINED');
  console.log('Available properties:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
}
process.exit(0);
