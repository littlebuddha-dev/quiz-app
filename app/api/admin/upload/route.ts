import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { PrismaClient } from '@prisma/client/edge';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import { createDataUrlFromBuffer, storeImageBuffer } from '@/lib/image-storage';

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

export async function GET() {
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  const isAuthorized = await isAdminOrParent(prisma);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const isAuthorized = await isAdminOrParent(prisma);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let imageUrl: string;
    try {
      const stored = await storeImageBuffer(buffer, file.type || 'image/png');
      imageUrl = stored.publicPath;
    } catch (storageError) {
      console.warn('Managed image storage failed during upload. Falling back to data URL.', storageError);
      imageUrl = createDataUrlFromBuffer(buffer, file.type || 'image/png');
    }

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      message: imageUrl.startsWith('data:')
        ? 'Stored as inline fallback image'
        : 'Stored as managed upload file'
    });
  } catch (error) {
    console.error('Image Upload Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
