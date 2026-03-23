import type { PrismaClient } from '@prisma/client';

type TableInfoRow = {
  name: string;
};

let ensured = false;

export async function ensureCategoryLocalizationColumns(prisma: PrismaClient) {
  if (ensured) return;

  // データベースプロバイダーの特定
  const provider = (prisma as any)._activeProvider || 'sqlite';

  let columnNames = new Set<string>();

  if (provider === 'sqlite') {
    const columns = await prisma.$queryRawUnsafe<TableInfoRow[]>(
      'PRAGMA table_info("Category")'
    );
    columnNames = new Set(columns.map((column) => column.name));
  } else if (provider === 'postgresql') {
    const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'Category'"
    );
    columnNames = new Set(columns.map((column) => column.column_name));
  }

  // カラム追加の実行
  const addColumn = async (name: string, type: string) => {
    if (!columnNames.has(name)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Category" ADD COLUMN "${name}" ${type}`);
    }
  };

  await addColumn('nameJa', 'TEXT');
  await addColumn('nameEn', 'TEXT');
  await addColumn('nameZh', 'TEXT');
  await addColumn('sortOrder', provider === 'postgresql' ? 'INTEGER DEFAULT 0' : 'INTEGER DEFAULT 0');
  await addColumn('icon', 'TEXT');

  ensured = true;
}

