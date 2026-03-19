// /Users/Shared/Program/nextjs/quiz-app/app/api/admin/adsense/route.ts
// Title: Google AdSense Settings API
// Purpose: CRUD for Google AdSense settings in the Setting model

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'edge';

const SETTING_KEY = 'adsense_settings';

export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ここではAdminチェックを追加するのが望ましいが、現状のクイズアプリの構成に合わせる
    // 必要であればUserから role を取得してチェックする

    const setting = await prisma.setting.findUnique({
      where: { key: SETTING_KEY },
    });

    if (!setting) {
      return NextResponse.json({
        enabled: false,
        snippet: '',
        slots: {
          home: true,
          watch: true,
        },
      });
    }

    return NextResponse.json(JSON.parse(setting.value));
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

    const body = (await request.json()) as Record<string, unknown>;
    
    const setting = await prisma.setting.upsert({
      where: { key: SETTING_KEY },
      update: {
        value: JSON.stringify(body),
      },
      create: {
        key: SETTING_KEY,
        value: JSON.stringify(body),
      },
    });

    return NextResponse.json(JSON.parse(setting.value));
  } catch (error) {
    console.error('Error saving AdSense settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
