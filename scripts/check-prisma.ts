
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
console.log('Prisma properties:', Object.keys(prisma));
console.log('Category property:', prisma.category);
process.exit(0);
