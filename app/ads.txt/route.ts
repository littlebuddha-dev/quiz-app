import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { getCloudflareContext } from '@/lib/cloudflare';
import {
  buildAdsTxtLine,
  normalizeAdSenseSettings,
} from '@/lib/adsense';

const SETTING_KEY = 'adsense_settings';

export async function GET() {
  const { env } = getCloudflareContext();
  const prisma = createPrisma(env);
  const setting = await prisma.setting.findUnique({
    where: { key: SETTING_KEY },
  });

  const clientId = setting
    ? normalizeAdSenseSettings(JSON.parse(setting.value)).clientId
    : '';
  const body = clientId
    ? `${buildAdsTxtLine(clientId)}\n`
    : '# AdSense publisher ID is not configured yet.\n';

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
