import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPrisma } from '@/lib/prisma';
import { PrismaClient } from '@prisma/client/edge';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

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

export async function GET(request: NextRequest) {
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  const categories = await prisma.category.findMany({
    orderBy: { minAge: 'asc' },
  });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  if (!(await checkAdmin(prisma))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name: rawName, minAge, maxAge, systemPrompt } = (await request.json()) as { name: string; minAge: string; maxAge: string | null; systemPrompt?: string };
    const name = rawName?.trim();
    if (!name) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'ジャンル名を入力してください。' }, { status: 400 });
    }
    
    // 既存のチェック
    const existing = await prisma.category.findUnique({ where: { id: name } });
    if (existing) {
      return NextResponse.json({ error: 'ALREADY_EXISTS', message: '同じ名前のジャンルが既に存在します。' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        id: name,
        name,
        minAge: parseInt(minAge || '0'),
        maxAge: maxAge ? parseInt(maxAge) : null,
        systemPrompt,
      },
    });

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
    const { id, name: rawName, minAge, maxAge, systemPrompt } = (await request.json()) as { id: string; name: string; minAge: string; maxAge: string | null; systemPrompt?: string };
    const name = rawName?.trim();
    if (!name) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'ジャンル名を入力してください。' }, { status: 400 });
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        minAge: parseInt(minAge || '0'),
        maxAge: maxAge ? parseInt(maxAge) : null,
        systemPrompt,
      },
    });

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
    // 「その他」ジャンルを確保
    const otherCategory = await prisma.category.upsert({
      where: { id: 'その他' },
      update: {},
      create: { id: 'その他', name: 'その他', minAge: 0 }
    });

    // 関連するクイズを「その他」へ振り替え
    await prisma.quiz.updateMany({
      where: { categoryId: id },
      data: { categoryId: otherCategory.id }
    });

    // ジャンルを削除
    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Category DELETE Error:', error);
    return NextResponse.json({ error: 'DELETE_FAILED', message: error.message }, { status: 500 });
  }
}
