/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPrisma } from '@/lib/prisma';
import { PrismaClient } from '@prisma/client/edge';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ensureCategoryLocalizationColumns } from '@/lib/category-localization';

export const runtime = 'edge';

type CategoryRow = {
  id: string;
  name: string;
  nameJa: string | null;
  nameEn: string | null;
  nameZh: string | null;
  minAge: number;
  maxAge: number | null;
  systemPrompt: string | null;
  sortOrder: number;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
};

// 管理者権限チェック
async function checkAdmin(prisma: PrismaClient) {
  const { userId } = await auth();
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });
  return user?.role === 'ADMIN' || user?.role === 'PARENT';
}

export async function GET() {
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  await ensureCategoryLocalizationColumns(prisma as any);
  const categories = await prisma.$queryRawUnsafe<CategoryRow[]>(
    'SELECT * FROM "Category" ORDER BY "sortOrder" ASC, "minAge" ASC, "createdAt" ASC'
  );
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  if (!(await checkAdmin(prisma))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureCategoryLocalizationColumns(prisma as any);
    const { nameJa: rawNameJa, nameEn: rawNameEn, nameZh: rawNameZh, minAge, maxAge, systemPrompt, icon } = (await request.json()) as { nameJa: string; nameEn?: string; nameZh?: string; minAge: string; maxAge: string | null; systemPrompt?: string; icon?: string };
    const nameJa = rawNameJa?.trim();
    const nameEn = rawNameEn?.trim() || null;
    const nameZh = rawNameZh?.trim() || null;
    if (!nameJa) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: '日本語のジャンル名を入力してください。' }, { status: 400 });
    }
    
    // 既存のチェック
    const existing = await prisma.$queryRawUnsafe<CategoryRow[]>(
      'SELECT * FROM "Category" WHERE "id" = ? LIMIT 1',
      nameJa
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: 'ALREADY_EXISTS', message: '同じ名前のジャンルが既に存在します。' }, { status: 400 });
    }

    // 最大のsortOrderを取得
    const maxSortResult = await prisma.$queryRawUnsafe<Array<{ maxSort: number | null }>>(
      'SELECT MAX("sortOrder") as maxSort FROM "Category"'
    );
    const nextSortOrder = (maxSortResult[0]?.maxSort ?? -1) + 1;

    await prisma.$executeRawUnsafe(
      'INSERT INTO "Category" ("id", "name", "nameJa", "nameEn", "nameZh", "minAge", "maxAge", "systemPrompt", "sortOrder", "icon", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      nameJa,
      nameJa,
      nameJa,
      nameEn,
      nameZh,
      parseInt(minAge || '0'),
      maxAge ? parseInt(maxAge) : null,
      systemPrompt || null,
      nextSortOrder,
      icon || null
    );

    const [category] = await prisma.$queryRawUnsafe<CategoryRow[]>(
      'SELECT * FROM "Category" WHERE "id" = ? LIMIT 1',
      nameJa
    );

    return NextResponse.json(category);
  } catch (error: any) {
    console.error('Category POST Error:', error);
    return NextResponse.json({ error: 'CREATE_FAILED', message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  if (!(await checkAdmin(prisma))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureCategoryLocalizationColumns(prisma as any);
    const { id, nameJa: rawNameJa, nameEn: rawNameEn, nameZh: rawNameZh, minAge, maxAge, systemPrompt, sortOrder, icon } = (await request.json()) as { id: string; nameJa: string; nameEn?: string; nameZh?: string; minAge: string; maxAge: string | null; systemPrompt?: string; sortOrder?: number; icon?: string };
    const nameJa = rawNameJa?.trim();
    const nameEn = rawNameEn?.trim() || null;
    const nameZh = rawNameZh?.trim() || null;
    if (!nameJa) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: '日本語のジャンル名を入力してください。' }, { status: 400 });
    }

    const conflict = await prisma.$queryRawUnsafe<CategoryRow[]>(
      'SELECT * FROM "Category" WHERE "id" != ? AND ("name" = ? OR "nameJa" = ?) LIMIT 1',
      id,
      nameJa,
      nameJa
    );
    if (conflict.length > 0) {
      return NextResponse.json({ error: 'ALREADY_EXISTS', message: '同じ日本語名のジャンルが既に存在します。' }, { status: 400 });
    }

    if (sortOrder !== undefined) {
      await prisma.$executeRawUnsafe(
        'UPDATE "Category" SET "name" = ?, "nameJa" = ?, "nameEn" = ?, "nameZh" = ?, "minAge" = ?, "maxAge" = ?, "systemPrompt" = ?, "sortOrder" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?',
        maxAge ? parseInt(maxAge) : null,
        systemPrompt || null,
        sortOrder,
        icon || null,
        id
      );
    } else {
      await prisma.$executeRawUnsafe(
        'UPDATE "Category" SET "name" = ?, "nameJa" = ?, "nameEn" = ?, "nameZh" = ?, "minAge" = ?, "maxAge" = ?, "systemPrompt" = ?, "icon" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = ?',
        nameJa,
        nameJa,
        nameEn,
        nameZh,
        parseInt(minAge || '0'),
        maxAge ? parseInt(maxAge) : null,
        systemPrompt || null,
        icon || null,
        id
      );
    }

    const [category] = await prisma.$queryRawUnsafe<CategoryRow[]>(
      'SELECT * FROM "Category" WHERE "id" = ? LIMIT 1',
      id
    );

    return NextResponse.json(category);
  } catch (error: any) {
    console.error('Category PATCH Error:', error);
    return NextResponse.json({ error: 'UPDATE_FAILED', message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  if (!(await checkAdmin(prisma))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // id === null の場合はクエリパラメータ自体がない場合
  if (id === null) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  if (id === 'その他') {
    return NextResponse.json({ error: 'CANNOT_DELETE_DEFAULT', message: '「その他」ジャンルは削除できません。' }, { status: 400 });
  }

  try {
    await ensureCategoryLocalizationColumns(prisma as any);
    // 「その他」ジャンルを確保
    await prisma.$executeRawUnsafe(
      'INSERT OR IGNORE INTO "Category" ("id", "name", "nameJa", "nameEn", "nameZh", "minAge", "maxAge", "systemPrompt", "sortOrder", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      'その他',
      'その他',
      'その他',
      'Other',
      '其他',
      0,
      null,
      null,
      999 // 「その他」は常に後ろの方に
    );

    // 関連するクイズを「その他」へ振り替え
    await prisma.quiz.updateMany({
      where: { categoryId: id },
      data: { categoryId: 'その他' }
    });

    await prisma.$executeRawUnsafe('DELETE FROM "Category" WHERE "id" = ?', id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Category DELETE Error:', error);
    return NextResponse.json({ error: 'DELETE_FAILED', message: error.message }, { status: 500 });
  }
}
