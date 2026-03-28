// Path: app/api/admin/settings/route.ts
// Title: Admin Settings API
// Purpose: Handles system-wide settings like API budget limits.

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { getCloudflareContext } from '@/lib/cloudflare';
import { getDefaultEducationalGuidelines, normalizeEducationalGuidelines } from '@/lib/ai-prompts';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Internal Server Error';
}

export async function POST(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    
    // Auth Check
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { key, value } = (await req.json()) as { key?: string; value?: unknown };
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 });
    }

    let normalizedValue = String(value);
    if (key === 'educational_guidelines') {
      let parsedValue: unknown = value;
      if (typeof value === 'string') {
        try {
          parsedValue = JSON.parse(value);
        } catch {
          parsedValue = null;
        }
      }
      normalizedValue = JSON.stringify(normalizeEducationalGuidelines(parsedValue));
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: normalizedValue },
      create: { key, value: normalizedValue }
    });

    return NextResponse.json({ success: true, setting });

  } catch (error: unknown) {
    console.error('Settings API Error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const prisma = createPrisma(env);
    
    // Auth Check
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userStatus = await prisma.user.findUnique({ where: { clerkId: userId }, select: { role: true } });
    if (!userStatus || userStatus.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    
    if (key) {
      const setting = await prisma.setting.findUnique({ where: { key } });
      if (!setting && key === 'educational_guidelines') {
        return NextResponse.json({
          key,
          value: JSON.stringify(getDefaultEducationalGuidelines()),
        });
      }
      if (setting && key === 'educational_guidelines') {
        let parsedValue: unknown = null;
        try {
          parsedValue = JSON.parse(setting.value);
        } catch {
          parsedValue = null;
        }
        return NextResponse.json({
          ...setting,
          value: JSON.stringify(normalizeEducationalGuidelines(parsedValue)),
        });
      }
      return NextResponse.json(setting);
    }

    const settings = await prisma.setting.findMany();
    return NextResponse.json(settings);

  } catch (error: unknown) {
    console.error('Settings API GET Error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
