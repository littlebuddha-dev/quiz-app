import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const buffer = Buffer.from(await req.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'EMPTY_BACKUP_FILE' }, { status: 400 });
    }

    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    let restoredCount = 0;
    for (const zipEntry of zipEntries) {
      if (zipEntry.isDirectory) continue;
      if (!zipEntry.entryName.startsWith('uploads/')) continue;

      const destPath = path.join(process.cwd(), 'public', zipEntry.entryName);
      await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
      await fs.promises.writeFile(destPath, zipEntry.getData());
      restoredCount += 1;
    }

    return NextResponse.json({
      success: true,
      message: `画像データ（${restoredCount}件）の展開と復元が完了しました。`,
    });
  } catch (error) {
    console.error('Restore Images Error:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
