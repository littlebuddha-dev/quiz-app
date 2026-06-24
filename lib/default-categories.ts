import { PrismaClient } from '@prisma/client';

const DEFAULT_CATEGORIES = [
  {
    id: '生物',
    name: '生物',
    nameJa: '生物',
    nameEn: 'Biology',
    nameZh: '生物',
    minAge: 10,
    maxAge: null,
    systemPrompt: null,
    sortOrder: 8,
    icon: 'science.svg',
  },
];

export async function ensureDefaultCategories(prisma: PrismaClient) {
  for (const category of DEFAULT_CATEGORIES) {
    await prisma.$executeRawUnsafe(
      'INSERT OR IGNORE INTO "Category" ("id", "name", "nameJa", "nameEn", "nameZh", "minAge", "maxAge", "systemPrompt", "sortOrder", "icon", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      category.id,
      category.name,
      category.nameJa,
      category.nameEn,
      category.nameZh,
      category.minAge,
      category.maxAge,
      category.systemPrompt,
      category.sortOrder,
      category.icon
    );
  }
}
