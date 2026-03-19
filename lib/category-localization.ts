import type { PrismaClient } from '@prisma/client';

type TableInfoRow = {
  name: string;
};

let ensured = false;

export async function ensureCategoryLocalizationColumns(prisma: PrismaClient) {
  if (ensured) return;

  const columns = await prisma.$queryRawUnsafe<TableInfoRow[]>(
    'PRAGMA table_info("Category")'
  );
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has('nameJa')) {
    await prisma.$executeRawUnsafe('ALTER TABLE "Category" ADD COLUMN "nameJa" TEXT');
  }

  if (!columnNames.has('nameEn')) {
    await prisma.$executeRawUnsafe('ALTER TABLE "Category" ADD COLUMN "nameEn" TEXT');
  }

  if (!columnNames.has('nameZh')) {
    await prisma.$executeRawUnsafe('ALTER TABLE "Category" ADD COLUMN "nameZh" TEXT');
  }

  if (!columnNames.has('sortOrder')) {
    await prisma.$executeRawUnsafe('ALTER TABLE "Category" ADD COLUMN "sortOrder" INTEGER DEFAULT 0');
  }

  ensured = true;
}
