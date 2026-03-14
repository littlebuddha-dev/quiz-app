import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { PrismaClient } from '@prisma/client/edge';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';
// import { writeFile } from 'fs/promises';
// import { join } from 'path';
// import { randomUUID } from 'crypto';

// 権限チェックのヘルパー
async function isAdminOrParent(prisma: PrismaClient) {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });

  return user && (user.role === 'ADMIN' || user.role === 'PARENT');
}

export async function POST(req: NextRequest, { params }: { params: Promise<any> }) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const isAuthorized = await isAdminOrParent(prisma);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ユニークなファイル名の生成
    const fileExtension = file.name.split('.').pop() || 'png';
    const fileName = `${crypto.randomUUID()}.${fileExtension}`;
    // const path = join(process.cwd(), 'public/uploads', fileName);

    // ファイルの書き込み
    // await writeFile(path, buffer);
    const imageUrl = `/uploads/${fileName}`;

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      message: "Note: Real file storage is not supported on Cloudflare Workers without R2."
    });
  } catch (error) {
    console.error('Image Upload Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
