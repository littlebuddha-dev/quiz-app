
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
console.log('Prisma properties:', Object.keys(prisma));
// @ts-ignore
console.log('Category property:', prisma.category);
// @ts-ignore
console.log('Category model:', prisma['Category']);
process.exit(0);
