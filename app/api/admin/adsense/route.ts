// /Users/Shared/Program/nextjs/quiz-app/app/api/admin/adsense/route.ts
// Title: Google AdSense Settings API
// Purpose: CRUD for Google AdSense settings in the Setting model

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  DEFAULT_ADSENSE_SETTINGS,
  normalizeAdSenseSettings,
  toPublicAdSenseSettings,
} from '@/lib/adsense';

export const runtime = 'edge';

const SETTING_KEY = 'adsense_settings';

async function isAdmin(clerkId: string, prisma: ReturnType<typeof createPrisma>) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });

  return user?.role === 'ADMIN';
}

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);

    const setting = await prisma.setting.findUnique({
      where: { key: SETTING_KEY },
    });

    if (!setting) {
      return NextResponse.json(toPublicAdSenseSettings(DEFAULT_ADSENSE_SETTINGS));
    }

    return NextResponse.json(
      toPublicAdSenseSettings(normalizeAdSenseSettings(JSON.parse(setting.value)))
    );
  } catch (error) {
    console.error('Error fetching AdSense settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(clerkId, prisma))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const normalized = normalizeAdSenseSettings(body);
    
    const setting = await prisma.setting.upsert({
      where: { key: SETTING_KEY },
      update: {
        value: JSON.stringify(normalized),
      },
      create: {
        key: SETTING_KEY,
        value: JSON.stringify(normalized),
      },
    });

    return NextResponse.json(normalizeAdSenseSettings(JSON.parse(setting.value)));
  } catch (error) {
    console.error('Error saving AdSense settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
