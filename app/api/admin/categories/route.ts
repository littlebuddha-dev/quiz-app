
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPrisma } from '@/lib/prisma';
import { PrismaClient } from '@prisma/client/edge';

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

export async function GET(req: NextRequest, { params, env }: { params: Promise<any>, env?: any }) {
  const prisma = createPrisma(env);
  const categories = await prisma.category.findMany({
    orderBy: { minAge: 'asc' },
  });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest, { params, env }: { params: Promise<any>, env?: any }) {
  const prisma = createPrisma(env);
  if (!(await checkAdmin(prisma))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, minAge, maxAge } = await request.json();
  const category = await prisma.category.create({
    data: {
      id: name, // IDを名前と同じにする
      name,
      minAge: parseInt(minAge),
      maxAge: maxAge ? parseInt(maxAge) : null,
    },
  });

  return NextResponse.json(category);
}

export async function PATCH(request: NextRequest, { params, env }: { params: Promise<any>, env?: any }) {
  const prisma = createPrisma(env);
  if (!(await checkAdmin(prisma))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, name, minAge, maxAge } = await request.json();
  const category = await prisma.category.update({
    where: { id },
    data: {
      name,
      minAge: parseInt(minAge),
      maxAge: maxAge ? parseInt(maxAge) : null,
    },
  });

  return NextResponse.json(category);
}

export async function DELETE(request: NextRequest, { params, env }: { params: Promise<any>, env?: any }) {
  const prisma = createPrisma(env);
  if (!(await checkAdmin(prisma))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  await prisma.category.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
