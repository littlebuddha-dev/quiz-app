import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

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

    let restoredCount = 0;

    const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b;
    const isGzip = buffer[0] === 0x1f && buffer[1] === 0x8b;

    if (isZip) {
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();

      for (const zipEntry of zipEntries) {
        if (zipEntry.isDirectory) continue;
        if (!zipEntry.entryName.startsWith('uploads/')) continue;

        const destPath = path.join(process.cwd(), 'public', zipEntry.entryName);
        await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
        await fs.promises.writeFile(destPath, zipEntry.getData());
        restoredCount += 1;
      }
    } else if (isGzip) {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'quiz-backup-'));
      try {
        const archivePath = path.join(tmpDir, 'backup.tar.gz');
        const extractDir = path.join(tmpDir, 'extract');
        await fs.promises.mkdir(extractDir, { recursive: true });
        await fs.promises.writeFile(archivePath, buffer);

        await execFileAsync('tar', ['-xzf', archivePath, '-C', extractDir]);

        const candidateRoots = [
          path.join(extractDir, 'public', 'uploads'),
          path.join(extractDir, 'uploads'),
        ];
        const uploadsRoot = candidateRoots.find((candidate) => fs.existsSync(candidate));
        if (!uploadsRoot) {
          return NextResponse.json({ error: 'ARCHIVE_DOES_NOT_CONTAIN_UPLOADS' }, { status: 400 });
        }

        const walk = async (dir: string): Promise<void> => {
          const entries = await fs.promises.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const sourcePath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              await walk(sourcePath);
              continue;
            }

            const relativePath = path.relative(uploadsRoot, sourcePath);
            const destPath = path.join(process.cwd(), 'public', 'uploads', relativePath);
            await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
            await fs.promises.copyFile(sourcePath, destPath);
            restoredCount += 1;
          }
        };

        await walk(uploadsRoot);
      } finally {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      }
    } else {
      return NextResponse.json({ error: 'UNSUPPORTED_ARCHIVE_FORMAT' }, { status: 400 });
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
