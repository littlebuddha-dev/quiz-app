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

export async function GET(request: NextRequest) {
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
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/png';
    const imageUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      message: "Converted to Data URI (Base64)"
    });
  } catch (error) {
    console.error('Image Upload Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
