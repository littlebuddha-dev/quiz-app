import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getMimeType(extension: string) {
  switch (extension.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  try {
    // Next.js 15+ Params resolve
    const resolvedParams = await Promise.resolve(params);
    const filePathArray = resolvedParams.path || [];
    
    // public/uploads/managed/ ディレクトリからの相対パスを作成
    const relativePath = path.join(...filePathArray);
    
    // 絶対パスの構築とディレクトリトラバーサル防止
    const publicDir = path.join(process.cwd(), 'public');
    const managedDir = path.join(publicDir, 'uploads', 'managed');
    const absolutePath = path.join(managedDir, relativePath);
    
    if (!absolutePath.startsWith(managedDir)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    try {
      const fileBuffer = await fs.readFile(absolutePath);
      const ext = path.extname(absolutePath).slice(1);
      const mimeType = getMimeType(ext);

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (e: any) {
      // ファイルが存在しない場合は404
      if (e.code === 'ENOENT') {
        return new NextResponse('Not Found', { status: 404 });
      }
      throw e;
    }
  } catch (error) {
    console.error('Failed to serve managed upload:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
